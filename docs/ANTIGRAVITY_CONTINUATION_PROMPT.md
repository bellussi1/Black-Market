# Prompt de continuidade — Black Market BDO (Antigravity)

Você está no repositório do **Black Market**, um planejador para Black Desert Online. Codex e Antigravity alternam o desenvolvimento; use os documentos versionados como fonte de continuidade. O público inicial é a comunidade de BDO da região SA, em português brasileiro. O produto deve ajudar jogadores a planejar Life Skills, usar o armazém, escolher o que produzir/comprar e entender custos, rendimento e lucro com premissas verificáveis.

## Escopo aprovado e estado atual (16/10/2026)

O usuário autorizou implementar as pendências aprovadas, com documentação e commits atômicos. O tour `recipe-workshop` e o rollout visual progressivo foram aprovados. As fases visuais 1 (Home/Recomendações) e 2 (Mercado/Receitas) estão concluídas; fase 2 está nos commits `b90f83d` e `bd0140b`. Confira `git status`, histórico e `docs/ACTIVE_CONTEXT.md` §§134, 138–139. Não peça nova aprovação para as fases já aprovadas nem reimplemente o que já está entregue.

1. **Maestria e resultado financeiro** — foram adicionados casos pareados para Culinária, Alquimia e Processamento que verificam mudanças em faturamento bruto/líquido, lucro e lucro/hora. Os caminhos testados passam, mas o relato do usuário não foi reproduzido com o fixture/sessão local disponível. Não alterar regras do jogo sem evidência. Se o problema persistir, registrar receita, profissão, maestria antiga/nova, quantidade, estratégia, rendimento manual/automático e preços.

2. **“Melhor lucro possível” / coleta** — confirmado que o payload do Worker filtrava estimativas de coleta pela escolha ativa. A entrada agora inclui as estimativas válidas dos itens alcançáveis, mesmo que possam ser produzidos, sem ampliar o grafo. Regressões Web e do solver passam e a escolha manual é preservada. O limite real é **10.000 estados** (valor default e hard cap); quando excedido não há ótimo certificado. A busca otimiza a cadeia/fórmulas selecionadas, não todo o catálogo.

3. **Comparação com BDO Workshop** — observações da UI pública, plano Balenos Meal 9601 e limites da política de esgotados foram documentados em `docs/research/competitor-market-crafting-audit-2026-10-14.md`. A observação de 1.000 crafts: Culinária 0 ~2.500 produtos, 92,4 M líquidos, 131,1 M custo, −38,7 M lucro e 18m20s; Culinária 3.000 ~3.647, 177,1 M líquidos, mesmo custo, +46,0 M e 1m50s. São números datados/arredondados, não prova da fórmula do concorrente nem benchmark fixo. Não acesse endpoints privados nem reutilize seus preços, dados ou assets.

4. **Tour contextual da oficina** — implementado como guia independente `recipe-workshop` em `/recipes/items/:itemId`, com quatro passos (lote/maestria, resultado financeiro, estratégia, materiais/retornos), âncoras registradas e seed idempotente separado. A biblioteca central e o Driver.js foram preservados. Não houve seed nem migração no banco local persistente. Para validar execução/edição, use um PostgreSQL descartável confirmado.

5. **Market Board e cotações** — subcategorias, filtros, paginação/skeletons preexistentes foram preservados. A fase 2 alinhou hierarquia e cabeçalho compacto, agrupou disponibilidade/ações e renomeou o filtro para “Com registros 24h”, pois o contrato contém contagens de negociações, não unidades vendidas. Em 390×844, 20 linhas de cache não causaram overflow; a tabela mantém rolagem interna. O preview `4203` foi bloqueado por CORS por não estar em `WEB_ORIGIN`; `4200` carregou 407 itens (API 200). `production-quotes` respondeu 503 e Arsha devolveu 500 com mensagem de bloqueio Imperva; não contornar. O tour `recipe-workshop` ainda retorna `guide: null` por não ter seed.

