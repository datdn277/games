import { describe, expect, it } from 'vitest';
import { Game, STATE } from '../src/gameplay/Game.js';
import { Direction } from '../src/gameplay/Ordinal.js';
import { QuestionType } from '../src/gameplay/Questions.js';

const { LEFT_TO_RIGHT, RIGHT_TO_LEFT } = Direction;

function createGame(level, options) {
  const game = new Game(options);
  game.boot();
  game.startLevel(level);
  return game;
}

function solveQuestion(game) {
  const { direction, type, targetOrdinal } = game.question;
  expect(game.beginQuestion()).toBe(true);
  if (type !== QuestionType.CHOOSE_END_ANIMAL) {
    expect(game.chooseDirection(direction).correct).toBe(true);
    game.finishFeedback();
  }
  if (type === QuestionType.FIND_ANIMAL_BY_ORDINAL) {
    for (let ordinal = 1; ordinal <= targetOrdinal; ordinal += 1) {
      expect(game.chooseAnimal(game.nextIndex)).toMatchObject({ correct: true, kind: 'count', ordinal });
      game.finishFeedback();
    }
  }
  if (type !== QuestionType.CHOOSE_FLAG) {
    expect(game.chooseAnimal(game.targetIndex)).toMatchObject({ correct: true, kind: 'answer' });
    game.finishFeedback();
  }
  expect(game.state).toBe(STATE.QUESTION_COMPLETE);
}

describe('game states and input', () => {
  it('locks input during feedback and pause, then resumes the exact stage', () => {
    const game = createGame(4);
    expect(game.chooseAnimal(0).accepted).toBe(false);
    expect(game.chooseDirection(RIGHT_TO_LEFT).accepted).toBe(false);
    expect(game.showTutorial()).toBe(true);
    expect(game.beginQuestion()).toBe(true);
    expect(game.chooseDirection(LEFT_TO_RIGHT)).toMatchObject({ accepted: true, correct: false });
    expect(game.state).toBe(STATE.INCORRECT_FEEDBACK);
    expect(game.chooseDirection(RIGHT_TO_LEFT).accepted).toBe(false);
    expect(game.pause()).toBe(true);
    expect(game.activeState).toBe(STATE.INCORRECT_FEEDBACK);
    expect(game.finishFeedback()).toBe(false);
    expect(game.chooseAnimal(4).accepted).toBe(false);
    expect(game.resume()).toBe(true);
    expect(game.finishFeedback()).toBe(true);
    expect(game.state).toBe(STATE.CHOOSE_DIRECTION);
    expect(game.hinted).toBe(true);
    expect(game.progress.stats.wrongDirection).toBe(1);
  });

  it('does not accept skipping, counting twice, or answering without counting', () => {
    const game = createGame(4);
    game.beginQuestion();
    game.chooseDirection(RIGHT_TO_LEFT);
    game.finishFeedback();
    const first = game.startIndex;
    const second = game.targetIndex;

    expect(game.chooseAnimal(second).correct).toBe(false);
    game.finishFeedback();
    expect(game.counted).toEqual([]);
    expect(game.chooseAnimal(first)).toMatchObject({ correct: true, ordinal: 1 });
    expect(game.chooseAnimal(second).accepted).toBe(false);
    game.finishFeedback();

    expect(game.chooseAnimal(first).correct).toBe(false);
    game.finishFeedback();
    expect(game.counted).toEqual([first]);
    expect(game.chooseAnimal(second)).toMatchObject({ correct: true, ordinal: 2 });
    game.finishFeedback();
    expect(game.state).toBe(STATE.SELECT_ANSWER);
    expect(game.progress.stars).toBe(0);
    expect(game.chooseAnimal(second)).toMatchObject({ correct: true, kind: 'answer' });
    expect(game.chooseAnimal(second).accepted).toBe(false);
    expect(game.nextQuestion()).toBe(false);
    expect(game.progress.stars).toBe(1);
    expect(game.progress.stats.wrongCount).toBe(2);
  });

  it('clears paused feedback and count when restarting or returning to the menu', () => {
    const game = createGame(2);
    game.beginQuestion();
    game.chooseDirection(LEFT_TO_RIGHT);
    game.finishFeedback();
    game.chooseAnimal(game.nextIndex);
    game.pause();
    expect(game.startLevel(3)).toBe(true);
    expect(game.state).toBe(STATE.QUESTION_PRESENTED);
    expect(game.resume()).toBe(false);
    expect(game.finishFeedback()).toBe(false);
    expect(game.counted).toEqual([]);
    expect(game.questionIndex).toBe(0);
    expect(game.confirmedDirection).toBeNull();
    game.showMenu();
    expect(game.question).toBeNull();
    expect(game.nextIndex).toBeNull();
  });
});

describe('direction comparisons and progress', () => {
  it('resets the count and keeps exactly the same row when changing the start end', () => {
    const game = createGame(5);
    const originalRow = game.question.animals;
    solveQuestion(game);
    expect(game.counted).toEqual([0, 1, 2, 3]);
    expect(game.comparison).toBeNull();
    game.nextQuestion();
    expect(game.question.animals).toBe(originalRow);
    expect(game.counted).toEqual([]);
    expect(game.startIndex).toBe(5);
    expect(game.confirmedDirection).toBeNull();
    solveQuestion(game);
    expect(game.counted).toEqual([5, 4, 3, 2]);
    expect(game.comparison).toEqual({ left: 'frog', right: 'rabbit', ordinal: 4 });
  });

  it('reduces guidance after success, increases it after help, and offers easier practice', () => {
    const game = createGame(3);
    expect(game.support).toBe(1);
    solveQuestion(game);
    game.nextQuestion();
    expect(game.support).toBe(2);
    solveQuestion(game);
    game.nextQuestion();
    expect(game.support).toBe(3);
    expect(game.question.targetOrdinal).toBe(4);
    game.beginQuestion();
    expect(game.useHint()).toBe(true);
    expect(game.support).toBe(2);
    expect(game.progress.stats.hints).toBe(1);
    game.chooseDirection(LEFT_TO_RIGHT);
    game.finishFeedback();
    while (game.state !== STATE.SELECT_ANSWER) {
      game.chooseAnimal(game.nextIndex);
      game.finishFeedback();
    }
    game.chooseAnimal(game.targetIndex);
    game.finishFeedback();
    game.nextQuestion();
    expect(game.question.targetOrdinal).toBe(3);
    expect(game.support).toBe(2);
  });

  it('persists completed levels and the sound setting without double-awarding replay stars', () => {
    const values = new Map();
    const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
    const game = createGame(1, { storage });
    game.setSound(false);
    for (const question of game.questions) {
      expect(game.question.id).toBe(question.id);
      solveQuestion(game);
      expect(game.nextQuestion()).toBe(true);
    }
    expect(game.state).toBe(STATE.LEVEL_COMPLETE);
    expect(game.sessionStars).toBe(5);
    expect(game.progress.stars).toBe(5);

    const replay = createGame(1, { storage });
    expect(replay.progress.completedLevels).toEqual([1]);
    expect(replay.progress.sound).toBe(false);
    solveQuestion(replay);
    expect(replay.sessionStars).toBe(1);
    expect(replay.progress.stars).toBe(5);
    expect(replay.progress.stats.completedQuestions).toBe(6);
  });

  it('keeps the game playable when local storage is unavailable', () => {
    const unavailable = () => { throw new Error('Storage disabled'); };
    const game = createGame(1, { storage: { getItem: unavailable, setItem: unavailable } });
    solveQuestion(game);
    expect(game.progress.stars).toBe(1);
  });
});
