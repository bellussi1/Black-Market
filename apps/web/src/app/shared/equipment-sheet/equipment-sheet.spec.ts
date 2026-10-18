import { characterSchema } from '@bdo/calculators';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { EquipmentSheet } from './equipment-sheet';

describe('life skill equipment sheet', () => {
  useMemoryStorage();
  it('distinguishes pending, failed and retried catalog requests without changing equipment', async () => {
    const first = new Subject<{ items: never[] }>();
    const second = new Subject<{ items: never[] }>();
    const getItems = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const fixture = await renderComponent(
      EquipmentSheet,
      {
        profile: characterSchema.parse({
          id: 'loading',
          name: 'Profissão',
          region: 'sa',
          gear: [{ slot: 'clothes', itemId: 1, name: 'Traje confirmado', level: 0, caphras: 0 }],
        }),
      },
      [{ provide: CatalogApiService, useValue: { getItems, resolveIconUrl: () => null } }],
    );
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Carregando descrição');
    expect(element.textContent).not.toContain('Descrição não disponível');
    first.error(new Error('offline'));
    fixture.detectChanges();
    const retry = element.querySelector<HTMLButtonElement>('.catalog-retry');
    expect(retry).not.toBeNull();
    retry!.click();
    fixture.detectChanges();
    expect(getItems).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Carregando descrição');
    second.next({ items: [] });
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Carregando descrição');
    expect(fixture.componentInstance.profile().gear[0].name).toBe('Traje confirmado');
  });
  it('keeps confirmed and unconfirmed Caphras visible in the selected item label', async () => {
    const fixture = await renderComponent(EquipmentSheet, {
      profile: characterSchema.parse({ id: 'one', name: 'Meu personagem', region: 'sa' }),
    });
    expect(
      fixture.componentInstance.levelText({
        slot: 'armor',
        itemId: 1,
        name: 'Armadura',
        level: 20,
        caphras: 3,
      }),
    ).toContain('Caphras 3');
    expect(
      fixture.componentInstance.levelText({
        slot: 'armor',
        itemId: 1,
        name: 'Armadura',
        level: 20,
        caphras: 3,
        caphrasConfirmed: false,
      }),
    ).toContain('Caphras a confirmar');
  });
  it('shows the 17 game positions plus profession tools and keeps unknown enhancement explicit', async () => {
    const getItems = vi.fn((_params: unknown) =>
      of({ items: [], total: 0, page: 1, pageSize: 100, dataset: null }),
    );
    const fixture = await renderComponent(
      EquipmentSheet,
      {
        profile: characterSchema.parse({
          id: 'one',
          name: 'Meu personagem',
          region: 'sa',
          gear: [
            {
              slot: 'ring1',
              itemId: 123,
              name: 'Anel de profissão',
              level: 5,
              levelConfirmed: false,
            },
          ],
          artifacts: [{ itemId: 456, name: 'Artefato de Vida' }],
        }),
      },
      [{ provide: CatalogApiService, useValue: { getItems, resolveIconUrl: () => null } }],
    );
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.equipment-orbit [data-slot]')).toHaveLength(17);
    expect(element.querySelectorAll('.profession-equipment [data-slot]')).toHaveLength(2);
    expect(element.querySelector('[data-slot="ring1"]')?.getAttribute('aria-label')).toContain(
      'Nível a confirmar',
    );
    expect(element.querySelector('[data-slot="artifact1"]')?.getAttribute('aria-label')).toContain(
      'Artefato de Vida',
    );
    expect(getItems.mock.calls[0][0]).toMatchObject({ ids: [123, 456] });
    const ring = element.querySelector<HTMLButtonElement>('[data-slot="ring1"]')!;
    ring.click();
    fixture.detectChanges();
    expect(ring.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('.equipment-selection')?.textContent).toContain(
      'Anel de profissão',
    );
  });
});
