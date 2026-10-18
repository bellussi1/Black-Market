# Handoff do Black Market para Antigravity

- **Atualizado em:** 18/10/2026
- **Projeto:** Black Market — planejador para Black Desert Online
- **Objetivo:** permitir que o Antigravity retome o trabalho sem depender do histórico dos chats do Codex.

Este é um índice de retomada, não substitui as instruções nem os documentos detalhados do projeto. Leia primeiro `AGENTS.md`, `docs/ACTIVE_CONTEXT.md` e [`docs/project-feature-checklist.md`](project-feature-checklist.md); depois confira `git status`, `git log -n 3 --oneline` e o código atual. O checklist mestre relaciona pedidos, origem nos chats, status e próximos passos; os documentos de especificação e implementação listados abaixo são a fonte de detalhes.

> **Retomada de 18/10/2026:** §§161–165 de `ACTIVE_CONTEXT.md` registram a correção de subproduto (“Comida Retirada”), fallback de tutorial sem seed, deferimento do shell, grupos da navegação MVP e filtragem dos ícones do shell. Bundle inicial atual 499,47 kB/134,68 kB estimados em transferência, 0,53 kB abaixo do aviso de 500 kB. `pnpm check`, build serial, `pnpm test:ssr` e `pnpm test` passaram; suíte: 1.154 aprovados e um ignorado por exigir PostgreSQL descartável. O código de performance está no commit `4366417`; navegação nos commits `6aa9391` e `2dfe6bb`. Sessão autenticada, fontes/corpus externos e QA privado/leitor de tela seguem como dependências. Branch `codex/audit-remediation`; preservar o plano preexistente não rastreado de fase 3; sem push/deploy.

## Registro histórico de passagens anteriores

- Branch registrada naquela passagem: `main`; a branch atual está indicada na retomada acima.
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

### 2. Validar o Tutorial Guiado — fallback local entregue

Quando não existe linha para o guia, a API serve o conteúdo pt-BR versionado. Um guia ativo no banco prevalece; uma linha desativada mantém o tour desligado. O endpoint local retornou quatro etapas sem gravar no banco. Consulte `docs/research/tutorial-versioned-fallback-review-2026-10-18.md`; falta QA visual do launcher/fluxo em sessão legítima. Não há necessidade de seed para testar a oficina local.

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

### Atualização — navegação autenticada (16/10/2026)

Atalhos de áreas protegidas permanecem visíveis para visitantes e levam à tela `/account` via `authGuard`, preservando o destino. `Meus planos` foi reativado no escopo Screenshot MVP; `Dados e backup` foi incluído no menu. Veja `docs/ACTIVE_CONTEXT.md` §147, o checklist e `docs/research/authenticated-navigation-competitive-review-2026-10-16.md`. `pnpm check`, smoke SSR e specs focados passaram; `pnpm test` completo teve timeouts de 5 s em specs pesados diferentes, que passaram isolados. Repetir a suíte global e CI com carga normal. A configuração real Firebase/Google/Steam segue pendente.

## Instrução direta para o próximo agente

1. Leia `AGENTS.md` e este handoff; depois confira `docs/ACTIVE_CONTEXT.md`, branch, `git status` e os três últimos commits. Preserve mudanças presentes no workspace.
2. Não reimplemente itens concluídos: Mercado responsivo, gráfico Chart.js, correção de coleta no otimizador, tour de oficina no código e guards/RLS. Confira a seção 134 de `ACTIVE_CONTEXT.md`.
3. Se houver banco PostgreSQL realmente descartável, aplique migrações e seed do tour nesse destino isolado e valide o editor/execução; nunca use o volume persistente/staging/produção nesta tarefa.
4. Retome login Google somente quando o Firebase Console permitir listar/configurar o projeto; não altere IAM nem exponha credenciais. Mantenha personagem, gear, armazém e OCR em dados de teste locais com revisão humana.
5. Para CSS do Recipe Tree, proponha extração em subcomponentes e evidência visual antes de alterar estilos ativos; não elevar budgets nem remover estados funcionais para satisfazê-los.
6. Mantenha as decisões de produto e compare BDO Workshop, BDO Codex, BDOLytics e Garmoth antes de futuras features. Trate dados faltantes como pendentes, sem inventar preços, liquidez, loot ou rendimento.

