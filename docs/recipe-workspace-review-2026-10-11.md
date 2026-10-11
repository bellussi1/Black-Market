# Revisão do workspace de receitas — 11/10/2026

## Escopo e decisão

O fluxo principal é escolher item e fórmula, informar operações e maestria aplicável, ler lucro por hora e a melhor combinação comprovada, e decidir a origem dos insumos ativos ao lado da árvore. Impostos, calibração, estoque e dados de um item ficam sob demanda. A quantidade de receitas é quantidade de operações: 10 operações multiplicam por 10 cada ingrediente da fórmula, antes de rendimento e estoque.

## Correções realizadas

- Removidos controles duplicados de compra/produção em massa, seis presets de lote pouco úteis, cartões econômicos redundantes e seções repetidas de materiais e estimativas.
- O resultado usa quatro métricas compactas. Custo, lucro e lucro por hora só são definitivos quando o plano de produção não possui pendências. Faturamento conhecido pode aparecer mesmo que falte preço de um ingrediente, mas não é apresentado como lucro.
- O botão de melhor combinação só aparece para um plano completo classificado pelo motor. A comparação gulosa de custo com preço bruto foi removida porque não representava lucro por hora nem impostos.
- A lista lateral contém somente materiais necessários no cenário atual, incluindo insumos cuja quantidade falta no catálogo, marcados como pendentes. Cada item tem uma caixa de origem e um botão semântico de detalhes. O painel de detalhes sobrepõe o workspace, possui rolagem própria e devolve o foco ao acionador original ao fechar, mesmo quando a seleção veio do grafo.
- Rendimento fixo verificado e quantidade de saída do catálogo são diferenciados. O catálogo não prova um proc adicional por maestria. O campo de maestria só fica ativo quando uma fórmula de culinária ou alquimia usada no plano tem rendimento variável modelado; processamento e alquimia simples ficam desativados porque a edição não altera o cálculo atual.
- A consulta de mercado de árvores longas é dividida em lotes de até 100 IDs, limite da API. Quando o provedor responde 503, as cotações de lotes já concluídos são entregues e não há requisição individual para cada item restante.

## Validação visual

Medição com Playwright na receita Acompanhamentos Variados, mantendo a mesma resolução e rota antes/depois:

| Viewport   | Início do workspace antes | Depois | Rolagem horizontal depois |
| ---------- | ------------------------: | -----: | ------------------------- |
| 1440 × 900 |                   1177 px | 603 px | Não                       |
| 390 × 844  |                   2300 px | 980 px | Não                       |

Na fórmula longa `/recipes/items/1407`, o navegador confirmou dois lotes de cotações (100 e 17 IDs). O provedor local respondeu 503 porque a fonte de mercado permanece desligada pela política do projeto. Assim, a página informa dados pendentes e não promete lucro por hora ou melhor combinação. Não é uma validação de preços reais.

Capturas da verificação local estão em `output/playwright/`, diretório ignorado pelo Git.

Após a revisão de código, `pnpm check` e `pnpm test` passaram. A suíte total contém 598 testes: 53 de calculadoras, 128 da API, 355 do frontend e 62 dos scripts.

## Continuidade

Uma fonte de mercado permitida e estável ainda é necessária para preencher todas as cotações e medir lucro/hora real de Edania. O modelo de proc por maestria não deve ser inferido apenas da quantidade base do catálogo; requer fonte ou amostras de jogo verificadas. A árvore visual e seu zoom/pan foram preservados.
