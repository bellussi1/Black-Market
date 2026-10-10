# Fármaco da Harmonia — Edania: correção de cobertura

O cliente atualizado em 9/10/2026 já continha os itens #1407–#1410 e suas descrições. A extração de `recipes.json`, porém, não continha nenhuma receita cujo resultado fosse um desses itens. O extractor monta receitas somente com os XMLs por item; `manufacture.json` contém grupos de ingredientes sem resultados. Importar o cliente novamente não preencheria essa relação ausente. O filtro de profissões já incluía `SIMPLE_ALCHEMY`.

A correção usa [um suplemento revisado](recipe-supplements/sa-pt-edania-recipes.json), aplicado pelo mesmo adaptador e publicador do catálogo. Ele exige o checksum exato da extração revisada, região/idioma e correspondência de ID/nome de cada referência. Não altera receitas presentes no cliente. A procedência de cada receita adicionada fica em `sourceData.verifiedRecipeSupplements` do item produzido; os bytes do suplemento também participam do checksum publicado. Uma extração diferente exige nova revisão do suplemento ou desativação explícita com `-RecipeSupplementPath ''`.

As [notas oficiais de 21/8/2025](https://www.sa.playblackdesert.com/PT-BR/News/Detail?groupContentNo=6639) confirmam a composição normal, substituição por elixires superiores e conversões de Edania. As [notas de 8/10/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8694) registram a correção das instruções de Edania nos dois catalisadores. IDs, nomes e composições foram confrontados com o cliente instalado.

| Item                                                     |                                           Relações adicionadas | Rendimento                                   |
| -------------------------------------------------------- | -------------------------------------------------------------: | -------------------------------------------- |
| #1407 [Grupo] Fármaco da Harmonia - Edania               | 4 normais + 4 lotes com Catalisador Mágico Concentrado #821372 | Normal: 1; lote atual: desconhecido          |
| #1408 [Grupo] Imortalidade: Fármaco da Harmonia - Edania |                  2, usando óleo comum #1178 ou de evento #1179 | 1                                            |
| #1409 Elixir de Edania                                   |                                                     1 alquimia | Desconhecido                                 |
| #1410 Elixir de Edania Poderoso                          |                1 subproduto da alquimia + 2 conversões simples | Subproduto: desconhecido; conversões: 1 e 10 |

A composição normal de #1407 usa Fármaco da Harmonia #1399 ×1, Elixir de Edania #1409 ×3, Elixir da Vontade #702 ×3 e Catalisador Mágico #820936 ×1. As variantes superiores usam #1410 ou #703 na proporção 1:3.

O grupo atual `manufacture` #16582 usa #1399 ×10, #1409 ×30, #702 ×30 e #821372 ×1. Sua quantidade de resultado não é exposta nessa tabela e continua ausente. A composição histórica de 2025 com Catalisador Mágico ×10 e Essência de Ibellab ×1 não foi republicada como receita atual. Nenhuma probabilidade ou rendimento de alquimia foi inferido.

Publicado em 10/10/2026 às 05:30:30 UTC: 74.287 itens, 4.420 receitas, versão `sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-80ebbce2-catalog-catalog-v3-supp-cd06294d`, checksum `2cf91933839c35a0abd2f6e0b6e2fd2234fc1ac9cb997f9b9b6adac6da85c47b`.

Backup anterior: `data/backups/catalog-edania-20261010T052919-dd932c27c11348598b2cc2923bef659d.dump` (51.527.887 bytes; SHA-256 `2f96aeeee8f8cdac66d09379271eaaeadf416d9069e64c3ecee36052ee31737e`). Catálogo anterior preservado como versão arquivada; nenhum estoque pessoal foi alterado. Ícones, referências e índice de reconhecimento foram publicados para o novo checksum.

Para reproduzir a publicação e conferência:

```powershell
./scripts/sync-game-catalog.ps1 -ExtractorPath ./data/tools/bdo-catalog-extractor.exe -RecipeCatalogOnly
./scripts/sync-game-catalog.ps1 -ExtractorPath ./data/tools/bdo-catalog-extractor.exe -RecipeCatalogOnly -CheckOnly
```

`-CheckOnly` confirmou `importNeeded: false`. A API ativa encontrou #1407 e #1408 sem acentos na busca de profissões, retornou 10 resultados na busca de receitas e 8 receitas que produzem #1407.

O novo `GET /api/v1/production/catalog` resolve uma versão uma única vez e lê todas as relações dessa versão imutável. Retorna receitas completas e os itens únicos com nomes, peso, categorias, imagens e procedência. A execução real do serviço retornou 3.228 receitas, 1.468 itens únicos e nenhuma referência de material/produto ausente; JSON de 4,60 MB em 221 ms. Preços são consultados separadamente.

O endpoint de preços de produção consulta somente IDs presentes na versão selecionada. Armas, armaduras, acessórios e itens com aprimoramento são excluídos antes da chamada ao provedor: um resumo de preços não determina o nível de um equipamento. O cache de produção comporta 24 lotes e é separado do cache de 15 páginas do mercado, evitando expulsar os 15 lotes de uma leitura completa quando outra página é visitada.

Validação: 124 testes de API, incluindo 16 regressões focadas no adaptador e snapshot e duas para elegibilidade dos preços e retenção dos lotes; typecheck, build e lint dos arquivos alterados passaram. Os testes preservam rendimentos ausentes, subprodutos, referências de ingredientes e associação de todos os dados à mesma versão.
