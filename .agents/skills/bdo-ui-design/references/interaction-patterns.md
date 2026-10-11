# Interações

Modo simples é o padrão. Na receita, manter produto, fórmula, número de operações e maestria aplicável na primeira faixa; mostrar rendimento e tempo estimados sem exigir confirmação. Uma operação multiplica cada insumo da fórmula pela quantidade escolhida. O resultado e o início da árvore com os insumos ativos devem aparecer cedo no primeiro viewport. Não esconder dados obrigatórios ausentes: lucro e melhor combinação ficam pendentes, com a causa visível no resultado.

No avançado: seleção de estoques, impostos, premissas, filtros e controles secundários. Preservar o componente do grafo montado, `root`, seleção, escolhas de receitas, pan e zoom ao alternar.

Clique no card: selecionar e explorar/recolher a dependência quando aplicável. Botão de detalhes explícito permite consultar dados sem alternar ramo ou deslocar a página inteira. Detalhes abrem em painel com rolagem própria; ao fechar, devolver o foco ao botão do material. Usar eventos sem propagação ambígua entre ação principal e botão secundário. Drag acima de um limiar de 5 px não deve gerar clique de expansão.

Hover altera fundo/contorno, pressed dá resposta imediata, selected mantém contorno e indicador, expanded/collapsed têm chevron e `aria-expanded`. Foco permanece visível. Loading não troca as dimensões do card. Animação de ramos em 140–200 ms com opacity e transform; reduced-motion evita animação.

Painel de detalhes tem texto selecionável e rolagem própria. Scroll interno não vira zoom da árvore.

Otimização usa apenas um plano completo e classificável por lucro por hora. Nunca rotular comparação parcial de custo ou cotação ausente como “melhor combinação”. A caixa de cada insumo ativo escolhe fazer/coletar quando marcada e comprar quando desmarcada. Detalhes de impostos, estoque, preços próprios e tempos ficam sob demanda.
