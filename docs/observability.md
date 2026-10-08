# Logs, erros e disponibilidade

Atualizado em 08/10/2026. Instrumentação implementada; serviço externo e entrega de alertas ainda não validados.

## Arquitetura e custos

- Nest `ConsoleLogger` com saída JSON em stdout/stderr; nenhum SDK adicional.
- Logs locais com rotação Docker: 10 MB × 3 arquivos por serviço. Retenção por tamanho, não por dias; sem garantia de histórico depois de excluir containers.
- Frontend envia somente contexto operacional mínimo ao próprio backend. PostHog continua separado para analytics opcional; não ativar replay, autocapture ou analytics do monitor.
- Recomendação: um único serviço, **Better Stack Free**, somente uptime e e-mail. [Preço oficial](https://betterstack.com/pricing): gratuito para projetos pessoais, 10 monitores/heartbeats, uma status page e e-mail/Slack. Confirmar elegibilidade antes do lançamento comercial. Não ativamos logs hospedados, error tracking ou replay, mesmo que o cadastro ofereça esses recursos.
- [UptimeRobot](https://uptimerobot.com/pricing/) é alternativa gratuita com checks a cada cinco minutos e 50 monitores para uso pessoal; verificar elegibilidade comercial e recursos no painel. Escolher um deles.
- Custo incremental previsto: US$ 0/mês dentro do plano elegível, além da hospedagem já necessária. Sem Sentry nesta etapa: considerar apenas quando contexto mínimo e correlação não bastarem para diagnosticar erros reais.

## Registros e privacidade

Backend registra timestamp UTC, ambiente, nível INFO/WARN/ERROR, evento, Request ID, método, rota do controlador, status e duração em milissegundos. UUID novo é gerado pelo servidor; cabeçalhos recebidos não definem esse identificador. Resposta e logs compartilham `X-Request-ID`.

Eventos: `http_request`, `http_exception`, `frontend_error`, `database_connection_error`, `database_readiness`, `startup_failed`. Sucessos usam INFO; falhas HTTP 4xx e relatos do navegador usam WARN; HTTP 5xx, banco indisponível e falha de inicialização usam ERROR. `database_readiness` registra apenas a primeira avaliação e mudanças, incluindo recuperação, para reduzir ruído. Pode existir um registro da exceção e outro da conclusão HTTP para o mesmo pedido; são etapas correlacionadas, não duas falhas independentes.

Filtro global retorna mensagem comum em português e Request ID, com `Cache-Control: no-store`. Não devolve SQL, stack ou mensagem original. Logger usa campos permitidos; corpo, query string, cookies, IP, senha, token, e-mail e Authorization não entram nos registros HTTP. Mensagens nativas do framework passam por remoção de conexão, URL, e-mail e credenciais. Novos eventos devem usar campos constantes ou enums: um campo permitido não autoriza incluir texto livre do usuário.

Gateway registra JSON com rota genérica, nível segundo status, ambiente, Request ID do upstream e duração em **segundos**; sem caminho livre/query/IP. Web SSR registra erros e inicialização em JSON sem causa textual, stack ou URL. Gateway pode não ter Request ID quando falhar antes do upstream. O log de erro interno do Nginx fica em `crit`; eventos internos nativos podem conter contexto de rede e precisam de revisão antes de compartilhamento.

### Frontend

Angular utiliza `ErrorHandler`, listeners globais nativos (incluindo rejeições não tratadas) e interceptor HTTP. Erros globais são classificados como `runtime`; o envio explícito aceita também `unhandled_rejection`. HTTP status 0 e 5xx são reportados, erros usuais 4xx não.

Somente produção no navegador: até cinco relatos distintos por instância da aplicação, deduplicados por tipo, área, status e Request ID. Área é enum de funcionalidade, incluindo mundo, gear e recomendações, nunca URL, termo pesquisado ou dados do armazém. Status e UUID são validados. Telemetria estrita rejeita campos extras no servidor, limita 10/minuto por IP e não tem retries, fila persistente, identificador de usuário ou cookies próprios. Falha da telemetria não gera novo relato.

`requestId` no registro de telemetria identifica o recebimento; `sourceRequestId` é o UUID da resposta que falhou, quando existir. Buscar ambos para investigação. Relatos podem se perder quando a API/rede estiver fora do ar; monitor externo cobre essa indisponibilidade. Sem stack/source maps, linha de código ou replay, o diagnóstico é limitado. Não contar relatos de navegador não autenticados como prova de incidentes: qualquer cliente pode enviar os enums válidos.

Telemetria operacional mínima é separada do consentimento de analytics; finalidade e base legal precisam da revisão descrita no inventário de privacidade. Compartilhar com suporte apenas identificador de atendimento e contexto necessário, nunca backup pessoal/token.

## Disponibilidade e readiness

| URL       | Verificação                                     | Resultado         | Cache           |
| --------- | ----------------------------------------------- | ----------------- | --------------- |
| `/health` | Processo da API responde; sem consulta ao banco | 200               | no-store        |
| `/ready`  | Consulta `SELECT 1` ao PostgreSQL               | 200 ou 503 seguro | no-store        |
| `/`       | Página pública e processo SSR                   | 200 ou erro       | conforme página |

Monitorar as três URLs: `/health` sozinho não assegura banco ou renderização. Docker usa health checks e restart policies existentes; container unhealthy não é reiniciado automaticamente apenas por esse estado. Não há uma rota pública de crash, estado administrativo ou credenciais nos health checks. Checks do banco herdam os timeouts do pool; o gateway tem timeout de cinco segundos e pode responder 504 antes do 503 da API.

## Better Stack: configuração externa exata

Pré-requisitos: domínio HTTPS apontando para o deploy, acesso à conta Better Stack e caixa de e-mail do operador. O contato público de suporte não confirma qual conta receberá alertas. Nenhum cadastro, credencial ou envio foi realizado pelo agente.

1. Criar conta no [Better Stack](https://betterstack.com/), confirmar e-mail e selecionar plano gratuito elegível. Não habilitar serviços extras nem upgrade automático.
2. Seguir [Get started with monitoring](https://betterstack.com/docs/uptime/monitoring-start/): Uptime/Incidents → Monitors → Create monitor.
3. Criar três monitores HTTP: `https://SEU_DOMINIO/`, `https://SEU_DOMINIO/health`, `https://SEU_DOMINIO/ready`; status esperado **200**, sem credenciais. Para Home, adicionar verificação de texto se disponível no plano e confirmar o texto no HTML real.
4. Escolher menor intervalo disponível no plano, timeout de aproximadamente dez segundos quando configurável e confirmação por cerca de dois intervalos. Registrar valores efetivos no checklist; não supor opções pagas disponíveis. Configurar recovery period de pelo menos um intervalo. [Guia de confirmação e recuperação](https://betterstack.com/docs/uptime/confirmation-and-recovery-period/).
5. Selecionar operador/responder e habilitar **e-mail** nas configurações de alertas do monitor. Verificar abertura e resolução no teste de incidente; conferir a configuração de notificações de recuperação na conta. Liberar `@betterstack.com` no filtro de spam. Não selecionar SMS/telefone pago.
6. Desativar pausa dos monitores após testar. Usar janelas de manutenção para deploys planejados. Status page é opcional; não publicar nomes internos/URLs privadas.
7. Guardar evidência: URL monitorada, intervalo, data UTC, incidente, recebimento do e-mail, recuperação e recebimento da resolução. Só marcar integração como pronta após essa validação.

Indisponibilidade, banco fora do ar e falha de SSR passam a gerar alertas por essas verificações, após ativação. Uma exceção isolada com `/ready` saudável **não** dispara e-mail nesse desenho: fica nos logs. Alertar cada exceção exigiria ingestão/regras de logs ou error tracking externo, ainda não ativados. Reavaliar se isso impedir operação; não adicionar SMTP próprio ou segundo serviço só para duplicar uptime.

## Investigar uma falha

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml logs --since 30m --no-color api web gateway
```

1. Localizar o Request ID da resposta ou atendimento e o `sourceRequestId` de `frontend_error`.
2. Buscar registros do mesmo UUID no API/gateway; conferir status, duração e horário UTC. Falhas SSR aparecem no serviço web.
3. Conferir `database_readiness`, reinícios, disco livre, versão da imagem (`APP_IMAGE`) e última publicação. Logs não transmitem SHA automaticamente; registrar versão/horário no deploy.
4. Coletar somente trecho sanitizado antes da rotação e excluir a cópia quando a investigação acabar. Não publicar saída completa de env/compose config ou logs brutos em issues públicas.

## Simular falhas sem atingir produção

### Testes automatizados

`pnpm test` cobre banco mock indisponível/recuperação, logs sem segredos, exceção 500 real em servidor Nest efêmero de teste, correlação, no-store, payload estrito, limite de relatos, deduplicação, áreas e prevenção de recursão. A rota de falha existe **somente na fixture de teste**, sem endpoint de crash na aplicação.

### Relato sintético local

```powershell
$payload = '{"kind":"runtime","area":"world"}'
Invoke-WebRequest -Uri http://localhost:3000/api/v1/telemetry/errors -Method Post -ContentType application/json -Body $payload
docker compose logs --since 2m --no-color api
```

Esperado: resposta `received: true`, `frontend_error` WARN e `http_request` INFO com mesmo Request ID; nenhuma informação pessoal. O envio manual exercita recebimento, não valida captura visual de um erro no navegador.

### Alerta de indisponibilidade em staging

Antes: criar staging real em host separado ou com override de portas; `.env.staging` precisa ter `PRODUCTION_POSTGRES_VOLUME` exclusivo, credenciais próprias, domínio e monitores de staging. O nome do projeto sozinho **não** isola volumes nomeados. Conferir labels/volumes e monitores no painel antes de interromper serviços. Não usar localhost do desenvolvedor como URL do monitor externo.

```powershell
docker compose --env-file .env.staging -f docker-compose.production.yml -p black-market-staging ps
docker compose --env-file .env.staging -f docker-compose.production.yml -p black-market-staging stop api
# Esperar janela de confirmação do monitor: /health e /ready falham; validar e-mail.
docker compose --env-file .env.staging -f docker-compose.production.yml -p black-market-staging up -d api
# Confirmar 200, incidente resolvido e e-mail de recuperação.
```

Para distinguir disponibilidade/readiness, parar **somente postgres no staging isolado**, consultar `/health` (200) e `/ready` (503/504), depois restaurar `postgres` e consultar `/ready` até 200. Esperado: ERROR e INFO de `database_readiness` nas transições, sem string de conexão. Se algum container for recriado, revisar se a imagem/credenciais são as de staging.

Não execute esses passos no stack atual ou produção por engano. Nesta entrega nenhum serviço real foi interrompido para simular incidente e nenhum e-mail externo foi validado.

## Validação da entrega

- 132 testes passaram: API 54, frontend 54, calculadores 24.
- `nginx -t` passou em container descartável sem rede, com nomes upstream resolvidos apenas para a validação sintática.
- Compilação de frontend/backend e smoke SSR passaram. Lint e formatação passaram. Falha de inicialização com configuração sintética inválida retornou exit 1 e evento seguro, sem expor o valor inválido.
- Não verificado: alertas reais, elegibilidade da conta/plano, domínio/TLS público, captura visual em navegador e retenção efetiva no host final.

Arquivos principais desta etapa: `apps/api/src/main.ts`, `apps/api/src/health/health.{controller,service}.ts`, `apps/api/src/operations/{structured-logger,safe-exception.filter,telemetry.controller}.ts`, `apps/web/src/app/core/operational-errors.ts`, `apps/web/src/server.ts`, `deploy/nginx.conf`; respectivos testes de health, logger, telemetry, integração HTTP e frontend; este documento.
