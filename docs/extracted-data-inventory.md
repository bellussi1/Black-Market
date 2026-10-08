# Inventário dos dados extraídos

Relatório gerado pela leitura dos arquivos reais listados em `.build-outputs.json`. Contagens descrevem a extração, não comprovam cobertura integral do jogo. Campos são preservados como encontrados; tabelas, probabilidades e relações ainda precisam de validação antes de virar funcionalidades.

Itens, receitas e categorias estão integrados. As demais coleções permanecem como arquivos locais; não são automaticamente consumidas pelas telas. Ícones de itens têm publicação separada. Os arquivos não contêm o armazém, a prata ou os equipamentos pessoais de uma conta.

| Arquivo                      |   Tamanho | Coleções / registros                                                | Situação            |
| ---------------------------- | --------: | ------------------------------------------------------------------- | ------------------- |
| adventure_journals.json      |   1.31 MB | journals: 13; bonuses: 98; totalBonuses: 10                         | Integração pendente |
| caphras.json                 |   0.28 MB | raiz: 10                                                            | Integração pendente |
| character_progression.json   |   1.48 MB | classes: 32; levelRules: 6157; breath: 51; strength: 51; health: 51 | Integração pendente |
| characters.json              |   3.83 MB | raiz: 4186                                                          | Integração pendente |
| class_skills.json            |   3.28 MB | groups: 2820; trees: 62; treeMetadata: 2                            | Integração pendente |
| crystal_rules.json           |   0.00 MB | groups: 42; specialSlots: 7                                         | Integração pendente |
| fishingspots.json            |   0.06 MB | raiz: 402                                                           | Integração pendente |
| item_enhancements.json       | 269.50 MB | raiz: 30058                                                         | Integração pendente |
| item_improvements.json       |   0.33 MB | rows: 3816                                                          | Integração pendente |
| item_sets.json               |   0.04 MB | raiz: 100                                                           | Integração pendente |
| items.json                   |  79.01 MB | raiz: 74216                                                         | Integrado           |
| knowledge.json               |   8.26 MB | entries: 12604; themes: 939                                         | Integração pendente |
| life_skill_progression.json  |   0.11 MB | raiz: 15                                                            | Integração pendente |
| lightstone_combinations.json |   0.11 MB | combinations: 165; aliases: 105                                     | Integração pendente |
| manufacture.json             |   0.93 MB | raiz: 7066                                                          | Integração pendente |
| marketcategories.json        |   0.01 MB | raiz: 18                                                            | Integrado           |
| mastery.json                 |   0.01 MB | cooking: 61; alchemy: 61; processing: 76                            | Integração pendente |
| npcs.json                    |   0.67 MB | raiz: 2491                                                          | Integração pendente |
| quests.json                  |  11.15 MB | raiz: 19248                                                         | Integração pendente |
| recipes.json                 |   1.01 MB | raiz: 5063                                                          | Integrado           |
| world.json                   |  10.37 MB | territories: 14; regions: 1594; nodes: 1080                         | Integração pendente |
| worldmap.json                |   0.00 MB | transform: 2                                                        | Integração pendente |
| zones.json                   |   0.48 MB | raiz: 112                                                           | Integração pendente |

## Campos por conjunto

### adventure_journals.json

SHA-256: `af938d62aed5af94799e3188e2c03738b16ed68662e7f1ca0ec1db617f49dc60`

Campos na raiz: `journals`, `bonuses`, `totalBonuses`.

**journals** — 13 registros.

`books`, `description`, `key`, `name`.

**bonuses** — 98 registros.

`bonus`, `quest`, `rewardSlot`.

**totalBonuses** — 10 registros.

`type`, `unit`, `value`.

### caphras.json

SHA-256: `0781f1b5c36944d70f9ef2fbd72f66574673309744c504578981e14393beac9d`

**raiz** — 10 registros.

`key`, `levels`, `urn`.

### character_progression.json

SHA-256: `0dace1219ea71077a386e3c113a5591bfc964533ff4624c1f709485698b2755f`

Campos na raiz: `classes`, `levelRules`, `breath`, `strength`, `health`.

**classes** — 32 registros.

