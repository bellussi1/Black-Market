const RECIPE_TYPES: Readonly<Record<string, string>> = {
  ALCHEMY: $localize`Alquimia`,
  COOK: $localize`Culinária`,
  SIMPLE_ALCHEMY: $localize`Alquimia simples`,
  SIMPLE_COOK: $localize`Culinária simples`,
  DRY: $localize`Secagem`,
  THINNING: $localize`Filtragem`,
  SHAKE: $localize`Mistura`,
  FIREWOOD: $localize`Corte de lenha`,
  GRIND: $localize`Moagem`,
  HEAT: $localize`Aquecimento`,
  HOUSE: $localize`Oficina`,
  GUILD: $localize`Produção de guilda`,
  ROYALGIFT_ALCHEMY: $localize`Alquimia imperial`,
  ROYALGIFT_COOK: $localize`Culinária imperial`,
};
export const lifeSkillLabels: Readonly<Record<string, string>> = {
  cooking: $localize`Culinária`,
  alchemy: $localize`Alquimia`,
  processing: $localize`Processamento`,
  gathering: $localize`Coleta`,
  fishing: $localize`Pesca`,
  hunting: $localize`Caça`,
  training: $localize`Treino`,
  farming: $localize`Cultivo`,
  sailing: $localize`Navegação`,
  barter: $localize`Permuta`,
  trading: $localize`Comércio`,
};
export function recipeTypeLabel(type: string): string {
  return RECIPE_TYPES[type] ?? $localize`Produção`;
}
