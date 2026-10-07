# Calculadoras

Calculadoras serão implementadas como funções puras, com unidades declaradas, entradas validadas e fontes rastreáveis. A interface deve mostrar premissas, bônus, preço usado e horário/região, com o resultado separado de qualquer estimativa comunitária.

## Primeiros cálculos

### Crafting

Uma receita tem ingredientes, rendimentos/produtos, custo de material, taxa aplicável e preço de venda. Para uma cadeia recursiva, detectar ciclos, permitir profundidade máxima e escolher explicitamente comprar ou produzir cada insumo. Exibir custo, receita bruta/líquida, lucro, margem e sensibilidade a variação do preço. Resultado não deve assumir quantidade infinita de estoque.

### Enhancement

Modelar chance por nível/failstack, custos de tentativa, reparo/crons, proteção e pity conforme versão/regra regional vigente. Exibir custo esperado e chance de sucesso por limite de tentativas, não apenas “custo médio”. Cálculo probabilístico deve ser validado por fixtures independentes e versão identificado.

## Regras comuns

- Usar aritmética decimal ou inteiros na unidade mínima; nunca binary floating point para dinheiro.
- Indicar “estimativa” quando probabilístico ou derivado de amostras.
- Separar input do usuário de dado importado e gravar data/fonte em exportações.
- Testar casos-limite: item sem preço, receita sem rendimento, ciclos, zero tentativas, pity, arredondamento e região ausente.
- Não copiar código-fonte ou tabelas proprietárias de outros sites. Reimplementar somente regras validadas e com procedência documentada.

## Sequência sugerida

1. Imposto do mercado com modificadores explícitos.
2. Lucro simples de receita e comparação comprar/produzir.
3. Cadeias de crafting para culinária/alquimia/processamento.
4. Simulador de enhancement/failstack com intervalo de resultados.
5. Outras utilidades: XP, life mastery e progressão conforme cobertura e confiança dos dados.
