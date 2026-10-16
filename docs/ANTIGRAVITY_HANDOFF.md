# Handoff do Black Market para Antigravity

- **Atualizado em:** 16/10/2026
- **Projeto:** Black Market — planejador para Black Desert Online
- **Objetivo:** permitir que o Antigravity retome o trabalho sem depender do histórico dos chats do Codex.

Este é um índice de retomada, não substitui as instruções nem os documentos detalhados do projeto. Leia primeiro `AGENTS.md` e `docs/ACTIVE_CONTEXT.md`; depois confira `git status`, `git log -n 3 --oneline` e o código atual. Os documentos de especificação e implementação listados abaixo são a fonte de detalhes.

## Estado do workspace nesta passagem

- Branch atual: `main`.
- A entrega funcional mais recente nesta continuação é a atualização da interface do Market Board em 16/10/2026; consulte a seção 130 de `docs/ACTIVE_CONTEXT.md` e confirme o SHA pelo `git log`.
- Entregas implementadas nesta continuação: `0185b87` (indexação dos lookups do Coach), `205dee4` (Home/Roadmap dinâmico) e `8cf0283` (Tutoriais guiados com Driver.js). Também foram criados `1308342` (teste do canvas acessível do Mercado) e `53ed17b` (formatação/Prettier). Confira o histórico real antes de agir.
- Este handoff e a atualização de `docs/ACTIVE_CONTEXT.md` foram registrados juntos em um commit documental local. O workspace estava limpo logo após o commit; confira `git status` ao retomar e preserve qualquer alteração que apareça.
- O gráfico Chart.js do histórico do Mercado está commitado em `6d22a75`; recebeu validação adicional de lacunas e métrica em `128` do `ACTIVE_CONTEXT.md`.
- Home/Roadmap e a biblioteca de Tutoriais Guiados estão implementados e commitados. Os planos de implementação registram detalhes e pendências; não reimplemente essas entregas do zero.
- `pnpm check` e `pnpm test` passaram nesta continuação. O build de produção ainda falha nos budgets atuais: bundle inicial 1,08 MB (limite 1 MB) e `recipe-tree.scss` 38,77 kB (limite 20 kB). Não aumente os budgets sem reduzir e justificar o custo real.
- As migrações `0011_global_roadmap_order` e `0012_tutorial_guides` estão versionadas, mas não foram aplicadas a banco nesta passagem; o seed de tutoriais também não foi executado.
- Prompt reutilizável para a continuidade: `docs/ANTIGRAVITY_CONTINUATION_PROMPT.md`; o commit documental mais recente deve ser conferido com `git log`.
- A seção 128 de `docs/ACTIVE_CONTEXT.md` registra a validação visual do Chart.js em desktop e mobile, para métricas de preço, estoque e negociações por intervalo. A seção 126 é o histórico da implementação inicial, anterior à validação visual.
- O Market Board agora tem subcategorias expansíveis, ação para limpar filtros, paginação/itens por página acima da tabela e skeletons no primeiro carregamento. `pnpm check` e `pnpm test` passaram; a inspeção visual desta passagem ficou pendente porque a instância compartilhada do Playwright estava ocupada. A cobertura total de mercado continua parcial enquanto não houver fonte externa autorizada e volume confiável.

## Prioridades de continuação

### Prioridade imediata — oficina de receitas e lucro (pedido aprovado em 16/10/2026)

O usuário aprovou as regressões financeiras de maestria, a correção de alternativas de coleta omitidas pelo otimizador e a documentação das limitações observadas no BDO Workshop. Também pediu um tour contextual para a oficina, usando a biblioteca Driver.js já existente. Leia o escopo reproduzível em `docs/ANTIGRAVITY_CONTINUATION_PROMPT.md`, seção “Escopo mais recente já aprovado”. Confirme todos os diagnósticos no código atual, implemente por fatias e não refaça a biblioteca de tutoriais.

Na referência pública do Workshop, o plano 9601 do Balenos Meal mudou de aproximadamente 2.500 para 3.647 produtos ao mudar Culinária de 0 para 3.000, afetando vendas líquidas, lucro e tempo; Processamento 0 não alterou essa receita. A política “Best profit/hour” expôs decisões para itens esgotados e informações de estoque/vendas/reposição. Esses números são observações datadas e aproximadas de UI, não a fórmula interna comprovada nem um padrão fixo. Use comparação pareada, sem endpoints privados ou reutilização de dados/código/assets. Documente incertezas.

