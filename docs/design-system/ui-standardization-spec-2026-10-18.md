# Especificação: padronização MMORPG da interface

- **Status:** especificação aprovada pelo usuário em 19/10/2026; planos de implementação aprovados e execução iniciada em 19/10/2026.
- **Base aprovada para especificação:** proposta de arquitetura aprovada pelo usuário em 18/10/2026.
- **Histórico de aprovação:** a aprovação inicial autorizou a direção e a especificação; a implementação começou após a aprovação posterior dos quatro planos separados.
- **Decisão substitutiva de 19/10/2026:** o usuário solicitou depois uma única rota para Profissões e produção. O contrato abaixo foi reconciliado com `6bcc0f0` e com a revisão `unified-professions-ui-review-2026-10-19.md`; a proposta inicial de manter duas páginas foi substituída.
- **Auditoria e evidências:** [`../research/ui-standardization-audit-2026-10-18.md`](../research/ui-standardization-audit-2026-10-18.md).

## Problema

O Black Market já usa paleta carvão/bronze, fontes e componentes locais inspirados nos menus de BDO, mas cada área aplica variantes próprias de tabs, botões, espaçamentos, formulários e cabeçalhos. Recomendações e Life Skills dividem conceitos sem dividir a navegação; a tela Família mantém várias seções extensas juntas apesar do parâmetro `tab`. A densidade faz tarefas e resultados importantes ficarem abaixo da primeira dobra em desktop.

## Objetivos

1. Dar a todas as rotas uma linguagem visual MMORPG própria, consistente e reconhecível, sem imitar um dashboard SaaS.
2. Unificar o fluxo de Recomendações e Life Skills em `/lifeskills`, preservando `/recommendations` como alias compatível e o acesso autenticado ao conteúdo privado.
3. Simplificar Família com conteúdo exclusivo por aba, preservando personagens, equipamentos, maestrias, benefícios, ações e dados armazenados.
4. Reduzir rolagem e esforço de interpretação, exibindo decisão, estado e resultado principais cedo, sem esconder premissas ou inventar valores.
5. Estabelecer uma referência única para futuras alterações de UI e uma migração verificável por rotas.
6. Priorizar monitores desktop: 1920×1080, maiores e intermediários; manter teclado, acessibilidade e comportamento mobile existente sem fazer redesign mobile-first.

## Fora de escopo

- Alterar fórmulas, preço, cotação, maestria do jogo, modelo de domínio ou dados de mercado.
- Excluir registros, presets, perfis ou dados do usuário; resetar banco, workspace ou sessão.
- Quebrar as URLs `/recommendations`, `/lifeskills` ou `/family`, ampliar acesso privado ou publicar/deployar.
- Instalar outra biblioteca visual ou reescrever a aplicação inteira em um framework diferente.
- Copiar componentes, números ou dados de concorrentes. A pesquisa pública informa padrões de fluxo e está limitada conforme o relatório.
- Certificar em mobile todas as composições agora; manter regressão funcional e sem overflow é obrigatório.

## Fonte de verdade visual

- A skill existente `.agents/skills/bdo-ui-design/SKILL.md` será a fonte canônica para identidade, regras visuais, tokens e componentes do produto.
- `.agents/skills/ui-design/SKILL.md` e `agents/design-ui.md` continuarão como processo de composição, implementação e revisão; deverão apontar para a fonte canônica e deixar claro que não definem um segundo tema.
- `docs/design-system/bdo-ui.md` será o catálogo técnico sincronizado com tokens e primitivas disponíveis. `AGENTS.md` direcionará agentes às duas skills com seus papéis distintos.
- Não será criada uma terceira skill nem substituída a paleta carvão/bronze. Os componentes locais em `apps/web/src/app/ui` e os tokens `--bm-*` serão evoluídos e reutilizados.

### Contratos visuais

