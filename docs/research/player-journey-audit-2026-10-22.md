# Auditoria de uso como jogador — 22/10/2026

Auditoria do checkout `main`, revisão `77648b3`, em `http://localhost:4200`. A etapa inicial foi somente diagnóstico. A implementação posterior foi autorizada pelo usuário em 22/10/2026; seu resultado está em “Correções posteriores”. As reproduções abaixo descrevem a revisão auditada, antes dessas correções. Não houve commit, push, deploy, migração, seed, fabricação de tokens ou escrita no banco por scripts.

## Resultado principal

O percurso autenticado permitiu criar personagem, salvar maestrias, cadastrar estoque, importar parcialmente uma captura, calcular produção, aplicar otimização e salvar listas. **A jornada não está aprovada de ponta a ponta:** a lista salva após aplicar o otimizador desconta o estoque duas vezes; a volta da lista à oficina perde o lote. O processamento combina rendimento em massa com tempo padrão de processamento normal, afetando também o ranking. As duas capturas novas de equipamento não produziram um conjunto utilizável, mesmo após corrigir o tipo.

| ID  | Prioridade | Natureza                             | Problema                                                                                            |
| --- | ---------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| J01 | P1         | Cálculo/persistência confirmado      | Lista otimizada salva faltantes como demanda e abate o estoque novamente                            |
| J02 | P1         | Premissa temporal; efeito confirmado | Processamento em massa recebe 6 s por ação e aparece como tempo informado                           |
| J03 | P2         | Continuidade                         | Link do plano de 1 receita reabre 100 receitas e premissas padrão                                   |
| J04 | P2         | Definição de métrica                 | “Margem” calcula lucro/custo, divergindo do contrato documental                                     |
| J05 | P2         | Consistência visual                  | Etapas dizem “Obter pronto” para intermediários que o plano está produzindo                         |
| J06 | P2         | Fluxo                                | Tutorial tardio intercepta a primeira tarefa em diversas telas                                      |
| J07 | P2         | Reconhecimento, amostra limitada     | Quantidades e campos reais exigem correção; sete maestrias lidas e quatro ausentes/não vinculadas   |
| J08 | P2         | Comunicação de persistência          | Sessões prometem sincronização ao entrar; conta exige cópia manual                                  |
| J09 | P1         | OCR/fluxo bloqueado nas amostras     | Duas rodas de equipamento viram grade de armazém; correção de tipo não recupera conjunto utilizável |

Nenhum P0 foi observado. Isso não certifica ausência de P0 nas áreas não cobertas.

## Ambiente, conta e método

- Checkout principal: `C:\Users\Bellussi\Documents\ChatGPT\Site de BDO`. Branch `main`; últimos commits: `77648b3`, `13e4661`, `91b2b89`. `origin/main...main` retornou `0 0`, sem fetch ou push. O checkout estava limpo antes da auditoria.
- As portas 4200/3000 estavam sem listener na abertura. Iniciados `pnpm dev:web` e `pnpm dev:api` desta pasta; não foi reiniciado serviço de outro checkout. Sessões de execução: Web `88328`, API `91573`; processos listeners verificados: Web `25656`, API `17016`.
- Frontend usa `http://localhost:3000`; banco local `localhost:5432/bdo_companion`, volume `sitedebdo_postgres_data`. `/ready` respondeu `{"status":"ok","database":"up"}`. Os containers de staging permaneceram separados, sem atualização nesta auditoria.
- Navegador conectado: navegador integrado do Codex. `ego-browser` indisponível no PATH; fallback para `cua_repl`. O usuário concluiu o consentimento Google. Configurações confirmou provedor Google conectado. Não foram registrados e-mail completo, tokens ou credenciais nas evidências.
- Persistência verificada é **local neste navegador**. A cópia opcional da conta não foi substituída nem importada. Não se afirma sincronização entre dispositivos.
- Execução pela interface: campos, botões, navegação, upload, correção e salvamento. Leituras de código e uma consulta pública da API própria apoiaram a investigação. A conta iniciou sem personagens e sem estoque local visível.
- Referência principal 1920×1080; parte final em 1366×768. As imagens retornadas pelo navegador são JPEG, por vezes redimensionadas/recortadas pelo capturador. Dimensão do arquivo não é prova de viewport CSS.
- Movimento normal confirmado por `prefers-reduced-motion: false`. A tentativa de 390×844 produziu captura inconclusiva e o controle de viewport passou a expirar, inclusive ao restaurar. **Mobile, zoom 200% e movimento reduzido não foram homologados.** Não houve CSS ou JavaScript injetado para substituir esses testes.

## Jornada e cobertura

| Etapa/área                                         | Estado                   | Resultado observado                                                                                                   |
| -------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Home e modal Google                                | Parcial                  | Home pública, abertura e fechamento do modal; consentimento concluído pelo usuário; sessão real confirmada depois     |
| Família/personagem                                 | Aprovado na amostra      | Nome, classe e maestrias salvos e preservados após recarga; personagem ativo aparece no cabeçalho                     |
| Propagação de maestria                             | Aprovado na amostra      | Cerveja 1000, Reagente 800 e Farinha 1200; alterações finas da simulação não alteraram a ficha                        |
| Cadastro manual de armazém                         | Aprovado na amostra      | Negativo rejeitado; 100 Trigos salvos em local QA; recarga preservou os dados                                         |
| OCR armazém/revisão parcial                        | Parcial                  | Grade real 9×10, revisão e correção de 1 espaço; salvamento e recarga preservaram Trigo e item importado              |
| OCR maestrias                                      | Parcial                  | Sete campos corretos; Caça corrigida manualmente; campos ausentes registrados em J07                                  |
| OCR equipamento                                    | Falhou nas duas amostras | Life Skills e PvP classificados como armazém; recuperação manual de tipo gerou candidatos inadequados, J09            |
| Culinária                                          | Parcial                  | Custo, imposto, lucro e alteração isolada de rendimento/tempo conferidos; regra de procs não homologada integralmente |
| Alquimia e intermediários                          | Parcial                  | Conta isolada sem retornos e cadeia com Água Purificada/Sal conferidas; divergência entre etapas e plano              |
| Processamento                                      | Falhou                   | Conta monetária coerente com entradas, mas duração padrão incompatível com lote em massa, J02                         |
| Otimizador                                         | Parcial                  | Prévia, aplicação, Escape e retorno de foco funcionaram; salvar a combinação causa J01                                |
| Lista de materiais                                 | Falhou                   | Persiste e consolida; demanda incorreta após otimização e retorno ao produto perde lote                               |
| Recomendações                                      | Parcial                  | Perfil, orçamento, peso e estoque influenciaram o ranking; 9 cenários completos para Farinha; herda J02               |
| Mercado e imposto                                  | Aprovado na amostra      | Mercado distingue estoque zero/referência; simulação 100.000 bruto → 84.500 líquido e 34.500 lucro                    |
| Sessão observada                                   | Aprovado na amostra      | 80.000 lucro, 320.000/h e 4.000/energia; 1 sessão no histórico após recarga                                           |
| Configurações/conta                                | Parcial                  | Conta Google e natureza local/manual da cópia conferidas; segurança e provedores preservados                          |
| Equipamento manual completo/presets                | Não testado              | Aba e formulário inspecionados; sem homologação de todos os slots, Caphras e conjuntos                                |
| Importação repetida, soma e substituição integral  | Não testado              | Políticas lidas; não executada substituição de local nem importação integral dos prints                               |
| Inventário por personagem                          | Parcial                  | Rotas e destinos disponíveis; não concluído ciclo próprio completo                                                    |
| Histórico Voltar/Avançar e aliases antigos         | Não testado              | Navegação direta/recarga ocorreram; sem matriz exaustiva de histórico/redirect                                        |
| Mobile/zoom 200%/reduced motion                    | Bloqueado                | Limitação da automação de viewport; não aprovar com base em captura reduzida                                          |
| Demais calculadoras, mundo, combate, administração | Não testado              | Fora do percurso concluído nesta rodada                                                                               |

