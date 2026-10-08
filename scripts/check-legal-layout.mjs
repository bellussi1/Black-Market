import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Source contracts, not a browser layout measurement or an accessibility certification.
const read = (path) => readFileSync(path, 'utf8');
const footer = read('apps/web/src/app/shared/platform-footer/platform-footer.scss');
const legal = read('apps/web/src/app/features/legal/legal-page.scss');
for (const css of [footer, legal]) {
  assert.match(css, /overflow-wrap:\s*anywhere/, 'Long content must wrap');
  assert.match(css, /min-height:\s*44px/, 'Links need an adequate touch target');
  assert.match(css, /:focus-visible/, 'Keyboard focus must be visible');
  assert.match(
    css,
    /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    'Mobile grid needs a flexible single column',
  );
  assert.doesNotMatch(css, /^\s*width:\s*\d+px/m, 'Avoid fixed horizontal dimensions');
}
assert.match(footer, /@media\s*\(max-width:\s*760px\)/);
assert.match(legal, /@media\s*\(max-width:\s*600px\)/);
const tokens = read('apps/web/src/styles/_tokens.scss');
const color = (name) => {
  const hex = tokens.match(new RegExp(`\\b${name}:\\s*#([a-f0-9]{6})`, 'i'))?.[1];
  assert.ok(hex, 'Missing design token');
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  return channels
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
};
let minimum = Infinity;
for (const background of ['background', 'surface']) {
  for (const foreground of ['text', 'muted', 'accent']) {
    const values = [color(background), color(foreground)].sort((a, b) => b - a);
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    assert.ok(ratio >= 4.5, `${foreground}/${background} fails normal-text contrast`);
    minimum = Math.min(minimum, ratio);
  }
}
console.log(
  `Legal/footer CSS contracts passed; minimum token text contrast ${minimum.toFixed(2)}:1. Browser reflow still requires visual validation.`,
);
