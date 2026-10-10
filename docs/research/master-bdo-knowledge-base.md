# Master BDO Knowledge Base — Engenharia Reversa, Algoritmos e Ecossistema

_Este documento consolida a análise técnica e arquitetural de 16 repositórios de código aberto e das 3 principais referências web (BDOLytics, BDOCodex e Somethinglovely). Serve como contexto permanente compartilhado entre Codex e Antigravity para evitar retrabalho, economizar tokens e acelerar a implementação do Black Market._

---

## 1. Classificação Geral de Utilidade e Confiabilidade

| Origem / Projeto                                    | Utilidade                 | Confiabilidade das Regras | Principal Valor para o Black Market                                                                                 |
| :-------------------------------------------------- | :------------------------ | :------------------------ | :------------------------------------------------------------------------------------------------------------------ |
| **`iDevelopThings/bdo-viewer`**                     | ⭐⭐⭐⭐⭐ **Crítica**    | Moderada (2026-08)        | **Arquitetura DTO**, interface de comparação com sliders, árvore de receitas DFS e persistência de knowledge.       |
| **`iDevelopThings/bdo-data-extractor`**             | ⭐⭐⭐⭐⭐ **Crítica**    | Alta (cliente local)      | **Pipeline Go de extração**: decodificação de arquivos PAZ, BSS, tabelas e strings `.loc` em pt-BR.                 |
| **`waliori/bdo-ship-upgrade-tracker`**              | ⭐⭐⭐⭐⭐ **Crítica**    | Alta (2026-10)            | **Algoritmo de rota marítima A\* com máscara de terra**, reservas explicáveis multi-meta e WebGL de terreno.        |
| **`iSayZes/BDO-PAZ-Browser`**                       | ⭐⭐⭐⭐ **Alta**         | Alta (2026-10)            | **Parsers Python modernos** de formatos desconhecidos (ex.: transição de Buff ID de uint16 para uint32).            |
| **`ychwu/bdo-marketplace-tools`**                   | ⭐⭐⭐⭐ **Alta**         | Alta (2026-08)            | **Decoder Huffman binário** para tráfego do mercado oficial e modelo de "episódios de disponibilidade".             |
| **`fffam/blackdesert-somethinglovely-map`**         | ⭐⭐⭐ **Média (Legado)** | Baixa (dados 2023)        | **Topologia de nodes e conversão de coordenadas** (Dijkstra para CP e camadas GeoJSON).                             |
| **`Graveflo/BDO_Enhancement_Tool`**                 | ⭐⭐⭐ **Média**          | Baixa (matemática 2022)   | **Modelo de matriz de transição e menor custo esperado** para failstacks (precisa calibração com Pity/Agris atual). |
| **`nidea1/Central-Market-Discord-Bot`**             | ⭐⭐ **Baixa**            | Baixa (2023)              | Ideia conceitual de Order Book e fila de registro.                                                                  |
| **`kookehs/bdo-marketplace`**                       | ⭐⭐ **Baixa**            | Baixa (2021)              | Estrutura de modelagem em Go (mainKey/subKey); código HTTP obsoleto.                                                |
| **`michel-silveira/blackdesert-mp-tax-calculator`** | ⭐ **Descartável**        | Baixa (2020)              | Fórmula simplista obsoleta (não modela Fama nem Pacote Econômico completo).                                         |
| **`IIPoliII/BDO-Easy-Boss-Timer`**                  | ⭐ **Descartável**        | Baixa (2020)              | Horários históricos e scripts shell sem tratamento de fuso IANA.                                                    |
| **`Automation`, `Manager`, `hack-2026-toolkit`**    | ❌ **Nulo / Alerta**      | Falso / Promocional       | Não possuem código (apenas READMEs direcionando para links externos). Descartar integralmente.                      |

---

## 2. Análise dos Sites de Referência (BDOLytics e BDOCodex)

### A. BDOLytics (`bdolytics.com`)

