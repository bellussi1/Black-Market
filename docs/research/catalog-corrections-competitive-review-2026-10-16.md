# Revisão atual de correções — catálogo de peixes, ingredientes e consumíveis

**Consulta:** 16/10/2026 · região-alvo: SA · cliente local: extração SA/pt de 10/10/2026 · patch oficial SA mais recente encontrado: 15/10/2026.

## Resultado para a implementação

Não encontrei nesta rodada uma correção de receita, preço NPC ou ícone que possa ser aplicada com evidência primária atual sem adivinhar.

- A API já publica preço de compra NPC somente quando o registro tem `buyPrice > 0` e `vendors.urns`. Na extração local, Sal `#9001 = 20`, Açúcar `#9002 = 20` e Água Mineral `#9059 = 30`; Codex confirma Água Mineral `#9059 = 30` e o vendedor. Os valores de Sal e Açúcar também estão nos dados locais com descrição de compra em vendedor de comida/pousada.
- A extração contém ícones para os 513 registros na categoria `Fish`, mas 114 dos 308 itens filtrados como `forTrade=true` e sem `marketable=true` não têm relação `DRY` nessa extração. A categoria também inclui itens que não são necessariamente peixes pescáveis. Ausência de `DRY` não autoriza inventar equivalente seco.
- A inspeção dos 114 sem `DRY` separa 47 peixes explicitamente utilizáveis em Culinária, 62 peixes descritos como “Espécie Tesouro”, 2 peixes de comércio sem descrição de uso culinário (`#8382` Guaravira Gigante e `#8495` Baiacu Obscuro) e 3 recursos coletados no fundo do mar (`#6512`, `#6517`, `#6519`). Portanto, 111 dos 114 são capturas de pesca; os outros 3 são coleta subaquática. Nenhum dos 114 aparece como entrada ou saída direta de receita na extração.
- Todos os 114 já têm caminho de ícone no registro, alias `urn::item:<id>` e arquivo WebP resolvido no manifesto de assets local. A lacuna nesse grupo é o vínculo de processamento/preço equivalente, não a imagem.
- Os itens `#9738` Carne de Perna Traseira de Gazela e `#9740` Carne da Perna de Gárgula estão marcados `ghost: true`, sem campo `icon`, sem alias exato `urn::item:9738`/`urn::item:9740` e sem caminho DDS equivalente na lista de arquivos do cliente. Os aliases que contêm esses dígitos pertencem a outros itens e não são correspondências. Não há imagem oficial correspondente para publicar.
- A relação de substituição de peixe seco não é uma razão única: a UI oficial atual confirma a categoria “peixe processado/desidratado” como substituta e alerta que substitutos podem exigir quantidades adicionais; o Codex descreve diferenças entre item/qualidade e exibe pesos diferentes no grupo `#5101`. Como a página oficial não dá a razão por ID e a extração do cliente não expõe essa tabela numérica, `quantityRatio: 1` não foi alterado nesta entrega.
- Não é possível afirmar quais consumíveis de Culinária/Alquimia de SA dão mais lucro ou volume agora. Os resultados recentes de BDOLytics abertos nesta consulta mostram região North America; o caminho SA não abriu. Garmoth mostrou seletor EU e métricas vazias na visão geral; o detalhe público consultado também não tinha dados de preço/volume. A rota do BDO Workshop não foi carregada pelo leitor web. A captura do Workshop fornecida pelo usuário é evidência histórica de interface, não de valores correntes. O endpoint local de cotações havia retornado `503` em 16/10 por erro/bloqueio upstream, registrado em `ACTIVE_CONTEXT.md` §139.

## Comparação competitiva e limites observados

### BDO Workshop

