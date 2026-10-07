import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegionPreferences, regions } from '../core/region-preferences';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workspace-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule],
  templateUrl: './workspace-layout.html',
  styleUrl: './workspace-layout.scss',
})
export class WorkspaceLayout {
  readonly preferences = inject(RegionPreferences);
  readonly regions = regions;
  readonly links = [
    { path: '/', label: 'Visão geral', code: '00' },
    { path: '/database/items', label: 'Catálogo de itens', code: '01' },
    { path: '/market', label: 'Mercado e imposto', code: '02' },
    { path: '/crafting', label: 'Oficina de produção', code: '03' },
    { path: '/enhancement', label: 'Enhancement e FS', code: '04' },
    { path: '/gear', label: 'Progressão de gear', code: '05' },
    { path: '/lifeskills', label: 'Life skills e treino', code: '06' },
    { path: '/storage', label: 'Armazém e projetos', code: '07' },
    { path: '/rng', label: 'Caixas e Night Vendor', code: '08' },
    { path: '/buffs', label: 'Buffs e combinações', code: '09' },
    { path: '/settings', label: 'Dados e backup', code: '10' },
  ];
}
