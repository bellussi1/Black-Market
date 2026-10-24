# Auditoria de receitas, cálculos e lucro por hora

Revisão realizada em 24/10/2026 no mercado SA, com interface em português. O cenário principal usa a receita do item #1408, Imortalidade: Fármaco da Harmonia - Edania. Comparei o comportamento visível do Black Market com páginas públicas de BDO Workshop, BDOLytics, BDO Codex e Garmoth. Os números dos concorrentes são observações de suas páginas e não foram usados como preços, padrões ou coeficientes do Black Market.

## Resultado

Encontrei duas falhas verificáveis no Black Market e corrigi ambas:

- A árvore de produção consultava receitas produtoras item a item. A cadeia do #1408 alcançava centenas de itens e ultrapassava o limite de chamadas por minuto, gerando HTTP 429 e deixando relações incompletas. Agora o grafo consulta até 100 IDs por chamada em `GET /api/v1/production/producers`, mantendo a versão do catálogo e as receitas do produto principal. Na recarga de QA de 24/10, oito chamadas da cadeia responderam HTTP 200, sem chamadas individuais de receita e sem 429.
- “Resultado incompleto” agrupava receitas sem rendimento sob o nome genérico “Produção”. Agora cada pendência identifica a receita ou o material. Na conferência visual do cenário “Fazer / coletar tudo”, os três tempos aparecem como Água Purificada, Vestígio da Natureza e Sal; os seis rendimentos aparecem como Elixir da Destruição Fatal, Elixir de Choque Poderoso, Elixir de Assassino Letal, Elixir de Detecção Afiada, Elixir de Carnificina Brutal e Elixir do Céu Impiedoso.

Não reproduzi erro aritmético na receita final, no imposto, no custo de materiais, na maestria aplicável ou na conversão para prata por hora. As diferenças grandes para os concorrentes não são comparações pareadas: variam quantidade, maestria, preços, disponibilidade e regras de venda de retornos. O plano deve continuar incompleto enquanto faltarem dados de rendimento ou duração; inserir valores padrão sem evidência produziria lucro/hora inventado.

## Cenário pareado do Black Market

Na rota `/recipes/items/1408`, selecionei SA/pt, saída de 1.000 unidades e lote de 10. A saída fixa de 10 unidades por operação exige 100 operações. A cotação da saída #1408 estava sem estoque e sem preço máximo; o Black Market usou a cotação-base de referência de 280.000.000 por unidade. A própria interface informa que preço de referência não garante compra ou venda. Entradas usadas: #1407 a 29.400.000, Óleo da Imortalidade Decadente #1178 a 37.300.000 e Essência de Ibellab #4986 a 10.000 via NPC. A resposta Arsha registrada na API local foi obtida em 24/10/2026 às 03:58:31 UTC; estoques são instantâneos e podem mudar.

No cenário “Comprar subreceitas”, a conta reproduzida foi:

| Parcela                            |                           Cálculo |                 Prata |
| ---------------------------------- | --------------------------------: | --------------------: |
| Venda bruta do produto final       |               1.000 × 280.000.000 |       280.000.000.000 |
| Receita após 15,5% de imposto      |           280.000.000.000 × 0,845 |       236.600.000.000 |
| Fármaco da Harmonia - Edania #1407 |                1.000 × 29.400.000 |        29.400.000.000 |
| Óleo #1178                         |                6.000 × 37.300.000 |       223.800.000.000 |
| Essência de Ibellab NPC            |                      100 × 10.000 |             1.000.000 |
| Custo econômico total              |                soma dos materiais |       253.201.000.000 |
| Lucro líquido                      | 236.600.000.000 − 253.201.000.000 |   **−16.601.000.000** |
| Lucro por hora estimado            |   −16.601.000.000 × 3.600 ÷ 600 s | **−99.606.000.000/h** |

Os 600 segundos usam 100 operações × 6 segundos para a etapa final. Esse valor é uma estimativa de tempo padrão, não uma medição pessoal. A fórmula exibida bate com a aritmética; o risco econômico está na cotação sem estoque do produto final e na liquidez dos materiais, não em um erro de multiplicação.

