# Biblioteca de tutoriais guiados por tela

**Data:** 15/10/2026
**Estado:** desenho aprovado para especificação; aguarda revisão do documento antes do plano de implementação.
**Escopo deste documento:** comportamento, arquitetura, conteúdo, segurança, acessibilidade e critérios de aceite. Não é plano de tarefas.

## Resumo

Adicionar tours curtos, um por tela, iniciados somente por ação explícita da pessoa usuária. O frontend Angular usa Driver.js para destacar partes da interface. Título, texto, ordem, idioma, ativação e associação de cada passo a uma âncora permitida são conteúdo administrativo persistido no PostgreSQL e servido pela API NestJS. Nenhum texto de negócio do tutorial, lista de passos ou seletor é compilado no frontend.

O aplicativo continua utilizável sem tutorial: falha ou ausência de conteúdo não bloqueia a tela. As páginas e âncoras possíveis são registradas no código; a base de dados pode escolher entre essas opções, mas nunca definir rota, seletor CSS, HTML, JavaScript ou ação executável.

## Contexto confirmado no repositório

- O projeto usa Angular 22 com SSR, NestJS, Drizzle ORM e PostgreSQL. `driver.js` não está instalado e a busca não encontrou um tour interativo já implementado.
- `apps/web/src/app/app.routes.ts` contém rotas públicas e rotas com `authGuard`. Armazém, Família, Lista de materiais, Scans e Recomendações são exemplos de páginas autenticadas.
- O Roadmap é o padrão mais próximo de conteúdo administrativo: `roadmap_entries`, migrações Drizzle, endpoint público com cache, endpoints de gestão `private, no-store`, autenticação Firebase verificada no servidor e edição com controle de concorrência. O administrador é conferido pela allowlist `ROADMAP_ADMIN_FIREBASE_UIDS`; o sinalizador do cliente é apenas conveniência visual.
- A interface usa i18n do Angular, com fonte `pt-BR`; não há publicação de traduções artificiais. A identidade visual BDO usa superfícies carvão, bordas finas, bronze/dourado seletivo e controles retangulares. Os requisitos locais pedem teclado, foco visível, contraste, alvos de toque de 44 px e suporte a `prefers-reduced-motion`.
- Driver.js é uma biblioteca JavaScript sem dependência de Angular. A documentação oficial atual oferece instância com passos e métodos de navegação/encerramento, mas permite HTML em `title` e `description`; os valores do banco, portanto, não podem ser passados diretamente a esses campos.

## Objetivos

1. Explicar a finalidade e os controles relevantes de cada tela em poucos passos.
2. Permitir ao administrador alterar o texto, idioma, ordem, âncora e publicação sem editar código ou fazer deploy.
3. Preservar uma fronteira estrita entre conteúdo editorial salvo no banco e comportamento executável definido no código.
4. Permitir início, encerramento e replay sob demanda; nunca interromper ou cobrir a pessoa usuária automaticamente na entrada da página.
5. Funcionar em telas desktop e estreitas, com SSR seguro, teclado e tecnologia assistiva.

## Fora de escopo

- Tours que atravessam rotas, missões interativas, execução automática de ações, preenchimento de formulários ou gravação de decisões no workspace.
- Editor de HTML/Markdown, links externos, imagens, snippets, condições de negócio ou scripts dentro do conteúdo.
- Sequenciamento por conta, conclusão persistida no perfil, notificações de tutorial, recomendações automáticas e analytics por passo.
- Conteúdo de negócio em arrays, arquivos JSON, templates ou fallback hardcoded no frontend.

## Desenho

### 0. Escopo da primeira publicação

