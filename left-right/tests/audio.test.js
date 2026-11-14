import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../src/audio/AudioManager.js';

afterEach(() => vi.unstubAllGlobals());

function fakeSpeech(voices) {
  const speech = { getVoices: () => voices, speak: vi.fn(), cancel: vi.fn() };
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    constructor(text) { this.text = text; }
  });
  return speech;
}

describe('Hướng dẫn bằng giọng nói', () => {
  it('chơi tiếp được khi trình duyệt không hỗ trợ Web Speech hoặc Web Audio', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);

    const audio = new AudioManager();
    expect(audio.hasVietnameseVoice).toBe(false);
    expect(audio.speak('Bên trái')).toBe(false);
    expect(await audio.unlock()).toBe(false);
    expect(() => audio.play('correct')).not.toThrow();
    audio.dispose();
  });

  it('để giao diện dùng chữ và biểu tượng nếu chỉ có giọng ngôn ngữ khác', () => {
    const speech = fakeSpeech([{ lang: 'en-US' }]);
    const audio = new AudioManager();
    expect(audio.hasVietnameseVoice).toBe(false);
    expect(audio.speak('Bên trái')).toBe(false);
    expect(speech.speak).not.toHaveBeenCalled();
    audio.dispose();
  });

  it('ưu tiên giọng Việt cục bộ, ngắt câu cũ khi phát lại và tắt tiếng hoàn toàn', () => {
    const local = { lang: 'vi-VN', localService: true };
    const speech = fakeSpeech([{ lang: 'vi', localService: false }, local]);
    const audio = new AudioManager();

    expect(audio.hasVietnameseVoice).toBe(true);
    expect(audio.speak('Bên trái')).toBe(true);
    expect(audio.speak('Bên phải')).toBe(true);
    expect(speech.cancel).toHaveBeenCalledTimes(1);
    expect(speech.speak).toHaveBeenLastCalledWith(expect.objectContaining({
      text: 'Bên phải', voice: local, lang: 'vi-VN',
    }));
    expect(audio.setEnabled(false)).toBe(false);
    expect(speech.cancel).toHaveBeenCalledTimes(2);
    expect(audio.speak('Bên trái')).toBe(false);
    expect(speech.speak).toHaveBeenCalledTimes(2);
    audio.dispose();
  });
});
