import { COLORS, getAnswerOptions } from './projection.js';

const { WHITE, DARK } = COLORS;
const standard = Object.freeze({ minX: -1, maxX: 1, minZ: -1, maxZ: 1 });
const wide = Object.freeze({ minX: -1, maxX: 2, minZ: -1, maxZ: 2 });
export const BUILD_BOUNDS = Object.freeze({ minX: -2, maxX: 2, minZ: -2, maxZ: 2 });

const w = (x, z, y = 0, sideColor = WHITE) => [x, y, z, WHITE, sideColor];
const d = (x, z, y = 0, sideColor = DARK) => [x, y, z, DARK, sideColor];

function puzzle(id, type, layout, config = {}) {
  const { bounds = standard, correctSlot, advanced = false, prompt, ...extra } = config;
  const cubes = layout.map(([x, y, z, topColor, sideColor], index) => ({
    id: `${id}-${index + 1}`, x, y, z, topColor, sideColor,
  }));
  const question = { id, type, prompt, cubes, bounds, ...extra };
  if (type === 'choice' || type === 'xray') {
    question.options = getAnswerOptions(cubes, bounds, { advanced, correctSlot });
  }
  return question;
}

const choicePrompt = 'Nhìn từ trên, bé sẽ thấy hình nào?';

export const LEVELS = [
  {
    id: 1,
    title: 'Làm quen khối vuông',
    description: 'Tìm mặt trên và mặt đứng của khối lập phương.',
    tutorial: 'Chào bé, mình là Bobo! Hãy chạm các mặt của khối vuông để cùng khám phá nhé.',
    rounds: [
      puzzle('one-block', 'faces', [d(0, 0, 0, WHITE)], { prompt: 'Chiếc khối vuông có những mặt nào?' }),
      puzzle('three-blocks', 'faces', [w(-1, 0), d(0, 0), d(0, -1, 0, WHITE)], { prompt: 'Tìm các mặt của công trình nhỏ.' }),
    ],
  },
  {
    id: 2,
    title: 'Những ô màu kỳ diệu',
    description: 'Nhìn từ trên rồi tô từng ô của hình chiếu.',
    tutorial: 'Mỗi mặt trên nhìn thấy sẽ ứng với một ô. Mình cùng bay lên xem các ô nằm ở đâu nhé!',
    rounds: [
      puzzle('tiny-corner', 'grid', [d(-1, -1), w(-1, 0), d(0, 0)], { prompt: 'Ghép các ô màu giống những mặt trên.' }),
      puzzle('four-tiles', 'grid', [w(0, -1), d(1, -1), w(0, 0), d(-1, 0)], { prompt: 'Tô đúng màu và đúng vị trí trên lưới.' }),
    ],
  },
  {
    id: 3,
    title: 'Bay lên nhìn từ trên',
    description: 'Dự đoán bố cục rồi bay lên để kiểm chứng.',
    tutorial: 'Hãy quan sát công trình, chọn hình con nghĩ sẽ thấy, rồi bay lên kiểm chứng cùng mình.',
    rounds: [
      puzzle('letter-l', 'choice', [d(-1, -1), w(-1, 0), d(-1, 1), w(0, 1)], { correctSlot: 1, prompt: choicePrompt }),
      puzzle('letter-t', 'choice', [w(-1, -1), d(0, -1), w(1, -1), d(0, 0), d(0, 1)], { correctSlot: 3, prompt: choicePrompt }),
      puzzle('cross', 'choice', [w(0, -1), d(-1, 0), d(0, 0), w(1, 0), w(0, 1)], { correctSlot: 0, prompt: choicePrompt }),
      puzzle('zigzag', 'choice', [d(-1, -1), w(0, -1), d(0, 0), w(1, 0)], { correctSlot: 2, prompt: choicePrompt }),
    ],
  },
  {
    id: 4,
    title: 'Bí mật khối bị che',
    description: 'Nhìn xuyên qua những công trình nhiều tầng.',
    tutorial: 'Khi hai khối chồng lên nhau, mặt trên của khối nằm cao nhất sẽ che khối bên dưới. Mình cùng kiểm chứng nhé!',
    rounds: [
      puzzle('hidden-corner', 'xray', [w(-1, -1), d(-1, -1, 1), d(0, -1), w(0, 0), w(1, 0)],
        { correctSlot: 2, advanced: true, prompt: 'Khối nào vẫn nhìn thấy khi Bobo bay lên?' }),
      puzzle('tall-surprise', 'xray', [
        d(-1, 0), w(-1, 0, 1), d(-1, 0, 2), w(0, 0), w(0, 0, 1), w(1, 0), d(1, -1), d(0, 1),
      ], { correctSlot: 0, advanced: true, prompt: 'Nhìn từ trên, mỗi chồng khối hiện lên màu nào?' }),
    ],
  },
  {
    id: 5,
    title: 'Thám tử hình chiếu',
    description: 'Chọn một trong bốn hình cho công trình nhiều tầng.',
    tutorial: 'Thám tử nhí hãy để ý phía trước của bàn. Dự đoán hình chiếu rồi tự kiểm chứng nhé!',
    rounds: [
      puzzle('terrace', 'choice', [
        w(-1, -1), d(-1, -1, 1), d(0, -1, 0, WHITE), w(1, -1), w(2, -1), d(2, -1, 1),
        d(-1, 0), w(0, 0), d(0, 0, 1), w(2, 0), d(-1, 1), w(0, 1), d(0, 2),
      ], { bounds: wide, correctSlot: 1, advanced: true, prompt: choicePrompt }),
      puzzle('ring', 'choice', [
        d(-1, -1), w(0, -1), w(1, -1), d(1, -1, 1, WHITE), w(-1, 0), d(1, 0), d(-1, 1),
        d(-1, 1, 1), w(-1, 1, 2), w(0, 1), d(1, 1),
      ], { correctSlot: 3, advanced: true, prompt: choicePrompt }),
      puzzle('bridge', 'choice', [
        w(-1, -1), d(-1, -1, 1), d(0, -1), w(0, -1, 1), d(1, -1, 0, WHITE), w(2, -1), d(0, 0),
        w(0, 1), d(1, 1), d(1, 1, 1, WHITE), w(2, 1),
      ], { bounds: wide, correctSlot: 0, advanced: true, prompt: choicePrompt }),
    ],
  },
  {
    id: 6,
    title: 'Kiến trúc sư nhí',
    description: 'Tự xếp công trình rồi khám phá hình chiếu của mình.',
    tutorial: 'Bàn xếp khối là của bé! Chọn màu rồi chạm ô để đặt khối. Chạm lại ô đã có khối để xếp thêm một tầng.',
    rounds: [
      puzzle('my-build', 'sandbox', [], { bounds: BUILD_BOUNDS, prompt: 'Hôm nay bé muốn xây gì?' }),
    ],
  },
];
