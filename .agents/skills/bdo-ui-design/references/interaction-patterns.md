# Interações

Modo simples é o padrão. Barra compacta: produto, quantidade, método e acesso ao modo avançado. Não esconder rendimento obrigatório ausente: mostrar aviso e campo necessário junto da ação que depende dele.

No avançado: seleção de estoques, impostos, premissas, filtros e controles secundários. Preservar o componente do grafo montado, `root`, seleção, escolhas de receitas, pan e zoom ao alternar.

Clique no card: selecionar e explorar/recolher a dependência quando aplicável. Botão de detalhes explícito permite consultar dados sem alternar ramo. Usar eventos sem propagação ambígua entre ação principal e botão secundário. Drag acima de um limiar de 5 px não deve gerar clique de expansão.

Hover altera fundo/contorno, pressed dá resposta imediata, selected mantém contorno e indicador, expanded/collapsed têm chevron e `aria-expanded`. Foco permanece visível. Loading não troca as dimensões do card. Animação de ramos em 140–200 ms com opacity e transform; reduced-motion evita animação.

Painel de detalhes tem texto selecionável e rolagem própria. Scroll interno não vira zoom da árvore.
