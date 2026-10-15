# Home e Roadmap em uma trilha dinâmica

## Objetivo

Conectar fases e pilares do produto em uma única trilha pública, ordenada e editável. A Home deve apresentar o foco ativo definido no Roadmap e deixar de competir com ele por meio de vários blocos de chamadas para ação repetidas.

O conteúdo da trilha e do foco vem da API e do banco. A ordem, o tipo e a quantidade de registros não são definidos por arrays no frontend nem por um número fixo de cards. O Roadmap não contém datas, prazos, percentuais de progresso ou promessas temporais.

## Contexto atual

- `DashboardPage` mantém `journeyOptions` e `tools` em arrays locais. A Home também tem botões fixos no hero, um fluxo fixo de mercado/importação/armazém, cards de jornada e um diretório recolhido; essas áreas repetem destinos e mensagens que já aparecem na navegação principal.
- `RoadmapPage` lê `GET /api/v1/roadmap`, mas apresenta etapas `flow` e pilares em seções separadas. A API ordena por tipo e depois por `sortOrder`.
- `roadmap_entries.sort_order` é único apenas dentro de cada tipo. O editor administrativo também agrupa os tipos e só move entradas dentro do grupo correspondente.
- `featured` já destaca visualmente um pilar e existe no contrato público. A validação permite mais de um registro destacado; a seed atual marca apenas “O que fazer?”, mas a Home deve renderizar qualquer quantidade marcada.
- A API pública é compartilhada e tem cache curto. A API de gestão continua protegida pela permissão administrativa do Roadmap.

## Decisões de produto

1. A página pública do Roadmap mostra uma só lista ordenada contendo fases e pilares alternados livremente.
2. Fase e pilar são tipos de conteúdo, não grupos de apresentação. A ordem global decide a posição de ambos.
3. Cada registro marcado `featured` é um foco ativo da Home e pode ser fase ou pilar. O Roadmap pode ter zero, um ou vários focos; a Home os apresenta na ordem global. Não há promoção automática de uma entrada que não esteja marcada.
4. Os focos da Home reutilizam os dados persistidos do Roadmap e seus links. Não há cópia local de títulos, descrições, sequência ou destinos para substituir a API.
5. A composição é desktop-first e mantém o tema Black Market: superfícies de carvão, molduras finas, bronze/ouro reservado a foco e seleção, controles retangulares e conteúdo denso, sem decoração que dispute atenção.
6. Não há quantidade máxima de etapas ou pilares definida pelo produto. A renderização se adapta à lista retornada; limites genéricos de corpo da API continuam sendo uma proteção de transporte, não um limite de cards.

## Dados, contrato e ordenação

### Modelo

- Manter os valores `flow | pillar` no banco e no contrato público por compatibilidade. Na interface de gestão e na trilha, apresentar `flow` como “Fase” e `pillar` como “Pilar”. Uma fase representa uma etapa conceitual da experiência do produto; não representa uma fase datada de entrega.
- Usar `sortOrder` como posição global da trilha, sem reiniciar a contagem por tipo. A API e o banco exigem posições únicas globalmente.
- Manter os campos atuais de conteúdo (`slug`, `title`, `summary`, `description`, `statusLabel`, `icon`, `featured` e `links`). `featured` continua sendo uma marcação independente por entrada: uma ou mais entradas podem ser focos da Home e também recebem destaque visual no Roadmap.
- Não adicionar campos de data, previsão, conclusão percentual ou prazo.

### Migração e API

- Na migração, preservar IDs, slugs, tipos, textos, links e demais campos, e substituir o índice único `(kind, sort_order)` por um índice único global em `sort_order`.
- Converter as posições antigas, que eram locais a cada tipo, em uma sequência inicial determinística: preservar a ordem relativa das fases antigas e, em seguida, a ordem relativa dos pilares antigos. Essa conversão só estabelece uma sequência válida para os dados existentes; depois dela, o administrador pode intercalar livremente os tipos.
- `RoadmapService.list()` ordena apenas por `sortOrder`. A resposta continua sendo `{ entries, updatedAt }`; não criar um endpoint nem uma cópia separada de `activeFocus`. Os focos são as entradas marcadas `featured` na mesma coleção pública.
- `parseRoadmapUpdate()` valida unicidade global de `sortOrder` e mantém `flow | pillar`. O campo `featured` continua sendo uma marcação independente por entrada, podendo selecionar múltiplos focos para a Home.
- Remover o teto de 32 registros da tela de gestão e da validação da coleção, assim como o teto artificial de posição `1000`. Continuam valendo os limites por campo, a validação de caminhos internos, a rejeição de HTML e o controle de concorrência por `expectedUpdatedAt`.
- Rejeitar destinos repetidos dentro dos links de uma mesma entrada para não produzir ações duplicadas no cartão. O mesmo caminho pode aparecer em entradas diferentes, pois a coleção representa áreas distintas.
- O formato e o endpoint da resposta pública permanecem `{ entries, updatedAt }`, sem personalização por usuário. A semântica de `sortOrder` muda de ordem por tipo para ordem global.

