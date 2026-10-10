# Especificação: combinação automática de compra e produção

## Objetivo

Acrescentar ao comparador de recomendações uma estratégia automática para uma receita escolhida. O sistema deve avaliar combinações de compra e produção dos materiais intermediários, considerar estoque livre quando essa opção estiver ativada e explicar o resultado com os mesmos dados de preço, rendimento, tempo, impostos, orçamento, peso e disponibilidade já usados pelo planejador.

## Comportamento

- O ranking geral mantém os cenários comprar tudo, produzir tudo e personalizado.
- Quando uma receita está selecionada, o comparador também recebe um número inteiro de operações e calcula uma linha `optimized` para esse produto e quantidade.
- Para cada material com receita produtora no caminho escolhido, o algoritmo testa comprar ou produzir. Materiais sem produtor são comprados.
- O estoque livre é usado antes da compra ou produção apenas quando o controle de estoque estiver ativo. As reservas existentes são excluídas pela entrada do planejador.
- A combinação escolhida maximiza lucro econômico por hora entre as combinações avaliadas. Cotações, disponibilidade, rendimentos, tempo, peso e impostos seguem as validações existentes. Rotas alternativas de receita continuam sendo a primeira fórmula, salvo escolha manual já representada por `customRecipes`.
- A busca é exata dentro do espaço binário de escolhas recebido. O limite padrão é 256 combinações. Se o grafo ultrapassar o limite, a linha fica pendente com `optimization-limit`; o sistema não apresenta uma combinação parcial como ótima.
- Se nenhuma combinação tiver dados e restrições completos, o resultado permanece pendente com os motivos existentes.
- A saída conserva etapas, quantidades compradas/produzidas/do estoque, custo em caixa, custo econômico, faturamento, lucro, lucro/hora, tempo, peso, premissas e problemas.

## Fora do escopo

- Procurar entre todas as fórmulas alternativas de cada item.
- Encontrar ótimo global para múltiplos produtos/receitas ao mesmo tempo.
- Inferir cotações, rendimento, tempo, conversão de qualidade ou chance de venda ausentes.
- Tratar o estoque próprio como gratuito.

## Fontes e confiabilidade

O cálculo usa somente o catálogo local do Black Market, os preços inseridos/consultados, o perfil, o estoque livre e as calibrações já existentes. As pesquisas de `bdo-viewer` e de planejadores navais justificam a busca por estratégias explicáveis, mas não fornecem fórmulas do jogo para este cálculo. Ver `docs/research/master-bdo-knowledge-base.md` e `docs/research/repository-review-calculators-maps.md`.
