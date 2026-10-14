# Volume de vendas nas receitas e validação ponta a ponta

## Objetivo

Exibir demanda observada do Mercado Central ao lado da rentabilidade das receitas e usar essa informação para destacar planos de produção que tenham possibilidade de escoamento. O volume deve complementar o lucro/hora, sem alterar silenciosamente a fórmula de lucro.

Também corrigir os bloqueios encontrados nos fluxos de mercado e recomendações, e estabelecer simulações ponta a ponta para Culinária, Alquimia, Processamento, itens de pesca, estoque, retornos e estados de dados indisponíveis.

## Evidências da auditoria

### Black Market local

- `/market`, região SA: o catálogo de itens em alta tinha 401 registros. Com “Com volume 24h”, nenhum dos 401 aparecia; a própria tabela explica que os volumes dependem de histórico completo. A tela mantém a paginação do catálogo e informa `0 visíveis no filtro`.
- A API calcula `volume24h`, `volume15d` e `volume30d` pela diferença entre observações de `totalTrades`, exigindo pontos recentes e sem lacunas por hora. Na documentação pública do provedor, o campo é chamado `totalTrades`; não encontrei uma definição inequívoca de que a unidade seja item vendido, ordem ou transação. A interface atual descreve os dados como unidades negociadas, afirmação que precisa ser confirmada antes de usá-la como verdade.
- `/recommendations`: “Carregar catálogo” trouxe 6.813 receitas e os preços conhecidos de NPC apareceram como fallback do catálogo. Sem personagem, a tela bloqueou corretamente o ranking personalizado. A consulta de mercado dessa tela gerou 404 em `board?region=SA` e `production-quotes?region=SA`; a rota de mercado normal usa `region=sa` e responde 200.
- `Refeição de Valência` (item 9609), SA, maestria temporária de Culinária 3.000, Processamento 1.200 e tempo de Culinária 1,2 s: o cenário local “Fazer / coletar tudo” mostrou lucro/h de 292.252.267, lucro líquido de 6.916.637, custo de 26.863.800, faturamento líquido de 33.780.437 e 1m25s para 100 receitas. O produto ficou em 29.300 e a estimativa foi 364 unidades.
- `Refeição de Balenos` (item 9601), com maestria de Culinária 3.000 e Processamento 1.200, mostrou lucro/h de -86.326.140; a busca do Mercado Central encontrou estoque, mas marcou o histórico como insuficiente para média/volume.
- `Fármaco da Harmonia` (item 1399), com Alquimia 3.000 e Processamento 1.200, mostrou lucro/h de 584.501.543, lucro líquido de 17.080.498.926 e cotação antiga. A consulta do item 9733 falhou com HTTP 503 durante a rodada.
- No desktop de 1.628 × 917 px, os botões e campos visíveis tinham nomes acessíveis; as imagens observadas tinham `alt`. A janela de otimização fechou com Escape. A rota de receita não apresentou um H1; inicia a hierarquia de títulos em H2.
- A prévia do otimizador da Refeição de Balenos identificou “Combinação proposta · 100 receitas”, com lucro/h negativo de -77.676.683 e lucro total de -2.694.000. A prévia não identificou se a busca cobriu o espaço total de soluções.

### Referência de mercado e concorrentes

- BDOLytics, região South America: a calculadora lista lucro/hora, preço e volume diário em colunas separadas, oferece filtro de volume mínimo e, na configuração lida, usava Culinária/Alquimia 3.000, tempo 1,2 s, subproduto de Culinária Leite (12x), bônus de alquimia ativo, Value Pack e Processamento 1.200.
- Snapshot de Culinária observado: Refeição de Valência 163,8M/h, preço 29,3K, volume 227,9K; Ração Orgânica 349,4M/h, preço 83,0K, volume 116,9K; Refeição de Balenos 330,7M/h, preço 31,3K, volume 82,3K; Vinegar 348,6M/h e volume 131,2K; Margoria Seafood Meal 1,8B/h, preço 242K, volume exibido 54 (semântica/janela não confirmadas). Whale Meat Salad apareceu com 11,8B/h, mas sem volume exibido.
- Snapshot de Alquimia observado: Metal Solvent 904,6M/h e volume 46,7K; Oil of Fortitude 754,9M/h e volume 17,2K; Grim Reaper’s Elixir 937,5M/h e volume 6,6K; Elixir of Edania 580,7M/h e volume 3,4K; Perfume of Deep Sea 6,7B/h e volume 3,4K.
- A comparação da Refeição de Valência confirma rendimento médio próximo de 3,65 unidades por operação e preço unitário igual (29,3K), mas a velocidade, custos e lucro/h divergem: a receita local projetou 364 unidades/100 operações e 292,3M/h; o detalhe BDOLytics projetou 3.647/1.000 operações, custo 145.505.702, lucro 92.303.865, 163,8M/h e 33m48s. É uma divergência de cálculo/dados a investigar antes de certificar uma recomendação.
- BDO Workshop apresenta o Crafting Workshop como planejamento de cadeia a partir do que o armazém contém, escolhendo craft ou compra e salvando o plano. A página observada declara o recurso em desenvolvimento e não expõe volume de venda na tela de plano.

