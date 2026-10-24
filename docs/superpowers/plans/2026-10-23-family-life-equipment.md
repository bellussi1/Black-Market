# Equipamento de Vida da Família — plano de implementação

> **For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.**

**Goal:** Registrar equipamento de Vida no perfil regional da Família e importar capturas como sugestões revisáveis, com confirmação explícita antes de salvar.

**Architecture:** O schema Zod adiciona `lifeEquipment` ao perfil da Família sem alterar personagens nem a versão do workspace. A aba Equipamento ganha um editor familiar com catálogo; o scanner reconhece a roda de Vida como modo separado do gear de combate, reaproveita comparação de ícones e grava apenas itens revisados no perfil da região.

**Tech Stack:** TypeScript, Angular 22, Zod 4, Vitest, Tesseract.js, workspace pnpm e primitivas/tokens BDO existentes.

**Spec:** `docs/superpowers/specs/2026-10-22-family-life-equipment-design.md`

## Global Constraints

- O novo campo ficará no perfil da Família e será opcional para ler backups existentes.
- Não elevar `schemaVersion`, migrar o banco ou modificar a estrutura dos personagens nesta etapa.
- Itens sem ID do catálogo, tipo, escopo ou confirmação de inclusão continuam somente na revisão do OCR.
- Texto de aprimoramento ausente permanece `null`, nunca `0`.
- O OCR não preenche `slotLabel`.
- Não persistir os bytes da captura.
- Não criar sincronização automática nem alterar a cópia remota.
- Não interpretar item, slot ou nível com base apenas em semelhança, cor de raridade, ícone cinza ou valor de um concorrente.
- Fora de escopo: aplicar efeitos de equipamento a maestria, recomendações, calculadoras ou atributos; nenhuma fórmula está incluída.
- As imagens originais permanecem no diretório privado `prints-reais-ocr/` e fora do Git.

## Review Focus

1. Backup antigo sem `lifeEquipment`: a leitura cria coleções vazias para todas as profissões, preserva gear/personagens e não muda `schemaVersion` (Task 1, `personal.spec.ts`).
2. Item comum com tipo incompatível, ID interno duplicado ou mesmo item de catálogo em lista comum e profissional: rejeitar o perfil sem descartar o estado anterior (Task 1, testes do schema).
3. Captura com profissão legível, ausente ou conflitante: identificar somente uma profissão inequívoca; nos outros casos exigir escolha manual (Task 3, `real-capture-regressions.spec.ts`).
4. Moldura vazia/cinza, recorte que contenha dois ícones ou opções visuais empatadas: deixar o item, tipo, escopo e aprimoramento sem confirmação; não salvar automaticamente (Tasks 3–4, testes do scanner e regressão privada).
5. Troca de região, personagem ativo ou conjunto de combate durante cadastro/importação: alterar só `families[region].lifeEquipment` e preservar o resto (Tasks 2 e 4, testes de integração).

---

### Task 1: Contrato e validação do equipamento de Vida

**Files:**

- Modify: `packages/calculators/src/personal.ts`
- Test: `packages/calculators/src/personal.spec.ts`

**Interfaces:**

- Produces: `lifeEquipmentKinds`, `LifeSkill`, `LifeEquipmentKind`, `lifeEquipmentItemSchema`, `lifeEquipmentSchema`, `LifeEquipmentItem` e `LifeEquipment`, exportados pelo pacote `@bdo/calculators`.
- `LifeEquipmentItem`: `id: string`, `catalogItemId: number`, `name: string`, `kind: LifeEquipmentKind`, `slotLabel?: string`, `enhancementText: string | null`.
- `LifeEquipment`: `sharedItems: LifeEquipmentItem[]`, `bySkill: Record<(typeof lifeSkills)[number], LifeEquipmentItem[]>`.

