import type { PieceType } from "../game/GameState";
import type { ProgressData } from "../game/ProgressStorage";
import type { Lesson } from "../lessons/Lesson";
import { PIECE_NAMES } from "../lessons/Lesson";

export class LessonMenu {
  constructor(private readonly element: HTMLElement) {}

  renderPieceChoice(progress: ProgressData): void {
    const cards: Array<{ type: PieceType; icon: string; subtitle: string; badge: string }> = [
      { type: "rook", icon: "♜", subtitle: "Đường ngang & dọc", badge: "Xe Đường Thẳng" },
      { type: "bishop", icon: "♝", subtitle: "Đường chéo kỳ diệu", badge: "Tượng Đường Chéo" },
      { type: "knight", icon: "♞", subtitle: "Cú nhảy chữ L", badge: "Mã Nhảy Cao" },
    ];
    this.element.innerHTML = `
      <div class="menu-card" role="dialog" aria-labelledby="welcome-title" aria-modal="true">
        <div class="academy-seal" aria-hidden="true">♛</div>
        <p class="eyebrow">VƯƠNG QUỐC ĐỒ CHƠI</p>
        <h1 id="welcome-title">Học Viện Cờ Vua Nhí</h1>
        <p class="welcome-copy">Chọn một người bạn để bắt đầu cuộc phiêu lưu!</p>
        <div class="piece-grid">
          ${cards.map((card) => {
            const done = progress.completedLessons.filter((id) => id.startsWith(card.type)).length;
            const hasBadge = progress.badges.includes(card.type);
            return `<button class="piece-card piece-card--${card.type}" data-piece="${card.type}" aria-label="Chọn quân ${PIECE_NAMES[card.type]}, ${done} trên 6 bài hoàn thành">
              <span class="piece-card__icon" aria-hidden="true">${card.icon}</span>
              <span class="piece-card__name">Quân ${PIECE_NAMES[card.type]}</span>
              <span class="piece-card__subtitle">${card.subtitle}</span>
              <span class="piece-card__progress">${hasBadge ? `🏅 ${card.badge}` : `${done}/6 bài`}</span>
            </button>`;
          }).join("")}
        </div>
      </div>`;
    this.element.hidden = false;
  }

  renderLessons(piece: PieceType, lessons: Lesson[], progress: ProgressData): void {
    this.element.innerHTML = `
      <div class="menu-card lesson-picker" role="dialog" aria-labelledby="lesson-picker-title" aria-modal="true">
        <button class="round-button back-to-pieces" aria-label="Quay lại chọn quân">←</button>
        <p class="eyebrow">LỘ TRÌNH CỦA QUÂN ${PIECE_NAMES[piece].toUpperCase()}</p>
        <h2 id="lesson-picker-title">Chọn bài học</h2>
        <div class="practice-callout practice-callout--${piece}">
          <span class="practice-callout__star" aria-hidden="true">★</span>
          <span class="practice-callout__copy">
            <small>LUYỆN TẬP KHÔNG GIỚI HẠN</small>
            <strong>Săn sao cùng quân ${PIECE_NAMES[piece]}</strong>
            <span>Có sao ở gần, có sao ở xa: quan sát nước đi và chọn đường phù hợp.</span>
          </span>
          <button class="practice-button" data-practice="${piece}" aria-label="Bắt đầu luyện tập săn sao với quân ${PIECE_NAMES[piece]}">
            Chơi ngay <span aria-hidden="true">→</span>
          </button>
        </div>
        <div class="lesson-list">
          ${lessons.map((lesson, index) => {
            const stars = progress.starsByLesson[lesson.id] ?? 0;
            return `<button class="lesson-item" data-lesson="${index}" aria-label="Bài ${index + 1}: ${lesson.title}, ${stars} sao">
              <span class="lesson-number">${index + 1}</span>
              <span><strong>${lesson.title}</strong><small>${lesson.instruction}</small></span>
              <span class="lesson-stars" aria-hidden="true">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>
            </button>`;
          }).join("")}
        </div>
      </div>`;
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }
}
