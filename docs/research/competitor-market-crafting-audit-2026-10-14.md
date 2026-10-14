# Varredura comparativa de Mercado e Life Skill — 14/10/2026

## Objetivo e limites

Comparar os fluxos de mercado, crafting/Life Skill, dados apresentados e decisões do usuário em Garmoth, BDOLytics e BDO Workshop para orientar o Black Market. A inspeção usou páginas públicas, resultados públicos indexados e controles visíveis do BDO Workshop. Os valores numéricos dos concorrentes são snapshots regionais e não devem ser tratados como preços ou regras atuais.

No BDOLytics, o navegador entregou o shell da aplicação; os detalhes de mercado/crafting foram verificados no índice público de páginas. Garmoth expôs páginas HTML com tabelas legíveis. No BDO Workshop, a rota do Crafting Workshop e o acesso ao Storage Tracker foram verificados em uma sessão autenticada; a inspeção não abriu itens de armazém do usuário, não salvou planos nem enviou dados.

Não foram acessadas APIs internas não documentadas, rotas administrativas, dados de outros usuários ou fontes que exigissem contornar controles do site. As páginas dos concorrentes não foram usadas como origem para dados do produto.

## Comparação funcional

| Área | Garmoth | BDOLytics | BDO Workshop |
|---|---|---|---|
| Mercado | Painel regional com itens populares, tendências, maiores altas/baixas e itens adicionados recentemente. Popularidade usa favoritos/acompanhamento recente; tendência compara atividade de venda com estoque. | Catálogo por região e categoria. A página do item organiza preço, variação em 7 dias, mínimo/máximo, rótulo de faixa, volume diário, estoque, negociações acumuladas, atualização e históricos. | O foco inspecionado é planejamento de produção e estoque; os preços aparecem como parâmetros do planner, com região e edição de preço. Não foi verificado um mercado próprio comparável ao das outras duas ferramentas. |
| Detalhe e histórico | Preço atual, estoque, variação semanal, média diária vendida, total vendido, preço/data da venda mais recente, livro de ofertas e gráficos de preço, estoque e vendas diárias. Período observado na página de exemplo: 180 dias. | Gráficos separados para preço, volume e estoque, com períodos de 1 dia, 7 dias, 30 dias, 6 meses e 1 ano. Indica “atualizado há …”. | O cálculo consome preços regionais e permite substituí-los por valores próprios; não foi observado gráfico de histórico no planner. |
| Crafting | A pesquisa não encontrou um planejador de cadeia comparável como fluxo principal. O conteúdo relevante observado são tabelas de maestria, entrega imperial e ferramentas de mercado/progressão. | Calculadora detalha entradas, estoque, preços customizados, taxa por material, custo, retornos, produtos/subprodutos/extras, manter/vender, margem, tempo e lucro/hora; mostra grafo de receitas, alternativas e procs raros. | Planner declara a proposta como “planejar uma cadeia contra o conteúdo dos armazéns”; permite escolher produto, quantidade, região, comprar/fazer/otimizar lucro/hora, decisão por ingrediente e receita intermediária, maestria, tempo, sucesso de processamento, peso e preços próprios. Há aviso de produto em construção. |
| Estoque | O Garmoth não foi verificado como leitor de armazém. | Planejamento inclui quantidades em estoque; catálogo e relações com itens apoiam o cálculo. | Storage Tracker por região/cidade; a interface diz que o estoque conta para todos os planos e que a lista de compras mostra apenas o que falta. Também anuncia “Best crafts”, ordenação de estoque e análise de receitas que usam um item. Tutorial menciona scan de imagens, com revisão do usuário antes de persistir. |
| Decisão principal | Encontrar movimento/variação e acompanhar itens. | Comparar rentabilidade calculada e dados de mercado; filtros de volume podem qualificar a lista de receitas. | Encontrar como concluir uma cadeia: comprar, fazer e utilizar o estoque, com uma estratégia de lucro/hora. |

## Observações específicas

