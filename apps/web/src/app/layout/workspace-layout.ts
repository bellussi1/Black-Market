import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { visibleMarkets } from '../core/market-configuration';
import { RegionPreferences } from '../core/region-preferences';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workspace-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule],
  templateUrl: './workspace-layout.html',
  styleUrl: './workspace-layout.scss',
})
export class WorkspaceLayout {
  readonly preferences = inject(RegionPreferences);
  readonly markets = computed(() => visibleMarkets(this.preferences.region()));
  readonly links = [
    { path: '/', label: $localize`Visão geral`, code: '00' },
    { path: '/database/items', label: $localize`Catálogo de itens`, code: '01' },
    { path: '/market', label: $localize`Mercado e imposto`, code: '02' },
    { path: '/crafting', label: $localize`Oficina de produção`, code: '03' },
    { path: '/enhancement', label: $localize`Aprimoramento e acúmulos (FS)`, code: '04' },
    { path: '/gear', label: $localize`Progressão de equipamentos`, code: '05' },
    { path: '/lifeskills', label: $localize`Profissões e treino`, code: '06' },
    { path: '/storage', label: $localize`Armazém e projetos`, code: '07' },
    { path: '/rng', label: $localize`Caixas e vendedor noturno`, code: '08' },
    { path: '/buffs', label: $localize`Buffs e combinações`, code: '09' },
    { path: '/settings', label: $localize`Dados e backup`, code: '10' },
  ];
}
