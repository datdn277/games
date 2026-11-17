import { BALANCE, getBalance } from './weights.js';
import { validatePuzzle } from './puzzle-validator.js';

const EQUAL = BALANCE.BALANCED;
const HEAVIER = BALANCE.LEFT_HEAVIER;

export const CAPACITY = 6;
export const EQUIVALENCES = [
  { left: ['buffalo'], right: ['fox', 'fox'], relation: EQUAL },
  { left: ['fox'], right: ['dog', 'dog'], relation: EQUAL },
];

const INEQUALITIES = [
  { left: ['buffalo'], right: ['fox'], relation: HEAVIER },
  { left: ['fox'], right: ['dog'], relation: HEAVIER },
];

const choices = [
  { id: 'left', label: 'Bên trái' },
  { id: 'right', label: 'Bên phải' },
  { id: 'equal', label: 'Thăng bằng' },
];

function compare(id, board, intent, options = {}) {
  const relation = getBalance(board.left, board.right).state;
  const lighter = intent === 'lighter';
  const expected = relation === EQUAL ? 'equal' : (relation === HEAVIER) === !lighter ? 'left' : 'right';
  return {
    id,
    type: 'compare',
    board,
    intent,
    expected,
    choices,
    prompt: lighter ? 'Đĩa cân nào nhẹ hơn?' : 'Đĩa cân nào nặng hơn?',
    success: relation === EQUAL
      ? 'Hai đĩa ngang nhau. Hai bên đang thăng bằng!'
      : 'Đĩa nặng hơn hạ thấp. Đĩa nhẹ hơn nâng cao.',
    hints: ['Nhìn xem hai đĩa cân ở độ cao nào.', lighter
      ? 'Đĩa nào nằm cao hơn? Đó là đĩa nhẹ hơn.'
      : 'Đĩa nào nằm thấp hơn? Đó là đĩa nặng hơn.'],
    ...options,
  };
}

function balance(id, fixed, animal, target, options = {}) {
  const fixedSide = target === 'left' ? 'right' : 'left';
  return {
    id,
    type: 'balance',
    board: { left: [], right: [], [fixedSide]: [fixed] },
    animals: [animal],
    target,
    prompt: 'Bé thử làm chiếc cân thăng bằng!',
    hints: [
      'Thử đặt từng bạn lên đĩa trống và quan sát cân.',
      'Đĩa đang cao hơn nhẹ hơn. Bé có thể thêm vào đĩa cao hoặc bớt ở đĩa thấp.',
    ],
    ...options,
  };
}

const detective = balance('combine-clues', 'buffalo', 'dog', 'right', {
  type: 'detective',
  prompt: 'Cần bao nhiêu bạn chó để cân C thăng bằng?',
  facts: EQUIVALENCES,
  challenge: { left: ['buffalo'], availableAnimal: 'dog', maxAvailableCount: CAPACITY },
  hints: [
    'Ở cân A, một bạn trâu cân bằng với mấy bạn cáo?',
    'Ở cân B, mỗi bạn cáo cân bằng với mấy bạn chó?',
    'Có hai bạn cáo. Thử thay từng bạn bằng một nhóm hai bạn chó nhé!',
  ],
  success: 'Một trâu cân bằng với hai cáo. Mỗi cáo cân bằng với hai chó. Hai nhóm hai chó là bốn chó!',
});

const tilt = compare('follow-tilt', { left: ['buffalo'], right: ['dog'] }, 'heavier', {
  prompt: 'Dựa vào cân A và B, ở cân C bạn nào nặng hơn?',
  facts: INEQUALITIES,
  challenge: { left: ['buffalo'], right: ['dog'] },
  hints: [
    'So sánh trâu với cáo ở cân A. Đĩa nào thấp hơn?',
    'Ở cân B, cáo nặng hơn hay nhẹ hơn chó?',
    'Tìm bạn nặng hơn cáo rồi so với bạn nhẹ hơn cáo.',
  ],
  success: 'Cân A cho biết trâu nặng hơn cáo. Cân B cho biết cáo nặng hơn chó. Vậy trâu nặng hơn chó!',
});

