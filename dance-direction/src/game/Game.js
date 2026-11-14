import { LEVELS } from './levels.js'
import { MOVES, validateAnswer } from './moves.js'
import { createProgress } from './progress.js'
import { generateRounds } from './sequence.js'
import { GameStateMachine, PAUSABLE_STATES, STATE } from './stateMachine.js'

export { LEVELS, MOVES, STATE }

const S = STATE
const INTRO_DURATION = 1.9
const CORRECT_DURATION = 0.93
const STEP_CORRECT_DURATION = 0.55
const INCORRECT_DURATION = 1.1
const CUE_ALIGNMENT_WINDOW = 0.075

export class Game {
  #machine
  #progress
  #random
  #emit
  #pendingLevel = null
  #tutorialReturn = S.MAIN_MENU
  #level = null
  #rounds = []
  #roundIndex = 0
  #stepIndex = 0
  #demonstratedIndex = -1
  #answer = null
  #feedback = null
  #result = null
  #stars = 0
  #attempts = 0
  #mistakes = 0
  #phase = null
  #timeLeft = 0
  #deadlineBeat = null
  #interlude = null

  constructor({ storage, random = Math.random, onEvent = () => {} } = {}) {
    this.#progress = createProgress(storage)
    this.#random = random
    this.#emit = onEvent
    this.#machine = new GameStateMachine(onEvent)
  }

  get state() {
    return this.#machine.state
  }