6. **Rollout visual Roadmap** — fase 1 alinhou Home/Recomendações; fase 2 alinhou Mercado/Receitas e incluiu skeleton inicial no catálogo, refresh sem overlay, resultado/oficina sem clipping fixo e seleção de estratégia mais clara. Em 390×844 catálogo e oficina não tiveram overflow; em desktop a árvore permaneceu contida. Continuar fases 3 (Armazém/Scan/Personagem/Gear) e 4 (utilitários), preservando fluxos e layouts de domínio. Pesquisas: `docs/research/home-recommendations-competitive-review-2026-10-16.md` e `docs/research/market-recipe-competitive-review-2026-10-16.md`.

7. **Guardas e isolamento de identidade** — `/plans` e `/settings` exigem autenticação. A migração `0013_identity_rls.sql` aplica RLS + FORCE RLS para identidade e o código define GUCs de contexto dentro de transações. Validação funcional ocorreu num PostgreSQL efêmero removível; não aplicar a `black_market` persistente, staging ou produção sem o destino descartável confirmado. O mecanismo reduz erros de escopo, mas credenciais comprometidas da API ainda podem forjar os GUCs.

8. **Build** — `WorkspaceStore` e busca são lazy. `pnpm --filter @bdo/web build` agora conclui sem erro de budget CSS; bundle inicial 600,57 kB bruto / 158,90 kB estimados excede apenas o aviso de 500 kB. Persistem warnings de locale `pt-BR`→`pt` e CommonJS do OCR. Não elevar budgets nem apagar estilos ativos.

9. **Personagem, armazém, gear e OCR** — `/demo` prepara família/personagem sintética em memória, com 15 slots de gear, maestrias, inventário/estoque por local e cenários de teste; alterações ficam na sessão e preços são simulados. O CLI `workspace:seed-test-profile` exige Firebase/UID autorizada e não foi executado. Corpus OCR: 13 capturas/29 rótulos apenas em calibração e sem split independente; não alegar precisão. Migrações/seeds não foram executadas em banco persistente.

## Comparação competitiva contínua

Antes de cada futura feature, consulte as áreas públicas correspondentes de **BDO Workshop, BDO Codex, BDOLytics e Garmoth** e atualize `docs/research/competitor-review-playbook.md`/auditorias. Anote recurso comparável, lacuna e acesso, data, região/idioma, entradas e saídas. Para cálculo, alinhe região, receita, quantidade, maestria, nível, materiais, cotação, impostos e buffs; diferencie UI observada de hipótese e regra confirmada. Não contorne login/CAPTCHA/rate limits, não acesse endpoints privados e não copie código/dados/assets sem licença.

## Verificações conhecidas

