# Auditoria integral do Black Market BDO

Use o modelo Codex `gpt-6.1-sol` com reasoning medium.

Audite o produto e o repositório Black Market BDO. Nesta etapa, investigue, documente e priorize bugs, melhorias e funcionalidades pendentes. Não implemente correções nem altere o comportamento do produto. Vou revisar os achados antes de iniciarmos a implementação.

## Contexto e continuidade

Antes de começar:

1. Leia `AGENTS.md`, `docs/ACTIVE_CONTEXT.md`, `docs/ANTIGRAVITY_HANDOFF.md` e `docs/project-feature-checklist.md`.
2. Confira a branch, os últimos commits e `git status`. Preserve as alterações existentes. Não limpe, sobrescreva ou inclua arquivos que não pertençam a esta auditoria.
3. Leia os documentos de produto e planejamento, incluindo `docs/roadmap.md`, `docs/implementation-queue.md`, `docs/implementation-status.md`, `docs/product-redesign.md` e as especificações da Roadmap.
4. Faça um inventário da documentação em `docs/` e das skills relevantes em `.agents/skills/`. Leia os documentos de referência completos para cada área auditada. Identifique conteúdo antigo ou conflitante e confirme o estado atual no código.
5. Consulte auditorias existentes em `docs/research/` para evitar repetir trabalho. Não considere uma feature concluída ou pendente sem conferir código e evidências atuais.

O projeto é um monorepo `pnpm`: frontend Angular com SSR em `apps/web`, API/BFF em `apps/api`, cálculos em `packages/calculators`, banco em `packages/database` e contratos/utilitários compartilhados nos demais pacotes.

A interface da Roadmap é a referência visual aprovada. O produto é desktop-first, com prioridade para jogadores de BDO, região SA e português brasileiro. Preserve acessibilidade, navegação por teclado, movimento reduzido e funcionamento em telas estreitas.

## Requisitos de produto confirmados

Trate estes pontos como requisitos já definidos, não como sugestões para decidir durante a auditoria:

- A Home deve apresentar com clareza o propósito do produto, os próximos passos e os recursos principais. Avalie os estados para visitante e usuário autenticado, a relação com a Roadmap, as ações principais e a quantidade de rolagem e cliques.
- Os botões de login social devem seguir um padrão visual compartilhado de tipografia, altura, alinhamento, espaçamento, ícones e estados. Mantenha a identidade e as regras oficiais de uso das marcas Google e Steam; verifique as orientações oficiais se necessário. Não use emojis como ícones.
- Ao tentar abrir um recurso autenticado sem sessão, mostre o login em um modal acessível, com overlay e fundo desfocado. Não encaminhe o usuário para `/account`. Preserve o destino pretendido: após login bem-sucedido, leve o usuário ao recurso solicitado; ao fechar o modal, mantenha-o no contexto de origem.
- Uma navegação direta para uma rota autenticada deve seguir o mesmo fluxo de login e preservar o destino. Não exponha conteúdo ou dados protegidos antes da autenticação.
- `/account` deve passar a ser `/settings`, dedicado a configurações da conta e informações relacionadas. Avalie referências internas, navegação, guards, retorno pós-login e compatibilidade de links antigos. Registre a recomendação de redirecionar links antigos de `/account` para `/settings`, preservando parâmetros relevantes quando aplicável.

Audite esses requisitos contra a implementação atual e registre lacunas e dependências. Não altere rotas, componentes ou configurações durante esta etapa.

## Escopo da auditoria

### 1. Home, login e navegação autenticada

Revise a Home e os fluxos de login para usuários visitantes e autenticados. Avalie:

- Clareza da proposta, hierarquia visual, ações principais e relação entre Home e Roadmap.
- Apresentação dos recursos públicos e autenticados e consistência entre menu, cards, atalhos e links.
- Tela de login e consistência dos botões Google e Steam: tipografia, texto, ícones, dimensões, espaçamento, foco, hover, carregamento, erro e estado desabilitado.
- Comportamento esperado do modal: overlay com blur, foco, navegação por teclado, leitor de tela, fechamento, rolagem do fundo e preservação do destino.
- Guardas e retorno pós-login, incluindo rota digitada diretamente, atualização do navegador, cancelamento do login e sessão expirada.
- Destinos atuais em `/account` e referências que precisarão migrar para `/settings`.

