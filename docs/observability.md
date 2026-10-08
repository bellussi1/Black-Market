# Logs, erros e disponibilidade

## Código

Nest ConsoleLogger gera JSON com timestamp UTC, ambiente e níveis INFO/WARN/ERROR. Cada pedido recebe um UUID novo em X-Request-ID. Registros incluem método, rota do controlador (sem query), status e duração. Corpo, Authorization, cookies, senha, token, e-mail e stack recebida não entram nos logs HTTP. Filtro global devolve mensagens de uso comuns e código de atendimento, sem erro SQL/credenciais. Erros de conexão do pool são registrados sem detalhes privados.

Frontend de produção encaminha apenas tipo de falha, família de ferramenta, status e Request ID validado para `/api/v1/telemetry/errors`, com até 5 envios por instância. O backend valida lista permitida e limita 10/minuto por IP. Sem envio de mensagem/stack, não há agrupamento por linha de código; investigar correlacionando atendimento e deploy. Sentry só deve ser avaliado se esse limite impedir diagnóstico de falhas reais. Analytics opcional não é usado para detectar indisponibilidade.

`/health`: processo/API responde, não consulta banco. `/ready`: SELECT 1, 200 se pronto e 503 se indisponível, sem credenciais. Gateway encaminha ambos. Monitorar `/` também: health sozinho não garante renderização do site. Docker limita logs em 10 MB × 3 por serviço. Sem armazenamento de logs pago; coletar logs relevantes antes da rotação, manter apenas dados mínimos.

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml logs --since 30m api web gateway
```

## Monitor externo e e-mail: configuração pendente

Escolha: **Better Stack Free uptime**, sem instalar agente ou SDK de logs. [Preço](https://betterstack.com/pricing): plano gratuito de projetos pessoais oferece 10 monitores/heartbeats, uma status page e alertas por e-mail/Slack. Confirmar elegibilidade do projeto e limites no cadastro. [UptimeRobot Free](https://uptimerobot.com/pricing/) é alternativa com 50 monitores e intervalo de 5 minutos para hobby/non-profit; a página apresenta diferenças entre resumo e tabela para SSL, portanto não depender dessa opção sem confirmar no painel. Não contratar ambos.

1. Depois de obter domínio HTTPS, criar conta Better Stack e confirmar e-mail do operador. O e-mail público de suporte não implica autorização para cadastrar serviços ou enviar e-mails pelo agente.
2. Uptime → Monitors → Create monitor → URL HTTPS pública → status esperado 200; criar `/`, `/health`, `/ready`.
3. Usar menor intervalo permitido no plano; atraso de confirmação de incidente de aproximadamente dois checks para reduzir ruído. Não inventar configuração indisponível no plano.
4. Em alerting, selecionar operador/responder e habilitar e-mail para abertura **e resolução**. Confirmar contato e liberar remetentes `@betterstack.com` no filtro de spam.
5. Criar status page com os monitores públicos se necessário. Não divulgar endereços internos.
6. Executar falha controlada em staging e confirmar recebimento/resolução antes de considerar integração pronta.

[Guia oficial](https://betterstack.com/docs/uptime/monitoring-start/). Não foram cadastrados monitores ou enviados alertas nesta entrega: faltam conta, domínio e validação de caixa postal. Alertas de exceções críticas além de uptime exigem regra externa de logs; nenhum alerta por exceção foi falsamente declarado ativo.

## Simulação controlada

Testes unitários usam falha mock do banco para verificar readiness 503 e filtro seguro. Para ambiente de staging isolado, nunca executar contra produção por engano:

```powershell
docker compose --env-file .env.staging -f docker-compose.production.yml -p black-market-staging stop api
# Verificar /health e /ready retornarem falha no domínio staging e e-mail do monitor.
docker compose --env-file .env.staging -f docker-compose.production.yml -p black-market-staging up -d api
# Confirmar 200 e mensagem de resolução.
```

Definir volume exclusivo de staging no arquivo de ambiente, pois nome de projeto sozinho não isola volumes explicitamente nomeados. Não há endpoint público para provocar crash. Para exercitar logs sem queda, enviar JSON inválido ou token falso no workspace de staging: erro amigável, Request ID e WARN sem payload. Telemetria própria pode ser exercitada por teste ou POST de payload sintético válido; nunca usar dados pessoais reais. Reter evidência sanitizada da validação de alertas.
