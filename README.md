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
