# Protocolo de análise competitiva

Use este protocolo antes de desenhar ou alterar uma funcionalidade do Black Market. O objetivo é entender como outros produtos organizam o fluxo e quais decisões ajudam o jogador a tomar. O repositório, as regras verificadas do jogo e as fontes autorizadas continuam sendo a base da implementação.

## Cobertura obrigatória

Para cada feature de produto, consulte os quatro sites e registre evidência, ausência de equivalente ou limite de acesso. A feature pode não existir em um deles; marque “sem equivalente encontrado” depois de uma busca razoável na área pública, sem inventar capacidade.

| Fonte                                    | Áreas para priorizar conforme a feature                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/) | Crafting Workshop, compra/produção/coleta, lucro por hora, armazém, tutorials e calculadoras públicas.                                 |
| [BDO Codex](https://bdocodex.com/us/)    | Catálogo de itens, receitas/relações, conhecimento, NPCs, quests e mapas. Trate-o principalmente como referência de dados e navegação. |
| [BDOLytics](https://bdolytics.com/)      | Mercado, receitas de Culinária/Alquimia, custos, XP, contribuição, mapas e relações entre itens.                                       |
| [Garmoth](https://garmoth.com/)          | Mercado, histórico, maestria, personagem/gear, grind e ferramentas de atividades.                                                      |

Comece pelos links de `useful-links.md` e pelas auditorias existentes em `docs/research/`. Para a feature escolhida, abra as páginas públicas atuais relevantes em cada site; não presuma que os relatórios históricos refletem a versão de hoje.

## Ficha por feature

Registre em um documento de `docs/research/`:

1. **Data da consulta**, URL, idioma/região/patch visíveis e estado de acesso.
2. **Fluxo do usuário**: como encontra a função, quais campos pede, quais padrões escolhe, como apresenta loading/vazio/erro e quais ações vêm em seguida.
3. **Entradas e saídas**: rótulos, unidade, período, arredondamento aparente, valores ausentes e premissas visíveis. Não infira unidade a partir de um nome ambíguo.
4. **Cálculo**: quando a função expõe parâmetros, compare cenários pareados e altere uma variável por vez. Registre região, item/variante, receita, quantidade, maestria/nível, buffs, taxa/imposto, preços, estoque, política de origem e instante da cotação. Classifique cada afirmação como observação da UI, hipótese, comportamento reproduzido ou regra confirmada em fonte confiável.
5. **Diferenças para o Black Market**: identifique cobertura já existente, lacuna real, custo de manutenção por patch e próxima melhoria com impacto para o jogador.
6. **Limites**: se a página falhar, exigir sessão, usar dado stale ou esconder parâmetros, registre isso. “Não verificado” não significa que a feature inexiste.

Se os quatro sites não oferecerem uma função comparável, documente isso e continue com as fontes próprias do projeto. Não deixe pesquisa sem acesso bloquear tarefas que podem avançar com evidência local.

## Regras de cálculo e uso de dados

- Uma interface observada não prova a fórmula interna. Não anuncie engenharia reversa conclusiva sem conseguir reproduzir saídas sob entradas controladas.
- Não use números de snapshot concorrente como preço corrente, configuração padrão, teste fixo ou dado de produção do Black Market.
- Não confunda preço listado com venda garantida, estoque com liquidez, número de negociações com unidades vendidas ou lucro total com lucro por hora.
- Não copie código, textos extensos, imagens, tabelas ou datasets sem licença compatível. Consulte somente páginas públicas e APIs documentadas/autorizadas.
- Não contorne autenticação, CAPTCHA, rate limit, bloqueios geográficos ou controles de acesso. Não acesse endpoints privados nem dados de outros usuários.
- Antes de adotar uma fórmula do jogo, confirme-a em fonte confiável e atual para o patch relevante; mantenha o link, a data e os casos de teste.
- Para divergência entre sites, primeiro reconcilie as entradas e identifique dados desconhecidos. Não ajuste o cálculo do Black Market apenas para coincidir com um concorrente.

## Checklist curto para o handoff

Ao finalizar a feature, atualize `docs/ACTIVE_CONTEXT.md` e, se o próximo agente precisar, `docs/ANTIGRAVITY_HANDOFF.md` com:

- os quatro sites consultados e páginas úteis;
- evidências observadas versus hipóteses e regras confirmadas;
- premissas pareadas e limitações de dados;
- quais decisões de UI ou cálculo mudaram no Black Market;
- fontes inacessíveis e validações que continuam pendentes.
