# Design system UI do Black Market

Este documento cataloga a implementação. A fonte canônica da identidade e das decisões de produto é [`.agents/skills/bdo-ui-design/SKILL.md`](../../.agents/skills/bdo-ui-design/SKILL.md); [`ui-design`](../../.agents/skills/ui-design/SKILL.md) e seu agente orientam composição e revisão sem redefinir o tema.

## Base e componentes

Base: Spartan 1.6.3 Brain e Helm, Tailwind 4.3.3, Angular 22.2. Os arquivos Helm ficam em `apps/web/src/app/ui`, importados pelo alias `@bdo/ui`. Botão, input, card, textarea e native-select estão disponíveis. Os templates externos das features, shell e controles compartilhados usam as primitivas BDO.

Componentes gerados mantêm seletores oficiais; exceção de lint limitada às declarações desses seletores. Não editar `node_modules`. Antes de regenerar Helm, revisar o diff contra a versão instalada e reaplicar as personalizações documentadas.

Selects existentes usam `BdoSelect`, uma diretiva visual Tailwind sobre o elemento nativo, preservando contratos `(change)`, eventos, labels e `ngModel`. `HlmNativeSelect` está disponível para novas composições que aceitem sua estrutura. Checkboxes, radio, sliders e inputs de arquivo conservam controles nativos e estilos acessíveis existentes.

Cards não impõem flex nem recortam seu conteúdo. `.panel` e `HlmCard` compartilham `--bm-panel-padding`, atualmente ligado a `--bm-space-4`; cabeçalhos de painel usam a mesma medida para compensar o padding. A variante outline declara cor explícita para evitar herdar texto escuro da classe legada `.btn`.

## Tokens ativos

| Papel       | Tokens e valores                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Espaçamento | `--bm-space-1..8`: 4, 8, 12, 16, 24, 32, 40 e 48 px                                                                                                                                                      |
| Tipografia  | `--bm-text-display`: 32 px; `--bm-text-page-min/max`: 26–30 px; `--bm-text-page-mobile`: 28 px; `--bm-text-section`: 19 px; `--bm-text-body`: 16 px; `--bm-text-support`: 14 px; `--bm-text-meta`: 12 px |
| Controles   | `--bm-control-height`: 44 px; `--bm-control-height-compact`: 36 px                                                                                                                                       |
| Containers  | `.tool-page` / `--bm-page-max`: 1440 px; `.tool-page--wide` / `--bm-page-max-wide`: 1760 px                                                                                                              |
| Movimento   | `--bm-motion-fast`: 140 ms; entrada de rota: `--bm-motion-route-enter` 220 ms; saída: `--bm-motion-route-exit` 120 ms                                                                                    |

Os tokens são definidos em `apps/web/src/styles/_tokens.scss`; `--bm-panel-padding` e as cores de integração Tailwind permanecem em `apps/web/src/styles/tailwind.css`. As fontes do produto são Barlow Semi Condensed em `--bm-font-body` e `--bm-font-display`. A paleta semântica `--bm-*` de carvão, bronze, texto, estados e graus também é definida em `_tokens.scss`.

## Controles, navegação e movimento

`HlmButton` (`apps/web/src/app/ui/button/src/lib/hlm-button.ts`) usa 44 px no tamanho padrão e 36 px nas variantes compactas e de ícone; o anel de foco visível é preservado. `.tabs`, `.workspace-tabs` e `.segmented-control` compartilham escala de espaçamento, tipografia e estados de seleção. Links continuam links de rota; tabs locais mantêm semântica e teclado próprios no template, sem usar estilo CSS como substituto de ARIA.

View Transitions animam apenas `workspace-page`: entrada usa `cubic-bezier(0.2, 0.7, 0.2, 1)` e saída `ease-in`. `prefers-reduced-motion: reduce` remove as animações de rota; o shell fixo não participa.

## Exceções de domínio

O grafo especializado de crafting e a roda/slots de equipamento mantêm SCSS para posicionamento e interação do jogo. Reutilize tokens, foco e tipografia quando isso não prejudicar a geometria. Não converter posições em utilities sem testes de medição, pan e zoom nem remover estilos ativos só para declarar uma migração completa de sintaxe.

## Mapa de implementação

