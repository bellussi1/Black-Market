---
name: bdo-ui-design
description: Usar antes de criar, modificar ou auditar qualquer interface do Black Market BDO, incluindo layouts, navegação, formulários, botões, estados, receitas, inventário, mercado e crafting. Não aplicar este tema a outros produtos.
---

# Black Market · BDO UI

Esta é a fonte canônica da identidade, dos tokens e das variantes compartilhadas do Black Market. Consulte o catálogo técnico em [`docs/design-system/bdo-ui.md`](../../../docs/design-system/bdo-ui.md) para nomes e valores ativos. Use as imagens em `assets/` como referência primária. Preserve a densidade e o material visual do jogo, adaptando contraste, alvos de toque e navegação à web. Não identifique a fonte original sem evidência.

Antes de alterar UI, leia este arquivo e o catálogo; escolha as referências abaixo conforme a tarefa. `ui-design` orienta composição, `angular-developer` implementação e `spartan` primitivas. Evolua essa base; não instale uma segunda biblioteca ou crie outro tema. Consulte a pesquisa pública exigida em `AGENTS.md` antes de alterar uma funcionalidade.

## Decisões essenciais

- Painéis de carvão neutro, bordas finas, barras de título bronze e controles retangulares. Ouro indica contexto e seleção; não colore todo o texto.
- Ícones reais do catálogo em slots reservados de 44 × 44 px, no máximo 48 × 48 px, `object-fit: contain`. Não usar imagens de menus como fundo de interface.
- Conteúdo legível determina a altura do card. Não cortar nomes com line-clamp; quebrar texto e medir o card antes de calcular conexões.
- Títulos de janelas usam uma sans discreta; não impor serifas decorativas aos controles de crafting.
- Produto, quantidade, materiais, origens e resultado ficam no fluxo principal. Ajustes de tempo, impostos e estoque ficam em detalhes no próprio contexto, sem um modo avançado global. Não desmontar o grafo ou perder escolhas.
- Dados não conhecidos continuam identificados como ausentes. Não presumir rendimentos, preços, origens ou qualidade de itens por estética.
- Unificar fórmulas do mesmo produto que diferem apenas por ingredientes substituíveis. Elixires com adjetivos de qualidade e carnes/sangues de um mesmo grupo são escolhas de ingrediente, não receitas independentes. Preservar IDs, estoques e proporções de substituição (como 3 comuns para 1 superior). Confirmar equivalências pelas fórmulas do catálogo; não considerar toda carne ou todo sangue intercambiável. Ver [Equivalências](references/recipe-equivalences.md).
- Posições, seleção, expansão e viewport são estados separados. Expandir não significa recentralizar.
- Mercado: ler primeiro a resposta da mesma chave de consulta; exibir cache vencido com idade enquanto revalida e mantê-lo em caso de erro. Não apresentar cache de outro filtro como resultado atual. Busca textual usa debounce de 250 ms.
- Crafting orientado à venda: separar estoque do produto da receita de venda. Rendimento estimado é aplicado sem confirmação; ajustes permanecem opcionais. Uma combinação incompleta nunca recebe lucro/hora definitivo.
- Na comparação de cenários, preservar lucro total e lucro/hora como métricas distintas. A prévia do otimizador mantém o cenário atual até aplicar; cotação, quantidade ou política alteradas invalidam a proposta. Pré-ordem não inclui espera no tempo de produção, e produzir esgotados não garante disponibilidade do lote inteiro.

## Contratos compartilhados

- Use a escala `--bm-space-1` a `--bm-space-8`; tipografia `--bm-text-display`, `--bm-text-page-min/max`, `--bm-text-page-mobile`, `--bm-text-section`, `--bm-text-body`, `--bm-text-support` e `--bm-text-meta`.
- O container padrão é `.tool-page` / `--bm-page-max` (1440 px); use `.tool-page--wide` / `--bm-page-max-wide` (1760 px) somente para superfícies densas que precisem da largura extra. O token de card/painel `--bm-panel-padding` deriva de `--bm-space-4`.
- Controles padrão usam `--bm-control-height` (44 px); variantes compactas de toolbar usam `--bm-control-height-compact` (36 px). Tabs e controles segmentados compartilham os estilos de `.tabs`, `.workspace-tabs` e `.segmented-control`; semântica de link ou tab é definida no template conforme o comportamento.
- Raio/borda comuns usam `--bm-radius`, `--bm-radius-inset` e `--bm-border-width`; slots, janelas e overlays usam os tokens de geometria/efeitos registrados no catálogo. Botões com texto têm altura mínima e permitem quebra de rótulo; não fixar a altura quando o texto precisa de mais espaço.
- Durações são `--bm-motion-fast`, `--bm-motion-route-enter` (220 ms) e `--bm-motion-route-exit` (120 ms). As transições de rota ficam restritas ao conteúdo e `prefers-reduced-motion` as desativa.
- Árvore de crafting, roda de equipamento e slots podem manter geometria SCSS própria. Devem continuar usando tipografia, estados de foco e espaçamento compartilhados quando não prejudicarem a interação de domínio.

## Layout e navegação

