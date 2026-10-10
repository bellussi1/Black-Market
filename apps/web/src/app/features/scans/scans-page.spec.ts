import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { characterSchema } from '@bdo/calculators';
import type { CatalogItem, CatalogPage } from '@bdo/shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { IconRefiner } from './print-reader';
import { ScansPage } from './scans-page';

describe('Screenshot entry', () => {
  useMemoryStorage();
  it('lets the user choose a destination before uploading and requires an explicit first analysis', async () => {
    const fixture = await renderComponent(ScansPage);
    expect(fixture.componentInstance.autoRead()).toBe(false);
    const select = fixture.nativeElement.querySelector('#capture-type') as HTMLSelectElement;
    expect(select).toBeTruthy();
    select.value = 'gear';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.mode).toBe('gear');
    expect(fixture.nativeElement.textContent).toContain('Nome do personagem');
  });
  it('creates a character inline while preserving the open capture and applying its destination', async () => {
    images();
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    page.mode = 'inventory';
    await page.file({
      target: { files: [new File(['capture'], 'inventory.png', { type: 'image/png' })] },
    } as unknown as Event);
    const hash = page.jobs()[0].hash;
    page.captureCharacterName = 'Novo aventureiro';
    page.createCaptureCharacter();
    expect(page.jobs()).toHaveLength(1);
    expect(page.jobs()[0].hash).toBe(hash);
    expect(page.jobs()[0].profileId).toBe(page.store.activeCharacter()?.id);
    expect(page.profileId).toBe(page.store.activeCharacter()?.id);
  });
  it('keeps existing capture destinations when a different upload type and warehouse are chosen', async () => {
    images();
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    await page.file({
      target: { files: [new File(['first'], 'first.png', { type: 'image/png' })] },
    } as unknown as Event);
    const first = page.jobs()[0];
    page.captureMode = 'inventory';
    page.captureLocation = 'Heidel';
    page.captureProfileId = 'another';
    await page.file({
      target: { files: [new File(['second'], 'second.png', { type: 'image/png' })] },
    } as unknown as Event);
    const second = page.jobs()[1];
    await page.activateJob(second.id);
    expect(first).toMatchObject({ mode: 'storage', location: 'Velia', profileId: '' });
    expect(second).toMatchObject({ mode: 'inventory', location: 'Heidel', profileId: 'another' });
  });
  it('uses a newly created character even after an existing destination was selected before upload', async () => {
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    page.captureMode = 'gear';
    page.captureProfileId = 'previous';
    page.captureCharacterName = 'New gear owner';
    page.createCaptureCharacter();
    expect(page.captureProfileId).toBe(page.store.activeCharacter()?.id);
    expect(page.captureProfileId).not.toBe('previous');
  });
  it('confirms only clear item and exact quantity suggestions and keeps ambiguity in the pending queue', async () => {
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    const item = { id: 1, name: 'Material', icon: null } as CatalogItem;
    const cell = {
      id: 0,
      preview: '',
      options: [item],
      item,
      score: 1,
      quantity: '10',
      quantityText: '10',
      quantityEstimate: null,
      quantityUncertain: false,
      quantityConfidence: 95,
      include: false,
      reviewed: false,
      slot: '',
      level: 0,
      caphras: 0,
    };
    page.cells.set([
      cell,
      { ...cell, id: 1, item: null },
      { ...cell, id: 2, quantityUncertain: true },
    ]);
    page.confirmReliable();
    expect(page.cells().map((row) => row.reviewed)).toEqual([true, false, false]);
    expect(page.cells().map((row) => row.include)).toEqual([true, false, false]);
    expect(page.reviewCells()).toHaveLength(2);
  });
  it('saves confident results across captures after one approval and leaves ambiguous items out', async () => {
    images();
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    await page.file({
      target: {
        files: [
          new File(['a'], 'a.png', { type: 'image/png' }),
          new File(['b'], 'b.png', { type: 'image/png' }),
        ],
      },
    } as unknown as Event);
    const draft = (id: number, uncertain = false) => ({
      id,
      preview: '',
      options: [],
      item: { id, name: `Material ${id}`, icon: null } as CatalogItem,
      itemUncertain: uncertain,
      score: 1,
      quantity: '12',
      quantityText: '12',
      quantityEstimate: null,
      quantityUncertain: false,
      quantityConfidence: 95,
      include: false,
      reviewed: false,
      slot: '',
      level: 0,
      caphras: 0,
    });
    const jobs = page.jobs();
    jobs[0].cells = [draft(100), draft(101, true)];
    jobs[1].cells = [draft(102)];
    jobs.forEach((job) => (job.status = 'ready'));
    page.jobs.set([...jobs]);
    page.cells.set(jobs[0].cells);
    expect(page.importableCount()).toBe(2);
    Object.defineProperty(page, 'readingRegion', { value: 'sa', writable: true });
    await page.saveBatch();
    expect(page.store.data().inventory).toHaveLength(0);
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(
      page.store
        .data()
        .inventory.map((row) => row.itemId)
        .sort(),
    ).toEqual([100, 102]);
    expect(page.jobs()[0].cells[1].reviewed).toBe(false);
    expect(page.batchConfirmed()).toBe(false);
    page.review(page.cells()[0], false);
    expect(page.reliable(page.cells()[0])).toBe(false);
    page.confirmReliableBatch();
    expect(page.cells()[0].include).toBe(false);
    expect(page.importableCount()).toBe(1);
  });
  it('shows duplicate reliable recognitions before accepting or saving them', async () => {
    images();
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    await page.file({
      target: {
        files: [
          new File(['a'], 'a.png', { type: 'image/png' }),
          new File(['b'], 'b.png', { type: 'image/png' }),
        ],
      },
    } as unknown as Event);
    const cell = {
      id: 0,
      preview: '',
      options: [],
      item: { id: 212, name: 'Corda', icon: null } as CatalogItem,
      score: 1,
      quantity: '48',
      quantityText: '48',
      quantityConfidence: 95,
      quantityEstimate: null,
      quantityUncertain: false,
      include: false,
      reviewed: false,
      slot: '',
      level: 0,
      caphras: 0,
    };
    page.jobs.update((jobs) =>
      jobs.map((job) => ({ ...job, status: 'ready', cells: [{ ...cell }] })),
    );
    page.cells.set(page.jobs()[0].cells);
    expect(page.duplicateGroups()).toHaveLength(1);
    Object.defineProperty(page, 'readingRegion', { value: 'sa', writable: true });
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().inventory).toHaveLength(0);
    expect(page.message()).toContain('repetido');
    page.chooseDuplicate(page.duplicateGroups()[0][0], 'maximum');
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().inventory[0].quantity).toBe(48);
  });
  it('clears quantity OCR warnings after an exact manual correction', async () => {
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    const cell = {
      id: 0,
      preview: '',
      options: [],
      item: null,
      quantity: '1200',
      quantityText: '1.2k',
      quantityConfidence: 40,
      quantityEstimate: '1200',
      quantityUncertain: true,
      include: false,
      reviewed: false,
      slot: '',
      level: 0,
      caphras: 0,
    };
    page.cells.set([cell]);
    page.edited(cell);
    expect(cell).toMatchObject({
      quantityUncertain: false,
      quantityEstimate: null,
      quantityConfidence: 100,
    });
    cell.quantity = 'abc';
    page.edited(cell);
    expect(cell.quantityUncertain).toBe(true);
  });
  it('allows quick estimate auto-fill, default quantity, and toggle ignore/restore', async () => {
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    const item = { id: 10, name: 'Item Teste', icon: null } as CatalogItem;
    const cell = {
      id: 0,
      preview: '',
      options: [item],
      item,
      quantity: '',
      quantityText: '1.2k',
      quantityEstimate: '1200',
      quantityUncertain: true,
      quantityConfidence: 40,
      include: false,
      reviewed: false,
      ignored: false,
      slot: '',
      level: 0,
      caphras: 0,
    };
    page.cells.set([cell]);
    page.useEstimate(cell);
    expect(cell.quantity).toBe('1200');
    expect(cell.reviewed).toBe(true);
    expect(cell.include).toBe(true);

    cell.quantity = '';
    page.useDefaultQuantity(cell, '1');
    expect(cell.quantity).toBe('1');
    expect(cell.reviewed).toBe(true);
    expect(cell.include).toBe(true);

    page.toggleIgnore(cell);
    expect(cell.ignored).toBe(true);
    expect(cell.include).toBe(false);
    expect(cell.reviewed).toBe(false);

    page.toggleIgnore(cell);
    expect(cell.ignored).toBe(false);
  });
  it('directly confirms and saves all identified items in 1 click without individual reviews', async () => {
    images();
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    await page.file({
      target: {
        files: [
          new File(['c1'], 'c1.png', { type: 'image/png' }),
          new File(['c2'], 'c2.png', { type: 'image/png' }),
        ],
      },
    } as unknown as Event);
    const item1 = { id: 501, name: 'Pedra Negra (Arma)', icon: null } as CatalogItem;
    const item2 = { id: 502, name: 'Pedra Negra (Armadura)', icon: null } as CatalogItem;
    const jobs = page.jobs();
    jobs[0].cells = [
      {
        id: 0,
        preview: '',
        options: [item1],
        item: item1,
        quantity: '50',
        quantityText: '50',
        quantityEstimate: null,
        quantityUncertain: false,
        quantityConfidence: 95,
        include: false,
        reviewed: false,
        slot: '',
        level: 0,
        caphras: 0,
      },
    ];
    jobs[1].cells = [
      {
        id: 0,
        preview: '',
        options: [item2],
        item: item2,
        quantity: '',
        quantityText: '',
        quantityEstimate: null,
        quantityUncertain: false,
        quantityConfidence: 85,
        include: false,
        reviewed: false,
        slot: '',
        level: 0,
        caphras: 0,
      },
    ];
    for (const job of jobs) job.status = 'ready';
    page.jobs.set([...jobs]);
    page.cells.set(jobs[0].cells);
    expect(page.totalIdentifiedCount()).toBe(2);
    expect(page.canSaveDirectly()).toBe(true);
    Object.defineProperty(page, 'readingRegion', { value: 'sa', writable: true });

    await page.confirmAndSaveAll();

    expect(page.store.data().inventory).toHaveLength(2);
    expect(
      page.store
        .data()
        .inventory.map((row) => row.itemId)
        .sort(),
    ).toEqual([501, 502]);
    expect(page.store.data().inventory.find((r) => r.itemId === 502)?.quantity).toBe(1);
  });
  it('keeps the card visible while typing a multi-digit correction until explicitly included', async () => {
    const fixture = await renderComponent(ScansPage),
      page = fixture.componentInstance;
    const cell = {
      id: 0,
      preview: '',
      options: [],
      item: { id: 100, name: 'Material', icon: null } as CatalogItem,
      score: 1,
      quantity: '',
      quantityText: '',
      quantityEstimate: null,
      quantityUncertain: true,
      quantityConfidence: 0,
      include: false,
      reviewed: false,
      slot: '',
      level: 0,
      caphras: 0,
    };
    page.preview.set('data:image/png;base64,test');
    page.cells.set([cell]);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#scan-qty-0') as HTMLInputElement;
    expect(input).toBeTruthy();
    for (const value of ['1', '12', '123']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#scan-qty-0')).toBe(input);
      expect(page.reviewCells()).toHaveLength(1);
    }
    expect(cell.quantity).toBe('123');
    expect(page.reliable(cell)).toBe(false);
    page.review(cell, true);
    expect(page.reviewCells()).toHaveLength(0);
  });
  it('preserves historical gear values only for the same item without confirming an unread level', async () => {
    images();
    const fixture = await renderComponent(ScansPage);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'owner',
          name: 'Aventureiro',
          region: 'sa',
          gear: [
            {
              slot: 'mainhand',
              itemId: 10010,
              name: 'Espada',
              level: 19,
              caphras: 3,
              levelConfirmed: true,
              caphrasConfirmed: true,
            },
          ],
        }),
      ],
    }));
    page.mode = 'gear';
    page.profileId = 'owner';
    await page.file({
      target: { files: [new File(['gear'], 'gear.png', { type: 'image/png' })] },
    } as unknown as Event);
    const item = { id: 10010, name: 'Espada', icon: null } as CatalogItem;
    const cell = {
      id: 0,
      preview: '',
      options: [item],
      item,
      quantity: '',
      quantityText: '',
      quantityEstimate: null,
      quantityUncertain: true,
      include: true,
      reviewed: true,
      slot: 'mainhand',
      level: 0,
      caphras: 0,
      levelConfirmed: false,
      caphrasConfirmed: false,
    };
    page.jobs()[0].status = 'ready';
    page.cells.set([cell]);
    page.equipmentStatistics = { mainAp: '417', awakeAp: '417', dp: '505' };
    Object.defineProperty(page, 'readingRegion', { value: 'sa', writable: true });
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().characters[0].gear[0]).toMatchObject({
      itemId: 10010,
      level: 19,
      caphras: 3,
      levelConfirmed: false,
      caphrasConfirmed: false,
    });
    expect(page.store.data().characters[0].mainAp).toBe(0);
    cell.item = { ...item, id: 10011 };
    page.cells.set([cell]);
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().characters[0].gear[0]).toMatchObject({
      itemId: 10011,
      level: 0,
      caphras: 0,
      levelConfirmed: false,
      caphrasConfirmed: false,
    });
    page.confirmStatistics(true);
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().characters[0]).toMatchObject({ mainAp: 417, awakeAp: 417, dp: 505 });
    page.equipmentStatistics.dp = '9000';
    page.statisticsEdited();
    expect(page.statisticsConfirmed).toBe(false);
    page.confirmStatistics(true);
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().characters[0].dp).toBe(505);
    expect(page.message()).toContain('Confira');
  });
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
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,fixture',
    );
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
      item: items[1],
      itemUncertain: true,
      quantity: '',
      quantityEstimate: '264800',
      reviewed: false,
      include: false,
    });
    expect(page.cells()[1]).toMatchObject({ item: null, itemUncertain: true, quantity: '123' });
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
  it('accepts batches, detects exact duplicates and enforces eight captures', async () => {
    const decode = images();
    const fixture = await renderComponent(ScansPage);
    const file = new File(['fixture'], 'print.png', { type: 'image/png' });
    const drop = (files: File[]) => ({ dataTransfer: { files }, preventDefault: vi.fn() });
    await fixture.componentInstance.drop(drop([file]) as unknown as DragEvent);
    expect(decode).toHaveBeenCalledTimes(2);
    decode.mockClear();
    await fixture.componentInstance.drop(drop([file, file]) as unknown as DragEvent);
    expect(decode).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.jobs()).toHaveLength(3);
    expect(
      fixture.componentInstance
        .jobs()
        .slice(1)
        .every((job) => job.status === 'duplicate'),
    ).toBe(true);
    decode.mockClear();
    await fixture.componentInstance.drop(drop(Array(6).fill(file)) as unknown as DragEvent);
    expect(decode).not.toHaveBeenCalled();
    expect(fixture.componentInstance.message()).toContain('8 capturas');
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
  it('processes eight captures sequentially and keeps completed reviews on cancellation', async () => {
    images();
    const fixture = await renderComponent(ScansPage);
    const page = fixture.componentInstance;
    await page.drop({
      dataTransfer: {
        files: Array.from(
          { length: 8 },
          (_, i) => new File([String(i)], `capture-${i}.png`, { type: 'image/png' }),
        ),
      },
      preventDefault: vi.fn(),
    } as unknown as DragEvent);
    expect(page.jobs()).toHaveLength(8);
    const order: string[] = [];
    let active = 0,
      maxActive = 0;
    vi.spyOn(page, 'read').mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      const job = page.activeJob()!;
      order.push(job.id);
      await Promise.resolve();
      job.status = 'ready';
      page.jobs.set([...page.jobs()]);
      active--;
    });
    await page.readBatch();
    expect(order).toHaveLength(8);
    expect(maxActive).toBe(1);
    expect(page.jobs().every((job) => job.status === 'ready')).toBe(true);
    page.jobs()[6].status = 'queued';
    page.jobs()[7].status = 'queued';
    page.jobs.set([...page.jobs()]);
    vi.mocked(page.read).mockImplementation(async () => {
      page.activeJob()!.status = 'cancelled';
      page.cancel();
    });
    await page.readBatch();
    expect(
      page
        .jobs()
        .slice(0, 6)
        .every((job) => job.status === 'ready'),
    ).toBe(true);
    expect(page.jobs()[7].status).toBe('queued');
    expect(page.store.data().inventory).toEqual([]);
  });
  it('validates replacement before releasing the original and accepts replacement at capacity', async () => {
    images();
    const fixture = await renderComponent(ScansPage);
    const page = fixture.componentInstance;
    await page.drop({
      dataTransfer: {
        files: Array.from(
          { length: 8 },
          (_, i) => new File([String(i)], `${i}.png`, { type: 'image/png' }),
        ),
      },
      preventDefault: vi.fn(),
    } as unknown as DragEvent);
    const first = page.jobs()[0];
    await page.replaceJob(first.id, {
      target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] },
    } as unknown as Event);
    expect(page.jobs()).toContain(first);
    expect(page.jobs()).toHaveLength(8);
    await page.replaceJob(first.id, {
      target: { files: [new File(['replacement'], 'new.png', { type: 'image/png' })] },
    } as unknown as Event);
    expect(page.jobs()).toHaveLength(8);
    expect(page.jobs()).not.toContain(first);
    expect(page.jobs().at(-1)!.file.name).toBe('new.png');
  });
  it('requires review and duplicate decisions, persists provenance, and never erases unseen items on partial updates', async () => {
    images();
    const fixture = await renderComponent(ScansPage);
    const page = fixture.componentInstance;
    await page.drop({
      dataTransfer: {
        files: [
          new File(['one'], 'one.png', { type: 'image/png' }),
          new File(['two'], 'two.png', { type: 'image/png' }),
        ],
      },
      preventDefault: vi.fn(),
    } as unknown as DragEvent);
    const item = { id: 212, name: 'Corda', icon: null } as CatalogItem;
    const draft = (quantity: string) => ({
      id: 0,
      preview: '',
      options: [item],
      item,
      quantity,
      quantityText: quantity,
      quantityEstimate: null,
      quantityUncertain: false,
      include: true,
      reviewed: true,
      slot: '',
      level: 0,
      caphras: 0,
    });
    const jobs = page.jobs();
    jobs[0].cells = [draft('48')];
    jobs[1].cells = [draft('48')];
    for (const job of jobs) job.status = 'ready';
    page.cells.set(jobs[0].cells);
    page.jobs.set([...jobs]);
    Object.defineProperty(page, 'readingRegion', { value: 'sa', writable: true });
    page.store.update((state) => ({
      ...state,
      inventory: [
        {
          id: 'unseen',
          name: 'Outro item',
          itemId: 999,
          region: 'sa',
          location: 'Velia',
          quantity: 7,
          target: 0,
          price: '0',
        },
      ],
    }));
    await page.saveBatch();
    expect(page.store.data().inventory).toHaveLength(1);
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.message()).toContain('repetido');
    expect(page.store.data().inventory).toHaveLength(1);
    const key = page.duplicateGroups()[0][0];
    page.chooseDuplicate(key, 'maximum');
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().inventory).toHaveLength(2);
    expect(page.store.data().inventory.find((row) => row.itemId === 212)).toMatchObject({
      quantity: 48,
      sources: [
        { hash: jobs[0].hash, slot: 0, capture: 1 },
        { hash: jobs[1].hash, slot: 0, capture: 2 },
      ],
    });
    expect(page.store.data().screenshotImports).toHaveLength(1);
    expect(localStorage.getItem('black-market.workspace.v1')).not.toContain('one.png');
    const saved = JSON.parse(localStorage.getItem('black-market.workspace.v1')!);
    expect(saved.inventory.find((row: { itemId: number }) => row.itemId === 212).quantity).toBe(48);
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().inventory).toHaveLength(2);
    page.updateMode.set('replace');
    page.batchConfirmed.set(true);
    await page.saveBatch();
    expect(page.store.data().inventory).toHaveLength(2);
    expect(page.message()).toContain('local inteiro');
  });
});
