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