Verifique o estado real da configuração de login local e staging. Registre separadamente o que está implementado, o que foi validado e o que depende de Firebase, credenciais, Steam ou ambiente. Não gere credenciais nem altere configurações.

### 2. Layout, componentes e interação

Revise as rotas públicas e autenticadas disponíveis. Inclua, conforme existam no código: Home, Roadmap, Conta/Configurações, Mercado, Receitas, Crafting, Recomendações/“O que fazer”, Família/Personagem, Armazém, Equipamentos, OCR e importação de imagens, tutoriais e utilitários.

Compare as telas com a hierarquia, densidade, cores, tipografia, espaçamento, botões, cards, tabelas e feedback visual da Roadmap. Identifique inconsistências entre páginas e componentes duplicados que poderiam compartilhar um padrão.

Avalie:

- Hierarquia das informações e clareza das ações principais.
- Quantidade de scroll e cliques nas tarefas comuns. Quando possível, descreva o fluxo e conte os passos.
- Densidade das telas desktop, navegação, filtros, tabelas e uso do espaço.
- Estados de carregamento, skeleton, vazio, erro, sucesso, desabilitado e atualização.
- Mudanças de layout durante carregamento, paginação, filtros, abertura de detalhes e chegada de dados.
- Paginação, ordenação, filtros, persistência de escolhas e estabilidade dos resultados.
- Feedback, confirmações e prevenção de ações acidentais.
- Animações e transições: propósito, duração, consistência, desempenho e respeito a `prefers-reduced-motion`.
- Acessibilidade por teclado, foco, nomes acessíveis, contraste e responsividade.

Use um viewport desktop, por exemplo 1440×900, como cenário principal. Verifique também uma tela estreita, por exemplo 390×844. Não reduza scroll ou cliques escondendo informações necessárias ou controles avançados.

Considere fundir ou remover funcionalidades apenas como recomendação. Registre evidências de duplicidade, baixo valor ou confusão e o impacto esperado. Não remova funcionalidades nesta etapa.

### 3. Receitas, Mercado e cálculos

Audite o código e a interface para:

- Catálogo, busca, seleção e ordenação de receitas e itens.
- Ordenação e filtros do Mercado, região, origem, idade e disponibilidade dos dados.
- Árvore de receita, quantidades, rendimento, maestria, procs e equivalências entre itens.
- Preços de compra e venda, taxas, impostos, custos, faturamento, lucro total, prejuízo e lucro por hora.
- Estratégias “Buy All”, “Craft All”, coleta, personalização e “Best Profit”.
- Consumo de estoque, materiais próprios ou comprados e opções de aquisição.
- Diferença entre preço listado, liquidez e venda efetivamente garantida.
- Arredondamento, unidades, itens sem preço, dados desatualizados, empates e mudanças de premissas.

Procure divergências entre interface, API, tipos, calculadoras e documentação. Para cada cálculo, identifique entradas, unidades, fontes e premissas. Quando faltarem dados para confirmar um resultado, registre a lacuna em vez de inferir uma regra.

### 4. Pesquisa competitiva

Siga `docs/research/competitor-review-playbook.md`. Consulte as superfícies públicas relevantes de BDO Workshop, BDO Codex, BDOLytics e Garmoth. Use também `docs/research/useful-links.md` e as auditorias já existentes.

Para cada fonte, registre data, URL, área consultada, idioma ou região visível e resultado do acesso. Anote equivalentes encontrados, diferenças de fluxo, lacunas e recursos sem equivalente verificável.

Ao comparar cálculos, alinhe as entradas e altere uma variável por vez. Registre receita ou item, região, quantidade, maestria, nível, buffs, taxas, política de aquisição, preços e horário da cotação sempre que a interface permitir.

Classifique cada conclusão como observação direta da interface, comportamento reproduzido com entradas controladas, hipótese sobre a lógica interna ou regra do jogo confirmada em fonte confiável.

