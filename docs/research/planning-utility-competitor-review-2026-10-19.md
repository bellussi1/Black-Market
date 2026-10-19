# Revisão pública de planejamento e ferramentas utilitárias

**Consulta:** 19/10/2026 · **Escopo:** criação de planos, oficina de produção, aprimoramento, presets de buffs e rotas utilitárias/admin. A comparação orienta estrutura e feedback de UI; não valida fórmulas de jogo nem cotações.

## Superfícies consultadas

| Fonte                                                                                                                                           | Evidência pública observada                                                                                                                                                                                                                                                 | Limites da comparação                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDOLytics — Crafting Calculator](https://bdolytics.com/en/alchemy) e páginas de [cálculo de produção](https://bdolytics.com/en/processing/795) | Conteúdo público/indexado organiza receitas por profissão, filtros de prata/hora e volume; detalhes mostram materiais, estoque, preço ajustável, custos, receita, produtos secundários, lucro e análise de tempo por lote. O índice também lista “Craft Plans” e “Storage”. | Alguns dados vêm do índice; não foi executado um cenário pareado. Não usar seus preços, volumes, tempo, arredondamento ou rendimento como fórmula/dado local.                                              |
| [BDO Codex — receita/processamento](https://bdocodex.com/us/mrecipe/7777/?sl=1)                                                                 | A página indexada apresenta quantidade, preço de mercado dos materiais e produto, custo, impostos e lucro. Também avisa que habilidade de produção pode alterar insumos/produtos.                                                                                           | Resultado de uma receita, não prova cálculo atualizado nem a regra exata de maestria. A pesquisa anterior sobre receitas está em `recipe-market-flow-review-2026-10-18.md`.                                |
| [Garmoth — ferramentas](https://garmoth.com/tools) e [calculadora de aprimoramento](https://garmoth.com/enhancement)                            | O índice lista simulador de aprimoramento, custo de Cron, brackets e presets de consumíveis/artefatos/cristais. A tela indexada de aprimoramento expõe item, custos de materiais e escolhas Cron/Raw por nível.                                                             | A listagem de ferramentas e campos não certifica probabilidades ou o algoritmo. O planejador de consumíveis é uma comparação de cobertura, não um equivalente validado a todos os presets locais de buffs. |
| [BDO Workshop — aprimoramento](https://bdoworkshop.com/) e [gear progression](https://bdoworkshop.com/gear-progression)                         | A busca pública retornou campos do calculador de aprimoramento e sua tabela de nível, tentativas, pity e custo. A rota pública de gear progression retornou apenas shell que exige JavaScript e descrição geral do serviço.                                                 | A tabela é conteúdo público dinâmico/indexado, não premissa para cálculos locais. O fluxo atual de gear progression e seus salvamentos não foram reproduzidos.                                             |

## Rotas sem equivalência confirmada

As páginas públicas consultadas não permitem comparação equivalente para o editor administrativo de tutoriais, o editor de Roadmap, a demonstração temporária do Black Market ou a recuperação da página 404. Isso descreve o alcance desta consulta, não prova que tais páginas não existam em áreas não observáveis.

## Aplicação ao rollout

- Oficinas locais agrupam finalidade, estado, controles e resultado; cenários permanecem explicitamente editáveis e resultados probabilísticos/estimados continuam sem promessa de retorno.
- A hierarquia de rota usa um título principal e painéis secundários. A demonstração agora usa o cabeçalho compartilhado, e a página 404 usa o elemento semântico `header` com ações claras de recuperação.
- `/crafting` foi inspecionada no browser isolado em 1920×1080. As rotas `/demo`, `/enhancement`, `/rng` e `/buffs` redirecionaram à Home pelo gate MVP atual; fluxos não autorizados não foram contornados. As rotas administrativas e pessoais não foram inspecionadas no browser sem sessão de teste.
- Nenhuma fórmula, tabela de jogo, preço ou dado de concorrente foi importado.

## Fontes abertas

- [BDOLytics Crafting](https://bdolytics.com/en/alchemy), [exemplo de crafting](https://bdolytics.com/en/processing/795) — receita, custo, retorno e tempo indexados.
- [BDO Codex receita 7777](https://bdocodex.com/us/mrecipe/7777/?sl=1) — inputs e avisos de crafting indexados.
- [Garmoth Tools](https://garmoth.com/tools), [Enhancement Cost Calculator](https://garmoth.com/enhancement) — catálogo de ferramentas e campos públicos.
- [BDO Workshop](https://bdoworkshop.com/), [Gear Progression](https://bdoworkshop.com/gear-progression) — calculadora indexada e shell que exige JavaScript.
