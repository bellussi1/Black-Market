# Estado atual — Black Market

Atualizado em 21/10/2026. Resumo substituível deste checkout; histórico completo não deve ser carregado no início.

## Checkout e continuidade

- Branch de referência: `main`; checkout principal: `C:\Users\Bellussi\Documents\ChatGPT\Site de BDO`. Entregas integradas em `origin/main`; revisão exata em `git log`.
- Web `4200` e API `3000` agora executam deste checkout em watch; sessões gerenciadas Web `5759`, API `82638`. Comandos/cuidado de sincronização em [desenvolvimento](development.md#prévia-visual-de-referência). QA de outros worktrees usa outra porta.

- Staging gratuito atualizado para `13e4661`, imagem e assets isolados; túnel restrito aos convidados ativo em segundo plano. URL/estado somente em `data/staging/` e `.env.staging` ignorados. [Operação e validação](staging-local.md#compartilhamento-verificado-em-21102026).

## Últimas entregas verificadas

- UI compartilhada, Família/administração/zoom e tokens: [evidências](research/ui-filled-zoom-controls-2026-10-19.md).
- Receitas: [boxes compactos, maestrias, plano lateral e prévia do otimizador alinhados](research/recipe-decision-panels-density-2026-10-19.md) e [enquadramento/scroll dos detalhes](research/recipe-expansion-focus-details-2026-10-19.md). Culinária/Alquimia/Processamento modelados aparecem conforme a cadeia, fora dos ajustes recolhidos; overrides continuam locais à simulação. Expansão manual preserva zoom; atualizações e recolhimento não reenquadram.
- Home: busca/atalhos no topo; [relatório](research/home-hierarchy-refresh-2026-10-19.md), código `8786b9f`.
- Profissões: navegação visual, formulário agrupado, resumo sticky e acesso público preservado; [relatório](research/lifeskills-visual-refresh-2026-10-19.md), código `127b1be`.
- Ranking personalizado: personagem ativo/tempos sincronizados, intermediários secundários preservados, melhores variantes por produto após filtros e busca recalculada automaticamente. [Diagnóstico e limites](research/home-recommendations-competitive-review-2026-10-16.md#ranking-personalizado--revisão-de-20102026). Sessão Google real indisponível no QA; não anunciar homologação pessoal.
- Comparação recursiva em Produção: venda independente da final e de todos os intermediários fabricáveis, com cenário, lucro/h, lucro e tempo de cada lote; ciclos/alternativas tratados, pendências e baixa atividade explícitas. Primeira lista aberta. [Contrato e QA sintética](research/home-recommendations-competitive-review-2026-10-16.md#venda-independente-das-subreceitas--20102026). Não somar lucros nem anunciar ótimo global ou homologação da conta real.
- Desidratados: variantes concretas de Gobião, Calamar e Marisco para receitas COOK unitárias revisadas, mantendo a opção fresca e escolhas por URL; ranking e grafo usam seus IDs/pesos/estoques. Aviso de pendências em linha própria, alinhado à esquerda. [Fontes, inspeção do cliente e limites](research/fish-price-equivalence-review-2026-10-16.md). Não generalizar razões para outros peixes/quantidades ou Lagosta; não confundir cotação ausente com custo zero.
- PERF-01: imports compartilhados isolados e CSS/ícone sem uso removidos; produção abaixo do budget inicial. [Medição, testes e limites](research/shell-bundle-deferral-review-2026-10-18.md#continuação-de-20102026--entrypoints-e-css-sem-consumidores).

## Trabalho desta retomada

- Documentação de continuidade centralizada neste arquivo e no [índice](README.md). Oito atalhos antigos removidos após migrar referências; cobertura/fila no [catálogo de pedidos](project-feature-checklist.md), frontend e qualidade nas fontes técnicas existentes.
- Todas as branches locais/remotas verificadas são ancestrais da entrega integrada; não há trabalho divergente a recuperar. Usuário autorizou commits/push em `main` e manter a prévia atualizada. Nenhuma branch foi apagada.
- `ai-memory` baixado em `C:\Users\Bellussi\Documents\ChatGPT\ai-memory`, revisão `11ab100`. Clone para avaliação; sem instalação de binário, serviço, MCP, hooks ou captura de conversas. Critérios e fonte no [índice](README.md#ai-memory).

## Próximo passo e limites

- Continuar pela tarefa solicitada, consultando somente a área relevante no índice; não reimplementar entregas a partir de checkboxes históricos.
- Pendências externas persistentes: corpus OCR independente, dados pós-patch/fontes temporais permitidas e homologação real específica. Detalhes e prioridades no catálogo de pedidos; não inventar dados para fechar lacunas.
- Receitas conferidas ao vivo em 1920/1366/390 px: sem overflow horizontal ou pageerror. API readiness HTTP 200. PostgreSQL usa `sitedebdo_postgres_data`, coletores desativados; sem migrações/seeds. Staging `8081` conserva imagem antiga e não é a prévia `4200`.
- Alinhamento atual: quantidade/maestrias na mesma linha quando há espaço, gutters e títulos equivalentes; configuração e resultado com a mesma altura na linha, conforme o maior conteúdo, por orientação posterior do usuário. Empilhados mantêm alturas próprias. Campos de 44 px e compactos de 36 px nos controles locais. Evidência no relatório de receitas acima; conteúdo privado preenchido exige QA autenticada, fórmulas preservadas.
- Otimizador: prévia com métricas no topo, decisões abertas em colunas, etapas e detalhes secundários; cabeçalho/ações sticky. Escape/cancel devolvem foco ao acionador sem scroll. Estilos encapsulados em `recipe-optimization-dialog.scss`; fórmulas e aplicação preservadas. QA real limitada + fixture de certificado/sem plano, sem alegar homologação global. Evidências no relatório de receitas.
- Verificação: check final, suíte integral (1.318 aprovados/1 ignorado), 75 testes da árvore após foco, produção e SSR aprovados. Inicial 499,84 kB; CSS da árvore 18,66 kB, budgets preservados. Diálogo sem overflow em 1920/1536/1280/390/320, cabeçalho/ações visíveis e retorno de foco conferido. Revisão independente sem achados. Servidores continuam no checkout principal em watch.
