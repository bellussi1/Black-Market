import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RegionPreferences } from '../../core/region-preferences';
@Component({
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
      title: 'Catálogo do jogo',
      description: 'Itens, categorias e receitas importados da sua extração.',
      path: '/database/items',
      tag: 'REFERÊNCIA',
    },
    {
      code: '02',
      title: 'Mercado e imposto',
      description: 'Cotações pessoais, favoritos, histórico e prata líquida.',
      path: '/market',
      tag: 'PRATA',
    },
    {
      code: '03',
      title: 'Oficina de produção',
      description: 'Lucro de receitas, comprar ou produzir e cadeia de materiais.',
      path: '/crafting',
      tag: 'CRAFTING',
    },
    {
      code: '04',
      title: 'Enhancement e FS',
      description: 'Probabilidades, custos, pity e caminhos de failstack.',
      path: '/enhancement',
      tag: 'RISCO',
    },
    {
      code: '05',
      title: 'Progressão de gear',
      description: 'Builds e upgrades comparados por custo de atributos.',
      path: '/gear',
      tag: 'PROGRESSÃO',
    },
    {
      code: '06',
      title: 'Life skills e treino',
      description: 'Sessões, prata por hora, retorno de mastery e estimador de XP.',
      path: '/lifeskills',
      tag: 'RENDIMENTO',
    },
    {
      code: '07',
      title: 'Armazém e projetos',
      description: 'Estoque por local e acompanhamento de materiais faltantes.',
      path: '/storage',
      tag: 'PLANEJAMENTO',
    },
    {
      code: '08',
      title: 'Caixas e Night Vendor',
      description: 'Valor esperado de drops e ofertas com probabilidades próprias.',
      path: '/rng',
      tag: 'VALOR ESPERADO',
    },
    {
      code: '09',
      title: 'Buffs e combinações',
      description: 'Biblioteca pessoal, grupos exclusivos, presets e timers.',
      path: '/buffs',
      tag: 'PREPARAÇÃO',
    },
  ];
}
