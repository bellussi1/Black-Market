# BDO Companion

Projeto pessoal e independente de ferramentas para Black Desert Online. O monólito modular usa Angular 22, API REST em NestJS 12 e PostgreSQL com Drizzle ORM. Já inclui catálogo pesquisável de itens, categorias e receitas, com importação local versionada do extractor. Mercado, crafting com custos e calculadoras avançadas seguem no roadmap.

Não há afiliação com a Pearl Abyss. O projeto não usa endpoints internos do BDOLytics ou do BDO Workshop. Os dois sites são referências de produto documentadas em [pesquisa de funcionalidades](docs/product-research.md).

## Requisitos

- Windows, macOS ou Linux
- Node.js 24.21.0 (via NVM) e pnpm 10.28.1
- Docker com Docker Compose para PostgreSQL local

```powershell
nvm install 24.21.0
nvm use 24.21.0
corepack enable
corepack prepare pnpm@10.28.1 --activate
pnpm install
Copy-Item .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev:api
```

Em outro terminal:

```powershell
pnpm dev:web
```

Abra `http://localhost:4200`. A API fica em `http://localhost:3000`, readiness em `/ready` e documentação OpenAPI em `/api/docs`.

O catálogo fica em `http://localhost:4200/database/items`. Sem extração importada, a página explica como carregar uma. Para gerar os arquivos, siga o [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor) numa máquina com uma cópia legítima do jogo. Depois de subir a API e aplicar migrations, importe o diretório local:

```powershell
pnpm --filter @bdo/api data:import -- --input "C:\bdo\extracted\data" --version "extractor-v0.1.9-patch-fingerprint" --region sa --locale en
```

Use um rótulo novo em `--version` quando o conteúdo mudar. O importador calcula um checksum, valida referências e troca o catálogo ativo numa transação; os arquivos extraídos não são incluídos no repositório. O extractor lista nomes localizados em inglês, alemão, francês e espanhol; a interface permanece em português.

Para subir PostgreSQL, migration e API como containers (em vez de executar a API no host), use `docker compose up --build`. O Angular segue em `pnpm dev:web`.

## Comandos

| Comando                         | Uso                                         |
| ------------------------------- | ------------------------------------------- |
| `pnpm dev:web` / `pnpm dev:api` | Angular e Nest em desenvolvimento           |
| `pnpm lint` / `pnpm typecheck`  | Qualidade estática                          |
| `pnpm test`                     | Testes unitários                            |
| `pnpm build`                    | Build de API e frontend                     |
| `pnpm db:generate`              | Gerar migration Drizzle após alterar schema |
| `pnpm db:migrate`               | Aplicar migrations versionadas              |
| `pnpm db:check`                 | Validar journal e migrations Drizzle        |
| `docker compose up -d postgres` | Iniciar PostgreSQL local                    |
| `pnpm --filter @bdo/api data:import -- --input <pasta> --version <versão>` | Importar catálogo local |

## Estrutura

```text
apps/web/          Angular SPA
apps/api/          NestJS REST API
packages/shared/   Contratos comuns
packages/domain/   Tipos do jogo
packages/calculators/ Aritmética reutilizável
packages/database/ Schema Drizzle e migrations
docs/              Arquitetura, dados, API, deploy e pesquisa dos sites
```

O sistema começa como monólito modular. A SPA é estática e pode ir para Cloudflare Pages. A API NestJS precisa de runtime Node.js e fica num host de containers/Node; PostgreSQL é gerenciado separadamente ou hospedado junto da API. Docker Compose é para desenvolvimento local. Detalhes e alternativas de custo estão em [deploy](docs/deployment.md).

## Fontes e atualização de dados

O catálogo e as receitas são importados manualmente de arquivos gerados localmente pelo [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor), depois de verificar licença e termos aplicáveis. Isso não oferece atualização automática a cada patch: o pipeline deve executar novamente quando houver nova versão relevante do jogo e publicar um dataset versionado de forma atômica.

Não foi confirmada uma API pública oficial da Pearl Abyss para o mercado. O endpoint comunitário de Arsha observado é uma possibilidade de integração a validar, não uma dependência garantida. Consulte [pipeline e procedência](docs/data-pipeline.md). Até existir uma fonte testada e autorizada, o produto não exibe preços simulados.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Pesquisa BDOLytics e BDO Workshop](docs/product-research.md)
- [Banco de dados](docs/database.md)
- [API REST](docs/api.md)
- [Pipeline e fontes](docs/data-pipeline.md)
- [Calculadoras](docs/calculators.md)
- [Desenvolvimento](docs/development.md)
- [Deploy e custos](docs/deployment.md)
