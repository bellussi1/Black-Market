# Black Market

## Foco atual do MVP

Importação de até **8 capturas** de armazém, inventário e equipamentos, com comparação visual dos ícones, leitura numérica separada, revisão obrigatória e consolidação sem soma automática de repetidos. Mercado, catálogo e backup apoiam esse fluxo.

O [Recipe Explorer](docs/recipe-explorer.md) complementa esse fluxo: pesquise qualquer item, explore receitas e sub-receitas em uma árvore interativa, consulte fontes conhecidas e compare materiais faltantes com seu estoque e preços disponíveis. Rendimentos ausentes exigem um cenário informado; locais e coeficientes desconhecidos não são inventados.

Os outros módulos estão suspensos por uma configuração reversível, preservando o código. Consulte o [guia do MVP de capturas](docs/screenshot-mvp.md) para uso, arquitetura, testes, resultados medidos e limitações. O reconhecimento ainda exige confirmação manual de ícones compartilhados e contadores ilegíveis; não há uma métrica validada de precisão global dos IDs.

Plataforma independente de Black Desert Online voltada à comunidade brasileira, com SA e português brasileiro como padrões. O objetivo é oferecer consultas gratuitas de itens, receitas, mercado e estimativas de renda, com uma interface simples e planejamento personalizado a partir de materiais, prata, maestria e equipamentos. Veja a [visão do produto e etapas de entrega](docs/product-vision.md).

A base usa Angular 22, NestJS 12, PostgreSQL/Drizzle e Docker. Inclui catálogo central, receitas compartilháveis, referências do mundo, ferramentas de produção, aprimoramento/Caphras, equipamentos, profissões, mercado, planos, reservas e recomendações explicáveis. Prints geram rascunhos revisáveis de estoque, números e equipamentos no navegador. Login social e sincronização com controle de versão usam Google e Steam via Firebase quando configurados. A aplicação local tem dados importados; a publicação web e a ativação dos provedores ainda dependem de configuração externa.

Não há afiliação com a Pearl Abyss. O projeto não usa endpoints internos do BDOLytics ou do BDO Workshop. Os dois sites são referências de produto documentadas em [pesquisa de funcionalidades](docs/product-research.md).

O frontend usa Tailwind CSS 4 e SCSS modular, com Vitest para testes unitários e de componentes através do builder oficial do Angular. Consulte [padrões Angular, estilos e testes](docs/angular-architecture.md).

Veja também: [pesquisa ampliada das referências](docs/research/README.md), [consumo central de itens/imagens](docs/catalog-consumption.md), [importação de armazéns](docs/storage-import-strategy.md), [acessibilidade e leitura](docs/ui-accessibility-audit.md), [SEO e crawlers](docs/discovery-and-crawlers.md) e [espaços de publicidade](docs/advertising-layout.md).

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
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
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

## Escopo ampliado preservado no código

A tabela abaixo descreve os módulos anteriores. No MVP atual, `/gear` e `/storage` mostram equipamentos e estoque revisados; `/inventory` organiza itens por personagem e `/scans` recebe os lotes. Calculadoras, receitas, mundo e demonstração permanecem suspensos. Os protótipos de demonstração usam dados explicitamente simulados e não alimentam o mercado ou o estoque pessoal deste MVP.

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

Dados pessoais e presets são locais ao navegador por padrão. Login e sincronização opcionais estão preparados no código, mas exigem configurar e validar o provedor externo antes de oferecer contas. Cálculos usam o mesmo pacote de regras no frontend e backend. A [matriz de cobertura](docs/feature-coverage.md) descreve premissas, limites e recursos ainda dependentes de datasets. O [roadmap](docs/roadmap.md) define a ordem de evolução por uso esperado, valor e dependências. Não há fórmulas ou preços fictícios de equipamentos.

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

O sistema usa um monólito modular. O Angular tem SSR nas páginas públicas e renderização no cliente nas áreas pessoais. O Compose de produção reúne os runtimes Node de frontend/API, PostgreSQL e gateway no mesmo host, com Cloudflare como entrada planejada. Domínio e hospedagem pública ainda precisam ser configurados. Consulte [operação e publicação](docs/production-and-accounts.md) e a [auditoria de produção](docs/production-audit.md).

## Fontes e atualização de dados

O catálogo e as receitas são importados manualmente de arquivos gerados localmente pelo [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor), depois de verificar licença e termos aplicáveis. Isso não oferece atualização automática a cada patch: o pipeline deve executar novamente quando houver nova versão relevante do jogo e publicar um dataset versionado de forma atômica.

A tela de mercado consulta por ID a API comunitária Arsha nas regiões SA/NA/EU através do NestJS, com cache, timeout, validação e controle de chamadas. O Arsha não é uma API oficial da Pearl Abyss nem um feed de tempo real. Cotações podem ser guardadas no espaço pessoal com origem e horário. Consulte [pipeline e procedência](docs/data-pipeline.md).

## Documentação

- [Links úteis por funcionalidade e fontes de consulta](docs/research/useful-links.md)