Na validação mais recente, `pnpm check` passou; `pnpm test` serial passou com 68 calculators, 247 API (1 ignorado), 623 Web e 73 scripts OCR = 1.011 aprovados. Specs focadas de Mercado/Receitas/árvore passaram 90/90. `pnpm --filter @bdo/web build` concluiu sem erro de CSS; o bundle inicial permanece acima do aviso de 500 kB. Persistem os warnings de locale `pt-BR` usando dados `pt` e dependências CommonJS do OCR. SSR de produção e login Google/Steam real não foram validados.

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
- **Market Board**: subcategorias, limpar filtros, paginação no topo e skeletons estão implementados (§130); a fase 2 alinhou cabeçalho, filtros e ações, sem alterar dados ou semântica da tabela. A inspeção em 390×844 não encontrou overflow; `4200` carregou 407 itens pela API. O preview temporário `4203` foi bloqueado por CORS como esperado. Fonte e interpretação de volume continuam limitadas.
- **Receita/oficina**: chave de tutorial `recipe-workshop` e tour de quatro passos adicionados ao runtime. A oficina foi carregada no browser local com o catálogo, mas o guia aparece indisponível até o seed; nenhuma seed/migração foi executada no volume persistente.
- **Auth/RLS**: guards para `/plans` e `/settings`, GUCs transacionais de identidade e migração `0013_identity_rls.sql` versionados nesta continuação. RLS foi exercida apenas em PostgreSQL efêmero; migração não aplicada ao banco persistente. Login real Google/Steam permanece não validado.
- **Build**: validação de 16/10: `pnpm check` e `pnpm test` passaram (68 calculators, 247 API com 1 ignorado, 623 Web, 73 OCR/scripts). O build de produção concluiu sem erro de CSS; bundle inicial de 600,57 kB gera warning contra 500 kB. Locale `pt-BR` usa dados `pt` e OCR gera avisos CommonJS. Continue otimização segura sem elevar budgets nem remover regras ativas.
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
- A migração `0013` e a chave/seed do tour ainda precisam de validação funcional em banco local descartável; só então aplicar migrações e usar `pnpm --filter @bdo/api tutorials:seed`.
- `/demo` já fornece workspace de sessão com personagem, gear, maestria, inventário/estoque e valores simulados. O CLI de staging `pnpm --filter @bdo/api workspace:seed-test-profile` também existe e é allowlisted; não executar até Firebase/UID e alvo de staging estarem configurados.
- Retomar login Google quando o Console Firebase puder configurar o projeto local dedicado. Auditar Steam/OpenID e vínculo explícito de identidades antes de implementar ou alterar fluxo. Segredos só no ambiente local/backend apropriado, nunca em frontend, Git ou chat.
- Manter autorização no servidor e guards já instalados; não desabilitá-los para facilitar testes. Login real segue bloqueado pelo estado do Firebase Console/credencial Admin.

### 2. Mercado, receitas e lucro

- A parte aprovada de subcategorias/filtros/paginação/skeletons do Market Board está concluída; futuras mudanças devem considerar dados autorizados, ordenação do conjunto total e interpretação de volume.
- No Recipe Explorer, avaliar ordenação por lucro e volume, deixando explícitos unidade/lote e janela do volume.
- A omissão de coleta no payload do Worker foi corrigida. O solver tem cap de 10.000 estados e só otimiza a cadeia/fórmulas selecionadas; cap atingido não certifica ótimo global.
- A maestria passou nos casos sintéticos de Culinária, Alquimia e Processamento, mas o relato do usuário não foi reproduzido. Retome apenas com os valores/receita/estratégia reais necessários para isolar a divergência.
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
- Fases 1–2 do rollout aprovado estão concluídas; continuar em Armazém/Scan/Personagem/Gear e depois utilitários, mantendo cabeçalhos/painéis/status consistentes sem substituir tabelas, árvores, formulários ou revisão explícita por estruturas genéricas.

### 6. Staging e handoff

- Atualize documentação sobre ambiente local/staging, CI, backup e rollback; não fazer deploy de produção.
- Trabalhe em fatias pequenas, com commits atômicos por responsabilidade.
- Ao fechar cada etapa, atualize docs/ACTIVE_CONTEXT.md e docs/ANTIGRAVITY_HANDOFF.md: mudanças, arquivos, verificações reais, limitações, migrações/seed aplicadas ou não e próximos passos.
- Rode verificações focadas e, antes de afirmar conclusão, pnpm check e pnpm test conforme AGENTS.md. Use Playwright quando a tarefa exigir evidência de fluxo/visual, sem declarar validação que não ocorreu.
- Pergunte somente quando decisão de negócio ou bloqueio externo impedir avanço; para escolhas reversíveis, assuma algo razoável e documente.

Comece conferindo estado do workspace e documentos citados. Use o estado desta atualização como mapa, não como garantia de que o Git ainda está igual. Não reimplemente entregas concluídas. Continue pendências locais seguras e independentes; confirme banco descartável antes de qualquer escrita. Trabalhe em paralelo somente em frentes independentes, com arquivos isolados e coordenação. Preserve o estado local, registre commits atômicos, atualize o handoff ao final e diferencie plano, implementação, teste automatizado, inspeção visual e bloqueio externo.
