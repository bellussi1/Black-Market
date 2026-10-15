# Segurança e infraestrutura fundamentais do MVP

Entrega de 08/10/2026, após auditoria da revisão `56b073f`. Preserva Angular, Nest, PostgreSQL e Compose. Sem bibliotecas novas, Redis, Kubernetes ou serviços pagos.

## Controles novos

| Área               | Controle                                                                                                                                                  | Arquivos                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Banco              | Conta `black_market_app` separada do proprietário/migrador; catálogo somente leitura; INSERT/UPDATE em user_workspaces; INSERT/DELETE em market_snapshots | deploy/runtime-role.sql, docker-compose.production.yml                                              |
| Isolamento pessoal | RLS habilitado e forçado em `user_workspaces`; contexto `app.user_id` limitado à transação autenticada; sem privilégio DELETE para a role da API          | packages/database/drizzle/0010_user_workspaces_rls.sql, apps/api/src/workspace/workspace.service.ts |
| Inicialização      | API de produção recusa superusuário, criação de bancos/roles/schema, replicação, bypass RLS, propriedade de tabelas e memberships                         | apps/api/src/database/runtime-role.ts, database.service.ts, main.ts                                 |
| Entrada            | JSON de até 256 KB em requisições comuns e 20 MB somente nas rotas de workspace; erro 413 sem conteúdo original                                           | operations/http-policy.ts, main.ts, deploy/nginx.conf                                               |
| CORS/CSRF          | Origem exata, sem cookies credenciados; escrita pessoal de origem estrangeira ou Sec-Fetch-Site=cross-site recusada                                       | operations/http-policy.ts, request-controls.ts                                                      |
| Frequência         | 30/min/IP em workspace, mercado e calculadoras; 10/min em telemetria; 240/min em demais consultas; health, preflight e ícones preservados                 | request-controls.ts, deploy/nginx.conf                                                              |
| Configuração       | URLs públicas sem credenciais/query/fragmento; origem pública sem caminho; conexão PostgreSQL; imagens externas HTTPS em produção                         | config/env.schema.ts, .env.example                                                                  |
| Isolamento         | Rede interna do banco separada da rede de entrada; API é a ponte; frontend/gateway sem acesso direto ao banco                                             | docker-compose.production.yml                                                                       |
| Operação           | Health checks de web/gateway e APP_IMAGE configurável para releases imutáveis                                                                             | docker-compose.production.yml                                                                       |
| Recuperação        | Restore exige manifesto, nome e SHA-256 válidos; dump externo sem manifesto exige opção explícita AllowUnverified                                         | scripts/restore-drill.ps1                                                                           |
| Linux              | Backup via pg_dump, gravação parcial/atômica, manifesto, diretório privado, lock e retenção opcional 7 diários + 4 semanais                               | scripts/backup-database.sh                                                                          |
| CI                 | Mensagens pt-BR regeneradas para remover divergência de extração; gate permanece ativo                                                                    | apps/web/src/locale/messages.pt-BR.xlf                                                              |

## Controles existentes revisados e preservados

- Identidade verificada por Firebase Admin no servidor; Google exige provider data confirmado e Steam exige OpenID validado mais UID mapeada. O proprietário nunca vem do corpo da requisição. Sincronização usa parâmetros SQL, lock e controle de versão. Exclusão preserva apenas referência operacional para impedir restauração silenciosa por cliente antigo.
- Zod nos contratos, limites de listas/valores e renderização Angular como texto. Teste de armazém confirma que nome contendo HTML não cria elemento executável. Não aplicar substituição genérica de caracteres a todos os campos.
- CSP com scripts próprios/OCR permitido, sem unsafe-inline de scripts; framing bloqueado, nosniff, Permissions-Policy e HSTS/upgrade para configuração HTTPS.
- Sessão de autenticação em sessionStorage/PKCE e Authorization Bearer. **Não é cookie HttpOnly.** Não introduzimos uma sessão paralela. Um XSS ainda poderia acessar o token: mitigação exige CSP, escape e controle de scripts; revisão real de navegador continua necessária.
- Cookie de região com SameSite=Lax e Secure em HTTPS; preferências funcionais/privacidade separadas de analytics. Não há cookie de autenticação automaticamente enviado ao Nest.
- Filtro global, logs por lista permitida e respostas sem stack, SQL, senha, token ou corpo original. Secrets fora do Git/contexto Docker; configuração inválida informa apenas nomes de campos.

