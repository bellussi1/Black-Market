export interface PendingLifeEquipmentReviewFields {
  item: null;
  itemUncertain: true;
  slot: '';
  lifeEquipmentKind: null;
  lifeEquipmentScope: null;
  lifeSlotLabel: '';
  lifeSlotConfirmed: false;
  lifeEnhancementText: '';
  lifeEnhancementConfirmed: false;
  include: false;
  reviewed: false;
}

export function pendingLifeEquipmentReviewFields(): PendingLifeEquipmentReviewFields {
  return {
    item: null,
    itemUncertain: true,
    slot: '',
    lifeEquipmentKind: null,
    lifeEquipmentScope: null,
    lifeSlotLabel: '',
    lifeSlotConfirmed: false,
    lifeEnhancementText: '',
    lifeEnhancementConfirmed: false,
    include: false,
    reviewed: false,
  };
}
