import { quantityGlyphs } from './quantity-glyphs';
import { realQuantityGlyphs } from './quantity-real-glyphs';

interface Mask {
  width: number;
  height: number;
  pixels: Uint8Array;
}
export function binarizeQuantityPixels(
  data: ArrayLike<number>,
  threshold = 120,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i + 3 < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const ink = luminance >= threshold && Math.max(r, g, b) - Math.min(r, g, b) < 85;
    const value = ink ? 0 : 255;
    output[i] = output[i + 1] = output[i + 2] = value;
    output[i + 3] = 255;
  }
  return output;
}
function trim(mask: Mask): Mask | null {
  let left = mask.width,
    top = mask.height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < mask.height; y++)
    for (let x = 0; x < mask.width; x++) {
      if (!mask.pixels[y * mask.width + x]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  if (right < left) return null;
  const width = right - left + 1,
    height = bottom - top + 1;
  return {
    width,
    height,
    pixels: Uint8Array.from(
      { length: width * height },
      (_, i) => mask.pixels[(top + Math.floor(i / width)) * mask.width + left + (i % width)],
    ),
  };
}
const templates = [...quantityGlyphs, ...realQuantityGlyphs].map(({ character, rows }) => ({
  character,
  mask: trim({
    width: rows[0].length,
    height: rows.length,
    pixels: Uint8Array.from(rows.join(''), (v) => Number(v)),
  })!,
}));
function similarity(a: Mask, b: Mask) {
  const aspect = Math.abs(a.width / a.height - b.width / b.height);
  let intersection = 0,
    total = 0;
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 16; x++) {
      const av =
        a.pixels[
          Math.min(a.height - 1, Math.floor(((y + 0.5) * a.height) / 20)) * a.width +
            Math.min(a.width - 1, Math.floor(((x + 0.5) * a.width) / 16))
        ];
      const bv =
        b.pixels[
          Math.min(b.height - 1, Math.floor(((y + 0.5) * b.height) / 20)) * b.width +
            Math.min(b.width - 1, Math.floor(((x + 0.5) * b.width) / 16))
        ];
      intersection += av && bv ? 1 : 0;
      total += av + bv;
    }
  return total ? (2 * intersection) / total - aspect * 0.5 : 0;
}

/** Fast local reading of outlined game digits; unknown fonts fall back to the general OCR. */
export function readQuantityPixels(
  data: ArrayLike<number>,
  width: number,
  height: number,
  channels = 4,
): { text: string; confidence: number } | null {
  if (width < 8 || height < 5 || data.length !== width * height * channels) return null;
  const votes = new Map<string, number[]>();
  for (const threshold of [150, 170, 190]) {
    const pixels = Uint8Array.from({ length: width * height }, (_, i) => {
      const r = data[i * channels],
        g = data[i * channels + 1],
        b = data[i * channels + 2];
      return Math.min(r, g, b) > threshold && Math.max(r, g, b) - Math.min(r, g, b) < 70 ? 1 : 0;
    });
    let bottom = -1;
    // Ignore the outer slot frame and find the baseline at the right edge.
    for (let y = Math.floor(height * 0.85); y >= Math.floor(height * 0.3); y--) {
      if (
        Array.from(
          { length: Math.floor(width * 0.3) },
          (_, i) => pixels[y * width + Math.floor(width * 0.65) + i],
        ).some(Boolean)
      ) {
        bottom = y;
        break;
      }
    }
    if (bottom < 0) continue;
    const top = Math.max(0, bottom - Math.round(height * 0.65) + 1);
    const occupied = Array.from({ length: width }, (_, x) => {
      for (let y = top; y <= bottom; y++) if (pixels[y * width + x]) return true;
      return false;
    });
    const runs: { left: number; right: number }[] = [];
    for (let x = 0; x < width * 0.97; x++) {
      if (!occupied[x]) continue;
      const left = x;
      while (x + 1 < width * 0.97 && occupied[x + 1]) x++;
      runs.push({ left, right: x });
    }
    const letterRuns = runs.filter((run) => {
      let min = bottom,
        max = top;
      for (let x = run.left; x <= run.right; x++)
        for (let y = top; y <= bottom; y++)
          if (pixels[y * width + x]) {
            min = Math.min(min, y);
            max = Math.max(max, y);
          }
      const glyphHeight = max - min + 1;
      return (
        glyphHeight >= height * 0.35 ||
        (glyphHeight <= 3 && run.right - run.left <= 2 && max >= bottom - 2)
      );
    });
    const last = letterRuns.at(-1);
    if (!last || last.right < width * 0.72) continue;
    const selected = [last];
    for (let i = letterRuns.length - 2; i >= 0; i--) {
      if (selected[0].left - letterRuns[i].right > height * 0.4) break;
      selected.unshift(letterRuns[i]);
    }
    let text = '',
      confidence = 1;
    for (const run of selected) {
      const w = run.right - run.left + 1,
        h = bottom - top + 1;
      const mask = trim({
        width: w,
        height: h,
        pixels: Uint8Array.from(
          { length: w * h },
          (_, i) => pixels[(top + Math.floor(i / w)) * width + run.left + (i % w)],
        ),
      });
      if (mask && mask.height <= 3 && mask.width <= 3) {
        text += mask.height > mask.width + 1 ? ',' : '.';
        continue;
      }
      if (!mask || mask.height < height * 0.35) {
        text = '';
        break;
      }
      // A bright slot frame or highlight is not an outlined numeral.
      if (mask.pixels.every(Boolean)) {
        text = '';
        break;
      }
      const byCharacter = new Map<string, number>();
      for (const t of templates)
        byCharacter.set(
          t.character,
          Math.max(byCharacter.get(t.character) ?? -Infinity, similarity(mask, t.mask)),
        );
      const ranked = [...byCharacter]
        .map(([character, score]) => ({ character, score }))
        .sort((a, b) => b.score - a.score);
      if (ranked[0].score < 0.74 || ranked[0].score - ranked[1].score < 0.05) {
        text = '';
        break;
      }
      text += ranked[0].character;
      confidence = Math.min(confidence, ranked[0].score);
    }
    if (text && text.length <= 12) votes.set(text, [...(votes.get(text) ?? []), confidence]);
  }
  const ranked = [...votes]
    .filter(([, scores]) => scores.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
  if (!ranked.length || (ranked[1] && ranked[1][1].length === ranked[0][1].length)) return null;
  return { text: ranked[0][0], confidence: Math.round(Math.min(...ranked[0][1]) * 100) };
}
