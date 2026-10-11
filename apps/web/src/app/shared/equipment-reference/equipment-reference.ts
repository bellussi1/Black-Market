import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CatalogItem } from '@bdo/shared';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import { forkJoin, of, type Subscription, switchMap } from 'rxjs';
import { z } from 'zod';

import { CatalogApiService } from '../../core/catalog-api.service';
import { ReferenceApi } from '../../core/reference-api.service';
import { RegionPreferences } from '../../core/region-preferences';
import { referenceFields } from '../../features/reference/reference-fields';
import { BdoSelect } from '../../ui/native-select/bdo-select';
import { CatalogItemPicker } from '../catalog-item-picker/catalog-item-picker';
import { silver } from '../formatters';

const enhancement = z.object({
  levels: z.array(
    z
      .object({
        level: z.number().int(),
        name: z.string(),
        enhanceChance: z.number().min(0).max(1).optional(),
      })
      .passthrough(),
  ),
});
const caphras = z.object({
  levels: z.array(
    z.object({
      enchantLevel: z.number().int(),
      steps: z.array(
        z.object({
          level: z.number().int(),
          stones: z.number().int().nonnegative(),
          totalStones: z.number().int().nonnegative(),
          stats: z.record(z.string(), z.number()).optional(),
        }),
      ),
    }),
  ),
});
@Component({
  selector: 'app-equipment-reference',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmInput, HlmCard, BdoSelect, FormsModule, RouterLink, CatalogItemPicker],
  templateUrl: './equipment-reference.html',
})
export class EquipmentReference implements OnDestroy {
  private readonly catalog = inject(CatalogApiService);
  private readonly reference = inject(ReferenceApi);
  private readonly preferences = inject(RegionPreferences);
  private request?: Subscription;
  private region = this.preferences.region();
  readonly selected = signal<CatalogItem | null>(null);
  readonly enhancements = signal<z.infer<typeof enhancement> | null>(null);
  readonly caphras = signal<z.infer<typeof caphras> | null>(null);
  readonly message = signal('');
  readonly level = signal(0);
  readonly from = signal(0);
  readonly to = signal(1);
  readonly stonePrice = signal('0');
  readonly silver = silver;
  readonly stats = computed(() => {
    const row = this.enhancements()?.levels.find((row) => row.level === this.level());
    return row ? referenceFields(row) : [];
  });
  readonly steps = computed(
    () => this.caphras()?.levels.find((row) => row.enchantLevel === this.level())?.steps ?? [],
  );
  readonly cost = computed(() => {
    const steps = this.steps();
    const current =
      this.from() === 0 ? 0 : steps.find((row) => row.level === this.from())?.totalStones;
    const next = steps.find((row) => row.level === this.to())?.totalStones;
    if (current === undefined || next === undefined || this.to() <= this.from() || next < current)
      return null;
    const stones = next - current;
    const validPrice = /^[1-9]\d{0,29}$/.test(this.stonePrice());
    return {
      stones,
      cost: validPrice ? String(BigInt(stones) * BigInt(this.stonePrice())) : null,
      stats: referenceFields({ stats: steps.find((row) => row.level === this.to())?.stats }),
    };
  });
  constructor() {
    effect(() => {
      const region = this.preferences.region();
      untracked(() => {
        if (region !== this.region) {
          this.select(null);
          this.region = region;
        }
      });
    });
  }
  select(item: CatalogItem | null) {
    this.request?.unsubscribe();
    this.selected.set(item);
    this.enhancements.set(null);
    this.caphras.set(null);
    this.message.set('');
    this.level.set(0);
    this.from.set(0);
    this.to.set(1);
    this.stonePrice.set('0');
    if (!item) return;
    this.message.set('Carregando informações…');
    this.request = this.catalog
      .getItem(item.id)
      .pipe(
        switchMap((response) => {
          const data = response.item.sourceData['enhancement'];
          const urn = data && typeof data === 'object' && 'urn' in data ? data.urn : undefined;
          const caphrasUrn =
            data && typeof data === 'object' && 'caphrasCategory' in data
              ? data.caphrasCategory
              : undefined;
          return forkJoin({
            enhancement:
              typeof urn === 'string' ? this.reference.detail('enhancements', urn) : of(null),
            caphras:
              typeof caphrasUrn === 'string'
                ? this.reference.detail('caphras', caphrasUrn)
                : of(null),
          });
        }),
      )
      .subscribe({
        next: (result) => {
          const parsed = enhancement.safeParse(result.enhancement?.data);
          const cap = caphras.safeParse(result.caphras?.data);
          if (parsed.success) {
            this.enhancements.set(parsed.data);
            this.level.set(parsed.data.levels[0]?.level ?? 0);
          }
          if (cap.success) this.caphras.set(cap.data);
          this.message.set(
            parsed.success ? '' : 'Este item não tem uma tabela de aprimoramento disponível.',
          );
        },
        error: () =>
          this.message.set('Não foi possível carregar esta referência. Escolha novamente o item.'),
      });
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
  }
}
