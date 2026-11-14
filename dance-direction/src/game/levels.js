function level(id, title, description, sticker, track, rounds) {
  return Object.freeze({
    id,
    title,
    name: title,
    description,
    sticker: Object.freeze(sticker),
    track,
    rounds: Object.freeze(rounds.map(round => Object.freeze(round))),
  })
}

export const LEVELS = Object.freeze([
  level(1, 'Tay nào đúng?', 'Giơ và vẫy tay cùng Mimo.', {
    id: 'friendly-paw', name: 'Bàn tay Mimo', icon: '🐾',
  }, 0, [
    ['raiseLeft'], ['raiseRight'], ['waveRight'],
    ['waveLeft'], ['raiseLeft'], ['waveRight'],
  ]),
  level(2, 'Bước chân vui nhộn', 'Bước sang trái và sang phải theo nhạc.', {
    id: 'dance-shoes', name: 'Giày nhảy vui', icon: '👟',
  }, 1, [
    ['stepLeft'], ['stepRight'], ['stepLeft'],
    ['stepRight'], ['stepRight'], ['stepLeft'],
  ]),
  level(3, 'Nhớ điệu nhảy', 'Xem Mimo làm mẫu rồi nhớ thứ tự.', {
    id: 'music-note', name: 'Nốt nhạc vui', icon: '🎵',
  }, 2, [
    ['stepLeft', 'stepRight'],
    ['waveRight', 'waveLeft'],
    ['stepRight', 'stepLeft', 'stepRight'],
    ['waveLeft', 'waveLeft', 'waveRight'],
    ['leanLeft', 'waveRight', 'stepLeft'],
    ['leanRight', 'stepLeft', 'waveRight'],
  ]),
  level(4, 'Đại tiệc cầu vồng', 'Kết hợp các điệu nhảy trong đại tiệc.', {
    id: 'rainbow-star', name: 'Sao cầu vồng', icon: '🌈',
  }, 3, [
    ['waveLeft'],
    ['stepRight'],
    ['leanLeft'],
    ['waveRight', 'stepLeft'],
    ['leanRight'],
    ['stepLeft', 'leanRight'],
    ['waveRight', 'stepRight', 'leanLeft'],
    ['leanLeft', 'waveRight', 'stepRight'],
  ]),
])
