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

## Ranking personalizado — revisão de 20/10/2026

Pedido: revisar `/lifeskills?tab=production`, pois as receitas recomendadas não estavam ajudando com as informações do personagem. A sessão Google do usuário não está compartilhada com o navegador de QA; a superfície disponível mostra a guarda de acesso. Não foram acessados credenciais, workspace privado ou dados da conta para alegar uma reprodução pessoal.

Quatro falhas reproduzidas em testes antes da correção:

- Uma seleção local mantinha o personagem anterior mesmo após mudar o personagem ativo do workspace. O ranking agora usa a mesma fonte da Família, restaura tempos do personagem atual e descarta ajustes específicos de receita do personagem anterior. Atualizações dos tempos salvos também invalidam o resultado.
- O filtro de atividades excluía intermediários de outras profissões do grafo. As preferências agora filtram as candidatas; a cadeia mantém as profissões secundárias e suas maestrias. Cotações ficam restritas às atividades selecionadas e aos intermediários alcançáveis, incluindo alternativas e proteção contra ciclos, sem varrer atividades desconectadas.
- Cards principais deduplicavam cenários por fórmula, repetindo produtos com ingredientes alternativos. Agora mostram a melhor variante por produto após os filtros da aba e de atividade conhecida. A aba Armazém escolhe entre as variantes que usam estoque; um cenário sem estoque não elimina essa oportunidade antes do filtro.
- A busca alterava o sinal de filtro, mas não disparava comparação. Agora busca/método disparam automaticamente após 250 ms; se mudarem durante um cálculo, o resultado antigo é descartado e a comparação é refeita com o filtro atual. Fechar/trocar uma receita em foco mantém seu contrato anterior de descarte, sem forçar nova otimização.

Identificação de receita por Map reutilizado evita buscas lineares por cenário na deduplicação. Fórmulas, impostos, custo econômico do estoque, reservas e limites de orçamento/tempo/peso permanecem no calculador existente; não há promessa de venda nem um ótimo universal além do catálogo e dos cenários comparados.

Consulta pública em 20/10/2026: [Workshop Crafting](https://bdoworkshop.com/crafting-workshop), [Codex Recipes](https://bdocodex.com/us/recipes/) e [BDOLytics Cooking SA](https://bdolytics.com/en/SA/cooking/market) indisponíveis no leitor. [Garmoth Cooking](https://garmoth.com/mastery-brackets/cooking) exibiu tabela pública de maestria. Isso não certifica algoritmos concorrentes; nenhum coeficiente ou preço foi importado para ajustar o ranking.

Os três testes iniciais e a regressão adicional da busca falharam no comportamento anterior; após as correções, 35 testes da área passaram. Cenário controlado adicional manteve preços e condições e elevou Culinária de 0 para 3000: o líder passou de Alquimia para Culinária. Testes conferem troca de personagem, atualização de calibração, cadeia secundária, deduplicação por produto, variantes com estoque e busca modificada durante uma comparação. São fixtures explícitas, sem comprovação das cotações ou do resultado específico da conta Google. Revisão independente sem achados acionáveis; homologação do perfil real e desempenho do ranking com todos os dados desse usuário continuam dependentes da sessão autenticada.

Verificação final sequencial: `pnpm check`, `pnpm test` (**1.310 aprovados/1 ignorado**), produção e `pnpm test:ssr` passaram. Uma execução anterior concorrente de testes apresentou timeouts em telas não alteradas e foi interrompida; a repetição isolada não reproduziu essas falhas. Inicial de produção em 499,84 kB, budgets intactos; avisos existentes de estilo da árvore, locale e CommonJS do OCR permanecem. Prévia `4200` mantida no checkout principal, sem alteração de autenticação, banco ou dados pessoais.

## Venda independente das subreceitas — 20/10/2026

O usuário escolheu comparar a venda de cada intermediário separadamente, considerando seus próprios custos e tempo de produção. Cada card completo oferece uma lista da receita final e dos produtos fabricáveis em todos os níveis da cadeia; a primeira comparação começa aberta. A travessia inclui fórmulas alternativas, agrupa o mesmo produto e interrompe ciclos. O ranking principal continua restrito às atividades escolhidas; as profissões secundárias são avaliadas para a comparação contextual.

Cada linha usa o mesmo personagem, maestrias, impostos, cotações, estoque e limites de sessão no calculador existente. Mostra o melhor cenário completo calculado para esse produto, lucro líquido/h, lucro e tempo do lote, operações, rendimento e atividade de venda. O tempo inclui todas as etapas produzidas no cenário indicado; comprar intermediários e produzi-los continuam cenários distintos. Os lucros não são somáveis. Preço/tempo ausentes permanecem pendentes; baixa atividade conhecida recebe aviso explícito e não esconde intermediários da cadeia. O destaque de lucro/h superior à final usa comparação inteira exata, sem arredondamento dos valores exibidos.

Consulta pública específica em 20/10/2026: [Workshop Crafting](https://bdoworkshop.com/crafting-workshop), [Codex item/receitas](https://bdocodex.com/us/item/9209/) e [BDOLytics Cooking SA](https://bdolytics.com/en/SA/cooking/market) não renderizaram no leitor. [Garmoth Cooking](https://garmoth.com/mastery-brackets/cooking) disponibilizou tabela de maestria, sem comparação recursiva de venda verificável nessa página. Não foi possível parear entradas/saídas concorrentes; nenhuma hipótese sobre algoritmo foi promovida a regra do jogo, nem coeficientes/preços importados.

QA em contexto descartável com todas as chamadas de API interceptadas e personagem/catálogo sintéticos: níveis 0/1/2/3 visíveis, abrir/fechar pelo teclado e preço ausente conferidos. Sem pageerror ou overflow horizontal em 1920×1080, 2560×1440, 1600×900, 1366×768 e 390×844, além de reflow 1536×864 e 1280×720 equivalente a 125%/150% sobre 1920. Capturas locais ignoradas: `.playwright-mcp/chain-1920.png` e `chain-390.png`. Isso não homologa a conta Google real, nem comprova um ótimo global de combinações de compra/produção além dos cenários do motor.

Regressões: quatro testes do comparador cobrem profundidade, alternativas, ciclos, dados ausentes e taxas exatas com valores acima do inteiro seguro de JavaScript; um teste integrado cobre as três profissões secundárias, preservação do filtro principal, DOM, preço ausente e aviso de atividade zero. Na primeira suíte completa, somente o teste de inventário que importa todas as páginas excedeu seus 5 s; os 11 testes de rotas passaram isolados em 3,75 s de execução. O prazo desse teste específico passou a 15 s para tolerar transforms frios com o segundo worker, preservando todas as asserções e o prazo dos demais testes.

Verificação final: `pnpm check`, nova execução integral de `pnpm test` (**1.315 aprovados/1 ignorado**), `pnpm --filter @bdo/web build` e `pnpm test:ssr` aprovados. Budgets mantidos; avisos existentes de locale, estilo da árvore e CommonJS do OCR permanecem. Código em `main` e prévia `4200` no checkout principal; nenhuma alteração em banco, autenticação ou workspace real.
