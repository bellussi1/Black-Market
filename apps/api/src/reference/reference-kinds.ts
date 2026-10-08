export const referenceKinds = {
  npcs: ['npcs.json', null, 'NPCs'],
  quests: ['quests.json', null, 'Missões'],
  knowledge: ['knowledge.json', 'entries', 'Conhecimento'],
  themes: ['knowledge.json', 'themes', 'Temas de conhecimento'],
  nodes: ['world.json', 'nodes', 'Bases e produção'],
  regions: ['world.json', 'regions', 'Locais'],
  territories: ['world.json', 'territories', 'Territórios'],
  fishing: ['fishingspots.json', null, 'Locais de pesca'],
  zones: ['zones.json', null, 'Áreas de combate'],
  enhancements: ['item_enhancements.json', null, 'Aprimoramento'],
  caphras: ['caphras.json', null, 'Caphras'],
  improvements: ['item_improvements.json', 'rows', 'Reformas'],
  sets: ['item_sets.json', null, 'Conjuntos de itens'],
  skills: ['class_skills.json', 'groups', 'Habilidades'],
  skilltrees: ['class_skills.json', 'trees', 'Árvores de habilidades'],
  characters: ['characters.json', null, 'Personagens do jogo'],
  classes: ['character_progression.json', 'classes', 'Classes'],
  journals: ['adventure_journals.json', 'journals', 'Livros de aventura'],
  journalbonuses: ['adventure_journals.json', 'bonuses', 'Bônus de livros'],
  lightstones: ['lightstone_combinations.json', 'combinations', 'Combinações de artefatos'],
  cookingmastery: ['mastery.json', 'cooking', 'Maestria de culinária'],
  alchemymastery: ['mastery.json', 'alchemy', 'Maestria de alquimia'],
  processingmastery: ['mastery.json', 'processing', 'Maestria de processamento'],
  lifeskilllevels: ['life_skill_progression.json', null, 'Níveis de profissões'],
  manufacture: ['manufacture.json', null, 'Materiais de processamento'],
  crystals: ['crystal_rules.json', 'groups', 'Regras de cristais'],
} as const;
export type ReferenceKind = keyof typeof referenceKinds;
export function isReferenceKind(value: string): value is ReferenceKind {
  return Object.hasOwn(referenceKinds, value);
}
export function normalizeName(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}