- [x] **Step 1: Escrever testes de schema que falham**
  - Em `personal.spec.ts`, cobrir família antiga sem o bloco, arrays vazios para as 11 profissões, campos permitidos, máximo de 50 registros por lista, tipos comuns permitidos (`accessory`, `alchemyStone`, `purityOrb`), tipo comum incompatível, IDs internos duplicados e `catalogItemId` repetido entre `sharedItems` e `bySkill`.
  - Cobrir que o mesmo `catalogItemId` pode aparecer em profissões diferentes, e que `enhancementText` ausente continua `null`.
  - Usar `workspaceSchema` em `personal.spec.ts` para validar backup antigo completo sem mudança de `schemaVersion` e preservar personagens, presets e `gear` do personagem.
- [x] **Step 2: Rodar os testes focados e confirmar falha**

  Run: `pnpm --filter @bdo/calculators exec vitest run src/personal.spec.ts`

  Expected: FAIL apenas nas novas expectativas para o schema de Vida.

- [x] **Step 3: Implementar o schema em `personal.ts`**
  - Definir tipos de código em camelCase: `tool`, `costume`, `accessory`, `artifact`, `lightstone`, `huntingMusket`, `node`, `alchemyStone`, `purityOrb`, `other`.
  - Limitar cada lista a 50 registros; validar ID/nome do catálogo, rótulo e texto de aprimoramento; criar as 11 listas vazias por default.
  - Acrescentar `lifeEquipment` com default vazio ao `familyProfileSchema`; rejeitar categorias não compartilháveis e duplicação de ID interno ou de catálogo entre comum e profissão. Não rejeitar item de catálogo repetido em duas profissões.
- [x] **Step 4: Rodar os testes focados e confirmar aprovação**

  Run: `pnpm --filter @bdo/calculators exec vitest run src/personal.spec.ts`

  Expected: PASS, incluindo os casos de compatibilidade retroativa.

- [x] **Step 5: Conferir e registrar somente as mudanças deste contrato**

  Run: `git diff --check`

  Expected: nenhuma falha de whitespace; não incluir capturas privadas nem alterações preexistentes de outros arquivos.

### Task 2: Editor de equipamento na aba Família

**Files:**

- Create: `apps/web/src/app/features/player/life-equipment-editor.ts`
- Create: `apps/web/src/app/features/player/life-equipment-editor.html`
- Create: `apps/web/src/app/features/player/life-equipment-editor.scss`
- Test: `apps/web/src/app/features/player/life-equipment-editor.spec.ts`
- Modify: `apps/web/src/app/features/player/player-page.ts`
- Modify: `apps/web/src/app/features/player/player-page.html`
- Modify: `apps/web/src/app/features/player/player-page.spec.ts`

**Interfaces:**

- Consumes: `LifeEquipment`, `LifeEquipmentItem`, `LifeEquipmentKind`, `lifeSkills`, `CatalogItemPicker`, `ItemIcon` e `CatalogItem`.
- Produces: componente standalone `LifeEquipmentEditor`, selector `app-life-equipment-editor`, com `value = input.required<LifeEquipment>()` e `changed = output<LifeEquipment>()`; `PlayerPage` recebe a mudança e persiste via `saveFamily({ lifeEquipment })`.

- [x] **Step 1: Escrever testes de componente que falham**
  - O editor aparece na aba Equipamento mesmo sem personagem ativo, sem exibir gear de combate fictício.
  - Selecionar um item de catálogo e adicionar a uma profissão salva o item apenas na Família/região atual; adicionar item comum aceita só os três tipos definidos no contrato.
  - Editar tipo, rótulo e texto de aprimoramento, remover item e trocar profissão mantêm as outras listas; o seletor de itens comuns oferece somente os três tipos permitidos.
  - Alterar equipamento de Vida não modifica `character.gear`, personagem ativo, presets ou perfil de outra região.
