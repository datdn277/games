import { describe, expect, it } from 'vitest';
import { BUILD_BOUNDS, BUILD_HEIGHT, COLORS, Game, PHASE, SUPPORT, VIEW, compareGrids } from '../src/game.js';

const { WHITE, DARK } = COLORS;

function enter(id, progress, build) {
  const game = new Game(progress, build);
  expect(game.startLevel(id)).toBe(true);
  expect(game.begin()).toBe(true);
  return game;
}

function takeFlight(game) {
  const token = game.startFlight();
  expect(Number.isInteger(token)).toBe(true);
  expect(game.finishFlight(token)).toBe(true);
}

function correctChoice(game) {
  return game.question.options.findIndex((option) => compareGrids(game.projection, option).correct);
}

function colorCorrectDrawing(game) {
  game.projection.forEach((row, r) => {
    row.forEach((color, c) => game.paint(r, c, color));
  });
}

describe('lesson progression', () => {
  it('learns the top and a standing face by touching each before flying and verifying', () => {
    const game = enter(1);
    const [cube] = game.cubes;
    expect(game.startFlight()).toBeNull();
    game.inspect(cube.id, 'front');
    expect(game.faceStep).toBe(0);
    expect(game.progress.wrong).toBe(1);
    game.inspect(cube.id, 'top');
    expect(game.faceStep).toBe(1);
    game.inspect(cube.id, 'right');
    expect(game.faceStep).toBe(2);
    expect(game.verify()).toBeNull();
    takeFlight(game);
    expect(game.verify()).toBe(true);
    expect(game.progress.skills.faces).toBe(1);
    expect(game.progress.stars).toBe(1);
    expect(game.verify()).toBeNull();
    game.next();
    expect(game.roundIndex).toBe(1);
    expect(game.faceStep).toBe(0);
    expect(game.view).toBe(VIEW.ISOMETRIC);
  });

  it('compares a painting against the model, preserves wrong cells for review and accepts correction', () => {
    const game = enter(2);
    expect(game.beginDrawing()).toBe(false);
    takeFlight(game);
    expect(game.beginDrawing()).toBe(true);
    expect(game.paint(0, 0, WHITE)).toBe(true);
    expect(game.verify()).toBe(false);
    expect(game.phase).toBe(PHASE.INCORRECT_FEEDBACK);
    expect(game.errors).toContainEqual({ row: 0, col: 0, expected: DARK, actual: WHITE, type: 'color' });
    expect(game.progress.stars).toBe(0);
    expect(game.retry()).toBe(true);
    expect(game.drawing[0][0]).toBe(WHITE);
    colorCorrectDrawing(game);
    expect(game.verify()).toBe(true);
    expect(game.progress.retries).toBe(1);
    expect(game.progress.stars).toBe(1);
  });

  it('requires a prediction before changing to the top camera, lets the child compare, then accept a fix', () => {
    const game = enter(3);
    expect(game.phase).toBe(PHASE.PREDICTING);
    expect(game.startFlight()).toBeNull();
    const correct = correctChoice(game);
    game.choose((correct + 1) % 4);
    takeFlight(game);
    expect(game.view).toBe(VIEW.TOP);
    expect(game.hasDiscovered).toBe(true);
    expect(game.verify()).toBe(false);
    expect(game.phase).toBe(PHASE.INCORRECT_FEEDBACK);
    game.choose(correct);
    expect(game.verify()).toBe(true);
    expect(game.progress.skills.projection).toBe(1);
  });

  it('requires X-ray discovery of an actual hidden block before verification and preserves the projection', () => {
    const game = enter(4);
    const snapshot = structuredClone(game.cubes);
    const projection = structuredClone(game.projection);
    expect(game.toggleXRay()).toBe(false);
    game.choose(correctChoice(game));
    takeFlight(game);
    expect(game.verify()).toBeNull();
    const solitary = game.cubes.find(({ x, z }) => x === 1 && z === 0);
    expect(game.toggleXRay()).toBe(true);
    game.inspect(solitary.id, 'top');
    expect(game.foundHidden).toBe(false);
    const stack = game.cubes.find(({ y }) => y === 1);
    game.inspect(stack.id, 'top');
    expect(game.inspection.column).toHaveLength(2);
    expect(game.inspection.hidden[0].topColor).toBe(WHITE);
    expect(game.foundHidden).toBe(true);
    expect(game.toggleXRay()).toBe(true);
    expect(game.cubes).toEqual(snapshot);
    expect(game.projection).toEqual(projection);
    expect(game.verify()).toBe(true);
    expect(game.progress.skills.occlusion).toBe(1);
  });

  it('lets supported explorers request camera help on the first detective puzzle', () => {
    const game = enter(5, { support: SUPPORT.ASSISTED });
    expect(game.canFly).toBe(false);
    expect(game.useHint()).toBe(true);
    expect(game.canFly).toBe(true);
    takeFlight(game);
    expect(game.phase).toBe(PHASE.PREDICTING);
    expect(game.verify()).toBeNull();
    game.choose(correctChoice(game));
    expect(game.verify()).toBe(true);
  });
});

