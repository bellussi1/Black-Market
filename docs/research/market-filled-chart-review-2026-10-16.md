# Pesquisa competitiva — gráfico preenchido do Mercado

**Consulta:** 16/10/2026 · superfícies públicas · sem login, endpoints privados ou contorno de controles.

Esta revisão orienta somente a apresentação do histórico já fornecido ao Black Market. Observações de páginas públicas não são fonte de preço, volume, liquidez ou fórmula para o produto.

## Superfícies consultadas

| Fonte                                                                              | Observação pública em 16/10/2026                                                                                                                                                      | Limite da observação                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/)                                           | A página pública descreve ferramentas de crafting e calculadoras de mercado. A aplicação informa que as ferramentas exigem JavaScript.                                                | A rota de Mercado não ficou acessível na consulta; não foi possível confirmar o gráfico atual, métricas ou interação. Não inferir ausência de gráfico.                                               |
| [BDO Codex — item 768160](https://bdocodex.com/us/item/768160/)                    | O detalhe público de item lista descrição, usos e um bloco de preço/estoque do Mercado Mundial por região.                                                                            | Não foi encontrado um histórico visual comparável nessa página. A lista pública de itens não carregou os dados dinâmicos nesta ferramenta; isso não prova que não haja outra superfície.             |
| [BDOLytics — detalhe de mercado](https://bdolytics.com/en/market/item/8603?page=0) | A página indexada separa preço, histórico de preço e histórico de volume e apresenta filtros de período. A superfície também distingue estoque, volume diário e total de negociações. | Snapshot/região do índice: North America. O conteúdo da rota não foi renderizado interativamente nesta consulta; números e métricas não são transferíveis para SA nem para fixtures do Black Market. |
| [Garmoth — detalhe de mercado](https://garmoth.com/market/item/9768/0)             | A página pública separa preço, estoque, variação semanal, média vendida diária, total vendido, última venda e livro de ofertas; a página indica região EU e janela de 180 dias.       | Alguns valores retornaram vazios e a média diária apareceu como 0. A representação do gráfico não ficou verificável nesta captura; não tratar campos vazios/zero como atividade atual.               |

## Referência técnica

A documentação oficial do [Chart.js — Area Chart](https://www.chartjs.org/docs/latest/charts/area.html) define `fill: 'origin'` para preencher a área até a origem e informa que a funcionalidade depende do plugin `Filler`. A integração tree-shaken do [Chart.js](https://www.chartjs.org/docs/latest/getting-started/integration) também lista `Filler` entre os plugins que precisam ser registrados quando os componentes são registrados manualmente.

## Decisão para o Black Market

- Manter uma métrica por vez: preço, estoque ou variação observada do contador de negociações. Escalas e unidades não se misturam.
- Usar a cor bronze `--bm-accent` da paleta do projeto na linha e no preenchimento vertical suave, com um guia pontilhado apenas sobre o ponto ativo.
- Preservar marcadores, tooltip com data/valor e intervalo, gaps, intervalos de amostragem longos tracejados, rótulos, aviso sobre negociações, skeleton, SSR e movimento reduzido.
- O preenchimento é decorativo e não interpola nem adiciona observações. As lacunas continuam sem conexão (`spanGaps: false`). Nenhum dado, cálculo, série ou origem muda.
- Continuam valendo a limitação de proveniência do histórico local e a política de fonte em [`market-source-policy.md`](market-source-policy.md). Contagem de negociações não equivale a unidades vendidas nem a liquidez.

## Limitações

BDO Workshop não abriu interativamente; o conteúdo do detalhe BDOLytics foi obtido de indexação pública e tinha região North America; Codex não expôs histórico comparável nessa consulta; os valores agregados de Garmoth estavam incompletos. A pesquisa serve para verificar a separação visual de métricas e períodos, não para afirmar fórmulas ou disponibilidade de dados.