- [x] **Step 2: Rodar os testes focados e confirmar falha**

  Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/player/life-equipment-editor.spec.ts --include=app/features/player/player-page.spec.ts`

  Expected: FAIL nas novas interações e na montagem da aba Equipamento.

- [x] **Step 3: Implementar o editor e montar na Família**
  - Adicionar escolha de profissão a partir de `lifeSkills`, seção de itens comuns, lista da profissão e inclusão via `CatalogItemPicker` com `scope="life-skill"`.
  - Usar `BdoSelect`, `HlmButton`, `ItemIcon` e tokens existentes; label/teclado/foco, vazio e feedback seguem o catálogo BDO.
  - Emitir cópias imutáveis do estado para `PlayerPage`; colocar o editor fora da condição que exige personagem e preservar o painel atual de combate.
- [x] **Step 4: Rodar os testes focados e confirmar aprovação**

  Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/player/life-equipment-editor.spec.ts --include=app/features/player/player-page.spec.ts`

  Expected: PASS com e sem personagem, na troca de profissão/região e após remoção.

- [x] **Step 5: Conferir diff e preservar mudanças herdadas**

  Run: `git diff --check`

  Expected: mudanças do editor isoladas; arquivos preexistentes continuam fora do stage até serem separados por hunks revisados.

### Task 3: Reconhecer a captura de Vida e criar sugestões pendentes

**Files:**

- Modify: `apps/web/src/app/features/scans/screen-recognition.ts`
- Test: `apps/web/src/app/features/scans/real-capture-regressions.spec.ts`
- Modify: `apps/web/src/app/features/scans/automatic-scan-page.ts`
- Test: `apps/web/src/app/features/scans/automatic-scan-page.spec.ts`
- Modify: `apps/web/src/app/features/scans/scans-page.ts`
- Modify: `apps/web/src/app/features/scans/scans-page.html`
- Modify: `apps/web/src/app/features/scans/scans-page.scss`
- Test: `apps/web/src/app/features/scans/scans-page.spec.ts`

**Interfaces:**

- Consumes: `LifeEquipmentKind`, `lifeSkills`, `DetectedScreenPane`, `OcrTextLine`, `detectEquipmentFrames()` e a revisão por lote atual.
- Produces: `ScreenKind` inclui `'life-equipment'`; `lifeEquipmentSkill(pane, lines): LifeSkill | null` retorna profissão somente para um alias normalizado único com confiança OCR ≥70 dentro do pane; `ScanMode` inclui `'life-gear'`; cada `ScanJob` desse modo carrega a profissão sugerida ou `null`.

- [x] **Step 1: Escrever regressões de classificação e sugestões que falham**
  - Tela com título de equipamento e texto único “Coleta” vira `life-equipment`; título/controles de PvP continuam `equipment`.
  - Ausência de profissão, confiança menor que 70 ou dois rótulos diferentes retorna `null`, deixando o seletor manual obrigatório.
  - Modo `life-gear` cria recorte por moldura sem usar `suggestEquipmentLayout()` de combate; cada candidato começa com `item: null`, tipo/escopo/aprimoramento vazios, `slotLabel` vazio, `include: false` e `reviewed: false`.
  - Zero molduras não usa a imagem inteira como item; continua disponível recorte único manual e cadastro pelo editor da Família.
