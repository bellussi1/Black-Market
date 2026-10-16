# Handoff do Black Market para Antigravity

- **Atualizado em:** 16/10/2026
- **Projeto:** Black Market — planejador para Black Desert Online
- **Objetivo:** permitir que o Antigravity retome o trabalho sem depender do histórico dos chats do Codex.

Este é um índice de retomada, não substitui as instruções nem os documentos detalhados do projeto. Leia primeiro `AGENTS.md`, `docs/ACTIVE_CONTEXT.md` e [`docs/project-feature-checklist.md`](project-feature-checklist.md); depois confira `git status`, `git log -n 3 --oneline` e o código atual. O checklist mestre relaciona pedidos, origem nos chats, status e próximos passos; os documentos de especificação e implementação listados abaixo são a fonte de detalhes.

## Estado do workspace nesta passagem

- Branch atual: `main`.
- A continuação atual fechou novas fatias locais em 16/10/2026: otimização de coleta, tour `recipe-workshop`, guards/RLS, ciclo de vida do `WorkspaceStore`, extração CSS e rollout visual das fases 1–2. Leia as seções 134 e 138–139 de `docs/ACTIVE_CONTEXT.md` e confira commits/status antes de agir.
- Entregas implementadas nesta continuação: `0185b87` (indexação dos lookups do Coach), `205dee4` (Home/Roadmap dinâmico) e `8cf0283` (Tutoriais guiados com Driver.js). Também foram criados `1308342` (teste do canvas acessível do Mercado) e `53ed17b` (formatação/Prettier). Confira o histórico real antes de agir.
- Fase 2: `b90f83d` (Mercado) e `bd0140b` (Receitas/oficina). A atualização documental segue em commit próprio. Não faça push/deploy.
- O gráfico Chart.js do histórico do Mercado está commitado em `6d22a75`; recebeu validação adicional de lacunas e métrica em `128` do `ACTIVE_CONTEXT.md`.
- Home/Roadmap e a biblioteca de Tutoriais Guiados estão implementados e commitados. Os planos de implementação registram detalhes e pendências; não reimplemente essas entregas do zero.
- Nesta rodada, `pnpm check` passou; `pnpm test` passou com 1.011 aprovados e 1 ignorado; o build de produção concluiu sem erro de CSS. O bundle inicial é 600,57 kB bruto / 158,90 kB estimados transferidos e excede o aviso de 500 kB. Persistem avisos de dados de locale `pt-BR` usando `pt` e dependências CommonJS no OCR; não aumentar budgets para ocultar custo.
- A migração de identidade/RLS `0013_identity_rls.sql`, as migrações do tutorial e o seed foram exercitados num PostgreSQL descartável em `tmpfs`. O endpoint isolado retornou quatro etapas do `recipe-workshop`; nenhum seed/migration foi aplicado ao banco local persistente, staging ou produção. A página existente em `4200` continua sem o guia até ativação autorizada nesse ambiente.
- Prompt reutilizável para a continuidade: `docs/ANTIGRAVITY_CONTINUATION_PROMPT.md`; o commit documental mais recente deve ser conferido com `git log`.
- A seção 128 de `docs/ACTIVE_CONTEXT.md` registra a validação visual do Chart.js em desktop e mobile, para métricas de preço, estoque e negociações por intervalo. A seção 126 é o histórico da implementação inicial, anterior à validação visual.
- O Market Board tem subcategorias expansíveis, ação para limpar filtros, paginação/itens por página acima da tabela e skeletons no primeiro carregamento. A revisão adicional em 390×844 e por teclado passou sem overflow/falha de foco; a cobertura de liquidez continua parcial porque negociação observada não equivale a unidades vendidas garantidas.

## Prioridades de continuação

### Rollout visual inspirado na Roadmap

- O usuário aprovou a direção de consistência visual progressiva para as telas principais. A especificação está em `docs/superpowers/specs/2026-10-16-roadmap-inspired-visual-rollout-design.md`.
- Não copie a timeline da Roadmap para páginas que não sejam sequenciais. Preserve a tabela do Mercado, a árvore de crafting, as decisões financeiras e a revisão explícita do Scan; reutilize a hierarquia, os painéis, os status e a linguagem bronze/carvão.
- Estado: fases 1 (Home/Recomendações) e 2 (Mercado/Receitas) executadas e documentadas nos planos `docs/superpowers/plans/2026-10-16-roadmap-visual-phase-{1,2}.md`. O usuário já aprovou o rollout progressivo; continuar pelas telas de Armazém/Scan/Personagem/Gear e depois utilitários, sem pedir aprovação repetida. Os desenhos devem preservar o fluxo de revisão do Scan e os componentes específicos das telas.