- [Arquitetura](docs/architecture.md)
- [Padrões Angular, Tailwind, SCSS e Vitest](docs/angular-architecture.md)
- [Lint, formatação e organização](docs/code-quality.md)
- [Mercados e idiomas](docs/regions-and-locales.md)
- [Pesquisa BDOLytics e BDO Workshop](docs/product-research.md)
- [Banco de dados](docs/database.md)
- [API REST](docs/api.md)
- [Pipeline e fontes](docs/data-pipeline.md)
- [Funcionalidades e cobertura](docs/feature-coverage.md)
- [Checklist mestre de funcionalidades, origem e pendências](docs/project-feature-checklist.md)
- [Roadmap e prioridades de funcionalidades](docs/roadmap.md)
- [Fila de implementação e próximos prompts](docs/implementation-queue.md)
- [Império de nodes e trabalhadores](docs/worker-empire.md)
- [Calculadoras](docs/calculators.md)
- [Desenvolvimento](docs/development.md)
- [Deploy e custos](docs/deployment.md)

### Atualização e uso do catálogo

- [Como cadastrar seu armazém](docs/storage-tutorial.md)
- [Atualização do catálogo e limites de cobertura](docs/catalog-updates.md)
- [Inventário dos dados extraídos](docs/extracted-data-inventory.md)

## Preparação para produção

Para testes sem domínio e sem mensalidade de hospedagem, consulte [staging local com link temporário](docs/staging-local.md). O ambiente usa banco separado e frontend compilado; funciona enquanto o computador estiver ligado.

[Auditoria e checklist](docs/production-audit.md) · [Segurança](docs/security.md) · [Logs e uptime](docs/observability.md) · [Privacidade](docs/privacy-inventory.md) · [Footer e páginas legais](docs/legal-pages.md) · [Analytics](docs/analytics.md) · [Backup e recuperação](docs/backup-recovery.md).

Contato público informado: enzobellussi3@gmail.com. Responsável informado: Bellussi; identificação jurídica completa e documentos sujeitos à revisão. Integrações externas e domínio não estão ativados só por existir configuração no código.

Veja [segurança e infraestrutura implementadas](docs/security-hardening.md) para conta restrita PostgreSQL, limites de entrada, isolamento do Compose, testes e configuração manual de backups/produção.

## URLs e operação dos ambientes

O projeto tem desenvolvimento local e um staging isolado executado no computador do mantenedor. Não há domínio permanente de staging HTTPS nem URL pública de produção configurados.

### URLs locais