- **Material e cor:** superfícies carvão, bordas discretas, títulos de painel bronze e ouro para seleção, progresso ou informação de jogo. Evitar aplicar ouro a todo texto e a todo card. Preservar semântica de erro, aviso, sucesso e informação.
- **Tipografia:** manter Barlow Semi Condensed e documentar escalas semânticas de display, título, corpo, apoio e metadado. Corpo principal não pode depender de placeholder para explicar campo; metadado compacto não deve competir com conteúdo nem ficar ilegível.
- **Espaçamento:** criar uma escala comum baseada em incrementos de 4 px, mapear padding de página, painel, formulário e grupos para tokens e remover divergências por migrações locais. Container padrão aproveita o limite atual; telas densas de dados podem usar uma variante ampla explícita, compartilhada e documentada.
- **Controles:** variantes compartilhadas para ação principal, secundária, discreta e destrutiva; um tamanho padrão coerente com o atual (44 px) e um tamanho compacto claramente reservado a tabelas/toolbars, sem diminuir a área interativa da linha. Inputs mantêm rótulo, unidade/dica e erro junto ao campo.
- **Navegação:** links de rota são links; tabs de conteúdo sem mudança de rota são controles de tab acessíveis por teclado. O estilo ativo, foco, carregamento, vazio, desabilitado e erro é compartilhado. Não usar `aria-pressed` como substituto de semântica de navegação.
- **Painéis e dados:** cabeçalhos, cards, tabelas, métricas e estados vazios seguem variantes comuns; números comparáveis usam alinhamento/tabular numerals. Ícones mantêm slot reservado e proporção, sem duplicar ícones no menu.
- **Movimento:** preservar as transições de rota já implementadas e padronizar duração/easing em tokens. Animar apenas propriedades compostas, respeitar `prefers-reduced-motion`, evitar animar o shell fixo e impedir que tutorial, fontes, feedback ou conteúdo assíncrono provoquem layout shift.
- **Exceções:** layouts de domínio como árvore de crafting, roda de equipamentos e slots do jogo podem ter CSS próprio quando necessário à interação, mantendo tokens, foco, tipografia e contratos compartilhados.

## Navegação de Life Skills e Recomendações

`/lifeskills` renderiza o hub único, com cabeçalho, tabs e container compartilhados. `/recommendations` redireciona para a aba de produção por compatibilidade. Esta é a decisão posterior do usuário, já implementada; não restaurar o antigo desenho de duas páginas.

| URL                          | Acesso e comportamento                                      | Conteúdo                                         |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `/lifeskills?tab=production` | Hub público; conteúdo de produção exige sessão e navegador  | Recomendações lazy autenticadas ou ação de login |
| `/lifeskills?tab=sessions`   | Público                                                     | Registro e comparação de sessões observadas      |
| `/recommendations`           | Alias: preserva demais queries/hash e fixa `tab=production` | Encaminha ao hub canônico                        |

- O parâmetro `tab` será a representação navegável do estado: `production` ou `sessions`. Abre por link direto, sobrevive a refresh e responde a back/forward.
- Ao trocar a aba, muda apenas a query de `/lifeskills`; o mesmo componente mantém o estado de sessão em edição. Produção privada não monta durante a verificação de identidade, no SSR público ou após logout.
- Abrir `/lifeskills?tab=production` sem sessão mostra explicação e ação de login no hub. O alias não concede conteúdo privado. Família e demais rotas pessoais mantêm seus guards.
- Queries ausentes/inválidas em `/lifeskills` usam `sessions`. Consultas antigas `tab=mastery` e `tab=training` continuam abrindo os painéis atuais em modo legado, com aviso de que deixaram a navegação principal. Essa compatibilidade preserva deep links e acesso aos presets salvos sem dar destaque às ferramentas.
- Remover “Retorno de mastery” e “Tempo de treino” das tabs principais. Não apagar cálculos, dados `investment`/`training` ou presets existentes; qualquer remoção posterior exige decisão de produto separada.
- Sessões mantêm registro, histórico e comparação observada. Valores opcionais não informados aparecem como ausentes; zero só significa zero quando informado. Não mudar fórmulas de sessão.
- No desktop, organizar formulário, resumo/resultado e estado de dados para que a tarefa principal seja entendida na primeira dobra sempre que a altura comportar. Histórico e explicações complementares podem ser recolhidos ou organizados em painéis; premissas e ações de salvar/remover continuam descobríveis e acessíveis.

## Família

- Permanecer em `/family`; `?tab=character|equipment|family` identifica a seção visível, sobrevive a refresh e permite back/forward.
- Manter a seleção de personagem e a ação de criar/selecionar no contexto superior, sem duplicá-las em cada painel.
- Renderizar um painel principal de cada vez: ficha/maestrias/atributos em `character`; roda e inventário de equipamento em `equipment`; dados compartilhados, impostos e profissões em `family`.
- Organizar atributos complementares em grupos secundários recolhíveis quando isso reduzir carga visual sem esconder valores essenciais, ações ou estado salvo.
- Aba de ficha/equipamento sem personagem mostra estado vazio com instrução e ação de criar/selecionar. Não preencher números fictícios.
- Preservar automaticamente dados já existentes e contratos de salvamento. Troca de aba não salva, reseta ou descarta valores.

