# Black Market

Projeto pessoal e independente para Black Desert Online. Angular 22, NestJS 12, PostgreSQL/Drizzle e Docker. Já inclui ferramentas de mercado e imposto, crafting e cadeias de materiais, enhancement e failstacks, gear, sessões de life skill, projetos, RNG boxes e buffs. Funcionam com entradas do usuário enquanto o catálogo do jogo não é importado.

Não há afiliação com a Pearl Abyss. O projeto não usa endpoints internos do BDOLytics ou do BDO Workshop. Os dois sites são referências de produto documentadas em [pesquisa de funcionalidades](docs/product-research.md).

O frontend usa Tailwind CSS 4 e SCSS modular, com Vitest para testes unitários e de componentes através do builder oficial do Angular. Consulte [padrões Angular, estilos e testes](docs/angular-architecture.md).

## Requisitos

O foco inicial é **SA e português brasileiro**. Mercados e idiomas têm configurações independentes, com i18n nativo do Angular e preferência por dados em português quando disponíveis. Consulte [mercados e idiomas](docs/regions-and-locales.md).

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

Use um rótulo novo em `--version` quando o conteúdo mudar. O importador calcula um checksum, valida referências e troca o catálogo ativo numa transação; os arquivos extraídos não são incluídos no repositório. A instalação SA da Steam permite extrair nomes em português com `--lang pt`. A primeira importação local contém 74.216 itens, 212 categorias e 4.406 receitas distintas. Consulte [extração local, ícones e atualização após patches](docs/local-extraction.md) para reproduzir o fluxo com Docker.

Para subir também o Angular com o Node fixado no Docker, use `docker compose --profile web up --build -d`. Abra `http://localhost:4200`. O volume existente do PostgreSQL é preservado; o nome físico do banco continua `bdo_companion` por compatibilidade.

## Ferramentas disponíveis sem o jogo

| Rota         | Recurso                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| /market      | Consulta Arsha por ID, imposto, cotações, favoritos e histórico pessoal           |
| /crafting    | Lucro de receita, presets e cadeias recursivas de materiais                       |
| /enhancement | Chance/custo por horizonte, pity configurável, failstack e registro de tentativas |
| /gear        | Builds e comparação de alternativas de upgrade                                    |
| /lifeskills  | Sessões, prata/hora/energia, payback de mastery e estimador de XP                 |
| /storage     | Estoque por local/região, metas, CSV e projetos de materiais                      |
| /rng         | Valor esperado de caixas/ofertas de Night Vendor com chances próprias             |
| /buffs       | Biblioteca pessoal, grupos exclusivos, combinações e timers                       |
| /settings    | Exportação/importação validada do backup pessoal                                  |

Dados pessoais e presets são locais ao navegador; não há login/sincronização nessa versão. Cálculos usam o mesmo pacote de regras no frontend e backend. A [matriz de cobertura](docs/feature-coverage.md) descreve premissas, limites e recursos ainda dependentes de datasets. Não há fórmulas ou preços fictícios de equipamentos.

## Comandos

| Comando                                                                    | Uso                                         |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| `pnpm dev:web` / `pnpm dev:api`                                            | Angular e Nest em desenvolvimento           |
| `pnpm lint` / `pnpm typecheck`                                             | Qualidade estática                          |
| `pnpm test`                                                                | Testes unitários                            |
| `pnpm build`                                                               | Build de API e frontend                     |
| `pnpm db:generate`                                                         | Gerar migration Drizzle após alterar schema |
| `pnpm db:migrate`                                                          | Aplicar migrations versionadas              |
| `pnpm db:check`                                                            | Validar journal e migrations Drizzle        |
| `docker compose up -d postgres`                                            | Iniciar PostgreSQL local                    |
| `pnpm --filter @bdo/api data:import -- --input <pasta> --version <versão>` | Importar catálogo local                     |

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

A tela de mercado consulta por ID a API comunitária Arsha nas regiões SA/NA/EU através do NestJS, com cache, timeout, validação e controle de chamadas. O Arsha não é uma API oficial da Pearl Abyss nem um feed de tempo real. Cotações podem ser guardadas no caderno pessoal com origem e horário. Consulte [pipeline e procedência](docs/data-pipeline.md).

## Documentação

- [Arquitetura](docs/architecture.md)
- [Padrões Angular, Tailwind, SCSS e Vitest](docs/angular-architecture.md)
- [Lint, formatação e organização](docs/code-quality.md)
- [Mercados e idiomas](docs/regions-and-locales.md)
- [Pesquisa BDOLytics e BDO Workshop](docs/product-research.md)
- [Banco de dados](docs/database.md)
- [API REST](docs/api.md)
- [Pipeline e fontes](docs/data-pipeline.md)
- [Funcionalidades e cobertura](docs/feature-coverage.md)
- [Calculadoras](docs/calculators.md)
- [Desenvolvimento](docs/development.md)
- [Deploy e custos](docs/deployment.md)