## Configuração manual de produção

1. Configure `.env.production` privado, domínio HTTPS, `PUBLIC_SITE_URL`, volume exclusivo e duas credenciais do banco. `POSTGRES_APP_PASSWORD` deve ser aleatória, longa e diferente da administrativa. Codifique caracteres especiais da senha na RUNTIME_DATABASE_URL. Nunca publique `docker compose config` resolvido; use `config --quiet`.
2. Use `APP_IMAGE` com tag de revisão ou digest existente, guardando a imagem anterior. Migração recebe CONTAINER_DATABASE_URL; API recebe apenas RUNTIME_DATABASE_URL. A aplicação de desenvolvimento permanece compatível com o banco local existente, sem impor alteração de credencial local.
3. Banco novo: migrar, restaurar catálogo e publicar assets antes de abrir a entrada. Reexecute permissions após novas tabelas ou restauração. Imports administrativos são operações do mantenedor, não endpoints públicos; o gate de papel é aplicado no bootstrap do servidor API.
4. Configure Tunnel no host para `127.0.0.1:8080`. A configuração Nginx pressupõe HTTPS externo e somente essa entrada confiável. Não exponha o gateway diretamente na internet nem reutilize a configuração de IP/protocolo em outro proxy sem revisão.
5. Configure projetos Firebase separados para staging e produção. Habilite Google e mantenha senha, e-mail/link e login anônimo desabilitados. Steam usa OpenID 2.0 validado pela API e callback HTTPS exato. Teste duas contas, token expirado, conflito e exclusão antes da publicação. A ativação real dos provedores ainda depende de projeto, domínio e credenciais externos.
6. Agende backup e cópia privada externa; confira tamanho, retenção, permissões e recuperação. Assets não estão no pg_dump: copie versões imutáveis separadamente. Dumps podem conter dados pessoais; checksum verifica integridade, não cifra nem prova autenticidade.
7. Crie monitores públicos de frontend e readiness; verifique e-mails. Credenciais/TLS/DNS/monitores e destinos externos não foram inventados nem considerados ativos.

### Backup no Windows

Executar PowerShell existente, com parâmetros de produção:

```powershell
pwsh -NoProfile -File scripts/backup-database.ps1 -ComposeFile docker-compose.production.yml -EnvFile .env.production -ApplyRetention
pwsh -NoProfile -File scripts/restore-drill.ps1 -Dump data/backups/black-market-<data>.dump -ComposeFile docker-compose.production.yml -EnvFile .env.production
```

No Agendador de Tarefas: programa `pwsh`, argumentos do backup acima, diretório de trabalho do projeto, gatilho diário, executar assim que possível se perder o horário e impedir execução concorrente. É configuração manual; máquina desligada não oferece disponibilidade de servidor. Use -AllowUnverified apenas para dump externo cuja origem tenha sido verificada por outro procedimento.

### Backup no Linux

O script requer Docker Compose e coreutils comuns de uma distribuição Linux. Não requer PowerShell no VPS. Execute como operador com acesso ao Docker, sem expor o socket a visitantes:

```sh
APPLY_RETENTION=1 sh scripts/backup-database.sh
```

Cron de exemplo, ajustando caminho real:

```cron
0 3 * * * cd /srv/black-market && APPLY_RETENTION=1 sh scripts/backup-database.sh >> /srv/black-market/data/backup-job.log 2>&1
```

