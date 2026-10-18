# Observabilidade local e visualização do banco — 18/10/2026

## Escopo aprovado

O pedido de 18/10/2026 inclui observabilidade da aplicação e visualização do banco. O usuário confirmou que a visualização deve apontar para o **PostgreSQL local**. Não se aplica a staging ou produção.

## Decisões sustentadas por documentação

- A API exporta o formato texto Prometheus com `counter`, `histogram` e `gauge`. O formato HTTP é simples de consumir e a rota é desativada por padrão; o schema de ambiente rejeita ativação fora de `APP_ENV=local`. Fonte: [Prometheus — Exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/), consultada em 18/10/2026.
- Serviços auxiliares ficam em Compose overlays e perfis opt-in, sem alterar a composição normal do banco. Fonte: [Docker — Using profiles with Compose](https://docs.docker.com/compose/how-tos/profiles/), consultada em 18/10/2026.
- A role `bdo_viewer` recebe `CONNECT`, `USAGE` do schema `public` e `SELECT` em tabelas/sequências; privilégios de escrita são revogados diretamente. `default_transaction_read_only` e limites de duração reduzem escrita acidental e consultas demoradas. Privilégios PostgreSQL são controlados por objeto e privilégios default afetam objetos futuros criados pelo papel indicado. Fontes: [PostgreSQL 17 — Privileges](https://www.postgresql.org/docs/17/ddl-priv.html), [ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html), consultadas em 18/10/2026.
- O bootstrap envia a senha URL-safe pelo stdin do `psql`; a senha não entra em argumento, variável de container ou log. O script SQL usa quoting de literal do cliente `psql` e lê do ambiente apenas o papel dono e o nome do banco. Fonte: [PostgreSQL 17 — psql](https://www.postgresql.org/docs/17/app-psql.html), consultada em 18/10/2026.
- Adminer é distribuído como Docker Official Image e suporta PostgreSQL. Foi escolhido pela instalação compacta para inspeção local; a autorização efetiva vem da role PostgreSQL, não da interface. Fontes: [Adminer](https://www.adminer.org/) e [Adminer Official Image](https://hub.docker.com/_/adminer), consultadas em 18/10/2026.
- Grafana provisiona fontes e dashboards a partir de arquivos, adequados a revisão e versionamento; a interface receberá apenas uma role anônima Viewer e ficará no loopback. Fontes: [Grafana — Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/) e [Grafana Docker](https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/), consultadas em 18/10/2026.

## Superfícies e limites

- API: requisições agregadas por método reconhecido, rota registrada e classe de status; latência em buckets fixos; readiness PostgreSQL e memória/uptime do processo.
- As métricas não incluem ID de rota, query string, IP, usuário, nome de família, item, erro ou texto SQL. Requisições de `/health`, `/ready` e da própria rota de métricas são omitidas das séries de tráfego.
- Prometheus retém até 7 dias localmente. Grafana e Prometheus usam volumes novos e separados do volume de PostgreSQL. Sem serviço de coleta externa.
- Adminer escuta em `127.0.0.1:8082`; Prometheus em `127.0.0.1:9090`; Grafana em `127.0.0.1:3001`. A senha aleatória da role viewer fica num arquivo dentro de `data/`, já ignorado pelo Git e com ACL/permissões restritas.
- A role pode ler registros locais da aplicação. Não disponibilizar a porta fora do loopback, não publicar a credencial e não reutilizar essa role em staging/produção.

## Concorrentes

Não se aplica pesquisa de BDO Workshop, BDO Codex, BDOLytics ou Garmoth: a entrega é ferramenta interna de desenvolvimento e administração local, sem superfície de jogo para jogadores e sem cálculo de mercado/receita.

## Status

Implementado e validado em 18/10/2026 no ambiente local:

- `pnpm check`, `pnpm test`, `pnpm build` e `pnpm test:ssr` passaram. A suíte completa retornou 1.200 testes aprovados e 1 ignorado por depender de PostgreSQL descartável; o build serial foi concluído. O build ainda informa 500,42 kB iniciais, 416 bytes acima do aviso de 500 kB, além dos avisos conhecidos de locale `pt-BR`→`pt` e CommonJS do Tesseract.
- Web `4200`, API monitorada `3000`, Adminer `8082`, Prometheus `9090` e Grafana `3001` responderam HTTP 200. A API ficou saudável; o alvo `black-market-local-api` do Prometheus e `black_market_database_ready` retornaram `1`; a busca do Grafana encontrou o dashboard provisionado.
- A API mapeada em `127.0.0.1:3000` é o serviço que o frontend local usa, não uma réplica de observabilidade separada. Assim, as métricas registram o tráfego real do Web em desenvolvimento. `pnpm ops:local:observability` inicia esse serviço e a stack local; para voltar ao `pnpm dev:api` no host, pare primeiro o serviço de observabilidade.
- O banco mantém os mesmos registros confirmados: `item_versions=445580` e `reference_records=209177`. A consulta atual contou 23 tabelas-base em `public`. A role `bdo_viewer` consegue `SELECT` e não tem `INSERT`/`UPDATE`; uma tentativa efetiva de escrita falhou com SQLSTATE `25006` por transação read-only. A senha segue no arquivo local ignorado `data/local-ops/db-viewer.env`.
- O backup local anterior continua presente e seu SHA-256 foi validado antes do provisionamento: `943C0C3257CD36E9C85351D00AA089F267E5839C4CCA364EFDB25521B69A8EE3`. O volume PostgreSQL existente foi preservado; nenhum registro de aplicação foi escrito ou removido. Só foram criados/ajustados o papel local de leitura e seus privilégios.

Os comandos, portas, login local e formas seguras de desligar estão em [`docs/local-operations.md`](../local-operations.md). Este dashboard mede tráfego HTTP, latência, memória/uptime do processo e readiness do PostgreSQL; ele não exporta métricas internas de consultas, locks ou armazenamento do PostgreSQL. Nenhum serviço, configuração ou telemetria foi adicionado a staging/produção.