O registro inicial suporta telas do fluxo principal: Mercado, Receitas/Crafting, Scan, Armazém e “O que fazer?”. Mercado e Receitas são públicos; Scan, Armazém e Recomendações preservam o `authGuard` atual. A lista de telas disponíveis no editor vem do registro compilado, mas o editor não fixa nem limita a quantidade de guias ativos: cada guia só aparece se estiver habilitado e publicado no banco. Outras telas podem ser incluídas depois por uma mudança pequena de código que registre seus componentes e âncoras; texto, passos, ordem e publicação continuam sendo conteúdo do banco.

Os guias iniciais são inseridos no banco por um seed de conteúdo versionado e idempotente, com conflito que preserva alterações administrativas já feitas. Depois da criação, o editor passa a ser a fonte operacional: uma execução futura do seed não restaura nem substitui texto, ordem, âncoras ou ativação editados. Nenhuma cópia de tutorial fica como fallback no bundle Angular.

### 1. Registro de telas e âncoras pertencente ao código

Criar um registro compartilhado e versionado pelo código para telas suportadas. Cada entrada define uma `screenKey`, sua classificação pública/autenticada, rota ou componente responsável e o conjunto de âncoras válidas. O componente chama a biblioteca com a chave da tela registrada; a chave nunca é inferida de um caminho enviado pelo banco.

Os templates recebem atributos literais `data-tour="<chave-estável>"` nos pontos importantes. As chaves são namespaces estáveis e documentados, como `market.search` ou `storage.capacity`. O registro compartilhado serve ao editor e à validação da API; o DOM continua sendo a fonte para descobrir se a âncora está presente e visível. A mesma chave não pode identificar mais de um elemento visível na tela.

O banco guarda somente `anchorKey`, escolhido da lista permitida para aquela tela. O cliente resolve a chave para um elemento DOM usando o registro local e passa esse elemento ao Driver.js. Não aceita seletor, caminho, atributo ou fragmento de CSS vindo da API. Uma chave removida ou incompatível nunca é convertida em um seletor genérico.

As âncoras devem marcar grupos e controles com nome compreensível, sem mudar sua função. Devem permanecer estáveis em mudanças de estilo e layout. Quando uma tela tem variantes desktop/mobile, cada chave precisa resolver para um único elemento visível na viewport atual; elementos ocultos não contam como alvo.

### 2. Conteúdo e persistência

Adicionar migração Drizzle com duas tabelas conceituais:

| Tabela                 | Campos e regras                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tutorial_guides`      | `id` UUID; `screen_key`; `locale`; `enabled`; `updated_at`; unicidade `(screen_key, locale)`. `screen_key` precisa constar no registro compilado.                             |
| `tutorial_guide_steps` | `id` UUID; `guide_id` com FK e cascade; `sort_order`; `anchor_key` nula ou chave permitida da tela; `title`; `body`. Unicidade `(guide_id, sort_order)` e ordem não negativa. |

O endpoint e a validação limitam o guia a 1–8 passos, título de até 100 caracteres e corpo de até 360 caracteres por passo. Esses limites mantêm o guia curto e permitem validar a composição do popover. A ordem é explícita, densa e normalizada de zero a `n - 1` ao salvar. Uma âncora nula significa intencionalmente um passo geral centralizado, não uma âncora esquecida.

Os guias são separados por `locale`, e o cliente envia o idioma da interface (`uiLocale()`). Inicialmente, o conteúdo editorial publicado é `pt-BR`. Não há fallback silencioso entre idiomas: se não houver guia ativo para a localidade atual, a tela não oferece um tutorial em outro idioma. A adição de outra localidade exige conteúdo revisado no banco.

Não inserir cópia de exemplo ou conteúdo de negócio na migração ou no bundle. Uma tela sem guia ativo não exibe launcher. O runtime da API recebe somente os privilégios necessários às novas tabelas; o navegador não acessa PostgreSQL diretamente. Como o conteúdo é público e compartilhado, não há RLS por usuário; a API administra as leituras públicas e protege toda escrita.

### 3. API e cache

Endpoints propostos sob `/api/v1/tutorials`:

| Método e caminho                      | Acesso                    | Comportamento                                                                                                                                                                                                                            |
| ------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /:screenKey?locale=pt-BR`        | Público                   | Retorna guia publicado e `updatedAt`; se a tela existir no registro mas não tiver guia ativo, retorna `guide: null`. Chave de tela desconhecida retorna 404. Resposta cacheável por 60 s com `stale-while-revalidate=300`.               |
| `GET /manage`                         | Administrador autenticado | Retorna a lista das telas/idiomas e o conteúdo existente, incluindo guias desativados. `Cache-Control: private, no-store`.                                                                                                               |
| `PUT /manage/:screenKey?locale=pt-BR` | Administrador autenticado | Substitui atomicamente ativação e passos da tela/idioma. `expectedUpdatedAt: null` cria somente se ainda não existir; um timestamp exige igualdade com a versão atual. Conflito retorna 409 preservando o rascunho do editor. Sem cache. |