`characterKey`, `classType`, `consumeAnimations`, `gender`, `name`, `previewWeapons`, `selectionMovie`, `sourceDescription`, `sourceName`, `starterWeapons`, `unknown10`, `unknown14`, `unknown4`, `unknown6`, `unknown8`, `unknownAvailability6`, `unknownConfiguration0`, `unknownConfiguration94`, `unknownConfiguration95`, `unknownPresentation0`, `unknownPresentation24`, `unknownPresentation37`, `unknownPresentation39`, `unknownPresentation67`, `unknownPresentationExtra`, `weaponAssetSets`.

**levelRules** — 6157 registros.

`apBonus`, `classType`, `dpBonus`, `level`, `unknownStat100`, `unknownStat104`, `unknownStat108`, `unknownStat112`, `unknownStat32`, `unknownStat4`, `unknownStat60`, `unknownStat64`, `unknownStat68`, `unknownStat8`, `unknownStat80`.

**breath** — 51 registros.

`level`, `maxStamina`, `requiredExperience`.

**strength** — 51 registros.

`level`, `maxWeightLT`, `requiredExperience`.

**health** — 51 registros.

`level`, `maxHP`, `maxMP`, `requiredExperience`.

### characters.json

SHA-256: `21031d38da9b76eb2ab67209538e2f1752f37fff39c952bc16c422f37df05d4b`

**raiz** — 4186 registros.

`entities`, `kind`, `name`, `npcs`, `urn`.

### class_skills.json

SHA-256: `b781630af93dba74a15775b13ed8e49445bf1e2d7833c69ffaf31a45fd34efc9`

Campos na raiz: `groups`, `trees`, `treeMetadata`.

**groups** — 2820 registros.

`classes`, `key`, `name`, `ranks`.

**trees** — 62 registros.

`cells`, `classType`, `height`, `kind`, `width`.

**treeMetadata** — 2 registros.

`kind`, `subGroupStringKeys`, `unknownFooter`.

### crystal_rules.json

SHA-256: `1853531e224c6476966ceeaa2ce5e81f9b1eaa9ff73dd23693d3c160aa62466d`

Campos na raiz: `groups`, `specialSlots`.

**groups** — 42 registros.

`key`, `max`, `name`, `sourceName`.

**specialSlots** — 7 registros.

`allowedGroups`, `slot`.

### fishingspots.json

SHA-256: `e5675acaa5daa7ffbd41b717546d5a9fffcf3c83ba394871929cda628e7a7a93`

**raiz** — 402 registros.

`areaType`, `id`, `pos`, `pos2`, `range`, `regionGroup`, `regionKey`, `regionName`.

### item_enhancements.json

SHA-256: `e8f5df7da1f8155b683f626c43f06d8fcd9732c1a33cbb2a9e7b6c956c8fbbcb`

**raiz** — 30058 registros.

`baseId`, `caphrasCategory`, `levels`, `maxLevel`, `maxLevelIdx`, `minLevel`, `minLevelIdx`, `urn`.

### item_improvements.json

SHA-256: `b016f4db2a57a10ac61fd3c45b942f895b82146677875ab601bdd1d2418abcdd`

Campos na raiz: `rows`.

**rows** — 3816 registros.

`bases`, `flag`, `key`, `result`.

### item_sets.json

SHA-256: `8b8fb51910018dd3b69fb71bb43708f7eda8ff3af2aacf647a871b6e6afc9182`

**raiz** — 100 registros.

`bonuses`, `items`, `membershipSources`, `skillNo`, `urn`.

### items.json

SHA-256: `ba4b97601b538ea50243796e6d7ad1d4bd841a958c5d5da6957758acc933c722`

**raiz** — 74216 registros.

