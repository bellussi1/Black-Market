import type { TutorialGuideStepInput, TutorialLocale, TutorialScreenKey } from '@bdo/shared';

export interface TutorialSeedEntry {
  screenKey: TutorialScreenKey;
  locale: TutorialLocale;
  enabled: boolean;
  steps: readonly TutorialGuideStepInput[];
}

export const TUTORIAL_SEED_REVISION = '2026-10-16-workshop-v1';

export const TUTORIAL_SEED_ENTRIES: readonly TutorialSeedEntry[] = [
  {
    screenKey: 'market',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'market.search',
        title: 'Buscar no mercado',
        body: 'Pesquise pelo nome ou código de um item para localizar suas cotações no Mercado Central.',
      },
      {
        sortOrder: 1,
        anchorKey: 'market.filters',
        title: 'Filtrar disponibilidade e volume',
        body: 'Refine a lista por estoque ou atividade de 24 horas para encontrar itens negociados.',
      },
      {
        sortOrder: 2,
        anchorKey: 'market.results',
        title: 'Conferir preços e histórico',
        body: 'Selecione um item na tabela para abrir suas variantes, histórico observado e calculadora de venda.',
      },
    ],
  },
  {
    screenKey: 'recipes',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'recipes.search',
        title: 'Pesquisar produto ou material',
        body: 'Escolha o item de culinária, alquimia, processamento ou entrega imperial que deseja analisar.',
      },
      {
        sortOrder: 1,
        anchorKey: 'recipes.methods',
        title: 'Alternar fórmula ou atividade',
        body: 'Compare métodos de produção disponíveis ou filtre a lista por profissão.',
      },
      {
        sortOrder: 2,
        anchorKey: 'recipes.tree',
        title: 'Explorar árvore de materiais',
        body: 'Expanda etapas para verificar ingredientes, quantidades, subprodutos e origens conhecidas.',
      },
    ],
  },
  {
    screenKey: 'recipe-workshop',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'recipe-workshop.batch-mastery',
        title: 'Definir lote e maestria',
        body: 'Ajuste a quantidade de receitas e a maestria da profissão. O rendimento estimado aparece no mesmo painel; valores sem cobertura continuam identificados como pendentes.',
      },
      {
        sortOrder: 1,
        anchorKey: 'recipe-workshop.financial',
        title: 'Ler o resultado financeiro',
        body: 'Compare faturamento líquido, custo, lucro do lote e lucro por hora. Sem preços ou tempo suficientes, a oficina mostra o que falta confirmar antes de concluir o resultado.',
      },
      {
        sortOrder: 2,
        anchorKey: 'recipe-workshop.strategy',
        title: 'Comparar estratégias',
        body: 'Escolha comprar subreceitas, fazer ou coletar, ou peça uma proposta ao otimizador. Confira a prévia e seus limites antes de aplicar qualquer combinação.',
      },
      {
        sortOrder: 3,
        anchorKey: 'recipe-workshop.materials-returns',
        title: 'Revisar materiais e retornos',
        body: 'No plano da receita, confira quantidades e origens dos materiais. Decida quais retornos vender ou guardar; só a venda marcada entra no faturamento.',
      },
    ],
  },
  {
    screenKey: 'scans',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'scans.capture',
        title: 'Enviar captura da janela',
        body: 'Escolha um recorte nítido do armazém, inventário ou informações do personagem para leitura neste navegador.',
      },
      {
        sortOrder: 1,
        anchorKey: 'scans.review',
        title: 'Revisar itens antes de salvar',
        body: 'Confira cada espaço reconhecido, corrija quantidades incertas e salve apenas o lote validado.',
      },
    ],
  },
  {
    screenKey: 'storage',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'storage.items',
        title: 'Conferir itens do armazém',
        body: 'Pesquise por item ou cidade, alterne entre grade e lista e ajuste quantidades salvas.',
      },
      {
        sortOrder: 1,
        anchorKey: 'storage.projects',
        title: 'Organizar origens e projetos',
        body: 'Acompanhe importações e metas de materiais usando o estoque disponível da sua região.',
      },
    ],
  },
  {
    screenKey: 'recommendations',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'recommendations.conditions',
        title: 'Definir personagem e atividades',
        body: 'Selecione o personagem ativo e marque as profissões que deseja priorizar no cálculo.',
      },
      {
        sortOrder: 1,
        anchorKey: 'recommendations.ranking',
        title: 'Comparar retornos completos',
        body: 'Veja o ranking por lucro por hora e abra os detalhes de materiais, etapas e premissas.',
      },
    ],
  },
] as const;
