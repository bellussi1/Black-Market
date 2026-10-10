# Referências Visuais Oficiais (Black Desert Online / Interface In Game)

As interfaces do **Black Market** são calibradas rigorosamente com base no acervo oficial de capturas in-game de Black Desert Online documentado em [Interface In Game - Black Desert Online](https://interfaceingame.com/games/black-desert-online/).

---

## 1. Mapeamento dos Assets Locais (`../assets/`)

As imagens em `../assets/` derivam das capturas de alta resolução catalogadas no Interface In Game:

| Arquivo local               | Tela correspondente (Interface In Game) | Componentes e Padrões Observados                                                                       |
| :-------------------------- | :-------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `01-quest.png`              | `Quest detailed / Accept Quest`         | Barra bronze de cabeçalho, caixas de diálogo, blocos de objetivo e slots de recompensa com quantidade. |
| `02-enhancement-notice.png` | `Enhancement success notification`      | Banner contextual dourado de evento excepcional (não generalizar para controles normais).              |
| `03-navigation.png`         | `Navigation / Accept actions`           | Ações agrupadas com ícone geométrico, texto conciso e botão de confirmação bronze.                     |
| `04-enhancement.png`        | `Enhance window`                        | Moldura escura, abas superiores, slots de catalisador/pedra, taxas de sucesso e botão principal.       |
| `05-statistics.png`         | `Statistics / Metrics`                  | Blocos compactos de métricas, valores numéricos em destaque com legenda explicativa.                   |
| `06-shop-inventory.png`     | `NPC Shop & Inventory`                  | Grade densa de slots com ícones proporcionais, lista tabular de compra e saldos de prata.              |
| `07-market.png`             | `Central Market`                        | Menu lateral com categorias, barra de busca, linhas densas com nome, estoque e preços tabulares.       |
| `08-purchase.png`           | `Purchase item dialog`                  | Painel de cotação isolado do livro de ordens, seletor numérico de quantidade e CTA bronze.             |
| `09-ranking.png`            | `Ranking board`                         | Título bronze, linha ativa destacada em ouro suave, colunas numéricas alinhadas à direita.             |
| `10-end-game.png`           | `Character switch & End Game`           | Painéis com retratos de personagens, slots de equipamento rápido e botões de ação explícita.           |
| `11-transfusion.png`        | `Transfusion / Crystal socketing`       | Slots de engaste conectados geometricamente à silhueta do equipamento com painel lateral.              |
| `12-character.png`          | `My Information (P)`                    | Abas superiores com sublinhado, níveis de profissão/maestria com barras lineares e títulos.            |
| `13-fish-guide.png`         | `Fish Guide / Collection`               | Abas contíguas, grade de catalogação e detalhe da espécie selecionada em painel lateral.               |
| `14-storage.png`            | `Storage / Warehouse`                   | Menu de armazéns por cidade, grade fixa de slots 8/9 colunas, rodapé com saldos e transporte.          |
| `15-quest-list.png`         | `Quest List (O)`                        | Abas de categorias de missão, seleção por faixa de item e botões de rastreamento.                      |
| `16-menu.png`               | `Main Menu (ESC)`                       | Ícones funcionais, rótulos compactos e indicador sutil de seleção em losango dourado.                  |

---

## 2. Acervo Estendido de Capturas (Interface In Game)

Além dos 16 assets locais, a galeria oficial fornece referências para as seguintes interfaces:

- **Mercado e Loja**:
  - `Central Market`: Estrutura do livro de ordens, faixas de preço teto e piso, estoque zerado e histórico de negociações.
  - `Purchase Longbow`: Modal de compra com seletor de preço unitário e cálculo de custo total com impostos.
  - `Pearl Box`: Janela de itens premium e categorização de vestuário e consumíveis.
- **Armazém e Inventário**:
  - `Storage`: Seletor de cidades regionais e gestão de estoque de materiais de produção.
  - `Equipment`: Layout radial de engaste de itens (armas principais, secundárias, despertadas, armaduras, acessórios e artefatos).
  - `NPC Shop`: Listagem densa com filtros por abas e indicação de itens não compráveis/esgotados.
- **Progressão e Conhecimento**:
  - `Gained Knowledge` & `Knowledge is Growing`: Painéis de conhecimento com categorias (Ecologia, Personagens, Topografia, Economia).
  - `Skill` & `Skill Information`: Árvore de habilidades com nós conectados, pré-requisitos e atalhos de comando.
  - `Skill Points Obtained`: Feedback sutil de pontos adquiridos sem intrusão visual excessiva.
- **Diálogos e Missões**:
  - `Quest Summary` & `Ongoing Quests`: Painel de acompanhamento de missões com objetivos e indicadores numéricos.
  - `Quest Completed`: Tela de recompensa com seleção de itens e botão de confirmação.
- **HUD e Utilitários**:
  - `Game Window` & `Optimization`: Modais de configuração de interface com controles do tipo rádio e caixas de seleção.
  - `Hotkey`: Visão geral de atalhos e teclado funcional.
  - `Attendance Reward`: Grade de recompensas diárias com slots carimbados e status de coleta.

---

## 3. Diretriz de Aplicação

Consulte sempre o guia detalhado em [bdo-interface-in-game-guide.md](bdo-interface-in-game-guide.md) antes de criar ou modificar componentes, garantindo conformidade com as regras de tipografia, paleta e ausência de emojis.
