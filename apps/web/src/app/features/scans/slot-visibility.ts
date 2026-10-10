/** Conservative empty-slot test: texture, muted icons and uncertainty stay in review. */
export function isDefinitelyEmptySlot(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): boolean {
  if (width < 8 || height < 8 || rgba.length !== width * height * 4) return false;
  const samples: number[] = [];
  let chroma = 0;
  // Frame, enhancement corner and quantity area excluded.
  for (let y = Math.ceil(height * 0.2); y < height * 0.65; y++)
    for (let x = Math.ceil(width * 0.2); x < width * 0.8; x++) {
      const i = (y * width + x) * 4;
      const channels = [rgba[i], rgba[i + 1], rgba[i + 2]];
      samples.push((channels[0] + channels[1] + channels[2]) / 3);
      chroma = Math.max(chroma, Math.max(...channels) - Math.min(...channels));
    }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
  return (
    mean < 80 && variance < 14 && chroma < 16 && Math.max(...samples) - Math.min(...samples) < 18
  );
}

// Padlock silhouette measured from the supplied warehouse capture (14-storage.png).
// Values are brightness above each row's background; no catalogue item is an empty slot.
const lockShape = [
  [0, 0, 1, 11, 13, 1, 0, 0, 0],
  [0, 0, 19, 16, 12, 24, 2, 1, 1],
  [0, 3, 20, 8, 5, 20, 6, 1, 1],
  [0, 17, 32, 30, 32, 30, 20, 0, 1],
  [0, 22, 33, 22, 18, 33, 23, 0, 1],
  [0, 20, 33, 22, 17, 32, 24, 0, 0],
  [0, 18, 32, 30, 29, 32, 23, 1, 1],
  [0, 3, 6, 7, 8, 8, 5, 1, 1],
  [0, 0, 1, 0, 1, 1, 1, 2, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
].flat();
// Same capture through the detected 29.6px cell gutters, including its frame padding.
const framedLockShape = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 8, 16, 11, 0, 0, 0],
  [0, 0, 2, 22, 4, 18, 7, 0, 0],
  [0, 0, 8, 14, 11, 14, 10, 1, 1],
  [0, 0, 26, 32, 27, 32, 32, 3, 0],
  [0, 0, 27, 30, 9, 29, 30, 3, 0],
  [0, 0, 26, 32, 25, 32, 32, 4, 0],
  [0, 0, 10, 16, 17, 17, 14, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0],
].flat();

/** Only the known low-contrast padlock; unfamiliar textures must remain in review. */
export function isKnownLockedSlot(rgba: ArrayLike<number>, width: number, height: number): boolean {
  if (width < 16 || height < 16 || rgba.length !== width * height * 4) return false;
  const sample = (x: number, y: number) => {
    const i =
      (Math.max(0, Math.min(height - 1, Math.floor((y * height) / 16))) * width +
        Math.max(0, Math.min(width - 1, Math.floor((x * width) / 16)))) *
      4;
    const r = rgba[i],
      g = rgba[i + 1],
      b = rgba[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 10 || Math.max(r, g, b) > 110) return null;
    return (r + g + b) / 3;
  };
  const matches = (dx: number, dy: number) => {
    let dot = 0,
      framedDot = 0,
      energy = 0,
      expectedEnergy = 0,
      framedEnergy = 0,
      peak = 0;
    for (let y = 1; y <= 11; y++) {
      const outside = [2, 11, 12, 13].map((x) => sample(x + dx, y + dy));
      if (outside.some((v) => v === null)) return false;
      const background = outside.reduce<number>((sum, v) => sum + v!, 0) / outside.length;
      for (let x = 3; x <= 11; x++) {
        const value = sample(x + dx, y + dy);
        if (value === null) return false;
        const signal = Math.max(0, value - background);
        const expected = lockShape[(y - 1) * 9 + x - 3];
        const framed = framedLockShape[(y - 1) * 9 + x - 3];
        dot += signal * expected;
        energy += signal * signal;
        expectedEnergy += expected * expected;
        framedDot += signal * framed;
        framedEnergy += framed * framed;
        peak = Math.max(peak, signal);
      }
    }
    return (
      peak >= 12 &&
      peak <= 65 &&
      energy > 100 &&
      Math.max(
        dot / Math.sqrt(energy * expectedEnergy),
        framedDot / Math.sqrt(energy * framedEnergy),
      ) > 0.95
    );
  };
  // Fractional gutter placement shifts a 29px slot by a few sampling pixels.
  const shifts = [0, -0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2];
  return shifts.some((dx) => shifts.some((dy) => matches(dx, dy)));
}
