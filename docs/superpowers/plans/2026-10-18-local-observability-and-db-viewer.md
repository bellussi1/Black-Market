# Plano: observabilidade e visualização local do banco

## Objetivo e limites

Implementar OPS-01 para desenvolvimento local: métricas agregadas da API, um painel Prometheus/Grafana opt-in e uma interface Adminer para inspecionar o PostgreSQL local com credencial somente leitura.

Staging e produção não recebem serviços, variáveis ou destinos de telemetria. Todas as portas publicadas ficam em `127.0.0.1`. Não executar migration, seed, reset, prune de backup, `down -v` nem alteração/exclusão de registros. A instalação pode criar apenas um papel PostgreSQL local de leitura e novos volumes da stack de observabilidade.

## Decisões

- Expor métricas Prometheus no prefixo `/api/v1/metrics`, desativadas por padrão e habilitáveis apenas com `APP_ENV=local`.
- Contar requisições e observar latência usando método normalizado, rota registrada (template, sem IDs) e classe de status. Não registrar query string, IP, usuário, família, item, nome de tabela nem conteúdo de erro como rótulos.
- Registrar disponibilidade do banco a partir do health check e métricas agregadas do processo Node.
- Executar a API local instrumentada no container Compose, publicar `127.0.0.1:3000` e apontar o Web local para esse mesmo serviço. Não criar uma cópia interna invisível do backend: o scrape deve observar o tráfego real da aplicação local. A API depende do PostgreSQL saudável, não do serviço de migration, e os coletores de mercado ficam desativados.
- Definir Grafana/Prometheus em um Compose overlay opcional, com armazenamento observacional separado do volume PostgreSQL já existente.
- Usar Adminer oficial em outro overlay, loopback e credencial dedicada `bdo_viewer`. Provisionar somente `CONNECT`, `USAGE` no schema e `SELECT` em tabelas/sequências presentes; configurar `SELECT` para objetos futuros do papel dono da aplicação.
- Gerar e manter a senha do viewer em arquivo ignorado dentro de `data/`; não imprimir nem versionar o segredo. Parar os serviços não remove o papel nem os dados.

## Task 1: Métricas da API

Escrever primeiro testes para agregação, normalização de labels, buckets e serialização; implementar controller/serviço e integração mínima com request controls/health. Configuração inválida deve falhar no schema, e ambiente não local não pode expor a rota.

## Task 2: Dashboard local

Adicionar configuração e dashboard versionado de Prometheus/Grafana, overlay separado, métricas de API, estado do banco, throughput, erros e latência. Conferir configuração via `docker compose config` sem subir staging.

## Task 3: Viewer read-only

Adicionar overlay Adminer, SQL idempotente de privilégio mínimo e launcher local que cria a credencial ignorada e inicia apenas os serviços locais requeridos. Testar autorização positiva de `SELECT` e negativa de `INSERT`/`UPDATE` contra o banco local.

## Task 4: Documentação e checklist

Registrar fontes oficiais consultadas, portas, comandos de ligar/parar, limitações e rollback que preserve volumes. Atualizar OPS-01, `ACTIVE_CONTEXT.md` e handoff.

## Verificação e proteção de dados

- Rodar specs focados, `pnpm check`, `pnpm test`, `pnpm build` e `pnpm test:ssr` após as fatias de código.
- Verificar Compose renderizado, interfaces/portas, health dos serviços, scrape Prometheus e dashboard local.
- Antes de criar o papel viewer, confirmar backup local recente e manifesto/checksum. Após provisionar, conferir a mesma contagem agregada de tabelas/linhas usada antes; testar escrita negada em transação que faça rollback e leitura permitida.
- Confirmar staging inalterado, volume PostgreSQL preexistente montado e credenciais ausentes do Git/diff/logs.
- Fazer commits separados por responsabilidade: API metrics; stack local OPS-01 (dashboards + viewer, com sua topologia Compose e comandos coordenados); documentação/checklist. Nunca incluir arquivos locais ignorados ou o plano visual preexistente.

## Rollback

Desligar apenas os serviços pelos Compose overlays e preservar os volumes. Para remover a credencial de consulta, executar o procedimento documentado de revogação do papel dedicado depois de encerrar sessões. Não apagar o volume `black-market-postgres-data` nem cópias de backup.

## Execução local (18/10/2026)

- Métricas da API: concluídas e comitadas em `fa77e82`; a API local servida em `127.0.0.1:3000` expõe `/api/v1/metrics` apenas quando `LOCAL_METRICS_ENABLED=true` e `APP_ENV=local`.
- Dashboard e visualizador: concluídos localmente. `pnpm ops:local:observability` inicia API/Prometheus/Grafana e `pnpm ops:local:db-viewer` inicia Adminer com o papel read-only. As portas publicadas ficam no loopback; os dados Prometheus/Grafana usam volumes separados e persistentes.
- Os dois serviços de operações ficam em um commit OPS-01 integrado porque seus comandos usam os mesmos Compose overlays e dependências; API metrics e documentação continuam commits distintos.
- Verificação: `pnpm check`, `pnpm test` (1.200 aprovados/1 ignorado), `pnpm build` e `pnpm test:ssr` passaram. Os serviços locais responderam HTTP 200; Prometheus reportou alvo API e banco prontos; Grafana encontrou o dashboard. `bdo_viewer` leu o banco, enquanto tentativa de escrita foi negada.
- Dados: contagens verificadas após o bootstrap — 23 tabelas-base públicas, `item_versions=445580`, `reference_records=209177`. O backup local com SHA-256 `943C0C3257CD36E9C85351D00AA089F267E5839C4CCA364EFDB25521B69A8EE3` e o volume PostgreSQL anterior foram preservados. Nenhuma migration, seed, reset ou alteração de registros de aplicação foi executada.
- Limite: observabilidade atual não expõe métricas internas de consultas/locks do PostgreSQL. Staging, produção, uptime externo, analytics e release continuam fora do escopo local implementado.
- Ruling: a API monitorada publica `127.0.0.1:3000` para substituir o API host enquanto a stack estiver ativa — garante que o dashboard veja a sessão do Web em `localhost:4200`; custa indisponibilidade do API host de desenvolvimento até `pnpm ops:local:observability:stop`, sem impacto nos dados do banco.
- Ruling: dashboard/Grafana e Adminer/role são um único commit `feat(ops)` — os dois comandos compartilham Compose overlays e o mesmo PostgreSQL local, e o checklist os aceita juntos como OPS-01; custo se a separação fosse preferível: rollback/revisão não pode versionar cada interface independentemente.
