const paths = {
  play: '<path d="M9 5.9v12.2l9-6.1z" fill="currentColor" stroke-linejoin="round"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5m-18 4 9 5 9-5"/>',
  'arrow-left': '<path d="M20 12H4m7-7-7 7 7 7"/>',
  'arrow-right': '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  volume: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13 0a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13 0 5 6m0-6-5 6"/>',
  bulb: '<path d="M8 15a6 6 0 1 1 8 0l-1 2H9l-1-2Zm2 5h4m-3 2h2"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 6m-2-6V5m0 6h6"/>',
  star: '<path d="m12 2.7 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" fill="currentColor"/>',
  pause: '<path d="M9 5v14m6-14v14" stroke-width="3"/>',
  leaf: '<path d="M19.5 4c1.3 7-2.4 14-8.8 14a5.7 5.7 0 0 1-5.8-5.7c0-6 7.2-7.4 14.6-8.3ZM4 21c2-4.9 6.5-8.1 11-11"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

export function icon(name) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
