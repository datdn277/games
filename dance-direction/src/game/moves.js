function move(id, direction, animation, prompt, narration) {
  return Object.freeze({ id, direction, animation, prompt, narration })
}

export const MOVES = Object.freeze({
  raiseLeft: move('raiseLeft', 'left', 'waveLeft', 'Giơ tay trái', 'Bé ơi, hãy giơ tay trái nào!'),
  raiseRight: move('raiseRight', 'right', 'waveRight', 'Giơ tay phải', 'Bé ơi, hãy giơ tay phải nào!'),
  waveLeft: move('waveLeft', 'left', 'waveLeft', 'Vẫy tay trái', 'Cùng Mimo vẫy tay trái nào!'),
  waveRight: move('waveRight', 'right', 'waveRight', 'Vẫy tay phải', 'Cùng Mimo vẫy tay phải nào!'),
  stepLeft: move('stepLeft', 'left', 'stepLeft', 'Bước sang trái', 'Mình bước một bước sang trái nhé!'),
  stepRight: move('stepRight', 'right', 'stepRight', 'Bước sang phải', 'Mình bước một bước sang phải nhé!'),
  leanLeft: move('leanLeft', 'left', 'leanLeft', 'Nghiêng sang trái', 'Nghiêng người sang trái cùng Mimo nào!'),
  leanRight: move('leanRight', 'right', 'leanRight', 'Nghiêng sang phải', 'Nghiêng người sang phải cùng Mimo nào!'),
})

export function validateAnswer(move, direction) {
  return (direction === 'left' || direction === 'right') && move?.direction === direction
}
