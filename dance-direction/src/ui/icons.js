const paths = {
  note: '<path d="M9 17V6l12-2v11M9 10l12-2"/><ellipse cx="6" cy="17.5" rx="3" ry="2.5" fill="currentColor" stroke="none"/><ellipse cx="18" cy="15.5" rx="3" ry="2.5" fill="currentColor" stroke="none"/>',
  left: '<path d="M19 12H5m7-7-7 7 7 7"/>',
  right: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  play: '<path d="M8 5.8c0-.9 1-1.4 1.7-.9l9 6.2a1.1 1.1 0 0 1 0 1.8l-9 6.2c-.7.5-1.7 0-1.7-.9z" fill="currentColor" stroke="none"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.7"/><rect x="14" y="14" width="7" height="7" rx="1.7"/>',
  library: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M3 9h18m-10 0v11"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 1.7-2.9 2.4-2.9 4m0 3h.01"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4zm4 4a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>',
  muted: '<path d="M11 5 6 9H3v6h3l5 4zm5 4 5 6m0-6-5 6"/>',
  star: '<path d="M12 2.8 14.8 8.5 21 9.4 16.5 13.8 17.6 20 12 17.1 6.4 20 7.5 13.8 3 9.4 9.2 8.5z" fill="currentColor" stroke-linejoin="round"/>',
  sparkle: '<path d="M12 1.8c.7 6.5 3.7 9.5 10.2 10.2-6.5.7-9.5 3.7-10.2 10.2C11.3 15.7 8.3 12.7 1.8 12 8.3 11.3 11.3 8.3 12 1.8z" fill="currentColor" stroke="none"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"/>',
  pause: '<path d="M9 5v14m6-14v14" stroke-width="3.2"/>',
  replay: '<path d="M4 11a8 8 0 1 1 1.7 6m-1.7-12v6h6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  eye: '<path d="M2 12c2.4-4.2 5.8-6.4 10-6.4s7.6 2.2 10 6.4c-2.4 4.2-5.8 6.4-10 6.4S4.4 16.2 2 12Z"/><circle cx="12" cy="12" r="2.4"/>',
  hand: '<path d="M7 12.5V6a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-5a1.5 1.5 0 0 1 3 0v6-2a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-.5a5 5 0 0 1-3.5-1.5L4 15a1.8 1.8 0 0 1 2.6-2.4l1.6 1.8"/>',
  steps: '<path d="M9 7c.8-2.5 3.1-4 4.3-3.3s1.1 3.1-.3 5.4c-.9 1.6-2.4 2.6-3.7 1.9S8.3 8.8 9 7Zm-2 6.1 3 1.5-.6 1.3a1.7 1.7 0 0 1-3-1.5ZM15 12c.9-2.3 2.8-3.4 4.1-2.8s1.4 2.8.4 5.2c-.9 1.5-2.2 2.6-3.6 2-1.2-.5-1.7-2.4-.9-4.4Zm-.7 6 3.1 1.3-.5 1.3a1.7 1.7 0 0 1-3.1-1.3Z"/>',
  rainbow: '<path d="M2.5 17a9.5 9.5 0 0 1 19 0m-15.8 0a6.3 6.3 0 0 1 12.6 0M9 17a3 3 0 0 1 6 0"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] ?? ''}</svg>`;
}
