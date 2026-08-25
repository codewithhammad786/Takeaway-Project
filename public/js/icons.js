// A custom line-icon set replacing generic emoji throughout the site — matches the same stroke
// style already used for the footer's contact icons and the logo mark, so cards/quick-picks/tiles
// read as one designed system instead of borrowed Unicode glyphs that look different on every OS.
// Keyed by the emoji each menu item/category already used (item.icon, box.emoji, tile.emoji), so
// no data in seedData.js or menu.js needs to change — this only swaps how that key is *rendered*.

const FOOD_ICON_PATHS = {
  '🍕': '<path d="M4 19 12 4l8 15Z"/><path d="M4.5 17.5C7 15 17 15 19.5 17.5" stroke-width="2.4"/><circle cx="10.5" cy="13.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="14.5" cy="14.8" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="17.5" r="1.3" fill="currentColor" stroke="none"/>',
  '🍔': '<path d="M4 9c0-3.3 3.6-6 8-6s8 2.7 8 6"/><line x1="3" y1="11.5" x2="21" y2="11.5"/><line x1="3" y1="14.5" x2="21" y2="14.5"/><path d="M3 17.5h18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  '🧀': '<path d="M3 12 21 4v16H3Z"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="15.5" cy="16.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="9.5" cy="17" r="1.1" fill="currentColor" stroke="none"/>',
  '🎉': '<path d="M12 2 21 11 13.2 18.8a2 2 0 0 1-2.8 0L3 11.4V3a1 1 0 0 1 1-1Z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/>',
  '📦': '<path d="M3 8 12 3l9 5-9 5-9-5Z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/>',
  '🍗': '<circle cx="14" cy="9" r="6"/><path d="M9.5 13 5 19"/><circle cx="4" cy="20" r="1.8" fill="currentColor" stroke="none"/>',
  '🍖': '<path d="M6.5 6.5a3 3 0 0 1 4.2 0l6.8 6.8a2.6 2.6 0 0 1-3.7 3.7L7 10.2a3 3 0 0 1-.5-3.7Z"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/>',
  '🍢': '<line x1="4" y1="20" x2="20" y2="4"/><circle cx="8.5" cy="15.5" r="2.1"/><circle cx="13" cy="11" r="2.1"/><circle cx="17" cy="7" r="1.5"/>',
  '🥙': '<path d="M3 13a9 5 0 0 1 18 0Z"/><path d="M3 13h18"/>',
  '🍟': '<path d="M8 11V6M12 11V5M16 11V6.5" stroke-width="2.4"/><path d="M5 11h14l-1.6 8.8A2 2 0 0 1 15.4 21H8.6a2 2 0 0 1-2-1.8Z"/>',
  '🍰': '<path d="M5 19 8 9h8l3 10Z"/><path d="M7 13h10"/><circle cx="12" cy="6.5" r="1.4" fill="currentColor" stroke="none"/>',
  '🥤': '<path d="M6 8h12l-1.3 11.5a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8Z"/><path d="M5 8h14l1-3H4Z"/><line x1="15" y1="4.5" x2="17.5" y2="1.5"/>',
  '🎁': '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 9h18"/><path d="M12 9v12"/><path d="M12 9c-2 0-4.5-1-4.5-3.2S9.8 3 12 6c2.2-3 4.5-1.6 4.5.8S14 9 12 9Z"/>',
  '⭐': '<path d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.7 7L12 17l-6.3 3.9 1.7-7L2 9.2l7.1-.6Z"/>',
  '🔥': '<path d="M12 2c4 5 7 9 7 13a7 7 0 0 1-14 0c0-4 3-8 7-13Z"/>',
  '🍱': '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 12h18"/><path d="M3 7l3-3h12l3 3"/>',
  '🌯': '<path d="M5 17.5c-2-2-2-5.3 0-7.3l6.7-6.7c2-2 5.3-2 7.3 0s2 5.3 0 7.3l-6.7 6.7c-2 2-5.3 2-7.3 0Z"/><line x1="7.5" y1="7.5" x2="16.5" y2="16.5"/>',
  '🍚': '<path d="M4 12h16a8 4.5 0 0 1-16 0Z"/><path d="M9 12c0-3.5.8-5 .8-6.5M12.3 12c0-4.2.8-6 .8-7.5M15.5 12c0-3.5.8-5 .8-6.5"/>',
  '🍞': '<path d="M4 14a8 6.5 0 0 1 16 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M8 10.5 9 14M12 9.5 13 14M16 10.5 17 14"/>',
  '🍪': '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.3" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/>',
  '🍫': '<rect x="3" y="5" width="18" height="14" rx="1"/><line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/><line x1="3" y1="12" x2="21" y2="12"/>',
  '🍲': '<path d="M4 11h16v4a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6Z"/><path d="M2 11h20"/><circle cx="4.5" cy="9" r="1.4"/><circle cx="19.5" cy="9" r="1.4"/>',
  '🥗': '<path d="M3 12h18a8 5.5 0 0 1-16 0Z"/><path d="M9 12c-1-2.8.8-4.7 2.8-3.8.8-2.7 3.7-1.8 2.8.8"/>',
  '🥟': '<path d="M4 13a8 8 0 0 0 16 0c0 4.4-3.2 8-8 8s-8-3.6-8-8Z"/><path d="M6.2 13c0-3 2-6 5.8-7"/>',
  '🥬': '<path d="M12 3c5 0 9 4 9 9-5 0-9-4-9-9Z"/><path d="M12 21c-5 0-9-4-9-9 5 0 9 4 9 9Z"/><path d="M12 3v18"/>',
  '🧅': '<path d="M12 3c3 3 5 6.3 5 10a5 5 0 0 1-10 0c0-3.7 2-7 5-10Z"/><path d="M9.3 8c1.4 1.6 1.4 6 1.4 8M14.7 8c-1.4 1.6-1.4 6-1.4 8"/><path d="M10 3l2 3 2-3"/>',
  '🌶️': '<path d="M4 15.3c0-3 3-5 3-5s7-2.2 10 .8 1 10-2.3 10-5.7-4-8.7-4-2-.8-2-1.8Z"/><path d="M9 6.3c1-2 3-3.2 5-2.3"/>',
  '🫓': '<ellipse cx="12" cy="12" rx="9" ry="6"/><path d="M7 10q5-2 10 0M7 14q5 2 10 0"/>',
  '🍽️': '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
};

