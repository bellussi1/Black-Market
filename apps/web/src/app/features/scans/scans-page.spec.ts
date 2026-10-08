import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CatalogItem, CatalogPage } from '@bdo/shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { IconRefiner } from './print-reader';
import { ScansPage } from './scans-page';

describe('Screenshot entry', () => {
  useMemoryStorage();
  function images() {
    vi.spyOn(IconRefiner.prototype, 'refine').mockImplementation(
      async (_image, _crop, matches) => matches,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      let sourceX = 0;
      return {
        drawImage: (_image: unknown, x: number) => {
          sourceX = x;
        },
        fillRect: vi.fn(),
        getImageData: (_x: number, _y: number, width: number, height: number) => ({
          data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) =>
            i % 4 === 3 ? 255 : (sourceX === 0 ? [150, 30, 30] : [30, 30, 150])[i % 4],
          ),
        }),
      } as unknown as CanvasRenderingContext2D;
    });
    const bitmap = { width: 100, height: 100, close: vi.fn() };
    const decode = vi.fn().mockResolvedValue(bitmap);
    vi.stubGlobal('createImageBitmap', decode);
    const OriginalURL = URL;
    vi.stubGlobal(
      'URL',
      class extends OriginalURL {
        static override createObjectURL() {
          return 'blob:test-image';
        }
        static override revokeObjectURL() {
          /* no retained URL in this fixture */
        }
      },
    );
    return decode;
  }
  it('accepts an explicitly pasted image through a keyboard-focusable area', async () => {
    const decode = images();
    const fixture = await renderComponent(ScansPage);
    const file = new File(['fixture'], 'print.png', { type: 'image/png' });
    const event = { clipboardData: { files: [file] }, preventDefault: vi.fn() };
    await fixture.componentInstance.paste(event as unknown as ClipboardEvent);
    fixture.detectChanges();
    expect(decode).toHaveBeenCalledWith(file);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.preview()).toBe('blob:test-image');
    expect(fixture.nativeElement.querySelector('.capture-drop').getAttribute('tabindex')).toBe('0');
    expect(fixture.componentInstance.store.data().inventory).toEqual([]);
  });

  it('keeps unknown spaces and shared identities available for manual review without saving estimates', async () => {
    images();
    const fixture = await renderComponent(ScansPage);
    const page = fixture.componentInstance;
    await page.file({
      target: { files: [new File(['image'], 'print.png', { type: 'image/png' })] },
    } as unknown as Event);
    page.columns = 2;
    page.rows = 1;
    const items = [6202, 6201].map(
      (id) =>
        ({
          id,
          name: `Item ${id}`,
          description: null,
          grade: null,
          weight: null,
          category: null,
          icon: null,
          categories: [],
        }) as CatalogItem,
    );
    vi.spyOn(page.catalog, 'getItems').mockReturnValue(of({ items } as CatalogPage));
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,test',
    );
    Object.defineProperty(page, 'reader', {
      value: {
        readQuantities: vi.fn().mockResolvedValue([
          { text: '264,8k', value: '264800', approximate: true, confidence: 80 },
          { text: '123', value: '123', approximate: false, confidence: 90 },
        ]),
        close: vi.fn(),
      },
    });
    const reading = page.read();
    const rgb = btoa(
      String.fromCharCode(...Uint8Array.from({ length: 192 }, (_, i) => [150, 30, 30][i % 3])),
    );
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url.includes('icon-index'))
      .flush({
        algorithm: 'rgb-top-v2',
        checksum: 'a'.repeat(64),
        entries: [{ rgb, ids: [6201, 6202] }],
      });
    await reading;
    fixture.detectChanges();
    expect(page.cells()).toHaveLength(2);
    expect(page.cells()[0].options.map((item) => item.id)).toEqual([6201, 6202]);
    expect(page.cells()[0]).toMatchObject({
      item: null,
      quantity: '',
      quantityEstimate: '264800',
      reviewed: false,
      include: false,
    });
    expect(page.cells()[1]).toMatchObject({ item: null, quantity: '123' });
    expect(fixture.nativeElement.querySelectorAll('.scan-cell')).toHaveLength(2);
    page.confirmStock = true;
    page.applyStock();
    expect(page.store.data().inventory).toEqual([]);
    const cell = page.cells()[0];
    page.select(cell, items[0]);
    page.review(cell, true);
    expect(page.includedCount()).toBe(0);
    cell.quantity = '264800';
    page.edited(cell);
    page.review(cell, true);
    expect(page.includedCount()).toBe(1);
    cell.quantity = '264801';
    page.edited(cell);
    expect(page.includedCount()).toBe(0);
    expect(page.store.data().inventory).toEqual([]);
    const unknown = page.cells()[1];
    const manual = { ...items[0], id: 741, name: 'Item escolhido manualmente' };
    page.select(unknown, manual);
    expect(unknown.options).toContainEqual(manual);
    page.review(unknown, true);
    page.confirmStock = true;
    page.applyStock();
    expect(page.store.data().inventory).toHaveLength(1);
    expect(page.store.data().inventory[0]).toMatchObject({
      itemId: 741,
      quantity: 123,
      location: 'Velia',
    });
    const savedId = page.store.data().inventory[0].id;
    page.confirmStock = true;
    page.applyStock();
    expect(page.store.data().inventory).toHaveLength(1);
    expect(page.store.data().inventory[0].id).toBe(savedId);
    TestBed.inject(HttpTestingController).verify();
  });
  it('accepts one dropped image and rejects multiple captures without decoding', async () => {
    const decode = images();
    const fixture = await renderComponent(ScansPage);
    const file = new File(['fixture'], 'print.png', { type: 'image/png' });
    const drop = (files: File[]) => ({ dataTransfer: { files }, preventDefault: vi.fn() });
    await fixture.componentInstance.drop(drop([file]) as unknown as DragEvent);
    expect(decode).toHaveBeenCalledOnce();
    decode.mockClear();
    await fixture.componentInstance.drop(drop([file, file]) as unknown as DragEvent);
    expect(decode).not.toHaveBeenCalled();
    expect(fixture.componentInstance.message()).toContain('uma captura por vez');
  });
  it('preserves the review on invalid files and refuses new files during recognition', async () => {
    const decode = images();
    const fixture = await renderComponent(ScansPage);
    const page = fixture.componentInstance;
    page.confirmStock = true;
    const file = new File(['text'], 'text.txt', { type: 'text/plain' });
    await page.drop({
      dataTransfer: { files: [file] },
      preventDefault: vi.fn(),
    } as unknown as DragEvent);
    expect(page.confirmStock).toBe(true);
    expect(decode).not.toHaveBeenCalled();
    page.busy.set(true);
    await page.paste({
      clipboardData: { files: [new File(['image'], 'print.png', { type: 'image/png' })] },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent);
    expect(decode).not.toHaveBeenCalled();
  });

  it('records print reading completion as an aggregate result only', async () => {
    const capture = vi.fn();
    images();
    const fixture = await renderComponent(ScansPage, {}, [
      { provide: AnalyticsService, useValue: { capture } },
    ]);
    const page = fixture.componentInstance;
    await page.file({
      target: { files: [new File(['image'], 'private-print.png', { type: 'image/png' })] },
    } as unknown as Event);
    page.mode = 'number';
    Object.defineProperty(page, 'reader', {
      value: { read: vi.fn().mockResolvedValue('123456'), close: vi.fn() },
      configurable: true,
    });
    await page.read();

    expect(capture.mock.calls).toEqual([
      ['journey_started', { feature: 'scans', action: 'read_print' }],
      [
        'journey_completed',
        {
          feature: 'scans',
          action: 'read_print',
          status: 'success',
          result: 'matches',
        },
      ],
    ]);
    expect(JSON.stringify(capture.mock.calls)).not.toMatch(/private-print|123456|image/i);
  });
});
