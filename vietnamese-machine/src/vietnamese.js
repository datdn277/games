const TONE_INDEX = {
  ngang: 0,
  sắc: 1,
  huyền: 2,
  hỏi: 3,
  ngã: 4,
  nặng: 5
};

const TONE_FORMS = {
  a: ["a", "á", "à", "ả", "ã", "ạ"],
  ă: ["ă", "ắ", "ằ", "ẳ", "ẵ", "ặ"],
  â: ["â", "ấ", "ầ", "ẩ", "ẫ", "ậ"],
  e: ["e", "é", "è", "ẻ", "ẽ", "ẹ"],
  ê: ["ê", "ế", "ề", "ể", "ễ", "ệ"],
  i: ["i", "í", "ì", "ỉ", "ĩ", "ị"],
  o: ["o", "ó", "ò", "ỏ", "õ", "ọ"],
  ô: ["ô", "ố", "ồ", "ổ", "ỗ", "ộ"],
  ơ: ["ơ", "ớ", "ờ", "ở", "ỡ", "ợ"],
  u: ["u", "ú", "ù", "ủ", "ũ", "ụ"],
  ư: ["ư", "ứ", "ừ", "ử", "ữ", "ự"],
  y: ["y", "ý", "ỳ", "ỷ", "ỹ", "ỵ"]
};

const VOWELS = new Set(Object.keys(TONE_FORMS));
const SHAPED_VOWELS = new Set(["ă", "â", "ê", "ô", "ơ"]);

/**
 * Dựng một tiếng từ âm đầu, vần không mang thanh và tên thanh.
 * Mô hình MVP dùng quy ước dạy học `ap` -> `ăp` để tạo “cặp”.
 */
export function buildVietnameseSyllable(initial, rhyme, tone = "ngang") {
  if (!(tone in TONE_INDEX)) {
    throw new Error(`Thanh không hợp lệ: ${tone}`);
  }

  const normalizedInitial = initial === "∅" ? "" : initial;
  let normalizedRhyme = stripTone(rhyme.toLowerCase());

  if (normalizedRhyme === "ap") {
    normalizedRhyme = "ăp";
  }

  if (tone === "ngang") {
    return `${normalizedInitial}${normalizedRhyme}`;
  }

  const characters = [...normalizedRhyme];
  const vowelIndexes = characters
    .map((character, index) => (VOWELS.has(character) ? index : -1))
    .filter((index) => index >= 0);

  if (!vowelIndexes.length) {
    return `${normalizedInitial}${normalizedRhyme}`;
  }

  const tonePosition = findTonePosition(characters, vowelIndexes);
  const baseVowel = characters[tonePosition];
  characters[tonePosition] = TONE_FORMS[baseVowel][TONE_INDEX[tone]];
  return `${normalizedInitial}${characters.join("")}`.normalize("NFC");
}

export function stripTone(text) {
  let result = text;
  for (const forms of Object.values(TONE_FORMS)) {
    for (const form of forms.slice(1)) {
      result = result.replaceAll(form, forms[0]);
    }
  }
  return result.normalize("NFC");
}

function findTonePosition(characters, vowelIndexes) {
  const shapedIndex = vowelIndexes.find((index) => SHAPED_VOWELS.has(characters[index]));
  if (shapedIndex !== undefined) return shapedIndex;

  if (vowelIndexes.length >= 3) return vowelIndexes[1];
  if (vowelIndexes.length === 1) return vowelIndexes[0];

  const lastVowelIndex = vowelIndexes.at(-1);
  const hasFinalConsonant = lastVowelIndex < characters.length - 1;
  return hasFinalConsonant ? lastVowelIndex : vowelIndexes[0];
}
