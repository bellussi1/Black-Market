import { afterEach, describe, expect, it, vi } from 'vitest';

import { NumberReader } from './print-reader';
afterEach(() => vi.restoreAllMocks());
function context() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    getImageData: (_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
}
describe('Numeric reader lifecycle', () => {
  it('tries independent OCR for a weak native result and replaces it with stronger exact evidence', async () => {
    context();
    const worker = {
      setParameters: vi.fn().mockResolvedValue(undefined),
      recognize: vi.fn().mockResolvedValue({
        data: {
          text: '72',
          confidence: 95,
          blocks: [
            {
              paragraphs: [
                {
                  lines: [{ text: '72', confidence: 95, bbox: { x0: 12, y0: 12, x1: 60, y1: 40 } }],
                },
              ],
            },
          ],
        },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    const reader = new NumberReader(vi.fn().mockReturnValue({ text: '12', confidence: 40 }));
    Object.defineProperty(reader, 'worker', { value: worker, writable: true });
    const result = await reader.readQuantities({} as CanvasImageSource, [
      { left: 0, top: 0, width: 40, height: 20 },
    ]);
    expect(worker.recognize).toHaveBeenCalledTimes(2);
    expect(result[0]).toMatchObject({
      value: '72',
      confidence: 84,
      approximate: false,
      evidence: 'conflict',
    });
    await reader.close();
  });
  it('cancels a pending worker recognition without waiting for an OCR response', async () => {
    context();
    const worker = {
      setParameters: vi.fn().mockResolvedValue(undefined),
      recognize: vi.fn().mockReturnValue(new Promise(() => undefined)),
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    const reader = new NumberReader();
    Object.defineProperty(reader, 'worker', { value: worker, writable: true });
    const promise = reader.read({} as CanvasImageSource, {
      left: 0,
      top: 0,
      width: 40,
      height: 20,
    });
    const rejection = expect(promise).rejects.toThrow('cancelada');
    await vi.waitFor(() => expect(worker.recognize).toHaveBeenCalledOnce());
    await reader.close();
    await rejection;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('preserves exact native readings and leaves unresolved counts blank if fallback fails', async () => {
    context();
    const pixels = vi
      .fn()
      .mockReturnValueOnce({ text: '48', confidence: 93 })
      .mockReturnValueOnce(null);
    const worker = {
      setParameters: vi.fn().mockResolvedValue(undefined),
      recognize: vi.fn().mockRejectedValue(new Error('Unavailable')),
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    const reader = new NumberReader(pixels);
    Object.defineProperty(reader, 'worker', { value: worker, writable: true });
    const results = await reader.readQuantities({} as CanvasImageSource, [
      { left: 0, top: 0, width: 40, height: 20 },
      { left: 50, top: 0, width: 40, height: 20 },
    ]);
    expect(results[0]).toMatchObject({ value: '48', approximate: false });
    expect(results[1]).toMatchObject({ value: null, confidence: 0 });
    await reader.close();
  });
});
