# Receita: alinhamento do lucro esperado

## Objetivo

Fazer o lucro esperado das receitas de Folha Verde, Fármaco da Harmonia: Edania, Ração Orgânica e Refeição de Valência contabilizar saídas de produção compatíveis com o BDOlytics e deixar claro quais retornos entram como venda ou ficam guardados.

## Regras observadas

- A comparação usa maestria 3.000, mesma região/mercado, quantidade equivalente e configuração de impostos explicitada. Não altera o padrão salvo de maestria do usuário.
- A maestria usa os brackets publicados em passos de 50; o valor configurado deve ser arredondado para o bracket inferior.
- BDOlytics modela subprodutos comuns e bônus aleatórios de alquimia além do rendimento de saída principal. O retorno comum selecionado por padrão é Reagente Líquido Limpo, 20 unidades por proc; bônus de alquimia são itens de três pools ponderados por chance e peso.
- Itens retornados precisam ter quantidade esperada por operação, preço e decisão independente vender/guardar. Sem preço de venda disponível, o padrão é guardar; usuário pode alterar o item e sua decisão.
- Refeição de Valência inclui o retorno especial calculado para 3.000 de maestria. Ração Orgânica usa sua saída principal esperada por operação.
- O cálculo permanece inconclusivo quando um ingrediente necessário não tem custo seguro; nunca inventar preço de mercado/NPC.
- BDO Workshop não exibe/contabiliza o mesmo detalhamento de retornos nas telas verificadas; sua interface e os seus resultados devem ser apresentados como uma implementação diferente, não como autoridade equivalente para o lucro final.

## Aceitação

- Testes fixam retornos de alquimia para maestria 0, 1.000 e 3.000, incluindo 5,2392 Reagente Líquido Limpo por operação e 0,0716110004 saída total média dos pools a 3.000.
- O adaptador agrega produtos repetidos pelo ID e não cobra duas vezes o mesmo retorno.
- A tela mostra nomes/ícones dos itens catalogados, preço/origem, quantidade estimada e controles vender/guardar; itens de bônus aleatório ficam agrupados e recolhidos por padrão.
- Cada uma das quatro receitas é aberta e simulada com maestria 3.000; preço ausente é registrado como pendência em vez de ser preenchido com suposição.
- Testes automatizados, `pnpm check` e `pnpm test` passam antes de declarar o trabalho concluído.