  get #round() {
    return this.#rounds[this.#roundIndex] ?? null
  }

  snapshot() {
    const round = this.#round
    return {
      state: this.state,
      pausedFrom: this.#machine.pausedFrom,
      level: this.#level,
      roundIndex: this.#roundIndex,
      roundCount: this.#rounds.length,
      round,
      stepIndex: this.#stepIndex,
      solvedSteps: this.#stepIndex + Number(this.#feedback?.correct === true),
      demonstratedIndex: this.#demonstratedIndex,
      cue: round?.moves[this.#demonstratedIndex] ?? null,
      answer: this.#answer,
      feedback: this.#feedback,
      stars: this.#stars,
      progress: this.#progress.current,
      result: this.#result,
      phase: this.#phase,
    }
  }

  send(action, payload) {
    switch (action) {
      case 'boot':
        return this.state === S.BOOT && this.#machine.transition(S.MAIN_MENU)
      case 'home':
        return this.#navigate(S.MAIN_MENU)
      case 'levels':
        return this.#navigate(S.LEVEL_SELECT)
      case 'tutorial':
        return this.#showTutorial()
      case 'dismissTutorial':
        return this.#dismissTutorial()
      case 'start':
        return this.#startLevel(payload)
      case 'answer':
        return this.#answerDirection(payload)
      case 'repeat':
        if (this.state !== S.AWAITING_INPUT) return false
        this.#demonstrateRound({ repeat: true })
        return true
      case 'next':
        if (this.state !== S.LEVEL_COMPLETE) return false
        return this.#result.nextLevel
          ? this.#startLevel(this.#result.nextLevel)
          : this.#navigate(S.LEVEL_SELECT)
      case 'retry':
        return this.state === S.LEVEL_COMPLETE && this.#startLevel(this.#level.id)
      case 'pause':
        return PAUSABLE_STATES.includes(this.state) && this.#machine.transition(S.PAUSED)
      case 'resume':
        return this.state === S.PAUSED && this.#machine.transition(this.#machine.pausedFrom)
      case 'toggleMute': {
        const { muted } = this.#progress.save({ muted: !this.#progress.current.muted })
        this.#emit({ type: 'mute', muted })
        return true
      }
      default:
        return false
    }
  }

  update(deltaSeconds, beatDurationSeconds = 0.6, clock = {}) {
    const elapsed = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0
    const beat = Number.isFinite(beatDurationSeconds) && beatDurationSeconds > 0
      ? beatDurationSeconds
      : 0.6

    switch (this.state) {
      case S.INTRO:
        if ((this.#timeLeft -= elapsed) <= 0) this.#demonstrateRound()
        break
      case S.DEMONSTRATING:
        this.#updateDemonstration(elapsed, beat, clock)
        break
      case S.CORRECT_FEEDBACK:
      case S.INCORRECT_FEEDBACK:
        if ((this.#timeLeft -= elapsed) <= 0) this.#finishFeedback()
        break
    }
  }

  #navigate(state) {
    if (!this.#machine.canTransition(state)) return false
    this.#resetRun()
    this.#pendingLevel = null
    return this.#machine.transition(state)
  }

  #showTutorial(level = null) {
    if (!this.#machine.canTransition(S.TUTORIAL)) return false
    this.#tutorialReturn = this.state
    this.#pendingLevel = level
    return this.#machine.transition(S.TUTORIAL)
  }

  #dismissTutorial() {
    if (this.state !== S.TUTORIAL) return false
    this.#progress.save({ tutorialSeen: true })
    const level = this.#pendingLevel
    this.#pendingLevel = null
    return level ? this.#startLevel(level.id) : this.#navigate(this.#tutorialReturn)
  }

  #startLevel(id) {
    if (!this.#machine.canTransition(S.INTRO)) return false
    const progress = this.#progress.current
    const level = id == null
      ? LEVELS.find(candidate => !progress.bestStars[candidate.id]) ?? LEVELS[0]
      : LEVELS.find(candidate => candidate.id === id)
    if (!level || level.id > progress.unlockedLevel) return false
    if (!progress.tutorialSeen && this.state !== S.TUTORIAL) return this.#showTutorial(level)

    this.#resetRun()
    this.#level = level
    this.#rounds = generateRounds(level, this.#random)
    this.#timeLeft = INTRO_DURATION
    this.#machine.transition(S.INTRO)
    this.#emit({ type: 'intro', level, duration: INTRO_DURATION })
    return true
  }

  #resetRun() {
    this.#level = null
    this.#rounds = []
    this.#roundIndex = 0
    this.#stepIndex = 0
    this.#demonstratedIndex = -1
    this.#answer = null
    this.#feedback = null
    this.#result = null
    this.#stars = 0
    this.#attempts = 0
    this.#mistakes = 0
    this.#phase = null
    this.#timeLeft = 0
    this.#deadlineBeat = null
    this.#interlude = null
  }

  #demonstrateRound({ repeat = false } = {}) {
    this.#answer = null
    this.#feedback = null
    this.#demonstratedIndex = -1
    this.#deadlineBeat = null
    this.#interlude = repeat ? null : this.#round.interlude
    this.#phase = 'aligning'
    this.#machine.transition(S.DEMONSTRATING)
  }

  #updateDemonstration(elapsed, beat, clock) {
    const { currentBeat, beatPhase } = clock
    const position = Number.isFinite(currentBeat) && Number.isFinite(beatPhase)
      ? currentBeat + beatPhase
      : null
    if (this.#phase === 'aligning' && this.#deadlineBeat === null && position !== null) {
      this.#deadlineBeat = beatPhase > CUE_ALIGNMENT_WINDOW ? currentBeat + 1 : currentBeat
    }

    this.#timeLeft = position !== null && this.#deadlineBeat !== null
      ? (this.#deadlineBeat - position) * beat
      : this.#timeLeft - elapsed
    if (this.#timeLeft > 0) return

    const anchor = position !== null && this.#deadlineBeat !== null
      && position - this.#deadlineBeat <= CUE_ALIGNMENT_WINDOW
      ? this.#deadlineBeat
      : position
    if (this.#phase === 'aligning' && this.#interlude) {
      this.#setDemoPhase('interlude', 3, beat, anchor)
      this.#emit({ type: 'interlude', ...this.#interlude, duration: 3 * beat })
    } else if (this.#phase === 'aligning' || this.#phase === 'interlude' || this.#phase === 'gap') {
      this.#showCue(beat, anchor)
    } else if (this.#demonstratedIndex + 1 < this.#round.moves.length) {
      this.#setDemoPhase('gap', 0.5, beat, anchor)
    } else {
      this.#phase = null
      this.#machine.transition(S.AWAITING_INPUT)
    }
  }

  #setDemoPhase(phase, beats, beatDuration, anchor) {
    this.#phase = phase
    this.#timeLeft = beats * beatDuration
    this.#deadlineBeat = anchor === null ? null : anchor + beats
  }

  #showCue(beat, anchor) {
    const step = ++this.#demonstratedIndex
    const { moves } = this.#round
    const beats = moves.length === 1 ? 3 : 2.5
    this.#setDemoPhase('cue', beats, beat, anchor)
    this.#emit({
      type: 'cue',
      move: moves[step],
      step,
      sequenceLength: moves.length,
      duration: this.#timeLeft,
    })
  }

  #answerDirection(direction) {
    if (this.state !== S.AWAITING_INPUT || (direction !== 'left' && direction !== 'right')) {
      return false
    }

    const move = this.#round.moves[this.#stepIndex]
    const correct = validateAnswer(move, direction)
    const roundComplete = correct && this.#stepIndex + 1 === this.#round.moves.length
    this.#attempts++
    if (!correct) this.#mistakes++
    if (roundComplete) this.#stars = Math.floor((3 * (this.#roundIndex + 1)) / this.#rounds.length)

    this.#answer = direction
    this.#feedback = Object.freeze({ correct, direction, move, roundComplete, stars: this.#stars })
    this.#timeLeft = roundComplete ? CORRECT_DURATION : correct ? STEP_CORRECT_DURATION : INCORRECT_DURATION
    this.#machine.transition(correct ? S.CORRECT_FEEDBACK : S.INCORRECT_FEEDBACK)
    this.#emit({ type: 'feedback', ...this.#feedback, duration: this.#timeLeft })
    return true
  }

  #finishFeedback() {
    const { correct, roundComplete } = this.#feedback
    if (roundComplete && this.#roundIndex + 1 === this.#rounds.length) {
      this.#completeLevel()
      return
    }

    this.#answer = null
    this.#feedback = null
    if (roundComplete) {
      this.#roundIndex++
      this.#stepIndex = 0
      this.#demonstrateRound()
    } else {
      if (correct) this.#stepIndex++
      this.#machine.transition(S.AWAITING_INPUT)
    }
  }

  #completeLevel() {
    const level = this.#level
    const nextLevel = LEVELS[level.id]?.id ?? null
    const progress = this.#progress.current
    const stickers = new Set([...progress.stickers, level.sticker.id])
    this.#progress.save({
      unlockedLevel: Math.max(progress.unlockedLevel, nextLevel ?? level.id),
      bestStars: { ...progress.bestStars, [level.id]: this.#stars },
      stickers: [...stickers],
    })
    this.#result = Object.freeze({
      level,
      stars: this.#stars,
      correct: this.#rounds.length,
      total: this.#rounds.length,
      attempts: this.#attempts,
      mistakes: this.#mistakes,
      sticker: level.sticker,
      nextLevel,
      isFinal: nextLevel === null,
    })
    this.#machine.transition(S.LEVEL_COMPLETE)
    this.#emit({ type: 'complete', result: this.#result })
  }
}
