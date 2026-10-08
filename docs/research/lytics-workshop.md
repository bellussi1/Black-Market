# BDOLytics e BDO Workshop: rotas, funcionalidades e procedência

Pesquisa realizada em **7 de outubro de 2026**, sem login. Complementa [o inventário anterior](../product-research.md). O objetivo é mapear famílias de funcionalidades, não copiar bases de dados nem enumerar todos os IDs de itens, receitas ou usuários.

## Método e limites

- Consultados HTML público, links indexados, políticas e recursos JavaScript entregues pelas próprias páginas. Apenas leitura; nenhum upload, cadastro ou chamada de escrita.
- Workshop: [robots.txt](https://bdoworkshop.com/robots.txt) respondeu HTTP 200 com `User-agent: *` e `Disallow:` vazio. [sitemap.xml](https://bdoworkshop.com/sitemap.xml) respondeu 404. Seu [manifesto Ziggy](https://bdoworkshop.com/ziggy.js?v=d9d9a0d8c7e6) permite descobrir nomes de rotas; uma rota presente nesse arquivo **não prova acesso público**. Rotas administrativas, logs de reconhecimento e imagens de usuários não foram acessadas.
- BDOLytics: [robots.txt](https://bdolytics.com/robots.txt) respondeu HTML de aplicação, não um arquivo robots válido. As páginas atuais devolveram um shell Nuxt com pouca informação legível. O conteúdo indexado pelo mecanismo de busca é marcado abaixo como **indexado**, podendo estar desatualizado. Isso limita a confirmação de estados atuais.
- HTTP 200 confirma entrega de uma página, não o funcionamento completo de uma calculadora. Redirecionamentos ao login e o 403 observado foram respeitados. Não houve varredura de parâmetros arbitrários, rotas privadas ou tentativa de contornar restrições.

Legenda: **atual** = resposta pública inspecionada nesta pesquisa; **indexado** = conteúdo disponível no índice de busca, com abertura direta limitada a shell; **histórico** = documento anterior, sem confirmação atual do comportamento.

## BDOLytics

### Famílias de funcionalidades

| Família                 | Funcionalidades mapeadas                                                                                                                             | Evidência e limite                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Entrada e descoberta    | Busca global com atalho, atalhos para ferramentas, itens populares, idiomas                                                                          | [Home](https://bdolytics.com/en/), indexado; abertura atual devolveu shell                                                      |
| Database                | Itens, equipamentos, materiais, consumíveis, montarias, pets; quests, NPCs, skills, conhecimento, nodes, casas, grindspots; receitas e processamento | [Menu do mapa](https://bdolytics.com/en/map?node=464), indexado; famílias anunciadas, não todas as telas verificadas            |
| Item e relações         | Peso, preços NPC, descrição, comentários, receitas que produzem/consomem, drops e relações com NPCs                                                  | [Item 55052](https://bdolytics.com/en/db/item/55052), indexado; relações observáveis, sem validação das probabilidades exibidas |
| Mercado                 | Navegação por categorias de equipamentos, materiais, consumíveis e lightstones; seleção regional                                                     | [Mercado e item](https://bdolytics.com/en/market/item/11628/3?page=1), indexado; abertura atual em shell                        |
| Crafting                | Custo e retorno, imposto, preço customizado, uso do estoque, subprodutos, tempo, lucro/hora e cadeia de intermediários                               | [Processamento 4659](https://bdolytics.com/en/processing/4659), indexado; exemplo detalhado, não garantia de rendimento atual   |
| Mapa                    | Filtros de nodes, pesca, cavalos, portais, barter, grindspots e recursos de coleta                                                                   | [Mapa NA](https://bdolytics.com/en/NA/map), indexado; camadas listadas, coordenadas não exportadas                              |
| Planejamento            | Dashboard, armazenamento, planos de produção, barter                                                                                                 | Menu [mapa 464](https://bdolytics.com/en/map?node=464), indexado; persistência/login não exercitados                            |
| Progressão e personagem | Experiência, maestria, contribuição, amity; trackers de títulos/conhecimento/pesca, skills e cadeias de quests                                       | Menu [mapa 1158](https://bdolytics.com/en/map?node=1158), indexado; anúncio de ferramentas não prova operação                   |
| Training e buffs        | Estábulo, stats, reprodução, nível, imposto, skills e experiência de cavalos; busca de buffs                                                         | Mesmo menu indexado; estados internos não verificados                                                                           |
| Monetização             | Premium para remover anúncios                                                                                                                        | Conteúdo indexado da [receita 4659](https://bdolytics.com/en/processing/4659)                                                   |

O inventário anterior descreve gráficos de preço/estoque/volume, imposto do mercado, delivery imperial e controles adicionais. Esses detalhes permanecem **históricos** quando não corroborados nas páginas acima.

### Rotas abertas nesta pesquisa

As seguintes aberturas retornaram shell de aplicação, sem confirmar o conteúdo interativo:

- [Home `/en`](https://bdolytics.com/en).
- [Market legado](https://bdolytics.com/en/NA/market/central-market): a ferramenta web registrou redirecionamento para [`/en/market`](https://bdolytics.com/en/market).
- [Mapa inglês](https://bdolytics.com/en/map) e [mapa francês](https://bdolytics.com/fr/map).
- [Item 9202](https://bdolytics.com/en/db/item/9202).
- [Processamento 4678](https://bdolytics.com/en/processing/4678) e [4659](https://bdolytics.com/en/processing/4659).
- [Item de mercado 11628, nível 3](https://bdolytics.com/en/market/item/11628/3?page=1).

Além dessas aberturas, as URLs das tabelas foram consultadas como resultados indexados. Não considerar URLs antigas encontradas no índice como contratos estáveis.

## BDO Workshop

O HTML entrega `data-page` do Inertia com nome de componente e propriedades públicas. Isso permite confirmar famílias e dados iniciais sem executar ações pessoais. A descrição da [home](https://bdoworkshop.com/) declara calculadoras e leitura de prints de inventário, armazém e equipamentos.

### Inventário atual de rotas visitadas

| Rota pública                                                                          | Resultado observado                                  | Função confirmada ou preparada pela página                                                                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [Home](https://bdoworkshop.com/) e [Enhancement](https://bdoworkshop.com/enhancement) | 200, `enhancement`                                   | Catálogo e tabelas de aprimoramento; seleção de item/tipo                                                          |
| [Detalhe enhancement](https://bdoworkshop.com/enhancement/1/2)                        | Página entregue; leitor web em fallback JS           | Rota de item e tipo; cálculo não executado                                                                         |
| [Enhancement Workshop](https://bdoworkshop.com/enhancement-workshop)                  | 200, `enhancement_workshop`                          | Projetos, presets, compartilhamento e paginação comunitária                                                        |
| [Community legado](https://bdoworkshop.com/enhancement-workshop/community)            | Redireciona à home                                   | Não tratar como rota independente ativa                                                                            |
| [Gear Progression](https://bdoworkshop.com/gear-progression)                          | 200, `gear_progression`                              | Loadout anônimo, slots, ladders de stats, cristais, bônus, receitas, limites de progressão e fontes de recompensas |
| [Gear Upgrade Path legado](https://bdoworkshop.com/gear-upgrade-path)                 | Redireciona para Gear Progression                    | Alias                                                                                                              |
| [FS Cost](https://bdoworkshop.com/fs-cost)                                            | 200, `fs_cost`                                       | Stack inicial/alvo; preços customizados no exemplo indexado [fs=177](https://bdoworkshop.com/fs-cost?fs=177)       |
| [Alchemy Stones](https://bdoworkshop.com/alchemy-stones)                              | 200, `alchemy_stone_calculator`                      | Seleção de pedra; cálculo detalhado não executado                                                                  |
| [Gathering](https://bdoworkshop.com/gathering-calculator)                             | 200, `gathering_calculator`                          | Categorias, tipos, tabelas de droprates e rotações                                                                 |
| [Mastery Upgrade Path](https://bdoworkshop.com/mastery-upgrade-path)                  | 200                                                  | Lifeskills, níveis, equipamentos de maestria, stats de aprimoramento e buffs                                       |
| [Crafting Workshop](https://bdoworkshop.com/crafting-workshop)                        | 200, `crafting_workshop`                             | Produtos, seletor de itens e workbenches; não se confirmou execução/salvamento sem login                           |
| [Storage Tracker](https://bdoworkshop.com/crafting-workshop/storage-tracker)          | 200, `storage_tracker`                               | Armazéns por cidade, ícones, itens visualmente semelhantes e itens não empilháveis; anônimo começa vazio           |
| [Royal Workshop](https://bdoworkshop.com/royal-workshop)                              | 200, `royal_workshop_optimizer`                      | Itens, produtos, nodes, subnodes e receitas                                                                        |
| [Carrack Resources](https://bdoworkshop.com/carrack-resource-management)              | 200                                                  | Planejamento de recursos; detalhes do cálculo carregados pelo cliente                                              |
| [Carrack Stats](https://bdoworkshop.com/carrack-stats-comparison)                     | 200                                                  | Comparação e configuração compartilhada                                                                            |
| [Sailor Presets](https://bdoworkshop.com/sailor-presets)                              | 200                                                  | Presets compartilháveis                                                                                            |
| [Lifeskill Buffs](https://bdoworkshop.com/lifeskill-buffs)                            | Redireciona a [Buffs](https://bdoworkshop.com/buffs) | Itens, efeitos, seções, pets e atividades                                                                          |
| [Map](https://bdoworkshop.com/map)                                                    | 200, `map`                                           | Layouts, mundo, marcadores, temas, camadas, nodes, subnodes e conexões                                             |
| [Marni DPS](https://bdoworkshop.com/marni-dps)                                        | 200                                                  | Zonas, classes, regras e leaderboard de submissões                                                                 |
| [Barter Optimization](https://bdoworkshop.com/barter-optimization)                    | 200                                                  | Rotas de barter; cálculo não executado                                                                             |
| [Night Vendor](https://bdoworkshop.com/night-vendor-event)                            | 200                                                  | Lista de itens; estimativas descritas no histórico                                                                 |
| [RNG Boxes](https://bdoworkshop.com/rng-boxes)                                        | 200                                                  | Lista de caixas; distribuição não validada                                                                         |
| [Supporters](https://bdoworkshop.com/supporters)                                      | 200                                                  | Grupos e total de apoiadores                                                                                       |

Rotas visitadas que redirecionaram ao login: [Alchemy](https://bdoworkshop.com/alchemy), [Cooking](https://bdoworkshop.com/cooking), [Processing](https://bdoworkshop.com/processing), [Imperial](https://bdoworkshop.com/imperial), [Items](https://bdoworkshop.com/items), [Completionist Workshop](https://bdoworkshop.com/completionist-workshop) e [Community Gathering Uploads](https://bdoworkshop.com/community-gathering/uploads). Nenhum dado atrás do login foi acessado. [Lifeskill Stats](https://bdoworkshop.com/lifeskill-stats) respondeu **403**, encerrando a inspeção dessa rota.

**Correção do histórico:** o Storage Tracker tem página pública atual; isso não confirma salvamento em conta sem autenticação. O mapa atual também entrega nodes e conexões, portanto a descrição anterior de mapa exclusivamente focado em conhecimento ficou incompleta.

### Importação de armazéns: evidência mais relevante

O [recurso público da página Storage Tracker](https://bdoworkshop.com/build/assets/storage_tracker-CdAbNmve.js) contém os controles e mensagens de um fluxo com:

1. Escolha da cidade e adição manual de item/quantidade.
2. Upload de até três prints para armazéns que precisam de rolagem.
3. Seleção/calibração da área e detecção da grade.
4. Junção das imagens com tratamento de sobreposição e duplicidades.
5. Revisão de itens/quantidades reconhecidos, edição e exclusão antes de salvar.
6. Avisos sobre ícones idênticos e necessidade de identificar manualmente materiais ambíguos.
7. Sugestões de consolidar pilhas entre cidades e liberar slots.
8. Consulta de receitas que consomem um item, ordenação por lucro por craft/hora/total e sugestões sobre o estoque.

São **controles presentes no cliente público**, não uma execução verificada com prints reais. O componente avisa que scans priorizam recursos e outros itens podem precisar de identificação manual. O [módulo de reconhecimento](https://bdoworkshop.com/build/assets/inventory-detection-Ber3n0JU.js) inclui recortes de quantidade, OCR, leitura de enhancement e revisão. Isso não identifica o modelo, biblioteca de OCR ou acurácia utilizados no backend.

A [política de privacidade, atualizada em 28/09/2026](https://bdoworkshop.com/privacy-policy), confirma reconhecimento de screenshots e guarda das imagens/resultados em log privado de revisão; estado anônimo fica no navegador e pode ser importado após login. A política também prevê processamento prioritário para apoiadores. Ela não comprova acesso direto ao inventário do jogo.

## De onde vêm os dados?

| Tipo                        | Declarado/observado                                                                                                                                    | Inferência ou desconhecido                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo, ícones e receitas | BDOLytics exibe entidades relacionadas; Workshop envia catálogos e manifest de ícones nas páginas                                                      | Pipeline original, direitos de redistribuição e origem de cada asset não foram publicados nas fontes consultadas. Não há evidência de que usem o extractor do projeto |
| Preços regionais            | Workshop prepara servidores e controles de preços; exemplos indexados de FS Cost mostram valores e falhas de carga. BDOLytics anuncia mercado regional | Provedor upstream e cadência exata desconhecidos; não atribuir Arsha ou Pearl Abyss diretamente sem declaração                                                        |
| Histórico de mercado        | Descrito no inventário anterior do BDOLytics                                                                                                           | Armazenamento próprio é plausível, mas arquitetura, retenção e intervalo de amostragem não confirmados                                                                |
| Droprates e rendimento      | Workshop entrega tabelas e rotações; BDOLytics indexa relações de drops                                                                                | Autoridade, tamanho de amostra e manutenção por patch desconhecidos. Exibição numérica não valida fórmula                                                             |
| Estoque pessoal             | Workshop declara dados enviados pelo usuário e reconhecimento de imagens                                                                               | Não foi encontrada API de inventário pessoal usada por esses sites                                                                                                    |
| Dados comunitários          | Workshop tem leaderboard/submissões; política explica publicação por escolha e compartilhamento                                                        | Metodologia de validação das medições não foi auditada                                                                                                                |

### Tecnologias e APIs

O HTML atual do BDOLytics referencia bundles `/_nuxt/` e `cdn.questlog.gg`, evidência de entrega Nuxt/CDN; não revela banco, infraestrutura ou fonte do catálogo. Workshop expõe páginas Inertia, manifesto Ziggy e módulos React, indícios verificáveis de aplicação React/Inertia com roteamento do ecossistema Laravel. Versões e backend completo não foram confirmados.

Não foi encontrada documentação pública de API de catálogo/exportação para terceiros em nenhum dos dois sites. O manifesto de rotas e chamadas internas de frontend **não equivalem a uma API aberta** nem autorizam coleta da base. Não se consultaram endpoints internos de preços em lote nem endpoints pessoais. A fonte de mercado do Black Market deve ser documentada separadamente.

## Aplicação ao Black Market

- Criar entrada manual e importação por prints com confirmação humana; suportar várias imagens e reconhecer sobreposição antes de atualizar o estoque.
- Comparar ícones com o catálogo próprio e reconhecer quantidades por OCR, mantendo item desconhecido explícito e oferecendo candidatos para imagens semelhantes.
- Versionar o snapshot por armazém e data. Um print representa um momento: não demonstra sincronização automática contínua.
- Recomendações devem mostrar receita, materiais faltantes, preço/região/data, impostos, tempo e incerteza do rendimento. Estoque já possuído tem custo de oportunidade.
- Preparar revisão e exclusão de uploads com política própria; a retenção praticada por um concorrente não precisa ser reproduzida.
- Tratar catálogo estático, mercado e observações do jogador como fontes diferentes; manter procedência por campo e não usar scraping dos concorrentes como alimentação operacional.

Nenhum fornecedor público de sincronização direta de armazém foi comprovado nesta pesquisa. Automatizar o **processamento de prints fornecidos pelo usuário** é tecnicamente viável; automatizar acesso à conta/jogo é outra integração e não foi demonstrada.