export const LEVELS = [
  {
    id: 1,
    title: 'Ai nặng hơn?',
    description: 'Quan sát đĩa cân nâng lên và hạ xuống.',
    tutorial: 'Chào bé! Mình là Mimo. Bé hãy nhìn hai đĩa cân rồi chọn câu trả lời.',
    rounds: [
      compare('heavy-left', { left: ['buffalo'], right: ['dog'] }, 'heavier'),
      compare('heavy-right', { left: ['dog'], right: ['fox'] }, 'heavier'),
      compare('equal-plates', { left: ['fox'], right: ['fox'] }, 'heavier'),
      compare('light-side', { left: ['fox'], right: ['buffalo'] }, 'lighter'),
    ],
  },
  {
    id: 2,
    title: 'Làm cân thăng bằng',
    description: 'Thêm hoặc bớt bạn thú để cân nằm ngang.',
    tutorial: 'Bé kéo từng bạn ở khay lên đĩa cân. Bé cũng có thể chạm vào bạn thú rồi chạm đĩa cân.',
    rounds: [
      balance('first-balance', 'fox', 'dog', 'right', {
        success: 'Hai bạn chó cân bằng với một bạn cáo. Cả hai đĩa đang ở cùng độ cao!',
      }),
    ],
  },
  {
    id: 3,
    title: 'Một bằng nhiều',
    description: 'Thử cân một bạn thú với cả một nhóm.',
    tutorial: 'Một bạn thú đôi khi cân bằng với cả một nhóm. Bé thử khám phá những cặp mới nhé!',
    knowledge: EQUIVALENCES,
    rounds: [
      balance('buffalo-foxes', 'buffalo', 'fox', 'right', {
        success: 'Một bạn trâu cân bằng với hai bạn cáo!',
      }),
      balance('fox-dogs', 'fox', 'dog', 'left', {
        success: 'Hai bạn chó cân bằng với một bạn cáo!',
      }),
    ],
  },
  {
    id: 4,
    title: 'Phép thay thế kỳ diệu',
    description: 'Nhấc từng bạn cáo ra và tìm nhóm thay thế.',
    tutorial: 'Chiếc cân đang ngang. Bé thử thay từng bạn cáo bằng một nhóm chó để giữ cân thăng bằng nhé!',
    rounds: [{
      id: 'substitute-foxes',
      type: 'substitute',
      board: { left: ['buffalo'], right: ['fox', 'fox'] },
      target: 'right',
      animals: ['dog'],
      prompt: 'Bé hãy nhấc một bạn cáo ra khỏi đĩa phải.',
      success: 'Mỗi nhóm hai bạn chó thay được một cáo. Hai nhóm ghép lại thành bốn bạn chó, cân bằng với một bạn trâu!',
    }],
  },
  {
    id: 5,
    title: 'Thám tử chiếc cân',
    description: 'Kết hợp dữ kiện từ cân A và cân B để giải cân C.',
    tutorial: 'Xem chiếc cân A và B để tìm manh mối. Sau đó, bé tự thử trên cân C nhé!',
    rounds: [detective, tilt],
  },
  {
    id: 6,
    title: 'Bé tự tạo câu đố',
    description: 'Thử mọi cách đặt thú lên hai đĩa cân.',
    tutorial: 'Khu thí nghiệm là của bé! Hãy thử kéo các bạn thú lên cả hai bên rồi xem cân thay đổi ra sao.',
    rounds: [{
      id: 'free-lab',
      type: 'free',
      board: { left: [], right: [] },
      animals: ['dog', 'fox', 'buffalo'],
      prompt: 'Bé thử tạo một chiếc cân thăng bằng nhé!',
      hints: [
        'Bé có thể tạo một thăng bằng bằng cách khác không?',
        'Bé thử thay hai bạn chó bằng một bạn cáo.',
        'Bé thử làm đĩa phải nặng hơn đĩa trái.',
      ],
    }],
  },
];

export const SUBSTITUTION_STEPS = [
  {
    prompt: 'Bé hãy nhấc một bạn cáo ra khỏi đĩa phải.',
    hints: [
      'Quan sát hai bạn cáo trên đĩa phải.',
      'Chạm vào một bạn cáo ở đĩa phải để nhấc bạn ấy ra.',
    ],
  },
  {
    prompt: 'Thêm các bạn chó để cân ngang trở lại.',
    hints: [
      'Sau khi nhấc cáo ra, đĩa nào đang cao hơn?',
      'Bé thử thêm từng bạn chó vào đĩa phải và nhìn đòn cân.',
    ],
    success: 'Cân đã ngang! Một trâu cân bằng với một cáo và hai chó.',
  },
  {
    prompt: 'Bé thử nhấc bạn cáo còn lại ra nhé!',
    hints: ['Tìm bạn cáo còn lại trên đĩa phải.', 'Chạm bạn cáo để nhấc bạn ấy ra.'],
  },
  {
    prompt: 'Thử thêm chó thay bạn cáo vừa nhấc ra.',
    hints: [
      'Nhớ xem nhóm chó vừa rồi đã giúp cân ngang như thế nào.',
      'Thử thêm từng bạn chó tới khi hai đĩa ngang nhau.',
    ],
    success: 'Cân lại ngang rồi! Một trâu cân bằng với bốn chó.',
  },
  {
    prompt: 'Vì sao cần bốn bạn chó?',
    hints: [
      'Mỗi nhóm có hai bạn chó. Bé hãy ghép mỗi nhóm với một bạn cáo.',
      'Ghép cả hai nhóm để thay cả hai bạn cáo ban đầu.',
    ],
  },
];

for (const question of [detective, tilt]) {
  const { valid, reason } = validatePuzzle({ facts: question.facts, challenge: question.challenge });
  if (!valid) throw new Error(`Bài ${question.id} không hợp lệ (${reason}).`);
}
