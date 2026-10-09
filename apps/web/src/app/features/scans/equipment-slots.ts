import type { Crop } from './print-reader';

export interface PixelFrame {
  width: number;
  height: number;
  data: ArrayLike<number>;
}
/** Finds closed colored frames, including equipment panes without regular rows. */
export function findEquipmentFrames(frame: PixelFrame): Crop[] {
  const { width, height, data } = frame;
  const edge = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    return Math.max(r, g, b) > 90 && Math.max(r, g, b) - Math.min(r, g, b) > 38;
  };
  const boxes: Crop[] = [];
  for (let y = 0; y < height - 20; y++)
    for (let x = 0; x < width - 20; x++) {
      if (!edge(x, y) || (x > 0 && edge(x - 1, y))) continue;
      let end = x;
      while (end < width && edge(end, y)) end++;
      const size = end - x;
      if (size < 22 || size > 80 || y + size >= height) continue;
      // Try square frame heights within two pixels; cropped frames stay manual.
      for (let h = size - 2; h <= size + 2; h++) {
        if (y + h >= height) continue;
        let left = 0,
          right = 0,
          bottom = 0;
        for (let d = 0; d < h; d++) {
          left += Number(edge(x, y + d));
          right += Number(edge(end - 1, y + d));
        }
        for (let d = x; d < end; d++) bottom += Number(edge(d, y + h - 1));
        if (left / h < 0.8 || right / h < 0.8 || bottom / size < 0.8) continue;
        const box = { left: x, top: y, width: size, height: h };
        if (!boxes.some((old) => Math.abs(old.left - x) < 4 && Math.abs(old.top - y) < 4))
          boxes.push(box);
        break;
      }
      x = end - 1;
    }
  return boxes.slice(0, 32);
}
export function detectEquipmentFrames(image: ImageBitmap, bounds: Crop): Crop[] {
  const scale = Math.min(1, 1100 / Math.max(bounds.width, bounds.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(
    image,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return findEquipmentFrames({ width: canvas.width, height: canvas.height, data: pixels.data }).map(
    (box) => ({
      left: bounds.left + box.left / scale,
      top: bounds.top + box.top / scale,
      width: box.width / scale,
      height: box.height / scale,
    }),
  );
}