### Atualização — rebuild e auditoria local (16/10/2026)

A solicitação para rebuildar localmente e validar dados/cálculos foi atendida. `pnpm build`, `pnpm check`, `pnpm test:ssr` e `pnpm test` passaram. Suíte: Calculators 68, API 247 (1 ignorado por exigir banco descartável), Web 635, scripts/OCR 73 — 1.023 aprovados e 1 ignorado. O build permanece com aviso de bundle inicial 601,37 kB (>500 kB de aviso), dados de locale `pt-BR`→`pt` e dependências CommonJS do OCR.

Web em `4200`, API em `3000` e PostgreSQL responderam; `/health`/`/ready` 200. O `.env` Firebase parcial impede o startup padrão da API. Para o smoke, apenas o processo local rodou com as variáveis Firebase vazias: a configuração de identidade retornou todos os provedores desligados. `.env` e credenciais não foram editados. Login social real permanece pendente.

Receita SA/pt #9601 local verificada: 100 operações, Culinária 1.000 → rendimento médio 276,7 (UI arredonda 276), bruto 8.024.300 e líquido 6.780.533; Culinária 0 → 250 unidades, bruto 7.250.000 e líquido 6.126.250. A retenção observada de 84,5% corresponde a imposto base 35% com Value Pack. Quatro dos cinco insumos estão sem estoque e sem preço máximo utilizável; por isso custo, lucro e lucro/hora ficam pendentes. O preço do produto estava 29.000 com estoque 26.579, mas o cache da página já estava envelhecido (~7 min); não declarar como cotação em tempo real.

API retornou 4 observações de mercado do item 9601 e 11 do 9417 entre 14–16/10. O gráfico Chart.js preenchido foi renderizado no browser; a consulta on-demand de #9601 durante o smoke persistiu automaticamente uma observação em `market_snapshots` (29.000, estoque 36.579, 14:47Z). A origem é `market_snapshots`; `market_price_points` vazia é uma tabela diferente/legada. A amostra não certifica tendência nem volume em unidades. Arsha permanece fonte comunitária de consulta sob demanda, sem autorização suficiente para coleta automática.

O texto de ajuda do cálculo foi corrigido para distinguir cotação atual com estoque do fallback à máxima anunciada. O teste foi executado em RED e GREEN; XLIFF atualizado. Consulte `docs/ACTIVE_CONTEXT.md` §148 e `docs/project-feature-checklist.md`. Não houve seed/migration, alteração de esquema/dataset, mudança `.env`, coleta periódica, push ou deploy; a chamada normal de cotação de #9601 persistiu automaticamente um snapshot em `market_snapshots`. Mantenha o plano não rastreado `docs/superpowers/plans/2026-10-16-roadmap-visual-phase-3.md` fora do commit.

### Atualização — paginação de Receitas e estados de carregamento (16/10/2026)

`/recipes` solicita 25 receitas por página (antes 24), reserva 25 cards no skeleton inicial e cobre os cards atuais com skeleton durante paginação/filtro, preservando sua geometria e desativando interação até a resposta. Foram adicionados skeletons para a consulta inicial de item, detalhes/ramos da árvore e busca compartilhada do catálogo; o otimizador usa o indicador global de loading.

