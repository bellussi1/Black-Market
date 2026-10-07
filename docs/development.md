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
