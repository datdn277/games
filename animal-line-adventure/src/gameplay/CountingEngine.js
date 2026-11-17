import { indexForOrdinal } from './Ordinal.js';

export function nextCountIndex(question, counted) {
  const ordinal = counted.length + 1;
  if (ordinal > question.targetOrdinal) return null;
  return indexForOrdinal(question.animals.length, question.direction, ordinal);
}

export function countAnimal(question, counted, index) {
  const expected = nextCountIndex(question, counted);
  if (expected === null || index !== expected) {
    return { correct: false, counted };
  }

  const ordinal = counted.length + 1;
  return {
    correct: true,
    counted: Object.freeze([...counted, index]),
    ordinal,
    done: ordinal === question.targetOrdinal,
  };
}