`applyDirectly`, `bindType`, `buyPrice`, `cash`, `category`, `classes`, `cronEnchant`, `crystalGroup`, `description`, `dyeParts`, `dyeable`, `effects`, `enhancement`, `enhancementGroupKey`, `enhancementType`, `equipInfo`, `eventParam1`, `eventParam2`, `eventType`, `exchangeInfo`, `expirationMinutes`, `familyInventory`, `forTrade`, `ghost`, `grade`, `icon`, `id`, `itemMaterial`, `itemSets`, `itemType`, `lifeExpType`, `marketCategory`, `marketRegisterLimit`, `marketSubCategory`, `marketable`, `maxDurability`, `maxEnhance`, `maxStack`, `name`, `nodeFreeTrade`, `personalTrade`, `reformsFrom`, `reformsInto`, `rentalOffers`, `repairPrice`, `requiredLevel`, `sellPrice`, `shownInNote`, `stackable`, `tradeType`, `unknown10`, `unknown100`, `unknown106`, `unknown107`, `unknown108`, `unknown11`, `unknown12`, `unknown13`, `unknown135`, `unknown144`, `unknown146`, `unknown150`, `unknown152`, `unknown154`, `unknown160`, `unknown161`, `unknown162`, `unknown166`, `unknown167`, `unknown169`, `unknown170`, `unknown173`, `unknown176`, `unknown180`, `unknown181`, `unknown188`, `unknown189`, `unknown190`, `unknown199`, `unknown203`, `unknown8`, `unknown85`, `unknown9`, `unknown93`, `unknown98`, `unknown99`, `unknownAfterMarketLimit0`, `unknownAfterMarketLimit101`, `unknownAfterMarketLimit79`, `unknownAfterMarketLimit80`, `unknownAfterMarketLimit81`, `unknownAfterMarketLimit85`, `unknownAfterMarketLimit89`, `unknownAfterMarketLimit93`, `unknownAfterMarketLimit97`, `unknownIcon1`, `unknownIcon10`, `unknownIcon14`, `unknownIcon16`, `unknownIcon2`, `unknownIcon3`, `unknownIcon8`, `unknownIcon9`, `unlocksDawnCrystalSlot`, `urn`, `useText`, `userVested`, `variantOf`, `vendors`, `vestedType`, `weight`.

### knowledge.json

SHA-256: `7deb51cebbfae1d567a3ae657156c2bb27ec3f019cf1f8ee6cebedadf6dde19e`

Campos na raiz: `entries`, `themes`.

**entries** — 12604 registros.

`acquisition`, `character`, `description`, `image`, `interest`, `item`, `key`, `maxFavor`, `minFavor`, `name`, `theme`, `unknown20`, `urn`.

**themes** — 939 registros.

`item`, `key`, `name`, `parent`, `urn`.

### life_skill_progression.json

SHA-256: `6d5351a1707511bae76135caec3ac760bb1ab18063109fe8220da735f0ffa451`

**raiz** — 15 registros.

`levels`, `maxLevel`, `type`.

### lightstone_combinations.json

SHA-256: `2faf9fba2cff6551e21c550faa1b1391aeb68da90851e6d5103d2ffbd5ab004b`

Campos na raiz: `combinations`, `aliases`.

**combinations** — 165 registros.

`description`, `effects`, `key`, `name`, `required`, `skillKey`, `urn`.

**aliases** — 105 registros.

`countsAs`, `countsAsId`, `item`, `itemId`.

### manufacture.json

SHA-256: `0b8d9937b2b7911b944eabff0bf2b88fb3ce66fd80e3cc96ffcb0c90799e8027`

**raiz** — 7066 registros.

`group`, `inputs`, `success`, `type`.

### marketcategories.json

SHA-256: `b92f5f03abdab392c98347af18322def1b71ce87eb744348d916fdefb7f113b8`

**raiz** — 18 registros.

`id`, `name`, `subCategories`.

### mastery.json

SHA-256: `9322141d02505afa4a7940e5844b5a576a5c5e4eb227f1479ffb616ec98150cd`

Campos na raiz: `cooking`, `alchemy`, `processing`.

**cooking** — 61 registros.

`mastery`, `rates`.

**alchemy** — 61 registros.

`mastery`, `rates`.

**processing** — 76 registros.

`batch`, `mastery`, `procRate`.

### npcs.json

SHA-256: `9d0342e71d69433560141e16f14991080e5fdc42634518622705ff1e18ede458`

**raiz** — 2491 registros.

`id`, `itemService`, `name`, `spawnTypes`, `spawns`, `title`, `urn`.

### quests.json

SHA-256: `7660b8e53cba783b7769ff6cb994d4b79beed9965f8c87b4a6cc3826e950b9c8`

**raiz** — 19248 registros.