- **Stack**: Nuxt 3 / Vue 3 com SSR, TailwindCSS e Fontes Dinâmicas.
- **Consumo de Dados**: Rota REST interna `https://apiv2.bdolytics.com/en/{region}/...` (ex.: `/market/central-market-data`, `/db/item/{id}`, `/processing/{id}`).
- **Destaques de UI/UX**:
  1. **Calculadoras de Lucro Dinâmicas**: Permite alterar o nível de maestria do jogador no topo da página; toda a árvore de receitas e o cálculo de lucro/hora (`profit/h`) recalculam em tempo real.
  2. **Mapa Interativo (`/en/map`)**: Construído sobre Leaflet/Canvas com tiles fatiados do radar do próprio cliente (zoom 0–6). Possui toggles rápidos para Nodes de Contribuição, Pontos de Coleta, Cavalos selvagens e Rotas de Permuta (Barter).
  3. **Visão de Mercado**: Gráficos históricos de volume e preço com identificação de itens esgotados (out-of-stock).

### B. BDOCodex (`bdocodex.com`)

- **Stack**: PHP clássico, MySQL, DataTables e jQuery.
- **Pipeline de Dados**:
  - O mantenedor (Kiriak) extrai diretamente do cliente do jogo (`PAZ`) a cada atualização semanal da Coreia e do Global Lab.
  - O banco é estruturado por `Item_ID` único, mapeando relações polimórficas: Item ↔ Receitas ↔ Drops de Monstros ↔ Recompensas de Missões ↔ Venda de NPCs.
  - Rota pública histórica de tooltips: `tip.php?id={id}&l={locale}` (retorna snippet HTML pronto para injeção em fóruns e sites de terceiros).
- **Destaques para o Black Market**:
  - A estrutura de **Abas de Vínculo Reverso** (ex: "Usado em receitas", "Obtido em missões", "Desmanchado em") é o padrão de ouro que devemos manter nas nossas páginas de detalhes de item.

---

## 3. Análise Detalhada dos Melhores Repositórios

### 3.1. `iDevelopThings/bdo-viewer` (Item Catalog, Crafting Calculator, Compare e Knowledge)

O repositório é uma aplicação desktop em Go + Wails + React. Podemos extrair os modelos conceituais sem copiar o acoplamento do Wails:

#### 1. Comprehensive Crafting Calculator (`internal/recipe/`):

- **Algoritmo**: Busca em Profundidade (DFS) com pilha de prevenção de ciclos e profundidade máxima (`maxDepth = 10`).
- **Estrutura**:
  - `resolvetree.go`: Resolve variantes de receitas por URN e método (`Simple Cooking`, `Alchemy`, `Processing`).
  - `craftplan.go`: Calcula `ceil(necessidade / yield)` e gera a Bill of Materials (BOM) consolidada.
  - `cost.go`: Memoiza os custos mínimos comparando o custo de fabricar vs comprar diretamente no mercado.
- **Pontos de Atenção (Não copiar cegamente)**:
  - O `bdo-viewer` força `max(1, it.Count)`, o que converte dados ausentes em quantidade 1 (falso positivo). No Black Market, mantemos o valor como `null` ou solicitamos calibração.
  - O rendimento de maestria em `source_mastery.go` usa uma fórmula aproximada de proc máx, pois o rendimento exato é calculado no servidor da Pearl Abyss. Nosso `packages/calculators/src/production-planner.ts` já lida com intervalos estocásticos de forma mais robusta.

#### 2. Ferramenta de Comparação (`frontend/src/components/compare/`):

- Compara múltiplos itens lado a lado em colunas independentes.
- Permite ajustar sliders de aprimoramento (+0 até PEN) e níveis de Caphras (0 a 20) individualmente por coluna.
- **Melhoria para o Black Market**: O `bdo-viewer` compara strings de atributos localizadas. Nós devemos comparar usando `statId` normalizado (PA, PD, Precisão, Evasão) com indicadores visuais de melhoria (+ verde, - vermelho).

#### 3. Catálogo e Knowledge (`internal/catalog/source_knowledge.go`):

- Organização hierárquica em árvore de temas (Themes) e entradas (Entries) com contagem de filhos e energia total ganha.
- Separação limpa entre dados estáticos do catálogo e o progresso pessoal do usuário.

---

### 3.2. `waliori/bdo-ship-upgrade-tracker` (Planejamento Naval e Rota Marítima)

- **Algoritmo de Rota Marítima (`js/searoute.js`)**:
  - Utiliza uma **máscara binária de mar compactada** (bitmap onde 1 = navegável, 0 = terra).
  - Executa Flood Fill de 4 vizinhos para identificar componentes de água conectados.
  - Para NPCs em terra, localiza o ponto de água mais próximo e traça o caminho marítimo contornando a costa usando o algoritmo **A\***.
  - Muito superior a um Dijkstra tradicional porque evita linhas retas atravessando ilhas.
