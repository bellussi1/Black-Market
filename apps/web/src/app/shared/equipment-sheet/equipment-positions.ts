import type { gearSlots } from '@bdo/calculators';

export type EquipmentPosition = (typeof gearSlots)[number] | 'artifact1' | 'artifact2';
export const equipmentLabels: Record<EquipmentPosition, string> = {
  mainhand: 'Arma principal',
  offhand: 'Arma secundária',
  awakening: 'Arma de despertar',
  helmet: 'Elmo',
  armor: 'Armadura',
  gloves: 'Luvas',
  shoes: 'Sapatos',
  necklace: 'Colar',
  belt: 'Cinto',
  ring1: 'Anel 1',
  ring2: 'Anel 2',
  earring1: 'Brinco 1',
  earring2: 'Brinco 2',
  tool: 'Ferramenta de profissão',
  clothes: 'Traje de profissão',
  alchemyStone: 'Pedra alquímica',
  tome: 'Tomo do aventureiro',
  artifact1: 'Artefato 1',
  artifact2: 'Artefato 2',
};
export const equipmentOrbit: {
  slot: EquipmentPosition;
  number: number;
  x: number;
  y: number;
  icon: string;
}[] = [
  { slot: 'armor', number: 1, x: 65, y: 10, icon: 'lucideShirt' },
  { slot: 'ring1', number: 2, x: 81, y: 21, icon: 'lucideCircle' },
  { slot: 'ring2', number: 3, x: 90, y: 34, icon: 'lucideCircle' },
  { slot: 'artifact1', number: 4, x: 91, y: 47, icon: 'lucideGem' },
  { slot: 'gloves', number: 5, x: 87, y: 61, icon: 'lucideHand' },
  { slot: 'necklace', number: 6, x: 77, y: 75, icon: 'lucideGem' },
  { slot: 'offhand', number: 7, x: 70, y: 90, icon: 'lucideShield' },
  { slot: 'awakening', number: 8, x: 50, y: 90, icon: 'lucideSword' },
  { slot: 'mainhand', number: 9, x: 30, y: 90, icon: 'lucideSword' },
  { slot: 'belt', number: 10, x: 22, y: 75, icon: 'lucideCircle' },
  { slot: 'shoes', number: 11, x: 12, y: 61, icon: 'lucideFootprints' },
  { slot: 'artifact2', number: 12, x: 9, y: 47, icon: 'lucideGem' },
  { slot: 'earring1', number: 13, x: 10, y: 34, icon: 'lucideGem' },
  { slot: 'earring2', number: 14, x: 19, y: 21, icon: 'lucideGem' },
  { slot: 'helmet', number: 15, x: 34, y: 10, icon: 'lucideCrown' },
  { slot: 'alchemyStone', number: 16, x: 49, y: 43, icon: 'lucideDroplet' },
  { slot: 'tome', number: 17, x: 9, y: 92, icon: 'lucideBookOpen' },
];
