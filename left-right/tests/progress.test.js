import { describe, expect, it } from 'vitest';
import { Progress, progressKey } from '../src/gameplay/progress.js';

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

describe('Lưu tiến độ', () => {
  it('mở khóa lần lượt, cộng sao theo mức tốt nhất và nhận mỗi sticker một lần', () => {
    const storage = memoryStorage();
    const progress = new Progress(storage);
    expect(progress.unlockedLevel).toBe(1);
    expect(progress.isUnlocked(2)).toBe(false);
    expect(progress.recordAnswer(2, 5)).toBe(0);
    expect(progress.recordAnswer(1, 3)).toBe(3);
    expect(progress.completeLevel(1)).toBe(false);
    expect(progress.recordAnswer(1, 2)).toBe(3);
    expect(progress.recordAnswer(1, 5)).toBe(5);
    expect(progress.completeLevel(1)).toBe(true);
    expect(progress.completeLevel(1)).toBe(false);
    expect(progress.unlockedLevel).toBe(2);
    expect(progress.stickers.map(({ id }) => id)).toEqual([1]);
    progress.completeTutorial();
    progress.setSoundEnabled(false);

    const reloaded = new Progress(storage);
    expect(reloaded.stars).toBe(5);
    expect(reloaded.completedTutorial).toBe(true);
    expect(reloaded.soundEnabled).toBe(false);
    expect(reloaded.isUnlocked(2)).toBe(true);
    expect(reloaded.isUnlocked(3)).toBe(false);
    reloaded.recordAnswer(2, 5);
    reloaded.completeLevel(2);
    reloaded.recordAnswer(3, 5);
    reloaded.completeLevel(3);
    expect(reloaded.stars).toBe(15);
    expect(reloaded.stickers.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(reloaded.unlockedLevel).toBe(3);
  });

  it('khôi phục sticker và cấp độ nếu trang đóng đúng lúc hiện hoạt ảnh cuối', () => {
    const storage = memoryStorage();
    new Progress(storage).recordAnswer(1, 5);
    const reloaded = new Progress(storage);
    expect(reloaded.stickers.map(({ id }) => id)).toEqual([1]);
    expect(reloaded.unlockedLevel).toBe(2);
  });

  it('chơi được khi dữ liệu lưu bị hỏng hoặc bộ nhớ bị chặn', () => {
    const storage = memoryStorage();
    storage.setItem(progressKey, 'broken');
    expect(new Progress(storage).stars).toBe(0);

    const denied = () => { throw new Error('Storage denied'); };
    const progress = new Progress({ getItem: denied, setItem: denied });
    progress.recordAnswer(1, 5);
    progress.completeLevel(1);
    expect(progress.stars).toBe(5);
    expect(progress.unlockedLevel).toBe(2);
  });
});
