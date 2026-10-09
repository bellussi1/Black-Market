import type { Crop } from './print-reader';

export interface PixelFrame {
  width: number;
  height: number;
  data: ArrayLike<number>;
}
/** Finds closed rarity frames, including muted borders in compressed equipment panes. */
export function findEquipmentFrames(frame: PixelFrame): Crop[] {
  const { width, height, data } = frame;
  const edge = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    return Math.max(r, g, b) > 65;
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
        if (left / h < 0.75 || right / h < 0.75 || bottom / size < 0.75) continue;
        const box = { left: x, top: y, width: size, height: h };
        if (!boxes.some((old) => Math.abs(old.left - x) < 5 && Math.abs(old.top - y) < 5))
          boxes.push(box);
        break;
      }
      x = end - 1;
    }
  const sizes = boxes.map((box) => box.width).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] ?? 0;
  return boxes.filter((box) =>
    (boxes.length < 8 || (box.width >= median * 0.8 && box.width <= median * 1.2)) &&
    !boxes.some((outer) => outer !== box && outer.width > box.width &&
      Math.abs(outer.left + outer.width / 2 - box.left - box.width / 2) < outer.width * 0.4 &&
      Math.abs(outer.top + outer.height / 2 - box.top - box.height / 2) < outer.height * 0.4),
  ).slice(0, 32);
}

const combatLayout = [
  ['helmet', 0, 0], ['armor', 3, 0], ['gloves', -1.2, 1.1], ['shoes', 4.2, 1.1],
  ['earring1', -2, 2.45], ['earring2', 5, 2.45], ['ring1', -2.25, 3.75],
  ['ring2', 5.25, 3.75], ['necklace', -1.2, 6.3], ['belt', 4.2, 6.3],
  ['mainhand', 0, 7.3], ['awakening', 1.5, 7.6], ['offhand', 3, 7.3],
] as const;
export interface EquipmentLayout {
  slots: ReadonlyMap<number, string>;
  statistics: { field: 'mainAp' | 'awakeAp' | 'dp'; crop: Crop }[];
}
/** Suggests positions only when a full combat constellation matches; costumes stay unassigned. */
export function suggestEquipmentLayout(frames: readonly Crop[], bounds: Crop): EquipmentLayout {
  let best: EquipmentLayout = { slots: new Map(), statistics: [] };
  for (const helmet of frames) for (const armor of frames) {
    const size = (helmet.width + armor.width) / 2;
    if (Math.abs(helmet.top - armor.top) > size * 0.25 ||
      (armor.left - helmet.left) / size < 2.7 || (armor.left - helmet.left) / size > 3.3) continue;
    const unit = (armor.left - helmet.left) / 3;
    const sizes = frames.map((frame) => frame.width).sort((a, b) => a - b);
    const verticalUnit = sizes[Math.floor(sizes.length / 2)] ?? size;
    const x = helmet.left + helmet.width / 2;
    const y = (helmet.top + armor.top) / 2 + size / 2;
    const slots = new Map<number, string>();
    for (const [slot, dx, dy] of combatLayout) {
      const index = frames.findIndex((box, i) => !slots.has(i) &&
        Math.hypot((box.left + box.width / 2 - x) / unit - dx,
          (box.top + box.height / 2 - y) / verticalUnit - dy) < 0.4);
      if (index !== -1) slots.set(index, slot);
    }
    if (slots.size < 10 || !['mainhand', 'awakening', 'offhand'].every((slot) =>
      [...slots.values()].includes(slot)) || slots.size <= best.slots.size) continue;
    const statistics: EquipmentLayout['statistics'] = [];
    for (const [i, field] of (['mainAp', 'awakeAp', 'dp'] as const).entries()) {
      const crop = { left: x + unit * 4.5, top: y + verticalUnit * (10.25 + i * 0.67),
        width: unit * 1.05, height: verticalUnit * 0.55 };
      if (crop.left >= bounds.left && crop.top >= bounds.top &&
        crop.left + crop.width <= bounds.left + bounds.width &&
        crop.top + crop.height <= bounds.top + bounds.height) statistics.push({ field, crop });
    }
    best = { slots, statistics };
  }
  return best;
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