A interface de um concorrente não comprova sua fórmula interna. Não use snapshots de concorrentes como preços de produção ou fixtures do Black Market. Consulte somente páginas públicas e APIs documentadas ou autorizadas. Não contorne login, CAPTCHA, bloqueios ou limites de acesso. Não use endpoints privados nem copie código, imagens ou conjuntos de dados.

### 5. Desempenho e estabilidade visual

Inspecione carregamento inicial e fluxos que afetam o uso: Home, login, catálogo, busca, filtros, paginação, árvores de receita, cálculos, tabelas e gráficos.

Quando o ambiente permitir, registre LCP, INP e CLS com as condições da medição, rota, viewport, dados e estado dos serviços. Separe medições reais de estimativas. Investigue bundle, trabalho no navegador, chamadas repetidas, renderizações, carregamento de imagens e dependências da API.

Se uma rota ou serviço estiver indisponível, registre o bloqueio e como ele afeta a auditoria. Não atribua ao produto um resultado causado por API, autenticação, rede ou ambiente não preparado.

### 6. Funcionalidades e lacunas

Confronte o código atual com checklist, roadmap, fila de implementação, documentação técnica, especificações aprovadas, planos executados e pedidos registrados no projeto.

Inclua autenticação Google/Steam local e staging, Home, Conta/Configurações, Família/Personagem, Armazém, Equipamentos, importação de prints e OCR de maestria, inventário e armazenamento, além de Receitas, Mercado e Recomendações.

Classifique cada item como implementado e validado, implementação com validação incompleta, parcial ou dependente de dados/serviço, planejado sem implementação suficiente, bloqueado por dependência, ou documentação desatualizada/conflitante com o código.

## Método e limites

Faça a auditoria com inspeção de código, documentação e navegação segura no ambiente local disponível. Não altere arquivos de aplicação, testes, configurações ou dados. Você pode criar o relatório e atualizar documentos de continuidade.

Não implemente nenhum achado nesta fase. Não gere credenciais, não altere Firebase, não faça seed nem migração em banco persistente, não modifique dados de usuários e não faça push, publicação ou deploy.

## Entregáveis

Crie um relatório em `docs/research/`, com nome semelhante a `full-product-ui-calculation-performance-audit-YYYY-MM-DD.md`. Atualize as linhas existentes em `docs/project-feature-checklist.md` e os documentos de handoff/contexto conforme as instruções do repositório. Evite entradas duplicadas.

Para cada achado, registre:

- ID, categoria, rota ou fluxo e prioridade.
- Tipo: bug, inconsistência, oportunidade de UX, desempenho, lacuna funcional, documentação ou bloqueio.
- Passos para reproduzir e resultado observado.
- Evidência: arquivo e linha, screenshot ou medida, quando disponível.
- Resultado esperado, impacto para o jogador e causa provável.
- Nível de confiança e premissas ainda não confirmadas.
- Correção recomendada, dependências e tamanho estimado.

Use estas prioridades:

- P0: impede o uso de uma função central ou compromete dados.
- P1: causa erro relevante, cálculo incorreto ou bloqueio frequente.
- P2: cria atrito importante ou inconsistência recorrente.
- P3: melhoria de acabamento ou oportunidade de menor impacto.

Estruture o relatório com:

1. Resumo dos principais achados.
2. Rotas e fluxos auditados, incluindo os que ficaram inacessíveis.
3. Achados priorizados por área.
4. Pesquisa competitiva e limites de verificação.
5. Medições de desempenho e condições do ambiente.
6. Funcionalidades pendentes, dependências e conflitos documentais.
7. Proposta de sequência de correção, sem executar mudanças.

Antes de encerrar, confira se cada afirmação tem evidência, se os documentos atualizados refletem o estado real do código e se as limitações estão explícitas. Informe os arquivos documentais alterados, rotas examinadas e pontos bloqueados. Entregue o relatório e aguarde minha revisão antes de começar as correções.

## Refinamento após reconciliação dos cinco chats — 16/10/2026