| Responsabilidade                           | Origem real                                                      | Uso                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Paleta, escala e fontes                    | `apps/web/src/styles/_tokens.scss`                               | Propriedades `--bm-*`; a paleta SCSS gera as cores em `:root`                                       |
| Integração Tailwind/Helm                   | `apps/web/src/styles/tailwind.css`                               | `--background`, `--foreground`, `--primary`, `--ring` e demais aliases da biblioteca; painel e raio |
| Container, títulos e painéis               | `apps/web/src/styles/_layout.scss`                               | `.tool-page`, `.tool-page--wide`, `.tool-heading`, `.panel`, `.panel-heading`                       |
| Controles e tabs                           | `apps/web/src/styles/_controls.scss`                             | `.tabs`, `.workspace-tabs`, `.segmented-control`, slots e medidores                                 |
| Foco, tipografia base e movimento reduzido | `apps/web/src/styles/_base.scss`                                 | Outline independente da seleção e fallback global de movimento                                      |
| Reflow                                     | `apps/web/src/styles/_responsive.scss` e SCSS de domínio         | Breakpoints existentes; não criar um breakpoint por componente sem necessidade                      |
| Primitivas                                 | `apps/web/src/app/ui/{button,input,textarea,native-select,card}` | Importação por `@bdo/ui/*`; comportamento Brain e aparência Helm copiada                            |

Um token novo precisa de papel e consumidores claros. Registre-o aqui, defina na origem e migre os consumidores equivalentes no mesmo diff. Não declare nomes próximos para o mesmo papel nem use um fallback para fingir que um token está registrado.

## Cores, geometria e efeitos

| Papel             | Contrato ativo                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fundo/superfícies | `--bm-background`, `--bm-surface`, `--bm-surface-raised`, `--bm-input`                                                                                                 |
| Texto             | `--bm-text` para conteúdo; `--bm-muted` para apoio; fontes `--bm-font-body` e `--bm-font-display`                                                                      |
| Seleção/destaque  | `--bm-accent`, `--bm-accent-hover`, `--bm-accent-soft`; `--bm-titlebar` para barra bronze                                                                              |
| Bordas/foco       | `--bm-border`, `--bm-control-border`, `--bm-focus`; foco não herda a cor de seleção                                                                                    |
| Feedback          | `--bm-success`, `--bm-warning`, `--bm-danger`, `--bm-info`; sempre acompanhados por texto/ícone significativo                                                          |
| Raridade          | `--bm-grade-white`, `--bm-grade-green`, `--bm-grade-blue`, `--bm-grade-yellow`, `--bm-grade-orange`, `--bm-grade-red`, `--bm-grade-purple`; manter ID/grau do catálogo |
| Raio/borda        | Helm `--radius: 2px`; painéis/slots atuais usam 2 px e borda 1 px. Não arredondar por página                                                                           |
| Elevação          | Superfície elevada usa `--bm-surface-raised`; janela `.bdo-window` tem sombra compartilhada em `_controls.scss`. Não adicionar glow em cada card                       |
| Overlay           | `LoginDialog` usa backdrop escuro e dimensão limitada à viewport; o dialog de otimização já implementa seu contexto. Não copiar overlays com z-index arbitrário        |
| Ritmo de texto    | Título de página 500/1,25; seção 500/1,35; texto de apoio 1,6, definidos nos estilos compartilhados; métricas usam `font-variant-numeric: tabular-nums`                |

Geometria, sombras, backdrop e alguns valores do adaptador Helm ainda incluem literais compartilhados. São dívida localizada, não tokens semânticos que já existam. Não anunciar tokenização integral de todo o SCSS. Uma migração futura deve substituir o valor na origem e consumidores reais, com evidência visual, sem acumular aliases sem uso.

## Matriz de botões

Todas as variantes vêm de `buttonVariants`/`HlmButton`, com `BrnButton` para disabled e interação. `variant` define papel; `size` define geometria. Classes da feature podem definir layout, não reconstruir o botão com cores, bordas e alturas próprias.

| Papel                 | API                                       | Aplicação                                                                                                            |
| --------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Primária              | `hlmBtn` / `variant="default"`            | Concluir a tarefa principal, como registrar uma sessão                                                               |
| Secundária com borda  | `variant="outline"`                       | Alternativa visível, atualizar ou consultar; mantém texto explícito sobre o fundo                                    |
| Secundária preenchida | `variant="secondary"`                     | Grupo de ações sobre superfície neutra; escolher pela hierarquia do grupo, sem alternar aleatoriamente entre páginas |
| Discreta              | `variant="ghost"`                         | Ação contextual de baixa ênfase                                                                                      |
| Destrutiva            | `variant="destructive"`                   | Excluir/remover; texto identifica o objeto e preserva confirmação existente                                          |
| Link de navegação     | `<a hlmBtn variant="link">` ou link comum | Destino real; usar `routerLink`/`href`, sem simular link com botão                                                   |
| Ícone                 | `size="icon"`, papel via `variant`        | Ação contextual com `aria-label`; ícone decorativo não repete o nome                                                 |
| Toggle                | `.segmented-control` com `aria-pressed`   | Opções mutuamente exclusivas ou modo; seleção não muda o rótulo da ação                                              |

Tamanho `default`: 44 px de altura, padding horizontal 12 px e gap 8 px. `xs`/`sm`: 36 px, padding 8/10 px e gap 4 px; ícones `icon*`: 36×36 px. Por compatibilidade, o tamanho existente `lg` também é compacto (36 px); ele não é uma opção maior para novas telas. Use o padrão para ações principais. A classe `.btn` é compatibilidade legada; não é outra API de variantes.

