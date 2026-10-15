import type { TutorialSeedEntry } from './tutorial-seed';

export const TUTORIAL_SEED_REVISION = 1;

// Bootstrap copy is stored in PostgreSQL by the API CLI; the web bundle has no editorial fallback.
export const TUTORIAL_SEED_CONTENT: readonly TutorialSeedEntry[] = [
  {
    screenKey: 'market',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'market.search',
        title: 'Encontre um item',
        body: 'Busque pelo nome ou código para localizar um produto no Mercado Central.',
      },
      {
        sortOrder: 1,
        anchorKey: 'market.filters',
        title: 'Refine os resultados',
        body: 'Use as categorias e os filtros de estoque para reduzir a lista.',
      },
      {
        sortOrder: 2,
        anchorKey: 'market.results',
        title: 'Compare as cotações',
        body: 'Confira preço, estoque e atividade antes de usar um valor na simulação.',
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
        title: 'Escolha um produto',
        body: 'Pesquise produtos e materiais de Culinária, Alquimia ou Processamento.',
      },
      {
        sortOrder: 1,
        anchorKey: 'recipes.methods',
        title: 'Compare as fórmulas',
        body: 'Quando houver alternativas, selecione a fórmula ou a quantidade por operação.',
      },
      {
        sortOrder: 2,
        anchorKey: 'recipes.tree',
        title: 'Acompanhe a cadeia',
        body: 'A árvore mostra as etapas e os materiais necessários para chegar ao produto.',
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
        title: 'Prepare a captura',
        body: 'Escolha se a imagem mostra armazém, inventário ou equipamentos e deixe os números visíveis.',
      },
      {
        sortOrder: 1,
        anchorKey: 'scans.review',
        title: 'Revise antes de salvar',
        body: 'Confira os itens e quantidades reconhecidos, corrija as dúvidas e confirme o destino.',
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
        title: 'Consulte seus materiais',
        body: 'Veja o que está cadastrado por armazém e ajuste os saldos quando necessário.',
      },
      {
        sortOrder: 1,
        anchorKey: 'storage.projects',
        title: 'Organize projetos',
        body: 'Defina metas de materiais para acompanhar o que falta em cada projeto.',
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
        title: 'Defina as condições',
        body: 'Escolha o personagem, ajuste o uso do estoque e informe o tempo por operação.',
      },
      {
        sortOrder: 1,
        anchorKey: 'recommendations.ranking',
        title: 'Compare as receitas',
        body: 'Carregue o catálogo e confira lucro, custo, tempo e dados de mercado disponíveis.',
      },
    ],
  },
];