- [x] **Step 2: Rodar os testes focados e confirmar falha**

  Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/scans/real-capture-regressions.spec.ts --include=app/features/scans/automatic-scan-page.spec.ts --include=app/features/scans/scans-page.spec.ts`

  Expected: FAIL nas expectativas novas de modo e estado inicial pendente.

- [x] **Step 3: Implementar classificação e extração segura**
  - Estender `detectScreenPanes()` para reconhecer título de Vida; tratar equipamento genérico como Vida apenas quando uma profissão única de `lifeSkills` estiver dentro do mesmo pane e controles de combate não contradisserem a evidência.
  - Encaminhar `life-equipment` em `AutomaticScanPage.choose()` para `life-gear`; manter a profissão sugerida corrigível no seletor da revisão e oferecer `Equipamento de Vida` como tipo manual quando a tela ficar `unknown`.
  - No scanner, usar molduras detectadas sem mapear posições semânticas; não executar detector geométrico de combate, PA/PD ou leitura automática de nível em Vida.
  - No cartão de revisão de Vida, deixar item sem seleção, tipo/escopo sem escolha, rótulo de posição vazio e aprimoramento apenas como texto sugerido. Exigir escolha explícita de item, tipo e escopo; mostrar controles de posição/aprimoramento com confirmação própria.
  - Se não houver segmentação, oferecer uma ação explícita para ler o recorte atual como um único ícone ou link para cadastro manual; nunca usar a imagem inteira como fallback nem iniciar fluxo de armazém.
- [x] **Step 4: Rodar os testes focados e confirmar aprovação**

  Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/scans/real-capture-regressions.spec.ts --include=app/features/scans/automatic-scan-page.spec.ts --include=app/features/scans/scans-page.spec.ts`

  Expected: PASS; casos de armazenamento, inventário e PvP preservam os resultados existentes.

- [x] **Step 5: Conferir diff e preservar mudanças herdadas**

  Run: `git diff --check`

  Expected: nenhuma captura privada no stage; separar hunks novos das alterações OCR já presentes nesses arquivos.

### Task 4: Confirmar e salvar somente itens revisados

**Files:**

- Modify: `apps/web/src/app/features/scans/scans-page.ts`
- Modify: `apps/web/src/app/features/scans/scans-page.html`
- Test: `apps/web/src/app/features/scans/scans-page.spec.ts`
- Modify: `apps/web/src/app/features/scans/scan-import-undo.ts`
- Test: `apps/web/src/app/features/scans/scan-import-undo.spec.ts`
- Modify: `packages/calculators/src/workspace.ts`
- Test: `packages/calculators/src/personal.spec.ts`

**Interfaces:**

- Consumes: `ScanJob.mode === 'life-gear'`, profissão selecionada/revisada, itens com catálogo, tipo e escopo escolhidos.
- Produces: `applyLifeEquipment()` persiste apenas candidatos validados em `families[region].lifeEquipment`; `screenshotImports.mode` aceita `'life-gear'`; atualização permanece dentro de `WorkspaceStore.update()` e compatível com `undoScanImport()`.

- [x] **Step 1: Escrever testes de persistência que falham**
  - Bloquear salvar sem catálogo, tipo, escopo, profissão necessária ou confirmação de inclusão.
  - Salvar uma linha confirmada e descartar outra mantém apenas a primeira; aprimoramento não conferido fica `null`, nunca `0`.
  - Item comum com tipo não compartilhável e duplicação de item entre lista comum e profissão são rejeitados.
  - Importar Vida atualiza apenas a Família/região, registra `life-gear` e hash sem bytes da captura e deixa personagens, gear PvP, inventário e presets idênticos.
  - Profissão ilegível sem escolha manual bloqueia inclusão; profissão legível permite correção antes de salvar.
  - Confirmação/undo restauram somente a mutação feita pela captura e testes de gear PvP existentes seguem aprovados.
- [x] **Step 2: Rodar os testes focados e confirmar falha**

  Run: `pnpm --filter @bdo/calculators exec vitest run src/personal.spec.ts`

  Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/scans/scans-page.spec.ts`

  Expected: FAIL nas novas validações, gravação e metadados da importação.

- [x] **Step 3: Implementar o fluxo de confirmação**
  - Validar cada linha de Vida separadamente: item de catálogo, tipo, escopo, profissão quando `bySkill` e ação explícita de incluir; recortes ignorados não entram no update.
  - Persistir `slotLabel` vazio e `enhancementText: null` até confirmação explícita; aprimoramento textual não é convertido para número nem compartilhado entre capturas.
  - Atualizar somente `families[readingRegion]` via `WorkspaceStore.update()`; registrar contagem/modo/hash e acrescentar `families` ao snapshot seletivo de `scan-import-undo.ts` para undo seguro.
  - Adicionar o modo `'life-gear'` ao enum do workspace sem alterar `schemaVersion`.
- [x] **Step 4: Rodar os testes focados e confirmar aprovação**

  Run: `pnpm --filter @bdo/calculators exec vitest run src/personal.spec.ts`

  Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/scans/scans-page.spec.ts`

  Expected: PASS para confirmação parcial, rejeição de dados incompletos, undo e isolamento de gear/estoque.

