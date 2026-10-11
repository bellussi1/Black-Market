# Mercado: lista e decisão de produção

## Implementado

- Linha inteira como botão nativo, incluindo colunas numéricas. Ícone/nome alinhados à esquerda; foco, Enter e Espaço preservados. Cabeçalhos continuam ordenáveis.
- Lista sem Topo/Bottom, preço atual duplicado e badge de tendência. Uma média aritmética das cotações observadas em 30 dias, com ausência indicada por “—”. A média não representa preço médio ponderado de transações. Sua ordenação continua restrita à página, explicitamente indicada na interface.
- Ao selecionar a linha, detalhes no mesmo Mercado: preço atual, recebimento líquido conforme taxas compartilhadas, estoque, limites e última venda. Busca recolhida; retorno à lista preserva filtros e página.
- Gráfico de preço/estoque/volume por intervalo, períodos e liquidez reutilizam o histórico existente. Explicações e registros completos ficam sob demanda. Não inventamos observações para períodos sem cobertura.
- `MarketProduction` consulta item e todas as fórmulas de produção, rejeita versões incompatíveis e cancela consultas substituídas. `RecipeTree.summaryOnly` reutiliza o mesmo motor de produção, maestria, taxas, estoque, cotações em cache e tempo, sem renderizar o grafo. Os três cenários e a abertura da árvore completa permanecem disponíveis.
- Variantes aprimoradas não recebem o lucro da fórmula base. Itens sem fórmula ou dados incompletos apresentam o motivo e não um lucro definitivo. Configurações de rendimento e tempo continuam opcionais e contextualizadas.

## Validação

- `pnpm test`: 604 testes passaram (53 calculators, 128 API, 361 web, 62 scripts). A rodada concorrente com check teve timeouts; a repetição isolada passou. Após finalizar a linha nativa, Mercado e RecipeTree foram revalidados: 77 testes passaram.
- `pnpm check` passou: lint, formatação, typecheck e build Angular de desenvolvimento.
- Playwright no Docker local, `http://localhost:4200/market`: clique na coluna numérica abriu detalhes; foco no botão da linha + Enter abriu o mesmo painel. Desktop 1440 × 900 e celular 390 × 844, sem overflow horizontal do documento. Título móvel revisado após detectar quebra excessiva.
- O gráfico foi validado com quatro observações controladas pela interceptação do navegador. Essas observações são fixtures de QA e não dados de mercado. Capturas locais ignoradas: `output/playwright/market-detail-desktop.png`, `market-chart-fixture-desktop.png`, `market-detail-mobile.png` e `market-mobile-viewport.png`.

## Limites

A disponibilidade externa de preços e o tempo calibrado ainda determinam quando o lucro/hora pode ser concluído. Não há lucro real verificado nesta revisão para toda a cadeia do Fármaco do Azul-Profundo. Fonte e política de coleta não foram alteradas. A descrição estática continua em `/market/items/:id`, identificada como dados do catálogo; gráfico e produção pertencem ao detalhe contextual do Mercado.
