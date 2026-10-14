# Interações

Modo simples é o padrão. Na receita, manter produto, fórmula, número de operações e maestria aplicável na primeira faixa; mostrar rendimento e tempo estimados sem exigir confirmação. Uma operação multiplica cada insumo da fórmula pela quantidade escolhida. O resultado e o início da árvore com os insumos ativos devem aparecer cedo no primeiro viewport. Não esconder dados obrigatórios ausentes: lucro e melhor combinação ficam pendentes, com a causa visível no resultado.

Seleção de estoques, impostos, premissas, filtros e controles secundários ficam em detalhes no próprio contexto, sem modo avançado global. Preservar o componente do grafo montado, `root`, seleção, escolhas de receitas, pan e zoom.

Clique no card: selecionar e explorar/recolher a dependência quando aplicável. Botão de detalhes explícito permite consultar dados sem alternar ramo ou deslocar a página inteira. Detalhes abrem em painel com rolagem própria; ao fechar, devolver o foco ao acionador original, inclusive quando veio do grafo ou do produto raiz. Usar eventos sem propagação ambígua entre ação principal e botão secundário. Drag acima de um limiar de 5 px não deve gerar clique de expansão.

Hover altera fundo/contorno, pressed dá resposta imediata, selected mantém contorno e indicador, expanded/collapsed têm chevron e `aria-expanded`. Foco permanece visível. Loading não troca as dimensões do card. Animação de ramos em 140–200 ms com opacity e transform; reduced-motion evita animação.

Painel de detalhes tem texto selecionável e rolagem própria. Scroll interno não vira zoom da árvore.

Otimização usa apenas um plano completo e classificável por lucro por hora. Nunca rotular comparação parcial de custo ou cotação ausente como “melhor combinação”. A caixa de cada insumo ativo escolhe fazer/coletar quando marcada e comprar quando desmarcada. Detalhes de impostos, estoque e tempos ficam sob demanda; preços de produção vêm da API e de seu cache com data.

No Mercado, alinhar ícone e nome à esquerda. A linha inteira é um botão nativo, incluindo suas métricas, com foco visível e acionamento por Enter/Espaço. A lista apresenta média observada em 30 dias, sem substituir média ausente por preço atual. Cabeçalho da média ordena somente a página enquanto a API não oferecer ordenação global por média. Preço atual, limites, estoque e última venda pertencem aos detalhes. Gráfico usa observações verificadas e mantém lacunas; ausência de histórico não gera uma curva inventada. O resumo de produção reutiliza o cálculo da receita, com três cenários, maestria aplicável, taxas e tempo; fórmulas base não representam custos de variantes aprimoradas.

Se a quantidade de um insumo ativo não existe no catálogo, mantenha sua linha visível com “Quantidade pendente”; nunca mostre zero como se fosse medido. Habilite maestria somente se alterar de fato um rendimento de fórmula ativa no cálculo. Ao consultar preços em lotes, preserve os lotes concluídos mesmo quando outro falhar.

Categorias do Mercado devem quebrar nomes longos e crescer em altura, sem rolagem horizontal. Ordenação explícita da lista fica nos cabeçalhos da tabela; não duplicar com um seletor “Ordenar por” na toolbar.

Roda normal sobre a árvore rola a página; Ctrl/Command + roda controla zoom. Importação de perfil deve permitir criar um destino sem sair da revisão e selecionar explicitamente os campos válidos, sem aceitar ambiguidades automaticamente. Hipóteses iniciais de coleta são estimativas informadas/editáveis; não provam origem coletável e não devem virar plano otimizado conclusivo sem validação da origem e do rendimento.

Oficina compacta: ajuste fino de rendimento e hipóteses sem perfil ficam nas configurações locais. Fórmula, quantidade e maestria usam altura consistente; atalhos de quantidade usam o botão Helm compartilhado. Não ocultar pendências de cálculo ao compactar.

Desktop da oficina: produto/configurações e resultado ficam em dois boxes lado a lado; a árvore ocupa a largura abaixo. Empilhar os boxes apenas em telas estreitas. O resumo do Mercado mantém sua composição própria.

Ações clicáveis habilitadas usam cursor pointer. Otimizar lucro/hora precisa de aparência explícita de botão (fundo carvão, borda dourada), inclusive sobre cabeçalho bronze.

Busca de otimização de receita longa deve rodar em Web Worker, com cancelamento e status. Não executar solver exato em computed da thread principal. Manter o cenário anterior visível durante cálculo e invalidar respostas quando entradas mudarem.

Atualização 12/10/2026: usuário pediu novamente zoom pela roda sem modificador dentro do canvas. Ícone/nome do node não abre detalhes; usar botão único de informação. Painel de detalhes fecha com clique fora e tem largura desktop máxima 780px.

Card do grafo: corpo apenas seleciona. Expandir/recolher somente no botão específico; abrir detalhes apenas no ícone. Expansão com origens/sem receita não abre detalhes automaticamente.
