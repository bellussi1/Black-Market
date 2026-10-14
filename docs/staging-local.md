# Staging local sem mensalidade de hospedagem

Um único ambiente de teste, ligado sob demanda no computador do mantenedor. Angular SSR compilado, NestJS e PostgreSQL em Docker Compose. Cloudflare Quick Tunnel fornece um link HTTPS temporário, sem domínio. O login Google/Steam fica desativado até configurar um projeto Firebase exclusivo de staging; não use credenciais, usuários nem banco de produção.

## Preparação

Requer Docker Desktop em execução e PowerShell 7 (`pwsh`). Neste computador, `staging.cmd` também encontra o PowerShell 7 empacotado pelo Codex, sem instalação adicional. Exemplo: `.\staging.cmd Start`, `.\staging.cmd Share`, `.\staging.cmd Update` e `.\staging.cmd Stop`. Em outro computador, se necessário, instale PowerShell 7 com `winget install --id Microsoft.PowerShell --exact`.

Para compartilhar, instale `cloudflared`:

```powershell
winget install --id Cloudflare.cloudflared --exact
```

Reabra o terminal depois de instalar. Na raiz do projeto, a primeira execução pode copiar o catálogo local para um banco vazio:

```powershell
pwsh -File scripts/staging.ps1 Seed
pwsh -File scripts/staging.ps1 Start
```

`Seed` exige o PostgreSQL de desenvolvimento ligado e `.env` existente. Copia schema, journal de migrations e catálogo; exclui dados de `user_workspaces`, `market_snapshots`, `market_current_prices` e `market_price_points`. Recusa banco de staging com tabelas existentes. Nunca substitui o banco de desenvolvimento. Se a restauração falhar, preservar o estado e investigar antes de tentar novamente.

Os assets dos catálogos ativos em `data/assets` são copiados na inicialização para o volume exclusivo `black-market-staging-assets`, com permissões de leitura para o runtime. O diretório de origem é montado somente para leitura na tarefa de cópia; a API recebe somente o volume de staging em leitura. A cópia é incremental e preserva versões anteriores. Git e imagem Docker não incluem o catálogo nem os assets.

O comando cria `.env.staging` ignorado pelo Git, com senhas aleatórias distintas para proprietário e runtime. Usa o projeto `black-market-staging`, volume `black-market-staging-data` e gateway em `127.0.0.1:8081`. Nenhuma porta do banco ou API fica publicada. Login, analytics e coleta agendada ficam desativados.

## Uso

```powershell
# Abrir localmente: http://localhost:8081
pwsh -File scripts/staging.ps1 Start

# Link HTTPS aberto a quem tiver o endereço
pwsh -File scripts/staging.ps1 Share

# Restringir a lista de convite a até dez endereços únicos
pwsh -File scripts/staging.ps1 Share -AllowedEmail pessoa1@example.com,pessoa2@example.com
```

Mantenha o terminal Share aberto. Ctrl+C encerra o túnel. O computador precisa estar ligado, conectado à internet, com Docker em execução e sem suspensão. O endereço muda a cada sessão. O script roda o smoke HTTP/SSR/catálogo antes de mostrar o link. Links permanentes e disponibilidade 24 horas exigem outra solução.