O rollout também cobre os estados assíncronos auditados em Catálogo, Crafting, Mercado, World/Empire, Home, Roadmap, Recomendações, Conta, Armazém/Stock, OCR, Reference/equipamento, administrações de Roadmap/tutoriais, Demo, launcher do tour e conferência de cálculo. Estados anunciam progresso/busy de forma acessível, preservam espaço e respeitam `prefers-reduced-motion`. Ações locais síncronas não recebem loaders artificiais. O lookup de ícones em Stock é cacheado por região e IDs visíveis para não repetir requisições ao editar.

Verificações em 16/10: `pnpm check` passou; `pnpm test` passou com 1.059 testes aprovados e 1 ignorado (PostgreSQL descartável); `pnpm --filter @bdo/web build` passou; XLIFF extraído (1.547 mensagens). O build não reporta estouro dos budgets CSS de Catálogo ou Recipe Tree. Seguem os avisos existentes: bundle inicial Web de 601,37 kB frente ao aviso de 500 kB, locale `pt-BR`→`pt` e módulos CommonJS do OCR. Pesquisa concorrencial e limites em `docs/research/ui-loading-competitive-review-2026-10-16.md`.

Ainda falta inspeção browser em cada rota e medição de CLS em produção; o checklist permanece parcial até essa evidência. Consulte `docs/ACTIVE_CONTEXT.md` §149. Preserve o plano não rastreado `docs/superpowers/plans/2026-10-16-roadmap-visual-phase-3.md`; não inclua no commit.

### Atualização — continuação do checklist (16/10/2026)

A otimização global de fórmulas e alternativas recursivas foi aprovada no escopo; cada plano escolhe uma fórmula única por item intermediário (sem dividir demanda entre fórmulas). A análise identificou que o grafo mantém um produtor por item e que a busca não seleciona fórmulas intermediárias. Especificação e plano estão em `docs/superpowers/specs/2026-10-16-recursive-recipe-alternative-optimizer-design.md` e `docs/superpowers/plans/2026-10-16-recursive-recipe-alternative-optimizer.md`; aguardar revisão do plano antes de editar o solver. Preservar o limite atual de 10.000 estados e nunca rotular candidato parcial como ótimo certificado.

A revisão de peixe fresco/seco em docs/research/fish-price-equivalence-review-2026-10-16.md não sustenta alterar o ratio 1:1 atual: relações DRY não são equivalências culinárias e os valores públicos divergem num exemplo. Preservar como dado não verificado até obter relação versionada por ID ou validar no cliente SA/PT.

O seletor de região deixou de carregar FormsModule no shell; bundle inicial medido caiu de 601,37 para 553,57 kB, ainda 53,57 kB acima do aviso de 500 kB. QA em 1440×900/390×844 confirmou skeleton na paginação e CLS ~0,050 em Receitas, sem overflow de página em Receitas/Mercado; a tabela do Mercado rola horizontalmente em 390 px. Armazém, Família, Gear e Scans redirecionam para Conta porque o login social está desconfigurado, então suas telas protegidas não puderam ser revistas. Veja docs/ACTIVE_CONTEXT.md §150 e o checklist mestre.

Verificação global desta retomada: pnpm check passou. pnpm test passou (Calculators 68, API 247 + 1 ignorado por banco descartável, Web 672, scripts/OCR 73 — 1.060 aprovados e 1 ignorado). Run remoto CI não foi disparado; build de produção atual do Web em 553,57 kB.

### Atualização — readiness de login Google/Steam local e staging (16/10/2026)

Os fluxos sociais no código já existem; a configuração externa ainda não. Hoje `identity/config` retorna Google/Steam desligados em `localhost:3000` e no staging `localhost:8081`. O `.env` local contém somente a configuração pública do Firebase, sem credencial Admin/callback Steam. `.env.staging` ainda não tem campos Firebase. Nenhum segredo foi exposto nem alterado.

