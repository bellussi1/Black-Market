# Otimizador Recursivo de Fórmulas — Plano de Implementação

> **Para agentes de execução:** use `superpowers:subagent-driven-development` para dividir as frentes com interfaces estáveis e revisão por tarefa; tarefas com arquivos/contratos compartilhados devem continuar sequenciais. Cada etapa termina em teste e commit atômico.

**Objetivo:** comparar todas as fórmulas conhecidas do item final e as alternativas alcançáveis de subreceitas, preservando as escolhas atuais de compra/produção/coleta e identificando claramente quando a busca não certificou o ótimo.

**Arquitetura:** o grafo de receitas carrega alternativas recursivas de um único snapshot versionado; o planejador enumera decisões de fonte e uma fórmula única por item, avaliando cada plano com o mesmo cenário econômico. O worker retorna o melhor candidato, cobertura e estado de certificação; a oficina oferece prévia, aplicação e descarte sem ocultar cortes ou dados ausentes.

**Stack:** TypeScript, `@bdo/calculators`, Angular Signals/RxJS, Web Worker, Vitest, API de catálogo existente.

**Especificação:** `docs/superpowers/specs/2026-10-16-recursive-recipe-alternative-optimizer-design.md`.

## Restrições globais

- Fixar o snapshot de preços, região, impostos, perfil/maestria, inventário, reservas, pesos, tempos, estimativas e quantidade de operações para todas as candidatas de uma execução.
- Cada plano escolhe uma fórmula por item intermediário; não divide a demanda do mesmo item entre fórmulas.
- Explorar somente fórmulas alcançáveis a partir do item final e manter todas na mesma versão de catálogo.
- Preservar cálculos inteiros de dinheiro, regras atuais de rendimento/estoque e desempate determinístico.
- Limitar a busca global a 10.000 estados. Busca truncada retorna “melhor encontrado” e nunca certifica o ótimo.
- Não inferir preço, rendimento, tempo, liquidez ou regra do jogo; não consultar endpoints privados nem persistir dados pessoais.
- Preservar a prévia confirmar/descartar, a invalidação por mudança de cenário, a acessibilidade e o cancelamento do worker.
- Atualizar `docs/project-feature-checklist.md` e `docs/ACTIVE_CONTEXT.md`; commits separados por entrega.

## Foco de revisão

- Catálogo com receitas repetidas, alternativas fora da primeira página ou snapshot misturado: testar paginação, deduplicação por chave e rejeição de versão divergente no grafo.
- Item compartilhado por vários ramos ou com estoque/reserva: testar consumo agregado, uma fórmula única e comparação com oráculo exaustivo.
- Rendimento, preço, tempo ou estimativa ausentes; ciclo ou receita inválida: testar motivo de incompletude e impedir certificação indevida.
- Limite de 10.000 estados e empate de taxa: testar melhor candidato não certificado e ordenação determinística por comparação inteira.
- Mudança de cenário ou aplicação da prévia: testar cancelamento/invalidação e aplicação conjunta da fórmula raiz, fórmulas intermediárias e fontes.

---

### Tarefa 1: Modelo global e busca exata no planejador

**Arquivos:**

- Modificar `packages/calculators/src/production-planner.ts`.
- Testar `packages/calculators/src/production-planner.spec.ts`.

**Interfaces:**

- Entrada: acrescentar `catalogVersion?: string` e `recipeAlternativesByItemId?: Record<number, string[]>` a `ProductionPlannerInput`; `recipes` deve conter as definições correspondentes a todas as chaves listadas.
- Plano: acrescentar `recipeChoices?: Record<number, string>` com a fórmula selecionada por item de saída, incluindo o item final.
- Resultado: acrescentar `optimization: ProductionOptimizationResult | null` a `ProductionPlannerResult`. `ProductionOptimizationResult` contém `best`, `bestFound`, `incompleteAlternatives: { itemId: number; recipeId: string; issues: ProductionIssue[] }[]`, `complete`, `reason`, `rootRecipesTotal`, `rootRecipesEvaluated`, `recursiveRecipesEvaluated`, `statesVisited`, `statesPruned` e `catalogVersion`. `best` só é preenchido quando a busca global está completa; `bestFound` pode estar preenchido quando truncada.
- Motivos: usar união discriminada `complete | state-limit | missing-data | dataset-mismatch | cycle | invalid-alternative`.