Para a extensão do tour, considere que o seed atual preserva guias já existentes; adicionar etapas à chave `recipes` não atualiza automaticamente bancos semeados. Verifique se uma chave contextual nova para a oficina é necessária. Confirme banco local descartável antes de qualquer migração ou seed. Depois desse escopo, continue as prioridades abaixo.

### 0. Validar visualmente o Market Board

A implementação e as verificações automatizadas estão registradas na seção 130 de `docs/ACTIVE_CONTEXT.md`. Quando o Playwright estiver disponível, revisar `/market` em desktop, viewport estreita e teclado, conferindo expansão/seleção de categorias, foco, skeletons e ausência de overflow. A tentativa anterior encontrou uma instância Playwright já em uso; não assuma a sessão ocupada.

### 1. Tratar os limites do build de produção

O último build de produção concluiu a compilação, mas falhou nos budgets Angular: bundle inicial de 1,08 MB contra 1 MB e `recipe-tree.scss` com 38,77 kB contra 20 kB. Não elevar o limite para fazer o build ficar verde. Investigue quais módulos e regras CSS causam o peso, proponha cortes mensuráveis e mantenha recursos de rota lazy. O Driver.js está em chunk lazy (~27 kB); preserve esse carregamento sob demanda.

### 2. Preparar e validar o Tutorial Guiado em banco local

Antes de qualquer escrita, confirme que a URL resolve para um banco local descartável. Aplique somente as migrações pendentes (`0011`/`0012`) e execute `pnpm --filter @bdo/api tutorials:seed` nesse banco. Confira `/tutorials/manage` com identidade de admin e as guias públicas; nunca use uma URL remota por suposição. Seed de tutorial não foi executado nesta passagem.

### 3. Conferir visualmente o gráfico do Mercado

O pedido recente era fazer um gráfico conectado, não deixar apenas pontos. A implementação já está commitada. Inspecione a tela com dados reais disponíveis e os estados sem amostras, SSR, acessibilidade, escalas e lacunas de coleta; corrija o que for necessário. Não apresente uma linha contínua como se houvesse observações durante períodos sem consulta; a linha tracejada indica um intervalo longo. Não converta contador de negociações em unidades vendidas nem em liquidez garantida.

O histórico técnico está na seção 126 de `docs/ACTIVE_CONTEXT.md` e a política de fontes do Mercado em `docs/research/market-source-policy.md` e `docs/research/competitor-market-crafting-audit-2026-10-14.md`.

### 4. Desbloquear autenticação Google local

- O código já contém o fluxo Firebase Web/Google, validação Firebase Admin no BFF, identidade, workspace e guards. Veja as seções 90–99 e 125 do `ACTIVE_CONTEXT.md`, mais `docs/superpowers/specs/2026-10-14-social-auth-and-staging-design.md` e `docs/superpowers/plans/2026-10-14-social-auth-and-staging.md`.
- Foi criado o projeto local dedicado `black-market-bdo-local`, e o app Web foi registrado. O usuário aceitou no navegador o prompt de termos e pediu nova tentativa.
- O Firebase Console ainda falha ao listar os apps e também exibiu erro ao carregar o status de aceite. A conta conectada foi confirmada como `Owner`; `firebase.googleapis.com` e `identitytoolkit.googleapis.com` estão habilitadas. Não conceder papéis adicionais nem vincular billing por causa desse erro.
- Em IAM & Admin > Labels aparecem `firebase:enabled` e `firebase-core:disabled`. A documentação oficial explica o primeiro e recomenda não alterá-lo; não foi encontrada explicação oficial para o segundo, que permaneceu intacto.
- O `.env` local ignorado pelo Git contém a configuração pública Firebase (`FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_API_KEY`, `FIREBASE_APP_ID`), sem valores copiados para esta documentação. `FIREBASE_ADMIN_CREDENTIALS_BASE64` ainda não existe. Nenhuma chave privada foi criada ou baixada.
- Login Google ainda não foi confirmado como salvo e `localhost` ainda não foi autorizado em Authentication > Settings > Authorized domains. Portanto o login real e as rotas autenticadas continuam sem validação end-to-end.
- Quando o Console voltar a funcionar, retomar o provedor Google e `localhost`, manter credenciais privadas exclusivamente no `.env` local ignorado e nunca enviá-las ao chat, frontend ou Git. O e-mail de suporte foi autorizado pelo usuário no Console; não registrar seu endereço pessoal em documentação versionada.

