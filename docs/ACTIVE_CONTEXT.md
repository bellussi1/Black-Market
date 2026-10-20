# Estado atual — Black Market

Atualizado em 20/10/2026. Resumo substituível deste checkout; histórico completo não deve ser carregado no início.

## Checkout e continuidade

- Branch: `codex/ui-ux-audit-completion`; worktree: `C:\Users\Bellussi\.codex\worktrees\ui-ux-audit-completion\Site de BDO`.
- Base anterior à consolidação documental: `792bc11`. O checkout principal em `Documents/ChatGPT/Site de BDO` estava em `d98ad07`, com arquivos locais não rastreados; não representa as últimas entregas desta branch.
- Servidor anterior `4200` pertence a outro checkout e foi preservado. Temporário de QA `4202` encerrado. Nada desta continuação foi enviado, integrado ou implantado.

## Últimas entregas verificadas

- UI compartilhada, Família/administração/zoom e tokens: [evidências](research/ui-filled-zoom-controls-2026-10-19.md).
- Receitas: [boxes compactos](research/recipe-decision-panels-density-2026-10-19.md) e [enquadramento/scroll dos detalhes](research/recipe-expansion-focus-details-2026-10-19.md). Expansão manual preserva zoom; atualizações e recolhimento não reenquadram.
- Home: busca/atalhos no topo; [relatório](research/home-hierarchy-refresh-2026-10-19.md), código `8786b9f`.
- Profissões: navegação visual, formulário agrupado, resumo sticky e acesso público preservado; [relatório](research/lifeskills-visual-refresh-2026-10-19.md), código `127b1be`.
- PERF-01: imports compartilhados isolados e CSS/ícone sem uso removidos; produção abaixo do budget inicial. [Medição, testes e limites](research/shell-bundle-deferral-review-2026-10-18.md#continuação-de-20102026--entrypoints-e-css-sem-consumidores).

## Trabalho desta retomada

- Documentação de continuidade centralizada neste arquivo e no [índice](README.md). Oito atalhos antigos removidos após migrar referências; cobertura/fila no [catálogo de pedidos](project-feature-checklist.md), frontend e qualidade nas fontes técnicas existentes.
- Originais preservados em [arquivo datado](archive/README.md), com hashes e revisão Git. Antigos “ACTIVE_CONTEXT §N” pertencem ao snapshot, não a este resumo.
- `ai-memory` baixado em `C:\Users\Bellussi\Documents\ChatGPT\ai-memory`, revisão `11ab100`. Clone para avaliação; sem instalação de binário, serviço, MCP, hooks ou captura de conversas. Critérios e fonte no [índice](README.md#ai-memory).

## Próximo passo e limites

- Continuar pela tarefa solicitada, consultando somente a área relevante no índice; não reimplementar entregas a partir de checkboxes históricos.
- Pendências externas persistentes: corpus OCR independente, dados pós-patch/fontes temporais permitidas e homologação real específica. Detalhes e prioridades no catálogo de pedidos; não inventar dados para fechar lacunas.
- Próxima limpeza técnica: avisos independentes dos estilos da árvore/catálogo. Margem do bundle inicial é pequena; manter budgets. Não tratar contexto histórico de staging como estado implantado atual.
- Gates desta entrega: `pnpm check`, suíte completa, produção e SSR final passaram. Revisão independente sem findings. Fixtures anteriores não homologam persistência/autenticação reais ou zoom nativo. Sem alterações de banco, outros checkouts ou serviços existentes.
