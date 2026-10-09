import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { isMvpPathEnabled, SCREENSHOT_MVP } from '../../core/mvp-scope';
import { RegionPreferences } from '../../core/region-preferences';
import { WorkspaceStore } from '../../core/workspace-store';
import { PlayerOverview } from '../../shared/player-overview/player-overview';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-page',
  imports: [RouterLink, PlayerOverview],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  readonly screenshotMvp = SCREENSHOT_MVP;
  readonly isEnabled = isMvpPathEnabled;
  readonly store = inject(WorkspaceStore);
  readonly preferences = inject(RegionPreferences);
  readonly counts = this.preferences.counts;
  readonly hasWorkspaceData = computed(() =>
    this.counts().some((stat) => stat.value > 0 && isMvpPathEnabled(stat.path)),
  );
  readonly journeys = SCREENSHOT_MVP
    ? [
        {
          number: '01',
          icon: 'storage',
          title: 'Importar minhas capturas',
          description: 'Selecione até oito imagens. Confira itens e quantidades antes de salvar.',
          path: '/scans',
          tag: 'IMPORTAÇÃO',
          steps: 'Enviar · conferir · salvar',
        },
        {
          number: '02',
          icon: 'storage',
          title: 'Consultar meu armazém',
          description: 'Encontre seus itens por cidade e ajuste as quantidades.',
          path: '/storage',
          tag: 'ARMAZÉM',
          steps: 'Escolher cidade · pesquisar · editar',
        },
        {
          number: '03',
          icon: 'storage',
          title: 'Organizar meu inventário',
          description: 'Separe os itens de cada personagem e atualize por novas capturas.',
          path: '/inventory',
          tag: 'INVENTÁRIO',
          steps: 'Escolher personagem · revisar itens',
        },
        {
          number: '04',
          icon: 'craft',
          title: 'Ver meus equipamentos',
          description: 'Confira os equipamentos do personagem e corrija seus slots.',
          path: '/gear',
          tag: 'EQUIPAMENTOS',
          steps: 'Escolher personagem · revisar posições',
        },
      ]
    : [
        {
          number: '01',
          icon: 'market',
          title: $localize`Consultar um preço`,
          description: $localize`Veja preço e estoque da região e descubra quanto recebe depois do imposto.`,
          path: '/market',
          tag: $localize`MERCADO`,
          steps: $localize`Buscar item · conferir cotação · guardar`,
        },
        {
          number: '02',
          icon: 'craft',
          title: $localize`Produzir ou comprar`,
          description: $localize`Confira os materiais e compare o custo da receita com o valor de venda.`,
          path: '/crafting',
          tag: $localize`PRODUÇÃO`,
          steps: $localize`Escolher produto · revisar materiais · comparar`,
        },
        {
          number: '03',
          icon: 'silver',
          title: $localize`Encontrar uma atividade lucrativa`,
          description: $localize`Compare suas opções com o tempo, a energia e os recursos do personagem.`,
          path: '/recommendations',
          tag: $localize`PRATA POR HORA`,
          steps: $localize`Informar personagem · comparar · salvar plano`,
        },
        {
          number: '04',
          icon: 'storage',
          title: $localize`Organizar meus materiais`,
          description: $localize`Importe uma captura ou cadastre itens para usar nas receitas e nos planos.`,
          path: '/storage',
          tag: $localize`ARMAZÉM`,
          steps: $localize`Adicionar itens · revisar estoque · planejar uso`,
        },
      ];
  readonly tools = [
    {
      title: $localize`Buscar itens e receitas`,
      description: $localize`Encontre itens do jogo, categorias e receitas relacionadas.`,
      path: '/database/items',
      tag: $localize`CATÁLOGO`,
    },
    {
      title: $localize`Aprimoramento e acúmulos`,
      description: $localize`Compare chances e custos para formar acúmulos de falha.`,
      path: '/enhancement',
      tag: $localize`APRIMORAMENTO`,
    },
    {
      title: $localize`Equipamentos`,
      description: $localize`Organize sua progressão e compare melhorias possíveis.`,
      path: '/gear',
      tag: $localize`PERSONAGEM`,
    },
    {
      title: $localize`Profissões e treino`,
      description: $localize`Registre atividades, maestria e experiência observada.`,
      path: '/lifeskills',
      tag: $localize`RENDIMENTO`,
    },
    {
      title: $localize`Bases e trabalhadores`,
      description: $localize`Planeje conexões e acompanhe sua rede de trabalhadores.`,
      path: '/world',
      tag: $localize`MUNDO`,
    },
    {
      title: $localize`Caixas e vendedor noturno`,
      description: $localize`Calcule o valor esperado de caixas e ofertas.`,
      path: '/rng',
      tag: $localize`PROBABILIDADE`,
    },
    {
      title: $localize`Buffs e combinações`,
      description: $localize`Monte combinações pessoais e acompanhe seus temporizadores.`,
      path: '/buffs',
      tag: $localize`PREPARAÇÃO`,
    },
    {
      title: $localize`Guia do mundo`,
      description: $localize`Consulte informações e referências do jogo.`,
      path: '/reference',
      tag: $localize`REFERÊNCIA`,
    },
  ].filter((tool) => isMvpPathEnabled(tool.path));
}