A API valida formato e tamanho do texto, `locale` suportado, `screenKey`, associação entre `screenKey` e `anchorKey`, quantidade e ordem dos passos, e rejeita marcação HTML. `anchorKey` inválida não é salva nem apresentada ao Driver.js. Uma requisição não pode inserir, renomear ou reordenar telas fora do registro de código.

O salvamento substitui as linhas de passos numa transação e atualiza `updated_at` na tabela do guia. A verificação otimista compara `expectedUpdatedAt` para impedir que uma edição concorrente sobrescreva silenciosamente outra. O retorno do PUT contém a versão salva. A resposta do editor não usa cache público.

### 4. Integração Angular e Driver.js

- Instalar `driver.js` como dependência direta de `apps/web` e fixar a versão validada no lockfile. Centralizar a integração num `TutorialService` singleton; páginas apenas identificam sua `screenKey` e expõem o launcher quando a API retorna guia ativo.
- Carregar dados a partir da API pública. A falha do endpoint não bloqueia navegação ou dados da tela; mostrar estado discreto de indisponibilidade com ação de tentar novamente no lugar reservado à ajuda. Uma resposta válida `guide: null` não mostra launcher.
- Importar e criar a instância Driver.js somente no navegador, depois do render da tela e a partir do clique da pessoa. Não criar instância em SSR, no construtor do serviço ou durante a hidratação.
- Um único tour pode estar ativo. Ao trocar de rota, destruir a instância e descartar o progresso em memória; não tentar continuar em outra página.
- Construir os passos em memória a partir do guia validado e dos elementos resolvidos. O Driver.js recebe o elemento DOM resolvido, nunca a chave do banco como seletor.
- Os textos `title` e `body` são dados não confiáveis mesmo quando foram escritos por um administrador. Não passá-los diretamente para as opções de Driver.js que aceitam HTML. Usar a extensão de renderização do popover para atribuir `textContent` (ou solução equivalente comprovadamente textual) e rejeitar HTML/Markdown na API. A interface deve tratar esses campos como texto simples em toda a cadeia.
- Importar o CSS base da biblioteca e personalizar o popover por uma classe própria com tokens do produto: fundo carvão, borda bronze/dourada, cantos discretos, texto de alto contraste e links/botões retangulares. Não usar imagens de menus do jogo como fundo, emojis, neon nem pílulas arredondadas.
- A configuração do comportamento (fechar, rolagem, interação com alvo, rótulos de botões, animação e tratamento de âncoras ausentes) é código fixo/localizado; o administrador não altera essas opções.

### 5. Experiência de uso