### 5. Manter o Coach de Atividades alinhado ao objetivo do produto

O Coach da rota `/recommendations` foi implementado e refinado nas seções 121–124 do `ACTIVE_CONTEXT.md`. Ele automatiza o ranking de receitas de produção usando catálogo, perfil/maestria, estoque, preços disponíveis e calibração opcional de tempo; mostra custos, quantidades, duração, origem e pendências. O carregamento do catálogo é automático e usa resolver/cache, sem botão “carregar catálogo”. A UI segue os painéis, titlebars, controles retangulares e tokens do padrão BDO.

**Direção do usuário:** a finalidade é obter lucro com Life Skills para melhorar gear de Life Skill e de PvPvE. O Coach deve ajudar a escolher ações rentáveis com base na rotina e nos dados atuais. Mostre valores líquidos, custos, premissas e incerteza em contexto; evite transformar a tela em um aviso genérico de que lucro não é garantido.

**Limites atuais:** o ranking confiável cobre produção; não há modelo verificado de lucro/h por gear para grind/PvE, coleta, pesca ou caça. Gear não pode ser multiplicador genérico. Volume histórico não garante venda. Uma atividade sem cobertura suficiente deve aparecer como pendente/desconhecida, nunca como inferior por falta de dado.

Antes de estender o comparador para atividades de combate ou coleta, use registro de sessões revisável, com origem, região, atividade, duração, loot e contexto de gear/maestria. OCR pode ajudar a preencher a sessão, mas requer revisão explícita. O arquivo `docs/research/activity-coach-competitive-review.md` documenta os concorrentes e a lacuna de cobertura.

## Direção de produto e decisões que continuam válidas

- Público inicial: jogadores de BDO, com foco em região SA e português brasileiro.
- A pesquisa comunitária tem 31 respostas e é exploratória, não representa estatisticamente toda a comunidade. Recursos mais escolhidos: calculadora de custo/lucro (20), mapa de coleta (18), receitas claras (17), comparação de atividades por retorno/hora (10).
- O principal feedback aberto pede uma visão integrada: preferências, gear/maestria quando houver relação comprovada, armazém, produzir ou comprar, preço e liquidez, e escolha de atividade para a sessão. Outra resposta sugere usar o armazém para indicar Life Skills ou grind.
- O CSV original está na pasta Downloads do usuário, em `BlackMarket — Pesquisa da comunidade BDO.csv/BlackMarket — Pesquisa da comunidade BDO.csv`; ele não foi copiado para o repositório por este handoff. Os resultados e a interpretação de produto devem permanecer sem dados pessoais dos respondentes.
- A integração de armazém/conta do jogo só deve usar API oficial e autorizada, opcional e de leitura, com escopo mínimo e revogação. Nunca solicitar senha do jogo nem presumir que exista API disponível.
- Concorrentes e repositórios open source são referências para comparar fluxo e cobertura, não para copiar código, dados ou endpoints. Separar informação observada de hipótese e registrar fonte/data.
- **Pesquisa competitiva contínua**: em toda feature de produto, consulte as áreas públicas relevantes de BDO Workshop, BDO Codex, BDOLytics e Garmoth. Registre também quando não houver equivalente ou quando a página não puder ser verificada. Para cálculo, alinhe entradas e cotações e não conclua fórmula interna só pela semelhança da interface. Use `docs/research/competitor-review-playbook.md`.
- Estimativas de infraestrutura feitas em chats são históricas; conferir os documentos operacionais atuais e preços antes de decidir ou provisionar recursos.

## Mapa de documentação para trabalho por área

