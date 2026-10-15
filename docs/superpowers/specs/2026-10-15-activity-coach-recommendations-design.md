# Coach de Atividades — refatoração de Recomendações

## Objetivo do produto

Refazer `/recommendations` como um Coach de Atividades que ajude a **gerar prata com Life Skills para evoluir o gear de Life Skill e de PvPvE**. A pergunta principal passa a ser: “dentro das atividades que escolhi, o que oferece o melhor retorno líquido por hora com meu perfil e meus recursos atuais?”

O resultado deve destacar prata líquida/hora, custos, quantidade, duração, estoque aproveitado e fonte/idade dos dados. A tela não deve abrir com um aviso genérico que enfraqueça a finalidade econômica; deve explicar a base de cada valor no próprio resultado. Preço cotado, volume histórico e estoque observado continuam sendo sinais com escopo e horário, sem serem apresentados como uma venda executada.

## Sinal da comunidade

- A pesquisa tem 31 respostas e é exploratória, não representa estatisticamente toda a comunidade.
- Calculadora de custo/lucro foi escolhida por 20 pessoas; mapa de coleta por 18; receitas claras por 17; comparação de atividades por retorno/hora por 10.
- Coleta, Alquimia, Grind/PvE e Pesca aparecem com maior frequência na rotina (19, 16, 14 e 13 respostas).
- Dez pessoas apontaram dificuldade com atualização, explicação dos cálculos ou localização de informações/filtros; 17 disseram perder tempo buscando ou conferindo dados.
- Uma resposta aberta propôs integrar rotina, gear, maestria, armazém, produção/compra, liquidez e alternativas de grind; outra pediu recomendações de Life Skill ou Grind a partir do armazém.
- Vinte preferem uma tela equilibrada, com resumo e detalhes quando necessários; 25 usam essas ferramentas no computador enquanto jogam.

Esses dados orientam o produto, mas não justificam generalizar preferências para a comunidade toda.

## Pesquisa de concorrentes e projetos abertos

Fontes consultadas em 15/10/2026 e pesquisas anteriores do próprio repositório registradas em `docs/research/lytics-workshop.md`, `docs/research/garmoth-workerman-arsha.md`, `docs/research/master-bdo-knowledge-base.md` e `docs/research/repository-review-calculators-maps.md`. O registro desta rodada está em [`docs/research/activity-coach-competitive-review.md`](../../research/activity-coach-competitive-review.md).

- **BDOLytics**: a calculadora de Processamento apresenta receitas em tabela comparável, com silver/h, preço e média de volume de 14 dias; a página de uma receita detalha ingredientes, custo e lucro. Inspira o resumo comparativo e o caminho explicável. O conteúdo interativo atual nem sempre pôde ser confirmado fora do resultado indexado.
- **Garmoth**: reúne maestria, gear, grind tracker e sessões de Life Skill; a documentação do app declara leitura de loot em tela, revisão antes do envio e estimativa de silver/h. Serve de referência para uma futura coleta manual/OCR revisável de sessões, não como fonte autorizada de rendimento ou API.
- **BDO Workshop**: declara calculadoras de crafting/mercado, scanner de screenshots de inventário/armazém/gear e ferramentas de gathering/mastery. Reforça o fluxo único e a revisão de importação; não se deve presumir acurácia de OCR nem copiar dados, imagens ou interface.
- **`iDevelopThings/bdo-viewer`**: projeto aberto com árvore de crafting, comparação de comprar/fabricar, rendimento por maestria e custos locais. A referência útil é conceitual; o próprio projeto descreve uso pessoal/educacional/não comercial, então não transplantar código ou dados.
- **`Thell/bdo-empire` e Workerman**: otimizam império de trabalhadores por CP e oferecem importação/exportação de configurações. São fora do ranking de produção manual desta primeira entrega; ajudam a separar lucro passivo de worker empire das sessões Life Skill.
- Os outros projetos analisados nas notas do repositório cobrem extração local, mapas, mercado e enhancement, mas não fornecem uma base comunitária validada de loot/hora para este Coach. Reutilização de código, dados ou imagens exige revisar licença e origem separadamente.

## Estado real do repositório

`/recommendations` já possui o motor de planejamento de produção, mestreias temporárias, inventário/reservas, orçamento, peso, preço NPC, cotação de mercado e calibração de tempo. O otimizador da árvore de receitas já compara compra/produção dentro do grafo selecionado. A página atual, porém, exige carregar catálogo, preencher tempos, pedir cotações, navegar a grade de preços, localizar receitas e apertar comparar.

O catálogo de produção vem de `ProductionApi.catalog()` e não participa hoje do cache público usado por `/recipes`. `PublicRouteData` aquece catálogo e mercado apenas nas rotas públicas. Já `CatalogApiService` e `MarketCacheService` fornecem cache por região/locale, deduplicação de chamadas, uso de valores em cache e revalidação conforme seus contratos. O personagem, o armazém e as preferências são privados e devem continuar no workspace local.

