# Publicação, contas e operação

## Estado

Código e configuração preparados; não há hospedagem pública, domínio nem provedor de identidade ativado nesta entrega. O catálogo e referências estão importados no ambiente local. Dados e assets ignorados pelo Git precisam ser transferidos ao servidor por um processo operacional; clonar o repositório não popula o banco.

## Ambiente público

`docker-compose.production.yml` reúne PostgreSQL, migração, aplicação Nest, servidor Angular SSR e Nginx. O banco e a aplicação de dados não publicam portas. A entrada fica em `127.0.0.1:8080`, apropriada para um túnel Cloudflare configurado no host. A configuração do túnel e do domínio requer a conta do mantenedor.

Defina em um arquivo de ambiente fora do Git:

- `POSTGRES_DB`, `POSTGRES_USER` e uma senha própria em `POSTGRES_PASSWORD`.
- `CONTAINER_DATABASE_URL`, com credenciais de migração/administrador e host `postgres`; caracteres especiais devem ser codificados na URL. Essa credencial não é fornecida à API de produção.
- `POSTGRES_APP_PASSWORD`, senha aleatória exclusiva da aplicação, com pelo menos 32 caracteres, diferente da senha administrativa.
- `RUNTIME_DATABASE_URL`, usando `black_market_app`, essa senha e host `postgres`. A etapa `permissions` cria/atualiza o papel após migrações.
- `APP_IMAGE`, tag imutável da revisão a publicar. Se usar digest de uma imagem já publicada, não execute build com o digest como tag.
- `PUBLIC_SITE_URL`, o endereço HTTPS real, sem caminho.
- `PRODUCTION_POSTGRES_VOLUME`, um nome exclusivo para o banco de produção.
- Opcionalmente `CATALOG_ASSETS_PUBLIC_URL` para assets versionados publicados em armazenamento/CDN.

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml build migrate
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

Antes da abertura pública, restaurar um backup autorizado do catálogo e copiar `data/assets/<checksum>`, inclusive `asset_redirects.json`, `integrity.json`, ícones e `icon-index-v2.json` (v1 permanece compatível como fallback). Ver [publicação e validação do reconhecimento](ocr-validation.md). Fazer backups do volume PostgreSQL e do diretório de assets em armazenamento separado. Não usar `down -v` no banco existente.

Em banco novo, suba PostgreSQL/migrações primeiro; restaure o catálogo antes de abrir API/web/gateway. Após cada restauração ou migração que crie tabelas, reexecute `permissions` com `up --force-recreate permissions`: o papel não recebe escrita automática em tabelas futuras. A API de produção recusa superusuário, criação de roles/bancos/schema, propriedade de tabelas e memberships. Não conceda o papel proprietário ao runtime para resolver erros de permissão. Ver [controles e evidências](security-hardening.md).

Cloudflare fornece a entrada/CDN; esta configuração não executa Nest e PostgreSQL em Workers. O custo do host depende do provedor escolhido. Não há promessa de hospedagem integral gratuita. A base local com catálogo e referências ocupou aproximadamente 498 MB no PostgreSQL durante esta entrega, sem histórico de mercado ou contas em uso. Extração/importação pesada deve ficar no host do mantenedor, evitando competir com consultas públicas.

## Identidade e sincronização

A autenticação oferece somente Google e Steam. Firebase Auth cria a sessão de navegador; Google usa o provedor oficial e a API valida Steam OpenID 2.0 antes de emitir custom token. Não existem login por senha, e-mail/OTP, link mágico nem login anônimo. Visitantes continuam usando as páginas públicas sem conta. Projetos Firebase e credenciais ainda precisam ser configurados por ambiente antes de ativar login real.

A API verifica tokens com Firebase Admin e relaciona UID/provedor a um UUID interno. O UUID do dono vem desse mapeamento, nunca do corpo enviado pelo navegador. Contas Google e Steam só se vinculam após prova dos dois provedores; e-mail coincidente não mescla contas. Configuração web pública não inclui credencial Admin.

Em **Minha conta**: carregar a cópia, revisar o resumo e confirmar envio ou aplicação local. Escritas exigem a versão previamente lida; alteração concorrente devolve conflito sem sobrescrever. Excluir a cópia da conta mantém a cópia local. Sair da conta limpa a prévia remota, mas não apaga os dados deste navegador: em computador compartilhado, remova-os em **Dados e backup** após exportar o que deseja manter. Não há fusão automática ou sincronização contínua nesta versão.

Dados de identidades antigas não são associados automaticamente por e-mail e workspaces anteriores não são migrados para a nova UID sem um mapeamento explicitamente verificado. Preserve um backup antes de qualquer migração manual; nenhum dado de usuário deve ser eliminado como parte da configuração de Firebase.

Não armazenar respostas pessoais em cache Cloudflare. `/api/v1/workspace` envia `private,no-store`; o gateway também restringe o ritmo de requisições. Páginas pessoais usam renderização no navegador, `noindex` e cabeçalho equivalente. Isso controla indexação, não substitui a autenticação da persistência remota.

## Mercado e catálogo

Consultas normalizadas de mercado são persistidas por região, item, variante, idioma e horário. O histórico apresenta até 180 observações; limpeza do coletor mantém 30 dias. Histórico não é uma exportação de todas as vendas do jogo.

O coletor está desligado por padrão. Quando a fonte estiver acessível, configurar `MARKET_COLLECTOR_ENABLED=true` e `MARKET_TRACKED_ITEMS` com até 20 IDs separados por vírgula. A coleta usa a mesma limitação de consultas, a cada 30 minutos e numa instância única da aplicação. Não ampliar requisições para contornar bloqueios da fonte. Favoritos pessoais não ativam coleta global automaticamente.

`scripts/sync-game-catalog.ps1` atualiza itens e receitas após mudança do cliente instalado e publica referências/índice visual. `scripts/publish-reference-data.ps1` também completa esses artefatos num catálogo existente. Executar com a imagem atualizada e uma extração correspondente; o script é operacional, não atualiza a instalação do jogo e não foi agendado automaticamente.

## HTML público e descoberta

Home, itens, receitas, referências e mapa têm renderização no servidor. Pedidos do servidor usam `API_BASE_URL` interno; o navegador de produção usa `/api/v1` na mesma origem. Dados pessoais não entram no cache de transferência de HTML. Região inicial é transferida ao navegador; dados locais são restaurados depois da hidratação pública.

Com `PUBLIC_SITE_URL` definido, `/sitemap.xml` e `/sitemaps/<tipo>/<página>.xml` enumeram páginas públicas e catálogos SA/pt em lotes de 10.000 URLs. `robots.txt` aponta o sitemap. `llms.txt` é orientação experimental, não garantia de descoberta, ranking ou citação por assistentes. A aplicação gera títulos e descrições de itens/receitas/referências; arquivos estáticos com hash têm cache longo. HTML com preferência de região não recebe cache compartilhado.

## Controles de operação e privacidade

A sessão de identidade usa `sessionStorage` por aba e PKCE; não é cookie HttpOnly. Configure projetos Firebase separados para staging e produção, autorize os domínios web usados, mantenha senha/e-mail/anonymous desativados e valide Google, Steam, vinculação e encerramento de sessão no navegador antes de abrir contas. Preferências e inventário estão em `privacy-inventory.md`.

Bellussi e enzobellussi3@gmail.com são o responsável e contato informados pelo usuário. Identificação jurídica completa exige revisão. ANALYTICS_ENABLED=false e MARKET_COLLECTOR_ENABLED=false permanecem desligados até validação. Alertas externos e backup offsite ainda não configurados; seguir production-audit.md.