## Achados reproduzíveis

### J01 — P1 — Estoque descontado duas vezes na lista otimizada

**Rota/condição:** `/recipes/items/7101` → `/shopping`, desktop, maestria de Processamento 1200, estoque de Trigo #7001 = 100. Confiança alta; transição reproduzida uma vez e resultado revisto após navegação/recarga.

1. Produzir 100 ações de Farinha de Trigo #7101: demanda 12.400 Trigos, dos quais 100 próprios; faltam 12.300.
2. Manter também o plano de 1 receita de Cerveja, que demanda 5 Trigos.
3. Salvar a lista antes de aplicar otimização: consolidado 12.405 necessários, 100 do estoque, 12.305 faltantes.
4. Reabrir Farinha, gerar a prévia, conferir Comprar 12.300 / Estoque 100 e **Aplicar combinação**.
5. Salvar novamente a lista e abri-la; recarregar.

**Esperado:** 12.405 necessários e 12.305 a obter. **Observado:** 12.305 necessários e 12.205 a obter, déficit de 100. O armazém real conserva 100; o defeito corrompe a demanda do plano, não consome fisicamente o estoque.

**Causa confirmada:** `saveShoppingList()` em `recipe-tree.ts:159` grava somente `row.bought` como quantidade do material; após a combinação aplicada, esse valor já exclui `owned`. `ShoppingPage.rows` abate novamente o estoque do valor salvo. Antes da aplicação, o caminho de cenário observado fornecia a demanda inteira, explicando a diferença.

**Recomendação:** definir contrato único de demanda bruta versus faltante, conservar a demanda necessária no plano e alocar estoque uma única vez. Cobrir estoque parcial/total, vários planos, exclusão de locais e mudança posterior de estoque.

**Evidências:** [antes](evidence/player-audit-2026-10-22/shopping-two-plans.txt), [depois](evidence/player-audit-2026-10-22/shopping-after-optimizer.txt), [persistido](evidence/player-audit-2026-10-22/shopping-double-stock-persisted.txt), [captura](evidence/player-audit-2026-10-22/shopping-after-optimizer.jpeg).

### J02 — P1 — Tempo normal aplicado a rendimento em massa

**Rotas:** `/recipes/items/7101` e `/lifeskills?tab=production`. Desktop. Confiança alta na implementação e no efeito; falta medição no cliente SA atual para fixar o tempo correto por método/item. Uma comparação controlada na oficina e manifestação independente no ranking.

1. Selecionar Farinha, 100 ações e maestria 1200.
2. Observar 124 Trigos/ação, 310 Farinhas/ação, 31.000 unidades, 10 minutos e 453.942.300 de lucro/hora.
3. Em ajustes, informar 60 segundos por operação de Moagem, mantendo as outras entradas.
4. Observar mesmos custos, vendas e lucro total; tempo 1h40 e lucro/hora 45.394.230.
5. No ranking, usar personagem com 1200, orçamento 10.000.000 e capacidade 1000 LT: cenário usando estoque mostra 30 ações/180 s e os mesmos 453.942.300/h.

**Causa confirmada:** `defaultRecipeMethodSeconds()` devolve 6 s para Moagem; o adaptador multiplica ingredientes/rendimento pelo lote de maestria sem adequar o tempo. O ranking reutiliza esse default e identifica a estimativa como `source/timeSource: 'informed'`; suas premissas mostram “6 s por operação (tempo informado)” mesmo sem calibração pessoal.