Quick Tunnel não tem garantia de disponibilidade, aceita até 200 requisições simultâneas e não suporta SSE. Referência: [documentação Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

O gateway bloqueia indexação por `robots.txt` e `X-Robots-Tag`; isso não controla acesso. Use somente dados de teste.

## Contas Google/Steam de staging

Crie um projeto Firebase separado para staging e configure os campos `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_API_KEY`, `FIREBASE_APP_ID` e `FIREBASE_ADMIN_CREDENTIALS_BASE64` no `.env.staging` ignorado pelo Git. A credencial Admin fica apenas no container da API. Habilite Google Authentication; mantenha Password, e-mail/link, telefone e login anônimo desativados. Steam é validada pela API via OpenID e troca por custom token Firebase. A UI não oferece outros provedores.

Ao compartilhar por Quick Tunnel, o script atualiza o callback Steam para a origem HTTPS temporária, recria API/web, verifica o staging e informa o hostname a adicionar em Firebase Authentication → Settings → Authorized domains. No cliente OAuth Google, mantenha o redirect handler do Firebase configurado: `https://<FIREBASE_AUTH_DOMAIN>/__/auth/handler`. A documentação do Firebase exige que o domínio do app esteja autorizado e usa o auth domain como redirect de OAuth ([Google sign-in no Firebase](https://firebase.google.com/docs/auth/web/google-signin)). O hostname de Quick Tunnel muda a cada sessão; adicione o novo domínio em cada sessão que exigir Google.

Para disponibilizar o perfil sintético, primeiro entre uma vez com Google ou Steam na aplicação de staging para criar o mapeamento canônico. Copie a UID Firebase dessa conta para `STAGING_TEST_FIREBASE_UID` em `.env.staging`, recrie a API para carregar a variável e então execute:

```powershell
pwsh -File scripts/staging.ps1 SeedProfile
```

Se preferir, execute diretamente no serviço já iniciado:

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml exec -T api pnpm --filter @bdo/api workspace:seed-test-profile
```

Esse comando somente funciona em `APP_ENV=staging` e para a UID explicitamente configurada. Ele acrescenta AuroraVale/ValeDourado se ainda não existirem, sem substituir personagem, família, seleção ou dados já existentes. Repetir o comando não duplica o perfil nem incrementa a versão quando nada muda. O seed não cria conta Firebase e não é um endpoint HTTP.

A lista `Share -AllowedEmail` é independente do login do produto: ela restringe quem pode abrir o túnel e aceita no máximo dez e-mails válidos distintos. Não compartilhe e-mails de testers no Git ou em mensagens do produto. O staging local e o quick tunnel dependem do computador do mantenedor; para disponibilidade persistente, use domínio/túnel nomeado ou hospedagem.

## Atualização, backup e retorno

```powershell
pwsh -File scripts/staging.ps1 Backup
pwsh -File scripts/staging.ps1 ScheduleBackup
pwsh -File scripts/staging.ps1 Update
pwsh -File scripts/staging.ps1 Rollback
pwsh -File scripts/staging.ps1 Status
pwsh -File scripts/staging.ps1 Stop
```

`Update` inicia o banco e faz backup quando já existe uma imagem instalada, compila uma imagem com tag nova, aplica migrations e reaplica permissões. Verifica API pronta e HTTP do frontend. Só registra a versão como ativa após essas verificações. Não faz `git pull`: atualizar o checkout é uma ação separada.

`Rollback` troca a imagem, preserva o banco e não desfaz migrations. Só usar se o schema continuar compatível com a imagem anterior. Falha de atualização mantém os dados e restaura a referência de imagem no arquivo de ambiente; não promete restauração automática dos containers ou do schema.

Atualização e rollback recriam os containers e causam breve indisponibilidade. A primeira cópia dos assets pode levar alguns minutos; as próximas copiam apenas arquivos novos ou mais recentes.

Backups e manifestos SHA-256 ficam em `data/staging/backups`, com retenção de 7 dias distintos e 4 semanas. `ScheduleBackup` registra a tarefa Windows `BlackMarket-Staging-Backup`, diariamente às 12:00 no horário configurado no Windows. Executa como o usuário atual, sem privilégios elevados, somente enquanto estiver conectado. Se Docker ou staging estiverem parados, pula a execução. Verifique a última execução no Agendador e `data/staging/backup-status.txt` para sucesso/falha. Pode ser removida pelo Agendador de Tarefas.

São backups locais, sem proteção contra perda do computador. Não há armazenamento externo configurado nesta fase. Copie banco e assets para um destino privado separado quando necessário.

Para testar um backup em um banco temporário isolado:

```powershell
pwsh -File scripts/restore-drill.ps1 -Dump data/staging/backups/black-market-AAAA.dump -ComposeFile docker-compose.staging.yml -EnvFile .env.staging
```

`Stop` encerra o túnel registrado pelo script e os containers de staging, preservando volumes e backups. Não usar `down -v`.

## CI e operação

Execute `pnpm test:staging` para verificar HTTP, SSR, catálogo, ícone e bloqueio de indexação. Para testar pelo túnel: `$env:STAGING_URL='https://endereco.trycloudflare.com'; pnpm test:staging`. Esse smoke exige o catálogo que contém o item 1407, usado como referência no projeto.

O workflow existente do GitHub valida lint, formatação, tipos, testes, build e smoke SSR. Staging é atualizado pelo comando local após validar o código. Não há runner permanente, secrets de cloud, deploy remoto ou chamada paga de IA por atualização. O CI não publica nem inicializa o computador.

Mensalidade de hospedagem: zero nesta opção. Energia, internet e limites do GitHub continuam sujeitos aos seus planos. A aplicação roda no computador; Cloudflare fornece a conexão externa, não hospeda o PostgreSQL.

## Verificação em 10/10/2026

- Build Docker, validação do Compose, sintaxe PowerShell, lint do smoke e formatação passaram.
- Seed copiou catálogo para banco exclusivo; segunda tentativa foi recusada por já existir schema. Tabelas pessoais ficaram vazias.
- Smoke passou em localhost e no túnel HTTPS, incluindo ícone WebP e receitas do item 1407.
- Backup com manifesto foi restaurado pelo ensaio em banco temporário; o banco original foi preservado.
- Update gerou backup prévio, publicou a imagem e passou no smoke. Rollback também passou no smoke.
- Tarefa diária registrada para o usuário atual, às 12:00 de Brasília, sem privilégios elevados. O helper de backup executou com status OK.

Os avisos existentes de bundle, locale e dependências CommonJS permanecem. O workflow do GitHub inclui validação do Compose de staging e sintaxe dos scripts PowerShell; consulte Actions para acompanhar a execução remota após cada push.
