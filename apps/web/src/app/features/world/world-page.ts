import { HttpClient } from '@angular/common/http';
import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { calculateActivity, defaultTax } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import type { Subscription } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RegionPreferences } from '../../core/region-preferences';
import { evaluate } from '../../shared/calculation-feedback';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { silver } from '../../shared/formatters';
import { BdoSelect } from '../../ui/native-select/bdo-select';
import { connectionRoute, type WorldNode } from './node-routing';
import { WorkerEmpireComponent } from './worker-empire';
@Component({
  selector: 'app-world-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmInput,
    HlmCard,
    BdoSelect,
    FormsModule,
    RouterLink,
    CatalogItemPicker,
    WorkerEmpireComponent,
  ],
  templateUrl: './world-page.html',
  styleUrl: './world-page.scss',
})
export class WorldPage implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly preferences = inject(RegionPreferences);
  private request?: Subscription;
  readonly nodes = signal<WorldNode[]>([]);
  readonly message = signal('');
  readonly loading = signal(false);
  readonly start = signal('');
  readonly destination = signal('');
  readonly search = signal('');
  readonly silver = silver;
  readonly filtered = computed(() =>
    this.nodes()
      .filter(
        (node) =>
          node.enabled &&
          node.name.toLocaleLowerCase('pt-BR').includes(this.search().toLocaleLowerCase('pt-BR')),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  readonly route = computed(() => connectionRoute(this.nodes(), this.start(), this.destination()));
  readonly markers = computed(() => {
    const nodes = this.nodes();
    if (!nodes.length) return [];
    const x = nodes.map((node) => node.x),
      z = nodes.map((node) => node.z);
    const minX = Math.min(...x),
      maxX = Math.max(...x),
      minZ = Math.min(...z),
      maxZ = Math.max(...z);
    return nodes.map((node) => ({
      ...node,
      px: 30 + ((node.x - minX) / Math.max(1, maxX - minX)) * 940,
      py: 970 - ((node.z - minZ) / Math.max(1, maxZ - minZ)) * 940,
    }));
  });
  readonly edges = computed(() => {
    const map = new Map(this.markers().map((node) => [node.id, node]));
    const seen = new Set<string>();
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const node of this.markers())
      for (const id of node.links) {
        const held = map.get(id),
          key = [node.id, id].sort().join('|');
        if (!held || seen.has(key)) continue;
        seen.add(key);
        lines.push({ x1: node.px, y1: node.py, x2: held.px, y2: held.py });
      }
    return lines;
  });
  readonly workerItem = signal<CatalogItem | null>(null);
  readonly cycleMinutes = signal(60);
  readonly cycles = signal(1);
  readonly quantity = signal(1);
  readonly price = signal('0');
  readonly cost = signal('0');
  readonly worker = computed(() =>
    !this.workerItem() || this.price() === '0'
      ? { value: null, error: null }
      : evaluate(() =>
          calculateActivity({
            ...defaultTax,
            name: 'Produção de trabalhadores',
            minutes: this.cycleMinutes() * this.cycles(),
            energy: 0,
            cost: this.cost(),
            directIncome: '0',
            items: this.workerItem()
              ? [
                  {
                    name: this.workerItem()!.name,
                    itemId: this.workerItem()!.id,
                    quantity: this.quantity() * this.cycles(),
                    price: this.price(),
                  },
                ]
              : [],
          }),
        ),
  );
  constructor() {
    effect(() => {
      this.preferences.region();
      untracked(() => this.load());
    });
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.message.set('');
    this.nodes.set([]);
    this.start.set('');
    this.destination.set('');
    this.request = this.http
      .get<{
        nodes: WorldNode[];
      }>(environment.apiBaseUrl + '/api/v1/world/nodes', {
        params: { region: this.preferences.region(), locale: 'pt' },
      })
      .subscribe({
        next: (result) => {
          this.nodes.set(result.nodes);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.message.set('Não foi possível carregar o mapa. Tente novamente.');
        },
      });
  }
  inRoute(id: string) {
    return this.route()?.nodes.some((node) => node.id === id) ?? false;
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
  }
}
