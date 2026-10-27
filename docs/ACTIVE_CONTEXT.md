# Estado atual — Black Market

Atualizado em 27/10/2026. Este resumo substitui handoffs anteriores; decisões e evidências detalhadas ficam nas fontes do projeto.

## Checkout e preservação

- Checkout principal: `C:\Users\Bellussi\Documents\ChatGPT\Site de BDO`, branch `main`.
- Evidências QA e plano de equipamento de Vida: `research/evidence/player-audit-2026-10-22/README.md`.
- Originais em `prints-reais-ocr/` e arquivos `.env`/`.env.staging` permanecem privados e fora do Git.

## Estado

- Abertura do código: README e licença MIT preparados localmente; o repositório remoto continua privado. O usuário escolheu preservar o histórico; revisar a autorização de imagens de terceiros antes da publicação. Evidências e limites: [preparação open source](open-source-release.md).
- J01–J09, Família/equipamentos de Vida na janela contínua BDO, OCR revisável e correções do Coach: `research/player-journey-audit-2026-10-22.md`.
- Home, Recomendações, Mercado e Receitas compartilham containers de até 1440 px, transições de rota e navegação com ícones exclusivos.
- Produção #1408 e Oficina de Receitas:
  - Consulta de produtores em lote (`GET /api/v1/production/producers`) e pendências nomeadas: `research/production-calculation-audit-2026-10-24.md`.
  - `Etapas expansíveis` é somente leitura.
  - Em `/recipes/items/1407`, `Plano da receita` mostra a cadeia em árvore recolhível: Produzir usa totais agregados do planner; Comprar mostra descendentes apenas como referências por operação; itens repetidos apontam para uma linha canônica. Lucro/h de sub-receitas fica no comparativo recolhível único de `Resultado da receita`. Evidência: `research/recipe-plan-hierarchy-2026-10-26.md`.
  - Peixes e itens desidratados da pesca têm ícones e equivalentes resolvidos em toda a cadeia; itens desidratados são materiais de compra. Maestria zero usa padrão de 1000.
  - `Faturamento líquido` decompõe produto principal e retornos previstos, incluindo valores líquido/bruto, origem da cotação e estoque.
- Catálogo do jogo publicado em 26/10/2026: 74.892 itens, 10.683 receitas e 22.018 ícones.
- Staging local usa `black-market-bdo-staging`, login Google/Steam e Quick Tunnel restrito por e-mail via `staging.cmd Share`.

## Validação

- Focadas: 93 testes em 3 specs da hierarquia/receita e 84 testes em `recipe-tree.spec.ts` passaram.
- `pnpm check` passou (lint, Prettier e typecheck).
- `pnpm test` passou: 1.395 aprovados e 1 ignorado.
- `pnpm build` e `pnpm test:ssr` passaram.
- Avisos atuais de build: fallback de locale `pt-BR` para `pt`, orçamento de `recipe-tree.scss` excedido em 2,66 kB e dependências CommonJS do Tesseract.
