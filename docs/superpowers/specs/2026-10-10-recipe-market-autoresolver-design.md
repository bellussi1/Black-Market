# Mercado automático e otimização de receitas

**Data:** 10/10/2026  
**Estado:** especificação e planos aprovados pelo usuário; implementação local em validação final
**Caso de validação:** `/recipes/items/1407` — `[Grupo] Fármaco da Harmonia - Edania`

## Objetivo

Ao abrir uma receita, mostrar preços úteis sem exigir uma ação manual de consulta e manter as cotações atualizadas pelo cache. Na página de produção, permitir escolher ou otimizar a origem de cada material entre comprar e fazer/coletar. A recomendação deve considerar lucro líquido por hora e tempo de produção, informar dados ausentes e aceitar uma maestria ajustável com debounce de 250 ms.

Na página do Mercado, preservar busca, filtros, ordenação, histórico, preços e volumes existentes, corrigindo o reaproveitamento do cache e harmonizando os controles com os estilos compartilhados do aplicativo.

## Decisões aprovadas

- Resolver o grafo da fórmula selecionada e consultar somente os itens alcançáveis nele; não consultar o catálogo inteiro de 74.287 itens ao abrir uma receita.
- Carregar cotações do cache primeiro. Atualizar automaticamente dados ausentes ou vencidos, limitando a concorrência e cancelando respostas de outra receita, região ou conjunto de dados.
- Reaproveitar e estender `planProduction()` como o motor da melhor combinação, em vez de duplicar cálculo de impostos, quantidades e lucro na interface.
- Cada material terá uma caixa de seleção de origem: marcada significa fazer/coletar; desmarcada significa comprar. O botão de otimização aplica a combinação escolhida pelo motor. A caixa não é um registro separado de tarefa concluída. A busca só considera fazer/coletar quando existe receita ou estimativa explícita de rendimento e tempo; não presume coleta gratuita ou instantânea.
- A otimização avalia a fórmula atualmente selecionada. A escolha automática entre as 12 fórmulas diferentes do produto 1407 não faz parte desta entrega.
- A busca usa os métodos produtores já selecionados na árvore; para intermediários ainda não expandidos, usa um produtor padrão em ordem estável. A otimização escolhe a origem comprar/fazer/coletar dentro desse grafo, sem comparar automaticamente métodos de receita alternativos.
- Rendimentos fixos documentados do Edania continuam fixos. Fórmulas variáveis usam estimativa identificada como estimativa, sem sugerir que o resultado médio seja uma garantia de proc.
- O rendimento estimado entra automaticamente no cálculo, sem ação ou botão de confirmação. Ajuste manual permanece opcional nos detalhes avançados. Sem base para estimar, o resultado fica incompleto e informa o dado ausente.
- A análise do produto final considera produção para venda. Estoque zero não gera a mensagem de que produzir é a única forma de obter o item nem uma recomendação de uso/consumo. Faturamento e lucro usam a cotação disponível, com a disponibilidade apresentada separadamente.
- Não calcular ou rotular lucro/hora como completo se faltarem preços ou tempos necessários. A página lista as pendências e mantém visíveis os valores parciais com essa indicação.
- Não habilitar coletor ou persistência periódica de fonte de mercado. A consulta permanece sob demanda da página ativa e usa a fonte já configurada, respeitando a política de mercado vigente.
- Os controles novos e alterados usam as primitivas compartilhadas e a direção visual BDO já existente, sem emojis, com estados de foco/erro/sucesso claros, transições curtas e suporte a movimento reduzido.

## Contexto verificado