1. Em cada tela registrada que tenha guia publicado, mostrar uma ação discreta e alcançável por teclado, por exemplo **Tutorial desta tela**, na área de ajuda/título da página. A mesma posição e rótulo devem ser mantidos entre telas compatíveis.
2. Só um clique ou acionamento equivalente inicia o tour. Abrir uma URL, concluir login, navegar ou visitar a tela nunca inicia tutorial automaticamente.
3. Cada abertura começa no primeiro passo. O popover mostra progresso (`n de m`) e oferece ações localizadas para voltar, avançar, sair/pular e concluir. Na conclusão, fechar o tour; o launcher continua disponível para replay.
4. Sair, clicar no botão de fechar ou pressionar Escape encerra como **dispensado**, não como concluído. Clique no overlay não avança nem fecha; evita saídas acidentais. Próximo/anterior alteram apenas o passo do tour, nunca clicam ou alteram o controle destacado.
5. O tour não persiste estado de conclusão nem muda conteúdo do app. A pessoa usuária pode reabri-lo quantas vezes desejar. O launcher continua presente para um guia ativo após completar ou dispensar.

### 6. Editor administrativo

Criar a página `/tutorials/manage` com o tema BDO e controles acessíveis. Incluir uma entrada **Editar tutoriais** na área administrativa existente do Roadmap, além de suportar acesso direto pela rota.

O editor lista somente telas e idiomas do registro do código; apresenta para cada tela a ativação, passos em ordem, campos de título/corpo e um seletor de âncora com rótulos amigáveis para as âncoras permitidas. A opção **Etapa geral, sem destaque** representa `anchorKey: null`. Não expõe campos para rota ou seletor livre. O administrador pode criar, remover, reordenar, ativar/desativar e salvar o guia por tela; recebe validação junto ao campo, estado salvo, estado sujo e conflito 409 sem perder o rascunho. Textos são simples; não há editor WYSIWYG.

Somente a allowlist de administradores já verificada no servidor (atualmente `ROADMAP_ADMIN_FIREBASE_UIDS`) autoriza leitura de gestão ou escrita. A identidade do Firebase é validada pela API em toda chamada de gestão. O sinalizador `canManageRoadmap` ou qualquer guard Angular serve para esconder a página/link e melhorar o fluxo, mas não substitui o bloqueio da API. Se a tela for exposta a uma função administrativa distinta no futuro, a autorização deverá ser generalizada no servidor sem confiar em claims fornecidas pelo cliente.

### 7. Acesso público e autenticado

- Guias publicados contêm apenas explicação genérica e não personalizada. São lidos pelo endpoint público sem token, tanto em telas públicas quanto depois que uma rota autenticada for aberta.
- A rota e o `authGuard` existentes continuam decidindo se a pessoa pode abrir telas autenticadas. O tutorial não contorna essa barreira nem carrega dados de personagem, inventário, plano, preferências ou estado do workspace.
- Dados editoriais podem ser entregues publicamente por serem conteúdo do produto. Não incluir no guia valores privados ou pessoais; a UI administra apenas o texto compartilhado.
- Gestão é protegida por autenticação Firebase verificada e allowlist no backend, inclusive quando alguém chamar a API diretamente. Erro de autenticação ou admin bloqueia read/write de gestão.

### 8. Acessibilidade e movimento

- O launcher, voltar, avançar, sair e concluir são botões nativos com nomes traduzidos, foco visível, alvo de pelo menos 44 × 44 px e ordem de Tab previsível.
- Ao iniciar, mover o foco para o popover; progresso, título e texto do passo atual devem ser anunciados sem repetição excessiva. Ao sair, concluir ou destruir por navegação, devolver o foco ao launcher se ele ainda existir.
- Teclado: Tab/Shift+Tab alcançam os controles de tour; Enter/Espaço os acionam; Escape sai. Preservar setas e digitação em inputs/selects do app; não interceptar atalhos globais de navegação da tela. Testar com leitor de tela e zoom alto. O passo atual não pode ficar invisível ou atrás de outro elemento.
- Rolagem da página permanece disponível quando necessária para visualizar âncoras. O popover precisa ajustar posição/tamanho à viewport, sem overflow horizontal em telas estreitas. Alvos de breakpoint ou controles fixos devem ser resolvidos pelo registro de âncoras e testados em desktop e mobile.
- Em `prefers-reduced-motion: reduce`, desativar animações/transições e rolagem suave do Driver.js e do tema. Não usar pulsação ou beacon como única indicação do alvo.
- O popover segue o design carvão/bronze do Black Market sem sacrificar os contrastes mínimos estabelecidos pela skill de UI. Conteúdo longo quebra linha e aumenta o popover; não cortar com reticências nem truncar informação.

