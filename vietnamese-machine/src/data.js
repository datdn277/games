export const TONES = ["ngang", "sắc", "huyền", "hỏi", "ngã", "nặng"];

export const DIFFICULTIES = {
  easy: { label: "Dễ", choices: 3 },
  medium: { label: "Trung bình", choices: 4 },
  hard: { label: "Khó", choices: 6 },
  mixed: { label: "Ngẫu nhiên", choices: 4 }
};

// Các vần ở đây dùng cách tách đơn giản dành cho trẻ (ví dụ cặp = c + ap + nặng).
// `word` vẫn là nguồn sự thật để kiểm tra và để xử lý các trường hợp chính tả đặc biệt.
export const WORDS = [
  word("ba", "👨", "b", "a", "ngang", "easy", ["m", "c", "t"], ["o", "e", "u"], ["sắc", "huyền"]),
  word("bé", "🧒", "b", "e", "sắc", "easy", ["m", "c", "t"], ["a", "o", "u"], ["ngang", "huyền"]),
  word("cá", "🐟", "c", "a", "sắc", "easy", ["b", "k", "m"], ["o", "e", "u"], ["ngang", "huyền"]),
  word("cò", "🕊️", "c", "o", "huyền", "easy", ["b", "k", "m"], ["a", "e", "u"], ["ngang", "sắc"]),
  word("to", "🐘", "t", "o", "ngang", "easy", ["b", "c", "m"], ["a", "e", "u"], ["sắc", "huyền"]),
  word("mũ", "🧢", "m", "u", "ngã", "easy", ["b", "n", "t"], ["a", "o", "e"], ["sắc", "nặng"]),

  word("bà", "👵", "b", "a", "huyền", "medium", ["d", "m", "đ"], ["an", "am", "at"], ["ngang", "sắc", "nặng"]),
  word("bố", "👨‍👧", "b", "ô", "sắc", "medium", ["p", "m", "v"], ["o", "ơ", "u"], ["ngang", "huyền", "nặng"]),
  word("mẹ", "👩", "m", "e", "nặng", "medium", ["n", "b", "t"], ["a", "ê", "o"], ["ngang", "sắc", "huyền"]),
  word("chó", "🐕", "ch", "o", "sắc", "medium", ["tr", "c", "th"], ["ô", "a", "e"], ["ngang", "huyền", "nặng"]),
  word("mèo", "🐈", "m", "eo", "huyền", "medium", ["n", "b", "v"], ["ao", "en", "êu"], ["ngang", "sắc", "nặng"]),
  word("bàn", "🪑", "b", "an", "huyền", "medium", ["d", "m", "đ"], ["am", "at", "ap"], ["ngang", "sắc", "nặng"]),
  word("bút", "🖊️", "b", "ut", "sắc", "medium", ["p", "m", "v"], ["un", "up", "at"], ["ngang", "huyền", "nặng"]),
  word("đèn", "💡", "đ", "en", "huyền", "medium", ["d", "b", "m"], ["em", "an", "ên"], ["ngang", "sắc", "nặng"]),
  word("áo", "👕", "", "ao", "sắc", "medium", ["b", "m", "t"], ["eo", "an", "au"], ["ngang", "huyền", "nặng"]),
  word("cam", "🍊", "c", "am", "ngang", "medium", ["k", "b", "m"], ["an", "at", "ap"], ["sắc", "huyền", "nặng"]),
  word("hoa", "🌼", "h", "oa", "ngang", "medium", ["k", "m", "th"], ["ao", "oe", "an"], ["sắc", "huyền", "nặng"]),

  word("cặp", "🎒", "c", "ap", "nặng", "hard", ["k", "b", "g", "m", "t"], ["at", "an", "am", "ac", "op"], ["ngang", "sắc", "huyền", "hỏi", "ngã"]),
  word("kẹo", "🍬", "k", "eo", "nặng", "hard", ["c", "g", "m", "t", "b"], ["ao", "êu", "en", "et", "em"], ["ngang", "sắc", "huyền", "hỏi", "ngã"]),
  word("sữa", "🥛", "s", "ưa", "ngã", "hard", ["x", "ch", "m", "t", "b"], ["ươ", "ua", "ia", "ui", "uô"], ["ngang", "sắc", "huyền", "hỏi", "nặng"]),
  word("táo", "🍎", "t", "ao", "sắc", "hard", ["th", "b", "c", "m", "đ"], ["eo", "au", "oa", "an", "am"], ["ngang", "huyền", "hỏi", "ngã", "nặng"]),
  word("nón", "👒", "n", "on", "sắc", "hard", ["l", "m", "b", "t", "nh"], ["ôn", "ong", "om", "an", "ot"], ["ngang", "huyền", "hỏi", "ngã", "nặng"]),
  word("thỏ", "🐇", "th", "o", "hỏi", "hard", ["t", "tr", "ch", "h", "kh"], ["ô", "ơ", "a", "e", "u"], ["ngang", "sắc", "huyền", "ngã", "nặng"]),
  word("gấu", "🐻", "g", "âu", "sắc", "hard", ["gh", "c", "k", "m", "b"], ["au", "ao", "êu", "ui", "an"], ["ngang", "huyền", "hỏi", "ngã", "nặng"]),
  word("vịt", "🦆", "v", "it", "nặng", "hard", ["d", "b", "m", "t", "ph"], ["ip", "in", "at", "ut", "et"], ["ngang", "sắc", "huyền", "hỏi", "ngã"])
];

function word(wordText, image, initial, rhyme, tone, level, initials, rhymes, tones) {
  return {
    word: wordText,
    image,
    initial,
    rhyme,
    tone,
    level,
    spelling: makeSpelling(wordText, initial, rhyme, tone),
    initialOptions: unique([initial, ...initials]),
    rhymeOptions: unique([rhyme, ...rhymes]),
    toneOptions: unique([tone, ...tones])
  };
}

function makeSpelling(wordText, initial, rhyme, tone) {
  const initialNames = {
    "": "không có âm đầu",
    b: "bờ", c: "cờ", ch: "chờ", d: "dờ", đ: "đờ", g: "gờ", gh: "gờ",
    h: "hờ", k: "ca", kh: "khờ", l: "lờ", m: "mờ", n: "nờ", nh: "nhờ",
    p: "pờ", ph: "phờ", s: "sờ", t: "tờ", th: "thờ", tr: "trờ", v: "vờ", x: "xờ"
  };
  const base = `${initial}${rhyme}` || rhyme;
  if (tone === "ngang") {
    return `${initialNames[initial] ?? initial} - ${rhyme} - ${wordText}`;
  }
  return `${initialNames[initial] ?? initial} - ${rhyme} - ${base} - ${tone} - ${wordText}`;
}

function unique(values) {
  return [...new Set(values)];
}

export function getWordsForDifficulty(difficulty) {
  return difficulty === "mixed" ? WORDS : WORDS.filter((item) => item.level === difficulty);
}

export function getRoundOptions(item, type, difficulty, random = Math.random) {
  const key = `${type}Options`;
  const target = item[type];
  const wanted = DIFFICULTIES[difficulty]?.choices ?? 4;
  const distractors = unique(item[key]).filter((value) => (
    value !== target && !(type === "tone" && value === "ngang")
  ));
  const choiceCount = Math.max(2, Math.min(wanted, distractors.length + 1));
  return shuffle([target, ...shuffle(distractors, random).slice(0, choiceCount - 1)], random);
}

export function shuffle(values, random = Math.random) {
  return [...values].sort(() => random() - 0.5);
}
