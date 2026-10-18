# Receitas, Mercado e consistência de navegação — 18/10/2026

## Pedido e critérios

Reduzir fragmentação e preenchimento duplicado: Mercado com navegação principal compacta; etapas expansíveis como outra visualização do mesmo plano; escolhas de compra/produção e venda/guarda compreensíveis; containers comuns e transições discretas. A logo do menu já usa o favicon no commit `0d5568a`.

## Consulta pública atual

Consulta em 18/10/2026, sem sessão de concorrente ou chamada a endpoints privados. O leitor textual não mostrou algumas ferramentas; o navegador público permitiu observar mais conteúdo. Não foram copiados código, imagens, datasets ou preços.

| Fonte                                                           | Superfície e observação                                                                                                                                                                                                                     | Limite                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/crafting-workshop)       | Região SA visível; uma oficina começa pela escolha do produto e descreve cadeia, estoque e compra/produção por material. Workbench salvo exige login. O caminho `/crafting` retornou 404; a navegação pública apontou `/crafting-workshop`. | Não foi concluída uma simulação com entradas pareadas. A própria página informa trabalho em andamento. Sem fórmula interna comprovada. |
| [BDO Codex](https://bdocodex.com/us/recipes/culinary/)          | Lista culinária com filtros, paginação, nível, XP, materiais, peso e produtos. A receita Assorted Side Dishes aparece na lista.                                                                                                             | O leitor textual recusou a home, mas o navegador público abriu home/lista. Não foi verificado equivalente de otimização econômica.     |
| [BDOLytics](https://bdolytics.com/en/crafting?category=cooking) | `/en/cooking` redirecionou para uma calculadora unificada de crafting, região South America, categorias de Culinária/Alquimia/Processamento/Caixas, busca, favoritos e filtros avançados.                                                   | Valores observados não foram incorporados ao produto. Não foi reproduzido cálculo pareado nem inferida unidade de métricas abreviadas. |
| [Garmoth](https://garmoth.com/market)                           | Hub público de mercado com populares, tendências, maiores altas/baixas e itens recentes, além de ferramentas especializadas pela navegação. Região EU no leitor.                                                                            | Não houve comparação de preço SA nem equivalência numérica com a receita local; organização da página não prova algoritmo.             |

Observação de UI: oficina/lista/hub são formas de agrupar o fluxo. Decisão local: duas entradas principais no Mercado; detalhes e simulação são etapas contextuais. Os concorrentes não demonstram que um número específico de abas seja universalmente correto.

## Cálculos e limites

O código local já tem cenários de comprar intermediários, produzir/coletar quando possível e otimização recursiva por lucro/hora. As specs cobrem tempo de intermediários, maestria no adaptador, estoque reservado, taxas, retornos, precisão monetária, ciclos, dados ausentes e comparação com busca exaustiva. Esta entrega esclarece a interface; não altera fórmulas para imitar um snapshot concorrente.

Na receita local indicada, as cotações de Lula, Queijo e produto final ficaram pendentes. O resultado continua incompleto; não se afirma lucro definitivo nem superioridade numérica sem dados e premissas pareadas. A auditoria numérica externa permanece pendente.

## Implementação e QA

- Etapas: sem inputs/selects repetidos; expansão preserva o mesmo plano. Ajustes ficam no detalhe compartilhado, incluindo rendimento ausente e procs raros.
- Lateral: explicação de Produzir vs. Comprar, checkbox indisponível sem método conhecido, label estável Incluir venda, nomes completos e foco visível.
- Cenários: botões explicam o que cada estratégia faz, mantendo o contrato do otimizador.
- Mercado: duas entradas principais; simulação e retorno à consulta no contexto; navegação preserva preço, quantidade e busca nos testes.
- Layout: revisão das alterações locais preexistentes de tokens/containers; callback de transição corrigido para percorrer snapshots filhos. `prefers-reduced-motion` preservado.
- Browser: receita e Mercado em 390×844 sem overflow (375/375 CSS px); nenhum campo em `app-recipe-branch`; ícones dos cinco itens principais da receita carregados. Navegação Mercado→Home iniciou View Transition sem skip. Isto não certifica ícones de todo o catálogo nem QA autenticado de Recomendações.

Verificações globais e commits: consultar ACTIVE_CONTEXT §183.
