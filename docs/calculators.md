# Calculadoras do Black Market

As regras estão em `packages/calculators`, com saídas JSON e prata representada por strings inteiras. O pacote gera CommonJS para NestJS e ESM para Angular. Modelo: `1.0.0`. Entradas usam Zod no domínio e no limite HTTP. A interface mostra premissas e permite presets pessoais; não fornece tabelas de itens inventadas.

## Mercado

Prata líquida = floor(preço × quantidade × (1 − imposto) × (1 + bônus de coleta)). O Value Pack adiciona 30 pontos percentuais ao bônus de coleta após o imposto. O padrão é imposto 35%, confirmado no [guia oficial SA](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=47), que também informa 84,5% coletados com Value Pack. A fórmula soma os outros bônus informados manualmente; não deduz fama ou anel automaticamente. Isenção devolve o bruto. Bônus resultando em coleta acima de 100% são rejeitados. Comparações inválidas são indisponíveis. Arredondamento: para baixo no total coletado; preço de equilíbrio arredondado para cima.

## Crafting

Insumos têm quantidade por craft, estoque e preço unitário. O custo econômico inclui todos os materiais usados; o caixa necessário considera só os faltantes mais custos extras. Materiais em estoque não são tratados como gratuitos. Quantidades e rendimento esperado admitem até três casas; custos são arredondados para cima por linha. A receita esperada é arredondada para baixo na unidade mínima de prata.

Lucro = receita líquida − custo econômico. Margem = lucro / receita líquida; prata/hora usa o tempo total informado. Yield, mastery, subprodutos e procs precisam de dados do usuário; não há rendimento automático de todas as receitas.

## Cadeias de produção

Receitas manuais têm produto, yield inteiro e ingredientes que podem ser comprados ou produzidos por outra receita. Estoque é identificado pelo nome normalizado, na região selecionada. Um plano consome uma cópia lógica do estoque, aproveita excedentes entre ramos e arredonda para cima o número de crafts. Detecta ciclos, IDs duplicados, referências ausentes e profundidade acima de 30. Cada demanda é limitada a 10^12 unidades. Saída inclui compras, estoque inicial usado, excedente usado, produtos e tarefas em ordem de dependência. Não altera o armazém real nem reserva materiais para outros projetos.

## Enhancement

É uma distribuição discreta no horizonte informado, com estado mantido após falha. Chance inicial, aumento por falha e teto são fornecidos pelo usuário. Pity zero desativa a garantia; caso contrário, após `pity − essência atual` falhas, a tentativa seguinte é garantida. Chances reais por item/failstack, downgrade e destruição não são inferidos.

Para cada tentativa, a chance de alcançá-la multiplica seu custo; a chance de falhar nela multiplica o reparo/perda. O custo de stack inicial é alocado uma vez. A tentativa garantida tem custo próprio configurável. Probabilidades usam escala inteira de 10^12, com arredondamento em cada passo; médias monetárias são arredondadas para cima. Existe um pequeno erro de truncamento probabilístico, especialmente relevante para valores extremos. O gasto esperado inclui caminhos sem sucesso ao fim do horizonte e não representa automaticamente o custo de adquirir o item. Retorna CDF, chance restante, média de tentativas, mediana e percentis alcançados.

## Failstack

Modelo de rodadas: uma rodada começa pagando o stack-base; exige falha em cada etapa. Um sucesso indesejado reinicia todo o caminho. O custo esperado da rodada inclui tentativas alcançadas e custos extras após falha. Custo total esperado = custo esperado por rodada / probabilidade de todas as falhas da rodada. Probabilidades e custos são calculados com razões inteiras exatas; resultado monetário arredondado para cima. Até 30 etapas. Chances 100% são inválidas porque impossibilitam completar uma cadeia de falhas.

## RNG box / Night Vendor

Um único resultado exclusivo por caixa. Probabilidades em duas casas devem somar 100%, incluindo um resultado de valor zero quando necessário. Valor esperado é a soma das probabilidades × quantidade × receita líquida de cada resultado. Lucro esperado desconta o preço da caixa. A chance de pelo menos um resultado individual lucrativo em N caixas pressupõe sorteios independentes; não é probabilidade de lucro do lote.

## Atividade, investimento, treino e gear

Sessões somam drops vendidos após imposto, prata direta e despesas. A média histórica é ponderada pelo tempo registrado. Prata/energia fica indisponível com energia zero. Retorno do upgrade usa custo / aumento de lucro por hora; sem aumento positivo não há payback. Treino usa XP restante / XP por hora medido e arredonda sessões para cima. Gear compara AP principal + DP ou AP despertar + DP, com ganhos de upgrades informados manualmente; não inclui brackets ou bônus adicionais.

## API

`POST /api/v1/calculators/:tool` admite `market`, `crafting`, `production`, `enhancement`, `failstack`, `box`, `activity`, `investment`, `training` e `gear`. Retorna ferramenta, versão do modelo, fonte `user-input` e resultado. Erros de entrada viram HTTP 400 com campos; ferramenta desconhecida vira 404.

Testes cobrem prata acima de Number.MAX_SAFE_INTEGER, imposto/Value Pack, oportunidade do estoque, enumeração independente de tentativas, fronteira do pity, reinício de failstack, soma de probabilidades RNG e compartilhamento de estoque/excedentes em cadeias. A API testa contratos inválidos; o armazenamento pessoal testa recuperação e versões/IDs de backup.
