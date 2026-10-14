import { isMvpPathEnabled } from './mvp-scope';
export const PUBLIC_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '/termos': 'Condições de uso das ferramentas gratuitas do Black Market para Black Desert Online.',
  '/privacidade':
    'Como o Black Market trata seus dados, armazenamento local, conta e estatísticas opcionais.',
  '/cookies':
    'Cookies, armazenamento funcional e escolhas sobre estatísticas opcionais do Black Market.',
  '/contato':
    'Entre em contato com o responsável pelo Black Market para suporte e solicitações de privacidade.',
  '/': 'Black Market: itens, receitas e ferramentas de Black Desert Online em português brasileiro, com foco no mercado SA.',
  '/database/items':
    'Consulte itens de Black Desert Online em português, com imagens, categorias, descrições e relações de produção.',
  '/recipes':
    'Receitas de Black Desert Online em português, com materiais, resultados e imagens dos itens.',
  '/reference':
    'NPCs, missões, conhecimento, habilidades, locais e referências de Black Desert Online em português.',
  '/world':
    'Planeje seu império de bases e trabalhadores em Black Desert Online. Compare produção diária, custos e contribuição compartilhada.',
  '/market':
    'Consulte preços e disponibilidade no mercado SA de Black Desert Online. Confira a origem e a data de atualização dos dados.',
  '/roadmap':
    'Conheça o fluxo do Black Market para comparar mercado, Crafting, armazém e atividades de Life Skill, sem prazos de entrega.',
  '/market/items':
    'Consulte informações, imagens e relações de produção de itens de Black Desert Online no Mercado.',
  '/crafting':
    'Explore receitas de Black Desert Online e compare materiais, custos de produção e retorno estimado no mercado SA.',
  '/enhancement':
    'Planeje aprimoramentos de Black Desert Online com estimativas de probabilidade, materiais e custos.',
  '/lifeskills':
    'Planeje profissões de Black Desert Online considerando maestria, tempo, rendimento e custos informados.',
  '/rng':
    'Compare o retorno esperado de caixas de Black Desert Online com probabilidades e preços informados.',
  '/buffs':
    'Organize buffs de Black Desert Online e consulte seus efeitos para planejar suas atividades.',
};

export const PRIVATE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '/settings': 'Gerencie suas preferências e o backup dos seus dados no Black Market.',
  '/inventory': 'Organize os itens dos seus personagens com revisão das capturas.',
  '/scans': 'Importe até oito capturas e revise seus itens e quantidades.',
  '/storage': 'Gerencie seu armazém pessoal no Black Market.',
  '/family': 'Gerencie os personagens, equipamentos e bônus da sua família no Black Market.',
  '/gear': 'Planeje seus equipamentos pessoais no Black Market.',
};

export function isPublicSeoPath(path: string): boolean {
  return (
    isMvpPathEnabled(path) &&
    (Object.hasOwn(PUBLIC_DESCRIPTIONS, path) ||
      /^\/database\/items\/[1-9]\d*$/.test(path) ||
      /^\/market\/items\/[1-9]\d*$/.test(path) ||
      /^\/recipes\/[^/]+$/.test(path) ||
      /^\/recipes\/items\/[1-9]\d*$/.test(path) ||
      /^\/reference\/[a-z]+(?:\/[^/]+)?$/.test(path))
  );
}

export function publicDescription(path: string): string | undefined {
  return (
    PUBLIC_DESCRIPTIONS[path] ??
    (path.startsWith('/reference/')
      ? PUBLIC_DESCRIPTIONS['/reference']
      : path.startsWith('/recipes/')
        ? PUBLIC_DESCRIPTIONS['/recipes']
        : path.startsWith('/market/items/')
          ? PUBLIC_DESCRIPTIONS['/market/items']
          : path.startsWith('/database/items/')
            ? PUBLIC_DESCRIPTIONS['/database/items']
            : undefined)
  );
}
