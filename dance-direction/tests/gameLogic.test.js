import test from 'node:test'
import assert from 'node:assert/strict'
import { Game, LEVELS, MOVES, STATE } from '../src/game/Game.js'
import { validateAnswer } from '../src/game/moves.js'
import { PROGRESS_KEY } from '../src/game/progress.js'
import { generateRounds } from '../src/game/sequence.js'
import { GameStateMachine } from '../src/game/stateMachine.js'

function memoryStorage() {
  const entries = new Map()
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  }
}

function createTestGame({ storage = memoryStorage(), onEvent } = {}) {
  const game = new Game({ storage, random: () => 0.9, onEvent })
  assert.equal(game.send('boot'), true)
  return game
}

function advanceTo(game, destination) {
  for (let count = 0; count < 100 && game.state !== destination; count++) game.update(0.25)
  assert.equal(game.state, destination)
}

function completeCurrentLevel(game) {
  for (let count = 0; count < 30 && game.state !== STATE.LEVEL_COMPLETE; count++) {
    advanceTo(game, STATE.AWAITING_INPUT)
    const { round, stepIndex, roundIndex, roundCount } = game.snapshot()
    assert.equal(game.send('answer', round.moves[stepIndex].direction), true)
    if (roundIndex + 1 === roundCount && stepIndex + 1 === round.moves.length) {
      advanceTo(game, STATE.LEVEL_COMPLETE)
    }
  }
  assert.equal(game.state, STATE.LEVEL_COMPLETE)
}

test('all moves consistently map to their on-screen directions', () => {
  for (const move of Object.values(MOVES)) {
    const expected = move.animation.endsWith('Left') ? 'left' : 'right'
    assert.equal(move.direction, expected)
    assert.equal(validateAnswer(move, expected), true)
    assert.equal(validateAnswer(move, expected === 'left' ? 'right' : 'left'), false)
    assert.equal(validateAnswer(move, 'up'), false)
  }
  assert.equal(validateAnswer(undefined, 'left'), false)
})

test('round generation preserves progressive sequence lengths and offers mirrored replay variety', () => {
  for (const level of LEVELS) {
    const original = generateRounds(level, () => 0.9)
    const replay = generateRounds(level, () => 0.1)
    assert.ok(original.length >= 5 && original.length <= 8)
    assert.deepEqual(original.map(round => round.moves.length), replay.map(round => round.moves.length))
    assert.deepEqual(original.slice(0, 2), replay.slice(0, 2))
    for (let i = 2; i < original.length; i++) {
      original[i].moves.forEach((move, index) => {
        assert.notEqual(move.direction, replay[i].moves[index].direction)
      })
    }
  }

  const memoryRounds = generateRounds(LEVELS[2])
  assert.deepEqual(memoryRounds.map(round => round.moves.length), [2, 2, 3, 3, 3, 3])
  assert.deepEqual(generateRounds(LEVELS[3]).flatMap(round => round.interlude ?? []), [
    { animation: 'clap', theme: 'mint' },
    { animation: 'happy', theme: 'pink' },
  ])
})

test('state machine rejects gaps and resumes only the exact paused state', () => {
  const machine = new GameStateMachine()
  assert.equal(machine.transition(STATE.AWAITING_INPUT), false)
  assert.equal(machine.transition(STATE.MAIN_MENU), true)
  assert.equal(machine.transition(STATE.INTRO), true)
  assert.equal(machine.transition(STATE.PAUSED), true)
  assert.equal(machine.pausedFrom, STATE.INTRO)
  assert.equal(machine.transition(STATE.AWAITING_INPUT), false)
  assert.equal(machine.transition(STATE.INTRO), true)
  assert.equal(machine.pausedFrom, null)
  assert.equal(machine.transition(STATE.DEMONSTRATING), true)
  assert.equal(machine.transition(STATE.CORRECT_FEEDBACK), false)
})

test('first-time tutorial remembers the requested level and does not trap manual tutorial', () => {
  const storage = memoryStorage()
  storage.setItem(PROGRESS_KEY, JSON.stringify({ unlockedLevel: 3 }))
  const game = createTestGame({ storage })
  assert.equal(game.send('start', 4), false)
  assert.equal(game.send('levels'), true)
  assert.equal(game.send('start', 3), true)
  assert.equal(game.state, STATE.TUTORIAL)
  assert.equal(game.send('dismissTutorial'), true)
  assert.equal(game.snapshot().level.id, 3)
  assert.equal(game.snapshot().progress.tutorialSeen, true)

  assert.equal(game.send('home'), true)
  assert.equal(game.send('tutorial'), true)
  assert.equal(game.send('dismissTutorial'), true)
  assert.equal(game.state, STATE.MAIN_MENU)
})

test('beat alignment waits for the next beat and input remains untimed', () => {
  const events = []
  const game = createTestGame({ onEvent: event => events.push(event) })
  game.send('start', 1)
  game.send('dismissTutorial')
  game.update(2)
  const cues = () => events.filter(event => event.type === 'cue')
  assert.equal(game.state, STATE.DEMONSTRATING)
  assert.equal(game.send('answer', 'left'), false)
  game.update(0.01, 0.6, { currentBeat: 3, beatPhase: 0.2 })
  game.update(0.1, 0.6, { currentBeat: 3, beatPhase: 0.4 })
  assert.equal(cues().length, 0)
  game.update(0.36, 0.6, { currentBeat: 4, beatPhase: 0.001 })
  assert.equal(cues().length, 1)
  assert.ok(Math.abs(cues()[0].duration - 1.8) < 0.00001)
  assert.equal(cues()[0].move.id, 'raiseLeft')
  advanceTo(game, STATE.AWAITING_INPUT)

  game.update(3600)
  assert.equal(game.state, STATE.AWAITING_INPUT)
  assert.equal(game.send('answer', 'right'), true)
  assert.equal(game.state, STATE.INCORRECT_FEEDBACK)
  assert.equal(game.send('answer', 'left'), false)
  advanceTo(game, STATE.AWAITING_INPUT)
  assert.equal(game.snapshot().roundIndex, 0)
  assert.equal(game.send('answer', 'left'), true)
  assert.equal(game.state, STATE.CORRECT_FEEDBACK)
  assert.equal(game.send('answer', 'left'), false)
  advanceTo(game, STATE.AWAITING_INPUT)
  assert.equal(game.snapshot().roundIndex, 1)
})

