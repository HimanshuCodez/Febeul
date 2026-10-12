export const LUXE_FONT_GROUPS = {
  'Serif': ['Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Libre Baskerville'],
  'Sans serif': ['Raleway', 'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Open Sans', 'Lato', 'Nunito'],
  'Display': ['Cinzel', 'Quicksand', 'Dancing Script'],
  'System': ['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New', 'system-ui'],
};

export const LUXE_COLOR_FIELDS = [
  ['backgroundColor', 'Page background', '#fdf5f5'],
  ['cardBackgroundColor', 'Card background', '#ffffff'],
  ['headingColor', 'Headings and prices', '#b87a7b'],
  ['textColor', 'Body text', '#c98a8b'],
  ['descriptionColor', 'Coupon descriptions', '#9b6869'],
  ['accentColor', 'Accent and icons', '#e07f82'],
  ['borderColor', 'Borders and highlights', '#f9aeaf'],
  ['buttonBackgroundColor', 'Button background', '#b87a7b'],
  ['buttonTextColor', 'Button text', '#ffffff'],
  ['buttonHoverColor', 'Button hover', '#a66b6c'],
  ['bannerBackgroundColor', 'Promo background', '#b87a7b'],
  ['bannerTextColor', 'Promo text', '#ffffff'],
];

export const DEFAULT_LUXE_APPEARANCE = Object.freeze({
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Raleway',
  ...Object.fromEntries(LUXE_COLOR_FIELDS.map(([key, , value]) => [key, value])),
});

const fontNames = Object.values(LUXE_FONT_GROUPS).flat();
const isColor = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);

// Older saved pages have no appearance settings. Invalid legacy values also fall back safely.
export function resolveLuxeAppearance(input) {
  const result = { ...DEFAULT_LUXE_APPEARANCE };
  for (const key of ['headingFont', 'bodyFont']) {
    if (fontNames.includes(input?.[key])) result[key] = input[key];
  }
  for (const [key] of LUXE_COLOR_FIELDS) {
    if (isColor(input?.[key])) result[key] = input[key].toLowerCase();
  }
  return result;
}

export function validateLuxeAppearance(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid Luxe appearance settings.');
  for (const key of ['headingFont', 'bodyFont']) {
    if (input[key] !== undefined && !fontNames.includes(input[key])) throw new Error('Choose a font from the Luxe font list.');
  }
  for (const [key, label] of LUXE_COLOR_FIELDS) {
    if (input[key] !== undefined && !isColor(input[key])) throw new Error(`${label} must be a six-digit hex colour.`);
  }
  return resolveLuxeAppearance(input);
}

export function luxeAppearanceStyle(input) {
  const appearance = resolveLuxeAppearance(input);
  return {
    ...Object.fromEntries(LUXE_COLOR_FIELDS.map(([key]) => [`--luxe-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, appearance[key]])),
    '--luxe-heading-font': appearance.headingFont === 'system-ui' ? 'system-ui' : `"${appearance.headingFont}", serif`,
    '--luxe-body-font': appearance.bodyFont === 'system-ui' ? 'system-ui' : `"${appearance.bodyFont}", sans-serif`,
    '--luxe-border-soft': `${appearance.borderColor}66`,
    '--luxe-border-faint': `${appearance.borderColor}33`,
    '--luxe-heading-border': `${appearance.headingColor}66`,
    '--luxe-button-border': `${appearance.buttonBackgroundColor}4d`,
    '--luxe-placeholder': `${appearance.textColor}b3`,
  };
}

export function luxeFontUrl(input) {
  const appearance = resolveLuxeAppearance(input);
  const fonts = [...new Set([appearance.headingFont, appearance.bodyFont])]
    .filter(font => !LUXE_FONT_GROUPS.System.includes(font));
  if (!fonts.length) return null;
  return `https://fonts.googleapis.com/css2?${fonts.map(font => {
    const axes = ['Cinzel', 'Quicksand', 'Dancing Script'].includes(font) ? 'wght@400;700' : 'ital,wght@0,400;0,700;1,400;1,700';
    return `family=${encodeURIComponent(font).replace(/%20/g, '+')}:${axes}`;
  }).join('&')}&display=swap`;
}
