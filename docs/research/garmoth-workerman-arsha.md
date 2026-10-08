# Pesquisa pública: Garmoth, Workerman e Arsha

Pesquisa em **7 de outubro de 2026**, sem login, downloads de executáveis ou chamadas aos servidores de mercado do jogo. Conteúdo público e código acessível foram lidos; aplicações não foram executadas. Rotas descobertas no código não equivalem a telas integralmente exercitadas.

## Cobertura e limites

- Garmoth: nove páginas públicas com conteúdo textual ou resposta HTML, mais `robots.txt`. A requisição HTTP ao sitemap foi bloqueada pelo Cloudflare. A exploração do domínio foi encerrada nesse ponto; não houve tentativa de contornar o bloqueio. Uma varredura completa não foi possível.
- Workerman: Home e bundle publicado acessíveis; 12 caminhos de navegação responderam HTTP 404 diretamente. O HTML da SPA contém suporte a redirecionamento para GitHub Pages. As funcionalidades foram verificadas no código público, sem confundir 404 de hospedagem com inexistência da rota na aplicação.
- Arsha: documentação pública e fonte. Nenhum endpoint de preços foi chamado, preservando o bloqueio de upstream Pearl Abyss/Imperva registrado anteriormente no projeto.
- Não foram visitadas áreas de administração, autenticação ou URLs desautorizadas pelo `robots.txt` do Garmoth.

## Garmoth

### Páginas efetivamente visitadas