- [x] **Step 5: Conferir diff e preservar mudanças herdadas**

  Run: `git diff --check`

  Expected: alterações deste fluxo identificáveis em hunks próprios; manter os arquivos privados e modificações preexistentes fora do stage.

### Task 5: Regressão privada, validação integral e evidência

**Files:**

- Modify: `scripts/private-player-ocr-regressions.test.mjs`
- Modify: `docs/research/player-journey-audit-2026-10-22.md`
- Modify: `docs/ACTIVE_CONTEXT.md`
- Read-only: `docs/research/evidence/player-audit-2026-10-22/new-captures-manifest.json`

- [x] **Step 1: Adicionar regressão opt-in para a roda de Vida**
  - Com `BDO_PRIVATE_OCR_DIR`, verificar hash SHA-256 dos oito arquivos listados em `new-captures-manifest.json` antes de ler `gear-lifeskill.jpeg` e `gear-pvp.jpeg`.
  - Provar que os frames da roda de Vida são candidatos sem posição atribuída e que a roda PvP continua produzindo os 13 slots atuais. Sem diretório privado, os testes declaram skip explícito.
  - Saída registra nomes dos testes e resultados, nunca caminho de conta, tokens, texto pessoal ou bytes das imagens.
- [x] **Step 2: Rodar a regressão privada com os originais autorizados**

  Run: `$env:BDO_PRIVATE_OCR_DIR='C:\Users\Bellussi\Documents\ChatGPT\Site de BDO\prints-reais-ocr'; pnpm exec node --test scripts/private-player-ocr-regressions.test.mjs`

  Expected: PASS; os oito SHA-256 permanecem iguais ao manifesto e as imagens não entram no diff.

- [x] **Step 3: Executar a suíte e builds requeridos**

  Run: `pnpm check`

  Run: `pnpm test`

  Run: `pnpm --filter @bdo/web build`

  Run: `pnpm test:ssr`

  Expected: todos aprovados; registrar falhas preexistentes separadamente se alguma surgir fora dos arquivos desta feature.

- [x] **Step 4: Atualizar a evidência da auditoria e substituir o handoff**
  - Acrescentar em “Correções posteriores” do relatório o resultado por critério: schema antigo, editor, captura Vida, revisão/descartes, isolamento do PvP, regressão privada, contagens/comandos e limites.
  - Preservar os oito prints fora do Git e registrar apenas hashes/contagens e texto sanitizado.
  - Substituir `docs/ACTIVE_CONTEXT.md` com HEAD, status real, validações, evidência e próximo limite; manter o arquivo dentro de 80 linhas/6 KiB.
  - Fazer QA visual somente pela superfície autorizada do produto; se a política continuar bloqueando o localhost, registrar a limitação sem tentar uma superfície alternativa.
- [x] **Step 5: Revisar o resultado completo**

  Run: `git diff --check`

  Run: `git status --short`

  Expected: diff sem whitespace inválido, nenhuma imagem privada staged e nenhuma mudança alheia acidentalmente incluída.

## Handoff de execução

Este plano tocou o schema, o editor e o scanner; o usuário escolheu **Native** e a execução foi concluída no checkout autorizado. O residual J07 de quantidades (incluindo `1.4M`) segue pendente e fora do escopo J09.
