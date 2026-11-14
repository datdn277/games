import { MOVES } from './moves.js'

const FESTIVAL_BREAKS = Object.freeze({
  2: Object.freeze({ animation: 'clap', theme: 'mint' }),
  5: Object.freeze({ animation: 'happy', theme: 'pink' }),
})

function mirror(move) {
  const original = move.direction === 'left' ? 'Left' : 'Right'
  const opposite = move.direction === 'left' ? 'Right' : 'Left'
  return MOVES[move.id.replace(original, opposite)]
}

export function generateRounds(level, random = Math.random) {
  // The opening examples always establish the left/right mapping in order.
  const mirrorLaterRounds = random() < 0.5
  return level.rounds.map((ids, index) => {
    const moves = ids.map(id => MOVES[id])
    return Object.freeze({
      moves: Object.freeze(mirrorLaterRounds && index >= 2 ? moves.map(mirror) : moves),
      interlude: level.id === 4 ? FESTIVAL_BREAKS[index] ?? null : null,
    })
  })
}
