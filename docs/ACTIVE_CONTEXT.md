# Estado Ativo do Projeto (Context Handoff)

_Este arquivo é o canal oficial de passagem de bastão de contexto entre OpenAI Codex e Antigravity. Mantenha-o sempre atualizado ao trocar de agente._

---

## 1. Sessão Atual: 10/10/2026

- **Agente Atual**: Antigravity
- **Branch Ativa**: `codex/bdo-ui-redesign` (8 commits à frente de `origin/codex/bdo-ui-redesign`)
- **Últimos Commits**:
  - `c7ef564` `feat(scans): standardize bdo ui buttons, action confirmation animations, and unified batch consolidation`
  - `cd97e78` `fix(scans): support full HD and 4K resolutions and calibrate grid pitch in storage detection`
  - `e08e39a` `docs: update context handoff with crafting calculator and bdo ui standardization`
  - `a421d2c` `feat(recipes): add crafting economics calculator, batch market query, and profit metrics`
  - `497c2cb` `feat(scans): improve ocr quantity reconciliation, direct batch save, and bdo styled cards`
  - `63ba41b` `fix(catalog): support powershell 5.1 paths and stabilize nest integration test`
  - `e5a31c4` `docs(research): add master bdo knowledge base and multi-agent handoff protocol`

---

## 2. Servidores Locais Ativos

- **Frontend Web (Angular + SSR)**: `http://localhost:4200/` (respondendo 200 OK)
- **Backend API (NestJS)**: `http://localhost:3000/api/v1` (respondendo 200 OK)

---

## 3. Realizações Desta Sessão (Antigravity)

### 3.1. Padronização Rigorosa de UI nos Scans (Skill BDO UI Design)
1. **Eliminação Completa do Botão Verde Fora da Regra**:
   - O botão `.btn-save-master` anteriormente usava gradiente verde (`#388e3c`/`#2e7d32`) e borda verde `#4caf50`.
   - Foi 100% remodelado para a identidade do Black Market: ouro/bronze nobre (`var(--bm-accent)`), texto carvão contrastante (`var(--bm-background)`), cantos chanfrados de 2px, box-shadow BDO e hover suave `var(--bm-accent-hover)`.
   - Remoção de qualquer emoji (inclusive foguete ou ícones Unicode decorativos).
2. **Unificação da Barra de Consolidação**:
   - Eliminada a duplicação confusa onde dois botões com textos idênticos apareciam lado a lado.
   - Definida hierarquia cristalina:
     - **Ação Primária**: `Confirmar e salvar lote (X itens)` (ou no armazém/inventário/equipamentos dependendo do destino ativo via `saveBatchLabel()`), em ouro nobre BDO (`.btn-save-master`).
     - **Ação Secundária Seletiva**: `Salvar apenas X revisados` (`.btn.subtle`), disponível quando o usuário escolhe atualizar manualmente apenas itens específicos marcados.
3. **Animações e Transições de Confirmação de Ações**:
   - Adicionada animação `@keyframes bm-confirm-glow` para dar feedback visual tátil e elegante no ato de inclusão/confirmação.
   - Transição suave em `.btn-cell-confirm`, `.scan-cell.reviewed` (com borda e box-shadow inset dourado BDO).
   - Notas discretas `.quantity-note` para indicar leitura original e valor convertido.

### 3.2. Calibração do Reconhecimento OCR com Imagens Reais do Jogo
1. **Resolução de Tela Desbloqueada (1080p, 1440p, 4K)**:
   - Identificado e corrigido o limite de 2.000.000 pixels em `storage-grid.ts` que fazia capturas Full HD (1920×1080 = 2.073.600 px) retornarem array vazio de grades.
   - Limite expandido para 12.000.000 px e suporte a pitches de 14px a 160px.
2. **Grades de 8 e 9 Colunas Calibradas**:
   - Calibrados os passos e tolerâncias para suportar fielmente tanto armazéns de 8 colunas quanto de 9 colunas (conforme screenshots reais de Velia).
3. **Quantidades Abreviadas (k e M) e Itens Unitários**:
   - Suporte refinado a sufixos `k` e `M` com limpeza de pontuações de borda (ex: `139.1k`, `319.9k`, `1.3M`).
   - Itens unitários sem texto numérico na imagem do jogo agora são confiantemente atribuídos com 1 unidade.
   - O botão de ação primária em lote (`confirmAndSaveAll()`) auto-converte e preenche estimativas para salvar tudo diretamente sem exigir que o usuário digite ou confirme slot a slot manualmente.
4. **Numerais Romanos Estendidos para Equipamentos**:
   - Validados tiers até X (DEC) para os novos equipamentos Fallen God e armas do Soberano (VI, VII, VIII, IX, X).

### 3.3. Qualidade e Testes (AGENTS.md)
- `pnpm format`: Arquivos formatados via Prettier.
- `pnpm check`: **PASSOU** 100% (0 erros de ESLint, formatação verificada, bundles Angular gerados com sucesso).
- `pnpm test`: **PASSOU** 100% em todos os pacotes:
  - 126 testes unitários e de integração na API (`@bdo/api`).
  - 285 testes unitários na Web (`@bdo/web`).
  - 40 testes unitários em `@bdo/calculators`.
  - Total: **451 testes passando** no monorepo.

---

## 4. Arquivos Modificados / Criados

- `apps/web/src/app/features/scans/scans-page.scss`: Remoção do botão verde, adoção de tokens BDO, badges padronizados e animação `bm-confirm-glow`.
- `apps/web/src/app/features/scans/scans-page.html`: Ações unificadas, botão mestre dinâmico `saveBatchLabel()`, notas limpas de quantidade e sem emojis.
- `apps/web/src/app/features/scans/scans-page.ts`: Adicionado computed `saveBatchLabel`, refinamento de `reliable` e resolução de estimativas.
- `apps/web/src/app/features/scans/scans-page.spec.ts`: Teste para `saveBatchLabel` e validação do fluxo de salvamento direto.
- `apps/web/src/app/features/scans/storage-grid.ts`: Suporte a imagens 1080p, 1440p e 4K (até 12MP) e passos de pitch ampliados.
- `apps/web/src/app/features/scans/storage-grid.spec.ts`: Teste com frame Full HD 1080p.
- `apps/web/src/app/features/scans/visible-quantity.ts`: Higienização de pontuação pós-sufixo em quantidades k/M.
- `apps/api/src/market/market-history.service.spec.ts`: Timeout de 30s para teste de estresse de 600k linhas.

---

## 5. Próximos Passos (Instruções para Codex ou Antigravity)

1. Validar no navegador (`http://localhost:4200/scans`) o upload das imagens enviadas pelo usuário em lote.
2. Seguir com o merge da branch `codex/bdo-ui-redesign` para a branch principal se solicitado pelo usuário.
3. Explorar o módulo de **Comparação de Itens** ou presets de profissão na árvore de receitas.
