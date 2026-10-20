# Estado atual — Black Market

Atualizado em 20/10/2026. Resumo substituível deste checkout; histórico completo não deve ser carregado no início.

## Checkout e continuidade

- Branch: `codex/ui-ux-audit-completion`; worktree: `C:\Users\Bellussi\.codex\worktrees\ui-ux-audit-completion\Site de BDO`.
- Base anterior à consolidação documental: `792bc11`. O checkout principal em `Documents/ChatGPT/Site de BDO` estava em `d98ad07`, com arquivos locais não rastreados; não representa as últimas entregas desta branch.
- Runtime confirmado em 20/10: Web `4200` e API `3000` executam deste worktree (código `aba2267`); Home/Profissões, readiness e catálogo responderam HTTP 200. Sessões gerenciadas: Web `47754`, API `24264`. A API usa o `.env` e assets do checkout principal, coletores desativados e PostgreSQL existente; sem migrações ou seeds.

## Últimas entregas verificadas

- UI compartilhada, Família/administração/zoom e tokens: [evidências](research/ui-filled-zoom-controls-2026-10-19.md).
- Receitas: [boxes compactos](research/recipe-decision-panels-density-2026-10-19.md) e [enquadramento/scroll dos detalhes](research/recipe-expansion-focus-details-2026-10-19.md). Expansão manual preserva zoom; atualizações e recolhimento não reenquadram.
- Home: busca/atalhos no topo; [relatório](research/home-hierarchy-refresh-2026-10-19.md), código `8786b9f`.
- Profissões: navegação visual, formulário agrupado, resumo sticky e acesso público preservado; [relatório](research/lifeskills-visual-refresh-2026-10-19.md), código `127b1be`.
- PERF-01: imports compartilhados isolados e CSS/ícone sem uso removidos; produção abaixo do budget inicial. [Medição, testes e limites](research/shell-bundle-deferral-review-2026-10-18.md#continuação-de-20102026--entrypoints-e-css-sem-consumidores).

## Trabalho desta retomada

- Documentação de continuidade centralizada neste arquivo e no [índice](README.md). Oito atalhos antigos removidos após migrar referências; cobertura/fila no [catálogo de pedidos](project-feature-checklist.md), frontend e qualidade nas fontes técnicas existentes.
- Auditoria de branches após `git fetch origin`: `main`/`origin/main` em `1f2bb52`; `aba2267` contém 28 commits de entrega posteriores e todas as branches locais/remotas são suas ancestrais. Branches antigas não têm trabalho divergente. Sem merge, push ou exclusão de branches; commits documentais posteriores aumentam a distância, sem mudar o código servido.
- `ai-memory` baixado em `C:\Users\Bellussi\Documents\ChatGPT\ai-memory`, revisão `11ab100`. Clone para avaliação; sem instalação de binário, serviço, MCP, hooks ou captura de conversas. Critérios e fonte no [índice](README.md#ai-memory).

## Próximo passo e limites

- Continuar pela tarefa solicitada, consultando somente a área relevante no índice; não reimplementar entregas a partir de checkboxes históricos.
- Pendências externas persistentes: corpus OCR independente, dados pós-patch/fontes temporais permitidas e homologação real específica. Detalhes e prioridades no catálogo de pedidos; não inventar dados para fechar lacunas.
- Próxima limpeza técnica: avisos independentes dos estilos da árvore/catálogo. Margem do bundle inicial é pequena; manter budgets. Não tratar contexto histórico de staging como estado implantado atual.
- Gates anteriores de produto passaram; nesta auditoria: fetch/ancestralidade, build API e smoke HTTP reais. Docker Desktop foi iniciado; PostgreSQL usa `sitedebdo_postgres_data`. Staging `8081` reiniciou com a imagem antiga e não foi atualizado. Não confundir esse ambiente com o desenvolvimento `4200`. Nenhuma escrita de dados para QA.