| Serviço                  | URL                                                                          | Disponibilidade                              |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------- |
| Aplicação Web            | [http://localhost:4200](http://localhost:4200)                               | `pnpm dev:web`                               |
| Catálogo                 | [http://localhost:4200/database/items](http://localhost:4200/database/items) | Web local                                    |
| API                      | [http://localhost:3000/api/v1](http://localhost:3000/api/v1)                 | `pnpm dev:api` ou overlay de observabilidade |
| Saúde da API             | [http://localhost:3000/health](http://localhost:3000/health)                 | API local                                    |
| Prontidão da API e banco | [http://localhost:3000/ready](http://localhost:3000/ready)                   | API local                                    |
| OpenAPI                  | [http://localhost:3000/api/docs](http://localhost:3000/api/docs)             | API local                                    |
| Métricas Prometheus      | [http://localhost:3000/api/v1/metrics](http://localhost:3000/api/v1/metrics) | Observabilidade local ativa                  |
| Grafana                  | [http://localhost:3001](http://localhost:3001)                               | `pnpm ops:local:observability`               |
| Prometheus               | [http://localhost:9090](http://localhost:9090)                               | `pnpm ops:local:observability`               |
| Adminer, somente leitura | [http://localhost:8082](http://localhost:8082)                               | `pnpm ops:local:db-viewer`                   |

O [guia local](docs/local-operations.md) descreve como iniciar/parar a observabilidade e obter a credencial local do Adminer. O overlay de observabilidade ocupa a porta `3000`; pare-o com `pnpm ops:local:observability:stop` antes de iniciar `pnpm dev:api` nessa porta.

### URLs de staging

| Serviço             | URL                                                          | Disponibilidade                                          |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| Aplicação Web       | [http://localhost:8081](http://localhost:8081)               | Staging ligado                                           |
| API via gateway     | [http://localhost:8081/api/v1](http://localhost:8081/api/v1) | Staging ligado; API e banco não publicam portas próprias |
| Saúde               | [http://localhost:8081/health](http://localhost:8081/health) | Staging ligado                                           |
| Prontidão com banco | [http://localhost:8081/ready](http://localhost:8081/ready)   | Staging ligado                                           |
| Quick Tunnel HTTPS  | `https://<hostname-impresso-pelo-Share>.trycloudflare.com`   | Temporário, muda a cada sessão                           |

O OpenAPI fica disponível no modo local de desenvolvimento e é desativado no runtime de produção usado pelo staging. O hostname HTTPS é emitido por `Share`, exige a allowlist de 1–10 e-mails e só funciona enquanto o túnel e o computador permanecerem ativos. Não registre esse endereço nem e-mails de testers no Git. Não há serviço de observabilidade ou conexão direta ao banco de staging expostos ao navegador.

Com Firebase/Steam configurados, os callbacks locais são `http://localhost:3000/api/v1/identity/steam/callback` (desenvolvimento) e `http://localhost:8081/api/v1/identity/steam/callback` (staging pelo gateway). Durante `Share`, o script ajusta o callback para a origem HTTPS temporária seguida de `/api/v1/identity/steam/callback`. O handler OAuth do Firebase segue o formato `https://<FIREBASE_AUTH_DOMAIN>/__/auth/handler`; não substitua o domínio pelo hostname temporário do Quick Tunnel.

### Passo a passo

#### Desenvolvimento local

Requisitos: Node.js 24.21.0, pnpm 10.28.1 e Docker Compose. Na raiz do projeto, configure e inicie o banco:

```powershell
nvm install 24.21.0
nvm use 24.21.0
corepack enable
corepack prepare pnpm@10.28.1 --activate
pnpm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d postgres
pnpm db:migrate
```

Em terminais separados, rode `pnpm dev:api` e `pnpm dev:web`; abra [http://localhost:4200](http://localhost:4200). Para parar sem remover dados, use `Ctrl+C` e `docker compose stop postgres`. Não use `docker compose down -v` se quiser preservar o volume do banco.

#### Staging local

Requer Docker Desktop e PowerShell 7 (`pwsh`). O script cria `.env.staging` com senhas locais aleatórias se o arquivo não existir. Na primeira utilização apenas, com o PostgreSQL local iniciado e `.env` configurado, copie schema e catálogo para o banco de staging vazio:

```powershell
pwsh -File scripts/staging.ps1 Seed
```

O `Seed` recusa um banco que já tenha tabelas e não copia workspaces, identidades ou histórico pessoal. Depois, tanto nessa configuração quanto nas próximas inicializações, use:

```powershell
pwsh -File scripts/staging.ps1 Start
pnpm test:staging
```

`Start` usa `.env.staging` e volumes separados, aplica migrations e valida o serviço. Consulte `pwsh -File scripts/staging.ps1 Status` para ver os containers. Para compartilhar com testers, instale `cloudflared` (Windows: `winget install --id Cloudflare.cloudflared --exact`) e rode:

```powershell
pwsh -File scripts/staging.ps1 Share -AllowedEmail pessoa1@example.com,pessoa2@example.com
```

Copie o endereço HTTPS impresso pelo comando. `Ctrl+C` encerra o túnel. `pwsh -File scripts/staging.ps1 Stop` para túnel e containers preservando banco, assets e backups. Comandos para logs, testes autenticados, backup e agenda estão em [staging local](docs/staging-local.md).

### Atualização, rollback e versão

Antes de atualizar, crie um commit Git atômico, confirme `git status --short` limpo e guarde o SHA retornado por `git rev-parse HEAD`. O script **não executa `git pull`**; ele compila o checkout atual. Valide e atualize:

```powershell
pnpm check
pnpm test
pnpm build
pwsh -File scripts/staging.ps1 Update
pnpm test:staging
Get-Content data/staging/images.json
```

`Update` gera uma imagem local `black-market:staging-<data-UTC>`, faz backup antes da troca quando já há imagem instalada, aplica migrations e verifica o serviço. `data/staging/images.json` guarda as tags `current` e `previous`; registre a tag da imagem junto ao SHA do commit para saber exatamente o código validado. O repositório não tem tags de release; `0.1.0` no `package.json` é metadado do workspace, não a versão implantada.

Se a falha for somente da aplicação e o schema ainda for compatível com a imagem anterior, execute:

```powershell
pwsh -File scripts/staging.ps1 Status
pwsh -File scripts/staging.ps1 Rollback
pnpm test:staging
```

`Rollback` também faz um backup e volta a imagem preservando o banco. Ele não desfaz migrations nem alterações de dados; confira `Status` e `images.json` antes de repetir, pois a ação alterna as tags anterior/atual. Uma migration incompatível exige recuperação separada: suspenda escritas, preserve o volume atual, valide um dump pelo [restore drill](docs/backup-recovery.md), restaure em novo volume/banco e só faça a troca depois de conferir dados, assets e smoke. Esse rollback de banco ainda não é automatizado. Nunca restaure sobre o único banco ou use `down -v`.

Migrations ficam versionadas em `packages/database`; revise-as antes do commit, use `pnpm db:check` e aplique localmente com `pnpm db:migrate`. O catálogo também tem versão: use um rótulo `--version` novo quando o conteúdo importado mudar; dump de banco não substitui os assets `data/assets/<checksum>`. `.env`, `.env.staging`, backups e dados privados não entram em commits. Backups de staging ficam no próprio computador em `data/staging/backups`, sem cópia externa cifrada ativa; consulte [backup e recuperação](docs/backup-recovery.md) para limites e procedimentos.
