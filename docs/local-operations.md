# Operação local: observabilidade e banco

Esta configuração é somente para desenvolvimento local. Ela não conecta ao staging nem à produção e não envia métricas para serviços externos.

## Endereços

| Serviço        | Endereço local          | Uso                                                |
| -------------- | ----------------------- | -------------------------------------------------- |
| Web            | `http://localhost:4200` | Aplicação Angular em desenvolvimento               |
| API monitorada | `http://localhost:3000` | API local usada pelo Web; inclui `/api/v1/metrics` |
| Grafana        | `http://localhost:3001` | Dashboard Black Market, acesso local Viewer        |
| Prometheus     | `http://localhost:9090` | Séries locais, com retenção de sete dias           |
| Adminer        | `http://localhost:8082` | Consulta do PostgreSQL local                       |

As portas dos serviços Compose estão vinculadas a `127.0.0.1`. A role de banco pode ler dados locais do usuário; mantenha essas portas no loopback.

## Iniciar

Na raiz do repositório, usando Node 24.15 ou superior dentro da linha 24:

```powershell
pnpm ops:local:observability
pnpm ops:local:db-viewer
```

O primeiro comando inicia a API monitorada, Prometheus e Grafana, construindo a imagem local da API quando necessário. A API usa o mesmo PostgreSQL do Compose local e ocupa a porta `3000` enquanto estiver ativa. O frontend `4200` pode continuar rodando no host e consultar essa API.

O segundo comando gera, se ainda não existir, uma credencial aleatória e restrita para `bdo_viewer`, configura os privilégios read-only no banco local e inicia Adminer. Na tela de login do Adminer, use:

- Sistema: PostgreSQL
- Servidor: `postgres`
- Banco: `bdo_companion`
- Usuário: `bdo_viewer`
- Senha: valor local de `DB_VIEWER_PASSWORD` em `data/local-ops/db-viewer.env`

Esse arquivo é ignorado pelo Git e não deve ser compartilhado. A role tem acesso `SELECT`, limites de duração de consulta e transação read-only; a interface Adminer não substitui essa proteção do banco.

## Parar e alternar API

```powershell
pnpm ops:local:db-viewer:stop
pnpm ops:local:observability:stop
```

Esses comandos param somente Adminer e os serviços de observabilidade. O papel PostgreSQL e os dados Prometheus/Grafana permanecem. Para executar `pnpm dev:api` no host, pare primeiro a API monitorada do Compose, que ocupa `localhost:3000`. O serviço PostgreSQL e seu volume persistente não são removidos por esses comandos.

## Limites atuais

O dashboard mostra tráfego agregado por método/rota registrada/classe de status, latência, readiness do PostgreSQL e memória/uptime da API. Não há IDs, query strings, IPs, nomes de jogador/família/itens nem texto de erro nos labels. Ele ainda não apresenta métricas internas de queries, locks ou armazenamento do PostgreSQL. `LOCAL_METRICS_ENABLED` vem desligado por padrão e só pode ser ligado com `APP_ENV=local`.

Para uma conferência rápida, `/ready` deve responder HTTP 200, Prometheus deve mostrar `up{job="black-market-local-api"} = 1` e `black_market_database_ready = 1`. A rota de métricas não registra as próprias requisições nem `/health` e `/ready`.

O backup local verificado antes da instalação fica em `data/backups/black-market-20261018T083647Z.dump`; seu manifesto registrou SHA-256 `943C0C3257CD36E9C85351D00AA089F267E5839C4CCA364EFDB25521B69A8EE3`. O rebuild e o viewer não executaram migrations, seeds, resets ou alterações de linhas da aplicação.