No cenário “Fazer / coletar tudo”, a interface mostra 89 insumos, 62 retornos e a mesma quantidade fixa de 1.000 produtos finais. O faturamento bruto de 291.609.090.351 inclui 280.000.000.000 da saída final e 11.609.090.351 dos retornos incluídos para venda. O líquido total é 246.409.680.699: 236.600.000.000 da saída principal e 9.809.680.699 dos retornos. O planejador aplica o arredondamento para baixo por linha de retorno; por isso o total líquido difere em 647 pratas do resultado de aplicar 0,845 uma única vez ao bruto agregado. Essa diferença explica por que o bruto de “Craft All” supera o valor da saída final; não é rendimento extra de maestria aplicado ao #1408. A separação visual do valor final e do valor dos retornos pode ficar mais evidente, mas os valores encontrados fecham com a regra de arredondamento do código.

O total desse plano permanece corretamente pendente para lucro, custo e lucro/hora: seis receitas intermediárias não têm rendimento esperado confirmado e três materiais de Processamento não têm segundos por operação. Nada na fonte pública consultada permite preencher com segurança esses nove campos. Culinária/Alquimia têm estimativas de maestria quando o tipo de receita é elegível; lotes de Processamento exigem tempo informado.

## Buy All, Craft All e Best Profit/Hour

O seletor “Comprar subreceitas” mantém a etapa final e compra materiais intermediários. “Fazer / coletar tudo” tenta produzir intermediários com receitas disponíveis e deixa os dados ausentes visíveis. O comportamento observado respeitou o estoque conhecido e não transformou automaticamente uma cotação sem estoque em disponibilidade garantida. Para o item final, a receita de lote escolhida continuou em 10 unidades por operação.

A busca de melhor lucro/hora foi apresentada como melhor combinação encontrada, sem certificação global quando atingiu o limite de estados. No cenário observado, encontrou −4.538.373.983/h, lucro de −1.435.638.970, custo de 25.161.165.172 e duração de 18m59s, com 18 materiais. A divisão do lucro pelo tempo resulta em aproximadamente −4,538 bilhões por hora. A prévia indicou limite de busca, e “Aplicar combinação” é uma ação separada; não apliquei a prévia durante a auditoria. O resultado negativo significa que a melhor alternativa examinada continuava deficitária.

O otimizador precisa de dados completos para comparar corretamente. A árvore agora evita o limite de chamadas para montar candidatos; as lacunas de yield/time continuam restringindo a certificação e os resultados. Não há evidência de que tenha selecionado uma combinação incorreta no caso observado.

## Maestria e rendimentos

O #1408 usa receita de Alquimia Simples, saída de lote fixo validada em 10 por operação. Os rendimentos fixos do Fármaco da Harmonia e dos lotes de Edania não passam pelo modelo de proc genérico. Isso corresponde às notas oficiais SA de 27/08/2026, que introduziram as receitas atuais em lote: [notas oficiais de atualização de Edania](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8511). O código mantém o padrão de 1.000 de maestria para receitas variáveis quando não há perfil configurado e permite ajuste da simulação; esse padrão não muda uma receita de rendimento fixo.