### Editor administrativo

- Substituir os dois grupos de edição por uma lista única, ordenada por `sortOrder`. Cada entrada mostra seu tipo e todos os campos editáveis atuais.
- Os controles de mover para cima/baixo atuam sobre a lista inteira e podem cruzar fases e pilares. Alterar o tipo de uma entrada preserva sua posição. Adicionar cria uma entrada ao final; remover renumera as posições restantes em ordem, sem lacunas.
- O controle de foco da Home é uma caixa de seleção por entrada, com nome acessível como “Mostrar como foco na Home”. Zero ou várias seleções são válidas.
- Manter confirmação de remoção, rascunho não salvo, tratamento de conflito e feedback existentes. Textos livres permanecem texto, nunca HTML.

## Roadmap público

- Uma única lista semântica `<ol>` contém todas as entradas na ordem da API. Cada registro vira um `<li>` e um `<article>` com título, tipo, resumo, descrição opcional, estado opcional e links filtrados.
- Apresentar uma trilha vertical contínua com cartões alternados dos dois lados do eixo central em desktop. O marcador ordinal é calculado pela posição atual na lista, não por ID, tipo ou contador fixo. A sequência permanece inteligível sem depender do número visual.
- Cada entrada selecionada como foco recebe um rótulo textual “Foco da Home” além do destaque visual. O tipo (“Fase” ou “Pilar”) e o estado nunca são comunicados só por cor.
- Não cortar títulos, descrições ou rótulos; permitir quebra de linha e altura determinada pelo conteúdo. A trilha não pressupõe quatro pilares, três fases ou outra quantidade fixa.
- Em telas estreitas, a mesma sequência usa um único eixo lateral e uma coluna. A versão móvel reorganiza os mesmos registros; não cria uma ordem alternativa.
- Não tornar o cartão inteiro um link quando ele contém links internos. Cada destino é uma ação separada, com texto claro e foco visível.

## Home e chamadas para ação

- Carregar o Roadmap pela `RoadmapApiService.getPublic()` existente. A Home seleciona `entries` com `featured: true` e os mantém na ordem global; nenhuma cópia de conteúdo ou ordem de Roadmap permanece em `journeyOptions`.
- Substituir o card estático “Um caminho simples” e a grade estática de jornadas por uma seção dinâmica “Focos atuais” com os registros destacados. Colocá-la como promoção principal ao lado do hero, sem limitar a quantidade por uma constante de interface.
- Remover do hero os botões fixos para Mercado, capturas e demonstração. Cada foco usa o primeiro link permitido do registro como ação principal; links permitidos restantes aparecem como ações secundárias. Exibir ícone, estado, título, resumo e descrição somente quando esses campos vierem da API.
- Manter a busca de item, pois seus links são contextuais ao item escolhido; manter “Continue de onde parou”, pois depende dos dados locais do jogador. Remover o diretório estático “Ver todas as ferramentas”: a navegação principal já lista as rotas do produto. A navegação contextual de item e a retomada de dados podem apontar para a mesma área do foco, pois representam contextos diferentes.
- Se não houver foco ativo, mostrar uma mensagem curta e um link genérico para `/roadmap`; não escolher automaticamente uma entrada nem inventar um card. Se um foco não tiver links, mostrar seu conteúdo e somente o acesso genérico ao Roadmap.
- Se houver um ou mais links, mas todos forem protegidos para visitantes, manter o conteúdo público do foco e oferecer “Entrar para acessar” apontando para `/account`. Incluir o primeiro destino como `returnUrl` apenas se `safeInternalReturnUrl()` aceitar o caminho; caso contrário, abrir a conta sem `returnUrl`. Não renderizar o caminho protegido como link direto.
- A Home mantém textos de interface localizados (rótulos, orientação e mensagens de estado); dados editoriais de Roadmap, inclusive seu título, resumo, descrição, estado, tipo, ordem e destinos, são sempre os da API.

## Permissões e filtragem para visitantes

- O endpoint público continua retornando conteúdo editorial global e não recebe estado de autenticação. Não incluir dados do workspace, personagem, estoque ou preferências privadas nos registros de Roadmap.
- Usar `isLoginRequiredPath()` para filtrar links de todas as entradas, independentemente de serem fases ou pilares. Aplicar a mesma regra às ações do foco na Home. Hoje, os caminhos protegidos incluem `/scans`, `/recommendations`, `/storage`, `/family` e `/shopping` e seus subcaminhos.
- Visitantes veem a trilha editorial pública, mas não recebem links diretos para recursos que exigem login. Usuários autenticados veem todos os links. A filtragem no cliente não substitui o `authGuard` nas rotas nem a verificação server-side da tela de gestão.
- Como `IdentityService` inicializa de forma assíncrona, a UI começa no estado seguro para visitante e recalcula os links quando a autenticação fica pronta; não deve haver um intervalo em que links protegidos apareçam sem sessão.

