# Contagens do catálogo de receitas

Conferido em 10/10/2026 contra a extração regional, o endpoint local e o banco do staging. As contagens variam conforme a etapa e o tipo de relação; não são métricas intercambiáveis.

## Dataset ativo em staging

Versão `sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-60bd5677-catalog-catalog-v3-supp-30288a9c`, checksum `774bceba02a1536c940963c0a5fd992e11131157f82664e0e9f13c7f228f2987`.

| Etapa/escopo                             | Contagem | Definição                                                                                         |
| ---------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| Relações brutas regionais                |   13.313 | Relações emitidas pelo extractor antes de quarentena                                              |
| Referências inválidas em quarentena      |      292 | Relações que apontavam para IDs fora do catálogo de itens                                         |
| Relações válidas antes da normalização   |   13.021 | Brutas menos a quarentena                                                                         |
| Receitas distintas normalizadas          |   10.683 | Deduplicação por chave de fórmula; composições e relações de subproduto distintas são preservadas |
| Receitas no banco ativo                  |   10.685 | 10.683 normalizadas mais duas fórmulas revisadas no suplemento, com rendimento desconhecido       |
| Receitas de Life Skills no endpoint      |    7.016 | `GET /api/v1/production/catalog` e `GET /api/v1/recipes`; inclui 203 relações de subproduto       |
| Fórmulas elegíveis na tela Recomendações |    6.813 | As 7.016 de Life Skills após retirar 203 relações de subproduto; todas têm entradas e saídas      |

As 7.016 de Life Skills agrupam 1.341 de culinária, 2.225 de alquimia, 2.335 de processamento e 1.115 de caixas imperiais. O endpoint filtra tipos de Life Skills do dataset maior. A tela filtra relações de subproduto porque a linha representa material obtido junto de outra produção, não uma fórmula independente para a decisão de produzir.

## Por que a extração antiga dizia 4.406

A primeira extração SA/pt, documentada em 08/10, tinha 5.063 relações brutas. A normalização deduplicou 657 e deixou 4.406 chaves distintas: 3.214 de Life Skills, 1.175 de `HOUSE` e 17 de `GUILD`. Esse número era mais antigo e abrangia categorias diferentes. Ele não é a contagem atual do banco nem a contagem que a UI recebe.

## Reprodução da verificação

No staging local:

```powershell
Invoke-RestMethod http://localhost:8081/api/v1/production/catalog
Invoke-RestMethod 'http://localhost:8081/api/v1/recipes?page=1&pageSize=1'
```

O primeiro endpoint devolveu `dataset.recipeCount = 10685` e 7.016 linhas. O segundo devolveu `total = 7016`. A tela calcula 6.813 pela mesma regra de `productionRecipes()` em `apps/web/src/app/features/recommendations/recommendations-page.ts`: remover `byproductOfItemId` e exigir `inputs` e `outputs`.

A extração atual teve 13.313 relações brutas; 292 inválidas ficaram em quarentena, 10.683 chaves foram normalizadas e duas fórmulas revisadas foram adicionadas pelo suplemento. A auditoria final e o versionamento estão em [tiers e receitas regionais](tiers-and-regional-recipes.md) e [atualização do catálogo](recipe-catalog-update.md). Os dados extraídos continuam locais e ignorados pelo Git.
