# Calculadora: cenários e prévia de otimização

Implementação de 12/10/2026 baseada nas observações de `bdo-workshop-plan-1408-observations.md`.

## Comportamento

- Comprar subreceitas compra os intermediários necessários e fabrica o produto final.
- Fazer/coletar tudo produz os intermediários selecionados; matérias-primas usam compra de mercado/NPC. Coleta exige origem e estimativa válidas.
- Otimizar lucro por hora executa a busca existente em Worker e apresenta uma prévia, mantendo o cenário anterior. Aplicar combinação atualiza as escolhas; fechar não as altera. Mudanças em quantidade, maestria, cotações, grafo, tempos, perfil ou política invalidam o resultado. Alterar uma escolha manual encerra a prévia.
- Prévia mostra lucro/hora, lucro total, custo econômico e tempo, com escolhas por item e operações/tempo por etapa em detalhes. O painel aplicado também mostra faturamento bruto, líquido e tempo integral.
- `marketAcquisition: preorder` permite compras aos preços cotados. Espera e transporte não entram no tempo; não é garantia de compra imediata.
- `marketAcquisition: produce-sold-out` impede comprar um item de mercado com estoque zero. O otimizador precisa produzir, usar estoque próprio ou encontrar coleta calibrada. Oferta parcial ainda pode exigir pré-ordem; esta política não significa executar todo o lote imediatamente. Disponibilidade desconhecida permanece pendente se houver compra. NPC não é bloqueado por estoque de mercado, e estoque próprio é usado antes das compras.
- A política de esgotados é independente da prata/tempo disponível no perfil. Não reintroduz restrições de orçamento na simulação econômica.
- Lucro = faturamento líquido (incluindo subprodutos explicitamente modelados) menos custo econômico; lucro/hora usa a soma dos tempos de todas as etapas produzidas. Maior lucro total não é necessariamente maior lucro/hora.

## Verificação

- Teste histórico reproduz Buy all do Workshop: 1000 operações, 10000 produtos, 6000s, venda líquida 1.580.150.000.000, materiais 1.177.010.000.000, lucro 403.140.000.000 e lucro/hora 241.884.000.000. Preços EU ficam no teste e não são enviados à aplicação.
- Teste de política confirma troca de compra por produção quando o intermediário esgota, mantendo NPC disponível. Teste de tempo mantém lucro total e reduz taxa quando uma etapa intermediária demora mais. Testes existentes verificam escolhas multinível e casos de maior lucro total com menor taxa.
- Teste do componente verifica que a resposta do Worker cria a prévia antes de aplicar e permite alterações manuais posteriores.
- `pnpm test`: 622 testes passaram (58 calculators, 128 API, 364 web, 72 scripts). `pnpm check` passou; revisão final de estilo/compilação executada após refinamento do seletor.
- Playwright, 1000 operações e maestria 1000: 1407 clique 57ms/próximo frame 2,7ms; 1408 46ms/3,9ms; 1409 46ms/2,6ms. Cancelamento permanece disponível. Esses tempos não representam o tempo total da busca nem uma certificação de performance para qualquer cadeia.
- Desktop 1280 e mobile 390 com scrollWidth igual ao viewport. Prévia foi conferida visualmente e aplicada usando fixture controlada no navegador; não confundir essa fixture com preço real do catálogo. Capturas locais em `output/playwright/workshop-preview-desktop.png` e `workshop-policy-mobile.png`.

## Limitações preservadas

A busca certifica o melhor resultado da cadeia/fórmulas selecionadas quando conclui dentro do limite. Não compara todas as fórmulas alternativas do catálogo; limite excedido permanece inconclusivo. Proc padrão de alquimia/culinária usa o modelo registrado; produtos especiais/aleatórios, trocas de subprodutos e redução de tempo por produção em massa ainda precisam de modelos e fontes próprias. Apenas preços NPC registrados com fonte entram automaticamente.

Na visita local, faltavam cotações: 1407 apresentou cinco grupos de preços ausentes, 1408 três e 1409 seis. Nenhum preço ausente foi inventado. Validação da aritmética e da UI não comprova lucro realizável sem cobertura de mercado autorizada e atual.

## Estado do otimizador — 16/10/2026

- A busca exata tem orçamento default e máximo de **10.000 estados** (`maxOptimizationStates`); valores maiores recebidos são limitados. Se o orçamento for atingido, o candidato permanece incompleto e nenhum ótimo é certificado. O escopo é a fórmula selecionada e o grafo alcançável, sem busca automática entre todas as fórmulas do catálogo.
- A entrada do Worker inclui estimativas confirmadas de coleta dos materiais alcançáveis mesmo quando o mesmo material também tem receita produtora. A escolha manual permanece na entrada para preservar a decisão já aplicada.
- As regressões em `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts` e `packages/calculators/src/production-planner.spec.ts` cobrem o payload e o caso em que coletar vence comprar/produzir. A suite completa passou; esta correção remove uma omissão de alternativa, mas não certifica lucro realizável sem preço, quantidade disponível e tempo confiáveis.