### Estado das entregas aprovadas (16/10/2026)

- **Otimizador**: a entrada do worker agora preserva estimativas de coleta confirmadas para materiais alcançáveis mesmo quando há receita produtora. Regressões Web e do solver passaram. O limite real é de 10.000 estados; se excedido, nenhum ótimo é certificado.
- **Maestria**: testes pareados em Culinária, Alquimia e Processamento confirmam que as métricas financeiras mudam nos caminhos testados, mas o relato do usuário não foi reproduzido com o fixture/sessão local disponível. Se persistir, pedir/registrar receita, valores antigo/novo, profissão, quantidade, rendimento manual, estratégia e dados de preço.
- **Tour da oficina**: guia separado `recipe-workshop`, quatro etapas e seed idempotente independente. Migração/seed foram exercitados em PostgreSQL descartável `tmpfs`; primeira execução inseriu seis guias, segunda preservou os seis e o endpoint de oficina retornou quatro passos. Não repetir a implementação nem executar seed em banco persistente sem autorização.
- **Autorização**: `/plans` e `/settings` ganharam guards; tabelas de identidade têm RLS/`FORCE ROW LEVEL SECURITY`, contexto de identidade é definido dentro das transações e a migração `0013` passou num banco efêmero. Isto reduz leituras/escritas acidentais no banco, mas não protege contra comprometimento das credenciais da API, que pode forjar GUCs.
- **Mercado/OCR**: viewport estreito/teclado e fluxos de perfil, gear e armazém foram auditados sem defeito funcional reproduzido. O corpus OCR tem 13 capturas/29 rótulos todos em calibração; ainda não existe split independente de avaliação, portanto não há declaração de acurácia.
- **Dados de teste**: `/demo` já monta um workspace demonstrativo em memória com personagem/família, gear de 15 slots, maestrias, materiais por armazém/inventário, cotações simuladas e cenários de sessão/equipamento. A identidade vem do catálogo; preços/atributos sintéticos são rotulados como demonstração e as alterações duram a sessão. O CLI de staging `pnpm --filter @bdo/api workspace:seed-test-profile` também já existe, mas exige `APP_ENV=staging`, conta social allowlisted e `STAGING_TEST_FIREBASE_UID`; não foi executado.

### Próximas etapas — dependências locais e externas

- **Build**: o budget CSS deixou de falhar após extrações por subcomponente. Continuar reduzindo o bundle inicial de 600,57 kB com otimização segura; observar warnings de locale e CommonJS.
- **Execução local**: o preview `4203` não é permitido por `WEB_ORIGIN` e não deve ser adicionado ao CORS por causa deste teste. Na origem `4200`, o Mercado carregou 407 itens em cache (API 200). `production-quotes` retornou 503; o upstream Arsha respondeu 500 com mensagem de bloqueio Imperva, portanto não contornar. O banco persistente ligado à página `4200` segue sem o guia `recipe-workshop`; não limpar localStorage nem aplicar migrations/seeds a esse volume.
- **Banco/tutorial**: migrações, seed repetido e endpoint público foram validados em um PostgreSQL `tmpfs` descartável dedicado; o container e API de teste foram encerrados. O seeder leu o `.env` do projeto, cujo Firebase parcial faz o CLI falhar sem overrides; no smoke test, os cinco campos Firebase foram esvaziados apenas no processo e nenhum arquivo/segredo foi alterado. Não usar o volume persistente atual, staging ou produção.
- **Google/Steam**: login end-to-end segue bloqueado por configuração Firebase Console/credencial Admin não disponível; não inventar segredo nem mexer em IAM.
- **Maestria/Valência**: manter aberto até obter reprodução concreta ou premissas pareadas confiáveis para a divergência histórica.
- **OCR**: obter capturas independentes autorizadas e revisadas para avaliação; não pontuar nem promover modelo a partir apenas do conjunto de calibração.
- **Dados do mercado**: não tratar contagem de negociações como volume líquido; novas fontes exigem licença/cobertura autorizada.

### 0. Validar visualmente o Market Board

