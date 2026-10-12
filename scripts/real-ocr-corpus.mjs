import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/** Validate before calibration or scoring. A source image and its session belong to one split. */
export function validateRealSamples(samples) {
  const sessions = new Map();
  const images = new Map();
  if (!samples.length) throw new Error('Real corpus is empty');
  for (const sample of samples) {
    if (sample.source !== 'user-provided' || !sample.sessionId || !sample.sha256)
      throw new Error('Authorized source, session and hash are required');
    if (!['calibration', 'evaluation'].includes(sample.split)) throw new Error('Invalid split');
    for (const [registry, key] of [
      [sessions, sample.sessionId],
      [images, sample.sha256],
    ]) {
      if (registry.has(key) && registry.get(key) !== sample.split)
        throw new Error('Source or session crosses splits');
      registry.set(key, sample.split);
    }
    if (!sample.slots.length) throw new Error('Sample has no labels');
    for (const slot of sample.slots) {
      const b = slot.bounds;
      if (
        !b ||
        ![b.left, b.top, b.width, b.height].every(Number.isFinite) ||
        b.left < 0 ||
        b.top < 0 ||
        b.width <= 0 ||
        b.height <= 0 ||
        b.left + b.width > sample.width ||
        b.top + b.height > sample.height
      )
        throw new Error('Slot lies outside capture');
      if (!slot.displayedText || !/^\d+$/.test(String(slot.normalizedValue)))
        throw new Error('Visible quantity label required');
    }
  }
}

export async function verifyRealImages(samples) {
  validateRealSamples(samples);
  for (const sample of samples) {
    const bytes = await readFile(sample.imagePath);
    if (createHash('sha256').update(bytes).digest('hex') !== sample.sha256)
      throw new Error('Capture hash mismatch');
  }
}