test('pausing freezes demonstration and going home cancels the remaining cues', () => {
  const events = []
  const game = createTestGame({ onEvent: event => events.push(event) })
  game.send('start', 1)
  game.send('dismissTutorial')
  game.update(2)
  game.update(0.1)
  assert.equal(game.send('pause'), true)
  assert.equal(game.snapshot().pausedFrom, STATE.DEMONSTRATING)
  assert.equal(game.send('answer', 'left'), false)
  game.update(120)
  assert.equal(game.state, STATE.PAUSED)
  assert.equal(game.send('resume'), true)
  game.update(0.1)
  assert.equal(game.state, STATE.DEMONSTRATING)
  assert.equal(game.send('home'), true)
  const eventCount = events.length
  game.update(20)
  assert.equal(events.length, eventCount)
  assert.equal(game.snapshot().round, null)
})

test('successive demonstration cues follow the audio beat when frame time is capped', () => {
  const storage = memoryStorage()
  storage.setItem(PROGRESS_KEY, JSON.stringify({ unlockedLevel: 3, tutorialSeen: true }))
  const events = []
  const game = createTestGame({ storage, onEvent: event => events.push(event) })
  game.send('start', 3)
  game.update(2)

  game.update(0.01, 0.6, { currentBeat: 4, beatPhase: 0.02 })
  game.update(0.01, 0.6, { currentBeat: 6, beatPhase: 0.49 })
  assert.equal(game.snapshot().phase, 'cue')
  game.update(0.01, 0.6, { currentBeat: 6, beatPhase: 0.53 })
  assert.equal(game.snapshot().phase, 'gap')
  game.update(0.01, 0.6, { currentBeat: 7, beatPhase: 0.02 })
  assert.deepEqual(events.filter(event => event.type === 'cue').map(event => event.move.direction), ['left', 'right'])
  game.update(0.01, 0.6, { currentBeat: 9, beatPhase: 0.5 })
  assert.equal(game.state, STATE.AWAITING_INPUT)
})

test('memory repeat restores the sequence but retains already correct input', () => {
  const storage = memoryStorage()
  storage.setItem(PROGRESS_KEY, JSON.stringify({ unlockedLevel: 3, tutorialSeen: true }))
  const events = []
  const game = createTestGame({ storage, onEvent: event => events.push(event) })
  assert.equal(game.send('start', 3), true)
  advanceTo(game, STATE.AWAITING_INPUT)
  assert.equal(game.send('answer', 'left'), true)
  advanceTo(game, STATE.AWAITING_INPUT)
  assert.equal(game.snapshot().stepIndex, 1)
  assert.equal(game.send('repeat'), true)
  assert.equal(game.send('answer', 'right'), false)
  advanceTo(game, STATE.AWAITING_INPUT)
  assert.deepEqual(events.filter(event => event.type === 'cue').map(event => event.move.direction), [
    'left', 'right', 'left', 'right',
  ])
  assert.equal(game.snapshot().stepIndex, 1)
  assert.equal(game.send('answer', 'right'), true)
  assert.equal(game.snapshot().feedback.roundComplete, true)
})

test('all four levels finish, unlock in order, save stars and stickers, and can be replayed', () => {
  const storage = memoryStorage()
  const game = createTestGame({ storage })
  assert.equal(game.send('start', 2), false)
  assert.equal(game.send('start'), true)
  assert.equal(game.send('dismissTutorial'), true)
  for (const level of LEVELS) {
    completeCurrentLevel(game)
    const { result, progress } = game.snapshot()
    assert.equal(result.level, level)
    assert.equal(result.correct, result.total)
    assert.equal(result.stars, 3)
    assert.equal(progress.unlockedLevel, Math.min(LEVELS.length, level.id + 1))
    assert.equal(progress.totalStars, level.id * 3)
    assert.equal(progress.stickers.length, level.id)
    assert.equal(game.send('next'), true)
  }
  assert.equal(game.state, STATE.LEVEL_SELECT)

  assert.equal(game.send('start', 1), true)
  completeCurrentLevel(game)
  assert.equal(game.send('retry'), true)
  assert.equal(game.state, STATE.INTRO)
  assert.equal(game.snapshot().stars, 0)
  assert.equal(game.snapshot().progress.totalStars, 12)
  assert.equal(game.send('toggleMute'), true)
  const saved = createTestGame({ storage }).snapshot().progress
  assert.equal(saved.unlockedLevel, 4)
  assert.equal(saved.totalStars, 12)
  assert.equal(saved.stickers.length, 4)
  assert.equal(saved.muted, true)
  assert.equal(saved.tutorialSeen, true)
})

test('corrupt or unavailable storage falls back to a new game', () => {
  const corrupted = { getItem: () => 'invalid' }
  const unavailable = {
    getItem() { throw new Error('storage unavailable') },
    setItem() { throw new Error('storage unavailable') },
  }
  assert.equal(createTestGame({ storage: corrupted }).snapshot().progress.unlockedLevel, 1)
  const game = createTestGame({ storage: unavailable })
  assert.equal(game.send('toggleMute'), true)
  assert.equal(game.snapshot().progress.muted, true)
})