**Regra externa:** a descrição do jogo publicada pelo [BDO Codex](https://bdocodex.com/us/item/720505/) informa 60–90 s para processamento em massa; a [tabela Garmoth](https://garmoth.com/mastery-brackets/processing) situa 1200 no lote 124. A tabela não confirma a duração de Moagem no patch SA. O fator dez é uma comparação matemática sob 60 s, não uma medição de throughput real nem uma regra universal.

**Impacto:** prioridade de atividades e lucro/hora potencialmente inflados; a própria origem da estimativa fica incorreta. **Recomendação:** separar ações normais/em massa, tempo base, sucesso e tempo medido; identificar defaults como referência e validar por método antes de usá-los para ranking definitivo.

**Evidências:** [padrão](evidence/player-audit-2026-10-22/processing-default.txt), [60 s](evidence/player-audit-2026-10-22/processing-60sec.txt), [ranking](evidence/player-audit-2026-10-22/recommendations-owned.txt); capturas de [padrão](evidence/player-audit-2026-10-22/processing-default.jpeg) e [comparação](evidence/player-audit-2026-10-22/processing-60sec.jpeg).

### J03 — P2 — Link do plano perde quantidade e cenário

**Rotas:** `/shopping` → `/recipes/items/9213`, desktop. Confiança alta, uma reprodução com recarga da lista.

1. Cerveja: lote 1, rendimento manual 2, tempo manual 10 s, venda de Leite desmarcada.
2. Salvar lista, abrir planejamento e recarregar. A lista conserva “1 receitas de Cerveja”, Água 6/Fermento 2/Açúcar 1/Trigo 5.
3. Clicar no nome desse plano.

**Esperado:** recuperar contexto do lote ou informar claramente que o link abre apenas a receita padrão. **Observado:** oficina com 100 receitas, rendimento 2,767, tempo padrão e Leite incluído. O contrato atual salva uma lista, não uma simulação completa; o problema é a continuidade silenciosa entre as duas superfícies.

**Causa confirmada:** link em `shopping-page.html:112` transporta apenas `sourceItemId`; o objeto salvo não guarda o cenário completo. **Recomendação:** restaurar parâmetros suportados ou tornar explícito o escopo do link e da persistência.

**Evidências:** [lista persistida](evidence/player-audit-2026-10-22/shopping-two-plans.txt), [retorno com 100](evidence/player-audit-2026-10-22/shopping-reopen-reset-100.txt), [captura](evidence/player-audit-2026-10-22/shopping-reopen-reset-100.jpeg).

### J04 — P2 — “Margem” usa custo como denominador

**Rota:** Reagente Líquido Limpo #5301, desktop. Confiança alta, código e casos de Alquimia/Processamento.

1. Lote 100, rendimento 2 e venda de todos os 28 retornos desmarcada.
2. Conferir custo 1.540.400, líquido 1.859.000 e lucro 318.600.
3. Observar “20.7% de margem”.

**Esperado conforme `docs/calculators.md`:** lucro/receita líquida = 17,14%. **Observado:** lucro/custo = 20,68%. A aritmética de custo, receita e lucro está correta; o denominador e o nome da métrica divergem do contrato.

**Causa confirmada:** `profitMargin` em `recipe-tree.ts:1259` divide pelo custo econômico. **Recomendação:** escolher e documentar margem sobre venda ou retorno sobre custo; não modificar lucro total para ajustar o percentual.

**Evidências:** [cenário](evidence/player-audit-2026-10-22/alchemy-controlled.txt), [captura](evidence/player-audit-2026-10-22/alchemy-controlled.jpeg), [conta independente](evidence/player-audit-2026-10-22/independent-calculations.json).

### J05 — P2 — Etapas e plano apresentam origens diferentes

**Rota:** Reagente #5301; desktop. Confiança média/alta; uma reprodução, causa interna ainda não isolada.

1. Abrir Reagente, lote 100, rendimento 2 e desmarcar retornos de Alquimia.
2. Selecionar “Fazer / coletar tudo”.
3. Alternar para “Etapas expansíveis”.

**Esperado:** Água Purificada e Sal com origem e etapas coerentes com a combinação calculada. **Observado:** sidebar marca ambos “Produzir” e inclui 124 Garrafas de Água do Rio e 124 de Água do Mar; etapas continuam “Obter pronto / Ver como obter” para os dois intermediários. Custo/tempo mudam para 2.422.000/132 s.

**Impacto:** jogador não consegue seguir uma instrução única para executar o lote. **Hipótese:** estado de expansão/ramo e escolhas do planner não compartilham a mesma projeção após o atalho. **Recomendação:** renderizar o cenário efetivo em ambas as visualizações, mantendo expansão separada da decisão de produzir.

**Evidência:** [texto das duas superfícies](evidence/player-audit-2026-10-22/chain-tree-plan-disagreement.txt), [captura](evidence/player-audit-2026-10-22/chain-tree-plan-disagreement.jpeg).

### J06 — P2 — Tutorial chega depois do início da interação

**Condição:** primeira visita a uma superfície/versão do tutorial, movimento normal, desktop. Observado em Armazém, Receitas, Lista de materiais, Equipamento, Família e Configurações; confiança alta na interferência, sem métrica de frequência populacional.

1. Entrar na tela e começar a ação principal assim que os controles aparecem.
2. Em Armazém, clicar “Adicionar item manualmente”; em Receitas, buscar Cerveja e selecionar o resultado.
3. Observar o tutorial assumir o foco/overlay; o resultado da tarefa não abre até fechar o tutorial e repetir a ação.

**Esperado:** início previsível da ajuda, sem capturar uma ação já iniciada. **Observado:** ajuda opcional interrompe tarefas e provoca repetição de cliques. Não é evidência de retorno dos pulos históricos de rolagem: a oscilação do tutorial não foi reproduzida nesta rodada.

**Causa parcial:** `TutorialSurfaceDirective` aguarda guia e alvo por requisição/observação assíncrona; não há cancelamento explícito por início de interação. A ordenação exata de cada clique exige instrumentação específica.

**Recomendação:** disponibilizar ajuda em contexto e oferecer início voluntário; caso permaneça automática, coordenar readiness e suspender o lançamento ao detectar tarefa em andamento. **Captura:** [lista interrompida](evidence/player-audit-2026-10-22/shopping-delayed-tutorial.jpeg).

### J07 — P2 — Reconhecimento incompleto em capturas reais

**Rota:** `/scans`, 1366×768; reconhecimento local, revisão obrigatória. Confiança alta nos exemplos visuais; sem taxa global de acurácia.

**Amostra anterior autorizada:** `capture-3246ac3c34d1`, corpus local, JPEG 1230×680, marcado `user-provided/calibration` no manifesto. Não é holdout independente. Grade 9×10 correta; 90 sugestões pendentes e 17 quantidades abreviadas. Espaço 2 mostra **46** na imagem e veio preenchido com **1**, marcado para corrigir quantidade. Corrigir para 46, validar e salvar apenas essa linha funcionou; os 100 Trigos anteriores foram preservados após navegação/recarga.

**Amostra nova:** `prints-reais-ocr/maestrias.jpeg`, fornecida pelo usuário em 22/10. Valores corretos reconhecidos: Alquimia 2995, Comércio 2115, Culinária 2790, Cultivo 2245, Pesca 2880, Processamento 800 e Treinamento 2835. A leitura respeitou o Processamento geral 800, sem substituí-lo pelos métodos específicos 2985.

Caça 3080 apareceu como “Maestria não identificada · prévia”, sem associação; Coleta 785, Navegação 2425 e Permuta 0 não apareceram como campos importáveis. O zero visível de Permuta é dado conhecido, não ausência. As graduações/XP visíveis também não foram importados nesse conjunto de campos. Sete valores foram aplicados ao personagem QA OCR; Caça foi adicionada manualmente com 3080 e aceita pelo fluxo.

**Esperado:** sugestões correspondentes aos números e profissões legíveis, ou ausência explícita sem sugerir quantidade incorreta. **Impacto:** revisão trabalhosa e risco de aceitar um número errado. As proteções de confirmação impediram importação automática dos pendentes, portanto não se observou corrupção automática.

**Causa:** falha de reconhecimento/associação nestas amostras; algoritmo específico não isolado. **Recomendação:** conservar arquivo/hash e gabarito por campo, distinguir cabeçalhos e especializações, testar zero e números acima de 3000. Não usar sete acertos de maestria ou uma captura de calibração como prova de generalização.

**Evidências:** [revisão de itens](evidence/player-audit-2026-10-22/ocr-review-dom.txt), [espaço corrigido](evidence/player-audit-2026-10-22/ocr-corrected-slot2.jpeg), [estoque persistido](evidence/player-audit-2026-10-22/storage-after-ocr-persisted.jpeg), [maestrias](evidence/player-audit-2026-10-22/mastery-real-review.txt), [captura de revisão](evidence/player-audit-2026-10-22/mastery-real-review.jpeg). As imagens originais novas permanecem locais; não foram copiadas para o relatório.

**Armazém novo 1:** grade 9×10 detectada; 20 espaços ocupados apresentados, com vazios/cadeados excluídos, 19 pendências e 1 candidato pronto. No espaço 3, o print mostra `1.4M`, mas a revisão mostra `14M` e preenche **14.000.000**, diferença de dez vezes em relação à estimativa nominal de 1.400.000. O aviso identifica estimativa, porém o número incorreto já ocupa o mesmo campo que será salvo após validação. No espaço 11, `169.2k` aparece como `1699k`, estimativa 169.900. O valor 18 do espaço 2 ficou vazio. Não foram aceitos nem salvos esses registros novos. [Revisão completa](evidence/player-audit-2026-10-22/storage-new-1-review.txt) e [captura](evidence/player-audit-2026-10-22/storage-new-1-review.jpeg).

### J08 — P2 — Texto de sincronização não corresponde ao fluxo da conta

**Rotas:** `/lifeskills?tab=sessions` e `/settings`, desktop, Google autenticado. Confiança alta, texto e código conferidos.

1. Entrar com Google, visitar Sessões e registrar uma sessão QA.
2. Ler “Sessões sem conta · Registros neste navegador, com sincronização ao entrar.”
3. Abrir Configurações: “A cópia da conta é opcional”, “Entrar não substitui seus dados automaticamente” e botão “Consultar meus dados salvos”.

**Esperado:** distinguir sessão autenticada, salvamento local e cópia manual. **Observado:** mensagem incondicional sugere que login sincroniza registros. `lifeskills-page.html:15` condiciona o texto somente à aba, sem verificar autenticação.

**Impacto:** falsa expectativa de recuperação em outro navegador. **Recomendação:** explicar o salvamento local e apontar para a cópia manual; só anunciar sincronização automática quando confirmada. Não foi feito teste destrutivo de apagar cache ou sobrescrever cópia remota.

**Evidência:** [sessão](evidence/player-audit-2026-10-22/observed-session.txt), [histórico após recarga](evidence/player-audit-2026-10-22/observed-session-persisted.jpeg).

### J09 — P1 — Importação automática de equipamento não produz conjunto utilizável

**Rota/condições:** `/scans`, 1366×768, capturas reais novas `gear-lifeskill.jpeg` (446×880) e `gear-pvp.jpeg` (444×884). Ambas mostram o título Equipamento e uma roda, com graus visíveis. Reprodução em duas imagens diferentes; confiança alta para a falha do fluxo, sem generalizar para todos os layouts.

1. Escolher a captura pela entrada automática principal.
2. Observar o modo de armazém com grade sugerida **8×4**, cobrindo toda a janela de equipamento.
3. Abrir “Corrigir tipo da captura”, escolher “Equipamento do personagem” e executar “Ler itens e valores”.
4. Conferir os recortes, sugestões, posições e atributos.

**Esperado:** reconhecer tipo e posições da roda ou recusar a geometria com orientação clara; correção de tipo deve encaminhar ao fluxo de equipamento utilizável. **Observado:** Life Skills retorna apenas 2 candidatos, incluindo “Cerca Lua Minguante de Clow” e item sem nome. PvP retorna 10 candidatos, incluindo a mesma cerca, guarda-roupa, couro, polvo e mobília. Posições e aprimoramentos estão vazios; os PA/PD visíveis no print PvP (2219/2183/816) permanecem vazios. Nenhum equipamento foi importado.

**Impacto:** tarefa central de importar a roda bloqueada nessas capturas; reconstruir manualmente cada peça é um fluxo alternativo, não validação do OCR. A barreira de revisão funcionou: candidatos incorretos não foram salvos automaticamente.

**Causa parcial confirmada:** `AutomaticScanPage.choose()` encaminha tipo não reconhecido para armazenamento; `scans-page.ts` usa fallback 8×4 para esse modo. Após correção de tipo, `detectEquipmentFrames()` e a associação de recortes não entregam um conjunto coerente nas amostras. Não foi isolado se o primeiro erro vem de pontuação no OCR do título, classificação ou seleção de pane; o detector geométrico também precisa de investigação.

**Recomendação:** evitar fallback silencioso de tipo desconhecido para armazém; confirmar tipo antes de análise quando incerto; validar contornos/posições reais da roda e recusar candidatos fora do domínio do slot. Adicionar as duas imagens como casos autorizados locais com gabarito por posição, sem incluí-las em datasets públicos.

**Evidências:** [Life Skills como armazém](evidence/player-audit-2026-10-22/gear-lifeskill-misclassified.txt), [recuperação Life Skills](evidence/player-audit-2026-10-22/gear-lifeskill-corrected-type.txt), [captura](evidence/player-audit-2026-10-22/gear-lifeskill-corrected-type.jpeg), [PvP como armazém](evidence/player-audit-2026-10-22/gear-pvp-misclassified.txt), [recuperação PvP](evidence/player-audit-2026-10-22/gear-pvp-corrected-type.txt), [captura PvP](evidence/player-audit-2026-10-22/gear-pvp-corrected-type.jpeg).

## Capturas reais fornecidas durante a auditoria

[Manifesto com dimensões e SHA-256](evidence/player-audit-2026-10-22/new-captures-manifest.json). Originais em `prints-reais-ocr/`, fora dos arquivos documentais desta entrega. Não houve edição das imagens.

| Arquivo                             | Cobertura                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `maestrias.jpeg`                    | Leitura, conferência dos sete campos, seleção, aplicação ao QA OCR e correção manual de Caça |
| `gear-lifeskill.jpeg`               | Classificação automática e tentativa de recuperação; falhou, sem salvar                      |
| `gear-pvp.jpeg`                     | Classificação automática e tentativa de recuperação; falhou, sem salvar                      |
| `armazem-1.jpeg`                    | Detecção de grade, análise, comparação da primeira página e abreviações; sem salvar          |
| `armazem-2.jpeg` a `armazem-5.jpeg` | Análise concluída em lote e primeira página confrontada com cada original; sem salvar        |

As amostras novas são reais e autorizadas. O fato de terem sido usadas nesta auditoria não cria automaticamente um corpus de teste independente com todos os itens/quantidades rotulados. Não calcular acurácia global com contagens de candidatos.

**Lote de armazéns concluído:** capturas 1/2/3/5 geraram grades 9×10 e a captura 4 gerou 9×5. Foram apresentados 20/90/90/45/90 espaços ocupados, respectivamente, total 335; a primeira captura teve 70 vazios/cadeados ignorados. O lote terminou com 334 pendências e 1 candidato pronto, sem confirmação de importação. As quantidades da primeira página das quatro capturas adicionais estão neste [JSON](evidence/player-audit-2026-10-22/new-storage-first-page-quantities.json); estados completos: [captura 2](evidence/player-audit-2026-10-22/storage-new-2-review.txt), [captura 3](evidence/player-audit-2026-10-22/storage-new-3-review.txt), [captura 4](evidence/player-audit-2026-10-22/storage-new-4-review.txt) e [captura 5](evidence/player-audit-2026-10-22/storage-new-5-review.txt).

Exemplos adicionais: armazém 2, espaço 1, `167.1k` → 67.100; espaço 2, `708.2k` → 8.200; armazém 3, espaço 2, `17090` → 1; armazém 4, espaço 2, `145.8k` → 45.800. Houve valores corretos também: armazém 2, espaço 7 =263 e espaço 10 =5274; armazém 4, espaço 6 =32512; armazém 5, espaços 10/11 =562/192. Campos vazios e sugestões incorretas são resultados diferentes; ambos exigem revisão. Os nomes sugeridos não foram homologados por gabarito completo de IDs.

**Tempo observado da interface:** a UI informou 9,3 s para armazém 1 e 136,8 s para o lote adicional, com 38,5/39,5/20,0/38,1 s por captura. São os tempos apresentados pelo produto no navegador integrado, em desenvolvimento local, com catálogo/ícones já parcialmente aquecidos; não são benchmark independente, cold start ou medição de rede. [Estado do lote](evidence/player-audit-2026-10-22/ocr-batch-result.txt), [captura](evidence/player-audit-2026-10-22/new-storage-batch.jpeg).

**Persistência da ficha OCR:** ao sair da importação e abrir Família, os sete valores e Caça 3080 continuaram no personagem QA OCR. [Conferência](evidence/player-audit-2026-10-22/mastery-after-reload.txt). Coleta/Navegação/Permuta continuaram em seus valores iniciais, sem preenchimento fabricado dos campos ausentes.

## Memória dos cálculos

Contas independentes em [JSON](evidence/player-audit-2026-10-22/independent-calculations.json), sem importar os calculadores do produto. Região SA, observações de 22/10/2026; fonte de mercado própria apresentada como Arsha; preços abaixo são o snapshot do teste, não preços garantidos para compra/venda. [Consulta pública de Cerveja](evidence/player-audit-2026-10-22/beer-public-quote.json) registra preço 3050, fonte, instante e estoque; foi coletada depois do primeiro cenário e não comprova o estoque exato naquele primeiro instante.

| Caso                                | Premissas e conta independente                                                                                                                                                                                  | Resultado da UI/diferença                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Cerveja #9213, padrão, 100 receitas | 500 Trigos ×2750 +600 Águas ×30 +200 Fermentos ×20 +100 Açúcares ×20 =1.399.000; 276,7 Cervejas ×3050 +28,32 Leites ×23300 =1.503.791; floor(×0,845)=1.270.703; lucro −128.297                                  | Mesmos totais; 29,6 s pelo modelo de massa; nenhum erro monetário observado                                                      |
| Cerveja controlada, 100 receitas    | Rendimento 2; Leite sem venda; bruto 610.000; líquido 515.450; lucro −883.550; tempo 100×10/4,059001=246,366 s                                                                                                  | Mesmos totais; lucro/hora −12.909.009. A tela usa tempo antes da redução de massa como entrada, sem explicar bem a transformação |
| Reagente #5301, 100 receitas        | Maestria 800, rendimento manual 2, 28 retornos sem venda; Erva 100×384 +Grama 100×9700 +Água 100×5300 +Sal 100×20 =1.540.400; bruto 200×11000=2.200.000; líquido1.859.000; lucro318.600; 120s →9.558.000/h      | Aritmética coincide; percentual falha em J04                                                                                     |
| Reagente com intermediários         | 100 Ervas +100 Gramas +124 Garrafas do Mar ×5550 +124 Garrafas do Rio ×5850 =2.422.000; 200 produtos finais e 210 Águas excedentes vendidas: bruto3.313.000; líquido2.799.485; lucro377.485; 132s →10.295.045/h | Aritmética coincide sob as premissas; duração dos intermediários herda J02; duas superfícies discordam em J05                    |
| Farinha #7101, 100 ações            | Maestria1200 →lote124; 12.400 Trigos×2750=34.100.000; saída31.000×4190=129.890.000; líquido109.757.050; lucro75.657.050                                                                                         | Totais coincidem; 600s versus comparação6000s produz diferença10× no lucro/hora                                                  |
| Ranking Farinha com estoque         | 30 ações; 3.720 Trigos, 100 próprios e3.620 a comprar; custo econômico10.230.000, desembolso9.955.000; saída9.300; lucro22.697.115;180s                                                                         | Quantidades, custo próprio e caixa coerentes;453.942.300/h herda o problema temporal                                             |
| Mercado manual                      | Preço10.000, qtd10, custo50.000; bruto100.000; líquido84.500; lucro34.500; equilíbrio ceil(50000/10/0,845)=5918                                                                                                 | Todos coincidem                                                                                                                  |
| Sessão observada                    | Receita100.000−despesa20.000=80.000;15min →320.000/h;20energia →4000/energia                                                                                                                                    | Todos coincidem e histórico persistiu                                                                                            |

O custo econômico inclui material próprio. A lista reduz o desembolso/faltante, não torna material próprio gratuito. Quantidades esperadas fracionárias de procs representam esperança de lote, não garantia de resultado. O rendimento padrão e o conjunto de 28 retornos de Alquimia não tiveram validação independente completa de probabilidades/trocas no patch atual; o caso controlado os excluiu para isolar a aritmética.

**Arredondamento do tempo:** o planner arredonda cada ação ao milissegundo antes de multiplicar o lote (`production-planner.ts:424/572`). Assim, os tempos exatos de Cerveja 29,5639247 s e 246,3660393 s tornam-se 29,6 s e 246,4 s. Recalculando com esse contrato e truncando a taxa inteira, os lucros/hora são −15.603.689 e −12.909.009, iguais à tela. Essa pequena diferença de quantização não foi classificada como erro matemático.

## Pesquisa pública atual

Consultas em 22/10/2026, somente páginas públicas. Nenhum endpoint privado concorrente foi consumido.

| Fonte                                                                                                                        | Superfície/observação                                                                               | Limite                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/)                                                                                     | Descrição pública apresenta crafting, mercado e scans de inventário/armazém/gear                    | Ferramentas dependem de JavaScript; sem cenário numérico pareado homologado              |
| [BDO Codex](https://bdocodex.com/us/item/720505/)                                                                            | Descrição da pedra de processamento informa necessidade de equipamento e intervalo60–90s para massa | Descrição publicada de item não é medição atual de Moagem SA                             |
| [BDOLytics Culinária](https://bdolytics.com/en/SA/cooking) e [Alquimia](https://bdolytics.com/en/SA/alchemy)                 | Tentativas de acesso às páginas pertinentes                                                         | Ferramenta de consulta não conseguiu abrir; não afirmar comparação numérica              |
| [Garmoth Processamento](https://garmoth.com/mastery-brackets/processing)                                                     | Tabela confirma bracket124 entre1180 e1219                                                          | Região visível EU; não fornece tempo por método                                          |
| [Garmoth Culinária](https://garmoth.com/mastery-brackets/cooking) e [Alquimia](https://garmoth.com/mastery-brackets/alchemy) | Brackets públicos consultados; coeficientes visíveis compatíveis com os consultados no código       | Uma tabela de concorrente não comprova fórmula completa, trocas ou distribuição de procs |
| [Guia oficial SA de mercado](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=47)                                        | Base oficial referenciada pela calculadora e pelo contrato de imposto                               | Não equivale a disponibilidade ou liquidez dos itens                                     |

## UI/UX ligada às tarefas

- Hierarquia e rótulos principais permitiram localizar receita, resultado, estoque e lista. Campos vazios de OCR permaneceram pendentes, em vez de serem confirmados como dados reais. Salvamento manual do estoque e importação apresentaram feedback explícito.
- A prévia do otimizador manteve o cenário até aplicação; Escape fechou e devolveu foco ao acionador. O rótulo de ótimo limita o certificado aos dados recebidos; não comprova validade da duração do jogo.
- Maestrias da simulação explicam que o ajuste é local; ficha original QA continuou1000/800/1200 após testar receitas. Capacidade/peso ausentes são bloqueios reais do ranking, mas ficam distantes do caminho principal de configuração: recomendação de melhoria é ligar diretamente o diagnóstico ao campo correspondente.
- Densidade e painéis lado a lado foram inspecionados em desktop. Não há certificação de contraste, teclado completo, leitor de tela, todos os textos longos ou todos os breakpoints. A captura mobile inconclusiva foi preservada com nome explícito para não servir como aprovação.
- Console consultado em momentos de Receitas/Otimizador/Scanner retornou listas vazias de erros/avisos. Isso não equivale a monitoramento contínuo ou HAR completo. Rede foi acompanhada parcialmente pelos logs da API e respostas visíveis; não há métricas inventadas de LCP/INP/CLS ou duração de OCR.

## Dados criados e encerramento

- `QA Auditoria 22-10`: Shai, nível1, maestrias Culinária1000/Alquimia800/Processamento1200; orçamento10.000.000, peso máximo1000 LT, sessão60min. Valores QA, não cópia da ficha real do jogador.
- `QA OCR 22-10`: personagem exclusivo para capturas novas; Alquimia 2995, Comércio 2115, Culinária 2790, Cultivo 2245, Pesca 2880, Processamento 800 e Treinamento 2835 importados; Caça 3080 adicionada manualmente. Sem equipamento importado.
- Local de estoque `QA Auditoria 22-10`:100 Trigos #7001 e46 Elixires Robustos de Tendão de Baleia #733. Não se afirma identificação universal do ID por desenho; foi o candidato revisado no teste.
- Planos locais:1 receita de Cerveja e100 ações de Farinha. A lista de Farinha conserva propositalmente a evidência de J01; não foi “corrigida” editando o dado salvo por script.
- Sessão `QA Auditoria 22-10 coleta`:15min,20energia,100.000 receita direta e20.000 despesas; profissão permaneceu “Não informada” no registro, sem presumir contexto a partir do nome.
- Nenhum registro preexistente foi excluído, substituído ou editado. Não houve mudança de segurança, vínculo de provedor ou cópia remota. Progresso de tutoriais visitados foi alterado pelo uso normal. Novos arquivos do usuário em `prints-reais-ocr/` continuam não rastreados e preservados.
- A jornada de maior risco continua reprovada por J01/J02/J09. Próximos testes: importação repetida/mesclagem em destino QA isolado; todas as páginas/IDs/quantidades dos prints com gabarito; gear completo e limites acima 3000; quantidades zero/extremas e duplicatas; volta/avanço/aliases; todos os breakpoints/200%/movimento reduzido; cópia remota em cenário com snapshot original preservado.
- Ordem recomendada: contrato de demanda/estoque (J01) → tempo/origem das estimativas em ambos os planners (J02) → classificação e geometria de equipamento (J09) → continuidade do plano (J03) → métrica e coerência de origens (J04/J05) → tutoriais e comunicação (J06/J08) → regressões de quantidades/maestrias com gabarito independente (J07).

A etapa de diagnóstico foi documental; os testes de produto abaixo pertencem à implementação posterior e não substituem a auditoria de uso.

## Correções posteriores

Implementação autorizada pelo usuário em 22/10/2026, no mesmo checkout. Dados QA e capturas originais preservados; sem migração dos planos existentes. Uma lista salva com a demanda incorreta precisa ser salva novamente na oficina: não há informação suficiente para reconstruir automaticamente sua simulação original.

- **J01:** salvamento usa demanda externa antes do estoque (`bought + owned`), inclusive quando todo o material vem do armazém. Regressão reproduziu 140 unidades salvas em vez de 200 antes da correção; após ela, preserva 200 e também a demanda inteiramente coberta por estoque. A lista continua distribuindo estoque compartilhado entre planos.
- **J02:** processamento em massa mantém o lote da maestria, mas exige duração por lote completo informada. O tempo normal de 6 segundos fica restrito ao processamento normal; duração pendente não recebe fallback da receita raiz. Ranking distingue estimativa padrão de entrada informada. Testes de adaptador/ranking: 69 aprovados. No navegador, maestria1200/100 operações deixou tempo pendente; informar60 segundos produziu1h40m (6000s), preservando31000 Farinhas.
- **J03:** escopo da lista e do link agora é explícito: salva materiais e abre a receita com os ajustes atuais do navegador; não promete restaurar a simulação completa. Não foi criado formato novo de snapshot.
- **J04:** margem usa lucro/receita líquida; sem receita líquida positiva, permanece indefinida. Custo zero com receita positiva resulta em margem100%. Lucro absoluto preservado.
- **J05:** etapas recebem as escolhas efetivas do plano, incluindo a compra padrão quando não existe override. Expandir uma fórmula para consultá-la não altera a indicação de compra/produção do plano.
- **J06:** interação na superfície cancela o início automático ainda pendente, inclusive durante API, espera do alvo e carregamento do tutorial. Ajuda voluntária e progresso preservados. Testes direcionados abrangem teclado, ponteiro, entrada, foco e prontidão tardia.
- **J08:** sessões explicam armazenamento no navegador e cópia manual em Configurações, sem prometer sincronização automática.
- **J07 (parcial):** recorte de quantidade do armazém preserva prefixos que ultrapassam a borda da célula. Execução local de Tesseract nas imagens reais recuperou `167.1k` e `708.2k`. Abreviações permanecem estimativas em campo separado e exigem ação explícita; ausência de OCR não preenche `1`. Associação entre nome de profissão e valor usa escala do texto; a captura de maestrias produziu dez valores corretos, e `Permuta: O` fica vinculada como ambígua, sem fabricar zero. A revisão de 23/10 agora rejeita `14M` sem separador, que pode ser a captura `1.4M` sem o decimal, e retira números de leituras divergentes. A taxa geral de acerto e a leitura completa de quantidades seguem sem certificação.
- **J09 (parcial):** controles exclusivos de equipamento identificam as capturas quando o título não é lido; imagem desconhecida não inicia leitura automática como armazém. Detector preserva bordas externas e a constelação de combate recupera13 posições na captura PvP. Sugestões por posição excluem categorias incompatíveis. Captura de Vida sem constelação segura recebe recusa explícita e caminho manual, em vez de objetos não relacionados. Geometria recuperada não certifica nomes/aprimoramentos corretos nem conjunto completo importado.

A [integração oficial SA de03/09/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8539) introduziu equipamento de Vida compartilhado pela Família e categorias próprias; as [notas de17/09/2026](https://www.sa.playblackdesert.com/pt-BR/News/Notice/Detail?groupContentNo=8594) registram ícones em slots vazios. Na auditoria original, não havia evidência suficiente para associar os quatro ícones cinza IV da captura a equipamentos reais. A atualização abaixo fecha a modelagem e o fluxo revisável, sem atribuir esses ícones a slots de combate por semelhança.

Regressões privadas executáveis por `BDO_PRIVATE_OCR_DIR` em `scripts/private-player-ocr-regressions.test.mjs`: dois testes de frames reais, um de prefixos com Tesseract e um dos recortes de PA/PD (`2219/2183/816`), quatro aprovados localmente. Sem a variável e as imagens privadas, esses testes declaram quatro skips; não simulam aprovação do corpus. As regressões de DOM/domínio usam somente exemplos textuais e geometria, sem adicionar capturas privadas ao Git.

### J09 — Equipamento de Vida da Família (23/10/2026)

O perfil da Família agora guarda `lifeEquipment` separado do equipamento de combate, com listas comuns e por profissão. A aba Equipamento permite selecionar qualquer uma das 11 profissões, procurar no catálogo sem o filtro de receitas de profissão e revisar itens; a área permanece disponível sem personagem ativo. Cada lista aceita até50 itens; quando atinge o limite, o editor desativa a inclusão e o scanner rejeita o lote inteiro antes de salvar qualquer alteração em estoque, Família ou histórico. Lotes que combinam estoque, equipamento de combate e Vida aparecem como “Importação mista” no histórico. Backups anteriores continuam válidos e `schemaVersion` segue em1.

O scanner classifica a roda de Vida quando há texto inequívoco, oferece profissão corrigível e mantém cada recorte pendente. Item, tipo, escopo e inclusão exigem confirmação; posição e aprimoramento só entram quando confirmados, e texto de aprimoramento não vira nível numérico. Salvar grava apenas linhas revisadas em `families[region]`, registra modo/hash sem guardar bytes da captura e não modifica personagens, gear PvP, inventário ou presets. O undo valida a mutação de equipamento de Vida da região e preserva outras alterações posteriores.

**Evidências da rodada J09 em 23/10:** regressões focadas do editor, scanner e histórico passaram; cobrem buscas sem filtro de receita, lote heterogêneo, limite de 50 e rótulos. Regressão privada: 5 testes aprovados após conferir os SHA-256 das oito capturas do manifesto; a roda de Vida permanece como candidatos sem posição e o PvP conserva 13 slots. Suíte integral da verificação final: calculadoras85, API270, Web929 e scripts85 aprovados; 1 teste da API ignorado. `pnpm check`, `pnpm --filter @bdo/web build` e `pnpm test:ssr` também passaram. O histórico traduz `life-gear` como “Equipamento de Vida” e lotes de modos diferentes como “Importação mista”. O build preserva avisos de fallback locale `pt-BR`, orçamento do SCSS da árvore e dependências CommonJS do Tesseract.

A revisão visual desta etapa em `localhost:4200` não foi concluída: a política da superfície conectada bloqueia a observação do domínio local. Nenhuma captura substituta foi usada. Permanecem sem certificação visual nesta etapa os breakpoints pequenos, zoom200% e movimento reduzido; a identidade automática de cada item e a completude de uma importação real também não foram homologadas. Os prints originais e hashes permanecem fora do Git.

### J07 — Quantidades ambíguas e maestrias (23/10/2026)

O reconhecimento não converte mais um `14M` sem separador em 14.000.000: como pode ser a captura `1.4M` com o ponto perdido, o parser deixa o valor vazio para conferência. A revisão mostra `14M` como leitura OCR sem confirmação e pede que o jogador confira a imagem e digite o valor exato. Se duas leituras numéricas divergem, a reconciliação deixa o valor vazio e mantém o conflito mesmo que tentativas seguintes concordem com uma delas. Leituras abreviadas continuam separadas como estimativa; preencher uma estimativa é uma ação explícita e ainda exige revisão antes de importar. A regra não infere que `14M` seja necessariamente `1.4M`.

Maestrias acima de 3.000 continuam aceitas quando associadas com clareza: a regressão da captura cobre Coleta 785, Caça 3080 e Navegação 2425. `Permuta · Maestria O` segue sem valor numérico e desmarcada; uma regressão de interface verifica que a pessoa precisa editar para `0`, selecionar o campo e aplicar antes de alterar a ficha. Os testes cobrem o zero como valor distinto de ausência.

**Evidência do código e testes:** [parser de quantidades](../../apps/web/src/app/features/scans/visible-quantity.ts), [reconciliação de leituras](../../apps/web/src/app/features/scans/quantity-reconciliation.ts), [tela de revisão do armazém](../../apps/web/src/app/features/scans/scans-page.html), [regressão de OCR da captura](../../apps/web/src/app/features/scans/real-capture-regressions.spec.ts), [regressões privadas](../../scripts/private-player-ocr-regressions.test.mjs) e [revisão da ficha](../../apps/web/src/app/features/scans/profile-screen-import.spec.ts). Na captura privada, o Tesseract leu `169.2k` como `1698k`; o parser anterior transformava isso em `169.8k`. Agora uma abreviação K com quatro dígitos e sem separador fica sem valor numérico, mantendo o texto OCR para correção manual. A regressão privada dos recortes `1.4M`, `18` e `169.2k` exige o valor esperado ou abstinção. A tela também exibe `14M` sem estimativa, e a regressão de interface confirma que `1698k` permanece visível sem número sugerido. Os cinco testes privados passaram após confirmar os hashes das oito imagens do manifesto. A suíte integral passou com 1.367 testes e 1 skip conhecido da API; `pnpm check`, build Web de produção e `pnpm test:ssr` também passaram. O build conserva os avisos conhecidos de fallback locale `pt-BR`, orçamento de `recipe-tree.scss` e dependências CommonJS do Tesseract. As imagens originais continuam locais e não foram adicionadas ao Git. Esses testes de calibração não medem uma taxa global nem constituem holdout independente.

**Pesquisa pública de produto em 23/10:** [BDO Workshop](https://bdoworkshop.com/) descreve scans de inventário, armazém e equipamento, mas a página informa que as ferramentas exigem JavaScript e não expôs o fluxo de revisão no conteúdo acessível. A [página inicial da Garmoth](https://garmoth.com/) expõe ferramentas como Maestria e Gear Planner; não foi observada revisão OCR nessa página, sem concluir que não exista em outras áreas. O [BDO Codex](https://bdocodex.com/us/) recusou a leitura automatizada; [BDOLytics](https://bdolytics.com/) redirecionou para `/en` e não forneceu conteúdo de texto para observar. Esses limites não mudam o contrato local de confirmação.

### Validação da implementação

- Na revalidação de 23/10 antes dos commits, `pnpm check`, `pnpm test`, build de produção Web e `pnpm test:ssr` passaram. Suíte geral: 85 testes de calculadoras, 270 da API, 933 da Web e 85 de scripts; 1.373 aprovados e 1 skip conhecido da API. Os testes focados e as 5 regressões privadas se sobrepõem à suíte e não são somados novamente.
- O smoke SSR foi atualizado para conferir a nova indicação de sessões locais. Permanecem avisos de build sobre locale `pt-BR` com fallback `pt`, orçamento do SCSS da árvore e dependências CommonJS de Tesseract; nenhuma dependência ou orçamento foi alterado para ocultá-los.
- Navegador após as correções: captura PvP reconhecida automaticamente como equipamento,13 posições (12 na primeira página e Despertar na segunda), PA2219/PA Desperto2183/PD816. Seis espaços receberam sugestões de acessórios; sete continuaram não identificados. Todos ficaram pendentes de revisão e nenhum equipamento ou atributo foi salvo. Evidências: [revisão PvP](evidence/player-audit-2026-10-22/gear-pvp-after-fixes.jpeg), [texto](evidence/player-audit-2026-10-22/gear-pvp-after-fixes.txt) e [última posição](evidence/player-audit-2026-10-22/gear-pvp-after-fixes-last-slot.txt).
- A captura de Vida foi testada novamente no navegador. A falha de geometria agora aparece explicitamente no resumo, com nome do arquivo e orientação de cadastro/recorte manual. Foi corrigido o resumo que sobrescrevia a falha com “Lote analisado”; regressão integrada adicional aprovada,34 testes do scanner aprovados após esse último ajuste. Evidências: [falha segura](evidence/player-audit-2026-10-22/gear-life-safe-failure.jpeg) e [texto](evidence/player-audit-2026-10-22/gear-life-safe-failure.txt).
- A duração de100 lotes de60s foi observada como1h40m, com31000 Farinhas e maestria1200: [captura](evidence/player-audit-2026-10-22/processing-mass-time-fixed.jpeg) e [texto](evidence/player-audit-2026-10-22/processing-mass-time-fixed.txt). O otimizador nessa nova passagem pediu pesos ausentes de Trigo/Farinha/equivalentes; o fluxo de reaplicar e salvar a lista não foi certificado novamente no navegador. A correção J01 foi validada por teste integrado com estoque parcial e total. Os planos QA antigos permanecem preservados.
- Viewport DOM dessa passagem:648×884. Isso não homologa todos os breakpoints,390px,zoom200% ou movimento reduzido. Os oito originais foram conferidos contra o manifesto SHA256: nenhuma alteração.
- Na revisão para commit, a aba ativa em `localhost:4200/recipes/items/5301` retornou “Não foi possível acessar o site”. A expansão e o limite de peso foram verificados pela suíte Angular, sem nova confirmação visual; os testes não substituem a captura renderizada.

Reconsulta pública em22/10: [BDO Workshop](https://bdoworkshop.com/) mantém descrição de crafting/scans, com ferramentas dependentes de JavaScript; [Garmoth](https://garmoth.com/) apresenta planejador e tabelas. BDO Codex5301 e BDOLytics Processamento não puderam ser abertos nessa reconsulta. As consultas e a tabela de maestria não comprovam duração universal por método; por isso não foi inventado um tempo de60s para todo processamento em massa.
