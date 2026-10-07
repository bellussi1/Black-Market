# API

NestJS expõe REST JSON em `/api/v1`; o contrato OpenAPI fica em `/api/docs`. Não se usa tRPC. Os parâmetros serão validados com Zod nos limites do sistema e convertidos para DTOs/valores de domínio. Endpoints de busca devem ter paginação e limites explícitos.

## Disponível

| Rota          | Propósito                                                                       |
| ------------- | ------------------------------------------------------------------------------- |
| `GET /health` | Processo da API está ativo; não consulta banco                                  |
| `GET /ready`  | Confirma conexão com PostgreSQL; responde 503 se o banco não estiver disponível |
| `/api/docs`   | Swagger UI/OpenAPI                                                              |
| `GET /api/v1/items` | Busca itens do dataset ativo, com prefixo de nome, categoria, grau e paginação |
| `GET /api/v1/items/:id` | Detalhes de um item no dataset ativo |
| `GET /api/v1/items/:id/recipes` | Receitas que produzem ou usam um item (`direction=produces|uses`) |
| `GET /api/v1/categories` | Categorias do Central Market no dataset ativo |

Itens e categorias incluem a versão, checksum, região, idioma e horário de importação do dataset. Sem uma versão ativa, as rotas de coleção retornam listas vazias e `dataset: null`; a interface orienta a executar a importação local. A região padrão é `sa`; sem `locale`, a API prefere um dataset em inglês e depois a versão ativa mais recente. A busca de nomes usa prefixo para aproveitar o índice de texto. `pageSize` aceita de 1 a 100 e o padrão é 48. O endpoint de receitas retorna até 50 relações e informa o total.

O importador é um comando local; não existe rota pública para enviar datasets:

```powershell
pnpm --filter @bdo/api data:import -- --input "C:\bdo\extracted\data" --version "extractor-v0.1.9-patch-fingerprint" --region sa --locale en
```

O diretório deve conter `items.json`, `recipes.json` e `marketcategories.json` no formato publicado pelo [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor). A versão informada é imutável: conteúdo diferente exige um identificador novo.

## Contratos planejados

| Recurso  | Exemplos de rotas futuras                                                     |
| -------- | ----------------------------------------------------------------------------- |
| Mercado  | `GET /api/v1/market/items`, `GET /api/v1/market/items/:id/history?region=...` |
| Receitas | `GET /api/v1/recipes` para busca geral e paginação                              |
| Cálculos | `POST /api/v1/calculators/crafting`, `POST /api/v1/calculators/enhancement`   |

Estes exemplos são roadmap, não endpoints já implementados. Respostas de mercado devem incluir `source`, `region`, `observedAt` e `fetchedAt`; preço indisponível é `null`, nunca zero artificial. Erros seguem formato uniforme com status HTTP, código estável e mensagem segura. Erros de origem externa não revelam credenciais nem payload bruto.

## Compatibilidade e segurança

- Versionar mudanças incompatíveis no prefixo; campos novos compatíveis podem ser adicionados sem versão.
- Limitar tamanho de query e corpo, aplicar rate limit no edge/API e definir timeouts para upstream.
- CORS permite apenas `WEB_ORIGIN` configurado; autenticação e escrita de usuário ficam fora da fase inicial.
- Swagger descreve as rotas reais. Atualizar documentação e frontend junto com cada contrato.