Agendamento, fuso, PATH do Docker, rotação desse log e cópia externa devem ser verificados no host. Falha deve gerar alerta operacional. O lock persistente após morte abrupta exige conferir se não há job ativo antes de removê-lo. Retenção só remove nomes de dumps válidos no diretório fixo do projeto e seus manifestos; fixtures validaram 7 diários e 4 semanais. Não aplicar essa retenção a assets versionados sem política específica.

## Testes e evidências locais

- `pnpm test`: **123 testes passaram** — 24 calculadoras, 48 API e 51 frontend.
- HTTP real no adaptador Nest: CORS, 403 de origem estrangeira, JSON inválido 400, 413 em corpo comum grande, preservação do limite de workspace, headers e ausência de conteúdo sensível na resposta.
- Papel PostgreSQL em container descartável: login da conta restrita funcionou; leitura do catálogo e escritas operacionais funcionaram; INSERT no catálogo e CREATE TABLE foram recusados. Container/volume de teste removidos; banco original preservado.
- Backup `black-market-20261008T142306Z.dump` com retenção aplicada; restauração isolada recuperou 148.432 item_versions (inclui versões anteriores), 87.165 reference_records e 228 tabelas incluindo schemas de sistema. Banco de teste removido.
- Manifesto ausente e checksum incorreto recusados antes do acesso ao banco.
- Script Linux: sintaxe e retenção testadas em container Debian; 50 dumps sintéticos reduzidos a 11 com manifestos. O dump Linux completo/agendamento não foram executados em VPS; o dump/restauração completos foram feitos com os helpers Windows.
- Compose de produção validado com `config --quiet`, sem exposição de valores resolvidos. Builds API/SSR e lint locais passaram; a revisão publicada ainda precisa do resultado final do CI.

## Limites

Não é pentest/certificação. Rate limiting é local a uma instância, por IP, e precisa de calibração para redes compartilhadas; antes de replicar API, reavaliar coordenação e coletor. `user_workspaces` aplica `ENABLE` e `FORCE ROW LEVEL SECURITY`, com políticas de leitura/gravação vinculadas ao `app.user_id` definido dentro de cada transação autenticada; a role runtime não tem `DELETE` nem `BYPASSRLS`. Esse contexto é definido pela API com uma role compartilhada: RLS reduz o risco de consultas da aplicação esquecerem o filtro de proprietário, mas não protege contra API/credencial de banco comprometida que execute SQL arbitrário e defina outro contexto. As tabelas de mapeamento `auth_users` e `auth_identities` não têm RLS; seguem internas à API e precisam de revisão própria de privilégios antes de produção. Privilégios concedidos manualmente precisam de revisão.

Backup no mesmo host não protege contra perda do servidor. Retenção/cópia externa, restauração no host final, HTTPS/proxy real, CSP/OCR no navegador, contas externas e alertas continuam pendentes de configuração e validação. Custos novos de serviços: **nenhum contratado**.

## Lista de arquivos alterados nesta entrega

- `.env.example`
- `README.md`
- `apps/api/src/config/env.schema.spec.ts`
- `apps/api/src/config/env.schema.ts`
- `apps/api/src/database/database.service.ts`
- `apps/api/src/database/runtime-role.spec.ts`
- `apps/api/src/database/runtime-role.ts`
- `apps/api/src/main.ts`
- `apps/api/src/operations/http-policy.integration.spec.ts`
- `apps/api/src/operations/http-policy.spec.ts`
- `apps/api/src/operations/http-policy.ts`
- `apps/api/src/operations/request-controls.ts`
- `apps/web/src/app/core/security-headers.spec.ts`
- `apps/web/src/app/features/storage/storage-page.spec.ts`
- `apps/web/src/locale/messages.pt-BR.xlf`
- `deploy/nginx.conf`
- `deploy/runtime-role.sql`
- `docker-compose.production.yml`
- `docs/backup-recovery.md`
- `docs/production-and-accounts.md`
- `docs/security-hardening.md`
- `docs/security.md`
- `scripts/backup-database.sh`
- `scripts/restore-drill.ps1`