- O endereço opaco enviado na conversa resolve para **Acompanhamentos Variados**. O produto pretendido abre em `/recipes/items/1407`.
- A fórmula selecionada do produto 1407 tem quatro materiais diretos. A consulta do catálogo percorreu 94 itens alcançáveis e encontrou 38 itens com receita na fórmula selecionada.
- O produto tem 12 fórmulas registradas. A comparação entre essas fórmulas foi explicitamente excluída; o cálculo permanece na fórmula escolhida na interface. A auditoria inicial contou 94 itens e 38 intermediários com receitas; a fixture reproduzível do traversal atual por produtor padrão no dataset versionado chega a 117 IDs e 62 produtores. A diferença decorre da seleção/traversal do grafo; os números não são contagens intercambiáveis.
- `MarketCacheService` usa TTL de cinco minutos e consulta itens em lote, mas o endpoint de cotações de uma receita não recebe atualização periódica enquanto essa receita fica aberta. A sondagem de seis minutos existente preenche itens em alta, não todo o grafo da receita.
- `MarketBoard.load()` consulta a API ao carregar e salva a resposta em cache, mas não lê primeiro a resposta de mesmo filtro do cache. Há botão de atualização explícita na tela geral do mercado; a tela de receita deixará de exigir esse tipo de botão.
- `planProduction()` já calcula cenários de compra/produção e lucro/hora, mas a enumeração antiga limitada a 256/1.024 não cobria o grafo de Edania. A implementação atual usa estados alcançáveis e limite seguro; detalhes da cobertura atual estão na matriz de lacunas.
- O projeto já tem estilos globais de formulários, controles e feedback. A auditoria visual encontrou regras locais no crafting e no mercado que precisam ser alinhadas a essas primitivas.

## Arquitetura

### Resolução de preços

1. A página resolve o grafo completo da fórmula ativa, reaproveitando escolhas de métodos já feitas na árvore e usando produtor padrão determinístico para intermediários não expandidos. A lista única de IDs para cotação inclui produto e materiais alcançáveis.
2. A camada de cache devolve imediatamente dados frescos e mantém dados vencidos visíveis enquanto os revalida.
3. Cotações ausentes ou vencidas são buscadas com concorrência limitada. Uma revisão de contexto impede que uma resposta antiga sobrescreva o novo produto, região ou dataset.
4. Enquanto a receita estiver ativa, a revalidação ocorre quando o TTL de cinco minutos expira. Ao sair da página, o temporizador é limpo.
5. A tabela do Mercado reaproveita respostas para a mesma chave canônica de região, busca, categoria, ordenação, página e tamanho. Respostas antigas podem ser exibidas durante a atualização com idade e estado de sincronização claros.
6. Erros de rede mantêm a última cotação válida e mostram sua idade. Sem cache, o campo permanece ausente; nenhum preço, estoque ou volume é inventado.

### Planejador de produção

1. A página monta a lista de receitas alcançáveis para a fórmula selecionada, valida ciclos e quantidades e converte o grafo para o contrato do planejador; métodos internos seguem seleção existente ou produtor padrão determinístico.
2. O motor compara comprar ou produzir cada intermediário alcançável e compara coleta somente quando há estimativa explícita de rendimento/tempo, respeitando a origem marcada manualmente, quando houver.
3. A busca do cenário otimizado enumera estados alcançáveis e poda uma ramificação somente quando um limite superior matemático prova que ela não pode superar uma solução completa. Sem subproduto vendido, receita líquida do produto final limita o lucro e o tempo parcial limita inferiormente a duração; comparação inteira e estrita mantém empates. Como lucro pode ser negativo, não se usa dominância simples por custo/tempo. Se falta receita líquida ou duração mínima, ou há subproduto vendido, a poda é desativada. Limite de estados ou dado ausente resulta em cenário incompleto, nunca em um ótimo aproximado rotulado como exato.
4. A função objetivo compara lucro líquido por hora por aritmética inteira. Empates preferem menor desembolso; a próxima regra de desempate é determinística.
5. O motor recebe a quantidade de operações selecionada, cotações e disponibilidade, estoque livre, impostos, rendimentos, pesos existentes e tempo estimado por método. Premissas e dados incompletos aparecem junto ao resultado.
6. O botão de otimização aplica os valores de origem calculados às caixas. Alterar uma caixa cria/ajusta uma escolha manual para aquele item e invalida a recomendação anterior até o recálculo.

### Maestria, tempo e experiência

