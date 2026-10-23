import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  type LifeEquipment,
  type LifeEquipmentItem,
  lifeEquipmentItemLimit,
  type LifeEquipmentKind,
  lifeEquipmentKinds,
  type LifeSkill,
  lifeSkills,
} from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';

import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { lifeSkillLabels } from '../../shared/game-labels';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { BdoSelect } from '../../ui/native-select/bdo-select';

const sharedKinds = ['accessory', 'alchemyStone', 'purityOrb'] as const;

@Component({
  selector: 'app-life-equipment-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, HlmButton, HlmCard, HlmInput, BdoSelect, CatalogItemPicker, ItemIcon],
  templateUrl: './life-equipment-editor.html',
  styleUrl: './life-equipment-editor.scss',
})
export class LifeEquipmentEditor {
  readonly value = input.required<LifeEquipment>();
  readonly changed = output<LifeEquipment>();
  readonly itemLimit = lifeEquipmentItemLimit;
  readonly sharedAtLimit = computed(() => this.value().sharedItems.length >= this.itemLimit);
  readonly skills = lifeSkills;
  readonly kinds = lifeEquipmentKinds;
  readonly sharedKinds = sharedKinds;
  readonly skillLabels = lifeSkillLabels as Record<LifeSkill, string>;
  readonly kindLabels: Record<LifeEquipmentKind, string> = {
    tool: 'Ferramenta',
    costume: 'Traje',
    accessory: 'Acessório',
    artifact: 'Artefato',
    lightstone: 'Pedra de luz',
    huntingMusket: 'Mosquete de caça',
    node: 'Nó',
    alchemyStone: 'Pedra alquímica',
    purityOrb: 'Orbe da Pureza',
    other: 'Outro',
  };
  readonly message = signal('');
  skill: LifeSkill = 'gathering';
  sharedItem: CatalogItem | null = null;
  skillItem: CatalogItem | null = null;
  sharedKind: (typeof sharedKinds)[number] = 'accessory';
  skillKind: LifeEquipmentKind = 'tool';
  sharedSlotLabel = '';
  sharedEnhancementText = '';
  skillSlotLabel = '';
  skillEnhancementText = '';

  addSharedItem(): void {
    if (this.sharedAtLimit()) {
      this.message.set(
        `Limite de ${this.itemLimit} itens por lista. Remova um item antes de adicionar outro.`,
      );
      return;
    }
    if (!this.sharedItem) {
      this.message.set('Escolha um item do catálogo antes de adicionar.');
      return;
    }
    if (this.isInAnySkill(this.sharedItem.id)) {
      this.message.set('Este item já está registrado em uma profissão.');
      return;
    }
    this.changed.emit({
      ...this.value(),
      sharedItems: [
        ...this.value().sharedItems,
        this.createItem(
          this.sharedItem,
          this.sharedKind,
          this.sharedSlotLabel,
          this.sharedEnhancementText,
        ),
      ],
    });
    this.sharedItem = null;
    this.sharedSlotLabel = '';
    this.sharedEnhancementText = '';
    this.message.set('Item comum adicionado à Família.');
  }

  addSkillItem(): void {
    if (this.isSkillAtLimit()) {
      this.message.set(
        `Limite de ${this.itemLimit} itens por lista. Remova um item antes de adicionar outro.`,
      );
      return;
    }
    if (!this.skillItem) {
      this.message.set('Escolha um item do catálogo antes de adicionar.');
      return;
    }
    if (this.value().sharedItems.some((row) => row.catalogItemId === this.skillItem?.id)) {
      this.message.set('Este item já está registrado como comum à Família.');
      return;
    }
    this.changed.emit({
      ...this.value(),
      bySkill: {
        ...this.value().bySkill,
        [this.skill]: [
          ...this.value().bySkill[this.skill],
          this.createItem(
            this.skillItem,
            this.skillKind,
            this.skillSlotLabel,
            this.skillEnhancementText,
          ),
        ],
      },
    });
    this.skillItem = null;
    this.skillSlotLabel = '';
    this.skillEnhancementText = '';
    this.message.set(`Item adicionado a ${this.skillLabels[this.skill]}.`);
  }

  updateSharedItem(id: string, changes: Partial<LifeEquipmentItem>): void {
    this.emit({
      ...this.value(),
      sharedItems: this.value().sharedItems.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    });
  }

  updateSkillItem(skill: LifeSkill, id: string, changes: Partial<LifeEquipmentItem>): void {
    this.emit({
      ...this.value(),
      bySkill: {
        ...this.value().bySkill,
        [skill]: this.value().bySkill[skill].map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      },
    });
  }

  removeSharedItem(id: string): void {
    this.emit({
      ...this.value(),
      sharedItems: this.value().sharedItems.filter((item) => item.id !== id),
    });
    this.message.set('Item removido da Família.');
  }

  removeSkillItem(skill: LifeSkill, id: string): void {
    this.emit({
      ...this.value(),
      bySkill: {
        ...this.value().bySkill,
        [skill]: this.value().bySkill[skill].filter((item) => item.id !== id),
      },
    });
    this.message.set(`Item removido de ${this.skillLabels[skill]}.`);
  }

  private createItem(
    catalogItem: CatalogItem,
    kind: LifeEquipmentKind,
    slotLabel: string,
    enhancementText: string,
  ): LifeEquipmentItem {
    const label = slotLabel.trim();
    return {
      id: crypto.randomUUID(),
      catalogItemId: catalogItem.id,
      name: catalogItem.name,
      kind,
      ...(label ? { slotLabel: label } : {}),
      enhancementText: enhancementText.trim() || null,
    };
  }

  private isInAnySkill(catalogItemId: number): boolean {
    return this.skills.some((skill) =>
      this.value().bySkill[skill].some((item) => item.catalogItemId === catalogItemId),
    );
  }

  isSkillAtLimit(): boolean {
    return this.value().bySkill[this.skill].length >= this.itemLimit;
  }

  private emit(value: LifeEquipment): void {
    this.message.set('');
    this.changed.emit(value);
  }
}
