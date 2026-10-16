# Revisão competitiva — Mercado e Oficina de Receitas

**Consulta:** 16/10/2026 · superfícies públicas · sem login, scraping de endpoints privados ou contorno de controles.

Esta revisão informa a hierarquia visual da fase 2 do rollout. Observações de interface não confirmam fórmulas, disponibilidade, liquidez ou direitos de reutilização de dados.

## BDO Workshop

- [Página inicial](https://bdoworkshop.com/) anuncia ferramentas para crafting, mercado e scans de inventário/armazém/gear.
- A rota pública do [plano 9601](https://bdoworkshop.com/crafting-workshop/plan/9601) não abriu nesta consulta por depender da aplicação JavaScript. A captura enviada anteriormente pelo usuário mostra seleção de produto, quantidade de crafts, maestrias, valor de venda após taxa, materiais faltantes, tempo, lucro, lucro/hora, cadeia de receitas e escolhas “Buy all”, “Craft all” e “Best profit/hour”. Registro essa imagem como observação histórica do projeto, não como inspeção repetida nem prova de fórmula interna.

## BDOLytics

- A [calculadora de crafting](https://bdolytics.com/en/alchemy) lista processos por profissão e exibe filtros por prata/hora e volume diário, além de tabela com receita, insumos, silver/hour, preço, média de volume em 14 dias e experiência.
- Na [receita de Culinária](https://bdolytics.com/en/cooking/9609%3Aa4342323baca), a UI consultada organiza quantidade, estoque, preço customizado e imposto; separa retorno/produtos e breakdown de receita, custo, lucro, crafts e tempo; e mostra subreceitas/cadeia de materiais.
- O [detalhe de mercado](https://bdolytics.com/en/market/item/6719) distingue região, idade de atualização, faixa e preço, Daily Volume, Stock, Total Trades e gráficos de preço/volume/estoque em várias janelas. São valores do site e da região selecionada, não fixtures ou dados do Black Market.

## Garmoth

- O [Mercado](https://garmoth.com/market) organiza itens populares, tendências e maiores mudanças de preço; o [detalhe de item](https://garmoth.com/market/item/9768/0) separa preço, estoque, variação semanal, vendas diárias/total, última venda e gráficos de preço, estoque e venda diária.
- A [entrega imperial](https://garmoth.com/imperial-crates/) é um módulo especializado com Culinária/Alquimia, maestria, CP, graus, quantidade mínima no mercado, modificador de maestria e caixas por entrega. Não observei um planejador geral público de cadeias nesta superfície.
- Alguns campos nos snapshots retornados estavam vazios/inconsistentes; não os trato como evidência de valor ou fórmula.

## BDO Codex

- A [lista de itens](https://bdocodex.com/us/items/) apresenta filtros de grade/classe e flags de venda/transação, com tabela de ID, título, nível, classe e qualidade; parte da lista permaneceu em “Loading data from server”.
- A [lista de receitas](https://bdocodex.com/us/recipes/) expõe tipo, nível, materiais, peso total e produtos. A página pública de [Teff Bread](https://bdocodex.com/us/recipe/194/) mostra calculador por quantidade/preço, produtos por craft, custo, dedução de imposto e lucro, além dos vínculos com ingredientes/receitas.
- Nesta inspeção, Codex funcionou principalmente como catálogo relacional; não encontrei gráfico/volume de mercado comparável ao BDOLytics/Garmoth.

## Aplicação ao Black Market

- **Mercado:** manter região e frescor à vista; separar busca, disponibilidade e ações; manter preço de referência, média, estoque e contagens em colunas distintas; identificar contagens de negociações sem chamá-las de unidades vendidas; preservar os gráficos separados por indicador. O esqueleto precisa reservar espaço para resultado e controles.
- **Receitas:** agrupar seleção de atividade com a lista; usar skeleton somente no primeiro carregamento; em paginação, manter a lista e mostrar estado de atualização no fluxo do painel; preservar resultado, tempo, decisões por material e alternativas da árvore. Estratégia selecionada deve ser reconhecível por indicador visual e `aria-pressed`.
- **Limites:** não copiar código, assets ou dados; não transformar snapshots de concorrentes em benchmark, feed ou fonte. Fórmula privada não pode ser inferida somente pela UI.

## Limitações desta consulta

BDO Workshop não carregou interativamente; BDOLytics e Garmoth foram consultados por páginas públicas e snapshots/indexação, com campos incompletos; Codex teve dados dinâmicos não carregados em parte da lista. Não foi feita comparação matemática pareada nesta revisão. Consulte as páginas novamente antes de uma futura feature que dependa da interface atual e atualize `docs/research/competitor-review-playbook.md`.

## Reconsulta para a refatoração de Crafting e Mercado (16/10/2026)

Esta consulta foi feita após o pedido de esclarecer os papéis de `/crafting` e `/market`. Observações públicas orientam fluxo e hierarquia, não provam fórmulas privadas nem autorizam importar preços/dados.

| Fonte e superfície | Observação pública desta consulta | Limite |
| --- | --- | --- |
| [BDO Workshop — plano de Crafting 9601](https://bdoworkshop.com/crafting-workshop/plan/9601) e [Crafting Workshop](https://bdoworkshop.com/crafting-workshop) | A tentativa de abrir ambas as rotas falhou nesta consulta web. A captura do usuário e auditorias anteriores registram produto/lote/maestria separados do resumo financeiro, cadeia e estratégias de compra/crafting/otimização. | Evidência histórica de UI; o cálculo atual e estado da rota não foram repetidos nem confirmados. |
| [BDOLytics — calculadora de Alquimia](https://bdolytics.com/en/alchemy/4076) e [lista de calculadoras](https://bdolytics.com/en/alchemy) | O conteúdo público/indexado organiza quantidade, ingrediente, estoque, preço customizado, taxa e custo; separa itens de retorno/subprodutos, quebra de receita/custo/lucro, crafts e tempo e expõe saída/cadeia. A lista diferencia Culinária/Alquimia/Processamento e dispõe filtros de silver/hour e volume médio de 14 dias. | A lista consultada indica região North America. A página de mercado detalhada abriu sem conteúdo textual nesta ferramenta; dados não foram pareados com SA. |
| [Garmoth — detalhe público de item 9768](https://garmoth.com/market/item/9768/0) e [Mercado](https://garmoth.com/market) | A ficha distingue região EU, horizonte, preço, estoque, variação semanal, média vendida/dia, total vendido e última venda; separa visualmente Prices, Stock, Daily Sold e order book. | Snapshot consultado estava incompleto: preço/estoque/total/última venda ausentes e média diária 0; resultado indexado de duas semanas antes. Não tratar zeros/campos vazios como disponibilidade ou demanda atual. |
| [BDO Codex — receitas](https://bdocodex.com/us/recipes/) e [receita 194](https://bdocodex.com/us/recipe/194/) | Busca pública recente descreve tabela com ID, título, tipo, nível de profissão, EXP, materiais, peso e produtos. | A rota direta foi bloqueada pela ferramenta na sessão; usar Codex como referência relacional de catálogo e receita, não como fonte de mercado ou prova do cálculo atual. |

### Implicações para o desenho

- A escolha recomendada para avaliar com o usuário é separar claramente uma **simulação rápida de uma receita** do **planejamento recursivo/otimizado da cadeia**, mantendo atalhos entre elas se os papéis forem confirmados. O contrato deve dizer para cada campo se vem do catálogo, perfil/armazém, cotação de mercado ou ajuste manual, com frescor e edição visíveis.
- Mercado deve guiar uma decisão concreta: procurar item, ver preço/estoque/origem/frescor, consultar histórico e, se mantida, simular o líquido da venda no contexto. O relatório anterior já identificou que a coleção pessoal de cotações duplica parcialmente o cache/histórico e que seus dados também alimentam formulários de Crafting; decidir visibilidade não pode apagar nem desconectar esses dados sem plano de compatibilidade.
- Não juntar preço, estoque e atividade em um eixo nem chamar diferença de contador de unidades vendidas. O pedido anterior de gráfico Chart.js preenchido permanece registrado; ele deve respeitar a separação de métricas.
- O 4200 estava inacessível (`ERR_CONNECTION_REFUSED`) quando a aplicação local foi verificada nesta sessão. A avaliação de fluxo acima deriva de código/documentos e fontes públicas, não de interação visual local.