Os números dos concorrentes são fotografias voláteis da consulta na região SA, não garantias de preço ou venda. O cabeçalho do BDOLytics alterna entre “Daily Volume” e “Volume (14d avg)” em suas superfícies; a nossa interface deve explicitar janela, unidade e cobertura.

## Desenho proposto para aprovação

1. **Separar rentabilidade e demanda**: preservar lucro líquido e lucro/hora como cálculos de produção. Acrescentar volume observado, estoque, preço, região, data da cotação e cobertura histórica. Não chamar item sem histórico de “volume zero”.
2. **Definir a semântica do volume**: o backend publica unidade e janela do indicador segundo a capacidade documentada do provedor (`unidades`, `negociações` ou `indefinido`). Enquanto a semântica não estiver confirmada, a UI usa um rótulo neutro de atividade observada e não promete quantidade de unidades vendidas.
3. **Expor capacidade de escoamento**: nas receitas e em “O que fazer?”, mostrar volume médio diário observado, lote esperado e relação lote/volume. Volume desconhecido, sem negociação e volume observado devem ter estados distintos. Um usuário pode filtrar por volume mínimo ou por horizonte de escoamento; esses valores são parâmetros, não constantes por receita embutidas no frontend.
4. **Ordenar sem score oculto**: exibir lucro/hora e volume como dimensões separadas. Quando o usuário define um mínimo de demanda, filtrar primeiro pelo limite e então ordenar pelo lucro/hora. Sem cobertura suficiente, o item fica identificado como não classificável por demanda, em vez de receber zero artificial.
5. **Usar dados do próprio mercado**: manter snapshots no banco existente para construir histórico e cache em memória para leitura rápida. Descobrir produtos dinamicamente pelo catálogo e pela cadeia selecionada; não manter IDs, receitas, nomes, thresholds ou volumes hardcoded. A coleta deve seguir região/locale e limites do provedor. Quando não houver histórico nativo, exibir o período de aquecimento sem inventar retroatividade.
6. **Corrigir fluxo de recomendações**: normalizar o código de região antes de chamar a API, tratar 404/503 como indisponibilidade com estado recuperável e não calcular ranking com cotação antiga sem mostrar a origem e a idade.
7. **Acessibilidade e UI**: adicionar H1 à página de receita, manter volume junto dos dados econômicos e associar rótulos/descrições a período, unidade, região e cobertura. Navegação por teclado, foco visível, leitores de tela, redução de movimento e layout desktop serão critérios de validação.

## Simulações ponta a ponta após aprovação

- Culinária: Refeição de Valência e Ração Orgânica (lucro com volume), Margoria Seafood Meal (lucro alto/volume baixo) e um item sem histórico; comparar compra de subreceitas, fazer tudo e otimização.
- Alquimia: Elixir de Edania e Fármaco da Harmonia; variar Alquimia 3.000, Processamento 1.200, subproduto e estado de cotação.
- Pesca: receita com peixe e ingrediente de venda incerta, conferindo preço, estoque, janela de venda e ausência de cobertura.
- “O que fazer?”: personagem de teste isolado, estoque parcial, maestria, materiais coletáveis, NPC, craft, compra, saídas vendidas/guardadas e produção acima/abaixo do volume médio.
- Mercado: volume conhecido, sem negociação observada, histórico insuficiente, cache fresco/antigo, 404/503, mudança de região, filtros, ordenação e paginação.
- Acessibilidade: teclado completo, nomes/labels, ordem de títulos, imagens, foco de modal, estados anunciados e contraste em desktop.

## Critérios de aceite

- Uma receita com lucro alto e volume desconhecido não aparece como “líquida” nem como zero vendido; estado e unidade ficam legíveis.
- Volume conhecido pode ser usado como filtro, e os resultados continuam ordenados pelo lucro/hora sem misturar o volume na fórmula de lucro.
- A relação entre o lote esperado e a janela de volume fica visível; a interface não promete venda garantida.
- Região SA em recomendações funciona sem transformar `sa` em `SA`; falhas de cotação não produzem ranking aparentemente completo.
- Parâmetros, cotações e filtros são dinâmicos por região, item, profissão e usuário; nenhum ID ou valor do benchmark vira regra fixa no código.
- As receitas da matriz acima são executadas no navegador com preços e timestamps registrados; screenshots e resultados de acessibilidade acompanham os fluxos. A qualidade dos dados sem histórico é reportada separadamente da precisão dos cálculos.

## Decisão pendente

Aprovar a proposta acima, em especial o uso de volume como filtro de demanda separado do lucro/hora e a exibição de lote versus volume médio. A implementação de comportamento e persistência começa após a revisão desta especificação.
