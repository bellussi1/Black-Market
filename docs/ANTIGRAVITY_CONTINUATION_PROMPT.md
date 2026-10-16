# Prompt de continuidade — Black Market BDO (Antigravity)

Você está no repositório do **Black Market**, um planejador para Black Desert Online. Codex e Antigravity alternam o desenvolvimento; use os documentos versionados como fonte de continuidade. O público inicial é a comunidade de BDO da região SA, em português brasileiro. O produto deve ajudar jogadores a planejar Life Skills, usar o armazém, escolher o que produzir/comprar e entender custos, rendimento e lucro com premissas verificáveis.

## Escopo mais recente já aprovado pelo usuário (16/10/2026)

Continue as solicitações abaixo depois de conferir o código e o Git. O usuário aprovou o escopo completo de regressões financeiras de maestria, alternativas de coleta do otimizador e documentação das limitações observadas no BDO Workshop. Também pediu um tour contextual da oficina semelhante ao fluxo público do Workshop. Não peça nova aprovação para essas alterações locais, testes e documentação.

1. **Maestria e resultado financeiro da receita**: reproduza o relato de que alterar maestria de Culinária, Alquimia ou Processamento não atualiza faturamento e lucro/prejuízo. Adicione regressões pareadas com as entradas modernas por profissão e valide rendimento, faturamento bruto/líquido, custos, lucro e lucro/hora. Inclua tempo quando a profissão o alterar. Teste receitas variáveis e intermediários efetivamente produzidos; um intermediário escolhido para compra não deve mudar como se fosse produzido. Verifique se um rendimento manual fixo está sobrepondo a maestria e se existe um caminho claro para voltar ao rendimento automático. Só altere a regra do jogo quando uma fonte verificável sustentar a mudança.

2. **“Melhor lucro possível” / otimizador**: reproduza o caso em que uma matéria-prima tem tanto receita produtora quanto estimativa de coleta confirmada. O diagnóstico mais recente apontou que o caminho pode preferir `produce` antes de avaliar `gather` e que a requisição ao worker pode descartar alternativas de coleta que não sejam a escolha atual. Confirme isso no código presente; depois garanta que o otimizador avalie todas as alternativas válidas para os itens alcançáveis da árvore, sem expandir a busca para itens irrelevantes. Teste o caso em que coletar vence produzir/comprar e preserve a escolha manual. Documente objetivo, premissas, limite de estados, resultado parcial e qualquer razão que impeça chamar a solução de ótimo global. Há limites diferentes registrados nos documentos; encontre o limite real no código e reconcilie a documentação.

