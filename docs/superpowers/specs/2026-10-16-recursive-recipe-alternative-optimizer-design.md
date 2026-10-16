# Otimizador de fórmulas alternativas e subreceitas — desenho

**Data:** 16/10/2026 · **Estado:** desenho proposto para revisão do usuário.
**Aprovação de escopo:** explorar todas as fórmulas candidatas do produto selecionado e alternativas recursivas de subreceitas.

## Problema

O botão “melhor lucro possível” otimiza escolhas de aquisição e produção dentro da árvore que já foi resolvida para uma única fórmula por item. `resolveRecipeProductionGraph` escolhe um produtor padrão ou o método selecionado; `ProductionPlannerInput.candidates` recebe um `recipeId` por candidata. Assim, a busca pode comparar comprar, produzir e coletar numa árvore selecionada, mas não prova que outra fórmula do item final ou de um ingrediente intermediário renderia melhor. O limite atual é 10.000 estados e deve continuar explícito.

## Resultado esperado

Ao otimizar um item final escolhido, comparar:

1. todas as fórmulas conhecidas que produzem esse item no snapshot ativo do catálogo;
2. alternativas de fórmula para cada subreceita alcançável recursivamente;
3. as opções de compra, produção e coleta que já são suportadas para materiais necessários, usando o inventário livre/reservas existentes.

Cada fórmula final usa o mesmo número de operações informado pelo controle `crafts` atual; cada uma mantém seu próprio rendimento, materiais e tempo observados no catálogo/modelo. Região, instante e snapshot de cotação, impostos, perfil/maestria, pesos, inventário, estimativas de coleta/tempo, configurações de subprodutos e limite de busca ficam idênticos entre candidatas. Os resultados mostram tanto o número produzido quanto o lucro econômico líquido por hora, sem afirmar que lotes de saída diferentes têm a mesma quantidade. Mantêm-se as regras atuais de quantidade, rendimento, imposto, estoque, orçamento e peso.

## Fluxo do usuário

- A ação continua explícita na oficina de receita e parte do item final que o jogador está examinando.
- O cálculo baixa/resgata as receitas candidatas e relações necessárias daquele item e das subreceitas alcançáveis; não consulta todo o catálogo.
- Uma única execução compara as fórmulas finais e as alternativas recursivas com o snapshot de entrada imutável. Mudança de contexto invalida a prévia, como já ocorre.
- A prévia apresenta a fórmula final vencedora, a trilha de subreceitas escolhida e as decisões de compra/produção/coleta. O jogador ainda precisa aplicar ou descartar o resultado.
- Quando a busca termina sem pendências, informa que o ótimo foi certificado **dentro das fórmulas, dados e regras recebidos**. Se faltar dado ou o limite for atingido, mostra o melhor candidato conhecido como não certificado e mantém o resultado em estado incompleto.

## Modelo de busca

- Adicionar às entradas do planejador os conjuntos de fórmulas produtoras por `itemId`, acompanhados pela versão única do dataset. O grafo deve reter fórmulas alternativas, não apenas o produtor resolvido para exibição.
- Uma decisão de estado combina, para cada material demandado, a fonte (`buy`, `produce` ou `gather`, com `stock` descontado pelas regras atuais) e, quando a fonte é `produce`, a receita produtora específica. A fórmula final também é uma decisão explícita. **Decisão aprovada pelo usuário:** cada plano escolhe uma única fórmula para cada item intermediário; não divide a demanda de um mesmo item entre fórmulas diferentes.
- Expandir somente a partir de itens demandados pela candidata; itens não alcançáveis não aumentam o espaço de busca. Cachear consultas por item e versão; deduplicar estados por decisões canônicas de fonte/fórmula. Cache de avaliação só pode usar a candidata raiz, o snapshot completo e todas as decisões de fonte e fórmula; `(itemId, recipeId)` isolados não são chave suficiente porque estoque compartilhado, sobras e lotes alteram o resultado.
- Eliminar uma escolha produtora somente se ela levar a ciclo comprovado, receita inválida para o item, versão de dataset incompatível ou entrada impossível já identificada. Registrar a razão da exclusão.
- Poda por lucro/hora só é permitida quando o limite superior de receita/profit e o limite inferior de duração/custo forem admissíveis também para fórmulas alternativas, subprodutos, substituições raras, coleta e compartilhamento de estoque. Onde não houver prova, explorar o estado sem poda; a implementação inicial pode desativar a poda para preservar exatidão.
- O limite de segurança mantém teto de 10.000 estados nesta entrega. A contagem inclui estados expandidos entre fórmulas finais e recursivas. Limite atingido significa `best found`, nunca `globally certified`.
- Dinheiro continua inteiro e a comparação de taxas permanece por multiplicação cruzada inteira. Empates têm ordenação determinística.

## Dados incompletos e ciclo de vida

