export class InputManager {
  constructor(root, dispatch, state, primaryButton) {
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    root.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button || button.disabled || button.closest('[inert]')) return;
      const { action, value } = button.dataset;
      dispatch(action, action === 'start' && value ? Number(value) : value);
    }, options);

    window.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = { ArrowLeft: 'left', ArrowRight: 'right' }[event.key];
      if (direction && state() === 'AWAITING_INPUT') {
        event.preventDefault();
        if (!event.repeat) dispatch('answer', direction);
        return;
      }
      if (event.key === 'Escape' && !event.repeat && !event.defaultPrevented) {
        const current = state();
        if (current === 'PAUSED') dispatch('resume');
        else if (current === 'TUTORIAL' || current === 'LEVEL_SELECT' || current === 'LEVEL_COMPLETE') dispatch('home');
        else dispatch('pause');
        return;
      }
      if (event.key === 'Enter') {
        if (event.repeat) {
          event.preventDefault();
          return;
        }
        if (!event.target.closest('button, a')) {
          const button = primaryButton();
          if (button && !button.disabled) {
            event.preventDefault();
            button.click();
          }
        }
      }
    }, options);
  }

  dispose() {
    this.abort.abort();
  }
}
