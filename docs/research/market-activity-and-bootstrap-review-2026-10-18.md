# Atividade de mercado e bootstrap — 18/10/2026

## Consulta pública

Reconsulta em 18/10/2026 das superfícies relevantes. A navegação renderizada da rodada anterior está documentada em [revisão do fluxo](recipe-market-flow-review-2026-10-18.md); ela não substitui a indicação dos limites da consulta atual.

| Fonte                                                           | Resultado desta consulta                                                                                                | Consequência                                                                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [Workshop](https://bdoworkshop.com/crafting-workshop)           | Leitor sem acesso ao caminho. A consulta renderizada anterior mostrou oficina com compra/produção e estoque.            | Sem novo resultado numérico pareado; não inferir algoritmo.                                                                            |
| [Codex](https://bdocodex.com/us/recipes/culinary/)              | Leitor recusou URL; lista culinária foi vista na rodada anterior.                                                       | Referência de relações/ingredientes, sem comprovação de volume de vendas.                                                              |
| [BDOLytics](https://bdolytics.com/en/crafting?category=cooking) | Leitor sem conteúdo. A calculadora por categorias foi observada anteriormente.                                          | Nenhuma unidade/período de atividade foi confirmado nesta consulta.                                                                    |
| [Garmoth](https://garmoth.com/market)                           | Hub público distingue favoritos acompanhados nos últimos 15 dias, tendências relativas a estoque e movimentos de preço. | São métricas com definições próprias; isso não torna o contador acumulado do nosso provedor uma série diária nem garantia de liquidez. |

Não houve cópia de datasets/preços nem confirmação de fórmula privada. DATA-02 continua dependente de fonte permitida com unidade, período e frescor.

## Correção local

O código rotulava `totalTrades` como vendas, convertia contadores para Number e exibia estoque nulo como zero. A nova apresentação usa negociações acumuladas, BigInt e estoque não informado. O filtro explica que dados desconhecidos continuam visíveis e não promete volume diário/liquidez; sua política e o ranking não foram alterados. Home passou a descrever lucro estimado e dados de atividade.

## Bootstrap e medida

O metafile apontou uma dependência indireta de analytics pelos logs operacionais. O classificador de área agora é um módulo puro independente. A raiz inicia analytics após renderização com guarda de destruição, preservando serviço e consentimento. O bundle caiu de 503,37 para 500,75 kB, mas o aviso de 500 kB continua excedido. O registro de tutoriais continua no grafo inicial; uma tentativa de pureza não trouxe redução adicional e foi revertida. Não elevar budgets nem retirar recursos para fechar o item.

Casos RED/GREEN focados cobrem inicialização após render, destruição da raiz, contador acima do limite seguro de Number, rótulo e estoque desconhecido. Gates e commits em ACTIVE_CONTEXT §184.