### Garmoth

- O Mercado separa descoberta em categorias com significado explícito: popular (favoritos/acompanhamentos nos últimos 15 dias), tendência (atividade de venda relativamente ao estoque), altas, quedas e itens recentes. Isso é mais informativo do que chamar toda ordenação de “itens em alta”.
- A página de item reúne sinais complementares: preço/estoque corrente, mudança de preço, atividade média diária, histórico acumulado, última venda e livro de ofertas. O usuário consegue distinguir atividade e disponibilidade em vez de inferi-las de um único número.
- As páginas de maestria apresentam tabelas separadas por profissão e por efeito. No nível 3000, a tabela consultada mostra: Culinária — aumento de produto 76,45%, produto secundário 76,45%, produto raro 24,20%, chance de produção em massa 100%; Alquimia — aumento de produto 62,50%, chance de item comum 3,83%, especial 2,98% e raro 0,36%; Processamento — 315 materiais. A entrega imperial aparece como efeito separado. Esses são valores da referência Garmoth; precisam ser confrontados com o modelo do jogo/catalogo antes de assumir qualquer equivalência para uma receita específica.
- Não encontramos na navegação pública consultada um encadeador de subreceitas que escolha simultaneamente comprar ou produzir cada insumo. Não atribuir ao Garmoth uma funcionalidade que não foi observada.

### BDOLytics

- O detalhe de mercado coloca o item em contexto: região, disponibilidade em estoque, preço, variação de 7 dias, mínimo/máximo, classificação (“Fair price”, “Above usual”, “Expensive”), volume diário, estoque e total de trades. Históricos de preço, volume e estoque são separados e têm períodos selecionáveis.
- A calculadora de receita separa custo de insumos e retorno: quantidade, nome, estoque, preço customizado, opção de taxa e custo total; depois quantidade/valor de retorno, manter e retorno total. O resumo quebra receita em produto, subprodutos e itens extras, e exibe lucro, margem, custo, total de crafts, tempo e lucro/hora.
- A cadeia deixa visíveis quantidade por operação, tempo por etapa, máximo fabricável e alternativas. Maestria aparece por profissão/etapa e há opção de usar procs raros. O resultado não deve ser comparado com outro site sem alinhar região, lote, maestria, tempo, taxa, preço e opções de venda/estoque.
- Os índices observados exibem tanto “Daily Volume” quanto “Total Trades”. Isso não prova que `totalTrades` seja uma contagem de unidades físicas vendidas em todas as fontes/janelas.

### BDO Workshop

- A página inicial do planner descreve o produto como cadeia de receita + estoque + decisões de craft/compra, com plano salvo em workbench. Exibe um aviso de “Work in progress” e pede retorno caso um número pareça estranho; deve ser tratado como referência de fluxo e não como árbitro absoluto do cálculo.
- A escolha do produto apresenta busca e filtros por Alquimia, Culinária, Processamento e Workshop. A página observada permite começar sem um formulário longo de perfil.
- O plano observado em 12/10/2026 separava Buy all, Craft all e Best profit/hour. A melhor taxa não necessariamente maximiza o lucro total, porque incorpora horas de produção; o comparativo expunha lucro e tempo, além de decisão por intermediário. O próprio algoritmo interno não é público, portanto a UI serve como referência e os números exigem validação independente.
- Configurações vistas no planner incluem tempos por profissão, sucesso de processamento, peso disponível, processar do armazém, trocas de subprodutos e parâmetros de maestria. Preços customizados podem substituir a cotação tanto para compras quanto para vendas; deixar em branco mantém a referência de mercado.
- O Storage Tracker descreve um fluxo de seleção de cidade e scan/revisão de capturas. O login liberou a rota na sessão atual. Esta verificação não abriu o conteúdo pessoal de armazenamento nem alterou qualquer plano.

## Confronto com Black Market

### O que já existe

