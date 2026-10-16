# Staging local sem mensalidade de hospedagem

Um único ambiente de teste, ligado sob demanda no computador do mantenedor. Angular SSR compilado, NestJS e PostgreSQL em Docker Compose. Cloudflare Quick Tunnel fornece um link HTTPS temporário, sem domínio. Os projetos Firebase local e staging estão separados e Google está habilitado; o runtime do login só ativa depois de configurar as credenciais Admin e o callback Steam. Não use credenciais, usuários nem banco de produção.

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

`Seed` exige o PostgreSQL de desenvolvimento ligado e `.env` existente. Copia schema, journal de migrations e catálogo; exclui dados de workspaces, identidades Google/Steam, tentativas/trocas de autenticação e histórico/cotações de mercado. Recusa banco de staging com tabelas existentes. Nunca substitui o banco de desenvolvimento. Se a restauração falhar, preservar o estado e investigar antes de tentar novamente.

Os assets dos catálogos ativos em `data/assets` são copiados na inicialização para o volume exclusivo `black-market-staging-assets`, com permissões de leitura para o runtime. O diretório de origem é montado somente para leitura na tarefa de cópia; a API recebe somente o volume de staging em leitura. A cópia é incremental e preserva versões anteriores. Git e imagem Docker não incluem o catálogo nem os assets.

O comando cria `.env.staging` ignorado pelo Git, com senhas aleatórias distintas para proprietário e runtime. Usa o projeto `black-market-staging`, volume `black-market-staging-data` e gateway em `127.0.0.1:8081`. Nenhuma porta do banco ou API fica publicada. Login, analytics e coleta agendada ficam desativados.

O build de staging usa otimização de produção e limites de tamanho próprios para não bloquear a validação dos testers; os limites estritos do build de produção não são alterados. Avisos atuais de bundle e estilos permanecem visíveis durante o build.

## Uso

```powershell
# Abrir localmente: http://localhost:8081
pwsh -File scripts/staging.ps1 Start

# Link HTTPS restrito a 1–10 pessoas convidadas
pwsh -File scripts/staging.ps1 Share -AllowedEmail pessoa1@example.com,pessoa2@example.com
```

Mantenha o terminal Share aberto. Ctrl+C encerra o túnel. O computador precisa estar ligado, conectado à internet, com Docker em execução e sem suspensão. O endereço muda a cada sessão. O script roda o smoke HTTP/SSR/catálogo antes de mostrar o link. Links permanentes e disponibilidade 24 horas exigem outra solução.