- [ ] **Passo 1: Escrever teste RED do oráculo pequeno.** Adicionar teste com duas fórmulas finais e duas alternativas recursivas, verificando a melhor taxa por lucro/hora contra enumeração exaustiva e o mesmo número de operações.
- [ ] **Passo 2: Executar o teste para confirmar a falha.** Rodar `pnpm --filter @bdo/calculators exec vitest run src/production-planner.spec.ts -t "recursive recipe alternatives"`; esperado: falha porque a entrada/resultados ainda não representam escolhas de fórmula globais.
- [ ] **Passo 3: Escrever e executar testes RED de item compartilhado, escolhas de origem, ciclo/dado ausente, versão incompatível e limite.** Confirmar fórmula única para item compartilhado; compra/produção/coleta e estoque pareados; alternativas incompletas listadas com motivo; truncamento retorna `bestFound`, mantém `best` nulo e reporta contagens. Esperado: os novos casos falham pelas capacidades ausentes.
- [ ] **Passo 4: Implementar a enumeração global em `planProduction`.** Indexar candidatas por item, incorporar decisões de fórmula ao estado canônico junto às fontes, manter estoque/sobras/lotes na avaliação completa e contar até 10.000 estados globais. Não reaproveitar poda cuja admissibilidade não esteja provada para alternativas; `statesPruned` conta apenas exclusões justificadas.
- [ ] **Passo 5: Executar a suíte do planejador.** Rodar `pnpm --filter @bdo/calculators exec vitest run src/production-planner.spec.ts`; esperado: todos os testes passam e cenário legado sem `recipeAlternativesByItemId` mantém o comportamento existente.
- [ ] **Passo 6: Commit atômico do modelo/calculador.** `git add packages/calculators/src/production-planner.ts packages/calculators/src/production-planner.spec.ts`; commit `feat(calculators): optimize recursive recipe alternatives`.

### Tarefa 2: Carregar alternativas do catálogo com versão consistente

**Arquivos:**

- Modificar `apps/web/src/app/shared/recipe-tree/recipe-production-graph.ts` e `recipe-production-adapter.ts`.
- Testar `apps/web/src/app/shared/recipe-tree/recipe-production-graph.spec.ts` e `recipe-production-adapter.spec.ts`.

**Interfaces:**

- `RecipeProductionGraph` acrescenta `producerAlternativesByItemId: ReadonlyMap<number, readonly CatalogRecipe[]>` e `rootAlternatives: readonly CatalogRecipe[]`.
- `resolveRecipeProductionGraph(root, api, selectedMethods, expectedDatasetVersion)` mantém a assinatura e retorna as alternativas da raiz e de todos os itens intermediários alcançáveis.
- `buildRecipeProductionInput` transforma essas alternativas em `recipes`, `recipeAlternativesByItemId` e `catalogVersion`, preservando o produtor selecionado como padrão de exibição.

- [ ] **Passo 1: Escrever testes RED do carregador.** Cobrir duas alternativas da raiz, alternativa que revela ingrediente exclusivo, paginação completa, deduplicação, cache por item/versão, ciclo e mismatch de versão.
- [ ] **Passo 2: Executar os specs focados para confirmar a falha.** Rodar `pnpm --filter @bdo/web exec vitest run src/app/shared/recipe-tree/recipe-production-graph.spec.ts`; esperado: ausência dos novos campos e alternativas recursivas.
- [ ] **Passo 3: Implementar carregamento incremental.** Consultar somente itens alcançáveis, limitar concorrência conforme padrão atual, manter versão única e registrar candidato sem dado suficiente sem descartá-lo silenciosamente.
- [ ] **Passo 4: Escrever teste RED do adapter.** Confirmar que conversão de cada alternativa preserva ID, rendimento, inputs, retornos, porções especiais e tempos existentes; garantir snapshot de preços e perfil compartilhado.
- [ ] **Passo 5: Adaptar grafo ao planejador e rodar os dois specs.** Rodar os mesmos specs incluindo `recipe-production-adapter.spec.ts`; esperado: todos passam e graph atual da árvore continua usando o método selecionado.
- [ ] **Passo 6: Commit atômico do carregamento/adaptação.** Incluir apenas os quatro arquivos desta tarefa; commit `feat(recipes): load recursive production alternatives`.

### Tarefa 3: Worker, prévia e aplicação de decisões

**Arquivos:**

- Modificar `apps/web/src/app/shared/recipe-tree/production-planner.worker.ts`, `recipe-tree.ts` e `recipe-tree.html`.
- Testar `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`.

**Interfaces:**

- Worker recebe um `ProductionPlannerInput` serializável já limitado ao grafo alcançável e devolve `ProductionPlannerResult` com metadados globais.
- `recipe-tree.ts` envia a versão/candidatas no snapshot, invalida e encerra cálculo quando premissas mudam, e aplica `recipeChoices` junto com `sourceChoices` apenas após confirmação.
- A prévia mostra fórmula raiz, fórmulas intermediárias, fontes, lucro/hora, contagens/cobertura e motivo de incompletude; estados truncados são rotulados “melhor encontrado, ótimo não certificado”.

