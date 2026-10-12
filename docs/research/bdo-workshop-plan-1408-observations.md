# BDO Workshop: comparação observada em 1408

Inspeção de interface em 12/10/2026: https://bdoworkshop.com/crafting-workshop/plan/1408. Região EU, sem estoque importado, 1000 operações, fórmula x10, maestria alquimia/processamento 0, alquimia 1,1s, sucesso processamento 100%, peso vazio. Preços desta sessão não são cotações SA nem dados permanentes. O próprio site informa que está em construção.

| Cenário                                | Venda líquida | Materiais faltantes | Tempo   | Lucro   | Lucro/h |
| -------------------------------------- | ------------- | ------------------- | ------- | ------- | ------- |
| Buy all                                | 1580,15B      | 1177,01B            | 1h40m   | 403,14B | 241,88B |
| Craft all                              | 1585,81B      | 1421,46B            | 864h09m | 164,35B | 190,2M  |
| Best profit/hour, esgotados produzidos | 1584,84B      | 1437,57B            | 624h16m | 147,27B | 235,9M  |

## Verificado pela interface

- 1000 operações da fórmula selecionada geram aproximadamente 10000 unidades. Ela usa 60 óleos + 10 fármacos de grupo + 1 essência por operação. Não comparar com fórmula x1 sem normalizar ingredientes, produtos e tempo.
- Produto a 187M: receita bruta 1870B, após imposto exibido 15,5% = 1580,15B. Compra: 60000 óleos a 16,2M, 10000 fármacos a 20,5M e 1000 essências NPC a 10000 = 1177,01B. Lucro = venda líquida menos materiais; lucro/h = lucro dividido pelo tempo de produção. Valores exibidos arredondados.
- Buy all não elimina a produção final: 1000 operações de alquimia simples consomem 1h40m, consistente com 6s/operação. Isso foi confirmado em Manage crafts.
- Craft all marca intermediários produzíveis, compra insumos básicos; não exige parâmetros de coleta. Contempla preços de NPC, ingredientes equivalentes, reagentes e subprodutos. Mostra venda de subprodutos e trocas NPC para Mysterious Catalyst/Witch's Delicacy, distintos da venda do produto principal.
- Best profit/hour abre prévia e requer Apply to plan. A política de esgotados pode exigir produzir, permitir pré-ordem, ou produzir se não houve estoque nos últimos 3 dias. A lista mostra necessidade, oferta, vendas/dia e efeito de mudar cada decisão sobre lucro e lucro/h. Esses deltas observáveis não comprovam o algoritmo interno nem certificam busca global exata.
- Permitindo pré-ordem para esgotados, a prévia escolheu zero intermediários produzidos e coincidiu com Buy all. Tempo de espera para pré-ordens não aparece nesse tempo de produção; não interpretar o número como ganho realizável imediatamente.
- Com esgotados produzidos, plano misto tem oito intermediários: Pure Powder Reagent 76800, Legendary Beast's Blood 192000, Oil of Regeneration 480000, Clear Liquid Reagent 76800, Sinner's Blood 192000, Oil of Corruption 480000, Oil of Fortitude 480000 e Corrupt Oil of Immortality 60000 operações. Soma 2037600 operações de alquimia × 1,1s + 1000 × 6s final = 624h16m, compatível com painel. Melhor taxa apesar de lucro total inferior a Craft all.
- Maestria 1000 no mesmo plano, sem reotimizar decisões: lucro 178,80B, 532h57m, 335,5M/h. 5000 receitas do reagente: 12500 produtos em maestria 0 e aproximadamente 14143 em 1000; compatível com média 2,5 + 1,5 × 21,90% = 2,8285. Quantidades finais fixas preservadas.
- Dobrar tempo da alquimia de 1,1s para 2,2s mantém lucro 178,80B; tempo passa a 1064h15m e taxa a 168,0M/h. Etapa final de alquimia simples não dobra.
- Crafting settings oferece sucesso de processamento, peso livre, processamento do armazém e troca de subprodutos; maestria distingue nível de profissão para procs raros.

## Consequências para Black Market

Normalizar fórmulas em lote e contabilizar todos os tempos; integrar preços NPC/alternativas e subprodutos com evidências próprias. Separar simulação aos preços cotados de aquisição imediatamente disponível, com política explícita. Mostrar decisões mistas e efeito sobre taxa e lucro total. Não importar preços EU como SA, copiar pressupostos não verificados ou chamar o algoritmo deles de exato sem acesso ao código.

Captura local: output/playwright/workshop-buy-all.png. Tempos e seleção de maestria restaurados após os testes. Nenhuma alteração de código de cálculo nesta inspeção.