describe('camera and scoring state', () => {
  it('rejects overlapping or out-of-date flight callbacks and keeps the geometry fixed', () => {
    const game = enter(3);
    const cubes = structuredClone(game.cubes);
    const projection = structuredClone(game.projection);
    game.choose(correctChoice(game));
    expect(game.setView(VIEW.FRONT)).toBe(true);
    const cancelled = game.startFlight();
    expect(game.startFlight()).toBeNull();
    expect(game.setView(VIEW.RIGHT)).toBe(false);
    expect(game.inspect(game.cubes[0].id, 'top')).toBe(false);
    game.reset();
    expect(game.finishFlight(cancelled)).toBe(false);
    game.choose(correctChoice(game));
    const token = game.startFlight();
    expect(game.finishFlight(cancelled)).toBe(false);
    expect(game.pause()).toBe(true);
    expect(game.finishFlight(token)).toBe(false);
    expect(game.resume()).toBe(true);
    expect(game.finishFlight(token)).toBe(true);
    expect(game.finishFlight(token)).toBe(false);
    expect(game.showIncline()).toBe(true);
    expect(game.projection).toEqual(projection);
    expect(game.cubes).toEqual(cubes);
    expect(game.prediction).toEqual(projection);
  });

  it('preserves scores on a restored progress save and grants each challenge a star only once', () => {
    const game = enter(3);
    for (let index = 0; index < 2; index += 1) {
      game.choose(correctChoice(game));
      takeFlight(game);
      game.verify();
      game.next();
    }
    expect(game.progress.stars).toBe(2);
    expect(game.support).toBe(SUPPORT.ASSISTED);
    const replay = enter(3, JSON.parse(JSON.stringify(game.progress)));
    replay.choose(correctChoice(replay));
    takeFlight(replay);
    expect(replay.verify()).toBe(true);
    expect(replay.progress.stars).toBe(2);
    replay.reset();
    expect(replay.predictionIndex).toBeNull();
    expect(replay.feedback).toBe('');
  });
});

describe('free building', () => {
  it('stacks without duplicates, updates occlusion on removal and undoes a move', () => {
    const game = enter(6);
    const { minX, minZ } = BUILD_BOUNDS;
    expect(game.edit('add', minX, minZ, WHITE)).toBe(true);
    expect(game.edit('add', minX, minZ, DARK)).toBe(true);
    expect(game.edit('add', minX, minZ, DARK)).toBe(true);
    expect(game.edit('add', minX, minZ, WHITE)).toBe(false);
    expect(game.cubes).toHaveLength(BUILD_HEIGHT);
    expect(game.projection[0][0]).toBe(DARK);
    expect(game.edit('remove', minX, minZ)).toBe(true);
    expect(game.edit('move', minX, minZ)).toBe(true);
    expect(game.moveSource.topColor).toBe(DARK);
    expect(game.edit('move', minX + 1, minZ)).toBe(true);
    expect(game.projection[0].slice(0, 2)).toEqual([WHITE, DARK]);
    expect(game.undo()).toBe(true);
    expect(game.projection[0].slice(0, 2)).toEqual([DARK, null]);
    expect(game.edit('color', minX, minZ, WHITE)).toBe(true);
    expect(game.projection[0][0]).toBe(WHITE);
  });

  it('loads a saved project, excludes invalid cubes, and restores a cleared project with undo', () => {
    const game = enter(6);
    game.edit('add', 0, 0, DARK);
    takeFlight(game);
    expect(game.phase).toBe(PHASE.BUILDING_3D);
    const saved = JSON.parse(JSON.stringify(game.build));
    saved.push({ ...saved[0], x: 3 }, { ...saved[0], x: 1, y: 1 }, { ...saved[0], topColor: WHITE });
    const loaded = enter(6, undefined, saved);
    expect(loaded.cubes).toHaveLength(1);
    expect(loaded.projection[2][2]).toBe(DARK);
    expect(loaded.clearBuild()).toBe(true);
    expect(loaded.projection.flat().every((value) => value === null)).toBe(true);
    expect(loaded.undo()).toBe(true);
    expect(loaded.projection[2][2]).toBe(DARK);
  });
});
