import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CatalogItem } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';

import { isLoginRequiredPath } from '../../core/auth.guard';
import { IdentityService } from '../../core/identity.service';
import { isMvpPathEnabled, SCREENSHOT_MVP } from '../../core/mvp-scope';
import { RegionPreferences } from '../../core/region-preferences';
import { WorkspaceStore } from '../../core/workspace-store';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { PlayerOverview } from '../../shared/player-overview/player-overview';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-page',
  imports: [HlmCard, HlmButton, RouterLink, PlayerOverview, CatalogItemPicker],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  readonly selectedItem = signal<CatalogItem | null>(null);
  readonly screenshotMvp = SCREENSHOT_MVP;
  readonly isEnabled = isMvpPathEnabled;
  readonly store = inject(WorkspaceStore);
  readonly identity = inject(IdentityService);
  readonly preferences = inject(RegionPreferences);
  readonly counts = this.preferences.counts;
  readonly hasWorkspaceData = computed(() =>
    this.counts().some((stat) => stat.value > 0 && isMvpPathEnabled(stat.path)),
  );
  private readonly journeyOptions = SCREENSHOT_MVP
    ? [
        {
          number: '00',
          icon: 'market',
          title: 'Comparar valores',
          description: 'Consulte preço e estoque. Alterne entre valor bruto e recebimento líquido.',
          path: '/market',
          requiresAuth: false,
          tag: 'MERCADO CENTRAL',
          steps: 'Selecionar item · conferir cotação',
        },
        {
          number: '01',
          icon: 'craft',
          title: 'Explorar uma receita',
          description: 'Abra os ingredientes, confira o estoque e descubra fontes conhecidas.',
          path: '/recipes',
          requiresAuth: false,
          tag: 'PRODUÇÃO',
          steps: 'Buscar item · escolher método · explorar',
        },
        {
          number: '02',
          icon: 'storage',
          title: 'Importar minhas capturas',
          description: 'Selecione até oito imagens. Confira itens e quantidades antes de salvar.',
          path: '/scans',
          requiresAuth: true,
          tag: 'IMPORTAÇÃO',
          steps: 'Enviar · conferir · salvar',
        },
        {
          number: '03',
          icon: 'storage',
          title: 'Consultar meu armazém',
          description: 'Encontre seus itens por cidade ou personagem e ajuste as quantidades.',
          path: '/storage',
          requiresAuth: true,
          tag: 'ARMAZÉM',
          steps: 'Armazéns e inventários · pesquisar · editar',
        },
        {
          number: '04',
          icon: 'storage',
          title: 'Gerenciar minha família',
          description: 'Reúna personagens, equipamentos, profissões e bônus da família.',
          path: '/family',
          requiresAuth: false,
          tag: 'FAMÍLIA',
          steps: 'Escolher personagem · revisar ficha e equipamentos',
        },
      ]
    : [
        {
          number: '01',
          icon: 'market',
          title: $localize`Consultar um preço`,
          description: $localize`Veja preço e estoque da região e descubra quanto recebe depois do imposto.`,
          path: '/market',
          requiresAuth: false,
          tag: $localize`MERCADO`,
          steps: $localize`Buscar item · conferir cotação · guardar`,
        },
        {
          number: '02',
          icon: 'craft',
          title: $localize`Produzir ou comprar`,
          description: $localize`Confira os materiais e compare o custo da receita com o valor de venda.`,
          path: '/crafting',
          requiresAuth: false,
          tag: $localize`PRODUÇÃO`,
          steps: $localize`Escolher produto · revisar materiais · comparar`,
        },
        {
          number: '03',
          icon: 'silver',
          title: $localize`Encontrar uma atividade lucrativa`,
          description: $localize`Compare suas opções com o tempo, a energia e os recursos do personagem.`,
          path: '/recommendations',
          requiresAuth: true,
          tag: $localize`PRATA POR HORA`,
          steps: $localize`Informar personagem · comparar · salvar plano`,
        },
        {
          number: '04',
          icon: 'storage',
          title: $localize`Organizar meus materiais`,
          description: $localize`Importe uma captura ou cadastre itens para usar nas receitas e nos planos.`,
          path: '/storage',
          requiresAuth: true,
          tag: $localize`ARMAZÉM`,
          steps: $localize`Adicionar itens · revisar estoque · planejar uso`,
        },
      ];
  readonly journeys = computed(() =>
    this.journeyOptions.filter((journey) => !journey.requiresAuth || this.identity.authenticated()),
  );
  readonly canOpenPath = (path: string) =>
    this.identity.authenticated() || !isLoginRequiredPath(path);
  readonly tools = [
    {
      title: $localize`Buscar itens no mercado`,
      description: $localize`Encontre itens do jogo, preços e informações relacionadas.`,
      path: '/market',
      tag: $localize`MERCADO`,
    },
    {
      title: $localize`Aprimoramento e acúmulos`,
      description: $localize`Compare chances e custos para formar acúmulos de falha.`,
      path: '/enhancement',
      tag: $localize`APRIMORAMENTO`,
    },
    {
      title: $localize`Família`,
      description: $localize`Organize personagens, equipamentos e bônus.`,
      path: '/family',
      tag: $localize`FAMÍLIA`,
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
  ].filter((tool) => isMvpPathEnabled(tool.path) && this.canOpenPath(tool.path));
}
