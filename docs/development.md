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
pnpm check
pnpm test
pnpm build
pnpm test:ssr
pnpm db:check
```

CI roda essas verificações para pull requests e pushes. O lint da API compila primeiro os pacotes compartilhados para disponibilizar seus tipos em uma instalação limpa. Use `pnpm lint:fix` e depois `pnpm format` para aplicar correções; lint focado Angular usa `pnpm --filter @bdo/web exec ng lint` (ou `ng lint --fix`); `pnpm check` executa lint, formatação e tipos. Regras e abrangência estão em [Qualidade de código](#qualidade-de-código). Ao adicionar funcionalidade, incluir teste de domínio, teste de endpoint/contrato e, se houver schema, verificar SQL e downgrade/recuperação operacional quando aplicável.

## Ambiente

Variáveis documentadas em `.env.example`; valores de produção são secretos do provedor e não entram no Git. O container Postgres local tem credenciais descartáveis para desenvolvimento. Antes de expor qualquer serviço, trocar credenciais e restringir origens.

## Desenvolvimento inteiramente no Docker

Use docker compose --profile web up --build -d para iniciar API, banco e frontend em http://localhost:4200. O frontend usa Node 24.21.0 do Dockerfile e recebe mounts somente dos fontes; node_modules do Windows não é montado no Linux. Mudanças nos fontes Angular são refletidas no dev server. Após modificar regras compartilhadas, reinicie web para reconstruir o pacote. Refaça o build da imagem após mudar dependências ou backend.

As ferramentas pessoais independem do extractor. Para testar manualmente, preencha campos do mercado/crafting/enhancement ou registre materiais. Os dados locais de teste pertencem à origem (host + porta) do navegador. Use outra porta para QA se não quiser misturar com seu espaço pessoal.

O conector GitHub pode ter permissões diferentes do Git Credential Manager. O remoto atual é https://github.com/bellussi1/Black-Market.git, privado. A pasta local e o banco existentes conservam seus nomes físicos; não mova volumes para acompanhar uma mudança de marca.

O Docker Compose usa o projeto black-market e o volume nomeado black-market-postgres-data por padrão. Para aproveitar uma instalação local anterior, defina POSTGRES_DATA_VOLUME com o nome exato do volume existente e POSTGRES_DATA_EXTERNAL=true no seu .env antes de iniciar. Volumes externos são preservados pelo Compose, inclusive ao usar down -v. Neste ambiente, o valor local aponta para sitedebdo_postgres_data; a mudança de nome não criou outro banco nem apagou o volume.

## Qualidade de código

### Ferramentas

- ESLint 10.12.0: regras de código no frontend, API e pacotes compartilhados.
- angular-eslint 22.5.0: regras Angular e acessibilidade em templates externos e inline.
- typescript-eslint 8.71.1: regras TypeScript; a API também usa análise baseada em tipos.
- simple-import-sort: organização automática de imports e exports.
- unused-imports: detecção e remoção automática de imports sem uso.
- Prettier 3.8.1: formatação de TypeScript, templates Angular, SCSS/CSS, JSON, YAML e Markdown.

Escolhemos ESLint/angular-eslint pela cobertura específica de Angular, incluindo seus templates e convenções. O Biome tem formatação HTML experimental e suporte a SCSS ainda incompleto conforme sua [matriz oficial de linguagens](https://biomejs.dev/introduction/language-support/). Usamos Prettier como comando separado do lint, seguindo sua [orientação de integração](https://prettier.io/docs/integrating-with-linters).

### Regras e alcance

`config/eslint-shared.mjs` concentra regras comuns. `eslint.config.mjs` na raiz cobre fontes e configurações dos pacotes e configurações JavaScript da raiz. Cada aplicação mantém sua configuração específica: Angular no frontend; Node/NestJS com análise de tipos na API.

Imports e exports devem estar ordenados. Imports sem uso, `any` explícito, variáveis sem uso, `var` e comparações frouxas são rejeitados. Imports exclusivamente de tipos usam `import type`; o typescript-eslint considera os metadados de decorators ao analisar arquivos NestJS. Parâmetros intencionalmente não utilizados podem começar com `_`.

O Angular exige prefixo `app`, componentes OnPush, injeção por `inject()` e controle de fluxo atual nos templates. As regras de acessibilidade incluem rótulos e interação por teclado. Uma regra de imports impede que o frontend importe `@bdo/database` ou arquivos da API/infraestrutura PostgreSQL diretamente; a comunicação passa pela API e contratos compartilhados.

Na API, promises sem tratamento e argumentos de tipo inseguro são erros. Os pacotes necessários são compilados antes do lint da API para que a análise encontre suas declarações em uma instalação limpa. Todos os comandos ESLint exigem zero warnings.

Prettier define largura de 100 colunas, aspas simples, vírgulas finais e LF. `.editorconfig` aplica UTF-8, dois espaços e LF; `.gitattributes` normaliza texto no Git. Os estilos SCSS são formatados pelo Prettier, sem um linter semântico de estilos nesta configuração.

Dependências, build, cache, coverage, migrations geradas, extrações locais e arquivos de ambiente são excluídos quando aplicável. Excluir arquivos gerados evita alterar dados de migration ou arquivos do jogo ao executar `format`.

### CI

A CI verifica instalação pelo lockfile, lint, formatação, tipos, testes Vitest, build e migrations. `lint` e `format:check` apenas verificam arquivos. Configurações são versionadas para manter o mesmo resultado no editor, desenvolvimento e CI. Supressões de regras devem ser locais, justificadas e revisadas; não desative uma regra globalmente apenas para ocultar um erro.
