# Estado atual — Black Market

Atualizado em 24/10/2026. Este resumo substitui handoffs anteriores; decisões e evidências detalhadas ficam nas fontes do projeto.

## Checkout e preservação

- Checkout principal: `C:\Users\Bellussi\Documents\ChatGPT\Site de BDO`, branch `main`. Os commits desta auditoria são locais; sem push.
- `http://localhost:4200/` está atendendo por `ng serve` deste checkout (PID 21628). A porta 3000 estava sem listener; não reiniciei serviços.
- As 22 evidências QA e o plano concluído de equipamento de Vida foram registrados nos commits `210a2fe` e `21f3ef6`; o índice está em `research/evidence/player-audit-2026-10-22/README.md`.
- Originais em `prints-reais-ocr/` seguem privados e fora do Git.

## Estado

- J01–J09, Família/equipamentos de Vida, OCR revisável e correções do Coach continuam descritos em [auditoria da jornada](research/player-journey-audit-2026-10-22.md); não reabrir sem evidência nova.
- Edania #1407/#1408: receitas 1/10/100 e custos conferidos em [auditoria do Fármaco da Harmonia](research/edania-harmony-audit-2026-10-24.md).
- Produção #1408: corrigida a busca item a item que excedia limites e gerava HTTP 429; produção agora consulta produtores em lotes. Pendências de produção mostram os nomes dos materiais/receitas. Fórmula de custo, imposto, saída fixa do #1408 e lucro/hora foram reproduzidos sem divergência; retornos vendidos explicam receita bruta acima do produto final. Comparação de Buy All/Craft All/Best Profit, preços, maestria e quatro concorrentes em [auditoria de produção](research/production-calculation-audit-2026-10-24.md).
- Dados faltantes permanecem explícitos: seis rendimentos de receitas intermediárias e três durações de Processamento. Não preencher até validar por fonte atual ou medição reproduzível. Próxima melhoria de transparência é separar receita do produto final e venda de retornos.

## Validação

- `pnpm check`, `pnpm test`, `pnpm build` e `pnpm test:ssr` passaram em 24/10/2026. Suítes: 85 calculadoras, 272 API (1 skip), 942 Web e 85 scripts.
- QA da rota local #1408: oito chamadas em lote responderam HTTP 200, sem 429; “Fazer / coletar tudo” listou as nove pendências pelo nome.
- Avisos de build: fallback de locale `pt-BR` para `pt`, orçamento de `recipe-tree.scss` e dependências CommonJS do Tesseract.
- OCR ainda não tem holdout independente nem taxa global de acerto; manter revisão manual.
- Nesta atualização documental, `git diff --check` e a conferência dos links relativos do relatório/índice passaram; testes de produto não foram repetidos.