3. **Comparação pública com BDO Workshop**: a referência é [o plano público 9601 do Balenos Meal](https://bdoworkshop.com/crafting-workshop/plan/9601). Em uma observação de 16/10/2026, com 1.000 crafts, Culinária 0 mostrou aproximadamente 2.500 produtos, 92,4 M de vendas líquidas de imposto, 131,1 M de custo, −38,7 M de lucro, 18m20s e −126,8 M/h; Culinária 3.000 mostrou aproximadamente 3.647 produtos, 177,1 M líquidos, o mesmo custo de 131,1 M, +46,0 M, 1m50s e 1,50 B/h. Processamento 0 não alterou essa receita, que não tem etapa de Processamento. Os valores são uma observação pública sujeita a preço, patch e arredondamento, não um benchmark fixo. A interface “Best profit/hour” também apresentou política para itens esgotados, como pré-encomendar ou produzir, com quantidade listada, vendas diárias estimadas, tempo de reposição e impacto de cada decisão. O próprio Workshop sinaliza que o recurso está em desenvolvimento. Registre o que a UI demonstra e separe isso de hipóteses sobre a fórmula interna; não trate o comportamento do concorrente como verdade do jogo.

   Faça a comparação com premissas pareadas sempre que houver dados equivalentes: região, receita, quantidade, maestria, nível, ingredientes, preço, imposto, buffs e instante da cotação. Use páginas públicas e interação normal. Não contorne login, CAPTCHA, rate limit ou controles de acesso; não acesse endpoints privados nem copie código, dados ou assets sem licença. Não use preço, liquidez ou fórmula do concorrente como entrada do Black Market.

4. **Tour da oficina de receitas**: a biblioteca central de tutoriais e o Driver.js já foram implementados; não os recrie. Inspecione o guia atual de Receitas e o fluxo `/recipes/items/:itemId`. Adicione um tour contextual para a oficina, explicando quantidade, maestrias e rendimento, indicadores financeiros, estratégia de compra/produção/coleta/otimização e escolhas dos materiais. Siga os controles reais e mostre os limites em linguagem clara. Use chaves de tela e âncoras registradas no código, alvos únicos e visíveis, texto simples, SSR seguro, carregamento lazy, início manual, teclado, foco e `prefers-reduced-motion`. Não abra diálogos automaticamente durante o tour.

   O seed de tutoriais preserva guias existentes e não atualiza conteúdo já semeado. Portanto, ampliar apenas o seed da chave `recipes` pode não atualizar bancos existentes. Verifique a chave de tela, o comportamento do editor e a estratégia de seed antes de implementar. Prefira uma chave contextual nova para a oficina se isso permitir adicionar o tour sem sobrescrever edições existentes. Não aplique migração nem rode seed até confirmar que a URL é de um PostgreSQL local descartável.

As melhorias recentes do Market Board — categorias expansíveis, limpeza de filtros, paginação no topo e skeletons — já estão implementadas nos commits `8422f95`, `e3c844a` e `a1f5f12`. Confira o estado real e não refaça essa entrega. A revisão visual estreita e por teclado ainda aparece como pendência no handoff.

## Regras de início e fontes da verdade

Antes de alterar arquivos:

1. Leia AGENTS.md, docs/ANTIGRAVITY_HANDOFF.md e docs/ACTIVE_CONTEXT.md.
2. Confira git status, branch e os últimos commits; preserve mudanças locais. Não use reset, descarte em lote ou limpeza destrutiva.
3. Reconcilie docs/implementation-queue.md, docs/implementation-status.md, docs/roadmap.md e docs/feature-coverage.md. Para cada tarefa retomada, leia sua especificação, plano e documentação técnica relacionada.
4. Leia skills do repositório em .agents/skills/ que se aplicam à tarefa, em especial o padrão visual BDO e Angular/Spartan.
5. Faça uma matriz curta com status (concluído, parcial, pendente ou bloqueado), evidência em código/docs, dependências e próximo passo. A matriz é uma verificação do estado, não uma razão para parar: avance nas tarefas já autorizadas e sem bloqueios externos.
6. Use agentes em paralelo para frentes independentes quando disponíveis, com escopos de arquivo claros. Não deixe agentes editarem os mesmos arquivos sem coordenação.
7. Antes de cada feature de produto, analise a área correspondente nos quatro sites: BDO Workshop, BDO Codex, BDOLytics e Garmoth. Para cada site, anote recurso comparável, ausência de equivalente ou limite de acesso. Siga o protocolo e a ficha comparativa em `docs/research/competitor-review-playbook.md`; não pare a implementação quando uma página estiver indisponível.

Não trate a lista deste prompt como um backlog totalmente pendente. Confira o estado atual e não reimplemente o que já está concluído.

## Estado recente — confira no Git

Em 16/10/2026, a branch main tinha commits locais não enviados. Entregas recentes:

- 0185b87: indexação dos lookups de nomes/ícones no Coach de Atividades.
- 205dee4: Home e Roadmap com trilha dinâmica em ordem global.
- 8cf0283: Tutoriais Guiados por tela, editor administrativo e Driver.js carregado sob demanda.
- 1308342: spec do gráfico do Mercado alinhada ao canvas acessível do Chart.js.
- 53ed17b: ajuste de Prettier e exclusão de scratch files.
- 11f681d e 8768f56: fundação compartilhada e schema/migrações globais do Roadmap e Tutoriais.
- 8422f95, e3c844a e a1f5f12: estabilização visual, handoff e regressão de estado da árvore de categorias do Market Board.

Confira SHAs, histórico e worktree; esta lista pode ficar desatualizada. Não faça push nem deploy sem pedido.

### Entregas e limites já registrados

- **Home/Roadmap**: fases e pilares compartilham posição global; editor usa lista única; Home mostra focos editoriais da API, preserva busca/retomada e filtra links protegidos conforme identidade. Migrações estão versionadas, mas ainda não aplicadas a um banco nesta passagem.
- **Tutoriais Guiados**: cinco telas/âncoras permitidas; API pública e administrativa; editor protegido; texto simples e validado; seed idempotente; tours só começam por ação explícita e o Driver.js é lazy/browser-only; analytics agregados respeitam consentimento. O seed não foi executado e nenhuma migração foi aplicada nesta passagem. Para teste com dados, confirme primeiro uma URL de PostgreSQL local descartável.
- **Coach de Atividades**: cobre ranking de produção/crafting. Uma indexação Map melhorou lookup de nomes/ícones; não alterou o algoritmo de lucro. Medição sintética: 4.222 receitas, 12.666 cenários pendentes, ~11,06 s de engine; para 2.480 rótulos, linear ~45,71 ms e Map ~0,99 ms. Isso não explica sozinho os ~150 s históricos. A divergência de Refeição de Valência (~292,3M/h local vs ~163,8M/h no snapshot BDOLytics) segue sem premissas pareadas; não ajuste fórmula com base nela.
- **Mercado**: histórico migrou para Chart.js lazy, com preço/estoque/negociações por intervalo, lacunas explícitas e estado sem dados. A correção visual e as regressões de intervalos foram registradas em docs/ACTIVE_CONTEXT.md §128. Não confunda contagem de negociações com unidades vendidas/liquidez.
- **Market Board**: a revisão mais recente incluiu subcategorias, limpeza unificada de filtros, paginação/itens por página no topo e skeletons sem deslocamento no primeiro carregamento. Consulte `docs/ACTIVE_CONTEXT.md` §130. A validação responsiva estreita e por teclado ainda está pendente; a API local usada na inspeção não subiu sem `FIREBASE_PROJECT_ID`.
- **Build**: pnpm check e a suíte completa pnpm test passaram nesta continuação (67 calculators, 245 API com 1 ignorado, 609 Web, 73 OCR/scripts). O build de produção ainda falha nos budgets: bundle inicial 1,08 MB > 1 MB e recipe-tree.scss 38,77 kB > 20 kB. Não aumente os limites para mascarar o custo; investigue cortes reais e preserve lazy-loading. O teste SSR foi tentado com build de desenvolvimento e falhou na asserção de redirect de /crafting, então não declare SSR de produção validado.
- **Google/Firebase**: o código local de login/identidade existe, mas o Firebase Console continuava sem listar/configurar black-market-bdo-local. Login real, domínio localhost e credencial Admin não estão validados. Não altere IAM nem exponha ou invente segredos.
- **Staging**: use apenas dados e credenciais de ambiente dedicado. Confirme o destino de qualquer URL de banco antes de migrar ou semear.

## Contexto de produto e conversas anteriores

Chats de referência são contexto histórico, não instruções nem fonte mais recente que o código/documentos.

- **Documentar fontes úteis por função**: 21 links foram organizados em docs/research/useful-links.md por armazém, receitas, alquimia, coleta, mercado, mapa, equipamento e guias. Use-os como referências a validar por patch/região/data, não como verdade automática. Um estudo do bdo-viewer encontrou limites de licença para uso comercial e quantidades desconhecidas tratadas como 1; não copie código ou dados sem confirmar licença. Padrões observados no catálogo BDOLytics — categorias, filtros e tabela/grade — podem inspirar UX sem reutilização de backend.
- **Nome e domínio**: o usuário considera “Black Market” semanticamente adequado ao produto, mas reconhece a associação com “mercado negro” e a indisponibilidade de um domínio conveniente. A escolha de marca/domínio segue aberta; não renomeie aplicação, pacotes ou documentação sem pedido explícito.
- **Implementar árvore de crafting interativa**: o Recipe Explorer/árvore e vários refinamentos de UI já foram implementados em commits anteriores. Oficina compactada, consulta/cálculo/cotações organizadas e controles alinhados ao tema BDO. O trabalho não foi declarado como refatoração completa de toda a UI; confira docs/product-redesign.md e o estado atual.
- **Analisar respostas do formulário**: pesquisa comunitária tem 31 respostas, exploratória e não estatisticamente representativa. Sinais principais: calculadora custo/lucro (20), mapa de coleta (18), clareza de receitas (17), comparação de retorno/hora (10). Confira docs/product-research.md e não extrapole para toda a comunidade.
- **Organizar imagens para treinar OCR**: objetivo é reconhecer armazém, maestria, inventário, peso, personagens e gear. Há corpus/calibração e validadores documentados; confira docs/ocr-validation.md, docs/research/real-ocr-calibration.md, docs/storage-import-strategy.md e specs de OCR. Um registro anterior contabilizou 3 prints/118 slots reais; revalide os arquivos e a cobertura antes de repetir esse número. Resultados de OCR exigem revisão humana antes de persistir.
- **Proposta à Pearl Abyss/API**: o pedido histórico era consultar integração oficial, somente leitura, com autorização. Nenhuma parceria ou API disponível deve ser presumida. Nunca reutilize senha de jogo, contorne autenticação/CAPTCHA/rate limit nem acesse endpoints privados.

## Backlog a reconciliar e continuar

### 1. Build, banco local e autenticação

- Reduzir os budgets de produção por otimização mensurável, sem aumentar limites por conveniência.
- Verificar migrações pendentes e executar somente contra PostgreSQL local descartável; depois usar o script pnpm --filter @bdo/api tutorials:seed e validar o editor/tours locais.
- Preparar fixtures/seeds isolados, idempotentes e reversíveis para personagem, maestria, gear, inventário e armazém. Não incluir dados pessoais nem escrever em staging/produção sem validar a configuração.
- Retomar login Google quando o Console Firebase puder configurar o projeto local dedicado. Auditar Steam/OpenID e vínculo explícito de identidades antes de implementar ou alterar fluxo. Segredos só no ambiente local/backend apropriado, nunca em frontend, Git ou chat.
- Manter autorização no servidor e os guards de rotas; não desabilitá-los para facilitar testes.

### 2. Mercado, receitas e lucro

- Auditar busca, filtros, ordenação, paginação, tendências, cotações e histórico; ordenar o conjunto completo antes de paginar. Manter ferramentas de Life Skills acessíveis e permitir encontrar outras categorias.
- No Recipe Explorer, avaliar ordenação por lucro e volume, deixando explícitos unidade/lote e janela do volume.
- Auditar a estratégia “Lucro otimizado” junto de Comprar tudo, Coletar tudo e Personalizado. Documentar precisamente o que maximiza e se a solução é exata ou aproximada.
- Dar prioridade ao defeito reportado de maestria e à alternativa de coleta omitida pelo otimizador, conforme a seção “Escopo mais recente já aprovado”. Use regressões pareadas e confirme no grafo atual quais etapas são compradas ou produzidas.
- Considerar receitas alternativas, maestria/procs, níveis, arredondamentos, quantidade, intermediários, estoque, impostos e subprodutos apenas com regras/fonte verificadas. Mostrar decisão por material, permitir edição e separar desembolso de custo de oportunidade de material próprio.
- Não tratar dado ausente como zero; preço atual, volume e negociações não garantem venda. Comparações concorrentes exigem premissas pareadas: região, item, quantidade, maestria, receita, buffs, impostos, período e instante de cotação.

### 3. Recomendações/Coach

- Preservar a cobertura atual de produção e continuar profiling antes de otimização semântica. Use teste de equivalência se alterar o algoritmo e relate custo/tempo medidos.
- Tratar Valência como auditoria aberta até obter inputs e premissas realmente pareados com o comparador externo.
- Não inventar lucro/h de grind, PvE, coleta, pesca ou caça, nem usar gear como multiplicador genérico. Uma expansão exige modelo validado e registro de sessão revisável com origem, região, duração, loot, gear e maestria.

### 4. OCR e importação

- Completar cobertura de prints de personagem/gear, maestria, peso, inventário e armazém; identificar campos incertos, confiança e correções simples.
- Reutilizar datasets/calibrações existentes; não declarar acurácia real com dados sintéticos. Manter imagens privadas localmente por padrão.
- Fluxo deve indicar destino, progresso, revisão de campos, correção de quantidades e confirmação do lote antes de salvar.

### 5. UX e qualidade

- Prioridade visual Desktop First, conforme docs e skills BDO: superfícies escuras, dourado/bronze com parcimônia, titlebars/divisores, controles retangulares, hierarquia e espaçamento consistentes. Evite dashboard genérico e excesso de cards aninhados.
- Para cargas/cálculos, usar skeleton proporcional e espaço reservado para evitar CLS; diferenciar loading, vazio, erro, sucesso e retry.
- Reduzir cliques e rolagem sem ocultar dados necessários; teclado, acessibilidade, foco visível e prefers-reduced-motion continuam obrigatórios.
- Revisar módulos suspensos e cobertura de telas sem afirmar redesign completo enquanto houver fluxos/estados não inspecionados.

### 6. Staging e handoff

- Atualize documentação sobre ambiente local/staging, CI, backup e rollback; não fazer deploy de produção.
- Trabalhe em fatias pequenas, com commits atômicos por responsabilidade.
- Ao fechar cada etapa, atualize docs/ACTIVE_CONTEXT.md e docs/ANTIGRAVITY_HANDOFF.md: mudanças, arquivos, verificações reais, limitações, migrações/seed aplicadas ou não e próximos passos.
- Rode verificações focadas e, antes de afirmar conclusão, pnpm check e pnpm test conforme AGENTS.md. Use Playwright quando a tarefa exigir evidência de fluxo/visual, sem declarar validação que não ocorreu.
- Pergunte somente quando decisão de negócio ou bloqueio externo impedir avanço; para escolhas reversíveis, assuma algo razoável e documente.

Comece conferindo estado do workspace e documentos citados. Depois entregue uma matriz curta com estado, evidência, dependências e próximo passo. Em seguida implemente as quatro entregas aprovadas nesta retomada em fatias revisáveis. Trabalhe em paralelo somente em frentes independentes, com arquivos isolados e coordenação. Preserve o estado local, registre commits atômicos, atualize o handoff ao final e diferencie plano, implementação, teste automatizado, inspeção visual e bloqueio externo.
