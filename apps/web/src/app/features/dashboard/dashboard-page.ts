import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RegionPreferences } from '../../core/region-preferences';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  readonly preferences = inject(RegionPreferences);
  readonly counts = this.preferences.counts;
  readonly tools = [
    {
      code: '01',
      title: $localize`Catálogo do jogo`,
      description: $localize`Itens, imagens, categorias e receitas do jogo, em português.`,
      path: '/database/items',
      tag: $localize`REFERÊNCIA`,
    },
    {
      code: '02',
      title: $localize`Mercado e imposto`,
      description: $localize`Cotações pessoais, favoritos, histórico e prata líquida.`,
      path: '/market',
      tag: $localize`PRATA`,
    },
    {
      code: '03',
      title: $localize`Oficina de produção`,
      description: $localize`Lucro de receitas, comprar ou produzir e cadeia de materiais.`,
      path: '/crafting',
      tag: $localize`PRODUÇÃO`,
    },
    {
      code: '04',
      title: $localize`Aprimoramento e acúmulos (FS)`,
      description: $localize`Probabilidades, custos, garantia e caminhos de acúmulos.`,
      path: '/enhancement',
      tag: $localize`RISCO`,
    },
    {
      code: '05',
      title: $localize`Progressão de equipamentos`,
      description: $localize`Conjuntos e melhorias comparados por custo de atributos.`,
      path: '/gear',
      tag: $localize`PROGRESSÃO`,
    },
    {
      code: '06',
      title: $localize`Profissões e treino`,
      description: $localize`Sessões, prata por hora, retorno de maestria e estimador de experiência.`,
      path: '/lifeskills',
      tag: $localize`RENDIMENTO`,
    },
    {
      code: '07',
      title: $localize`Armazém e projetos`,
      description: $localize`Estoque por local e acompanhamento de materiais faltantes.`,
      path: '/storage',
      tag: $localize`PLANEJAMENTO`,
    },
    {
      code: '08',
      title: $localize`Caixas e vendedor noturno`,
      description: $localize`Valor esperado de recompensas e ofertas com probabilidades próprias.`,
      path: '/rng',
      tag: $localize`VALOR ESPERADO`,
    },
    {
      code: '09',
      title: $localize`Buffs e combinações`,
      description: $localize`Biblioteca pessoal, grupos exclusivos, combinações e temporizadores.`,
      path: '/buffs',
      tag: $localize`PREPARAÇÃO`,
    },
  ];
}