Foi adicionado smoke opt-in: `pnpm test:auth:local` consulta apenas a API em `localhost:3000`; `pnpm test:auth:staging` verifica `localhost:8081` e SSR/catalog/noindex. Com Quick Tunnel, definir `$env:STAGING_URL` antes. Ambos exigem Firebase, Google e Steam ativos. `pnpm test:staging` passou e CI continua sem depender de credenciais. `scripts/smoke-staging.test.mjs` passou 5/5. `pnpm check` passou. `pnpm test` passou em Calculators (68) e API (247, 1 ignorado), e 655 specs Web, mas teve 17 timeouts de 5 s em 9 specs pesados e não chegou à etapa Node scripts. O spec adicionado passou isoladamente. Os smokes autenticados local/staging falham agora porque Firebase está desativado.

Documentação operacional: `docs/staging-local.md`; checklist: `docs/project-feature-checklist.md`; histórico: `docs/ACTIVE_CONTEXT.md` §151. Nesta retomada, Firebase Authentication foi inicializado no projeto local. O provedor Google ainda não foi salvo, porque o Console exige nome público e e-mail de suporte que pode aparecer aos usuários; aguardamos escolha do mantenedor. O projeto Firebase de staging ainda não foi criado (a nova aba não anexou no navegador e não houve criação). Próximos passos: concluir o provedor Google, configurar projetos separados, autorizar hostnames, manter credencial Admin somente nos envs locais privados, configurar callback Steam local e validar os dois logins reais. Não afirmar E2E concluído até usar os smokes e verificar `/api/v1/identity/me`, `/workspace` e retorno protegido após login real.

### Correção — configuração Firebase Google e staging local (16/10/2026)

Atualização factual: os projetos `black-market-bdo-local` e `black-market-bdo-staging` existem; Authentication e somente Google estão ativos nos dois, `localhost` está autorizado, e o app web do staging foi registrado sem Analytics/Gemini. Contato de suporte foi selecionado conforme autorização do usuário. Steam permanece implementada pelo backend OpenID e não aparece como provedor Firebase.

Login no runtime ainda depende de uma chave Firebase Admin exclusiva para cada projeto. O mantenedor deve gerá-las e baixá-las diretamente para local protegido; nunca colar a chave no chat. Depois de informar os caminhos dos arquivos, pedir autorização específica para lê-los e preencher `.env` e `.env.staging`; não gravar configuração parcial. Só então reiniciar/rebuildar API/staging e executar os dois smokes autenticados e login real pelo browser.

Foi corrigida a incompatibilidade local: o gateway escuta HTTP em `localhost:8081`, mas o script usava HTTPS no callback Steam e origem. O teste de regressão falhava antes do fix; `env.schema.ts` agora aceita HTTP só para loopback em `APP_ENV=staging`, mantendo HTTPS para Quick Tunnel/domínios públicos e produção. `staging.ps1` define a origem/callback local para `Start`/`Update`, e devolve a origem local ao fim de `Share`. A suíte da API passou com 248 testes e 1 ignorado; `pnpm check` passou; parser do PowerShell passou. Angular continua avisando que locale `pt-BR` usa dados `pt`. A suíte global `pnpm test` após essa alteração ainda está pendente.

Fontes de continuidade: checklist em `docs/project-feature-checklist.md`; detalhes e bloqueios em `docs/ACTIVE_CONTEXT.md` §151 e `docs/staging-local.md`. Preserve o plano não rastreado `docs/superpowers/plans/2026-10-16-roadmap-visual-phase-3.md` fora do commit.

### Atualização — verificação da configuração Google/staging (16/10/2026)

Após habilitar Google nos dois projetos Firebase com autorização do usuário, foram repetidos os checks. `pnpm check` passou; `pnpm test` passou com Calculators 68, API 248 (1 ignorado por exigir banco PostgreSQL descartável), Web 672 e scripts/OCR 78 — 1.066 aprovados e 1 ignorado. `pnpm -r --workspace-concurrency=1 --if-present build` passou para todo o monorepo, incluindo build de produção e SSR. Bundle inicial Web: 553,57 kB, acima do aviso de 500 kB; permanecem avisos de locale `pt-BR` usando `pt` e CommonJS do Tesseract.