### 9. Âncoras ausentes e falhas

- `anchorKey: null` é um passo centralizado intencional.
- Antes de abrir, resolver cada âncora contra o registro da tela e confirmar que há exatamente um elemento visível. Âncora não encontrada, invisível ou duplicada faz o passo ser omitido; nunca redirecionar para `body`, uma rota ou seletor genérico.
- Durante o tour, se uma etapa que ainda não foi exibida perder seu alvo por mudança de layout/estado, aguardar apenas o tempo curto definido no código e pular o passo ausente. Conteúdo tutorial não abre modais nem causa carregamentos para produzir âncoras.
- Se todos os passos de destaque forem inválidos/ausentes e não houver passo geral, não criar um tour vazio; mostrar mensagem acessível de que o guia precisa de atualização. O restante da página segue funcional.
- Na gestão, âncora removida do registro aparece como inválida; bloquear publicação/salvamento até que administrador escolha chave válida ou etapa geral. Erros HTTP/DB no GET não impedem a página, e erro no PUT mantém os valores do editor em memória.

### 10. Analytics e privacidade

Permitir somente três eventos agregados no AnalyticsService existente: início, conclusão e dispensa. Enviá-los apenas se o usuário tiver consentido com analytics de acordo com `PrivacyService`; não criar outro identificador, cookie, tabela ou mecanismo de consentimento. Se consentimento faltar, for revogado, ou analytics estiver desativado, não enviar evento.

Propriedades permitidas: `screenKey` do registro de código e versão `updatedAt`/revisão do guia. Não enviar texto do guia, passo/âncora individual, URL completa, campos digitados, IDs de Firebase/conta, nome, e-mail, personagem, inventário, região privada ou payload do workspace. Não coletar eventos a cada passo, não persistir progresso local e não vincular tutorial à sessão autenticada. Se os eventos forem adicionados, atualizar os tipos allowlisted e a descrição de analytics na política de privacidade para refletir essas categorias de uso.

## Critérios de aceite

1. Um guia de uma tela pode ser criado, reordenado, desativado, revisado e republicado no editor; depois do cache público curto, o público vê o novo conteúdo sem rebuild/deploy.
2. Guias e passos vêm da API/banco. Quando não há conteúdo ativo, nenhuma cópia de negócio local é exibida e a tela continua operante.
3. Nenhum guia começa sem ação explícita. Iniciar sempre abre no passo 1; dispensar e concluir são estados distintos; launcher de replay permanece disponível.
4. O runtime só destaca `data-tour` definido no código e permitido para aquela tela. API/editor rejeitam seletor livre, chaves incompatíveis, markup e texto fora dos limites. A API pública não expõe estado de usuário.
5. Strings maliciosas gravadas no banco aparecem como texto inerte. Nenhum título/corpo é inserido com `innerHTML`; não há avaliação de script, marcação, link, callback ou comando fornecido pelo banco.
6. Escritas administrativas sem sessão válida ou fora da allowlist são negadas no backend. A rota de gestão não pode ser usada como única barreira de autorização.
7. Guia público funciona em SSR/hidratação sem referência a `window`/DOM ou instância Driver.js no servidor. Nenhuma falha de tutorial bloqueia render, resolver, cálculo ou dados do recurso principal.
8. Passos com alvo ausente/oculto/duplicado são omitidos ou o guia é bloqueado com orientação acessível; nunca destacam um elemento incorreto. Um guia sem alvos válidos não fica preso nem vazio.
9. Uma edição concorrente recebe conflito sem descartar rascunho. Salvar passos e metadados é atômico.
10. Todo fluxo de início, anterior, próximo, dispensa, conclusão e replay pode ser completado com teclado; foco é visível e restaurado, controles são anunciados, alvos têm 44 × 44 px e o comportamento respeita movimento reduzido.
11. Visual em desktop mantém identidade BDO, e em viewport estreita o popover/launcher não cria overflow horizontal, continua legível e operável por toque.
12. Eventos de início/conclusão/dispensa só saem com o consentimento já existente e carregam exclusivamente propriedades allowlisted; revogar consentimento interrompe eventos posteriores.