- **Reservas Inteligentes Multi-Meta (`js/planner.js`)**:
  - Permite definir metas prioritárias (ex: Carrack Volante antes de Carrack Balance).
  - O estoque é alocado primeiramente para a Meta 1; o excedente é liberado para a Meta 2, sem duplicar o cálculo de materiais necessários.
  - Rastreia `reservedBy` com ID da meta e produto intermediário.

---

### 3.3. `ychwu/bdo-marketplace-tools` (Decodificação de Rede e Mercado Central)

- **Decoder Huffman (`bdo_marketplace_tools/market/decoder.py`)**:
  - O endpoint oficial do Mercado Central (`/Trademarket/GetWorldMarketList`) comprime respostas binárias com codificação Huffman dinâmica.
  - Implementa a reconstrução da árvore Huffman via tabela de frequências e estruturas little-endian para parsear os pacotes de itens.
- **Episódios de Disponibilidade (`services/task_manager.py`)**:
  - Em vez de emitir alertas a cada segundo do polling, o sistema abre um "episódio" quando o item entra em estoque e só fecha após $N$ falhas consecutivas de observação.
  - Elimina ruído e falsos positivos de micro-oscilações de rede.

---

### 3.4. `fffam/blackdesert-somethinglovely-map` (Topologia Geográfica e Coordenadas)

- **Transformação de Coordenadas (`src/misc/CoordinateSystems.js`)**:
  - O BDO utiliza um sistema de coordenadas 3D no cliente: $X$ (oeste-leste), $Y$ (altitude) e $Z$ (norte-sul).
  - Para projetar em um mapa plano bidimensional 2D (Leaflet CRS.Simple):
    $$\text{chartX} = \frac{\text{gameX}}{25} + 68600, \quad \text{chartY} = 72200 - \frac{\text{gameZ}}{25}$$
  - A conversão inverte o eixo $Z$ (pois na tela o $Y$ cresce para baixo).
- **Grafo de Nodes de Contribuição (`src/misc/NodePathCalculator.js`)**:
  - Grafo ponderado onde o peso da aresta é o CP (Pontos de Contribuição) necessário para ativar o node.
  - O nosso algoritmo em `packages/calculators/src/node-routing.ts` já é superior ao do Somethinglovely porque ele leva em consideração os nodes **já investidos pelo jogador** (custo incremental zero).

---

### 3.5. `Graveflo/BDO_Enhancement_Tool` (Modelagem de Aprimoramento)

- **Custo Esperado de Failstacks (`Core/Gear.py`)**:
  - Modela o aprimoramento como uma cadeia de transição de estados: em cada nível, o item tem probabilidade $p$ de sucesso e $1-p$ de falha.
  - Na falha de acessórios: perda total do item.
  - Na falha de armaduras/armas TET/PEN sem Cron: downgrade para o nível anterior (custo de recuperação = custo esperado de voltar ao nível anterior).
  - **Atualização Obrigatória**: A ferramenta original é de 2022. O BDO moderno introduziu o **Sistema de Pity (Essência de Agris / Garantia de Aprimoramento)**, onde um número fixo de falhas garante 100% de sucesso. A fórmula de $1/p$ deve ser substituída pela soma finita até o limite de pity.

---

## 4. Diretrizes de Implementação no Black Market

1. **Crafting Tree & BOM**:
   - Adotar a modelagem multiobjetivo com `reservedBy` inspirada no `bdo-ship-upgrade-tracker` e os DTOs compactos do `bdo-viewer`.
   - Manter o cálculo financeiro em `packages/calculators/src/production-planner.ts` com BigInt para precisão de pratas.
2. **Comparador de Itens**:
   - Criar o componente Angular no `apps/web/src/app/features/items/compare/` com suporte a sliders de enhancement e Caphras.
3. **Dados e Catálogo**:
   - Continuar utilizando o dataset extraído do cliente SA/pt via `bdo-data-extractor` (mantido em `data/tools/`).
   - Nunca importar CSVs estáticos de 2021 de repositórios legados como verdade atual.
4. **Mercado em Tempo Real**:
   - Manter a integração com a API Arsha v2 e o cache inteligente no NestJS.
   - Se for necessário fallback direto para a API oficial do jogo no futuro, reutilizar o decoder Huffman MIT do `bdo-marketplace-tools`.