| Página                                                               | Evidência e funcionalidades observadas                                                                        | Limite da observação                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Home](https://garmoth.com/)                                         | Navegação por mercado, aprimoramento, grind e equipamentos; cupons, notícias e vídeos comunitários; changelog | Conteúdo público, sem perfil                                                             |
| [Ferramentas](https://garmoth.com/tools)                             | Catálogo de calculadoras e planners descritos abaixo                                                          | Catálogo não comprova o funcionamento de cada formulário                                 |
| [Mercado](https://garmoth.com/market)                                | Populares, tendências, altas, quedas e itens recentes                                                         | Indicadores numéricos vieram vazios na leitura HTML; preços efetivos não foram validados |
| [Entrega imperial](https://garmoth.com/imperial-crates)              | Cozinha/alquimia, maestria, contribuição, grau e quantidade mínima disponível                                 | Caixas permaneceram em carregamento no HTML                                              |
| [Gear planner](https://garmoth.com/character/default)                | Montagem, comparação, custo e progressão de equipamentos                                                      | Edição/salvamento de perfil não exercitados                                              |
| [Resumo de grind](https://garmoth.com/grind-tracker/user/summary)    | Análise por spot/classe/período, prata total, média/hora e horas                                              | Sem sessões pessoais                                                                     |
| [Melhores spots](https://garmoth.com/grind-tracker/best-grind-spots) | URL seguida a partir da navegação                                                                             | Resposta sem texto extraível; ranking não confirmado                                     |
| [Aplicativo](https://garmoth.com/app)                                | Documentação de captura/OCR e sincronização de sessões                                                        | Não instalado; declarações do fornecedor                                                 |
| [Privacidade](https://garmoth.com/privacy)                           | Dados pessoais de planners/sessões, autenticação Discord e exclusão de conta                                  | Não prova um contrato público de API                                                     |

O [robots.txt](https://garmoth.com/robots.txt), acessível por HTTP, exclui `/settings`, `/auth/`, `/market/favorites`, `/market/search/`, `/grind-tracker/custom-prices`, `/character-stats/` e outros caminhos pessoais/administrativos. [Sitemap anunciado](https://garmoth.com/sitemap.xml): acesso bloqueado, sem conteúdo utilizado.

### Inventário de funcionalidades

**Navegação pública:** mercado central, pearl items, alertas, trocas; simulador de aprimoramento, Caphras, Cron, brackets de AP/DP e maestria; álbum de beleza, checklist, bosses, buffs de servidor e Golden Pig; tracker, spots, popularidade/tier list de classes, cronômetro e mudanças de classes; planners de gear, artefatos, consumíveis, cristais e addons. Estas funcionalidades aparecem no [catálogo de ferramentas](https://garmoth.com/tools); disponibilidade gratuita ou exigência de conta não foram verificadas individualmente.

O planner descreve armas, armaduras, acessórios, cristais, pedras de luz e artefatos; estatísticas, custo em prata, comparação, próximas melhorias, limites de AP por zona, hit rate e compartilhamento por link. O botão de screenshot observado é de apresentação/exportação do planner: **não comprova importar um print do jogo**. [Gear planner](https://garmoth.com/character/default).

### Dados e automação comprovados

O aplicativo declara OCR de texto já visível na tela, reconhecimento de loot, sessões de combate/coleta/caça, estimativa por hora, metas, overlay/OBS, reporte opcional de buffs e revisão antes de enviar sessões à conta. Declara português e SA entre idiomas/regiões; escala pequena e fontes finas pioram reconhecimento. O fornecedor afirma que não intercepta tráfego nem controla o jogo. Isso é documentação do fornecedor, **não autorização da Pearl Abyss para uma implementação própria**. [Aplicativo](https://garmoth.com/app).

Existe inconsistência temporal: a página do aplicativo ainda dizia Windows somente, enquanto o changelog da Home já anunciava Linux em versão recente. Não tratar FAQ antiga como matriz definitiva de suporte. [Home/changelog](https://garmoth.com/).

A origem específica de preços, catálogo, ícones, estatísticas internas e periodicidade de atualização **não foi comprovada**. Imagens públicas apontam para `assets.garmoth.com`, identificando entrega de assets, sem demonstrar extração ou licença de origem. A política confirma dados pessoais de sessões/planners, favoritos e alertas e login por Discord; não foi localizado contrato público de exportação de armazém. [Privacidade](https://garmoth.com/privacy).

## Workerman

### Tecnologia e fonte consultada

Fonte pública [shrddr/workermanjs](https://github.com/shrddr/workermanjs), commit `4d5a392ab43c56eb09da78a4d982260ab3be3fee`. Vue 3, Pinia, Vue Router, Vite, deck.gl e ECharts aparecem no [package.json](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/package.json). O projeto referencia um roteador WASM para conexões de nodes no [README](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/README.md).

Home [publicada](https://shrddr.github.io/workerman/) e [bundle efetivamente lido](https://shrddr.github.io/workerman/assets/index.242e3228.js). O bundle confirma URLs BDOLytics/Arsha usadas pela aplicação. A inspeção de fontes atuais acrescenta detalhes, sem afirmar que toda linha de `main` está nesse deploy.

### Rotas encontradas e leitura

Todas as rotas abaixo constam no [router](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/router/index.js). Caminhos foram solicitados por HTTP; exceto a Home, responderam 404. Componentes correspondentes foram lidos para as funcionalidades indicadas; `/routertests` e `/lodging` somente identificados no router.

| Caminho público                                               | Funcionalidade identificada no código                                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Home](https://shrddr.github.io/workerman/)                   | Mapa, trabalhadores, atribuição de tarefas, custos compartilhados e resumo do império           |
| [plantzones](https://shrddr.github.io/workerman/plantzones)   | Comparar nodes por produção diária, lucro/CP, cidade, espécie, velocidade e workload            |
| [resources](https://shrddr.github.io/workerman/resources)     | Informar disponibilidade de recursos por região, afetando duração/lucro; importar/exportar JSON |
| [settings](https://shrddr.github.io/workerman/settings)       | Região, imposto, preços próprios, trabalhador padrão, cultivo, oficinas e comércio              |
| [about](https://shrddr.github.io/workerman/about)             | Ajuda, proveniência, changelog e importação de trabalhadores                                    |
| [othertowns](https://shrddr.github.io/workerman/othertowns)   | Comparar cidade/conexão/distância/renda por CP                                                  |
| [workshops](https://shrddr.github.io/workerman/workshops)     | Casas, uso, nível, receitas fabricáveis e custo de cadeia                                       |
| [housecraft](https://shrddr.github.io/workerman/housecraft)   | Combinações de alojamento/armazém por custo em contribuição                                     |
| [droprates](https://shrddr.github.io/workerman/droprates)     | Modelos estatísticos de drops, sorte e gigante                                                  |
| [fishsize](https://shrddr.github.io/workerman/fishsize)       | Distribuições e observações de tamanho de peixe; experimental no router                         |
| [regionmap](https://shrddr.github.io/workerman/regionmap)     | Visualização de regiões e grupos no mapa                                                        |
| [routertests](https://shrddr.github.io/workerman/routertests) | Ferramenta de desenvolvimento; não contada como recurso para jogadores                          |
| [lodging](https://shrddr.github.io/workerman/lodging)         | Página marcada obsoleta no router                                                               |

Fontes dos componentes: [views](https://github.com/shrddr/workermanjs/tree/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views). A interface configura SA e outros mercados; idiomas oferecidos no seletor inspecionado: `en`, `ru`, `ko`, `jp`, `tw`, sem português. [SettingsView](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/SettingsView.vue).

### Como popula informações

| Tipo                                               | Evidência                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Catálogo, nodes, trabalhadores, distâncias e casas | JSON estático próprio; `game.js` identifica parte dos nodes como proveniente do cliente                 |
| Rendimento de nodes                                | Observações manuais e ajustes após patches; existem incertezas e aproximações documentadas              |
| Ícone de item                                      | Arquivo próprio `data/icons/item/{id}.webp`                                                             |
| Preços                                             | BDOLytics tRPC como principal; Arsha para ausentes, preço de NPC e cálculos locais para outras entradas |
| Perfil e snapshot de preços                        | `localStorage`, com arquivos JSON para importação/exportação                                            |

Fontes: [game.js](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/stores/game.js), [AboutView](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/AboutView.vue), [ItemIcon](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/components/lo/ItemIcon.vue), [market.js](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/stores/market.js).

O código monta `https://bdolytics.com/api/trpc/market.getMarket?input=...` com `{ language, region }`, lê `result.data`, `itemId` e `price`. O fallback utiliza `/v2/{region}/item` do Arsha, com IDs repetidos e `lang`, e lê `basePrice`. Há data do snapshot, preços manuais prioritários e aplicação de imposto. **Não foi chamado nenhum desses endpoints nesta pesquisa.** URL visível no código não garante contrato estável, permissão de reutilização ou SLA; para o Black Market, um adapter com cache próprio continua necessário. [market.js](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/stores/market.js).

### Importação realmente comprovada

Home lê JSON com `FileReader` e migra estruturas de trabalhadores; exporta `user.json` com trabalhadores, alojamento e configurações de cultivo/grind. Settings exporta `custom_prices.json`, e Resources usa `resources.json`. Isso constitui interoperabilidade de **planejamento**, não sincronização de todos os itens guardados. [HomeView](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/HomeView.vue), [SettingsView](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/SettingsView.vue), [ResourcesView](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/ResourcesView.vue).

About recomenda script Python `cache2json` para produzir JSON a partir de cache local. A própria ajuda informa que trabalhos podem ser antigos, correspondem ao comando de reiniciar e podem permanecer após remoção do trabalhador. O [script referenciado](https://pastebin.com/XpbwtqPA) não ficou acessível; não foi executado. **Não se comprovou formato de exportação de inventário/armazém**. `storagePersonal` é número de slots para cálculo de infraestrutura, não lista de itens/quantidades. [AboutView](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/AboutView.vue), [user.js](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/stores/user.js).

## Arsha: preços públicos separados do perfil privado

A [documentação Postman](https://www.postman.com/bdomarket/arsha-io-bdo-market-api/documentation/qpavrc8/bdo-market-api-v2?entity=request-4028519-b2061a10-1430-4e53-97f6-8eb7394e2bd1) descreve wrapper comunitário, sem documentação oficial da Pearl Abyss; V2 normaliza respostas em JSON, cache de 30 minutos e eventos de expiração por WebSocket. Lista SA e português `pt`. Eventos de expiração de cache **não significam que o jogo mudou o preço naquele instante**. A coleção fornecida pelo usuário não carregou diretamente; a página de documentação pública foi legível.

Fonte [guy0090/api.arsha.io](https://github.com/guy0090/api.arsha.io), commit `0d04e43a75bb90983781ad4374e8dd06926c4552`, confirma Redis, TTL configurável, upstream por região e catálogo por locale. Esses valores são configuração da fonte; disponibilidade da instância pública não foi aferida. [Configuração](https://github.com/guy0090/api.arsha.io/blob/0d04e43a75bb90983781ad4374e8dd06926c4552/config/application-default.yaml), [MarketRedisService](https://github.com/guy0090/api.arsha.io/blob/0d04e43a75bb90983781ad4374e8dd06926c4552/src/main/java/io/arsha/api/services/MarketRedisService.java).

### Contratos identificados no código, sem execução

Prefixo `/v2/{region}`; aliases verificados em [V2Controller](https://github.com/guy0090/api.arsha.io/blob/0d04e43a75bb90983781ad4374e8dd06926c4552/src/main/java/io/arsha/api/controllers/V2Controller.java):

| Rota                                   | Informação                                                     |
| -------------------------------------- | -------------------------------------------------------------- |
| `/item` / `GetWorldMarketSubList`      | Item por ID; níveis de aprimoramento, preços e disponibilidade |
| `/history` / `GetMarketPriceInfo`      | Histórico por item/sub-ID                                      |
| `/orders` / `GetBiddingInfoList`       | Ordens por item/sub-ID                                         |
| `/queue` / `GetWorldMarketWaitList`    | Fila pública de registro                                       |
| `/hot` / `GetWorldMarketHotList`       | Tendências públicas                                            |
| `/category` / `GetWorldMarketList`     | Categoria/subcategoria                                         |
| `/search` / `GetWorldMarketSearchList` | IDs de busca                                                   |
| `/market`                              | Mercado agregado por categorias                                |
| `/pearlItems`                          | Categoria de itens de pérola                                   |

Outro contrato, `/util/db`, expõe dados reduzidos do catálogo, com locale/IDs opcionais; não é inventário de jogador. [UtilityController](https://github.com/guy0090/api.arsha.io/blob/0d04e43a75bb90983781ad4374e8dd06926c4552/src/main/java/io/arsha/api/controllers/UtilityController.java).

A fonte comprova scraping do catálogo do BDO Codex (`query.php?a=items&l=...`) e armazenamento em Redis. Há atualização semanal programada; início verifica idade do catálogo. Isso explica nomes/metadados adicionados ao preço, **não uma API de receitas, ícones completos ou posse de jogador**. [CodexConfigurationService](https://github.com/guy0090/api.arsha.io/blob/0d04e43a75bb90983781ad4374e8dd06926c4552/src/main/java/io/arsha/api/config/services/CodexConfigurationService.java), [ScraperService](https://github.com/guy0090/api.arsha.io/blob/0d04e43a75bb90983781ad4374e8dd06926c4552/src/main/java/io/arsha/api/services/ScraperService.java), [ScraperScheduler](https://github.com/guy0090/api.arsha.io/blob/0d04e43a75bb90983781ad4374e8dd06926c4552/src/main/java/io/arsha/api/schedulers/ScraperScheduler.java).

## Decisão recomendada para importar armazéns no Black Market

Esta seção é **proposta de produto/engenharia**, não funcionalidade comprovada dos concorrentes nem recurso já implementado.

| Caminho         | Recomendação                                                                         | O que precisa ficar explícito                                                       |
| --------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Manual          | Primeira versão: busca no catálogo, ícone, quantidade, cidade/personagem             | Pode ficar desatualizado; marcar data da última confirmação                         |
| CSV/JSON        | Segunda entrada determinística, versão do formato, prévia e erros por linha          | Importa um arquivo fornecido pelo usuário; não lê a conta do jogo                   |
| Print           | OCR de quantidade/texto + candidatos por ícone e catálogo; confirmar antes de gravar | Reconhecimento pode falhar por escala, overlays e ícones parecidos                  |
| Captura passiva | Futuro auxiliar opcional: usuário abre a janela e concede captura                    | Só lê o que estiver visível; não controla o jogo nem confirma seu estado completo   |
| Cache local     | Investigar separadamente, após identificar dados e revisar formato                   | Workerman comprova trabalhadores; não há evidência suficiente para prometer armazém |
| API da conta    | Não depender dela no roadmap atual                                                   | Não foi localizada API pública de inventário/armazém nas fontes examinadas          |

### Fluxo de prints

1. Escolher SA, cidade/armazém ou personagem/inventário antes do envio.
2. Enviar imagens ou colar da área de transferência; permitir recorte e mostrar exigências simples de legibilidade.
3. Segmentar a grade, reconhecer quantidade e sugerir item por ícone; IDs do catálogo, idioma e aprimoramento precisam ser preservados.
4. Mostrar cada slot com imagem recortada, candidatos e confiança. Ambiguidade bloqueia confirmação daquele registro.
5. Resolver sobreposição entre prints por **slot e posição da rolagem**. Somar apenas por item pode duplicar uma página repetida.
6. O usuário escolhe adicionar itens ou substituir um snapshot. Substituição completa requer confirmar cobertura de todas as páginas; itens fora da imagem não são automaticamente removidos.
7. Salvar somente valores revisados, origem/data e cobertura. Calcular recomendações a partir dos materiais confirmados e preços com data explícita.

Imagens do perfil devem ser privadas e com retenção curta configurada; não entram em páginas públicas, anuncios ou indexação. Pode-se começar com OCR no navegador para reduzir custo de envio/processamento e evoluir por fila quando houver dados reais de qualidade. Isso exige avaliação com prints voluntários de diferentes escalas, sem prometer precisão antes dessa avaliação.

**Síntese:** o extractor central atualiza o catálogo estático; Arsha/adapter de mercado fornece snapshots públicos; o usuário confirma seu estado privado. OCR do Garmoth e JSON/cache de trabalhadores do Workerman são referências úteis para reduzir digitação, mas não demonstram sincronização automática e completa de armazéns.
