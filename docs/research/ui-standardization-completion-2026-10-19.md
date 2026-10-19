# Reconciliação da auditoria MMORPG — 19/10/2026

> Continuação posterior desta mesma data: [Família preenchida, administração e zoom](ui-filled-zoom-controls-2026-10-19.md). As pendências abaixo representam o estado desta primeira rodada; consulte ACTIVE_CONTEXT §196 para a implementação e a matriz sintética subsequentes.

## Escopo e base real

Entrega desta rodada: branch `codex/ui-ux-audit-completion`; correção visual no commit `b7407e3`, documentação em commit separado. Trabalho preservado no worktree para revisão; não foi integrado a `main` nem ao checkout que atende 4200.

Retomada do pedido completo de auditoria e do chat “Localizar tarefas recentes do Black”, lido pela ferramenta de chats. O checkout principal estava em `d98ad07`, com planos ainda sem implementação; o trabalho posterior estava no worktree `all-branches-integration`, branch `codex/unified-lifeskills-ui`, HEAD `c9e7dd2`. Esta revisão partiu desse HEAD em um novo worktree `ui-ux-audit-completion`, preservando os checkouts, servidores e arquivos não rastreados anteriores.

Não reimplementar o rollout existente. O [inventário](ui-route-inventory-2026-10-19.md) cobre 25 owners de rota, aliases, guards, SSR e gates do MVP. As evidências visuais anteriores estão em [revisão do hub e Família](unified-professions-ui-review-2026-10-19.md) e [tutorial de Família](family-tutorial-target-fix-2026-10-19.md). Datas, amostras e resultados desses relatórios são históricos; não foram convertidos em novas medições nesta rodada.

## Diagnóstico complementar

| Achado                             | Severidade, frequência e alcance                                                  | Causa / impacto                                                                                                                                                                                         | Correção e custo                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tokens de cor inexistentes         | P1 para foco; P2 para aparência. 18 referências em sete arquivos, 12 sem fallback | `--bm-gold`, `--bm-gold-strong`, `--bm-text-muted`, `--bm-border-strong` e `--bm-on-accent` não eram declarados. CSS de foco, seleção, texto e borda podia ficar inválido ou depender de fallback local | Consumidores migrados para tokens existentes, sem novos aliases; custo baixo, sem dependência de API/banco      |
| Regras de interação contraditórias | P2, toda futura alteração do grafo                                                | A mesma referência mandava corpo expandir e somente selecionar; roda exigia modificador e depois dispensava modificador                                                                                 | Referência reconciliada com implementação e decisão de 12/10; custo baixo, preserva comportamento               |
| Contrato de densidade incompleto   | P2, controles de toda aplicação                                                   | Referências exigiam 44 px universalmente, enquanto a primitiva já oferecia 36 px para densidade                                                                                                         | Padrão 44 px e exceção compacta/ícone 36 px explícitos; matriz de variantes/estados e limites de acessibilidade |
| Especificação anterior ainda ativa | P2, duas rotas e agentes futuros                                                  | Texto aprovado antes do pedido de unificação mandava preservar duas páginas, contrariando o pedido posterior e código                                                                                   | Objetivos, tabela e critérios atualizados; auditoria inicial identificada como histórica                        |
| Skill sem checklist/API completa   | P2, todas as novas telas                                                          | Fonte canônica existia, mas dependia de código/handoff para decisões recorrentes                                                                                                                        | Skill existente ampliada, catálogo real expandido e regra persistente em `AGENTS.md`; sem terceira skill        |

A varredura leu CSS/SCSS e estilos inline dos componentes, comparando referências com declarações e com as cores geradas pelo mapa `$palette`. Tokens com fallback foram distinguidos de declarações ausentes sem fallback; a string de prefixo usada no teste de escala não é um token de produto. Antes da correção, o navegador em 4200 também retornou valor vazio para os quatro nomes consultados; `--bm-accent`, `--bm-focus` e `--bm-muted` estavam definidos.

## Decisões de produto preservadas