Execute esta auditoria na sequência da consolidação deste prompt, sem nova confirmação. Esta autorização cobre investigação e documentação; a implementação dos achados aguarda revisão.

- Contexto cronológico: a configuração Firebase Admin local/staging foi concluída em ACTIVE_CONTEXT §154 e commit 81cea47. Não repetir o bloqueio antigo de credenciais dos demais chats. Revalidar readiness e identity/config sem exibir segredos. Login interativo e sessão autenticada continuam distintos de smoke de configuração.
- /settings já existe como Dados e backup; avaliar composição/migração de responsabilidades, compatibilidade dos backups e links de /account. Não criar uma segunda rota conflitante ao recomendar a mudança.
- Chart.js já substituiu o histórico do Mercado no checkout principal. Revalidar representação de lacunas e datas, tooltip, acessibilidade, estados vazios e impacto no bundle; não listar substituição do gráfico como trabalho ainda não feito.
- Skeletons e cache de rotas já receberam entregas. Avaliar estabilidade real de filtros/paginação, chegada de cotações e estados vazios, em vez de recomendar genericamente adicionar skeletons.
- Otimizador recursivo tem spec/plano aguardando revisão; distinguir otimização do grafo atual de busca entre fórmulas recursivas. A decisão registrada é uma fórmula por item intermediário, sem dividir demanda entre métodos. Não marcar como implementado com base apenas em documentos.
- OCR: separar reconhecimento de identidade, quantidade abreviada/estimada, maestria e equipamento. Treino sintético ou calibração com imagens usadas no desenvolvimento não comprovam acurácia em corpus real independente. Não treinar, importar em estoque ou inventar métricas nesta auditoria.
- Preservar o plano preexistente não rastreado docs/superpowers/plans/2026-10-16-roadmap-visual-phase-3.md.
- Inventariar todos os documentos textuais em docs com classificação de relevância; ler integralmente fontes normativas e referências das áreas auditadas. Registrar cobertura explícita dos documentos históricos e anexos, sem alegar leitura integral de binários ou de todo o histórico.
- Criar matriz de cobertura por rota e estado: navegador desktop/estreito, inspeção de código, testes, bloqueado ou não verificado. Não confundir redirecionamento de visitante com auditoria do conteúdo protegido.
- Navegação e GET locais podem gravar cache operacional normal; não criar/alterar dados pessoais. Não simular sessão real, contornar guard, usar credenciais Admin para impersonação nem concluir consentimento de provedor em nome do usuário.
- Executar pnpm check e pnpm test como diagnóstico e build serial se necessário para medir bundle atual. Registrar comando, saída, ambiente e duração, sem corrigir falhas nem formatar arquivos alheios. Medidas em dev não equivalem a CWV de produção; não chamar interação amostrada de INP de campo.
- Para cada achado incluir severidade, confiança, fonte exata, reprodução, observado/esperado, impacto, proposta, esforço P/M/G, dependências e critério verificável de aceite. Distinguir defeito confirmado, requisito ainda não implementado, hipótese e limitação conhecida.
- Para cálculos, usar cenários controlados: quantidade zero/positiva, custo ausente, preço zero válido, taxa com/sem Value Pack, estoque parcial, yield fracionário, total versus hora, mudança de snapshot e equivalências fresco/seco sem ratio confirmado. Não ajustar dados de produção para comparar concorrentes.
- Reconciliar checklist e handoffs de forma aditiva e enxuta, referenciando os IDs do relatório. Entregar uma sequência recomendada de correções, sem implementação, push ou deploy.

Fontes de continuidade consultadas: Aprimorar prompt de auditoria (01a145eb-2225-7d63-bf16-8bce1dc7a8bf), Preparar prompt completo para Antigr (01a14208-72d2-7811-940f-8b31462f7944), Continuar implementação Black Market (01a142ba-7db3-7963-9a83-259d330fefdc), Analisar respostas do formulário (01a140cf-bcb6-7643-a73b-acfb3e769bdf), Organizar imagens para treinar OCR (01a126fd-698c-75b3-8ace-faf1dc008995). Chats são contexto histórico; código e evidência atual prevalecem.