## Padronização no restante do produto

O rollout cobre todas as superfícies de UI alcançáveis no inventário atual de rotas, não apenas as três telas centrais. Antes da implementação, o plano deverá fixar o inventário inicial e agrupar páginas por layout comum. Nenhuma tela pode ficar implicitamente fora por usar um componente especializado.

Prioridade da migração: fundação de tokens/variantes; Home e shell; hub Life Skills/Recomendações; Família; Mercado e Receitas; Armazém/Scan/Planos; Gear e demais rotas pessoais; páginas públicas e legais. A ordem pode ser ajustada no plano por dependências, sem trocar escopo por um redesign genérico.

## Critérios de aceite

1. Cada superfície do inventário tem container, escala de títulos, ritmo de espaçamento e estados de controle identificáveis no catálogo BDO; exceções de domínio estão justificadas.
2. Não permanecem variantes locais concorrentes para o mesmo papel visual comum (tabs, botões, campos e cabeçalhos) sem justificativa documentada.
3. `/lifeskills` e `/family` continuam acessíveis diretamente; `/recommendations` encaminha ao hub preservando query/hash. Conteúdo de produção só monta com sessão no navegador; demais rotas pessoais preservam guards e limites de acesso.
4. A seleção das abas sincroniza a URL e suporta refresh/back/forward; combinações privadas em rota pública não mostram dados protegidos.
5. Links antigos `mastery`/`training` continuam abrindo seus painéis legados com aviso, sem exclusão ou alteração de presets; as duas opções ficam fora das tabs principais.
6. Ficha, equipamento e família deixam de ser exibidos simultaneamente como uma única página longa; nenhum dado ou ação existente é perdido.
7. Em 1920×1080, a tarefa e o estado/resultado principal aparecem cedo quando a altura permitir; conteúdo secundário pode ser recolhido sem se tornar inacessível. Nenhum número ausente é apresentado como medição real.
8. Loading, vazio, sucesso, erro, foco, seleção, confirmação e desabilitado têm estados visuais claros; formulários explicam valores/unidades e a consequência de salvar.
9. As composições passam por QA em 1920×1080, 2560×1440, 1600×900 e 1366×768, além de teclado e `prefers-reduced-motion`. Regressão móvel confirma largura sem overflow em 390×844.
10. Testes de roteamento/guards, renderização de painéis, preservação do workspace e componentes alterados passam; `pnpm check`, `pnpm test`, build web e `pnpm test:ssr` são executados no encerramento do rollout.
11. Não são adicionadas dependências visuais, alterações de banco, mudança de fórmula, seed, reset ou deploy como parte desta especificação.

## Riscos e tratamentos

- **Guards e abas compartilhadas:** a query não é mecanismo de autorização. O hub público só monta produção no navegador autenticado; as demais rotas pessoais mantêm seus guards. Testar URL direta anônima/autenticada, SSR, verificação de identidade e logout.
- **Dados/presets antigos:** retirar controles principais pode esconder acesso a presets antigos. Não deletar nem migrar o payload antes de teste de compatibilidade e mensagem visível.
- **Refactor amplo de estilos:** trocar classes globalmente pode quebrar grafo, medidas, foco ou telas especializadas. Migrar por famílias e manter exceções documentadas.
- **Redução de altura:** comprimir campos pode esconder contexto. Priorizar hierarquia e divulgação progressiva; não remover premissas, estados ou confirmação visual.
- **Visual privado:** a auditoria não fez QA visual das páginas privadas autenticadas; a fase de implementação precisa retestar essas superfícies com sessão autorizada sem editar dados reais.

## Revisão de escopo

O plano deverá inventariar todas as rotas registradas em `app.routes.ts`, incluindo superfícies operacionais, administrativas e de diagnóstico. Todas recebem o padrão comum de container, tokens, tipografia, controles e estados; o redesign de fluxo prioriza páginas de uso do jogador e preserva finalidade e guard das ferramentas operacionais.
