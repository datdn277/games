import { describe, expect, it } from "vitest";
import { createDefaultProgress, ProgressStorage } from "../game/ProgressStorage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("ProgressStorage", () => {
  it("falls back safely when stored data is corrupt", () => {
    const memory = new MemoryStorage();
    memory.setItem("rabbit-maze-progress-v1", "{broken");
    expect(new ProgressStorage(memory).load()).toEqual(createDefaultProgress());
  });

  it("keeps the best stars and unlocks progression", () => {
    const storage = new ProgressStorage(new MemoryStorage());
    let progress = createDefaultProgress();
    progress = storage.recordCompletion(progress, "level-04", 2, 1);
    expect(progress.unlockedDifficulties).toContain("medium");
    progress = storage.recordCompletion(progress, "level-08", 1, 1);
    expect(progress.unlockedDifficulties).toContain("hard");
    progress = storage.recordCompletion(progress, "level-10", 3, 1);
    expect(progress.commandModeUnlocked).toBe(true);
    progress = storage.recordCompletion(progress, "level-10", 1, 1);
    expect(progress.starsByLevel["level-10"]).toBe(3);
  });
});
