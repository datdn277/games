export const SIDE = {
  LEFT_TO_RIGHT: 'trái',
  RIGHT_TO_LEFT: 'phải',
};
export const NUMBERS = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy'];
export const ORDINALS = ['', 'nhất', 'hai', 'ba', 'tư', 'năm', 'sáu', 'bảy'];

export function questionText(question) {
  const side = SIDE[question.direction];
  if (question.type === 'CHOOSE_FLAG') return `Bé chạm lá cờ bên ${side} nhé!`;
  if (question.type === 'CHOOSE_END_ANIMAL') return `Bạn nào đứng ngoài cùng bên ${side}?`;
  return `Bạn nào đứng thứ ${ORDINALS[question.targetOrdinal]} từ bên ${side}?`;
}

export function directionKey(direction) {
  return direction === 'LEFT_TO_RIGHT' ? 'left' : 'right';
}
