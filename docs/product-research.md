# Inventário de funcionalidades: BDOLytics e BDO Workshop

Pesquisa das áreas públicas dos sites, links internos e documentos de dados consultáveis. Algumas páginas são aplicações JavaScript e estados de login; itens marcados como bloqueados ou não verificados não implicam que a função não exista. A lista descreve o produto observado, não é um compromisso de reprodução. Data da revisão: 7 de outubro de 2026.

## BDOLytics

### Navegação e conta

O menu principal cobre Home, DB, Central Market, Crafting Calculator, Training e Map. Há busca global (`Ctrl+K`), idioma, região, conta, Discord, modo dia/noite e oferta Premium/remover anúncios. Algumas rotas de planejamento e storage pedem login; preços e market lookup são públicos.

### Database e item detail

- Busca de database por texto (a tela indicou mínimo de três caracteres) e navegação por famílias de conteúdo.
- Itens agrupados em armas, armaduras, acessórios, artefatos, lightstones, materiais, enhancement, consumíveis, life tools, alquimia, cristais, pérolas, tintas, montarias/veículos e móveis.
- Outras coleções abrangem quests, NPCs, skills/buffs, mounts e habilidades, pets, títulos, achievements, guild quests, pearl offers, receitas, tipos de processamento, designs, conhecimento, nodes, territórios, casas, grindspots, plantas, peixes, attendance/puzzles e grupos de cristais/lightstones.
- Página de item apresenta metadados localizados, peso e preço NPC quando disponível, abas relacionadas a mapa/mercado, como obter via quests/NPCs/processing, receitas que consomem, designs, produtos de nodes, drops de grindspot/NPC e achievements.

### Central Market

- Filtro por região, busca, categoria, qualidade e favoritos; ordenação por nome, preço, variação semanal, volume do dia/semana e estoque.
- As categorias visíveis incluíam all, mainhand, offhand, awakening, armor, accessories, materials, enhancement, consumables, life tools, alchemy stones, magic crystals, pearl e lightstones.
- Tela de detalhe de item tem mínimo/máximo, volume diário, stock, transações, favoritos/compartilhar e gráficos de preço, volume e estoque em 1D, 7D, 30D, 6M e 1Y.
- Pearl tracker separa sets/partes/outfits por classe, itens funcionais, mounts e pets; havia controles de período/volume. Na inspeção, a lista observada estava vazia — não foi possível inferir cobertura ativa.
- Calculadora de imposto usa preço, quantidade, fama de família, value pack e merchant ring e mostra retorno líquido/imposto.

### Crafting e planejamento

- Calculadoras para cooking, alchemy e processing, imperial crates/delivery e filtros/favoritos.
- Ajustes de preço, imposto, estoque, storage e quantidade; tabelas ordenáveis por receita, ingredientes, prata/hora, preço e volume diário.
- Tela de receita inclui quantidade/custo de insumos, yield, imposto/venda, receita, lucro/margem, crafts/hora, dependências e lucro/hora.
- Plans/storage guardam materiais intermediários, itens faltantes e progressão da produção; são funcionalidades associadas à conta.
- Barter oferece cargo/warehouse, energy, rotas e portos, trades executáveis, níveis de barter, estoque e acompanhamento de sessão; cargo persistente associado à conta.

### Progressão e utilidades

- CP calculator compara CP atual/alvo e modela refeições/alquimia, mastery/produção/tempo, outputs e tiers de CP.
- Training reúne calculadoras de horse stats, breeding, níveis, impostos, skills e XP; o estimador usa progresso atual/alvo, captura/hora, buffs e tempo. Stable permite salvar cavalos.
- Skill Builder monta habilidades por classe, skill points e addons, com rota compartilhável.
- Map tem filtros, rotas, marcadores/progresso e camadas para nodes/subnodes, fishing, cavalry, desert portals, barter e grindspots, mais recursos como árvores, minérios, gemas/cristais, pedras, ervas/flores/cogumelos/frutos/crops, recursos subaquáticos e materiais de caça.
- Menu lista também Buff Finder, XP/mastery, cooking/alchemy XP, planning dashboard, storage, contribution, amity, title/knowledge/fishing trackers e quest-chain viewer. Nem todas essas rotas foram verificadas com dados logados.

