const paths = {
  play: '<path d="M8 5.5a.8.8 0 0 1 1.2-.7l10 6.5a.8.8 0 0 1 0 1.4l-10 6.5a.8.8 0 0 1-1.2-.7Z" fill="currentColor" stroke="none"/>',
  volume: '<path d="M10 4 5 8H2v8h3l5 4z"/><path d="M14 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M10 4 5 8H2v8h3l5 4z"/><path d="m15 9 6 6m0-6-6 6"/>',
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1.3"/><rect x="14" y="4" width="6" height="6" rx="1.3"/><rect x="4" y="14" width="6" height="6" rx="1.3"/><rect x="14" y="14" width="6" height="6" rx="1.3"/>',
  right: '<path d="M3.5 12h16m-6.5-6.5 6.5 6.5-6.5 6.5"/>',
  left: '<path d="M20.5 12h-16M11 5.5 4.5 12l6.5 6.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  star: '<path d="M11.1 3.9a1 1 0 0 1 1.8 0l2.1 4.3 4.7.7a1 1 0 0 1 .6 1.7l-3.4 3.3.8 4.7a1 1 0 0 1-1.4 1.1l-4.3-2.2-4.3 2.2a1 1 0 0 1-1.4-1.1l.8-4.7-3.4-3.3a1 1 0 0 1 .6-1.7l4.7-.7z" fill="currentColor"/>',
  sparkle: '<path d="M12 2c.9 7.1 2.9 9.1 10 10-7.1.9-9.1 2.9-10 10-.9-7.1-2.9-9.1-10-10 7.1-.9 9.1-2.9 10-10Z" fill="currentColor" stroke="none"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  bulb: '<path d="M8.5 16.5c-.2-2.7-3-3.3-3-7a6.5 6.5 0 0 1 13 0c0 3.7-2.8 4.3-3 7ZM9.5 20h5m-4 2h3"/>',
  sticker: '<path d="M19.8 13H16a3 3 0 0 0-3 3v3.8m7-8.4v-4A3.4 3.4 0 0 0 16.6 4H7.4A3.4 3.4 0 0 0 4 7.4v9.2A3.4 3.4 0 0 0 7.4 20h4a5.5 5.5 0 0 0 3.9-1.6l3.1-3.1a5.5 5.5 0 0 0 1.6-3.9Z"/><path d="M8 10h.01M14 8h.01m-5 6c1 .4 2.4 0 3-1.1"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  basket: '<path d="M3 9h18l-2.2 10H5.2Zm4 0 4-6m6 6-4-6M9 13v3m6-3v3"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
  replay: '<path d="M3 11a9 9 0 1 1 2.5 6.3M3 5v6h6"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}
