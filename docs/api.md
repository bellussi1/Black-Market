# API

NestJS expõe REST JSON em `/api/v1`; o contrato OpenAPI fica em `/api/docs`. Não se usa tRPC. Os parâmetros serão validados com Zod nos limites do sistema e convertidos para DTOs/valores de domínio. Endpoints de busca devem ter paginação e limites explícitos.

## Disponível na fase inicial

| Rota          | Propósito                                                                       |
| ------------- | ------------------------------------------------------------------------------- |
| `GET /health` | Processo da API está ativo; não consulta banco                                  |
| `GET /ready`  | Confirma conexão com PostgreSQL; responde 503 se o banco não estiver disponível |
| `/api/docs`   | Swagger UI/OpenAPI                                                              |

## Contratos planejados

| Recurso  | Exemplos de rotas futuras                                                     |
| -------- | ----------------------------------------------------------------------------- |
| Catálogo | `GET /api/v1/items`, `GET /api/v1/items/:id`, `GET /api/v1/categories`        |
| Mercado  | `GET /api/v1/market/items`, `GET /api/v1/market/items/:id/history?region=...` |
| Receitas | `GET /api/v1/recipes`, `GET /api/v1/items/:id/recipes`                        |
| Cálculos | `POST /api/v1/calculators/crafting`, `POST /api/v1/calculators/enhancement`   |

Estes exemplos são roadmap, não endpoints já implementados. Respostas de mercado devem incluir `source`, `region`, `observedAt` e `fetchedAt`; preço indisponível é `null`, nunca zero artificial. Erros seguem formato uniforme com status HTTP, código estável e mensagem segura. Erros de origem externa não revelam credenciais nem payload bruto.

## Compatibilidade e segurança

- Versionar mudanças incompatíveis no prefixo; campos novos compatíveis podem ser adicionados sem versão.
- Limitar tamanho de query e corpo, aplicar rate limit no edge/API e definir timeouts para upstream.
- CORS permite apenas `WEB_ORIGIN` configurado; autenticação e escrita de usuário ficam fora da fase inicial.
- Swagger descreve as rotas reais. Atualizar documentação e frontend junto com cada contrato.
