import type { CatalogItem } from '@bdo/shared';

export interface ItemOptionGroup {
  label: string;
  items: CatalogItem[];
}

// Numbering follows the official SA Advanced Alchemy guide (wikiNo=71).
// Membership here is visual: the extracted icon path, never hash similarity or translated names.
// These labels do not authorize recipe substitutions or replace an inventory item's identity.
const visualFamilies: Readonly<Record<string, string>> = {
  '00006201.dds': 'Sangue tipo 1 · cervo, ovelha e similares',
  '00006210.dds': 'Sangue tipo 2 · raposa, doninha e similares',
  '00006207.dds': 'Sangue tipo 3 · urso, troll e similares',
  '00006226.dds': 'Sangue tipo 4 · lobo, flamingo e similares',
  '00006217.dds': 'Sangue tipo 5 · lagarto, minhoca e similares',
  '00007901.dds': 'Carne · ícone compartilhado',
  '00007907.dds': 'Carne de répteis · ícone compartilhado',
  '00007916.dds': 'Carne de aves · ícone compartilhado',
  '00009731.dds': 'Carne de baleia e crocodilo · ícone compartilhado',
};

export function groupItemOptions(items: readonly CatalogItem[]): ItemOptionGroup[] {
  const groups = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const path = item.icon?.replaceAll('\\', '/').toLowerCase() ?? '';
    const file = path.split('/').at(-1) ?? '';
    const label = path.includes('/07_productmaterial/')
      ? (visualFamilies[file] ?? 'Outras sugestões visuais')
      : 'Outras sugestões visuais';
    const group = groups.get(label) ?? [];
    group.push(item);
    groups.set(label, group);
  }
  return [...groups].map(([label, group]) => ({ label, items: group }));
}
