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
