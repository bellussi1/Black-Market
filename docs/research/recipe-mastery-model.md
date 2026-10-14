# Maestria e otimização de receitas

Revisão: 12/10/2026.

## Objetivo

Maximizar lucro líquido por hora para a quantidade de receitas informada. Cada operação consome todos os ingredientes da fórmula; procs alteram os produtos esperados, não a quantidade de receitas solicitada. O faturamento exibido corresponde ao total estimado da produção.

A busca considera comprar ou produzir cada intermediário alcançável, incluindo intermediários de outros intermediários. Coleta entra somente quando há estimativa calibrada com origem confirmada. Todos os tempos de produção e coleta selecionados entram no denominador; impostos incidem na venda. O ótimo é certificado somente quando a busca termina, dentro das fórmulas selecionadas e dos dados disponíveis. Limite de estados e cotações ausentes não certificam uma combinação ótima.

## Rendimento implementado

Padrão sem perfil: 1000. Intervalo aceito: 0 a 3000. O valor informado usa a faixa inferior de 50 pontos, sem interpolação.

Para receitas de culinária e alquimia com distribuição base padrão de 1 a 4 produtos, usamos o rendimento esperado `2,5 + 1,5 × probabilidade de produto máximo`. Aumentar essa probabilidade redistribui a distribuição base em direção ao máximo; não equivale a multiplicar 2,5 pelo percentual. O resultado usa três casas decimais, conforme o contrato dos calculadores.

As probabilidades são snapshots das tabelas públicas de [culinária](https://garmoth.com/mastery-brackets/cooking) e [alquimia](https://garmoth.com/mastery-brackets/alchemy). A interpretação da distribuição está descrita em [publicação da comunidade no fórum Pearl Abyss](https://www.jp.playblackdesert.com/ja-JP/Forum/ForumTopic/Detail?_topicNo=34677). É um modelo de valor esperado, não garantia de rendimento de uma sessão. Fórmulas fixas e quantidades explícitas do catálogo preservam seu rendimento e não recebem esse proc.

## Limitações que ainda exigem implementação

- Produção em massa de culinária e processamento ainda não ajusta o tempo pela maestria. O tempo atual é por receita consumida, somado para toda a cadeia. Não interpretar o lucro por hora como modelo completo desses efeitos.
- Produtos especiais e aleatórios da alquimia precisam de distribuição e preços próprios para integrar seu valor esperado; probabilidades de classes de itens não identificam os respectivos produtos.
- Outras atividades exigem origem e modelo específico. As tabelas de [coleta](https://garmoth.com/mastery-brackets/gathering), [processamento](https://garmoth.com/mastery-brackets/processing), [caça](https://garmoth.com/mastery-brackets/hunting), [pesca](https://garmoth.com/mastery-brackets/fishing), [navegação](https://garmoth.com/mastery-brackets/sailing) e [treinamento](https://garmoth.com/mastery-brackets/training) foram consultadas; seus bônus não foram aplicados como multiplicador genérico de receitas.
- [Mercado Garmoth](https://garmoth.com/market) é referência consultada; esta alteração não estabelece autorização ou integração como fornecedor de cotações.