A inspeção da fase 2 em 390×844 não encontrou overflow horizontal em Mercado, catálogo de Receitas ou oficina; a tabela mantém rolagem interna própria. O resumo visual da fase 2 está em `docs/superpowers/plans/2026-10-16-roadmap-visual-phase-2.md`. Requests de Mercado/cotações falharam no preview e não permitem validar dados reais nesta rodada; o tour não foi semeado.

### 1. Bundle de produção — CSS aprovado; bundle segue em otimização

`pnpm --filter @bdo/web build` concluiu sem erro de budget CSS. O bundle inicial é 600,57 kB bruto / 158,90 kB estimados transferidos, acima do aviso de 500 kB; `pt-BR` usa fallback `pt`, e Tesseract/`regenerator-runtime` geram warnings CommonJS. Otimize sem elevar budgets ou remover regras ativas. Driver.js continua lazy (~27 kB).

### 2. Validar o Tutorial Guiado em banco descartável

O tour `recipe-workshop` está implementado, mas seu guia não foi semeado. Antes de escrever, confirme que a URL resolve para um PostgreSQL descartável; aplique migrações pendentes (`0011`–`0013`) e execute `pnpm --filter @bdo/api tutorials:seed` nesse banco. Confira `/tutorials/manage` com identidade admin e a execução do tour. O banco local persistente, staging e produção não foram alterados.

### 3. Gráfico do Mercado — entregue

O gráfico conectado já foi validado visualmente com preço, estoque e negociações, incluindo lacunas e estados sem dados, conforme seção 128 de `ACTIVE_CONTEXT.md`. Preserve a interpretação de intervalo; não converta contagem de negociações em unidades vendidas nem em liquidez garantida.

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

## Pendências e limitações confirmadas em 16/10/2026

- **Build produção**: a verificação de 16/10 concluiu sem erro de budget CSS; bundle inicial 600,57 kB excede o aviso de 500 kB, mas não o erro de 1 MB. Otimização segura do bundle continua aberta.
- **Tutorial em banco local**: `recipe-workshop` está no código, mas não foi semeado. Migrações `0011`–`0013` não foram aplicadas ao banco persistente; confirmar destino local descartável antes de migrar/semear e validar a tela administrativa e os tours. Script: `pnpm --filter @bdo/api tutorials:seed`.
- **Coach**: o Map acelerou busca de rótulos/ícones, não o cálculo de cenários. A medição sintética foi ~11,06 s para 4.222 receitas e 12.666 cenários pendentes. A divergência de lucro/h da Refeição de Valência segue sem comparação pareada; conferir `docs/research/activity-coach-competitive-review.md` antes de mudar fórmulas.
- **Autenticação e staging**: login Google real segue bloqueado pelo Firebase Console/credencial Admin. A demonstração local e o seed sintético seguro de staging já existem, mas o segundo requer credenciais e identidade de teste do staging; não preencher dados remotos nem compartilhar segredos.
- **OCR**: seguir os documentos de corpus/calibração e manter revisão humana do resultado extraído para armazenamento, inventário, maestria, peso e personagens.
- **Verificação**: em 16/10, `pnpm check` e `pnpm test` passaram (1.011 aprovados, 1 ignorado); build de produção concluiu com warning de bundle inicial, locale `pt-BR`→`pt` e CommonJS OCR, sem erro de CSS. SSR de produção ainda não foi validado.

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
2. Não reimplemente itens concluídos: Mercado responsivo, gráfico Chart.js, correção de coleta no otimizador, tour de oficina no código e guards/RLS. Confira a seção 134 de `ACTIVE_CONTEXT.md`.
3. Se houver banco PostgreSQL realmente descartável, aplique migrações e seed do tour nesse destino isolado e valide o editor/execução; nunca use o volume persistente/staging/produção nesta tarefa.
4. Retome login Google somente quando o Firebase Console permitir listar/configurar o projeto; não altere IAM nem exponha credenciais. Mantenha personagem, gear, armazém e OCR em dados de teste locais com revisão humana.
5. Para CSS do Recipe Tree, proponha extração em subcomponentes e evidência visual antes de alterar estilos ativos; não elevar budgets nem remover estados funcionais para satisfazê-los.
6. Mantenha as decisões de produto e compare BDO Workshop, BDO Codex, BDOLytics e Garmoth antes de futuras features. Trate dados faltantes como pendentes, sem inventar preços, liquidez, loot ou rendimento.
