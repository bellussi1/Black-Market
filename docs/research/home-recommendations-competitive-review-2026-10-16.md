# Revisão competitiva — Home e Recomendações

**Consulta:** 16/10/2026 · **Escopo:** superfícies públicas de descoberta, crafting e sugestão de atividade.

Esta revisão orienta a organização da interface. Não comprova fórmulas internas, volume de mercado, cobertura dos dados ou qualidade de qualquer ranking. Nenhum código, asset, dado ou endpoint privado de concorrentes foi copiado ou usado.

## BDO Workshop

- [Home pública](https://bdoworkshop.com/) descreve ferramentas de enhancement, progressão de equipamento, crafting, mercado e leitura de screenshots de inventário/armazém/equipamento. A página depende de JavaScript.
- [Crafting Workshop](https://bdoworkshop.com/crafting-workshop) e um [plano de crafting](https://bdoworkshop.com/crafting-workshop/plan/1408) não renderizaram na consulta; não foi possível verificar a Home operacional, recomendações ou estados de carregamento.
- **Implicação:** preservar descoberta de ferramentas especializadas; não inferir uma recomendação agregada ou uma fórmula a partir da descrição da Home.

## BDO Codex

- [Home](https://bdocodex.com/us/) é centrada em database, atualizações e conteúdo recente, com navegação por itens, quests, NPCs e conhecimento.
- A [lista de quests](https://bdocodex.com/us/quests/common/) expõe busca, filtros por região/tipo/recompensa, tabela e paginação.
- Não foi encontrado coach ou ranking personalizado de atividades nas superfícies consultadas. Essa ausência é limitada às páginas abertas, não prova de que não exista em outra área.
- **Implicação:** catálogo e referências explicáveis ajudam a explorar o jogo, mas não validam o ranking de produção do Black Market.

## BDOLytics

- A navegação do [mapa público](https://bdolytics.com/en/map?node=464) lista ferramentas por domínio, incluindo market, database, crafting, experiência de Life Skills, armazenamento e planos de crafting.
- A [calculadora de crafting](https://bdolytics.com/en/crafting/1399%3A47bc9178d52c) organiza plano/receita, insumos, quantidade, estoque, preços customizados, custos, retornos, lucro e tempo/lucro por hora.
- O carregamento completo da calculadora não ficou disponível nesta consulta; não foi possível parear entradas/saídas ou confirmar como calcula valores. Não foi observado um coach único que escolha entre várias profissões.
- **Implicação:** manter módulos de planejamento por domínio e separar lucro total de lucro/hora; chamar a tela de recomendações pelo escopo real que cobre.

## Garmoth

- A [Home](https://garmoth.com/) organiza guias/notícias e ferramentas em áreas distintas, como mercado, grind e equipamento.
- A [lista de spots por item](https://garmoth.com/grind-tracker/best-grind-spots/item/16017?sub_key=0) mostra critérios como AP máximo, DP recomendado, taxa de drop e prata/h. A [página de um spot](https://garmoth.com/grind-tracker/best-grind-spots/8?endDate=2026-05-28&startDate=2025-07-24) expõe tier, intervalo e métricas agregadas por sessão. O [resumo pessoal](https://garmoth.com/grind-tracker/user/summary) divide desempenho por spot/classe/período e tem estado sem sessão.
- Essas superfícies cobrem comparação de grind e sessões pessoais, não uma comparação universal entre atividades. Métricas regionais/comunitárias não foram incorporadas ao Black Market.
- **Implicação:** mostrar critérios e cobertura; não incluir Grind/PvE em um ranking financeiro sem sessões autorizadas e modelo validado.

## Decisões para a fase visual

- A Home destaca os focos ativos publicados na Roadmap e mantém a próxima ação vinculada à ferramenta correspondente.
- Recomendações chama atenção para o maior lucro líquido/h no recorte de cenários completos, com materiais, premissas e cobertura disponíveis sob demanda.
- Cenários incompletos, preços ausentes e conteúdo indisponível continuam distintos de resultados calculados.
- A revisão visual não altera cálculo, dados, API, autenticação ou estado persistido.

## Limites

As rotas e idiomas abertos não cobrem toda a superfície pública: Workshop em inglês e dependente de JavaScript; Codex em `/us`; BDOLytics em `/en`; Garmoth público em páginas de grind. A consulta não coleta telemetria privada, não usa API não documentada e não permite concluir fórmulas internas.