| Estado        | Comportamento comum                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Default       | Rótulo legível, papel e geometria da variante                                                                               |
| Hover         | Variação de fundo/borda da primitiva; não desloca os demais elementos                                                       |
| Pressed       | Feedback transitório do botão; não confundir com seleção persistente                                                        |
| Focus-visible | Anel/outline visível independente do hover e da cor do estado selecionado                                                   |
| Disabled      | `[disabled]`/Brain bloqueia acionamento; explicar pré-requisito no contexto                                                 |
| Loading       | Estado pertence ao fluxo: `[disabled]`, `aria-busy` no grupo/controle e mensagem `role="status"`; preservar rótulo e espaço |
| Selected      | Navegação usa `aria-current`; toggle usa `aria-pressed`; tabs ARIA locais usam `aria-selected` e seu contrato de teclado    |

`HlmButton` não possui input `loading`. Não criar bindings fictícios nem implementar spinner independente por página: reutilize o feedback contextual existente. Teste o estado assíncrono real, inclusive erro e reativação da ação.

## Composição e interação

- Formulário: label persistente, controle, unidade/dica e erro junto ao campo. Inputs usam `HlmInput`; textarea usa `HlmTextarea`; selects existentes usam `BdoSelect`. Preserve blur/submit atual, foco e distinção entre vazio e zero.
- Painel: título, conteúdo principal, resultado e ação próximos; detalhes secundários em `<details>` ou editor contextual existente. Tabelas comparáveis mantêm unidade, número tabular, ordenação e ações na linha. Não envolver cada número em outro card.
- Dropdown/tooltip: preservar select nativo ou primitiva já adotada e seu teclado. Tooltip complementa; rótulos, erros e pré-requisitos continuam visíveis. Não depender de hover para o fluxo principal.
- Modal: nome acessível, limite de viewport, rolagem interna, Escape, foco inicial/contido e retorno ao acionador. `LoginDialog` usa `<dialog>.showModal()`. O painel de informação da receita é não modal (`aria-modal="false"`); não aplicar focus trap a ele.
- Feedback: loading mantém geometria; vazio explica como começar; erro apresenta ação possível; sucesso aparece perto da ação. Preservar timestamps e causas de resultado incompleto.
- Scroll: a página não transborda horizontalmente. Tabela/canvas que precisem de overflow têm área explícita, controles alcançáveis e foco visível. A roda no canvas amplia sem modificador; áreas `data-scrollable` e campos mantêm comportamento próprio.
- Movimento: transições de interação usam `--bm-motion-fast`; rotas usam os tokens registrados, apenas no conteúdo. Evitar `transition: all` em novas composições; animar cor, opacity e transform conforme finalidade e preservar `prefers-reduced-motion`.

## Exemplos

Correto: variantes existentes, ação identificada, estado assíncrono no contexto e tamanho padrão.

```html
<div class="action-row" [attr.aria-busy]="saving() ? 'true' : null">
  <button hlmBtn type="button" [disabled]="saving()" (click)="save()">Salvar</button>
  <button hlmBtn variant="outline" type="button" [disabled]="saving()" (click)="cancel()">
    Desfazer
  </button>
  @if (saving()) {
  <p role="status">Salvando alterações…</p>
  }
</div>
```

Correto: Família usa links navegáveis para estado de URL, sem semântica de tab ARIA incompleta.

```html
<a
  routerLink="/family"
  [queryParams]="{ tab: 'equipment' }"
  queryParamsHandling="merge"
  [attr.aria-current]="tab() === 'equipment' ? 'page' : null"
  >Equipamento</a
>
```

Incorreto: ação sem botão/nome, geometria e paleta locais, token inexistente e estado apenas por cor.

```html
<div (click)="remove()" style="height: 31px; border-radius: 18px; color: var(--bm-gold)">
  <span class="trash-icon"></span>
</div>
```

## Verificação e limites

Os checklists obrigatórios de criação e revisão ficam na [skill canônica](../../.agents/skills/bdo-ui-design/SKILL.md). Matriz: 1920×1080, 2560×1440, 1600×900, 1366×768 e 390×844; avaliar zoom 125%/150% e conteúdo longo quando alterados. Testar navegação direta, refresh, histórico, teclado, foco, loading/erro/vazio, reduced-motion e tutorial afetado. Medir overflow e observar a renderização, sem confundir build/specs com QA autenticada.

O [inventário de rotas](../research/ui-route-inventory-2026-10-19.md) separa páginas, aliases, conteúdo suspenso pelo MVP e guardas. O [relatório de reconciliação](../research/ui-standardization-completion-2026-10-19.md) registra correções, evidências e validações ainda necessárias. Não declarar conformidade completa de acessibilidade ou de todas as combinações de dados a partir da amostra visual.