- **Profissões:** `/lifeskills?tab=production|sessions` mantém um único contexto. `/recommendations` é alias compatível, por pedido posterior explícito do usuário. Produção depende de sessão e não monta no SSR público ou após logout. O estado de sessão em edição permanece no hub.
- **Retorno de maestria:** investimento dividido pela diferença de rendimento informada manualmente é um cenário hipotético; não prevê efeito real de trocar equipamento ou alcançar um bracket. Sem essa ligação validada, não justifica tab principal. Mantida apenas compatibilidade de URL/presets, com aviso.
- **Tempo de treino:** XP restante dividido por XP/h manual ajuda a projetar uma taxa conhecida, mas não recomenda receita/atividade nem incorpora progressão por patch. Fora da navegação principal; preservar dados até decisão de descontinuação. Uma versão futura precisa de ligação verificável entre nível, atividade e taxa.
- **Família:** um painel por URL; seleção de personagem compartilhada; atributos secundários recolhidos; salvar por blur/ação existente. Não criar registros reais para preencher QA.
- **Grafo:** corpo seleciona; controles próprios expandem e abrem detalhes; roda amplia no canvas sem modificador e mantém cursor ancorado. Nenhuma fórmula, decisão de origem, posição ou dado foi alterado nesta revisão.

## Design system e skill persistente

O [catálogo técnico](../design-system/bdo-ui.md) agora mapeia arquitetura, tokens reais, cores semânticas, geometria/efeitos existentes, variantes de botão, tamanhos, estados, formulários, navegação, painéis, tabelas, overlays, feedback e exemplos corretos/incorretos. Distingue tokens já existentes de literais compartilhados que ainda precisam de migração; não promete tokenização integral do SCSS.

A [skill canônica](../../.agents/skills/bdo-ui-design/SKILL.md) preserva as regras úteis de BDO e acrescenta desktop-first, navegação real, anatomia de componentes, prevenção de duplicação e checklists obrigatórios de criação/revisão. `ui-design` continua responsável por composição; Angular/Spartan, por implementação/primitivas. `AGENTS.md` exige leitura prévia, reuso e justificativa/documentação para novos padrões.

Os 16 itens pedidos para a skill ficam distribuídos entre entrada e referências: filosofia/referências BDO; arquitetura/tokens; tipografia; layout; componentes; navegação; formulários/interações; movimento; acessibilidade; densidade; exemplos; checklists de criação e revisão; regra de reuso. Não foi criada uma nova biblioteca nem outro sistema de tema.

Uma avaliação independente somente leitura, antes da edição, reproduziu conflitos de zoom/click/densidade e a falta de contrato de rota e hierarquia de variantes. A mesma situação foi reavaliada após a edição; os achados documentais adicionais foram corrigidos antes do fechamento. Esta avaliação não é evidência de navegação ou acessibilidade em runtime.

## Consulta pública complementar

Consulta em **19/10/2026**, por leitor web, para organização da interface. Sem login, extração de dados ou comparação de cálculo.