- [ ] **Passo 1: Escrever testes RED de UI/aplicação.** Cobrir exibição de alternativas escolhidas, estado incompleto/limitado, aplicação conjunta de fórmulas e fontes após confirmar, descarte sem mutação e invalidação quando preço/maestria/lote mudam.
- [ ] **Passo 2: Executar o spec direcionado para confirmar a falha.** Rodar `pnpm --filter @bdo/web exec vitest run src/app/shared/recipe-tree/recipe-tree.spec.ts -t "recursive optimizer"`; esperado: metadados/decisões globais ausentes.
- [ ] **Passo 3: Ligar o worker ao resultado global.** Manter cancelamento, proteção contra resposta obsoleta e transferência de snapshot sem rede/persistência no worker.
- [ ] **Passo 4: Implementar prévia e aplicação explícita.** Exibir candidatas incompletas e motivos; preservar confirmação/descarte. Não aplicar automaticamente `bestFound` ao encerrar uma busca limitada.
- [ ] **Passo 5: Executar os specs da árvore e do worker.** Rodar `pnpm --filter @bdo/web exec vitest run src/app/shared/recipe-tree/recipe-tree.spec.ts src/app/shared/recipe-tree/recipe-production-graph.spec.ts src/app/shared/recipe-tree/recipe-production-adapter.spec.ts`; esperado: todos passam.
- [ ] **Passo 6: Commit atômico da interface.** Incluir somente worker, componente, template e spec; commit `feat(web): preview recursive recipe optimization`.

### Tarefa 4: Integração, regressão e continuidade do projeto

**Arquivos:**

- Modificar `docs/project-feature-checklist.md`, `docs/ACTIVE_CONTEXT.md` e, se necessário, `docs/research/market-recipe-competitive-review-2026-10-16.md`.
- Não alterar migrations, preços, dataset, credenciais nem seeds persistentes.

- [ ] **Passo 1: Executar verificações focadas de ponta a ponta.** Repetir specs do calculador, adapter, graph, worker e árvore; esperado: todos passam sem teste ignorado novo.
- [ ] **Passo 2: Executar qualidade global e build.** Rodar `pnpm check`, `pnpm test`, `pnpm test:ssr` e `pnpm --filter @bdo/web build`; registrar totais, skips e warnings reais. Investigar toda regressão em vez de elevar timeout ou budget para ocultá-la.
- [ ] **Passo 3: Rever os critérios da especificação.** Confirmar oráculo exaustivo, taxa inteira, fórmulas recursivas, fontes/estoque, ciclo/dados/versionamento, teto de estados e preview/apply/discard; manter pendências como parciais se algum critério falhar.
- [ ] **Passo 4: Atualizar checklist e handoff.** Registrar arquivos, comandos/resultado, limite do catálogo e próximo passo; marcar a feature concluída somente se buscas completas distinguirem candidato encontrado de ótimo certificado e a cobertura estiver testada.
- [ ] **Passo 5: Commit atômico documental.** Commit `docs: record recursive optimizer verification`.

## Execução paralela e ordem

Tarefa 1 define o contrato do planejador. Tarefa 2 pode desenvolver o carregador em paralelo com Tarefa 1 se mantiver o contrato de `RecipeProductionGraph` acima; Tarefa 3 depende das duas e deve seguir depois delas. Tarefa 4 fecha a validação integrada. Revisar cada entrega antes de iniciar tarefas dependentes; não criar ramos concorrentes que editem `production-planner.ts` ou `recipe-tree.ts` ao mesmo tempo.

## Autorrevisão do plano

- Cobertura da especificação: fórmulas raiz/recursivas, mesma quantidade e cenário, fonte/estoque, versões, dados ausentes/ciclos, limite/certificação, metadados do worker, aplicação confirmada, limites externos e documentação estão atribuídos às tarefas 1–4.
- Interfaces entre tarefas estão nomeadas no plano; alternativas chegam por `RecipeProductionGraph`, passam pelo adapter e entram no planejador como `recipeAlternativesByItemId`.
- Casos de alto risco listados em “Foco de revisão” têm testes RED atribuídos às tarefas responsáveis.
- As tarefas são sequenciais onde compartilham contratos; só o solver e o carregador podem avançar paralelamente com o contrato registrado.
- Nenhum passo muda preço/dataset ou usa snapshot concorrente como regra de cálculo.