Comparei as tabelas locais de maestria com as páginas públicas atuais do Garmoth. Os valores visíveis coincidem nos pontos observados: Culinária 1.000 = 17,81% e 3.000 = 76,45% de proc máximo; Alquimia 1.000 = 21,90% e 3.000 = 62,50%; Processamento 2.000 = 250 itens e 3.000 = 315. As tabelas de [Culinária](https://garmoth.com/mastery-brackets/cooking), [Alquimia](https://garmoth.com/mastery-brackets/alchemy) e [Processamento](https://garmoth.com/mastery-brackets/processing) são uma referência comparativa observada; não tratei uma interface de terceiro como prova oficial de toda regra do jogo. A página de [Caixas Imperiais do Garmoth](https://garmoth.com/imperial-crates/) também expõe maestria, caixas por entrega, CP e quantidade mínima de mercado, enquanto o explorador do Black Market não é uma calculadora de entrega imperial.

## Comparação dos concorrentes

| Produto e página pública consultada                                                              | Evidência e diferença útil                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop — Crafting Workshop do #1408](https://bdoworkshop.com/crafting-workshop/plan/1408) | Plano SA salvo para Fármaco da Harmonia - Edania. A interface oferece Buy All, Craft All e Best Profit/Hour, plano de produção, alternativas, quantidades, mercado e maestria. A observação exibiu 10.000 unidades, preço de 300.000.000, maestrias configuradas em 3.000, imposto 15,5%, custo de materiais faltantes de −1.975,24 bilhões, lucro de 576,33 bilhões e 1,03 bilhão/h em 562h15. Esses números não são pareados: quantidade, preço e maestria diferem do cenário local de 1.000 unidades e 280 milhões; não usei o resultado como validação do cálculo local. |
| [BDOLytics — Crafting Calculator](https://bdolytics.com/en/crafting?category=cooking)            | Página em inglês, região South America, com abas Cooking (152), Alchemy (92), Processing (424) e Imperial Crates. A lista expõe receita, insumos, Silver/Hour, preço, volume diário e experiência; as configurações consultadas mostraram Culinária 3.000, Alquimia 3.000 e Processamento 1.200, além de tempos. Isso ajuda a comparar receita por receita e contexto de mercado, mas seu ranking público não valida o plano SA/PT do Black Market sem igualar preços, maestria, yield, tempo e impostos.                                                                    |
| [BDO Codex — Professional’s Satisfying Dinner Meal](https://bdocodex.com/us/mrecipe/2100/)       | Página de referência de uma receita pública diferente, com ingredientes, saída base e calculadora simples por quantidade/preço. No momento da consulta, preço de mercado estava em NA/zero, custo de materiais era exibido e havia opções de imposto Premium 15,5% ou 35% e resultado garantido. É útil para consultar relações de receita; não foi encontrado nessa página um otimizador recursivo de cadeia ou lucro/hora comparável ao caso #1408.                                                                                                                        |
| [Garmoth — maestria e Caixas Imperiais](https://garmoth.com/mastery-brackets/processing)         | Tabelas por profissão permitem conferir pontos de maestria e resultados como itens por ação de Processamento. Culinária, Alquimia e Processamento fornecem comparação direta de brackets; a área de Caixas Imperiais é um fluxo separado. Não encontrei nessas páginas um planejador recursivo equivalente a Buy All/Craft All do item #1408.                                                                                                                                                                                                                                |

## Recomendações

1. Manter a consulta de produtores em lote e monitorar erros 429 na navegação de árvores grandes. Ela removeu a causa observada sem ampliar o limite de rate da API.
2. Completar rendimentos e tempos ausentes apenas com evidência do jogo, medições reproduzíveis ou confirmação explícita do usuário. Enquanto isso, conservar lucro/custo/hora como pendente.
3. Em uma próxima melhoria de interface, mostrar separadamente faturamento do produto final e retornos à venda, junto da origem do preço e do estoque. A tela já identifica “Referência”, informa que a cotação não garante transação e lista os retornos, mas uma decomposição ao lado do bruto reduziria interpretações equivocadas.
4. Em comparação futura de lucro/hora, alinhar mesma quantidade final, variante de receita, região, horário de cotação, preço e estoque, taxa, maestria, buffs, yield, tempo e política de venda de retornos. Sem isso, os números devem aparecer como exemplos de interfaces, não como ranking de precisão.

## Validação e limites

`pnpm check` passou. `pnpm test` passou com 85 testes de calculadoras, 272 da API (um skip), 942 da Web e 85 de scripts. `pnpm build` e `pnpm test:ssr` passaram; a build mantém os avisos conhecidos de locale `pt-BR`, orçamento de `recipe-tree.scss` e dependências CommonJS do Tesseract. No navegador local, a rota #1408 recarregou e as oito consultas `production/producers` da cadeia retornaram HTTP 200; o cenário “Fazer / coletar tudo” exibiu os nove nomes das pendências. A API foi consultada contra o dataset local SA/PT.

A comparação de sites foi visual e pública, sem acesso a conta alheia, endpoints privados ou alteração de dados. BDO Workshop usa plano salvo próprio; o exemplo do BDO Codex é outra receita; BDOLytics e Garmoth exibem seus próprios snapshots. Nenhum dos valores concorrentes é cotação simultânea ou gabarito de fórmula.
