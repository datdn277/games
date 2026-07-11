import { difficultyConfigs, patternConfigs } from "../data/patternConfigs.js";
import { itemSets } from "../data/itemSets.js";
import { PatternEngine } from "./PatternEngine.js";

const randomInt = (min, max, random) => Math.floor(random() * (max - min + 1)) + min;
const shuffle = (items, random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

export class LevelGenerator {
  constructor({ engine = new PatternEngine(), random = Math.random } = {}) {
    this.engine = engine;
    this.random = random;
    this.previousSignature = null;
  }

  generate(difficulty = "easy") {
    const config = difficultyConfigs[difficulty];
    if (!config) throw new Error(`Mức độ không hợp lệ: ${difficulty}`);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const level = this.createCandidate(difficulty, config);
      const signature = `${level.patternType}:${level.itemCategory}:${level.patternUnit.join("-")}:${level.fullSequence.length}:${level.missingIndex}`;
      if (signature !== this.previousSignature) {
        this.previousSignature = signature;
        return level;
      }
    }
    throw new Error("Không thể sinh màn khác màn trước.");
  }

  createCandidate(difficulty, config) {
    const patternType = this.pick(config.allowedPatterns);
    const tokens = [...new Set(patternConfigs[patternType])];
    const eligibleCategories = Object.entries(itemSets).filter(([, set]) => set.items.length >= Math.max(tokens.length, config.answerOptionCount));
    const [itemCategory, category] = this.pick(eligibleCategories);
    const chosen = shuffle(category.items, this.random).slice(0, tokens.length);
    const itemsByToken = Object.fromEntries(tokens.map((token, index) => [token, chosen[index]]));

    const unitLength = patternConfigs[patternType].length;
    const minLength = Math.max(config.minTrainCars, unitLength * 2);
    const maxLength = Math.max(minLength, config.maxTrainCars);
    const length = randomInt(minLength, maxLength, this.random);
    const fullSequence = this.engine.buildPatternSequence(patternType, itemsByToken, length);
    const missingIndex = length - 1;
    const correctItem = fullSequence[missingIndex];
    const distractors = shuffle(category.items.filter((item) => item.id !== correctItem.id), this.random)
      .slice(0, config.answerOptionCount - 1);
    const answerOptions = shuffle([correctItem, ...distractors], this.random);

    return {
      id: `level-${Date.now().toString(36)}-${Math.floor(this.random() * 1e8).toString(36)}`,
      difficulty,
      patternType,
      patternTokens: [...patternConfigs[patternType]],
      itemsByToken,
      patternUnit: patternConfigs[patternType].map((token) => itemsByToken[token].id),
      fullSequence,
      visibleSequence: this.engine.createMissingSequence(fullSequence, missingIndex),
      missingIndex,
      correctAnswer: correctItem.id,
      correctItem,
      answerOptions,
      itemCategory,
      groups: this.engine.getPatternGroups(patternType, length),
    };
  }

  pick(items) {
    return items[Math.floor(this.random() * items.length)];
  }
}

export default LevelGenerator;
