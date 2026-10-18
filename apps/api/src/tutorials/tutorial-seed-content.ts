import type { TutorialGuideStepInput, TutorialLocale, TutorialScreenKey } from '@bdo/shared';

export interface TutorialSeedEntry {
  screenKey: TutorialScreenKey;
  locale: TutorialLocale;
  enabled: boolean;
  steps: readonly TutorialGuideStepInput[];
}

export const TUTORIAL_SEED_REVISION = '2026-10-18-active-mvp-v1';
export const TUTORIAL_SEED_UPDATED_AT = '2026-10-18T00:00:00.000Z';

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
  {
    screenKey: 'home',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'home.main-actions',
        title: 'Escolher uma atividade',
        body: 'Use estes atalhos para abrir Mercado, Receitas, Produção e Profissões. Comece pela atividade de Life Skill que deseja planejar.',
      },
      {
        sortOrder: 1,
        anchorKey: 'home.lifeskill-entry',
        title: 'Planejar avanço de Life Skills',
        body: 'Abra Profissões e rendimento para acompanhar sua maestria ou explore uma receita para calcular materiais e produção.',
      },
    ],
  },
  {
    screenKey: 'roadmap',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'roadmap.progress',
        title: 'Acompanhar o progresso',
        body: 'Consulte aqui o andamento dos recursos do Black Market e identifique o que já está disponível para uso.',
      },
      {
        sortOrder: 1,
        anchorKey: 'roadmap.feature-cards',
        title: 'Escolher a próxima ferramenta',
        body: 'Abra uma ferramenta de produção, receita ou mercado pelo menu para começar a planejar uma atividade de Life Skill.',
      },
    ],
  },
  {
    screenKey: 'market-quote',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'market-quote.search',
        title: 'Localizar o item',
        body: 'Pesquise pelo nome ou código do material que você quer conferir antes de montar uma receita ou plano de coleta.',
      },
      {
        sortOrder: 1,
        anchorKey: 'market-quote.quote-panel',
        title: 'Conferir a cotação',
        body: 'Leia região, horário e disponibilidade junto ao preço. Uma oferta listada é uma referência e não garante compra ou venda.',
      },
    ],
  },
  {
    screenKey: 'market-calculator',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'market-calculator.inputs',
        title: 'Informar os dados da venda',
        body: 'Confira item, quantidade, região e bônus aplicáveis. Os campos mostram os valores usados na estimativa desta operação.',
      },
      {
        sortOrder: 1,
        anchorKey: 'market-calculator.result',
        title: 'Ler a estimativa líquida',
        body: 'Compare valor bruto, taxas e prata estimada após a venda. O resultado depende das entradas e não confirma uma transação no mercado.',
      },
    ],
  },
  {
    screenKey: 'market-saved',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'market-saved.list',
        title: 'Rever itens salvos',
        body: 'Mantenha juntos os materiais e produtos que você acompanha para suas receitas e planos de produção.',
      },
      {
        sortOrder: 1,
        anchorKey: 'market-saved.actions',
        title: 'Atualizar uma referência',
        body: 'Abra um item para consultar os dados mais recentes. Confira a idade da cotação antes de usar o valor em um cálculo.',
      },
    ],
  },
  {
    screenKey: 'market-item',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'market-item.summary',
        title: 'Identificar o item',
        body: 'Confira nome, categoria e formas de obtenção para saber se este material serve à atividade que você está planejando.',
      },
      {
        sortOrder: 1,
        anchorKey: 'market-item.history',
        title: 'Usar o histórico como referência',
        body: 'Compare cotações e volume observados. Histórico ajuda a avaliar materiais de Life Skills, mas não promete disponibilidade futura.',
      },
    ],
  },
  {
    screenKey: 'crafting-workshop',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'crafting-workshop.recipe',
        title: 'Escolher o produto',
        body: 'Selecione a receita ou o item final que você quer produzir. Confira a profissão e o método antes de definir o lote.',
      },
      {
        sortOrder: 1,
        anchorKey: 'crafting-workshop.settings',
        title: 'Definir lote e origem',
        body: 'Informe quantidade e maestria e escolha quais materiais comprar, coletar ou retirar do seu estoque.',
      },
      {
        sortOrder: 2,
        anchorKey: 'crafting-workshop.result',
        title: 'Revisar o plano de produção',
        body: 'Confira ingredientes, retornos e estimativa financeira. Campos sem dados suficientes permanecem pendentes em vez de virarem zero.',
      },
    ],
  },
  {
    screenKey: 'crafting-manual',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'crafting-manual.recipe',
        title: 'Montar uma receita manual',
        body: 'Escolha o produto e consulte a fórmula registrada. Alternativas de materiais permanecem vinculadas às proporções do catálogo.',
      },
      {
        sortOrder: 1,
        anchorKey: 'crafting-manual.settings',
        title: 'Conferir quantidades e materiais',
        body: 'Ajuste o lote e indique o que já possui. A lista calculada separa itens próprios dos que ainda precisam ser obtidos.',
      },
    ],
  },
  {
    screenKey: 'crafting-library',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'crafting-library.catalogue',
        title: 'Explorar receitas disponíveis',
        body: 'A biblioteca reúne fórmulas cadastradas para você encontrar produtos de Culinária, Alquimia e outras atividades de produção.',
      },
      {
        sortOrder: 1,
        anchorKey: 'crafting-library.search',
        title: 'Filtrar e abrir uma receita',
        body: 'Pesquise pelo produto ou profissão e abra uma fórmula para revisar materiais, rendimento e opções de aquisição.',
      },
    ],
  },
  {
    screenKey: 'stock-inventory',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'stock-inventory.location',
        title: 'Selecionar o inventário',
        body: 'Escolha o personagem ou local correspondente antes de revisar materiais que podem entrar no seu plano de produção.',
      },
      {
        sortOrder: 1,
        anchorKey: 'stock-inventory.items',
        title: 'Conferir seus materiais',
        body: 'Pesquise e atualize quantidades para que as receitas usem seu estoque pessoal sem confundir itens próprios com compras.',
      },
    ],
  },
  {
    screenKey: 'family-character',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'family-character.character',
        title: 'Definir o personagem ativo',
        body: 'Selecione o personagem usado como base para maestria, equipamentos e recomendações de Life Skills.',
      },
      {
        sortOrder: 1,
        anchorKey: 'family-character.lifeskills',
        title: 'Informar sua maestria',
        body: 'Revise o nível e os bônus de cada profissão. Esses dados influenciam as estimativas mostradas em receitas e atividades.',
      },
    ],
  },
  {
    screenKey: 'family-family',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'family-family.characters',
        title: 'Organizar personagens',
        body: 'Mantenha sua família atualizada para escolher quem será usado nos cálculos e nas recomendações de profissão.',
      },
      {
        sortOrder: 1,
        anchorKey: 'family-family.actions',
        title: 'Editar com segurança',
        body: 'Use as ações de cada personagem para corrigir seus dados. Confira a confirmação antes de substituir ou remover informações.',
      },
    ],
  },
  {
    screenKey: 'family-equipment',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'family-equipment.slots',
        title: 'Revisar os espaços de equipamento',
        body: 'Selecione os espaços para registrar o equipamento do personagem e seus bônus relevantes para Life Skills.',
      },
      {
        sortOrder: 1,
        anchorKey: 'family-equipment.stats',
        title: 'Conferir os atributos',
        body: 'Revise os totais calculados antes de usá-los em planejamento. Um espaço vazio não significa um bônus confirmado.',
      },
    ],
  },
  {
    screenKey: 'lifeskills-sessions',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'lifeskills-sessions.sessions',
        title: 'Registrar uma sessão',
        body: 'Escolha a profissão e registre duração, atividade e produção observada para formar um histórico útil da sua rotina.',
      },
      {
        sortOrder: 1,
        anchorKey: 'lifeskills-sessions.results',
        title: 'Comparar seus resultados',
        body: 'Use sessões registradas para comparar rendimento observado e estimado. Resultados incompletos ficam identificados como estimativas.',
      },
    ],
  },
  {
    screenKey: 'lifeskills-mastery',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'lifeskills-mastery.profile',
        title: 'Selecionar a profissão',
        body: 'Escolha a atividade que deseja avaliar para manter maestria, nível e bônus separados por profissão.',
      },
      {
        sortOrder: 1,
        anchorKey: 'lifeskills-mastery.inputs',
        title: 'Entender os valores usados',
        body: 'Confira equipamento, consumíveis e outros bônus informados. A soma exibida é a base usada nas ferramentas de produção.',
      },
    ],
  },
  {
    screenKey: 'lifeskills-training',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'lifeskills-training.plans',
        title: 'Definir objetivo e tempo',
        body: 'Escolha a profissão, duração e meta de treino para comparar atividades com as mesmas premissas.',
      },
      {
        sortOrder: 1,
        anchorKey: 'lifeskills-training.results',
        title: 'Comparar opções de treino',
        body: 'Revise ganho estimado, custo e requisitos. A comparação não substitui os dados que ainda não foram cotados ou informados.',
      },
    ],
  },
  {
    screenKey: 'scans-review',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'scans-review.rows',
        title: 'Revisar cada espaço reconhecido',
        body: 'Confira itens válidos, pendentes e removidos sem ocultar linhas. Corrija nome ou quantidade antes de confirmar o lote.',
      },
      {
        sortOrder: 1,
        anchorKey: 'scans-review.save',
        title: 'Escolher destino e salvar',
        body: 'Selecione armazém, inventário ou equipamento e confira a quantidade final. Em caso de erro, a captura revisada permanece disponível.',
      },
    ],
  },
  {
    screenKey: 'scans-profile',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'scans-profile.profile-input',
        title: 'Importar uma tela do personagem',
        body: 'Escolha uma captura nítida da janela de informações do personagem para reconhecer nível, profissões e maestria.',
      },
      {
        sortOrder: 1,
        anchorKey: 'scans-profile.profile-preview',
        title: 'Conferir antes de aplicar',
        body: 'Compare cada campo reconhecido com o jogo e corrija valores incertos. Os dados só mudam depois da sua confirmação.',
      },
    ],
  },
  {
    screenKey: 'shopping',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'shopping.items',
        title: 'Reunir materiais necessários',
        body: 'A lista organiza ingredientes vindos de receitas e planos. Confira quantidades próprias, coletadas e ainda necessárias.',
      },
      {
        sortOrder: 1,
        anchorKey: 'shopping.actions',
        title: 'Atualizar sua lista',
        body: 'Marque o que já obteve e revise a origem antes de voltar à receita. A cotação do mercado pode mudar com o tempo.',
      },
    ],
  },
  {
    screenKey: 'plans',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'plans.collection',
        title: 'Acompanhar seus planos',
        body: 'Consulte as receitas e atividades que você salvou para continuar uma sessão de produção ou coleta.',
      },
      {
        sortOrder: 1,
        anchorKey: 'plans.actions',
        title: 'Retomar ou ajustar um plano',
        body: 'Abra o plano para revisar lote, materiais e cotações antes de continuar. Valores antigos podem precisar de atualização.',
      },
    ],
  },
  {
    screenKey: 'settings',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      {
        sortOrder: 0,
        anchorKey: 'settings.account',
        title: 'Gerenciar sua conta',
        body: 'Revise preferências e informações da conta. Configurações pessoais ficam separadas dos dados de receitas e mercado.',
      },
      {
        sortOrder: 1,
        anchorKey: 'settings.tutorials',
        title: 'Rever as introduções',
        body: 'Você pode reiniciar o progresso dos tutoriais. As apresentações voltarão a abrir quando visitar cada rota ou aba.',
      },
    ],
  },
] as const;