- Quantidade, rendimento, tempo, preço, disponibilidade/idade de cotação e rendimento de coleta não podem ser sintetizados. Alternativas sem premissa suficiente aparecem como candidatas incompletas com o motivo.
- Falha ou corte de consultas de receitas, mismatch de dataset ou resultado parcial não autoriza declarar que “todas as fórmulas” foram analisadas. O estado deve informar cobertura e motivo da incompletude.
- O worker recebe um snapshot serializável e encerra/ignora execução anterior quando o contexto muda ou o componente é destruído.
- Não chamar rede, ler dados pessoais nem persistir plano durante o cálculo. Estoque e perfil entram apenas pelo adaptador local que já respeita reservas e privacidade.

## Saída / apresentação

- Retornar os melhores planos viáveis encontrados por candidata, separadamente das alternativas sem premissas suficientes. Adicionar metadados globais de busca e um `bestFound` distinto do `best`: `best` só existe quando a busca global foi certificada; `bestFound` pode existir com `complete=false` e deve ser rotulado como não ótimo. A lista atual `ranked` não pode ocultar truncamento global.
- Expor metadados: quantidade de fórmulas finais encontradas/avaliadas, alternativas recursivas avaliadas, estados visitados/podados, `complete`, motivo de incompletude e versão do catálogo.
- Se algum candidato está completo mas a busca global foi truncada, preservar o melhor candidato para comparação visual sem apresentá-lo como ótimo; não o misturar ao estado que hoje significa plano certificado.
- A aplicação do plano mantém o comportamento atual de prévia/confirmar/descartar, mas precisa aplicar também a fórmula final e as fórmulas intermediárias selecionadas (não somente as fontes dos materiais). Rótulos distinguem “melhor encontrado” de “ótimo certificado” e apontam entradas pendentes.

## Limites

- A garantia cobre apenas fórmulas disponibilizadas pelo catálogo/versionamento ativo e entradas presentes na mesma execução. Ela não prova que o dataset contém todas as receitas do jogo.
- O resultado é ótimo dentro da função objetivo, impostos, preços, disponibilidade, estimativas e configurações recebidos. Não prova venda futura, liquidez, regra oculta de concorrente ou melhor atividade geral do jogo.
- A busca continua limitada em tamanho e pode ficar inconclusiva em grafos grandes; aumentar o teto sem medição não faz parte deste desenho.
- Recomendações por prata/h para grind, pesca, caça e coleta geral continuam fora do escopo; coleta só participa quando existe estimativa explícita utilizável.

## Evidência e pesquisa competitiva

- No código local em 16/10/2026, `production-planner.ts` escolhe o primeiro produtor disponível por item (ou `customRecipes`) e percorre decisões alcançáveis numa busca com teto 10.000. O adapter recebe `RecipeProductionGraph`, que contém produtor resolvido por item. O worker da árvore executa `planProduction` em snapshot.
- Revisão pública de BDO Codex em 16/10 para Balenos Meal #9601 apresenta “Possible substitution”, o grupo #6523 e ingredientes declarados. Isso comprova que alternativas/substituições podem ser expostas como dado de item; não prova o algoritmo econômico do Black Market nem a implementação interna de outro site. [BDO Codex — Balenos Meal #9601](https://bdocodex.com/us/item/9601/).
- A página pública do BDO Workshop do plano 9601 não foi legível pelo mecanismo de pesquisa nesta consulta. Deve ser conferida no browser público e registrada como indisponível/observação, sem tentar endpoint interno.
- Garmoth Market público expõe rótulos “Popular Items”, “Trending Items” e métricas de mercado, mas a consulta retornou agregados vazios na região EU. Isso não fornece uma fórmula comparável de receita. [Garmoth Market](https://garmoth.com/market).
- BDOLytics da receita vinculada não ficou acessível pelo mecanismo de pesquisa. Consultar visualmente se necessário, sem login ou endpoint não documentado.
- O objetivo da comparação do Black Market vem das regras/cálculos locais verificados, não de copiar métricas ou dados concorrentes. Atualizar a ficha competitiva antes da implementação com os quatro sites e seus limites observáveis.

## Critérios de aceitação

1. Um grafo pequeno com duas fórmulas finais compara o mesmo número de operações, usa o mesmo snapshot e bate com um oráculo exaustivo.
2. Um caso em que a melhor fórmula intermediária não é a primeira nem a selecionada manualmente é encontrado recursivamente.
3. Compra, produção, coleta explícita, estoque/reservas, impostos, byproducts e desempate permanecem pareados entre todas as alternativas.
4. Ciclos, IDs/métodos inválidos, yields/tempos/preços ausentes e versões divergentes aparecem como incompletos ou descartados com motivo testável.
5. Busca completa só certifica ótimo quando toda alternativa elegível foi avaliada ou removida por poda provada; limite atingido devolve melhor encontrado não certificado.
6. O worker/UI mostram progresso, fórmula final/intermediária escolhida, diferenças, contagens e cobertura; preservam prévia/confirmar/descartar e invalidam resultado quando as premissas mudam.
7. Specs do planejador/adapter/worker/página e verificações globais passam; não alterar fontes de preço, catálogos ou banco persistente para forçar casos.
