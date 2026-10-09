# Paleta proposta

Valores aproximados a partir das referências, adaptados para contraste na web. Não são extração certificada dos assets originais.

| Token | Cor | Uso / referência |
| --- | --- | --- |
| `--bm-background` | `#17181c` | página, 07 |
| `--bm-surface` | `#25262b` | janela, 04 e 06 |
| `--bm-surface-raised` | `#303137` | linhas e controles, 07 |
| `--bm-input` | `#1b1c21` | campos e slots, 14 |
| `--bm-border` | `#49484a` | moldura de painel, 04 |
| `--bm-control-border` | `#77726a` | contorno de input |
| `--bm-titlebar` | `#715b37` | faixa bronze, 01, 09 e 12 |
| `--bm-accent` | `#d8b978` | ação/seleção, 04 |
| `--bm-text` | `#ebe5d8` | conteúdo principal |
| `--bm-muted` | `#b9b1a0` | rótulos e detalhes |
| `--bm-focus` | `#f2d59c` | foco de teclado |
| `--bm-success` | `#b8d5a6` | disponível |
| `--bm-warning` | `#e1c28a` | dados a confirmar |
| `--bm-danger` | `#edafa0` | falha/erro |

Qualidade, quando fornecida pelo catálogo: branco `#b7b8bc`, verde `#91be71`, azul `#82b5e6`, dourado `#d8b978`, laranja `#e6a078`, vermelho `#e58f86`. Associar texto de qualidade ao tooltip; nunca atribuir raridade por adivinhação.

Definir uma vez em `apps/web/src/styles/_tokens.scss`; consumir variáveis nos componentes. Seleção muda cor/box-shadow interno, preservando espessura de borda e dimensões. Verificar contraste computado sobre o fundo efetivo antes de aplicar estas sugestões.