Uma tentativa de `pnpm build` com a concorrência padrão encerrou uma vez com código nativo `3221225477` enquanto API e Web compilavam em paralelo. O build de Web isolado e o build serial completo passaram; causa não confirmada, sem mudança no script global. O teste de regressão do staging segue no conjunto da API. Login E2E ainda depende de duas chaves Admin Firebase locais e da configuração Steam, portanto não foi declarado habilitado no runtime.

Próximo passo: o mantenedor baixa as chaves Admin direto do Console, salva cada uma em arquivo local protegido e informa os caminhos com autorização específica para ler/converter somente para `.env` e `.env.staging`. Não pedir nem enviar o conteúdo no chat. Em seguida, reiniciar/rebuildar API e staging, rodar os smokes autenticados e validar Google, Steam, `/api/v1/identity/me`, `/api/v1/workspace` e retorno protegido. Nenhuma credencial, banco persistente, seed, push ou deploy foi alterado nesta etapa.

### Atualização — autorização para continuidade local/staging (16/10/2026)

O usuário autorizou a continuação autônoma e a leitura/manipulação das configurações locais e de staging. `.env` contém a configuração Web pública do Firebase local, mas não Admin key nem callback Steam; `.env.staging` ainda não tem campos Firebase. O app Web e a conta de serviço Admin SDK existem no projeto de staging; a configuração Web pública foi consultada sem registrá-la aqui. Nenhum arquivo JSON de conta de serviço foi encontrado na busca limitada a `data/`, `apps/` e Downloads.

A geração de uma chave Firebase Admin por projeto cria credenciais persistentes privilegiadas. Antes de clicar em “Generate new private key” em cada projeto, obter confirmação específica no momento da ação, conforme a política de uso do Console. Após confirmação, salvar os JSONs fora do repositório com ACL local restrita, preencher os envs ignorados pelo Git sem imprimir chaves, iniciar/reconstruir API/staging e validar login real. O seed sintético só vem depois de mapear o usuário de staging e verificar explicitamente o alvo do banco.

### Atualização — downloads Admin não acessíveis no navegador embutido (16/10/2026)

O usuário autorizou criar/configurar as chaves local e staging e, após falha no primeiro download staging, autorizou substituir essa chave e revogar a primeira. A pasta protegida `%LOCALAPPDATA%\BlackMarket\firebase-admin\` tem ACL para usuário atual e `SYSTEM`, mas permanece vazia. O navegador embutido não entregou os JSONs ao disco; nenhum segredo foi lido ou escrito em envs. A trilha Cloud Audit correlacionou sem ambiguidade a primeira criação de chave staging; a chave correspondente foi revogada e o Console confirmou a exclusão. Restam 3 chaves geradas ativas em staging e 1 local, sem arquivos privados acessíveis.

`identity/config` local (`localhost:3000`) e staging (`localhost:8081`) continuam com Google/Steam desligados. Env files permanecem inalterados. Não reiniciar com Firebase parcialmente configurado nem instalar CLI pedindo escopos amplos. Após essa tentativa, o Console criou uma nova chave staging e confirmou o download, mas o navegador embutido não entregou o JSON ao disco; buscas em Downloads, Temp, diretórios Codex/OpenAI e pasta protegida não encontraram o arquivo. O IAM agora mostra 3 chaves ativas em staging e 1 local. Para continuar, o mantenedor precisa gerar chaves substitutas para os dois projetos em navegador que salve downloads localmente e guardá-las na pasta protegida; não compartilhar o conteúdo no chat. Depois, configurar envs completos, rebuild/restart, smokes autenticados e login real. As demais chaves continuam intactas; não fazer limpeza adicional sem autorização. Ver `docs/ACTIVE_CONTEXT.md` §153, `docs/staging-local.md` e `docs/project-feature-checklist.md`.

Nesta retomada, `pnpm check`, o build serial completo do monorepo e `pnpm test:staging` passaram. `pnpm test:auth:local` e `pnpm test:auth:staging` falharam corretamente porque `Firebase Authentication está desativado`. Build Web inicial: 553,57 kB, +53,57 kB acima do aviso; continuam os avisos de locale `pt-BR`→`pt` e CommonJS do Tesseract. Nenhum container ou processo API em execução foi reconstruído/reiniciado com env incompleto.

### Atualização — chaves Admin recebidas e autenticação configurada (16/10/2026)

O usuário anexou os JSONs Admin de `black-market-bdo-local` e `black-market-bdo-staging` e autorizou utilizá-los. Os `project_id` foram validados sem imprimir as chaves; `.env` e `.env.staging` agora têm a configuração completa e callbacks Steam locais. Ambos são ignorados pelo Git e têm ACL restrita à conta Windows atual e `SYSTEM`. Não copiar segredos para código, documentação ou commits. Esta atualização supersede as notas anteriores de credenciais inacessíveis.

Staging foi reconstruído por `scripts/staging.ps1 -Action Update`, com backup e migrações bem-sucedidas. API local compilada e reiniciada. `pnpm test:auth:local`, `pnpm test:auth:staging` e 31 testes focados passaram; o Auth API aceitou cada credencial em consulta por UID aleatório inexistente, sem ler/criar contas, e ambas assinam custom tokens. Os dois endpoints Steam iniciam redirecionamento OpenID com callback correto. `/account` responde 200 em `http://localhost:4200` e `http://localhost:8081`.