Limites encontrados:

- O dataset de staging tem 6.813 receitas de Life Skill depois do filtro aplicado em Recomendações; buscar cotações de todo o universo sem critério pode gerar muitas chamadas. A pesquisa de fontes informa 429/503 recentes; o Coach deve limitar consultas ao escopo habilitado, reaproveitar cache, atualizar em lotes suportados e manter resultados/cache em falha.
- O volume histórico só pode aparecer se a série e a fonte tiverem cobertura identificável; não prova liquidez futura.
- Preço desconhecido, zero observado, indisponível, antigo e estimado precisam continuar distintos.
- O perfil contém equipamentos, mas não existe relação validada para converter equipamento em rendimento de produção nem em loot/hora de Grind/PvE.
- Não há ainda benchmarks comunitários revisados de rendimento por região, atividade, duração, maestria/gear e loot.
- O formulário `/lifeskills` já registra sessões manuais, mas integrá-las ao ranking de produção requer uma etapa própria de associação entre método, perfil e proveniência.

## Decisões

1. **Refatorar a rota completa**, sem adicionar um painel isolado à oficina atual.
2. **Carregar o catálogo automaticamente com resolver de rota.** O resolver aquece somente o snapshot público de produção para região/locale; a página consome o mesmo valor do cache. Remover por completo o botão “Carregar catálogo”. Não passar personagem, armazém, prata ou outras informações pessoais pelo resolver.
3. **Usar o perfil ativo automaticamente.** Exibir troca de personagem e editar duração da sessão apenas como controles compactos. Ler maestria, inventário livre, reservas, prata, peso, região e imposto do workspace atual.
4. **Dar prioridade às atividades preferidas.** Permitir selecionar Culinária, Alquimia e Processamento, as áreas com modelo de produção no catálogo e calculadores atuais. Persistir seleção no workspace com defaults compatíveis para backups antigos. Não mostrar Grind/PvE, coleta, pesca ou caça como oportunidades ranqueadas sem rendimento/dados sustentáveis.
5. **Calcular assim que houver dados**, sem exigir um botão “Comparar”. A primeira tela mostra recomendações completas disponíveis e pendências acionáveis. As preferências, perfil e alterações de calibração atualizam o resultado automaticamente.
6. **Carregar tempos com parcimônia.** Reutilizar as calibrações existentes quando informadas, persistir uma medição por personagem e método, e pedir somente a medição que falta para os métodos escolhidos. Não inferir tempos a partir de gear ou valores de demonstração. Mostrar lucro por lote quando possível; não fabricar lucro/hora quando o tempo é desconhecido.
7. **Consultar mercado automaticamente no escopo ativo**, priorizando cache da mesma região, preservando valores antigos enquanto revalida em segundo plano e respeitando lotes/limites existentes. Não varrer nem solicitar preços de todo o catálogo indiscriminadamente. Ao entrar na rota, resolver os itens efetivamente necessários às candidatas habilitadas; se o provedor falhar, manter cache e declarar cobertura pendente.
8. **Manter preços manuais em detalhes**, como correção pontual, sem uma tabela de preço como etapa principal. Identificar claramente preço manual, NPC, mercado atual/máximo e horário observado.
9. **Reaproveitar o calculador atual** para saldo após impostos, custo econômico do estoque, orçamento, peso, rendimento de maestria e escolhas de compra/produção/estoque. Não recriar o otimizador de receita; ligar à rota da receita para exploração profunda.
10. **Usar o gear como destino econômico, não como multiplicador sem modelo.** A tela pode explicitar que a prata das recomendações ajuda a financiar gear de Life Skill e PvPvE; só aplicar efeito de equipamento quando uma relação verificada existir.
11. **Não criar fonte de mercado, tabela pública, integração de conta ou comunidade nesta entrega.** Seguir a política atual de fonte; nenhum endpoint interno de concorrente ou código/dado externo entra no produto.

## Experiência da página

### Resumo primeiro

- Título direto: “Faça prata com suas Life Skills” ou equivalente, com a finalidade de evoluir gear de Life Skill e PvPvE.
- Linha compacta do personagem ativo, prata disponível, tempo de sessão, maestrias relevantes e estado do armazém.
- Seletor compacto das atividades preferidas, com defaults compatíveis e persistência local/workspace.
- Ranking principal de oportunidades completas, ordenado por lucro líquido/hora; quantidade, tempo, gasto em prata e custo econômico ficam visíveis junto ao resultado.
- O resumo informa quantas receitas entraram na comparação, quantas têm dados completos e quantas aguardam dados. Não chama o catálogo inteiro de examinado se a cobertura efetiva for menor.

### Explicação sob demanda

