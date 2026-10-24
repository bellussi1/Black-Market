# Fármaco da Harmonia — Edania: correção de cobertura

Estado verificado em 24/10/2026. Para os custos, preços e auditoria dos ícones, veja o [relatório de auditoria](research/edania-harmony-audit-2026-10-24.md).

> A [revisão geral de 10/10/2026](recipe-review-2026-10-10.md) encontrou uma falha de seleção dos XMLs regionais no extractor. A correção específica de Edania descrita aqui não valida as quantidades nem a cobertura das demais receitas do catálogo; uma nova extração exige rever o suplemento antes de atualizar seu checksum.

O cliente atualizado em 9/10/2026 já continha os itens #1407–#1410 e suas descrições. A extração de `recipes.json`, porém, não continha nenhuma receita cujo resultado fosse um desses itens. O extractor monta receitas somente com os XMLs por item; `manufacture.json` contém grupos de ingredientes sem resultados. Importar o cliente novamente não preencheria essa relação ausente. O filtro de profissões já incluía `SIMPLE_ALCHEMY`.

A correção usa [um suplemento revisado](recipe-supplements/sa-pt-edania-recipes.json), aplicado pelo mesmo adaptador e publicador do catálogo. Ele exige o checksum exato da extração revisada, região/idioma e correspondência de ID/nome de cada referência. Não altera receitas presentes no cliente. A procedência de cada receita adicionada fica em `sourceData.verifiedRecipeSupplements` do item produzido; os bytes do suplemento também participam do checksum publicado. Uma extração diferente exige nova revisão do suplemento ou desativação explícita com `-RecipeSupplementPath ''`.

As [notas oficiais de 21/8/2025](https://www.sa.playblackdesert.com/PT-BR/News/Detail?groupContentNo=6639) confirmam a composição unitária e as substituições superiores. As [notas de 27/8/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8511) alteram o lote de 10 e acrescentam o de 100. As [notas de 8/10/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8694) corrigem as instruções nos catalisadores. A nota de 22/10/2026 não registra mudança da fórmula. IDs, nomes e composições foram confrontados com o cliente e o catálogo ativo.

| Item                                                     |                                             Relações adicionadas | Rendimento                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------: | -------------------------------------------- |
| #1407 [Grupo] Fármaco da Harmonia - Edania               |                     4 unitárias + 4 lotes de 10 + 4 lotes de 100 | 1 / 10 / 100                                 |
| #1408 [Grupo] Imortalidade: Fármaco da Harmonia - Edania | 2 unitárias + 2 lotes de 10, óleo comum #1178 ou de evento #1179 | 1 / 10                                       |
| #1409 Elixir de Edania                                   |                                                       1 alquimia | Desconhecido                                 |
| #1410 Elixir de Edania Poderoso                          |                  1 subproduto da alquimia + 2 conversões simples | Subproduto: desconhecido; conversões: 1 e 10 |

A composição normal de #1407 usa Fármaco da Harmonia #1399 ×1, Elixir de Edania #1409 ×3, Elixir da Vontade #702 ×3 e Catalisador Mágico #820936 ×1. As variantes superiores usam #1410 ou #703 na proporção 1:3.

O lote atual de 10 usa #1399 ×10, #1409 ×30, #702 ×30 e #821372 ×1, sem Essência de Ibellab. O lote de 100 usa #1399 ×100, #1409 ×300, #702 ×300, #821372 ×10 e #4986 ×1. As quatro composições de cada tamanho representam as duas escolhas superiores na proporção 3:1. O endpoint ativo retornou 12 receitas para #1407 (quatro por rendimento); os rendimentos fixos vêm das composições exatas em `recipe-fixed-yields.ts`, já que o campo de saída do catálogo está vazio. As quatro receitas de 100 estão no catálogo ativo fora do suplemento, que complementa a extração com as fórmulas unitárias e de 10. A produção comum de #1409 e a chance de #1410 continuam variáveis e não foram inferidas.

O dataset ativo verificado foi importado em 18/10/2026: 74.523 itens, 10.683 receitas, versão `sa-pt-meta-11e938d92a61-loc-72e54f5dc932-ext-5bf11bd7-bin-60bd5677-catalog-catalog-v3-supp-37cd81cf`, checksum `e9a59310fb4d0b1d0039b5439360d943b3b50d3a02d3faa9c20ed7d1ecae8bed`.

Publicação histórica de 10/10/2026 às 05:30:30 UTC: 74.287 itens, 4.420 receitas, versão `sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-80ebbce2-catalog-catalog-v3-supp-cd06294d`, checksum `2cf91933839c35a0abd2f6e0b6e2fd2234fc1ac9cb997f9b9b6adac6da85c47b`.

Backup anterior: `data/backups/catalog-edania-20261010T052919-dd932c27c11348598b2cc2923bef659d.dump` (51.527.887 bytes; SHA-256 `2f96aeeee8f8cdac66d09379271eaaeadf416d9069e64c3ecee36052ee31737e`). Catálogo anterior preservado como versão arquivada; nenhum estoque pessoal foi alterado. Ícones, referências e índice de reconhecimento foram publicados para o novo checksum.

Para reproduzir a publicação e conferência:

```powershell
./scripts/sync-game-catalog.ps1 -ExtractorPath ./data/tools/bdo-catalog-extractor.exe -RecipeCatalogOnly
./scripts/sync-game-catalog.ps1 -ExtractorPath ./data/tools/bdo-catalog-extractor.exe -RecipeCatalogOnly -CheckOnly
```

Naquela publicação, `-CheckOnly` confirmou `importNeeded: false` e a API retornou oito receitas que produziam #1407. A consulta atual, com o patch oficial de agosto aplicado, retorna 12.

O novo `GET /api/v1/production/catalog` resolve uma versão uma única vez e lê todas as relações dessa versão imutável. Retorna receitas completas e os itens únicos com nomes, peso, categorias, imagens e procedência. A execução real do serviço retornou 3.228 receitas, 1.468 itens únicos e nenhuma referência de material/produto ausente; JSON de 4,60 MB em 221 ms. Preços são consultados separadamente.

O endpoint de preços de produção consulta somente IDs presentes na versão selecionada. Armas, armaduras, acessórios e itens com aprimoramento são excluídos antes da chamada ao provedor: um resumo de preços não determina o nível de um equipamento. O cache de produção comporta 24 lotes e é separado do cache de 15 páginas do mercado, evitando expulsar os 15 lotes de uma leitura completa quando outra página é visitada.

Validação: 124 testes de API, incluindo 16 regressões focadas no adaptador e snapshot e duas para elegibilidade dos preços e retenção dos lotes; typecheck, build e lint dos arquivos alterados passaram. Os testes preservam rendimentos ausentes, subprodutos, referências de ingredientes e associação de todos os dados à mesma versão.
