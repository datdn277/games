export function bindDrag(root, callbacks) {
  let gesture = null;
  let suppressPointerClick = false;
  let clickTimer;

  function down(event) {
    if (gesture || event.button !== 0 || !event.isPrimary) return;
    const source = callbacks.find(event);
    if (!source) return;
    gesture = { source, id: event.pointerId, x: event.clientX, y: event.clientY, token: null };
  }

  function move(event) {
    if (event.pointerId !== gesture?.id) return;
    if (gesture.token === null) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 8) return;
      const token = callbacks.start(gesture.source);
      if (token === null) {
        gesture = null;
        return;
      }
      gesture.token = token;
      if (root.isConnected) root.setPointerCapture(gesture.id);
    }
    event.preventDefault();
    callbacks.move(gesture, event);
  }

  function stop(event, cancelled) {
    if (!gesture || (event && event.pointerId !== gesture.id)) return;
    const finishing = gesture;
    gesture = null;
    if (finishing.token === null) return;
    if (root.hasPointerCapture(finishing.id)) root.releasePointerCapture(finishing.id);
    suppressPointerClick = true;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { suppressPointerClick = false; }, 350);
    if (cancelled) callbacks.cancel(finishing);
    else callbacks.end(finishing, event);
  }

  const up = (event) => stop(event, false);
  const cancel = (event) => stop(event, true);

  root.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);

  return {
    consumeClick(event) {
      if (!suppressPointerClick || event.detail === 0) return false;
      suppressPointerClick = false;
      clearTimeout(clickTimer);
      return true;
    },
    cancel() { stop(null, true); },
    dispose() {
      stop(null, true);
      clearTimeout(clickTimer);
      root.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    },
  };
}