- Plano público consultado: [plano 9601](https://bdoworkshop.com/crafting-workshop/plan/9601%20buy%20all%20craft%20all%20best%20profit-hour). A abertura direta falhou nesta consulta; busca pública não retornou conteúdo útil para confirmar entradas, preço atual, tempo ou volume.
- A captura do usuário mostra saída líquida, materiais ausentes, tempo de craft, lucro, lucro/h e estratégias “Buy all / Craft all / Best profit/hour”. Isso é observação da interface fornecida anteriormente, não prova de fórmula nem de vendas atuais.
- Sem validação independente do resultado pareado de qualquer consumível SA nesta rodada.

### BDO Codex

- [Água Mineral #9059](https://bdocodex.com/us/item/9059/): página pública atual encontrada mostra ícone, compra por Food Vendor/Innkeeper e preço NPC 30. Isso corrobora o registro local, mas o Codex é referência de dados secundária; o preço também está confirmado pelo extrato do cliente.
- [Receita Steamed Fish #148](https://bdocodex.com/us/recipe/148/): mostra materiais e quantidades da receita, mas o cabeçalho ressalva que skill afeta materiais e resultados; não foi tratado como prova completa das quantidades SA atuais.
- [Dried Saurel #8509](https://bdocodex.com/us/item/8509/) diz que requer o dobro para Culinária em comparação com a forma não seca. [Grupo #5101](https://bdocodex.com/us/materialgroup/5101/) contém itens e valores de substituição distintos, inclusive peixes secos. Isso indica que não se deve generalizar um único fator, mas não substitui a confirmação numérica atual por ID no cliente SA.
- As páginas de catálogo expõem itens, ícones, relações, descrições, preço NPC e exemplos do mercado de outras regiões. Elas não fornecem ranking atual de lucro/volume da SA.

### BDOLytics

- [Calculadora de Culinária](https://bdolytics.com/en/cooking) e [calculadora de Alquimia](https://bdolytics.com/en/alchemy): a ferramenta é apresentada para comparar a rentabilidade das receitas. A captura indexada atual nesta consulta das páginas de mercado mostra região North America, não SA.
- [Mercado — Refeição Especial de Serendia #9604](https://bdolytics.com/en/market/item/9604?page=1): exibe preço, volume diário, estoque, total de negociações e histórico; o snapshot retornado é explicitamente North America. Não usar esse snapshot para classificar SA.
- A rota de mercado de Culinária/Alquimia com prefixo `/en/SA/` não foi acessível por esta consulta. Não foi confirmado se a indisponibilidade é permanente ou específica da ferramenta de pesquisa.

### Garmoth

- [Mercado](https://garmoth.com/market): define “Popular Items” por favoritos/acompanhamentos nos últimos 15 dias e “Trending Items” por volume de vendas relativo ao estoque. A visão pública abriu com região EU; nesta captura, totais e item mais vendido estavam vazios.
- [Lã #5858](https://garmoth.com/market/item/5858/0): o detalhe público abriu, mas o painel EU retornou sem preço, estoque, média vendida diária ou último preço. O site oferece esses conceitos, porém esta resposta não fornece observação utilizável para SA.
- Não foi encontrado ranking de lucro de receitas comparável na superfície consultada.

## Fonte primária do jogo e regra de cálculo

- [Guia oficial de Culinária de Black Desert SA](https://www.sa.playblackdesert.com/es-Mx/Wiki?wikiNo=27), seção “What is a substitute?”: confirma que existe substituição por categoria, lista `Fish` e `Processed Fish` (“Dried (processed) fish”) separadamente e avisa que alguns substitutos exigem quantidades adicionais. O guia não declara uma razão numérica geral por peixe.
- [Notas oficiais do patch SA de 15/10/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?countryType=pt-BR&groupContentNo=8726): versão corrente consultada; a seção de Culinária/Alquimia não apresentou correção de fórmula/preço de ingrediente relevante ao caso. A lista de novidades do patch não substitui extração atualizada do cliente.
- [Notas oficiais SA de 28/05/2026 — preços máximos de Mercado Central](https://www.sa.playblackdesert.com/pt-BR/News/Notice/Detail?groupContentNo=8007): informa alterações de limites máximos para muitos peixes desidratados. Esses tetos não são cotação corrente nem preço mínimo, e não podem servir como ranking de procura.
- O extrato SA/pt versionado de 10/10 é evidência direta dos campos do cliente incluídos (`buyPrice`, `vendors`, `forTrade`, `marketable`, descrições, ícones e relações encontradas), mas é anterior ao patch de 15/10 e não traz a tabela numérica de substituições de Culinária. Deve ser atualizado antes de anunciar cobertura final.

## Verificação da instalação local e dos 114 registros sem `DRY`

- Foi localizada a instalação Steam SA/pt em `C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online`. O manifesto Steam indica `buildid=25802025`; `service.ini` identifica `TYPE=SA` e `RES=_PT_`.
- O `Paz/pad00000.meta` instalado tem SHA-256 `2e188c2680c18212b8a90672701dba8e2561dc0137a779baf30896e7e62e241e`; `ads/languagedata_pt.loc` tem SHA-256 `7e729a315ce68aba60c3a1dd718d31f9c25918a99a9752c898a9d1f10851bcfe`. Ambos coincidem com a extração indicada por `data/current-extraction.txt` e registrada em `provenance.json`.
- A extração ativa registra SHA do executável `60bd5677…`, enquanto `data/tools/bdo-data-extractor.exe` no workspace tem SHA `08eba316…` (ambos indicam o commit-fonte `5bf11bd7…`). Os dados da extração correspondem ao mesmo cliente PAZ/LOC instalado, mas uma regeneração deve registrar o hash do binário realmente usado para confirmar a reprodutibilidade do pipeline.
- Essa instalação e extração são de 09–10/10/2026, seis dias antes das notas oficiais de 15/10/2026. Logo, são a fonte primária do cliente SA/pt atualmente instalado, mas não comprovam o estado pós-patch. Não foi localizada uma versão do cliente posterior a essa data no computador.
- Dos 114 registros `category=Fish`, `forTrade=true`, `marketable!=true` sem entrada em uma receita `DRY`: 47 descrições afirmam uso culinário; 62 dizem “Espécie Tesouro”; `#8382` descreve Guaravira Gigante vendida a comerciantes; `#8495` descreve Baiacu Obscuro sazonal, vendido a preço alto, mas sem método de captura estruturado; e 3 são recursos subaquáticos obtidos com Enxada, não capturas de peixe.
- As 62 espécies Tesouro também são peixes pescáveis, mas suas descrições indicam venda a comerciante por valor alto, não uso em Culinária. Não as tratei como variantes secas nem como subprodutos. Nenhum dos 114 possui entrada/saída direta em `recipes.json`; em particular, a extração não contém os vínculos que permitiriam mapear os 47 peixes culinários à cotação de seus equivalentes secos.
- A extração contém 299 receitas `DRY`; 194 dos 308 candidatos `forTrade` sem `marketable=true` participam de uma delas. A ausência de `DRY` nos outros 114 é dado observado, não autorização para associar itens por nome, raridade ou aparência.
- `extractor-dataset.ts` preserva o campo `icon` e os dados originais do item; `catalog-assets.ts` publica os aliases de ícone por URN. Isso explica a cobertura visual completa dos 114 no snapshot local. Já a relação de preço equivalente usa somente relações diretas `DRY`; o pipeline não extrai um grupo de substituição/ equivalência numérica de Culinária.
- Os 114 registros têm `buyPrice > 0`, mas nenhum tem `vendors.urns`. A API só publica preço NPC quando há preço positivo e vendedor listado (`npcPurchasePriceFromCatalog`). Por isso o número bruto não foi rotulado como preço confirmado de compra NPC. Não foi encontrada nessa extração uma relação de vendedor que confirme esse papel para os peixes.
- Para `#9738` e `#9740`, o manifesto `asset_redirects.json` não tem chave de URN exata, `items.json` não define campo de ícone e a lista `data/paz_files.json` não contém caminho `00009738` ou `00009740`. Outros itens com esses dígitos dentro de IDs maiores são equipamento/roupa sem relação e não fornecem arte correspondente.

### O que pode ser implementado com essa evidência

- Manter os 114 ícones já catalogados no snapshot. Não há correção de imagem pendente nesse subconjunto.
- Expor a lacuna de associação `DRY` por ID e reextrair após atualizar o cliente SA/pt. Até haver o vínculo explícito no cliente atualizado ou uma relação oficial equivalente, não completar os equivalentes secos por inferência.
- Não classificar `buyPrice` desses peixes como custo/preço NPC confirmado até a fonte do cliente também listar o vendedor ou outra semântica de preço autorizada.
- Manter ícone ausente nos dois itens ghost; a instalação atual e suas extrações não contêm a imagem correspondente.

## Classificação das afirmações

| Afirmação                                                                           | Classificação                                | Uso permitido nesta entrega                                                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Sal/Açúcar/Água Mineral têm os preços locais informados e vendedores listados       | Dados observados no extrato SA/pt local      | Continuar calculando como custos NPC; nenhuma alteração de valor necessária        |
| Peixe desidratado é uma categoria substituta em Culinária                           | Regra observada no guia oficial SA           | Documentar como elegibilidade de substituto, sem razão numérica universal          |
| Alguns peixes secos precisam de quantidade maior, com diferenças por item/qualidade | Evidência secundária do Codex/grupo de dados | Bloquear fator fixo não verificado; confirmar com client SA por ID antes de editar |
| Determinado consumível é atualmente mais lucrativo ou mais vendido em SA            | Não verificado                               | Não criar lista/ranking nem score combinado                                        |
| Os dois itens ghost devem compartilhar ícone de uma carne semelhante                | Hipótese sem evidência                       | Não copiar ícone aproximado nem associar ícone por nome/categoria                  |

## Próximos passos que dependem de evidência

1. Atualizar/extrair o cliente SA após o patch de 15/10 e comparar IDs, traduções, receitas, ícones e preços com a versão de 10/10.
2. Encontrar uma fonte autorizada e atual de SA com preço, estoque, unidade de volume e período definido. Só então comparar receitas com entradas pareadas (maestria, tempo, retorno, imposto, insumos, política de coleta/compra e timestamp).
3. Obter os valores de substituição do cliente SA por ID/qualidade e adicionar regressões por peixe branco/verde/azul e fruto do mar antes de alterar `quantityRatio`.
4. Para `#9738` e `#9740`, aguardar ícones do cliente/asset oficial ou uma fonte cuja licença permita incorporação. Até lá, manter ícone ausente e deixar isso visível como lacuna de catálogo.

## Arquivos de código

Nenhum arquivo de produção, pacote de dados, ícone, banco, migration ou cálculo foi alterado: as lacunas identificadas não têm evidência suficiente para uma correção segura. A API de preço NPC já valida preço positivo e relação de vendedor, e as regressões de receita existentes não mostraram uma divergência confirmada na auditoria regional anterior.
