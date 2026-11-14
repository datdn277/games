import { LEVELS } from './levels.js'

export const PROGRESS_KEY = 'mimo-dance-party.progress.v1'

function browserStorage() {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

function normalize(data) {
  const bestStars = {}
  for (const level of LEVELS) {
    const stars = data?.bestStars?.[level.id]
    if (Number.isInteger(stars) && stars > 0 && stars <= 3) bestStars[level.id] = stars
  }

  const savedLevel = Number.isInteger(data?.unlockedLevel) ? data.unlockedLevel : 1
  const highestCompleted = Math.max(0, ...Object.keys(bestStars).map(Number))
  const unlockedLevel = Math.min(LEVELS.length, Math.max(1, savedLevel, highestCompleted + 1))
  const stickers = LEVELS.map(level => level.sticker.id).filter(id =>
    Array.isArray(data?.stickers) && data.stickers.includes(id),
  )

  return Object.freeze({
    unlockedLevel,
    bestStars: Object.freeze(bestStars),
    totalStars: Object.values(bestStars).reduce((total, stars) => total + stars, 0),
    stickers: Object.freeze(stickers),
    muted: data?.muted === true,
    tutorialSeen: data?.tutorialSeen === true,
  })
}

export function createProgress(storage = browserStorage()) {
  let data
  try {
    data = JSON.parse(storage?.getItem(PROGRESS_KEY) ?? 'null')
  } catch {
    data = null
  }

  let progress = normalize(data)
  return {
    get current() {
      return progress
    },
    save(changes) {
      progress = normalize({ ...progress, ...changes })
      try {
        storage?.setItem(PROGRESS_KEY, JSON.stringify(progress))
      } catch {
        // The current session can still be played with storage disabled or full.
      }
      return progress
    },
  }
}