- Cada oportunidade explica, em uma frase, por que aparece: atividade preferida, maestria usada, material do armazém, compra necessária ou diferença para a próxima opção completa.
- Detalhes incluem fórmula/árvore, quantidades, escolhas comprar/produzir/estoque, impostos, custo de oportunidade dos materiais próprios, preço e origem, timestamp, disponibilidade observada, volume e cobertura quando disponíveis, e tempo usado.
- Dados incompletos ficam numa lista compacta de pendências com a ação que pode completá-los. Valores indisponíveis não se tornam zero.
- Ajuste manual aparece junto ao item ou premissa afetada. Controles de calibração ficam recolhidos e contextualizados; sem simulações fictícias no caminho principal.

### Estados e acessibilidade

- Carregamento automático: exibir cache válido/antigo já disponível e indicar atualização, sem bloquear a página inteira.
- Sem personagem: oferecer caminho curto para cadastrar personagem na Família; não criar um fictício.
- Sem calibração: permitir informá-la no contexto, salvar, e calcular lucro/hora depois.
- Sem preço/volume: indicar fonte/idade/ausência e deixar a receita fora do ranking completo quando o campo for necessário.
- Erro/limite do provedor: preservar valores em cache e permitir seguir com dados disponíveis.
- Detalhes com `<details>` ou padrão acessível equivalente, rótulos e foco claros, teclado, textos longos, zoom e layout móvel.

## Etapas posteriores

### Comparação de atividades e dados comunitários

Antes de comparar produção com Grind/PvE, coleta, pesca, caça ou outras atividades:

1. Definir registro manual da sessão como fonte inicial: atividade/rota, região/servidor se relevante, duração, perfil, maestria/gear equipado, buffs, consumíveis, loot, custos e preço de valorização.
2. Guardar valores brutos, horário, origem e versão de regra separadamente de correções. Exigir revisão do jogador para importação; permitir corrigir/excluir; nunca publicar armazém ou dados pessoais por padrão.
3. Tratar OCR só como assistente: guardar candidatos e confiança, mostrar revisão explícita e não promover leituras automaticamente a benchmark.
4. Para benchmarks comunitários, documentar consentimento, moderação, deduplicação, outliers, patch/região, amostra por faixa de maestria/gear, cobertura mínima e intervalo de confiança antes de publicar rankings.
5. Integrar com conta/armazém apenas por API oficial autorizada, de leitura, escopo mínimo, opção de adesão e revogação clara. Não solicitar senha.

## Fora do escopo inicial

- Comparar produção com grind, PvE, coleta, pesca, caça ou dados de sessões comunitárias.
- Inferir lucro/hora a partir de gear, ranking de spot ou screenshot sem revisão.
- Criar base comunitária, coletores persistentes, novas APIs ou uso de endpoints internos de concorrentes.
- Importar código, ativos ou dados externos sem revisão de licença/direitos.
- Integração automática com conta Pearl Abyss.

## Critérios de aceite

1. `/recommendations` carrega automaticamente; não há botão “Carregar catálogo”, “Consultar mercado” ou “Comparar lucro por hora” como pré-requisito para a primeira recomendação.
2. O resolver aquece e reutiliza o catálogo de produção cacheado por região/locale; a página não faz uma segunda chamada sem necessidade.
3. O estado privado não entra no resolver nem em cache público. Trocar região/personagem invalida ou atualiza apenas a comparação correta.
4. Personagem, inventário livre/reservas, maestria, prata, duração, peso e imposto vêm do workspace; preferências/calibrações persistem e backups antigos continuam carregáveis.
5. O resumo mostra lucro líquido estimado/hora e prata líquida do lote, custos, duração, quantidade, estado do estoque e uma explicação curta; os detalhes mostram premissas e fontes.
6. Apenas cálculos completos entram no ranking; tempo/rendimento/preço ausente produz pendência contextual, nunca zero ou pior colocação.
7. Consultas de cotação são automáticas, usam `MarketCacheService`, chaveiam por região e reaproveitam cache; erros preservam os valores já disponíveis. Não existe fan-out por item individual.
8. Volume só é mostrado com cobertura e fonte reconhecíveis. Nenhum texto transforma histórico em venda garantida ou previsão.
9. Equipamento aparece como contexto/progresso para gear, mas não altera cálculo sem modelo verificado.
10. Não há controles de demonstração ou preços fictícios no fluxo principal.
11. Página responsiva, acessível e alinhada às skills de UI do projeto; controles extensos e breakdowns ficam sob demanda.

## Revisão do escopo

O MVP continua em produção Life Skill porque é onde o repositório já tem receita, rendimento por maestria, estoque e cálculo econômico reutilizáveis. A intenção de produto é gerar prata para gear; a limitação é que hoje não existem dados que sustentem a comparação de combate/coleta por rendimento. Para que o Coach seja útil já no primeiro uso, resolver automaticamente o catálogo e as cotações da seleção ativa, usar o cache existente e pedir no máximo as medições de tempo ainda ausentes para a atividade escolhida.