| Tema                                     | Fonte de verdade no repositório                                                                                                                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuidade de cada turno               | `AGENTS.md`, `docs/ACTIVE_CONTEXT.md`                                                                                                                                                                                                                                            |
| Direção e roadmap do produto             | `docs/product-vision.md`, `docs/product-research.md`, `docs/roadmap.md`, `docs/implementation-queue.md`, `docs/implementation-status.md`, `docs/feature-coverage.md`                                                                                                             |
| Visão técnica e APIs                     | `docs/architecture.md`, `docs/angular-architecture.md`, `docs/api.md`, `docs/database.md`, `docs/calculators.md`                                                                                                                                                                 |
| UI inspirada em Black Desert             | `.agents/skills/bdo-ui-design/SKILL.md`, `.agents/skills/ui-design/SKILL.md`, `docs/design-system/bdo-ui.md`, `docs/bdo-ui-validation.md`                                                                                                                                        |
| Pesquisa de concorrentes, APIs e fontes  | `docs/research/README.md`, `docs/research/useful-links.md`, `docs/research/market-source-policy.md`, `docs/research/implementation-gap-matrix.md`, `docs/research/competitor-market-crafting-audit-2026-10-14.md`                                                                |
| Coach e produção                         | `docs/superpowers/specs/2026-10-15-activity-coach-recommendations-design.md`, `docs/superpowers/plans/2026-10-15-activity-coach-recommendations.md`, `docs/research/activity-coach-competitive-review.md`                                                                        |
| Receitas, maestria e equivalências       | `docs/recipe-explorer.md`, `docs/recipe-catalog-update.md`, `docs/recipe-review-2026-10-10.md`, `docs/research/recipe-mastery-model.md`, `docs/crafting-equivalences-and-totals.md`                                                                                              |
| OCR, imagens e importação                | `docs/ocr-validation.md`, `docs/print-import-tutorial.md`, `docs/storage-import-strategy.md`, `docs/research/real-ocr-calibration.md`, `docs/superpowers/specs/2026-10-10-bdo-ocr-corpus-design.md`, `docs/superpowers/specs/2026-10-10-bdo-ocr-dataset-pipeline.md`             |
| Staging, implantação, backup e segurança | `docs/staging-local.md`, `docs/deployment.md`, `docs/backup-recovery.md`, `docs/security.md`, `docs/production-and-accounts.md`                                                                                                                                                  |
| Home/Roadmap e tutorial guiado           | `docs/superpowers/specs/2026-10-15-home-roadmap-dynamic-flow-design.md`, `docs/superpowers/plans/2026-10-15-home-roadmap-dynamic-flow.md`, `docs/superpowers/specs/2026-10-15-guided-tutorial-library-design.md`, `docs/superpowers/plans/2026-10-15-guided-tutorial-library.md` |

Os planos de Home/Roadmap e Tutorial Guiado foram aprovados e implementados nesta continuação. Consulte os registros de execução no final de `docs/superpowers/plans/2026-10-15-home-roadmap-dynamic-flow.md` e `docs/superpowers/plans/2026-10-15-guided-tutorial-library.md`; não repita essas implementações sem conferir o estado atual.

## Pendências confirmadas em 16/10/2026

- **Build produção**: bundle inicial excede o limite em 76,9 kB e `recipe-tree.scss` excede o limite de estilo em 18,77 kB. Reduzir o custo real e manter recursos lazy; não aumentar os budgets como atalho. Driver.js está em chunk lazy (~27 kB).
- **Tutorial em banco local**: migrações estão versionadas, mas ainda não aplicadas; o seed idempotente não foi executado. Confirmar destino local descartável antes de migrar/semear e validar a tela administrativa e os tours. Script: `pnpm --filter @bdo/api tutorials:seed`.
- **Coach**: o Map acelerou busca de rótulos/ícones, não o cálculo de cenários. A medição sintética foi ~11,06 s para 4.222 receitas e 12.666 cenários pendentes. A divergência de lucro/h da Refeição de Valência segue sem comparação pareada; conferir `docs/research/activity-coach-competitive-review.md` antes de mudar fórmulas.
- **Autenticação e dados locais**: o login Google real segue bloqueado pelo Firebase Console. Personagem, gear, armazém e staging precisam de dados locais de teste controlados; não preencher dados remotos nem compartilhar credenciais.
- **OCR**: seguir os documentos de corpus/calibração e manter revisão humana do resultado extraído para armazenamento, inventário, maestria, peso e personagens.
- **Verificação**: a suíte completa e `pnpm check` passaram. A build de produção falha nos budgets atuais e `pnpm test:ssr` foi tentado com build de desenvolvimento; não declarar produção ou SSR de produção validados até rodar o smoke na configuração correta.