## Carregamento e falhas

- **Carregando:** apresentar um estado compacto e acessível (`role="status"`) para o módulo de foco da Home e para a trilha. Não preencher o espaço com conteúdo fictício ou CTAs repetidos.
- **Sucesso com conteúdo:** renderizar a coleção na ordem global. Na Home, renderizar todas as entradas destacadas, se houver.
- **Roadmap vazio:** mostrar “O Roadmap ainda não tem conteúdo” e manter o link de gestão apenas para administrador. A Home informa que ainda não há foco definido e aponta para o Roadmap; não recria o array antigo.
- **Conteúdo sem foco:** a trilha continua completa; só a Home mostra o estado sem foco. Não promover o primeiro cartão automaticamente.
- **Falha:** usar mensagem acionável (`role="alert"`) e botão “Tentar novamente”. A Home mantém busca, retomada e navegação secundária disponíveis. Falha da API não troca silenciosamente para conteúdo embutido.
- **Autorização da gestão:** preservar verificação no servidor, estado de acesso negado, sessão e fluxo de conflito existentes.

## Acessibilidade e identidade visual

- Projeto desktop-first: usar a largura disponível para a trilha em duas margens, com eixo central; manter tipografia, tokens, bordas e acentos do sistema Black Market. Os cards não devem virar blocos vazios com altura fixa.
- Em largura estreita, refluem para eixo único sem overflow horizontal. A quantidade de colunas e cartões decorre do layout e do conteúdo, sem regra baseada em um total predeterminado.
- Preservar hierarquia de título, lista ordenada, rótulo do tipo, estado textual, links com nomes compreensíveis, alvos de pelo menos 44 × 44 px e foco de teclado com contorno visível.
- Os números ornamentais podem ser ocultos de leitores de tela porque a semântica `<ol>` já comunica a ordem. Ícones decorativos usam `aria-hidden="true"` quando o texto ao lado dá o significado.
- A ordem de tab segue a sequência visual e de API. Mensagens assíncronas anunciam estado sem repetição. `prefers-reduced-motion: reduce` remove movimentos de hover; contraste e seleção não dependem somente da cor.

## Critérios de aceite

1. Uma resposta da API contendo fases e pilares intercalados aparece na tela pública em uma única trilha, exatamente na ordem global fornecida.
2. Títulos longos, descrições extensas, links múltiplos e uma quantidade variável de registros não causam corte, colisão ou overflow; não há layout condicionado a quatro pilares ou outro total fixo.
3. O editor ordena qualquer entrada antes/depois de qualquer outro tipo, preserva posição ao trocar o tipo, acrescenta no fim e normaliza a ordem ao remover.
4. A migração preserva conteúdo e ordem relativa existente, cria uma ordem global válida e altera a unicidade do banco para todo o Roadmap.
5. API e banco permitem zero ou vários focos e a gestão oferece forma clara de marcar/remover o destaque. Focos podem ser fases ou pilares.
6. Home mostra todos os registros destacados salvos no Roadmap em ordem global, usa seus dados/links da API e não contém listas estáticas de fluxo, jornada ou ferramentas. A navegação contextual de item e a retomada dos dados locais continuam disponíveis.
7. Visitantes não veem links diretos para rotas protegidas em nenhuma entrada nem na Home; links públicos continuam disponíveis. Com sessão, todos os links são exibidos.
8. Os estados de carregamento, vazio, sem foco, falha e nova tentativa são explícitos; a Home continua utilizável em caso de falha sem preencher Roadmap com dados fixos.
9. Nenhuma tela ou contrato novo apresenta data, prazo, percentual ou promessa temporal. Os estados textuais existentes continuam opcionais e editáveis.
10. Em desktop, a trilha usa eixo central e cartões alternados; em viewport estreita, conserva a mesma ordem em uma coluna. Teclado, leitor de tela, foco visível e movimento reduzido continuam funcionais.

## Riscos e pontos para confirmar antes da implementação

- A seed atual marca uma entrada como `featured`; após a alteração, o administrador poderá marcar vários focos sem migração ou limpeza especial. Não introduzir unicidade no banco para `featured`.
- A resposta pública conserva o valor `flow` por compatibilidade, mas `sortOrder` passa a significar posição global. A web e a API devem ser liberadas juntas para que todas as telas adotem a trilha unificada.
- A API pública depende de conteúdo editorial sem dados privados. A permissão das rotas ainda deve ser validada pelo guard/backend; ocultar links na interface não é controle de acesso.
- A quantidade de registros deixa de ter teto funcional. Como o conteúdo é textual e a gravação continua sendo uma substituição atômica pequena, não se propõe virtualização nem paginação; eventual limite genérico de corpo da API deve ser tratado separadamente, sem voltar a impor um número de cards.