- Desktop-first: referência 1920×1080; conferir 2560×1440, 1600×900, 1366×768 e reflow funcional em 390×844. Use largura ampla somente quando a informação precisar dela; não estique textos de leitura ou cards só para preencher o monitor.
- Mantenha ação, premissas essenciais e resultado próximos. Informações secundárias usam detalhes contextuais, sem um modo avançado global. Texto longo pode aumentar a altura; grids usam `minmax(0, 1fr)` e filhos `min-width: 0`.
- Profissões tem rota canônica `/lifeskills?tab=production|sessions`; `/recommendations` é alias que preserva query/hash. Produção só monta no navegador autenticado; SSR público não mostra dados privados. Os painéis `mastery|training` continuam acessíveis por URL com aviso e presets preservados, fora da navegação principal.
- Família usa `/family?tab=character|equipment|family`, um painel por vez e seleção de personagem compartilhada. Preserve salvamento e estado ao navegar. Links de URL usam `aria-current`; toggles usam `aria-pressed`; tabs ARIA locais exigem `tablist`, `tab`, `tabpanel`, seleção e teclado completos.

## Anatomia e estados

- Use `HlmButton` de `@bdo/ui/button`: `default` para ação principal, `outline`/`secondary` para alternativa, `ghost` para ação discreta e `destructive` para exclusão. Ícone é um tamanho, toggle é um comportamento; não criar variantes de cor por página. A matriz de API/estados está no catálogo técnico.
- Rótulo identifica a ação; ícone sem texto recebe nome acessível. Loading preserva espaço, anuncia progresso e bloqueia duplicação. Disabled não pode ser a única explicação de uma pendência. Foco, seleção e hover são estados distintos.
- Campos usam label persistente, unidade/dica e erro associados. Reutilize `HlmInput`, `HlmTextarea`, `BdoSelect` e os editores existentes; vazio não vira zero. Agrupe campos relacionados, mantenha ações perto do grupo e preserve o método de salvar vigente.
- Modais precisam de título, fechamento, foco inicial, teclado contido e retorno ao acionador. Reutilize `LoginDialog` e o dialog de otimização quando aplicáveis. O painel não modal de item mantém `aria-modal="false"`; não prender o foco nele.
- Tabelas alinham números, exibem unidade e ordenação explícita; ícones de catálogo têm espaço reservado. Loading, vazio e erro ocupam o contexto dos dados; conteúdo anterior só permanece identificado quando for da mesma consulta.
- Use somente custom properties declaradas. Nomes parecidos não são aliases: texto de apoio é `--bm-muted`, destaque é `--bm-accent`, foco é `--bm-focus` e borda de controle é `--bm-control-border`. Um fallback não registra um token.

## Checklist de criação

- [ ] Ler o componente atual, catálogo e pesquisa da família funcional; identificar decisão principal e dados desconhecidos.
- [ ] Escolher container, escala, primitiva e variante existentes antes de escrever CSS. Registrar justificativa e contrato no catálogo se um padrão novo for necessário.
- [ ] Definir URL/estado selecionado, política de acesso, refresh e Voltar/Avançar; preservar dados e contratos de domínio.
- [ ] Definir loading, vazio, erro, disabled, seleção, feedback e foco antes de considerar o fluxo pronto.
- [ ] Conferir label, teclado, contraste, texto longo, reflow e reduced-motion; não usar cor ou tooltip como única explicação.

## Checklist de revisão

- [ ] Comparar alturas, gaps, tipografia, variante e estados com o catálogo; verificar que todos os tokens usados existem e remover estilos locais duplicados na origem.
- [ ] Revisar as quatro resoluções desktop e mobile; zoom de 125%/150%, nomes extensos, listas grandes, ausência de dado e scroll independente quando afetados.
- [ ] Exercitar navegação direta, refresh, histórico, teclado, Escape/retorno de foco, async e tutorial relevantes; mudanças no grafo incluem pan/zoom/expansão.
- [ ] Executar `pnpm check`, `pnpm test` e build/SSR quando pertinentes. Registrar comandos, resultados, capturas e limites reais de acesso; fixture ou build não comprovam QA autenticada.
- [ ] Atualizar catálogo, inventário e handoff quando o contrato mudar. Corrigir referência antiga conflitante em vez de acrescentar uma regra contrária ao final.

## Referências por tarefa

- [Guia Interface In Game](references/bdo-interface-in-game-guide.md): catálogo completo de componentes e padrões visuais oficiais (Interface In Game).
- [Princípios](references/design-principles.md): escopo e arquitetura visual.
- [Paleta](references/color-palette.md): tokens semânticos e cores propostas.
- [Tipografia](references/typography.md): escolha de fonte e hierarquia.
- [Componentes](references/components.md): slots, barras, cards, inputs e feedback.
- [Catálogo e exemplos concretos](../../../docs/design-system/bdo-ui.md): API real, variantes, estados, composições corretas e erros a evitar.
- [Interações](references/interaction-patterns.md): divulgação progressiva e estados.
- [Crafting tree](references/crafting-tree.md): zoom, pan, medição e estabilidade.
- [Acessibilidade](references/accessibility.md): foco, teclado, contraste e movimento.
- [Imagens](references/visual-references.md): acervo e correspondência de telas.

## Antes de entregar

Validar no navegador o conteúdo mais longo, expansão de vários níveis, scroll com cursor fora do centro, pan após zoom, teclado e largura móvel. Usar os testes existentes de receitas para preservar cálculo, estoque e alternativas. Documentar as limitações verificadas; imagem bonita não prova funcionamento.

- Otimização: proposta fora do fluxo em dialog; ação otimizar/cancelar ocupa o mesmo espaço. Reservar feedback antes do cálculo e medir posições após fontes/cotações carregarem, incluindo resultado incompleto.
