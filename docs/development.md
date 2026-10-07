# Desenvolvimento local

## Inicialização

```powershell
nvm install 24.21.0
nvm use 24.21.0
corepack enable
corepack prepare pnpm@10.28.1 --activate
pnpm install
Copy-Item .env.example .env
docker compose up -d postgres
pnpm db:migrate
```

Em terminais separados, executar `pnpm dev:api` e `pnpm dev:web`. O Angular usa `http://localhost:4200`; a API usa `http://localhost:3000`. `/ready` consulta o banco.

## Importar catálogo local

Instale e execute o [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor) contra a instalação legítima do jogo. Com a API e o banco ativos, informe o diretório que contém `items.json`, `recipes.json` e `marketcategories.json`:

```powershell
pnpm --filter @bdo/api data:import -- --input "C:\bdo\extracted\data" --version "extractor-v0.1.9-patch-fingerprint" --region sa --locale en
```

O rótulo de versão deve ser novo quando o conteúdo dos JSONs mudar. O checksum é calculado automaticamente; JSONs e ícones extraídos são dados locais e não devem ser adicionados ao Git.

Como alternativa, `docker compose up --build` sobe PostgreSQL, aplica migrations e executa a API em container; nesse modo, deixe `pnpm dev:api` parado e mantenha `pnpm dev:web` para desenvolver a SPA.

## Alterar banco

Editar `packages/database/src/schema.ts`, rodar `pnpm db:generate`, revisar o SQL gerado e adicionar a migration ao Git. Aplicar com `pnpm db:migrate`. Migrations de produção são aplicadas uma vez por release; não usar `push` em produção.

## Verificações

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:check
```

CI roda essas verificações para pull requests e pushes. Ao adicionar funcionalidade, incluir teste de domínio, teste de endpoint/contrato e, se houver schema, verificar SQL e downgrade/recuperação operacional quando aplicável.

## Ambiente

Variáveis documentadas em `.env.example`; valores de produção são secretos do provedor e não entram no Git. O container Postgres local tem credenciais descartáveis para desenvolvimento. Antes de expor qualquer serviço, trocar credenciais e restringir origens.

## Desenvolvimento inteiramente no Docker

Use docker compose --profile web up --build -d para iniciar API, banco e frontend em http://localhost:4200. O frontend usa Node 24.21.0 do Dockerfile e recebe mounts somente dos fontes; node_modules do Windows não é montado no Linux. Mudanças nos fontes Angular são refletidas no dev server. Após modificar regras compartilhadas, reinicie web para reconstruir o pacote. Refaça o build da imagem após mudar dependências ou backend.

As ferramentas pessoais independem do extractor. Para testar manualmente, preencha campos do mercado/crafting/enhancement ou registre materiais. Os dados locais de teste pertencem à origem (host + porta) do navegador. Use outra porta para QA se não quiser misturar com seu caderno pessoal.

O conector GitHub pode ter permissões diferentes do Git Credential Manager. O remoto atual é https://github.com/bellussi1/Black-Market.git, privado. A pasta local e o banco existentes conservam seus nomes físicos; não mova volumes para acompanhar uma mudança de marca.

O Docker Compose usa o projeto black-market e o volume nomeado black-market-postgres-data por padrão. Para aproveitar uma instalação local anterior, defina POSTGRES_DATA_VOLUME com o nome exato do volume existente e POSTGRES_DATA_EXTERNAL=true no seu .env antes de iniciar. Volumes externos são preservados pelo Compose, inclusive ao usar down -v. Neste ambiente, o valor local aponta para sitedebdo_postgres_data; a mudança de nome não criou outro banco nem apagou o volume.

Verificação desta entrega: lint, typecheck, testes e build completos em Node 24.21.0 no Docker; 39 testes aprovados (13 nas regras, 15 na API, 11 no Angular). Consulta HTTP real ao Arsha via API validou preço/estoque de um item negociado em SA, cache na segunda chamada, readiness e resultado de imposto com Value Pack. O build de produção registrou 326,04 kB brutos e 85,26 kB de transferência estimada no pacote inicial. As rotas de ferramentas são lazy.

A inspeção visual automatizada da aba de prévia foi rejeitada pela política da ferramenta por protocolo de URL não permitido. Não foi substituída por outra automação de navegador. Testes de componentes verificaram preenchimento/cálculo, captura de cotação/procedência, separação regional do estoque, expiração de buffs e confirmação de importação de backup.