- Catálogo dinâmico com nomes e ícones, preços regionalizados, cache cliente em memória e `localStorage`, cotação por lote, fallback a preço máximo sem estoque e origem/idade da cotação.
- O cache da web usa TTL de 5 minutos e pode reter cotações locais antigas por até 24 horas; a fonte Arsha informa cache de 30 minutos. O componente de cotação informa atualização periódica de 8 minutos. O usuário precisa ver esses tempos como camadas diferentes, não como uma única promessa de “tempo real”.
- As receitas possuem custo/retorno, imposto e Value Pack, preço customizado/NPC, receitas intermediárias, vendas/estoque de retornos, maestria temporária por profissão, alternativas e otimizador de lucro/hora.
- O Mercado tem cotação e histórico próprios, seleção de região, filtros/categorias, cache, tentativas de atualização e estados de histórico insuficiente.

### Gaps concretos confirmados no código

1. **Preço corrente ausente no quadro principal.** O cabeçalho do Mercado lista preço médio observado de 30 dias, estoque e volumes. A regra corrente usada pelo cálculo — cotação disponível quando há estoque, preço máximo quando não há — não aparece junto ao item do quadro.
2. **Tabela semanticamente incorreta.** Cada registro de item está dentro de um botão único em uma célula `colspan=6`, apesar de haver seis cabeçalhos ordenáveis. Leitores de tela e navegação tabular não recebem relações reais entre célula e cabeçalho.
3. **Rótulo de volume forte demais.** A API deriva `volume24h/15d/30d` da diferença de observações `totalTrades`, mas a interface chama o resultado “unidades negociadas”. A definição de unidade não foi comprovada. Até essa proveniência ser confirmada, o produto não deve prometer quantidade de unidades vendidas nem estimar escoamento em unidades a partir desse contador.
4. **Giro precisa de semântica confirmada.** O detalhe calcula estoque dividido pelas diferenças de `totalTrades` e já bloqueia o indicador quando faltam 24h, há lacunas, reinício ou ausência de atividade. A validação matemática do contador não prova que o divisor seja unidades de produto.
5. **A história é do nosso próprio coletor.** O gráfico atual mostra observações que o Black Market começou a guardar, em 24h/7d/30d. Concorrentes podem apresentar janelas históricas mais longas. Não preencher o passado com dados sintetizados nem prometer janelas ainda sem cobertura.
6. **Quatro vistas exigem voltar para ações vinculadas.** Quadro, cotação, calculadora e cotações salvas coexistem; `saveLive()` não tinha acionador no template na auditoria anterior. A especificação visual aberta propõe cotar → calcular/salvar no próprio detalhe, sem eliminar deep links nem a vista de salvas.
7. **Confiabilidade da recomendação antecede seu ranking.** Há 404 de região SA normalizada em maiúsculas nas recomendações e divergências de lucro reportadas entre a calculadora local e o BDOLytics. Valor de referência, quantidade esperada, custo de cadeia, tempo e retorno devem ser alinhados antes de promover “melhor receita”.

## Recomendações de produto e engenharia

