export class TouchController {
  private startX = 0;
  private startY = 0;
  private pointerId: number | null = null;

  begin(event: PointerEvent): void {
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
  }

  isTap(event: PointerEvent): boolean {
    if (this.pointerId !== event.pointerId) return false;
    this.pointerId = null;
    return Math.hypot(event.clientX - this.startX, event.clientY - this.startY) < 12;
  }
}
