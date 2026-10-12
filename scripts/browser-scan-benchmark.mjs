/** Playwright harness for the development app. Labels never enter the browser reader. */
export async function benchmarkScanPage(page, imagePath) {
  await page.goto('http://localhost:4200/scans');
  await page.locator('input[type=file]').first().setInputFiles(imagePath);
  await page.locator('app-scans-page').waitFor({ timeout: 90000 });
  await page.waitForFunction(
    () => !!globalThis.ng?.getComponent(document.querySelector('app-scans-page'))?.image,
    undefined,
    { timeout: 90000 },
  );
  return page.evaluate(async () => {
    const component = globalThis.ng.getComponent(document.querySelector('app-scans-page'));
    const started = performance.now();
    while (component.locked()) await new Promise((resolve) => setTimeout(resolve, 20));
    if (!component.cells().length) await component.read();
    const durationMs = component.activeJob()?.elapsedMs || performance.now() - started;
    const cells = component.cells().map((cell) => ({
      rect: cell.sourceRect,
      item: cell.item?.id ?? null,
      quantity: cell.quantity,
      uncertain: cell.quantityUncertain,
      itemUncertain: cell.itemUncertain,
      text: cell.quantityText,
      options: cell.options.map((item) => item.id),
    }));
    const crops = cells.map(({ rect }) => ({
      left: rect.left,
      top: rect.top + rect.height * 0.57,
      width: rect.width,
      height: rect.height * 0.37,
    }));
    const glyphStarted = performance.now();
    const glyphs = crops.map((crop) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(crop.width);
      canvas.height = Math.round(crop.height);
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(
        component.image,
        Math.round(crop.left),
        Math.round(crop.top),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      return component.reader.readPixels(pixels.data, canvas.width, canvas.height) ?? { text: '' };
    });
    const glyphDurationMs = performance.now() - glyphStarted;
    // Disable only the pixel reader; reuse the same Tesseract crop/fallback engine as Scan.
    const tesseract = new component.reader.constructor(() => null);
    const tesseractStarted = performance.now();
    const tesseractReadings = [];
    try {
      for (let start = 0; start < crops.length; start += 50)
        tesseractReadings.push(
          ...(await tesseract.readQuantities(component.image, crops.slice(start, start + 50))),
        );
    } finally {
      await tesseract.close();
    }
    return {
      durationMs,
      cells,
      readers: {
        glyph: {
          durationMs: glyphDurationMs,
          cells: cells.map((cell, index) => ({ ...cell, text: glyphs[index].text })),
        },
        tesseract: {
          durationMs: performance.now() - tesseractStarted,
          cells: cells.map((cell, index) => ({
            ...cell,
            text: tesseractReadings[index]?.text ?? '',
          })),
        },
      },
    };
  });
}
