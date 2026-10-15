# Coach de Atividades — correções da validação

> **Execução:** continuar inline, já autorizada pelo pedido para prosseguir com a implementação.

**Objetivo:** reduzir chamadas desnecessárias e tarefas repetidas no Coach e corrigir colisões de layout em números longos e larguras de viewport reduzidas.

**Arquitetura:** preservar o planner e os valores em cache; a rota só resolve preços quando há personagem, consultas de produção não fazem fallback por item e as pendências são agrupadas por ajuste compartilhado antes de paginar. CSS deve deixar conteúdo numérico quebrar linha e permitir que a página acompanhe a largura real do viewport.

**Stack:** Angular, TypeScript, RxJS, Vitest e SCSS existentes.

## Arquivos e verificações

- `apps/web/src/app/core/market-cache.service.ts` e `.spec.ts`: deixar preço máximo ausente como desconhecido; adicionar testes para resposta nova e cache aquecido sem GET individual.
- `apps/web/src/app/features/recommendations/recommendations-page.ts`, `.html`, `.scss` e `.spec.ts`: não buscar mercado sem personagem; carregar preços após perfil; agrupar o mesmo ajuste entre cenários/receitas e paginar pendências.
- `apps/web/src/app/layout/workspace-layout.scss` e `apps/web/src/styles/_base.scss`: remover largura mínima rígida que corta zoom de 200%; quebrar prata, peso e outros valores longos no resumo.
- Verificar testes Web, `pnpm check`, `pnpm test` e a rota no navegador em 160, 320, 768 e 1628 CSS px.

## Sequência TDD

1. Testar que cotações em lote novas ou cacheadas não disparam requisições individuais por falta de `maxPrice`; corrigir o serviço e rodar os testes focados.
2. Testar que sessão sem personagem não busca cotações; quando personagem passar a existir, cotações são carregadas automaticamente. Testar agrupamento de itens/preços e paginação dos ajustes; implementar e rodar os testes da página.
3. Ajustar CSS do resumo e shell; conferir conteúdo com valores máximos em viewport estreito/zoom equivalente, sem clipping ou sobreposição.
4. Rodar verificação integrada e atualizar `docs/ACTIVE_CONTEXT.md` com resultado, limitações e próximo passo.

## Decisões de confiança

- Não preencher `maxPrice`, disponibilidade, preço ou duração ausentes com valores aproximados.
- Um ajuste manual por item/pendência representa todos os cenários que dependem daquele mesmo dado.
- Nenhuma receita incompleta entra no ranking nem recebe lucro/hora definitivo.

## Resultado da execução

- `pnpm check`: passou após ordenar imports e formatar a página e sua spec. O build segue emitindo o aviso conhecido de locale `pt-BR` com fallback para `pt`.
- `pnpm test`: passou — 67 testes de calculadoras, 216 de API, 555 de Web e 73 de OCR/scripts; 911 no total.
- Estresse com perfil e inventário sintéticos extremos: 4.222 receitas, 12.666 cenários pendentes agrupados em 6.001 ajustes únicos. A primeira página expõe 30 campos únicos; nenhum GET individual `/market/items/:id` foi disparado. Os dados insuficientes mantiveram todos os cenários fora do ranking. A comparação levou cerca de 2,5 minutos no cenário máximo.
- Responsividade validada por screenshot em 160, 320, 768 e 1.628 px CSS, com `scrollWidth` igual à largura de conteúdo em cada viewport. Capturas: `output/playwright/recommendations-validation-final-{160,320,768,1628}.png`.
- Achado visual residual do cenário sintético: o valor de nome muito longo fica truncado no campo nativo fechado de personagem em 320 px; o seletor continua identificando a opção quando aberto, e a tela não cria rolagem horizontal.
- A tentativa de verificar a paginação no navegador foi redirecionada a `/account` assim que o `authGuard` original foi restaurado. A lógica de agrupamento/paginação passou na suíte Web; a proteção da rota foi conferida pelo redirecionamento. O estado temporário do workspace/cache de navegador foi restaurado e o guard permanece habilitado.
- A revisão concorrencial foi atualizada com as superfícies consultadas em 15/10/2026. Os valores não são equivalentes sem controle das mesmas entradas; a divergência histórica de Refeição de Valência (292,3M/h local vs. 163,8M/h no snapshot BDOLytics) permanece explícita.
