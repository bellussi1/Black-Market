import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { ScansPage } from './scans-page';

describe('Screenshot entry', () => {
  useMemoryStorage();
  function images() {
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
