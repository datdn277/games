export const STATE = Object.freeze({
  BOOT: 'BOOT',
  MAIN_MENU: 'MAIN_MENU',
  LEVEL_SELECT: 'LEVEL_SELECT',
  TUTORIAL: 'TUTORIAL',
  INTRO: 'INTRO',
  DEMONSTRATING: 'DEMONSTRATING',
  AWAITING_INPUT: 'AWAITING_INPUT',
  CORRECT_FEEDBACK: 'CORRECT_FEEDBACK',
  INCORRECT_FEEDBACK: 'INCORRECT_FEEDBACK',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  PAUSED: 'PAUSED',
})

const S = STATE
export const PAUSABLE_STATES = Object.freeze([
  S.INTRO, S.DEMONSTRATING, S.AWAITING_INPUT, S.CORRECT_FEEDBACK, S.INCORRECT_FEEDBACK,
])

const transitions = {
  [S.BOOT]: [S.MAIN_MENU],
  [S.MAIN_MENU]: [S.LEVEL_SELECT, S.TUTORIAL, S.INTRO],
  [S.LEVEL_SELECT]: [S.MAIN_MENU, S.TUTORIAL, S.INTRO],
  [S.TUTORIAL]: [S.MAIN_MENU, S.LEVEL_SELECT, S.INTRO],
  [S.INTRO]: [S.DEMONSTRATING],
  [S.DEMONSTRATING]: [S.AWAITING_INPUT],
  [S.AWAITING_INPUT]: [S.DEMONSTRATING, S.CORRECT_FEEDBACK, S.INCORRECT_FEEDBACK],
  [S.CORRECT_FEEDBACK]: [S.AWAITING_INPUT, S.DEMONSTRATING, S.LEVEL_COMPLETE],
  [S.INCORRECT_FEEDBACK]: [S.AWAITING_INPUT],
  [S.LEVEL_COMPLETE]: [S.MAIN_MENU, S.LEVEL_SELECT, S.INTRO],
  [S.PAUSED]: [S.MAIN_MENU, S.LEVEL_SELECT],
}

export class GameStateMachine {
  #state = S.BOOT
  #pausedFrom = null
  #onTransition

  constructor(onTransition = () => {}) {
    this.#onTransition = onTransition
  }

  get state() {
    return this.#state
  }

  get pausedFrom() {
    return this.#pausedFrom
  }

  canTransition(next) {
    if (next === this.#state) return false
    return transitions[this.#state].includes(next)
      || (PAUSABLE_STATES.includes(this.#state)
        && [S.MAIN_MENU, S.LEVEL_SELECT, S.PAUSED].includes(next))
      || (this.#state === S.PAUSED && next === this.#pausedFrom)
  }

  transition(next) {
    if (!this.canTransition(next)) return false

    const previous = this.#state
    this.#pausedFrom = next === S.PAUSED ? previous : null
    this.#state = next
    this.#onTransition({ type: 'state', state: next, previous })
    return true
  }
}
