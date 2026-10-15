# Revisão de segurança — Black Market

**Data:** 15/10/2026
**Base:** revisão estática do checkout, banco PostgreSQL local de staging, compose local e CI. Nenhum banco de produção foi localizado ou consultado.

## Resumo executivo

O runtime local tem autenticação Firebase com verificação de revogação, autorização de workspace derivada da UID no servidor, payload validado, cache privado desativado e uma role PostgreSQL sem poderes administrativos. O staging agora está atualizado, isolado por banco e sem linhas de usuários/workspaces. Isso não permite afirmar que a produção está segura: a configuração do host e banco produtivos não foi identificada. Recomendo tratar a ausência de RLS e a falta de criptografia/destino externo de backup como itens a resolver antes de guardar dados reais.

## Achados por prioridade

### Médio

#### SBP-001 — Defesa de tenant depende apenas dos filtros da API

- Evidência: [`workspace.service.ts`](../apps/api/src/workspace/workspace.service.ts:12) deriva filtros do owner e valida com `workspaceSchema`; [`runtime-role.sql`](../deploy/runtime-role.sql:18) dá `SELECT` ao runtime em todas as tabelas.
- Verificação direta do banco local: zero tabelas com RLS e 21 grants `SELECT` à role `black_market_app`; essa role não é superuser e não tem memberships.
- Impacto: uma rota futura com filtro `user_id` incorreto pode permitir leitura cross-tenant pela role de runtime.
- Mitigação recomendada: ativar RLS para tabelas pessoais, definir owner transacional não controlável pelo cliente e reduzir os grants de leitura para o conjunto necessário. Cobrir acesso cruzado com testes de integração usando duas contas.

#### SBP-002 — Backups locais não são cifrados pelo script

- Evidência: [`backup-database.ps1`](../scripts/backup-database.ps1:22) calcula SHA-256 e grava manifest; a documentação mantém dumps em `data/staging/backups` ([`staging-local.md`](staging-local.md:83)).
- Impacto: SHA-256 detecta alteração, mas não impede leitura do dump se o host/cópia for acessado. A criptografia integral do disco não foi verificada.
- Mitigação recomendada: cifrar os dumps e usar destino externo com ACL/MFA, além de testar restauração e acompanhar falhas.

### Bloqueador de prontidão para produção

#### SBP-003 — Configuração do banco e do runtime de produção não verificada

- Evidência: `.env.production` não existe neste checkout e não foi identificado um banco de produção associado ao Black Market. O Compose de produção é apenas configuração declarativa.
- Impacto: não foi possível confirmar grants reais, TLS, regras de rede, gestão/rotação de secrets, snapshots ou política de backup do serviço que receberia dados reais.
- Próximo passo: inspecionar o ambiente real de deploy por acesso de leitura; confirmar banco e Firebase separados, API sem credencial administrativa, portas privadas, TLS e backups protegidos antes de publicar.

## Correções realizadas nesta revisão

- **SBP-004 — Compartilhamento fail-open do staging:** `Share` agora exige de 1 a 10 emails únicos e válidos antes de iniciar túnel; ver [`staging-guards.ps1`](../scripts/staging-guards.ps1:1) e [`staging.ps1`](../scripts/staging.ps1:153). Commit local `0ae1814`.
- **SBP-005 — Dados pessoais no seed:** o dump de staging exclui `user_workspaces`, `auth_users`, `auth_identities`, tentativas/trocas de Steam e dados de mercado; ver [`staging-guards.ps1`](../scripts/staging-guards.ps1:21). A consulta ao banco staging atual encontrou zero linhas nas três tabelas de identidade/workspace. Commit local `0ae1814`.
- **SBP-006 — Advisory em dependência de produção:** fixado `@grpc/grpc-js` em `1.14.6`; `pnpm audit --prod --audit-level high` retorna `No known vulnerabilities found`. Commit local `36e559b`.
- **SBP-007 — Rebuild de staging:** criado orçamento de build próprio com otimização de produção, mantendo avisos quando passa de 500 KB inicial ou 16 KB por estilo; erros de staging em 1,1 MB/40 KB. Os limites estritos de produção não foram alterados. Imagem atualizada e migrations aplicadas; sem login social configurado.

## Controles positivos observados

- Firebase ID tokens são verificados com checagem de revogação em [`firebase-auth.service.ts`](../apps/api/src/workspace/firebase-auth.service.ts:24).
- Endpoints de workspace exigem token e retornam `private, no-store` em [`workspace.controller.ts`](../apps/api/src/workspace/workspace.controller.ts:21).
- CORS é limitado à origem web e parsers têm limites explícitos em [`main.ts`](../apps/api/src/main.ts:33).
- Role da API é `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`; migrations usam etapa separada em [`runtime-role.sql`](../deploy/runtime-role.sql:13) e [`docker-compose.staging.yml`](../docker-compose.staging.yml:47).
- API/web staging têm filesystem read-only, capabilities removidas e `no-new-privileges`; PostgreSQL não publica porta e gateway usa loopback em [`docker-compose.staging.yml`](../docker-compose.staging.yml:84).
- `.env*` é ignorado pelo Git e pelo contexto Docker ([`.gitignore`](../.gitignore:5), [`.dockerignore`](../.dockerignore:6)); não encontrei arquivos `.env` versionados.

## Verificações executadas

- Staging: rebuild em modo otimizado concluído com imagem `black-market:staging-20261015013234`; migrações e permissões aplicadas; `pnpm test:staging` passou (HTTP, SSR, catálogo, ícone, noindex); `/ready` e `/` responderam HTTP 200.
- PostgreSQL staging: role runtime sem superuser/membership; zero usuários, vínculos sociais e workspaces; 21 grants `SELECT`; zero tabelas com RLS.
- Dependências de produção: auditoria sem advisories conhecidos.
- Guards: teste PowerShell passou para lista vazia, limite 10, duplicados, email inválido e exclusão dos dados de usuário no seed.
- Nesta revisão: `pnpm test` passou em nova execução (870); `pnpm check` passou; build otimizado `production,staging` passou. Uma execução monorepo anterior apresentou três falhas nos testes de cookies, que passaram isolados (7/7), na suíte Web (521/521) e na repetição integral (870/870); não alterei o código de analytics.
- Não abri Quick Tunnel. Não fiz login Firebase/Steam real, deploy externo, alteração no banco de produção nem push Git.
