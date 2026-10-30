import colors from 'tailwindcss/colors.js';
import plugin from 'tailwindcss/plugin.js';
import { customColors } from './themePalette.js';

const families = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const neutrals = new Set(families.slice(0, 5));
const backgroundShades = { 50: '#11151e', 100: '#1c2230', 200: '#2b3343', 300: '#3b4659', 400: '#59667d' };
const textShades = { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#a5b4c7', 500: '#a5b4c7', 600: '#b8c4d5', 700: '#d5ddea', 800: '#e2e8f0', 900: '#f1f5f9', 950: '#f8fafc' };
const rgb = hex => hex.replace('#', '').match(/../g).map(channel => parseInt(channel, 16));
const luminance = channels => channels.map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
const mix = (channels, target, amount) => channels.map((channel, index) => Math.round(channel + (target[index] - channel) * amount));

function darkColor(role, hex, family, shade) {
  const channels = rgb(hex);
  if (family === 'white') return role === 'bg' ? [25, 31, 43] : role === 'border' ? [63, 73, 91] : channels;
  if (family === 'black') return role === 'text' ? [241, 245, 249] : channels;
  if (neutrals.has(family)) {
    if (role === 'text') return rgb(textShades[shade]);
    if (role === 'bg') return backgroundShades[shade] ? rgb(backgroundShades[shade]) : channels;
    return Number(shade) <= 300 ? [55, 65, 83] : mix(channels, [160, 174, 195], .2);
  }
  const light = luminance(channels);
  if (role === 'text') return light > .6 ? channels : mix(channels, [244, 240, 250], light < .08 ? .85 : light < .3 ? .55 : .3);
  if (role === 'bg') return light > .55 ? mix([22, 28, 39], channels.map(channel => channel - Math.min(...channels) + 22), .16) : channels;
  return light > .5 ? mix([55, 65, 83], channels.map(channel => channel - Math.min(...channels) + 55), .18) : channels;
}

const darkVariables = {};
const lightVariables = {};
function themedPalette(role) {
  const value = (name, hex, family, shade) => {
    darkVariables[`--admin-${role}-${name}`] = darkColor(role, hex, family, shade).join(' ');
    lightVariables[`--admin-${role}-${name}`] = rgb(hex).join(' ');
    return `rgb(var(--admin-${role}-${name}, ${rgb(hex).join(' ')}) / <alpha-value>)`;
  };
  return {
    white: value('white', '#ffffff', 'white'),
    black: value('black', '#000000', 'black'),
    ...Object.fromEntries(families.map(family => [family, Object.fromEntries(Object.entries(colors[family]).map(([shade, hex]) => [shade, value(`${family}-${shade}`, hex, family, shade)]))])),
    theme: Object.fromEntries(customColors.map(hex => [hex, value(hex, `#${hex}`)])),
  };
}

const background = themedPalette('bg');
const foreground = themedPalette('text');
const border = themedPalette('border');

// Separate foreground and surface palettes keep colored buttons legible while
// their pale badges, hover states, and text adapt to the selected theme.
export const themeColors = {
  backgroundColor: background,
  gradientColorStops: background,
  textColor: foreground,
  placeholderColor: foreground,
  textDecorationColor: foreground,
  borderColor: border,
  divideColor: border,
  ringColor: border,
  ringOffsetColor: background,
  outlineColor: border,
};

export const themePlugin = plugin(({ addBase }) => {
  addBase({ ':root, [data-theme="light"]': lightVariables, ':root[data-theme="dark"]': darkVariables });
});