## Riscos e mitigação

| Risco                                                                | Mitigação prevista                                                                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Refatoração de template quebra âncora salva                          | Chaves estáveis, registro com revisão de mudanças, validação de runtime e aviso no editor; não permitir fallback para seletor amplo.                 |
| Texto do banco explora HTML aceito pelo Driver.js                    | Nunca passar texto dinâmico aos campos HTML; preencher DOM por `textContent` e validar texto simples na API.                                         |
| Import do Driver.js toca `document` durante SSR                      | Importação e instância apenas sob guarda de browser e acionamento no cliente; CSS global não deve executar lógica.                                   |
| Conteúdo cadastrado em idioma diferente do visitante                 | Chaves por locale e ausência sem fallback silencioso; publicar somente traduções revisadas.                                                          |
| Popover interfere com uso de teclado ou tela estreita                | Controles nativos, gestão de foco, ausência de interceptação de setas/digitação, teste desktop/mobile/leitor de tela e suporte a movimento reduzido. |
| Administrador sobrescreve edição concorrente                         | `expectedUpdatedAt`, substituição transacional e HTTP 409 com rascunho mantido.                                                                      |
| Alvo de tour vira âncora errada por duplicação ou reuso em variantes | Registro vinculado à tela e resolução única/visível antes de montar passos; omitir ou bloquear em caso ambíguo.                                      |
| Mudança administrativa aparece com atraso por cache                  | Resposta pública com TTL de 60 s; editor sem cache; cliente que acabou de salvar invalida sua própria leitura.                                       |

## Decisões fechadas para a especificação

- As telas da primeira publicação seguem o fluxo central atual: Mercado, Receitas/Crafting, Scan, Armazém e “O que fazer?”. A tela de Família pode receber guia depois, sem alterar o modelo.
- A gestão reutiliza a allowlist existente `ROADMAP_ADMIN_FIREBASE_UIDS` e a validação server-side já usada pelo Roadmap; nenhum papel administrativo novo é criado nesta entrega.
- O limite é de oito passos por tela, título de até 100 caracteres e corpo de até 360 caracteres por passo, conforme proposto. Se o conteúdo não couber, dividir a orientação em outro passo em vez de relaxar o limite.

## Referências

- `docs/ACTIVE_CONTEXT.md`, seção 116: a auditoria mais recente identificou a ausência de tour e recomendou validar biblioteca antes de implementar.
- `apps/api/src/roadmap/roadmap.controller.ts`, `roadmap.service.ts`, `apps/web/src/app/features/roadmap/roadmap-manage-page.ts`: padrão existente de leitura pública, autorização administrativa e edição dinâmica com controle de concorrência.
- `packages/database/src/schema.ts` e `packages/database/drizzle/`: esquema Drizzle e migrações PostgreSQL.
- `.agents/skills/bdo-ui-design/SKILL.md` e `references/accessibility.md`: tokens visuais e requisitos de acessibilidade do produto.
- [Driver.js — configuração](https://driverjs.com/docs/configuration), [botões](https://driverjs.com/docs/buttons), [theming](https://driverjs.com/docs/theming) e [API](https://driverjs.com/docs/api): lifecycle, opções do tour, renderização do popover e controles disponíveis. A documentação confirma que título e descrição aceitam HTML; a especificação exige um sink textual para conteúdo editorial.
