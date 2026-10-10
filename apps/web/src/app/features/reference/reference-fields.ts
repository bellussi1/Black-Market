const labels: Readonly<Record<string, string>> = {
  name: 'Nome',
  description: 'Descrição',
  title: 'Título',
  acquisition: 'Como obter',
  level: 'Nível',
  minLevel: 'Nível mínimo',
  maxLevel: 'Nível máximo',
  contribution: 'Contribuição',
  manager: 'Gerente',
  position: 'Posição no mundo',
  regionName: 'Local',
  capitalName: 'Capital',
  nation: 'Nação',
  territory: 'Território',
  affiliatedTown: 'Cidade vinculada',
  ap: 'PA',
  dp: 'PD',
  accuracy: 'Precisão',
  evasion: 'Evasão',
  hp: 'Vida',
  mp: 'Recurso',
  enhanceChance: 'Chance inicial',
  stones: 'Pedras necessárias',
  totalStones: 'Total de pedras',
  mastery: 'Maestria',
  batch: 'Quantidade em massa',
  procRate: 'Taxa de processamento',
  interest: 'Interesse',
  minFavor: 'Favor mínimo',
  maxFavor: 'Favor máximo',
  minDamage: 'Dano mínimo',
  maxDamage: 'Dano máximo',
  durability: 'Durabilidade',
  cost: 'Custo',
  quantity: 'Quantidade',
  success: 'Chance informada',
  requiredLevel: 'Nível necessário',
  item: 'Item',
  count: 'Quantidade',
  parent: 'Categoria superior',
  kind: 'Tipo',
  material: 'Material',
  time: 'Tempo',
  enchantLevel: 'Nível do equipamento',
  maxHp: 'Vida máxima',
  damageReduction: 'Redução de dano',
  addedEvasion: 'Evasão adicional',
  addedDamageReduction: 'Redução de dano adicional',
  statId: 'Atributo',
  value: 'Valor',
  unit: 'Unidade',
  pieces: 'Peças necessárias',
};
const containers: Readonly<Record<string, string>> = {
  levels: 'Níveis',
  steps: 'Etapas',
  stats: 'Atributos',
  inputs: 'Materiais',
  outputs: 'Resultados',
  spawns: 'Onde encontrar',
  links: 'Conexões',
  children: 'Sub-bases',
  knowledge: 'Conhecimento',
  effects: 'Efeitos',
  bonuses: 'Bônus',
  requirements: 'Requisitos',
  required: 'Itens necessários',
  melee: 'Corpo a corpo',
  ranged: 'À distância',
  magic: 'Magia',
  rewards: 'Recompensas',
  ranks: 'Graduações',
  cells: 'Habilidades',
  classes: 'Classes',
  combatStats: 'Atributos de combate',
  enhancementAids: 'Auxílios de aprimoramento',
};
const visibleContainers = new Set(Object.keys(containers));
const statLabels: Readonly<Record<string, string>> = {
  combatExp: 'EXP de combate',
  skillExp: 'EXP de habilidade',
  monsterAp: 'PA contra monstros',
  maxHp: 'Vida máxima',
  maxResource: 'Recurso máximo',
  maxStamina: 'Estamina máxima',
  attackSpeedLevel: 'Velocidade de ataque',
  castingSpeedLevel: 'Velocidade de conjuração',
  criticalHitLevel: 'Acerto crítico',
  gatheringSpeedLevel: 'Velocidade de coleta',
  fishingSpeedLevel: 'Velocidade de pesca',
};
export interface ReferenceField {
  label: string;
  value: string;
  link?: string[];
}
function linkFor(urn: string): string[] | undefined {
  const match = /^urn::(.+):(\d+)$/.exec(urn);
  if (!match) return;
  const kinds: Readonly<Record<string, string>> = {
    npc: 'npcs',
    'knowledge:entry': 'knowledge',
    'knowledge:theme': 'themes',
    'world:node': 'nodes',
    'world:region': 'regions',
    'world:territory': 'territories',
    caphras: 'caphras',
    enhancement: 'enhancements',
    'item-set': 'sets',
  };
  return match[1] === 'item'
    ? ['/market/items', match[2]]
    : kinds[match[1]]
      ? ['/reference', kinds[match[1]], urn]
      : undefined;
}
export function referenceFields(data: Record<string, unknown>): ReferenceField[] {
  const fields: ReferenceField[] = [];
  const visit = (value: unknown, path: string, depth: number) => {
    if (fields.length >= 250 || depth > 6 || value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const link = typeof value === 'string' ? linkFor(value) : undefined;
      fields.push({
        label: path,
        value: link
          ? 'Ver registro #' + String(value).split(':').at(-1)
          : path.endsWith('Chance inicial') && typeof value === 'number'
            ? (value * 100).toLocaleString('pt-BR') + '%'
            : typeof value === 'string' && value.startsWith('urn::')
              ? 'Referência ainda não disponível'
              : typeof value === 'string'
                ? path.endsWith('Atributo')
                  ? (statLabels[value] ?? 'Efeito adicional')
                  : value.replace(/<[^>]*>/g, '').slice(0, 1500)
                : typeof value === 'boolean'
                  ? value
                    ? 'Sim'
                    : 'Não'
                  : String(value),
        link,
      });
      return;
    }
    if (Array.isArray(value)) {
      value
        .slice(0, 30)
        .forEach((part, index) => visit(part, path + ' · ' + (index + 1), depth + 1));
      return;
    }
    if (typeof value === 'object')
      for (const [key, part] of Object.entries(value)) {
        const label = labels[key] ?? containers[key] ?? (key === 'urns' ? 'Relações' : undefined);
        if (label) visit(part, path ? path + ' / ' + label : label, depth + 1);
      }
  };
  for (const [key, value] of Object.entries(data))
    if (labels[key] || visibleContainers.has(key)) visit(value, labels[key] ?? containers[key], 0);
  return fields;
}