Quick Tunnel não tem garantia de disponibilidade, aceita até 200 requisições simultâneas e não suporta SSE. Referência: [documentação Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

O gateway bloqueia indexação por `robots.txt` e `X-Robots-Tag`; isso não controla acesso. Use somente dados de teste.

## Contas Google/Steam de staging

Em 16/10/2026 foram configurados projetos separados: `black-market-bdo-local` e `black-market-bdo-staging`. Firebase Authentication está inicializado e somente o provedor Google está habilitado em ambos; `localhost` consta como domínio autorizado nos dois. O app web `Black Market BDO Staging` foi registrado sem Analytics e sem Gemini. A configuração Web pública de ambos existe; o login do aplicativo ainda aguarda a credencial Firebase Admin exclusiva de cada projeto.

Firebase Web/Google e Steam OpenID → Firebase custom token já estão implementados. Password, telefone, login anônimo e outros provedores continuam desativados. Steam é iniciada pela API; não se habilita Steam como provedor Firebase. Mantenha cada credencial Admin exclusiva para seu projeto e apenas nos arquivos `.env` ignorados pelo Git; nunca a coloque em `apps/web`, Git ou chat. A configuração parcial não é aceita pelo schema: preencha os cinco campos juntos — `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_API_KEY`, `FIREBASE_APP_ID` e `FIREBASE_ADMIN_CREDENTIALS_BASE64` — para evitar deixar o serviço em estado inválido.

Para completar o ambiente local, use a configuração pública do app registrado em `black-market-bdo-local`, inclua a credencial Admin desse mesmo projeto em `.env` e defina `STEAM_OPENID_CALLBACK_URL=http://localhost:3000/api/v1/identity/steam/callback`. A API recebe o callback e devolve o usuário ao app em `http://localhost:4200`.

Para staging local, configure os cinco campos do projeto `black-market-bdo-staging` em `.env.staging`. `Start`/`Update` definem a origem como `http://localhost:8081` e o callback Steam como `http://localhost:8081/api/v1/identity/steam/callback`. O schema permite HTTP somente para `localhost`, `127.0.0.1` ou `::1` em `APP_ENV=staging`; domínios externos continuam exigindo HTTPS. Isso corresponde ao gateway local, que publica HTTP na porta 8081. A origem de `Share` continua HTTPS e usa o callback temporário do Quick Tunnel.

Gere uma chave privada Admin exclusiva para cada projeto pelo próprio Console, baixe-a diretamente para um local protegido e não a cole na conversa.

### Estado da tentativa de setup (16/10/2026)

A pasta `%LOCALAPPDATA%\BlackMarket\firebase-admin\` foi criada com ACL restrita ao usuário atual do Windows e `SYSTEM`. O Console Firebase emitiu chaves para as contas Admin, mas o navegador embutido do Codex não disponibilizou os arquivos no diretório local nem em Downloads; nenhum JSON foi aberto e nenhum `.env` foi alterado. A primeira chave criada em staging foi correlacionada por Cloud Audit e revogada; a confirmação do Console mostrou a exclusão. Restam 2 chaves geradas ativas no IAM de staging e 1 no local, mas seus JSONs não estão acessíveis nem podem ser baixados novamente. `identity/config` ainda retorna `enabled: false`, `googleEnabled: false` e `steamEnabled: false` em `localhost:3000` e `localhost:8081`.

Para continuar, gere e baixe novas chaves Admin de cada projeto em um navegador que grave os arquivos no disco, salve-as na pasta protegida acima e avise que estão prontas. Não cole o JSON ou seu conteúdo no chat. Em seguida, configurar todos os campos de uma vez, reconstruir/reiniciar os serviços e executar os smokes autenticados. As duas chaves staging remanescentes e a chave local permanecem inalteradas até haver credenciais substitutas acessíveis; não revogue nenhuma outra chave sem autorização específica.

`pnpm check` e o build serial completo do monorepo passaram. `pnpm test:staging` verificou HTTP, SSR, catálogo, ícone e noindex. `pnpm test:auth:local` e `pnpm test:auth:staging` falharam corretamente em `Firebase Authentication está desativado`; nenhum container ou processo API em execução foi reconstruído/reiniciado com Firebase incompleto. A build Web mantém bundle inicial de 553,57 kB (53,57 kB acima do limite de aviso), fallback de locale `pt-BR`→`pt` e avisos CommonJS do Tesseract.

Ao compartilhar por Quick Tunnel, o script atualiza o callback Steam para a origem HTTPS temporária, recria API/web, verifica o staging e informa o hostname a adicionar em Firebase Authentication → Settings → Authorized domains. No cliente OAuth Google, mantenha o redirect handler do Firebase configurado: `https://<FIREBASE_AUTH_DOMAIN>/__/auth/handler`. A documentação do Firebase exige que o domínio do app esteja autorizado e usa o auth domain como redirect de OAuth ([Google sign-in no Firebase](https://firebase.google.com/docs/auth/web/google-signin)). O hostname de Quick Tunnel muda a cada sessão; adicione o novo domínio em cada sessão que exigir Google.

Para disponibilizar o perfil sintético, primeiro entre uma vez com Google ou Steam na aplicação de staging para criar o mapeamento canônico. Copie a UID Firebase dessa conta para `STAGING_TEST_FIREBASE_UID` em `.env.staging`, recrie a API para carregar a variável e então execute:

```powershell
pwsh -File scripts/staging.ps1 SeedProfile
```

Se preferir, execute diretamente no serviço já iniciado:

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml exec -T api pnpm --filter @bdo/api workspace:seed-test-profile
```

Esse comando somente funciona em `APP_ENV=staging` e para a UID explicitamente configurada. Ele busca até cinco receitas únicas de Culinária, Alquimia e Processamento no catálogo ativo em português, com ingredientes e equipamentos reais do catálogo; os preços, estoques, sessões e cenários são marcados como demonstração sintética. Acrescenta personagens, maestria/gear, família com pets e montarias, receitas e cotações salvas, estoque de Velia/Heidel, inventário, planos, sessões, presets, projetos, buffs e histórico de aprimoramento, sem substituir registros ou a seleção já existente. Repetir o comando não duplica dados nem incrementa a versão quando nada muda. O seed não cria conta Firebase e não é um endpoint HTTP.

A lista `Share -AllowedEmail` é obrigatória e aceita de um a dez e-mails válidos distintos; sem ela, o túnel não inicia. Essa barreira é independente do login do produto. Não compartilhe e-mails de testers no Git ou em mensagens do produto. O staging local e o quick tunnel dependem do computador do mantenedor; para disponibilidade persistente, use domínio/túnel nomeado ou hospedagem.

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

Depois de configurar Firebase e reiniciar API/Web, os smokes autenticados exigem que ambos os provedores apareçam ativos no endpoint público de configuração:

```powershell
# Com pnpm dev:api em execução (verifica providers via API local)
pnpm test:auth:local

# Com o Compose de staging iniciado em localhost:8081
pnpm test:auth:staging

# Para um Quick Tunnel, depois de Share
$env:STAGING_URL='https://endereco.trycloudflare.com'; pnpm test:auth:staging
```

O smoke local consulta a configuração do BFF em `localhost:3000`; o smoke de staging também verifica HTTP, SSR, catálogo, ícone e `noindex`. Esses comandos confirmam readiness, mas não simulam a autorização junto ao Google/Steam. Complete um login real de cada provedor pelo navegador em cada ambiente e confira `/api/v1/identity/me`, o retorno à rota protegida e `/api/v1/workspace`. O teste autenticado é opt-in; `pnpm test:staging` e o CI comum não precisam de chaves Firebase.

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
