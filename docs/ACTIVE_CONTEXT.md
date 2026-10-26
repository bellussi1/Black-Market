# Estado atual — Black Market

Atualizado em 26/10/2026. Este resumo substitui handoffs anteriores; decisões e evidências detalhadas ficam nas fontes do projeto.

## Checkout e preservação

- Checkout principal: `C:\Users\Bellussi\Documents\ChatGPT\Site de BDO`, branch `main`.
- As 22 evidências QA e o plano concluído de equipamento de Vida estão registrados em `research/evidence/player-audit-2026-10-22/README.md`.
- Originais em `prints-reais-ocr/` e arquivos `.env`/`.env.staging` seguem privados e fora do Git.

## Estado

- J01–J09, Família/equipamentos de Vida unificados na janela contínua BDO (`P` + `I` + pílulas romanas `I (PRI)` a `X (DEC)`), OCR revisável e correções do Coach continuam descritos em [auditoria da jornada](research/player-journey-audit-2026-10-22.md).
- Home (`/`), O que fazer (`/recommendations`), Mercado (`/market`, consolidado em 2 abas: `Mercado` e `Cotações pessoais`) e Receitas (`/recipes`) compartilham containers padronizados (`--bm-page-max: 1440px`), transições de rota (`withViewTransitions`) e navegação lateral com o emblema `/favicon.svg` e ícones exclusivos por rota.
- Produção #1408 e Oficina de Receitas:
  - Consulta de produtores em lote (`GET /api/v1/production/producers`) e pendências nomeadas em [auditoria de produção](research/production-calculation-audit-2026-10-24.md).
  - `Etapas expansíveis` funciona como visualização somente leitura da árvore (sem inputs embutidos ao expandir).
  - Sidebar `Plano da receita` (`RecipeMaterialsSidebar`) usa seletores segmentados explícitos `Comprar | Produzir` para insumos e `Vender | Guardar` para retornos previstos (`grid-template-columns: minmax(0, 1fr) auto`, sem overflow horizontal), exibindo em destaque o **Lucro/h sub-receita** com maestria e rendimento esperados (replicado em painel comparativo dedicado no `Resultado da receita`, nas `Etapas expansíveis` e na `Árvore visual`, incluindo processamento em massa).
  - Peixes, frutos do mar, moluscos e itens desidratados provenientes da pesca/coleta submarina (`Gobião`/`Gobião Desidratado`, `Lula`/`Calamar Desidratado`/`Marisco Desidratado`, `Lagosta`/`Lagosta Desidratada`, `Marisco de Pérola Desidratado`, `Ostra`, etc.) têm ícones e preços de mercado/equivalentes resolvidos em toda a cadeia (receita principal, sub-receitas, alternativas de ingrediente e alocação visual).
  - Card `Faturamento líquido` em `RecipeTree` decompõe separadamente a receita do **produto principal** e a venda de **retornos previstos** (líquido e bruto), além da origem do preço e estoque.
- Catálogo do jogo atualizado em 26/10/2026 (`sa-pt-meta-af2b8344c221-loc-39290c8dddc1-ext-5bf11bd7-bin-60bd5677-catalog-catalog-v3-supp-df1d8958`, checksum `f150e161ae979c533be4e0acb4a7d17c08b4ce09d04a6efa60f6142225c1ff1f`, `74.892` itens, `10.683` receitas e `22.018` ícones publicados tanto no banco local quanto no staging).
- Staging local (`docs/staging-local.md`, `staging.cmd`, `scripts/staging.ps1`): configurado com `black-market-bdo-staging`, login Google/Steam, catálogo real e compartilhamento via Cloudflare Quick Tunnel (`.\staging.cmd Share -AllowedEmail ...`).

## Validação

- `pnpm check` (lint, format:check e typecheck), `20/20` testes da API (`recipe-market-equivalents.spec.ts` + `catalog.service.spec.ts`) e `153/153` testes do Web (`catalog-api.service.spec.ts`, `recipe-equivalents.spec.ts`, `recipe-production-adapter.spec.ts`, `recipe-production-graph.spec.ts` e `recipe-tree.spec.ts`) passaram em 26/10/2026.
- Avisos conhecidos de build permanecem: fallback de locale `pt-BR` para `pt`, orçamento de `recipe-tree.scss` e dependências CommonJS do Tesseract.