| Fonte e URL                                                                   | Resultado atual                                                                                                                     | Uso / limite                                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [BDO Workshop — Crafting Workshop](https://bdoworkshop.com/crafting-workshop) | Leitor não conseguiu acessar                                                                                                        | Sem nova observação; manter pesquisa prévia e evidência local                           |
| [BDO Codex — Recipes](https://bdocodex.com/us/recipes/)                       | Leitor recusou a URL                                                                                                                | Não inferir ausência de funcionalidade                                                  |
| [BDOLytics — Cooking Market SA](https://bdolytics.com/en/SA/cooking/market)   | Leitor não conseguiu acessar                                                                                                        | Não confirmar região, campos ou números por suposição                                   |
| [Garmoth — Gear Planner](https://garmoth.com/character/default)               | Superfície pública em inglês, região EU visível; navegação Character Info, Passives & Fame, Gear Builder, Upgrade Path e comparação | Observação de organização por contexto, sem copiar dados/estilos e sem provar algoritmo |

Esta consulta não autoriza transformar valores concorrentes em fórmulas ou dados do Black Market. Não houve cenário numérico pareado, alteração de cálculo ou nova regra de jogo.

## Validação desta rodada

`pnpm check` passou. A repetição isolada de `pnpm test` passou: 78 Calculators, 270 API e 1 ignorado por exigir PostgreSQL descartável, 867 Web, 81 scripts — **1.296 aprovados e 1 ignorado**. A primeira rodada concorreu com a compilação do watcher de QA e teve timeout de 5 s no inventário de rotas; foi interrompida, o watcher foi encerrado e a suíte integral foi repetida sem mudar timeout, pular testes ou alterar configuração. Não atribuir a causa do timeout a uma mudança de produto sem reprodução.

A varredura final encontrou **1.912 referências de estilo e zero tokens desconhecidos** no escopo CSS/SCSS e componentes, excluindo strings de testes. `quick_validate.py` validou a skill, usando PyYAML em pasta temporária porque os runtimes locais não tinham o módulo; dependências do produto não foram alteradas. A revisão independente verificou as 18 substituições e 30 links Markdown locais, sem achados acionáveis no diff final.

O navegador integrado abriu a base anterior em 4200, hub de sessões em 1280×720, e confirmou botões de 44 px, contexto/resultado e histórico recolhido. `/family?tab=family` voltou à Home com modal de login; nenhum login, conta ou dado foi alterado. O Playwright MCP estava ocupado por outra sessão e não foi encerrado. O CLI Ego não estava instalado; nenhuma instalação de navegador foi feita. A tentativa de prévia Angular em 4202 teve timeout de transporte do Vite; o watcher temporário foi encerrado. Build de produção, SSR e eventual inspeção posterior são registrados separadamente no fechamento, sem tratar esse erro de ferramenta como defeito de UI confirmado.

### Fechamento de build, SSR e browser

Build de produção Web e `pnpm test:ssr` passaram. Inicial: **502,80 kB**, ainda 2,80 kB acima do aviso; árvore: **18,54 kB** ante 16 kB; catálogo: **16,03 kB** ante 16 kB. Persistem fallback de locale pt-BR→pt e CommonJS do OCR. Budgets intactos.

A produção compilada foi servida temporariamente em `localhost:4202`, sem watcher, e abriu normalmente no navegador integrado. Em 1280×720, foram verificados o hub de sessões, troca para produção, negação de acesso privado, modal de login, Escape com retorno do foco ao acionador e Voltar para sessões. A descrição do login passou a computar `rgb(185, 177, 160)`, correspondente a `--bm-muted`; modal sem overflow (largura do documento/viewport 1280/1280). O origin isolado mostrou erro ao consultar provedores de login; autenticação não foi certificada nem tentada. Família preenchida e layout administrativo continuam pendentes.

Capturas locais desta rodada, fora do Git: `C:/Users/Bellussi/.codex/visualizations/2026/10/19/01a1544f-c7df-7d10-9ca6-ea8ed5d33e83/ui-audit-sessions-production.png` e `ui-audit-login-production.png` na mesma pasta. Elas mostram a amostra 1280×720, sem representar uma nova execução das cinco resoluções anteriores. Servidor temporário de QA encerrado ao final; servidor anterior em 4200 preservado.

## Pendências e limites

- Validar ficha de Família preenchida e estados administrativos com sessão e permissões adequadas. A amostra autenticada histórica era vazia; fixtures não substituem revisão visual preenchida.
- Repetir matriz completa e zoom 125%/150% quando o ambiente de QA autenticado estiver disponível; não apresentar a inspeção atual de 1280×720 como nova validação das cinco resoluções históricas.
- Manter inventário explícito de superfícies suspensas por `SCREENSHOT_MVP`; não desativar gates para declarar revisão completa.
- Geometria, sombras, overlays e parte do adaptador Helm ainda têm literais compartilhados. Migrar por consumidor demonstrável; não criar tokens sem uso. Há exceções documentadas para árvore, equipamento e leitura legal.
- Warnings de bundle/CSS, locale e CommonJS devem permanecer visíveis no fechamento; não aumentar budgets por estética. A existência desses avisos não invalida automaticamente os testes funcionais nem certifica performance.
- Não declarar auditoria universal de acessibilidade/performance, cálculos externos pareados ou validação de todo catálogo com base neste trabalho de UI.

Próximo agente: começar pelo contexto e checklist atualizados, manter esta base de implementação, não retomar os planos antigos do checkout principal como se estivessem pendentes. Preservar dados e arquivos anteriores; sem push/merge/deploy nesta rodada.