1. **Corrigir primeiro o contrato dos dados.** Guardar região, item/variante, campos brutos do provedor, preço, estoque, contador original, horário de observação e atualização upstream. Expor origem e idade. Manter `null` como desconhecido e zero somente como zero observado.
2. **Não assumir a unidade de volume.** Renomear a métrica para atividade/contagem observada enquanto o contrato de origem não provar unidade e janela. Manter lucro/hora como cálculo independente. Ativar filtros de demanda e lote-versus-volume somente após obter volume de unidades compatível e cobertura suficiente.
3. **Alinhar preços entre lista, detalhe e crafting.** Mostrar no quadro preço de referência atual e origem, com média histórica secundária. A lista e a receita precisam usar a mesma regra regional e de estoque, e mostrar cotação máxima quando a compra instantânea não existe.
4. **Calcular resultados de crafting por decisão da cadeia.** Para cada etapa, custo de comprar, custo/tempo de produzir, material do armazém, opções substitutas e preços de NPC; comparar compra, produção e otimização com o mesmo lote e as mesmas cotações. A maestria modifica rendimento apenas nas etapas produzidas com uma regra de maestria válida; uma entrada comprada não recebe procs fictícios.
5. **Separar métricas que respondem perguntas diferentes.** Lucro total, lucro/hora, margem, custo, preço líquido depois de imposto, tempo e demanda devem permanecer distintos e com parâmetros visíveis. “Melhor lucro/hora” maximiza taxa; “maior lucro total” pode selecionar outro plano.
6. **Unificar o fluxo visual do Mercado.** Aplicar a direção de superfícies semânticas já aprovada: moldura por janela/área independente, grupos internos por espaço/divisória. Trocar linha de botão com `colspan` por tabela acessível, acrescentar referência de preço atual e colocar ações de calcular/salvar junto à cotação. Melhorar o gráfico com escala/tempo/tooltip e tabela equivalente.
7. **Manter tudo derivado de fontes dinâmicas.** Catálogo e ícones por ID do dataset publicado; cotações, períodos, regiões, capacidades, parâmetros administrativos e conteúdo persistente via API/banco/cache. Não importar IDs, preços, nomes, thresholds ou snapshots dos concorrentes como valores de produção.

## Prioridade proposta

| Ordem | Entrega | Motivo |
|---:|---|---|
| 1 | Consertar normalização de região e estados de cotação; alinhar preço atual/máximo entre Mercado e Receita. | Evita resultados vazios ou preços inconsistentes antes de mexer no ranking. |
| 2 | Corrigir semântica do volume e registrar cobertura por janela. | Evita recomendar uma receita usando unidades de venda não comprovadas. |
| 3 | Piloto visual aprovado do Mercado: tabela, detalhe, gráfico e ações no contexto. | Resolve hierarquia, acessibilidade e navegação sem reescrever o cálculo. |
| 4 | Reconciliar 5+ receitas reais de cada profissão com dados e parâmetros equivalentes. | Confirma o modelo antes de ampliar recomendações personalizadas. |
| 5 | Integrar demanda confiável em “O que fazer?” como filtro/indicador ao lado do lucro/hora. | Evita misturar rentabilidade potencial com capacidade de venda. |
| 6 | Continuar migração da linguagem para Crafting, Scan/Armazém e recomendações. | Preserva a direção desktop-first e dá prioridade ao fluxo central. |

## Fontes observadas

- [Garmoth — Mercado](https://garmoth.com/market)
- [Garmoth — detalhe público de item e livro de ofertas](https://garmoth.com/market/item/766104/0)
- [Garmoth — tabelas de maestria de Culinária](https://garmoth.com/mastery-brackets/cooking)
- [Garmoth — tabelas de maestria de Alquimia](https://garmoth.com/mastery-brackets/alchemy)
- [Garmoth — tabelas de maestria de Processamento](https://garmoth.com/mastery-brackets/processing)
- [BDOLytics — detalhe de mercado de material](https://bdolytics.com/en/market/item/8603?page=0)
- [BDOLytics — exemplo de cálculo de Alquimia](https://bdolytics.com/en/alchemy/1155)
- [BDOLytics — exemplo de receita com saídas e subprodutos](https://bdolytics.com/en/cooking/9260%3Aefe5608f5154)
- [BDO Workshop — Crafting Workshop](https://bdoworkshop.com/crafting-workshop)
- [BDO Workshop — plano 1408 previamente observado](https://bdoworkshop.com/crafting-workshop/plan/1408)
- [BDO Workshop — Storage Tracker](https://bdoworkshop.com/crafting-workshop/storage-tracker)

## Próximo passo

Usar esta comparação como base para a implementação aprovada do piloto do Mercado. A proposta de volume continua separada porque a unidade de `totalTrades` segue sem confirmação. Antes de mexer na ordenação padrão do mercado, verificar o comportamento atual por região e definir a pergunta principal que essa ordenação deve responder.
