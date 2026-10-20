# Estado atual — Black Market

Atualizado em 20/10/2026. Resumo substituível deste checkout; histórico completo não deve ser carregado no início.

## Checkout e continuidade

- Branch de referência: `main`; checkout principal: `C:\Users\Bellussi\Documents\ChatGPT\Site de BDO`. Todas as entregas até `054f865` integradas por fast-forward e publicadas em `origin/main`.
- Web `4200` e API `3000` agora executam deste checkout em watch; sessões gerenciadas Web `72973`, API `40945`. Comandos/cuidado de sincronização em [desenvolvimento](development.md#prévia-visual-de-referência). QA de outros worktrees usa outra porta.
- Plano local não rastreado preservado com SHA-256 conferido em `tmp/preserved-before-main-20261020/2026-10-16-roadmap-visual-phase-3.md`; imagem `lifeskills-sessions-desktop.png` mantida. `.env`, assets, banco e demais worktrees preservados.

## Últimas entregas verificadas

- UI compartilhada, Família/administração/zoom e tokens: [evidências](research/ui-filled-zoom-controls-2026-10-19.md).
- Receitas: [boxes compactos](research/recipe-decision-panels-density-2026-10-19.md) e [enquadramento/scroll dos detalhes](research/recipe-expansion-focus-details-2026-10-19.md). Expansão manual preserva zoom; atualizações e recolhimento não reenquadram.
- Home: busca/atalhos no topo; [relatório](research/home-hierarchy-refresh-2026-10-19.md), código `8786b9f`.
- Profissões: navegação visual, formulário agrupado, resumo sticky e acesso público preservado; [relatório](research/lifeskills-visual-refresh-2026-10-19.md), código `127b1be`.
- PERF-01: imports compartilhados isolados e CSS/ícone sem uso removidos; produção abaixo do budget inicial. [Medição, testes e limites](research/shell-bundle-deferral-review-2026-10-18.md#continuação-de-20102026--entrypoints-e-css-sem-consumidores).

## Trabalho desta retomada

- Documentação de continuidade centralizada neste arquivo e no [índice](README.md). Oito atalhos antigos removidos após migrar referências; cobertura/fila no [catálogo de pedidos](project-feature-checklist.md), frontend e qualidade nas fontes técnicas existentes.
- Todas as branches locais/remotas verificadas são ancestrais da entrega integrada; não há trabalho divergente a recuperar. Usuário autorizou commits/push em `main` e manter a prévia atualizada. Nenhuma branch foi apagada.
- `ai-memory` baixado em `C:\Users\Bellussi\Documents\ChatGPT\ai-memory`, revisão `11ab100`. Clone para avaliação; sem instalação de binário, serviço, MCP, hooks ou captura de conversas. Critérios e fonte no [índice](README.md#ai-memory).

## Próximo passo e limites

- Continuar pela tarefa solicitada, consultando somente a área relevante no índice; não reimplementar entregas a partir de checkboxes históricos.
- Pendências externas persistentes: corpus OCR independente, dados pós-patch/fontes temporais permitidas e homologação real específica. Detalhes e prioridades no catálogo de pedidos; não inventar dados para fechar lacunas.
- Limpeza atual concluída: seletores sem uso e 25 declarações sobrescritas removidos; comparação Sass/PostCSS e revisão independente preservaram a cascata. Aviso do catálogo eliminado; árvore ainda acima do aviso. Check, suíte completa, produção e SSR passaram; evidência no relatório de performance acima.
- Receitas conferidas ao vivo em 1920/1366/390 px: sem overflow horizontal ou pageerror. API readiness HTTP 200. PostgreSQL usa `sitedebdo_postgres_data`, coletores desativados; sem migrações/seeds. Staging `8081` conserva imagem antiga e não é a prévia `4200`.