Falta apenas validar login interativo com consentimento Google/Steam e sessão (`/identity/me`, `/workspace`, retorno protegido). Faça login em `/account` nos dois endereços; só depois, se necessário, configure `STAGING_TEST_FIREBASE_UID` e rode `SeedProfile`. Não foi feito seed nem deploy externo. O build mantém avisos Angular de orçamento inicial (553,57 kB), locale `pt-BR`→`pt` e CommonJS do Tesseract. Consulte `docs/ACTIVE_CONTEXT.md` §154 e `docs/staging-local.md` para o estado atual.

### Atualização — prompt e auditoria integral (16/10/2026)

- O prompt dos cinco chats foi refinado e executado nesta sessão, sem editar aplicação/testes/configurações. Prompt e relatório em `docs/research/full-product-audit-prompt-2026-10-16.md` e `docs/research/full-product-ui-calculation-performance-audit-2026-10-16.md`; JSON com rotas, inventário e medidas em `docs/research/evidence/full-product-audit-2026-10-16.json`.
- 20 achados AUD-01–20: P1 na recuperação local atrás do login e na equivalência 1:1 de peixe usada no custo; P2 incluem SSR/CLS Home 0,1602–0,2127, novo modal/Settings, marcas sociais, falha de rede confundida com login desconfigurado, origem de tempos padrão, arredondamento e heading/paginação. Validação autenticada e corpus independente continuam pendentes.
- APIs/bancos prontos e Google/Steam ativos; smokes local/staging passaram. Chart.js local com 34 pontos e tabela textual; staging histórico vazio é diferença de dados. pnpm test: 1.066 aprovados e 1 ignorado. Build serial completo passou; inicial 553,57kB. Node observado 24.13.0 não satisfaz ^24.15.0. pnpm check final e git diff --check passaram; documentação final conferida com Prettier.
- Pesquisa dos quatro concorrentes revalidada com limites; sem benchmark matemático pareado nem dados externos copiados. Não houve push/deploy, seed, credenciais novas, coleta periódica ou mudanças pessoais. Plano não rastreado da fase 3 preservado.
- Próxima ação: aguardar a revisão dos achados e escopo das correções. Não iniciar implementação do otimizador/plano antigo nem reconfigurar Firebase por causa de registros históricos.

