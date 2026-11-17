const paths = {
  scale: '<path d="M12 3v17m-5 1h10M4 7h16M5 7 2 14h6L5 7Zm14 0-3 7h6l-3-7ZM2 14c.5 2.5 5.5 2.5 6 0m8 0c.5 2.5 5.5 2.5 6 0"/>',
  sparkle: '<path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z" fill="currentColor"/>',
  star: '<path d="m12 2.8 2.8 5.7 6.3.9-4.5 4.4 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.9 9.4l6.3-.9L12 2.8Z" fill="currentColor"/>',
  play: '<path d="M9 6v12l9-6-9-6Z" fill="currentColor"/>',
  grid: '<rect x="3.8" y="3.8" width="6" height="6" rx="1"/><rect x="14.2" y="3.8" width="6" height="6" rx="1"/><rect x="3.8" y="14.2" width="6" height="6" rx="1"/><rect x="14.2" y="14.2" width="6" height="6" rx="1"/>',
  back: '<path d="M20 12H4m7-7-7 7 7 7"/>',
  next: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  volume: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13-.5a4.5 4.5 0 0 1 0 7m2.4-9.2a7.5 7.5 0 0 1 0 11.4"/>',
  mute: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13 0 5 6m0-6-5 6"/>',
  pause: '<path d="M9 5v14m6-14v14" stroke-width="3"/>',
  bulb: '<path d="M8 15a6 6 0 1 1 8 0l-1 2H9l-1-2Zm2 5h4m-3 2h2"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 6m-2-6V5m0 6h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  minus: '<path d="M5 12h14"/>',
  equal: '<path d="M5 9h14M5 15h14"/>',
  lens: '<circle cx="10.5" cy="10.5" r="5.8"/><path d="m15 15 5.5 5.5"/>',
  exchange: '<path d="M4 8h16l-4-4m4 4-4 4M20 16H4l4-4m-4 4 4 4"/>',
};

export function icon(name) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
