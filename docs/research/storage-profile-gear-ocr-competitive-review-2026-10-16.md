# Revisão competitiva — Armazém, personagem, equipamento e OCR

**Consulta:** 16/10/2026 · páginas públicas · sem autenticação em contas, inspeção de APIs privadas ou contorno de controles.

Esta revisão orienta a hierarquia visual da fase 3 do rollout. A implementação mantém o modelo local de dados e a revisão explícita do OCR. Observação da interface não confirma como um concorrente persiste dados, valida reconhecimento ou calcula atributos.

## BDO Workshop

- A [página inicial](https://bdoworkshop.com/) descreve ferramentas de aprimoramento, progressão de equipamento, crafting e mercado, além de leitura por captura de inventário, armazém e gear. A própria página informa que as ferramentas precisam de JavaScript.
- A página pública indicada para o [Storage Tracker](https://bdoworkshop.com/crafting-workshop/storage-tracker) e a rota do [Crafting Workshop](https://bdoworkshop.com/crafting-workshop) não renderizaram nesta consulta. Não foi possível verificar os campos, o fluxo de revisão, persistência, estados vazios ou diferenças entre a captura e o valor salvo.
- **Comparação:** a promessa pública de leitura por captura é comparável à entrada por imagem do Black Market. A política atual do Black Market mantém a imagem no navegador e exige correção/confirmar antes de aplicar valores; não inferimos que o Workshop tenha a mesma política.

## BDO Codex

- O [registro de Serendia 1-1, 2F, Alejandro Farm](https://bdocodex.com/us/npc/2204/) mostra um catálogo de local/edifício com lista de usos, incluindo expansão de espaços de Storage. O [registro da missão Container](https://bdocodex.com/us/quest/4470/15/) classifica a missão como Family e descreve o acesso ao Storage da cidade por um container em residência.
- A rota pública de [itens](https://bdocodex.com/us/items/) foi bloqueada nesta consulta. O índice de busca retornou registros públicos de itens que incluem ícone, peso, capacidade de armazém, vínculo por personagem/família e preço de NPC quando disponível; isso é uma ficha de catálogo, não um inventário pessoal sincronizado.
- **Comparação:** Codex ajuda a consultar relações e propriedades do jogo. Não encontramos na superfície pública uma ferramenta de armazém pessoal, editor de ficha do usuário ou importação OCR comparável; isso significa “sem equivalente encontrado”, não prova de inexistência em áreas privadas.

## BDOLytics

- As rotas públicas de [Mercado](https://bdolytics.com/en/market), [Crafting](https://bdolytics.com/en/crafting) e [experiência de Culinária](https://bdolytics.com/en/cooking/experience) abriram sem conteúdo textual nesta consulta. A página de [personagem](https://bdolytics.com/en/character) e a rota tentativa de [gear](https://bdolytics.com/en/gear) não ficaram acessíveis.
- A pesquisa pública desta data não confirmou uma interface de inventário/Storage pessoal nem um fluxo OCR. A auditoria competitiva de Mercado/Receitas de 16/10 registra que a lista de calculadoras do BDOLytics separa profissões e expõe filtros de prata/hora e volume médio; essa observação é contexto de crafting, não evidência de uma ferramenta de perfil ou armazém.
- **Comparação:** não há informação atual suficiente nesta consulta para comparar seus estados de loading/revisão com o Black Market. As telas de Mercado/Crafting podem ser reabertas em uma análise dessas áreas.

## Garmoth

- O [Gear Planner](https://garmoth.com/character/default) declara permitir equipar armas, armaduras, acessórios, cristais, lightstones e artefatos e apresentar AP/DP, brackets e custo total em prata, além de comparar builds e sugerir upgrades. A página pública de [personagem compartilhado](https://garmoth.com/character/DpXbdJqU3x) mostra abas Character Info, Gear Builder, Stats e Silver. A região visível na captura textual foi EU.
- A página de [brackets de maestria de coleta](https://garmoth.com/mastery-brackets/gathering) apresenta uma tabela de maestria com chances/quantidades por categoria de coleta. Ela é referência pública para organização dos dados, não validação de valores de maestria do personagem do usuário.
- A [página de mercado](https://garmoth.com/market) separa itens populares, tendências, maiores variações e itens recentes. Não encontramos nessa consulta fluxo de leitura de inventário/armazém por captura ou sincronização da conta do jogador.
- **Comparação:** Garmoth oferece uma experiência pública mais voltada a planejar builds e estatísticas calculadas. O Black Market registra equipamento informado/importado e deliberadamente não deduz atributos dos ícones quando faltam dados confirmados.

## Aplicação visual ao Black Market

- Armazém/estoque mantém importação e cadastro manual juntos no contexto, filtros antes da lista e modo grade/tabela sem alterar quantidades nem destinos.
- Família mantém as abas e a seleção de personagem sob o cabeçalho compartilhado; equipamento embutido identifica o personagem ativo e preserva confirmação manual de aprimoramento/Caphras.
- OCR mantém etapa, imagem, sugestões, incertezas, seleção de destino e confirmação. O resumo visível reforça que sugestões não são aplicadas automaticamente; nenhum valor de confiança ou regra de inclusão foi alterado.
- Não se copiou texto de produto, código, asset ou dado dos concorrentes. Esta consulta não comparou cálculos nem dá suporte a novas fórmulas.

## Limitações da consulta

O BDO Workshop anunciou as áreas de captura na página inicial, mas suas ferramentas dependentes de JavaScript e a rota do Storage Tracker não renderizaram. A listagem de itens do BDO Codex foi bloqueada; páginas indexadas e registros públicos individuais mostram dados de catálogo, não uma interface de usuário. BDOLytics retornou páginas sem conteúdo textual. O Garmoth ofereceu conteúdo público de planner e maestria, mas a inspeção por texto não mede layout real em tamanhos de tela nem comportamento após interação. “Não verificado” não significa que a função inexiste.

## Validação local da fase

A tentativa de abrir `http://localhost:4200/storage` retornou `ERR_CONNECTION_REFUSED`. Por isso, não foi possível capturar a aplicação em 1440×900 ou 390×844, nem inspecionar estado autenticado. Não iniciei um serviço compartilhado. A compilação Angular da Web e os specs focados de template foram usados para confirmar que as mudanças compõem; a validação visual no navegador permanece pendente quando o servidor local estiver disponível.