Rotas públicas verificadas incluem [Central Market](https://bdolytics.com/pt/market), [detalhe de item no market](https://bdolytics.com/en/NA/market/central-market/item/676), [mapa](https://bdolytics.com/en/map) e [página de processamento/receita](https://bdolytics.com/pt/processing/4678). Parte do conteúdo é renderizado no cliente, então links e quantidade de resultados podem variar por região, idioma e estado atual do site.

## BDO Workshop

### Navegação e Enhancement Workshop

O menu organiza Enhancement (Enhancement, Gear Progression, FS Cost, Alchemy Stones), Lifeskills (Gathering Calc, Mastery Upgrade Path, Carrack Stats/Resources, Sailor Presets, Royal Workshop) e Other (Map, Buffs, DPS leaderboard, Night Vendor Event, RNG Box Value, Supporters). Há atalhos para Enhancement Workshop, Crafting Workshop e Storage Tracker, seletor de região e conta.

- Simulador de enhancement escolhe item/slot, estado atual/alvo, plano de cron, valks/permanent failstack e custos configuráveis de crons, valks e blackstones.
- Mostra chance por nível/failstack, média de tentativas, pity, custo e distribuição/probabilidade de exceder a média.
- Gear progression começa de equipamentos sugeridos (foi mostrado um exemplo Hyperboost PEN Tuvala), recomenda upgrades por GS, monster AP, AP e sheet AP; há filtros de risco e seleção de plano. Alguns recursos de personalização exigem login.
- FS cost compara rotas para criar stack inicial/alvo a partir de materiais e preços editáveis.
- Alchemy stone estima polimento por tipo/material/preço, chance/custo/cliques, pity, dias e probabilidades.
- Histórico da comunidade guarda outcomes, failstacks, tentativas e pity, pode compartilhar registros e criar overlays; a página tinha múltiplas páginas de submissões públicas.

### Life skills e mar

- Gathering cobre butcher, blood, sap, hoe, lumber, mine e tanning; entradas incluem mastery, GDR, Hedgehog/Llama, minigame/event, prata/energia, Agris, Afuaru, baús, fever/drop e despesas. Compara rota e registra sessões pessoais.
- Mastery Upgrade Path abrange gathering, fishing, hunting, cooking, alchemy, processing, training e sailing, com valores de mercado editáveis.
- Carrack Stats compara configurações: mastery, sea crystals, passivas/skills, sailors e equipamentos; resultado compartilhável.
- Carrack Resource Management planeja craft de Advance, Balance, Volante ou Valor; acompanha materiais obtidos/faltantes/dias e fontes como barter, Crow coins, dailies/weeklies, Khan, NPCs, fishing, nodes e exploração.
- Sailor Presets monta ship/capacidade/slots e combina tipos/stats de marinheiros; permite copiar, apagar e compartilhar presets.
- Royal Workshop considera workshops/instalações/rotas/receitas e otimiza valor ou lucro diário.

### Map, buffs e outros

- Map observado é focado em coleta de conhecimento Tachyon Legacy/Trace, com camadas e categorias, e marca achados; não aparenta ser um mapa geral de todos os recursos do jogo.
- Buff presets agrupam PvE/life/PvP/all; alimentos, elixires, scrolls, móveis, packs, pets, guild, eventos e outros. Busca efeito/duração e seleção de buffs.
- DPS leaderboard está rotulado experimental e recebe runs de Marni submetidos por usuários (30 minutos, com imagem mostrando zona e DPS).
- Night Vendor estima valor esperado contra faixa de preço com imposto/lucro/valores customizados e cron; nota comunitária diz que depende de reports de usuários.
- RNG Box Value estima valor esperado/quantidades/probabilidades, sem failstack, com valores customizados.
- Crafting Workshop estava identificado como WIP: plano de cadeia de receita contra inventário, escolha comprar/craft, salvar workbench e login. Storage Tracker também exige login.

Exemplos públicos verificados: [Enhancement](https://bdoworkshop.com/enhancement/1/2), [FS Cost](https://bdoworkshop.com/fs-cost?fs=177) e [Night Vendor Event](https://bdoworkshop.com/night-vendor-event). A página do Night Vendor diz explicitamente que o valor da caixa de Patrigio é estimado com dados fornecidos por jogadores.

## Contas e fontes

A política pública do Workshop cita login via Discord/Google/Steam/Twitch, presets e planos em conta e scans de screenshots para gear/storage; as imagens enviadas e resultados reconhecidos ficam em um log de revisão para verificar erros e melhorar o reconhecimento. Para usuários anônimos, parte do estado fica no armazenamento do navegador e pode ser importada à conta ao entrar. Preços customizados e servidor preferido são configurações do usuário, não uma fonte pública do catálogo global. Consulte a [política de privacidade](https://www.bdoworkshop.com/privacy-policy).

O próprio Workshop descreve o serviço como um conjunto de calculadoras de enhancement, gear-progression, crafting e mercado, além de scans de screenshots. Na página pública de enhancement aparecem preços preenchidos para itens como crons, blackstones e materiais, além de preço base do equipamento; em uma consulta pública à página de FS Cost, a interface mostrou “Couldn't load market prices” e botão Retry. Isso confirma que a calculadora exibe valores de market e que a disponibilidade pode falhar, mas não identifica o provedor nem a frequência de atualização. Algumas páginas dependem de JavaScript e o conteúdo interativo pode não ficar disponível em leitores de páginas. [Página de enhancement](https://bdoworkshop.com/enhancement/1/2) e [página inicial do Workshop](https://bdoworkshop.com/).

### O que sabemos sobre a origem dos dados

| Dado ou funcionalidade | Evidência pública | O que podemos concluir |
|---|---|---|
| Catálogo e receitas do jogo | O [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor) lê os arquivos locais PAZ, tabelas `.bss`/`.dbss`, XMLs de receitas e localização. Produz datasets estruturados de itens, receitas, NPCs, nodes, mapas, zonas, conhecimento e outros. | É um caminho comunitário para montar referência estática a partir de uma cópia instalada do cliente. Não é a API usada por BDOLytics ou Workshop; não há evidência pública ligando o extractor a esses sites. |
| Preços/estoque do Central Market | A documentação do [Arsha BDO Market API](https://www.postman.com/bdomarket/arsha-io-bdo-market-api/documentation/qpavrc8/bdo-market-api-v2) chama o serviço de wrapper comunitário em cache sobre o market; documenta respostas de preço, stock, trades, ordens e histórico. | Existe uma rota comunitária para ler dados do market, mas a documentação não prova que os dois sites a utilizam. Não é feed em tempo real: a documentação informa cache de 30 minutos, com expiração/removal dependente da frequência de uso. |
| BDOLytics | As páginas públicas mostram market regional, preço/estoque/volume, gráficos históricos, calculadoras e database interligada. Não encontramos documentação pública da API própria, provedor upstream ou cronograma de atualização. | O dado observado não revela se BDOLytics consulta diretamente rotas da Pearl Abyss, Arsha ou outro provedor, nem com que cadência. Não presumir que sua API privada possa ser reutilizada. |
| BDO Workshop | A interface oferece campos de preço editáveis/valores de market e a política de privacidade confirma preços customizados e servidor preferido salvos na conta ou browser. Não encontramos divulgação pública do provedor automático nem da frequência de refresh. | O site aparenta alimentar calculadoras com valores regionais de market e permitir override. A fonte exata e a rotina de atualização são desconhecidas; essa conclusão é inferência da interface, não uma declaração do operador. |
| Relatos e medições comunitárias | Night Vendor estima valor com reports enviados por jogadores; o DPS leaderboard recebe runs submetidas por usuários. | São dados crowdsourced e estimativas, úteis para recursos comunitários, mas não substituem dados autoritativos do cliente/market. |

O extractor explicita que o mercado é server-side e que preço ao vivo não está nos arquivos locais do jogo; o próprio extractor não faz chamadas de rede. Também marca alguns dados de produção como server-side (por exemplo, yield por receita e resultados de alguns grupos de manufatura), mostrando que a extração não fornece todo valor do jogo. Ver a seção [pipeline e procedência](data-pipeline.md) para a estratégia recomendada neste projeto. A licença do extractor também restringe o uso do código-fonte a fins não comerciais; isso não concede direitos sobre dados, marcas ou assets da Pearl Abyss. Revisar a licença e os termos aplicáveis antes de usar ou redistribuir resultados/ícones.

## O que isso significa para este projeto

Os sites mostram padrões úteis: filtros encadeados, cálculo com preço regional, histórico/estimativas, cadeias de crafting, presets e procedência. Não foi encontrada documentação pública de API/exportação dos dois sites durante a pesquisa. O Arsha é uma API comunitária separada e documentada; sua existência não demonstra que BDOLytics ou Workshop a usam. Chamadas internas vistas no navegador pertencem à aplicação deles e não constituem uma API pública para este projeto. Antes de implementar fórmulas, comparar resultados com exemplos e regras atuais do jogo; não copiar código, marca, imagens, JSON ou conteúdo protegido. Consulte [pipeline](data-pipeline.md) e [calculadoras](calculators.md).