## Contexto recuperado dos chats referenciados

Estes tópicos foram incorporados a documentação do repositório; consulte os documentos associados para os detalhes. Os títulos de chats são apenas referências históricas, não instruções novas.

- **Organizar imagens para treinar OCR:** corpus de imagens para reconhecer armazém, maestria, inventário, peso e personagens, com validação e correção humana; consulte os documentos de OCR acima e as seções 7–9, 38, 47 e 53–65 do `ACTIVE_CONTEXT.md`.
- **Faça commits atômicos:** houve commits históricos separados para revisão de importação OCR, corpus/validadores e documentação. A instrução de atomicidade continua útil, mas confira o `git status` atual antes de commitar qualquer coisa.
- **Refinar prompt de melhorias BDO:** consolidou escopo de lucro otimizado, UI consistente, QA com browser, mercado, armazém/família, Home, staging e documentação. A fila atual está em `docs/implementation-queue.md` e `docs/roadmap.md`.
- **Estimar custo da infraestrutura CI:** um chat considerou uma VPS única com Docker Compose para tráfego muito pequeno. É estimativa antiga, não orçamento vigente; use `docs/staging-local.md`, `docs/deployment.md` e `docs/backup-recovery.md` e atualize preços antes de provisionar.
- **Implementar árvore de crafting interativa:** o fluxo de receitas evoluiu para Recipe Explorer com grafo, pan/zoom e otimização híbrida; o código e os documentos atuais prevalecem sobre o protótipo descrito no chat.
- **Identificar tecnologias e APIs:** a análise de BDOLytics e o pedido de importar gear contribuíram para o mapa de lacunas. Importação de gear só deve alimentar uma relação de rendimento se houver modelo verificável.
- **Draft Pearl Abyss proposal email:** foi redigida uma proposta em inglês sobre API oficial, autorizada pelo usuário e somente de leitura. O e-mail não foi enviado. Não afirmar parceria ou disponibilidade de API.
- **Documentar fontes úteis:** os links foram organizados por função em `docs/research/useful-links.md`; planilhas e websites são referências, não fonte automaticamente confiável.
- **Instale skills, MCPs e agents / Avaliar e instalar skills úteis:** algumas skills e um plugin foram instalados no ambiente local do Codex. Configurações em `~/.codex` são específicas desta máquina e não fazem parte deste repositório; o Antigravity deve usar as instruções versionadas em `.agents/skills/` e `AGENTS.md`.

## Stack e comandos

O monorepo usa pnpm e Node `^24.15.0`. `apps/web` é Angular SSR (porta 4200), `apps/api` é NestJS/BFF (porta 3000), `packages/calculators` contém os modelos econômicos e `packages/database`, `packages/domain` e `packages/shared` dão suporte ao domínio. Antes de implementar, confirme versões/estado reais nos manifests e no lockfile.

- `pnpm dev:web` — frontend local.
- `pnpm dev:api` — API local.
- `pnpm check` — lint, formatação e typecheck, conforme definido pelo projeto.
- `pnpm test` — testes unitários.

Não rode ou acrescente testes só por causa deste handoff. Ao retomar a refatoração do gráfico ou autenticação, faça as verificações apropriadas e registre resultados e limites em `docs/ACTIVE_CONTEXT.md`.

## Instrução direta para o próximo agente

1. Leia `AGENTS.md` e este handoff; depois confira `docs/ACTIVE_CONTEXT.md`, branch, `git status` e os três últimos commits. Preserve mudanças presentes no workspace.
2. Confira o estado local. Preserve quaisquer alterações que existam e inspecione o diff antes de editar.
3. Investigue e reduza os budgets de produção sem elevá-los por conveniência; documente tamanhos antes/depois e preserve carregamento lazy. A validação visual do Chart.js já está registrada na seção 128 do `ACTIVE_CONTEXT.md`.
4. Aplique migrações e seed de tutoriais apenas após confirmar um banco local descartável; depois valide o editor/tours com estado local.
5. Retome login Google somente quando o Firebase Console permitir listar/configurar o projeto; não altere IAM nem exponha credenciais. Continue as pendências de personagem, gear, armazém e OCR com dados temporários locais e revisão humana.
6. Mantenha as decisões de produto acima e trate dados faltantes como pendentes, sem inventar preços, liquidez, loot ou rendimento.
