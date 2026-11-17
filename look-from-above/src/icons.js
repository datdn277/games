const paths = {
  cube: '<path d="m12 2.8 8 4.5v9.4l-8 4.5-8-4.5V7.3l8-4.5Zm8 4.5-8 4.5-8-4.5m8 4.5v9.4"/>',
  sparkle: '<path d="M12 2.5c0 5.6-3.9 9.5-9.5 9.5 5.6 0 9.5 3.9 9.5 9.5 0-5.6 3.9-9.5 9.5-9.5-5.6 0-9.5-3.9-9.5-9.5Z" fill="currentColor"/>',
  play: '<path d="M9 5.9v12.2l9-6.1L9 5.9Z" fill="currentColor"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  back: '<path d="M20 12H4m7-7-7 7 7 7"/>',
  next: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  volume: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13 0a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13 0 5 6m0-6-5 6"/>',
  star: '<path d="m12 2.7 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" fill="currentColor"/>',
  pause: '<path d="M9 5v14m6-14v14" stroke-width="3"/>',
  bulb: '<path d="M8 15a6 6 0 1 1 8 0l-1 2H9l-1-2Zm2 5h4m-3 2h2"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 6m-2-6V5m0 6h6"/>',
  rotate: '<path d="M5 8a8 8 0 1 1-1 7m1-7V3m0 5h5"/>',
  plus: '<path d="M5 12h14m-7-7v14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16m-8-8v16"/>',
  up: '<path d="M12 21V3m-7 7 7-7 7 7"/>',
  eyes: '<path d="M2 12s3.8-6.4 10-6.4 10 6.4 10 6.4-3.8 6.4-10 6.4S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  erase: '<path d="m7 18-4.4-4.4a1.5 1.5 0 0 1 0-2.1l8-8a1.5 1.5 0 0 1 2.1 0l5.8 5.8a1.5 1.5 0 0 1 0 2.1L12 18H7Zm0 0h14m-4.3-4.7-6-6"/>',
  move: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-9 3-3 3 3 3m3 3 3 3 3-3m3-9 3 3-3 3"/>',
  save: '<path d="M4 4h13l3 3v13H4V4Zm4 0v6h7V4m-7 16v-6h8v6"/>',
};

export function icon(name) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${paths[name]}</svg>`;
}
