# Auditoria da equivalência de preço de peixe fresco e desidratado

**Consulta:** 16/10/2026 · região pretendida: SA/PT · fontes públicas e extração local · sem login, escrita no banco ou contorno de controles.

Esta revisão avalia se o preço do peixe fresco pode ser inferido a partir do preço de mercado de sua forma desidratada. A cotação de um item seco não define, por si só, quantas unidades substituem uma unidade de peixe fresco em uma receita de Culinária.

## Resultado no Black Market

`deriveRecipeMarketEquivalents` em `apps/api/src/catalog/recipe-market-equivalents.ts`:

- seleciona peixes de categoria `Fish`, `forTrade=true` e sem `marketable=true`;
- encontra uma receita `DRY` de uma entrada e uma saída cujo produto esteja marcado como negociável;
- define `quantityRatio: 1` para todo par encontrado.

O frontend usa esse ratio para multiplicar a cotação do produto desidratado e estimar o custo do ingrediente fresco. Portanto, o valor `1` é uma premissa financeira ativa, embora a extração não o forneça como equivalência culinária.

Na extração SA/PT local examinada, as relações `DRY` ligam itens frescos a itens desidratados, mas não incluem grupo nem valor de substituição de Culinária. Algumas quantidades de saída também são ausentes. O serviço da API seleciona quantidades das relações, mas o resolvedor não as usa. O campo `grade` da extração não resolve a lacuna: por exemplo, o par local Gobião `#8201` → Gobião Desidratado `#8501` tem grades catalogadas diferentes (verde e branco). Isso não informa o valor culinário preservado pelo item seco.

## Evidências por fonte

| Fonte                                                                                                                                       | Observação pública em 16/10/2026                                                                                                                                                                                                                                                                                                   | O que confirma                                                                                                                          | Limite                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [BDO Workshop — plano público #9601](https://bdoworkshop.com/crafting-workshop/plan/9601)                                                   | A abertura da rota falhou nesta consulta. O projeto mantém uma captura anterior do plano com valores de custo, venda, lucro, tempo e modos de estratégia.                                                                                                                                                                          | A captura histórica mostra quais resultados de oficina são úteis para comparar; não contém um caso pareado de peixe fresco/desidratado. | Não foi possível verificar a interface, preços ou fórmula atuais do plano. Uma captura histórica não confirma equivalência de ingrediente.                                           |
| [BDO Codex — Saurel Desidratado #8509](https://bdocodex.com/us/item/8509/) e [Bagre Desidratado #8519](https://bdocodex.com/us/item/8519/)  | O conteúdo público indexado descreve o peixe seco como exigindo o dobro de unidades para Culinária em relação à versão não desidratada. A página do item não abriu integralmente nesta consulta.                                                                                                                                   | É uma declaração pública específica do item; contradiz a suposição de que todo par tenha necessariamente ratio 1.                       | Codex é uma referência comunitária, não valida o patch SA/PT atual por si só.                                                                                                        |
| [BDO Codex — grupo de substituição #5101](https://bdocodex.com/us/materialgroup/5101/)                                                      | O índice público lista vários itens de peixe e seus valores de substituição. Também apresenta Saurel e Saurel Desidratado com valor 2 para ambos, em tensão com o texto da página de Saurel Desidratado, que diz exigir o dobro. A página completa não pôde ser aberta diretamente por restrição do site à ferramenta de consulta. | A equivalência culinária é representada como propriedade de grupo/valor, distinta da relação de processamento `DRY`.                    | A inconsistência entre páginas impede escolher ratio por ID sem validar a versão e a semântica do grupo. A região e a versão de cliente desse dado não foram confirmadas como SA/PT. |
| [BDOLytics — plano Balenos Meal #9601](https://bdolytics.com/en/crafting/9601%3A558d95547e1d)                                               | A página pública indexada mostra Filé de Peixe Defumado usando 1 Dried Mudskipper por craft, com campos de estoque e preço editável no planner. A abertura direta retornou uma página sem conteúdo textual renderizado.                                                                                                            | O planner expõe materiais e permite testar custos customizados; a fórmula exibida usa o ingrediente seco nessa receita.                 | Não houve comparação pareada entre fresco e seco, nem prova do ratio interno. A região/instantâneo da página não foi validado para SA atual.                                         |
| [Garmoth — guia de Culinária da Olvia Academy](https://garmoth.com/guides/post/olvia-academy-cooking)                                       | O guia público, publicado em 08/05/2026, lista 1 Dried Mudskipper na receita de Fish Fillet Salad.                                                                                                                                                                                                                                 | É um exemplo editorial de receita usando peixe seco.                                                                                    | Não compara a substituição com peixe fresco nem declara uma regra de equivalência.                                                                                                   |
| [Notas oficiais de atualização SA — 28/05/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?countryType=pt-BR&groupContentNo=8007) | A página oficial indexada contém alterações de preço máximo do Mercado Central para itens de peixe desidratado, entre eles Gobião e Bagre.                                                                                                                                                                                         | Confirma que preços máximos de produtos secos podem mudar por patch/região.                                                             | Não publica valores de substituição culinária; preço de mercado não determina ratio de receita.                                                                                      |

## Separação entre regras, observações e hipóteses

### Confirmado no código e na extração local

- A aplicação seleciona um item desidratado usando uma relação `DRY` do catálogo.
- O resolvedor retorna `quantityRatio: 1` sem obter uma relação de substituição culinária.
- A cotação do equivalente é multiplicada por esse ratio para calcular o custo estimado.
- A extração local não contém os valores do grupo culinário necessários para confirmar o ratio por par.

### Observado em fontes públicas

- Páginas do Codex descrevem casos em que o peixe seco requer o dobro do fresco.
- O grupo #5101 do Codex contém valores de substituição por item, mas um exemplo consultado conflita com a descrição de item.
- BDOLytics e Garmoth apresentam receitas com Dried Mudskipper, sem comparar cenários pareados fresco/seco.
- A rota de plano do Workshop não foi acessível nesta consulta.

### Não confirmado / hipótese

- É plausível que o ratio dependa da variante e do valor culinário do peixe, e que a relação `DRY` não baste para deduzi-lo.
- Nenhuma fonte consultada confirmou uma tabela de equivalência por ID para o cliente SA/PT vigente.
- Não há comparação no cliente do jogo com preço, receita e peixe pareados que resolva a discrepância observada no Codex.

## Decisão técnica

Não alterar o `quantityRatio` nesta etapa. Trocar todos os pares para `2`, inferir o ratio com base em quantidade de processamento ou usar `grade` do catálogo poderia introduzir erros de custo. Manter `1` também não deve ser apresentado como regra confirmada: ele é apenas o valor atual do resolvedor e requer revisão antes de ser tratado como equivalência confiável.

Para corrigir com segurança, a próxima fonte precisa fornecer uma relação explícita de substituição por item, associada à versão/região do dataset, ou deve haver validação reproduzível no cliente SA/PT. Os testes devem cobrir ao menos pares de qualidade diferente e comparar o custo inferido com uma quantidade de receita que o jogo aceite. Na ausência desses dados, o equivalente deve permanecer sinalizado como não verificado ou não ser usado para afirmar um custo exato.

## Verificação executada

Os testes focados existentes passaram: `pnpm --filter @bdo/api exec vitest run src/catalog/recipe-market-equivalents.spec.ts src/catalog/catalog.service.spec.ts` — 16 testes aprovados. Eles verificam o mapeamento estrutural atual e não comprovam a regra culinária do ratio.