- O campo de maestria começa com o valor do personagem ativo para a profissão da receita. A edição é um override local de cálculo; não altera silenciosamente o perfil do personagem.
- Alterações são aplicadas após 250 ms sem nova digitação. O rendimento esperado e os indicadores são recalculados sem nova consulta de mercado.
- Receitas de rendimento fixo preservam o valor verificado. Para rendimentos variáveis, a UI identifica o modelo como estimativa e mostra a premissa.
- Tempos conhecidos/calibrados por método são reaproveitados. O usuário pode ajustar tempos nas opções avançadas. Coleta sem estimativa de rendimento e tempo permanece incompleta. Se algum passo escolhido não tiver tempo útil, o motor não promete uma taxa horária completa.
- Rendimento variável é um cenário automático identificado como estimativa, sem confirmação; ajuste manual é opcional no modo avançado. A recomendação econômica do produto final mede sua produção para venda, mantendo estoque separado dos cálculos de faturamento e lucro.
- O modo simples mantém produto, quantidade, materiais, origem e resumo econômico. A calibração de tempo, imposto e outras opções continuam progressivamente disponíveis no modo avançado.
- Na tela de Mercado, busca e controles atuais permanecem; a busca passa a compartilhar debounce de 250 ms. Ordenação por coluna, histórico, limites de preço e volumes não são removidos nem substituídos por dados simulados.

## Limites e tratamento de falhas

- Sem cotação atual ou de cache, o item aparece como pendente. A quantidade de itens pendentes é explícita.
- Uma resposta de erro pode conservar a cotação vencida, sempre identificada como antiga. Não vale como dado atual para uma recomendação sem aviso.
- Ciclo de receita, quantidade desconhecida, receita ausente, indisponibilidade no mercado e limite de busca mantêm o cenário incompleto com motivo legível.
- A otimização não varre outras fórmulas para o mesmo produto, não busca o catálogo global e não liga o coletor de mercado.
- A interface não trata volume histórico inexistente como zero. O gráfico e as colunas continuam usando apenas dados que o contrato do mercado fornece.

## Validação de aceitação

- Testes do cache cobrem resposta fresca imediata, atualização de ausentes/vencidas, dados antigos em caso de falha, concorrência limitada e descarte de resposta fora do contexto.
- Testes do planejador incluem uma cadeia Edania sintética, a topologia versionada da fórmula selecionada de Edania (117 IDs de item e 62 produtores, com preços/quantidades/rendimentos/tempos sintéticos), a poda contra um limite seguro, subprodutos vendidos e lucro negativo, alternativas comprar/fazer/coletar com estimativa explícita, fontes fixadas pelo usuário, estoque/reservas, impostos, tempo, rendimento fixo e variável, empate determinístico, ciclo, cotação ausente e estouro do limite de estados.
- O teste Edania deve concluir e provar a melhor combinação para um fixture que cubra todo o grafo alcançável; não basta provar que a busca respeita o limite.
- Testes da página cobrem preload automático ao abrir, revalidação no TTL, estado parcial sem falsa taxa horária, debounce exato de 250 ms, checkbox por item, aplicação da recomendação e atualização após edição manual.
- Testes da página garantem que o rendimento estimado seja aplicado sem botão de confirmação e que estoque zero não mostre recomendação de produzir o produto final para obtê-lo.
- Testes do mercado cobrem leitura cache-first por chave da consulta, revalidação e preservação da ordenação/filtros existentes.
- Verificar `/recipes/items/1407` e `/market` no navegador, incluindo largura estreita, navegação por teclado, rótulos acessíveis e movimento reduzido.
- Executar `pnpm test` e `pnpm check` antes de integrar.

## Git e documentação

- Criar uma branch de feature sobre `develop` após a aprovação da especificação e do plano.
- Fazer commits convencionais por responsabilidade isolada: cache/consulta, motor de otimização, integração e controles da receita, cache e controles do mercado, documentação.
- Atualizar `docs/ACTIVE_CONTEXT.md`, a matriz de cobertura e a skill `bdo-ui-design` apenas com os padrões reutilizáveis confirmados nesta implementação.
- Após testes e revisão, integrar a branch localmente em `develop`; não publicar novo staging sem uma solicitação de publicação para esta entrega.