`conditions`, `desc`, `giver`, `id`, `name`, `objective`.

### recipes.json

SHA-256: `bc67072b4f31b9065b255d6bf79ea876ec480f47ae7220d99c6490db642225bd`

**raiz** — 5063 registros.

`byproductOf`, `inputs`, `output`, `station`, `type`, `urn`.

### world.json

SHA-256: `5609b51dae1fe1f1ec1687063627f9989be18db2252514c4a396781eb9c121ce`

Campos na raiz: `territories`, `regions`, `nodes`.

**territories** — 14 registros.

`armorItemId`, `autonomous`, `capitalKey`, `capitalName`, `crownItemId`, `extraKey`, `iconLarge`, `iconSmall`, `index`, `name`, `nation`, `nationKey`, `positions`, `primary`, `urn`.

**regions** — 1594 registros.

`affiliatedTown`, `bounds`, `desert`, `exploration`, `extraPositions`, `guildWharfManager`, `key`, `locator`, `mapColor`, `name`, `ocean`, `position`, `prison`, `regionGroupKey`, `sea`, `spawns`, `territory`, `type`, `unknown107`, `unknown11`, `unknown115`, `unknown12`, `unknown13`, `unknown147`, `unknown149`, `unknown153`, `unknown173`, `unknown177`, `unknown18`, `unknown181`, `unknown185`, `unknown19`, `unknown20`, `unknown209`, `unknown21`, `unknown22`, `unknown23`, `unknown24`, `unknown25`, `unknown26`, `unknown28`, `unknown29`, `unknown31`, `unknown32`, `unknown37`, `unknown54`, `unknown55`, `unknown56`, `unknown57`, `unknown58`, `unknown60`, `unknown66`, `unknown68`, `unknown82`, `unknown84`, `unknownTail1`, `unknownTail109`, `unknownTail110`, `unknownTail122`, `unknownTail134`, `unknownTail135`, `unknownTail136`, `unknownTail137`, `unknownTail145`, `unknownTail154`, `unknownTail158`, `unknownTail162`, `unknownTail17`, `unknownTail21`, `unknownTail22`, `unknownTail23`, `unknownTail24`, `unknownTail25`, `unknownTail3`, `unknownTail49`, `unknownTail5`, `unknownTail57`, `unknownTail61`, `unknownTail65`, `unknownTail69`, `unknownTail70`, `unknownTail71`, `unknownTail75`, `unknownTail77`, `unknownTail79`, `unknownTail81`, `unknownTail85`, `urn`, `variantOf`, `villageSiegeDay`, `villainRespawn`, `villainRespawnPosition`, `warehouseGroup`, `waypointPosition`.

**nodes** — 1080 registros.

`areaId`, `children`, `contribution`, `enabled`, `explorationPosition`, `grindTier`, `grindZone`, `groupHash`, `key`, `kind`, `knowledge`, `linkedKey`, `links`, `main`, `manager`, `managerNode`, `name`, `nodeIndex`, `position`, `products`, `radius`, `special`, `subKey`, `subKey2`, `territory`, `townRepresentative`, `unknown17`, `unknown39`, `urn`, `zoneCategory`, `zoneIndex`.

### worldmap.json

SHA-256: `8ecb2fe11df9477af68fcd8e94d77e1db981b0a6f63fc187721049019d7acd73`

Campos na raiz: `image`, `width`, `height`, `transform`.

**transform** — 2 registros.

Valores simples ou coleções vazias.

### zones.json

SHA-256: `817098f9af296eaa908725b8d65db53b4f0fbd73a0331ec5c8b5e28434efe8e2`

**raiz** — 112 registros.

`apApplyPercent`, `ecology`, `effectiveLimit`, `key`, `loot`, `mainCategory`, `name`, `node`, `recurringQuests`, `regionQuests`, `sheetAP`, `sheetDP`, `subCategories`, `tags`, `titles`, `topography`, `totalAP`, `totalDP`, `urn`.

## Como atualizar este relatório

Executar com Node e `--expose-gc` para liberar memória entre arquivos grandes:

```powershell
node --expose-gc scripts/inspect-extraction.mjs <diretorio-da-extracao>
```

O script apenas lê a extração e grava este relatório; não publica dados nem altera a instalação do jogo.