### Correção da listagem de subprodutos (18/10/2026)

Na página 4 da listagem de Culinária, o item 9711 (“Comida Retirada”) aparecia como produto principal por falta de metadado estrutural, embora a descrição do catálogo o marque como subproduto aleatório. O filtro agora exclui esse caso e mantém o item na busca/ficha; a API local retorna 25 receitas na página 4, total 543 e zero ocorrências do nome. A ficha de produtores retorna total zero. Veja `docs/research/recipe-byproduct-listing-review-2026-10-18.md` e `docs/ACTIVE_CONTEXT.md` §161.

O fix da receita e o fallback do tutorial são mudanças separadas. Próximo passo técnico: manter a taxonomia de subprodutos estruturada na próxima extração e fazer QA visual do tutorial. Crie commits de responsabilidade única com listas explícitas de arquivos, preserve o plano de fase 3 não rastreado e não faça push/deploy.

### Atualização — rebuild e redução do shell (18/10/2026)

O build serial completo, `pnpm check`, `pnpm test` (1.153 aprovados/1 ignorado) e `pnpm test:ssr` passaram em Node 24.21.0. O shell inicial caiu de 546,01 kB para 503,18 kB; transferência estimada 135,20 kB. Ainda excede o aviso de 500 kB em 3,18 kB, sem alteração do budget. Ver `docs/research/shell-bundle-deferral-review-2026-10-18.md`, checklist e `docs/ACTIVE_CONTEXT.md` §163.

Botões/select do shell não carregam o sistema de fusão de classes no bundle inicial, e o painel de privacidade é deferido até consentimento pendente ou abertura pelo rodapé. QA visual de `/recipes` em desktop/390×844 e SSR passou. HMR local emite NG0751 e carrega `@defer` eager; o grafo de produção confirma a separação, mas a rede lazy não foi observada no browser de desenvolvimento. Próximo passo: cortar os 3,18 kB restantes com medição e manter o orçamento; preservar o plano visual 3 não rastreado. Commits separados de código e documentação, paths explícitos; sem push/deploy.

### Atualização — Home, Profissões públicas e login social (18/10/2026)

Home reorganizada para colocar busca rápida de item e atalho público para `/lifeskills` antes dos focos dinâmicos do Roadmap. O seletor compacto mantém a busca por nome/ID sem categoria; os filtros completos continuam em Receitas. Estados de carregamento/erro/vazio dos focos foram preservados. A rota `/lifeskills` não usa mais `authGuard`: visitantes podem registrar sessões localmente, enquanto login continua necessário para sincronização entre dispositivos.

Os botões Google/Steam agora compartilham a mesma grade e área de clique de 52px, ficam lado a lado em telas largas e empilham com largura completa em telas estreitas. As imagens existentes mantêm proporção original; foco, hover, espera/desabilitado e `prefers-reduced-motion` têm tratamento visual. Pesquisa e limites em `docs/research/home-social-login-ui-review-2026-10-18.md`.

RED/GREEN focado passou em 48/48 testes de Home, conta/login, guardas, rotas e navegação. QA visual de browser local não foi executado: a política do navegador recusou autoridade para observar `localhost:4200`; não contornar com outra superfície. `pnpm check`, `pnpm test` (1.156 aprovados, 1 ignorado por depender de PostgreSQL descartável), build serial `pnpm build` e `pnpm test:ssr` passaram. O bundle inicial ficou em 499,40 kB/134,65 kB estimados transferidos; avisos atuais são locale `pt-BR`→`pt` e CommonJS do OCR. XLIFF extraído. Commits locais `5bde953` (social), `4174763` (Home/Profissões) e `7423be8` (catálogo XLIFF) concluídos; esta documentação segue em commit próprio. Revisar Home e Settings visualmente quando o acesso estiver disponível e validar login OAuth Google/Steam real. Preservar o plano não rastreado de fase 3; commits locais atômicos, sem push/deploy.