// Each icon gets its own brand accent instead of one flat colour everywhere — reuses the same
// palette already assigned to each category's quick-pick box/tile (MENU_BOXES/ALL_CATEGORY_TILES
// in menu.js) so a pizza icon and the "Pizza & Meal Deals" badge read as the same colour family.
const FOOD_ICON_ACCENTS = {
  '🍕': '#ff5f5f',
  '🍔': '#e08a3c',
  '🧀': '#ffd65c',
  '🎉': '#ff5f5f',
  '📦': '#3ddc84',
  '🍗': '#ff8a3d',
  '🍖': '#ff8a3d',
  '🍢': '#5fb8ff',
  '🥙': '#c98bff',
  '🍟': '#ffd65c',
  '🍰': '#ff8ac2',
  '🥤': '#8bd8ff',
  '🎁': '#ff8ac2',
  '⭐': '#ffc72c',
  '🔥': '#ff8a3d',
  '🍱': '#3ddc84',
  '🌯': '#7ec8ff',
  '🍚': '#ffd65c',
  '🍞': '#ffd65c',
  '🍪': '#ff8ac2',
  '🍫': '#ff8ac2',
  '🍲': '#c98bff',
  '🥗': '#8ee06a',
  '🥟': '#e8a33d',
  '🥬': '#7ed957',
  '🧅': '#ffd65c',
  '🌶️': '#ff5f5f',
  '🫓': '#ffd65c',
  '🍽️': '#ffc72c',
};

function foodIconAccent(emojiKey) {
  return FOOD_ICON_ACCENTS[emojiKey] || FOOD_ICON_ACCENTS['🍽️'];
}

function foodIconSvg(emojiKey, size) {
  const inner = FOOD_ICON_PATHS[emojiKey] || FOOD_ICON_PATHS['🍽️'];
  const px = size || 28;
  const accent = foodIconAccent(emojiKey);
  return `<svg class="food-icon" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: ${accent};">${inner}</svg>`;
}

// A soft radial glow in the icon's own accent colour, for the plain (photo-less) card/cart icon
// backdrops — takes a hex accent (as returned by foodIconAccent) and an opacity 0-1.
function foodIconGlowBackground(emojiKey, opacity) {
  const hex = foodIconAccent(emojiKey).replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `radial-gradient(circle at 50% 40%, rgba(${r}, ${g}, ${b}, ${opacity}) 0%, var(--color-bg) 70%)`;
}
