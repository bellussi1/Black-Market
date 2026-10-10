# Guia de Design e Referência Visual: Black Desert Online (Interface In Game)

Este documento sintetiza a análise aprofundada das capturas oficiais da interface in-game de **Black Desert Online (Pearl Abyss)** disponíveis no repositório de referência [Interface In Game - Black Desert Online](https://interfaceingame.com/games/black-desert-online/). Ele serve como a diretriz canônica para todas as interfaces do **Black Market**.

---

## 1. Origem e Contexto do Acervo

- **Fonte Canônica**: [https://interfaceingame.com/games/black-desert-online/](https://interfaceingame.com/games/black-desert-online/)
- **Desenvolvedora**: Pearl Abyss
- **Características Fundamentais**:
  - Estética medieval/fantástica sóbria e pragmática voltada a alta densidade de informação.
  - Painéis utilitários baseados em carvão/ardósia escuro com detalhes em bronze e ouro envelhecido.
  - Zero elementos cartunescos, neon ou emojis. Todos os símbolos visuais são glifos geométricos nobres (`◇`, `▲`, `▼`, `✕`, `+`, `−`) ou ícones reais do catálogo.

---

## 2. Inventário de Telas e Padrões Analisados

| Categoria                        | Telas Analisadas (Interface In Game)                                                 | Padrões de UI/UX Observados                                                                                                                                                                         |
| :------------------------------- | :----------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mercado & Negociação**         | `Central Market`, `Purchase Longbow`, `Pearl Box`, `NPC Shop`                        | Sidebar com árvore hierárquica de categorias, tabela densa com alinhamento tabular de preços, medidores visuais de limites de mercado (piso/teto), livro de ofertas e saldo de prata.               |
| **Armazém & Inventário**         | `Storage`, `Inventory`, `Equipment`, `Transfusion`                                   | Seleção de território/cidade, grade uniforme de slots quadrados escuros (8 ou 9 colunas), contadores de capacidade e peso (LT), molduras sutis de raridade e botões de lote.                        |
| **Progressão & Maestria**        | `My Information`, `Enhance`, `Fish Guide`, `Ranking`, `Gained Knowledge`             | Janelas multi-abas (Combate, Maestria de Vida, Títulos), barras de progresso lineares compactas, faixas destacadas para classificação e painéis de acoplamento de gemas/pedras.                     |
| **Diálogos, Missões & Modais**   | `Quest Summary`, `Accept Quest`, `Quest Completed`, `Select Quest`, `Ongoing Quests` | Molduras de janela com cabeçalho bronze (`var(--bm-titlebar)`), marcador diamante ornamental (`◇`), fechamento discreto (`✕`), blocos de objetivos e caixas de recompensas com quantidade no canto. |
| **HUD, Janelas & Configurações** | `Game Window`, `Hotkey`, `Attendance Reward`, `Main Menu`, `Optimization`            | Menus com ícone e texto compacto, abas de seleção com sublinhado fino, caixas de diálogo modais escuras e botões retangulares de confirmação/cancelamento.                                          |

---

## 3. Diretrizes de Componentes para o Black Market

### 3.1. Janelas e Painéis (`Window Frames & Panels`)

- **Superfície Base**: `#17181c` (página) e `#25262b` (painéis).
- **Moldura**: Borda sólida de 1px `#49484a` com raio de canto sutil de 2px (`border-radius: 2px`).
- **Barra de Título (Titlebar)**:
  - Fundo em bronze envelhecido `#715b37` com texto em bege claro `#ebe5d8`.
  - Prefixo ornamental com o losango característico do BDO: `◇` (`var(--bm-accent)`).
  - Botão de fechar `✕` discreto no canto superior direito com transição de opacidade no hover.
- **Divisores**: Linhas finas de 1px com cor `rgba(130, 124, 114, 0.25)` ou `var(--bm-border)`.

### 3.2. Tabelas de Dados e Mercado Central (`Data Tables & Market`)

- **Cabeçalhos de Coluna**:
  - Texto em caixa alta discreta ou semibold, `font-size: 12px` a `13px`, com `letter-spacing: 0.05em`.
  - Cabeçalhos ordenáveis com setas sutis: `▲` (ascendente) e `▼` (descendente) em dourado.
  - Alinhamento rigoroso: texto à esquerda, números (preços, estoques, volumes) à direita com `font-variant-numeric: tabular-nums`.
- **Faixas de Linhas (Rows)**:
  - Altura compacta (38px a 44px) permitindo visualizar múltiplos itens sem rolagem excessiva.
  - Efeito hover com clareamento suave para `#303137` sem saltos de layout.
- **Medidor de Preço (Price Range Meter)**:
  - Barra fina (4px a 6px) com gradiente sutil entre piso e teto de mercado, e marcador da cotação atual.
- **Badges de Tendência**:
  - Pílulas retangulares de 2px de raio (`+X.X%` em verde sóbrio `#91be71`, `-X.X%` em terracota `#e58f86`, `Estável` em bege claro).

### 3.3. Grade de Armazém e Slots (`Storage Grids & Slots`)

- **Slots**:
  - Quadrados de 44×44 px ou 48×48 px com fundo afundado `#1b1c21` e borda `1px solid #49484a`.
  - Suporte a moldura de raridade de item (branco, verde, azul, amarelo, laranja, vermelho) aplicada na borda ou badge superior.
  - Contador de quantidade: Fixado no canto inferior direito, fonte estreita e números legíveis.
- **Seletor de Cidades**:
  - Lista de armazéns das capitais e entrepostos do BDO (Velia, Heidel, Calpheon, Altinova, Valencia, Grána, Duvencrune, O'dyllita, Eilton, Nampo).
- **Barra de Capacidade**:
  - Indicador numérico `X / Y slots` com barra de preenchimento proporcional em dourado/bronze.

### 3.4. Botões e Controles de Ação (`Action Controls`)

- **Botão Primário / CTA (`.btn`)**:
  - Fundo em ouro/bronze nobre `var(--bm-accent)` (`#d8b978`).
  - Texto em contraste nobre escuro `var(--bm-background)` (`#17181c`).
  - Cantos chanfrados sutis (2px).
  - Hover: Iluminação suave em ouro `var(--bm-accent-hover)` (`#ecd39c`).
- **Botão Secundário (`.btn.subtle`)**:
  - Fundo em cinza carvão elevado `var(--bm-surface-raised)` (`#303137`).
  - Borda discreta `var(--bm-control-border)` (`#827c72`).
  - Texto em tom marfim `var(--bm-text)` (`#ebe5d8`).
  - Hover: Contorno dourado com fundo suave `var(--bm-accent-soft)`.
- **Botão Destrutivo / Alerta (`.btn.danger`)**:
  - Contorno em terracota `#edafa0` sem preenchimento extravagante.
- **Abas de Seleção (`.tabs`)**:
  - Abas retangulares contíguas com linha inferior de 2px em ouro para a aba selecionada.

### 3.5. Micro-interações e Animações

- **Duração e Curva**:
  - Tempos rápidos entre **120ms e 180ms**, utilizando `cubic-bezier(0.16, 1, 0.3, 1)` ou `ease-out`.
- **Confirmação de Ação**:
  - Pulso suave de brilho dourado (`@keyframes bm-confirm-glow`) ao adicionar, editar ou consolidar itens.
- **Zero Distrações**:
  - Não utilizar animações que saltem elementos de tamanho ou causem _layout shift_ (CLS).
  - Respeitar `@media (prefers-reduced-motion: reduce)`.

---

## 4. Regras Negativas Obrigatórias (Do NOTs)

1. **PROIBIDO O USO DE EMOJIS**:
   - Nunca utilizar emojis (como 📦, 💰, 🔍, ⚔️, 🚀, ✅, ❌, etc.) em botões, títulos, cards, tabelas ou formulários.
   - Utilize símbolos geométricos tipográficos nobres (`◇`, `▲`, `▼`, `✕`, `+`, `−`, `•`) ou ícones SVG lineares.
2. **Proibido Bordas Arredondadas Excessivas**:
   - Manter raio máximo de 2px nos cantos (`border-radius: 2px`).
   - Não utilizar botões arredondados em formato de pílula completa estilo mobile/iOS (`border-radius: 9999px`).
3. **Proibido Cores Neon ou Gradientes Chamativos**:
   - Nunca usar botões verdes saturados tipo "whatsapp/bootstrap" (`#4caf50` / `#00ff00`). O verde permitido é apenas o verde musgo/sálvia suave de raridade (`#91be71`).
   - Evitar fundos brancos, cinzas claros ou cartunescos. Toda a interface reside no espectro de carvão e ardósia escuro.
4. **Proibido Truncar Dados Essenciais**:
   - Preços e nomes completos devem ser acessíveis ou quebrar de forma controlada (`overflow-wrap: anywhere`), sem cortes que impeçam o entendimento do jogador.
