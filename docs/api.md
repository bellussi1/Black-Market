# API

NestJS expõe REST JSON em `/api/v1`; o contrato OpenAPI fica em `/api/docs`. Não se usa tRPC. Os parâmetros serão validados com Zod nos limites do sistema e convertidos para DTOs/valores de domínio. Endpoints de busca devem ter paginação e limites explícitos.

## Disponível

| Rota                                            | Propósito                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /health`                                   | Processo da API está ativo; não consulta banco                                  |
| `GET /ready`                                    | Confirma conexão com PostgreSQL; responde 503 se o banco não estiver disponível |
| `/api/docs`                                     | Swagger UI/OpenAPI                                                              |
| `GET /api/v1/items`                             | Busca itens do dataset ativo, com prefixo de nome, categoria, grau e paginação  |
| `GET /api/v1/items/:id`                         | Detalhes de um item no dataset ativo                                            |
| `GET /api/v1/items/:id/icon?dataset=<checksum>` | Ícone WebP local, versionado pelo checksum; 404 se ausente                      |
| `GET /api/v1/items/:id/recipes`                 | Receitas que produzem ou usam um item (`direction=produces` ou `uses`)          |
| `GET /api/v1/categories`                        | Categorias do Central Market no dataset ativo                                   |

Itens e categorias incluem a versão, checksum, região, idioma e horário de importação do dataset. Sem uma versão ativa, as rotas de coleção retornam listas vazias e `dataset: null`; a interface orienta a executar a importação local. A região padrão é `sa`; sem `locale`, a API prefere português e depois inglês na mesma região. A busca de nomes usa prefixo para aproveitar o índice de texto. `pageSize` aceita de 1 a 100 e o padrão é 48. O endpoint de receitas retorna até 50 relações, informa o total e preserva `byproductOfItemId` quando o resultado é um subproduto. Quantidade ausente é `null`.

O importador é um comando local; não existe rota pública para enviar datasets:

```powershell
pnpm --filter @bdo/api data:import -- --input "C:\bdo\extracted\data" --version "extractor-v0.1.9-patch-fingerprint" --region sa --locale en
```

O diretório deve conter `items.json`, `recipes.json` e `marketcategories.json` no formato publicado pelo [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor). A versão informada é imutável: conteúdo diferente exige um identificador novo.

O parâmetro opcional `--assets <pasta>` publica ícones de itens da saída `icons` antes de ativar o catálogo. `CATALOG_ASSETS_DIR` deve apontar para essa pasta ao iniciar a API. O endpoint de imagens valida checksum, ID e caminho no manifesto, serve apenas WebP e usa cache imutável; não expõe os outros arquivos da extração. Consulte [extração local](local-extraction.md).

## Calculadoras e mercado disponíveis

- POST /api/v1/calculators/:tool: market, crafting, production, enhancement, failstack, box, activity, investment, training e gear.
- GET /api/v1/market/items/:id?region=sa: consulta Arsha por ID; regiões SA/NA/EU. Retorna variantes, preço base nullable, estoque, total de trades, última venda, source, region, fetchedAt, upstreamCacheMinutes e cacheStatus (fetched/cached/stale).

As calculadoras recebem os modelos definidos em packages/calculators/src/models.ts e retornam tool/modelVersion/source/result. Os modelos são compartilhados com o Angular. Erros Zod viram HTTP 400; nome de ferramenta não reconhecido retorna 404.

Mercado: cache em memória por 30 minutos, máximo de 200 itens/regiões, duas consultas simultâneas e até 20 novas consultas por minuto em cada processo. Pedidos simultâneos da mesma chave compartilham a chamada. Timeout de oito segundos; corpo do provedor limitado a 128 KB e validado. Preço base zero é indisponível. Se uma consulta expirada falhar, devolve a última resposta válida como stale, preservando fetchedAt e adiando a próxima tentativa por um minuto. Não há polling por navegador, ingestão de todo o catálogo ou histórico global persistido. MARKET_PROVIDER_ENABLED=false desativa saída para o provedor.

## Contratos planejados

| Recurso  | Exemplos de rotas futuras                                                     |
| -------- | ----------------------------------------------------------------------------- |
| Mercado  | `GET /api/v1/market/items`, `GET /api/v1/market/items/:id/history?region=...` |
| Receitas | `GET /api/v1/recipes` para busca geral e paginação                            |

Estes exemplos são roadmap, não endpoints já implementados. Respostas de mercado devem incluir `source`, `region`, `observedAt` e `fetchedAt`; preço indisponível é `null`, nunca zero artificial. Erros seguem formato uniforme com status HTTP, código estável e mensagem segura. Erros de origem externa não revelam credenciais nem payload bruto.

## Compatibilidade e segurança

- Versionar mudanças incompatíveis no prefixo; campos novos compatíveis podem ser adicionados sem versão.
- Limitar tamanho de query e corpo, aplicar rate limit no edge/API e definir timeouts para upstream.
- CORS permite apenas `WEB_ORIGIN` configurado; autenticação e escrita de usuário ficam fora da fase inicial.
- Swagger descreve as rotas reais. Atualizar documentação e frontend junto com cada contrato.

## Mercado e idioma

SA é o mercado padrão. O mercado recebe locale (pt por padrão) e separa cache por região, ID e idioma. O catálogo recebe preferredLocale=pt para seleção com fallback na mesma região; locale continua uma seleção exata. A resposta informa o idioma real do dataset. Detalhes em [mercados e idiomas](regions-and-locales.md).
