/** Render measured character masks, preserving right alignment and a black outline. */
export function measuredQuantityLabel(text, glyphs, { right, baseline, fontSize }, strokeWidth) {
  const shapes = [...text].map((character) =>
    glyphs.find((glyph) => glyph.character === character),
  );
  if (shapes.some((shape) => !shape)) return null;
  const scale = fontSize / Math.max(...shapes.map((shape) => shape.rows.length));
  const width = shapes.reduce((sum, shape) => sum + shape.rows[0].length + 1, -1) * scale;
  let x = right - width;
  const rectangles = [];
  for (const shape of shapes) {
    const top = baseline - shape.rows.length * scale;
    shape.rows.forEach((row, y) => {
      [...row].forEach((pixel, column) => {
        if (pixel === '1')
          rectangles.push(`M${x + column * scale},${top + y * scale}h${scale}v${scale}h-${scale}z`);
      });
    });
    x += (shape.rows[0].length + 1) * scale;
  }
  return {
    svg: `<path fill="#f3eee3" stroke="#050505" stroke-width="${strokeWidth}" paint-order="stroke fill" d="${rectangles.join('')}"/>`,
    bounds: {
      left: right - width - strokeWidth / 2,
      top: baseline - fontSize - strokeWidth / 2,
      width: width + strokeWidth,
      height: fontSize + strokeWidth,
    },
  };
}
