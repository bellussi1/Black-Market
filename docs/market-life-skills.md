# Receitas de profissões e Mercado Central

Refinamento do redesign aprovado em 9 de outubro de 2026.

## Receitas

A descoberta de receitas inclui culinária, alquimia, processamento e entrega imperial, com filtros aplicados antes da contagem e paginação. A pesquisa da oficina e suas categorias usam os produtos e ingredientes desses mesmos métodos. Consultas do catálogo geral e rotas diretas de itens/receitas permanecem completas.

O catálogo local contém 3.214 receitas nesse escopo e 1.457 itens relacionados. A busca por “Habilidade” não encontrou resultados. Itens de equipamento que realmente participam de processamento continuam acessíveis como ingredientes; não há exclusão por palavras do nome.

Categorias da busca: 61 opções relacionadas a essas atividades, contra 212 no catálogo geral. A troca de escopo cancela consultas pendentes e descarta categorias e resultados anteriores.

## Mercado

O mercado abre no quadro de itens em alta fornecido pelo Arsha para a região selecionada. O cache local e a renovação das telas ativas usam oito minutos. O cache do provedor continua informado separadamente (30 minutos); consultar novamente não garante que o provedor tenha uma nova cotação.

A busca por nome/ID e os filtros de categoria consultam todo o catálogo local antes da paginação, inclusive itens fora do quadro em alta. Uma chamada pública `POST /v2/{region}/search?lang={locale}`, com um array de até 100 IDs, consulta os preços da página. Itens omitidos pelo provedor permanecem visíveis com preço, estoque e contador desconhecidos. Resultados de busca usam a relevância/nome do catálogo antes da paginação; preço e estoque só ordenam o conjunto completo de itens em alta. Páginas de 20, 50 ou 100 linhas continuam disponíveis.

O endpoint de busca fornece resumos por item, sem variante de aprimoramento nem limites de preço. A interface identifica esse resumo, mantém as métricas sem dados como ausentes e busca a cotação completa de variantes ao selecionar o item. Resumos nunca são gravados como histórico de uma variante `sid=0`.

Em respostas reais, o provedor converteu o ID legado 16 em 16004 e repetiu esse ID com um placeholder zerado. Somente IDs exatos da página recebem cotações; placeholders zerados e IDs inesperados são descartados, duplicatas idênticas são reunidas e conflitos deixam apenas aquele item sem cotação. Uma indisponibilidade da fonte preserva os resultados do catálogo e os preços antigos, quando existentes, com aviso explícito. A próxima tentativa é permitida depois de um minuto; não há retry automático em sequência.

- Preço atual: preço base informado pela fonte.
- Topo/bottom: limites máximo e mínimo permitidos pelo mercado, não extremos de negócios no período.
- Média 30d: média aritmética das cotações positivas observadas dentro dos últimos 30 dias, com pelo menos duas observações distintas. Não é média ponderada das vendas.
- Volumes 24h/15d/30d: diferença do contador acumulado, somente com observações válidas nas extremidades, intervalos máximos de uma hora e ausência de reset do contador. Dados insuficientes aparecem como `—`, sem tratar ausência como zero.

O coletor de SA/PT consulta o quadro a cada oito minutos enquanto a API está ativa e mantém 31 dias de snapshots para preservar a referência inicial do período de 30 dias. Pode ser desativado com `MARKET_BOARD_COLLECTOR_ENABLED=false`; também respeita `MARKET_PROVIDER_ENABLED=false`. Histórico incompleto, parada do servidor ou saída do item do quadro podem impedir o cálculo de volumes. As métricas não ficam disponíveis retroativamente. Os demais itens são consultados sob demanda; não se promete coleta contínua de todos os itens do jogo.

Os gráficos mostram preço, estoque e volume por intervalo de observação, com janelas de 24 horas, sete e 30 dias. Volume representa diferenças válidas do contador acumulado entre observações com no máximo 16 minutos de intervalo. Ausências e resets interrompem o gráfico. O giro estimado divide o estoque atual pelo volume diário observado, normalizado ao intervalo coberto, e exige pelo menos 24 horas de cobertura contínua. Não prevê execução de ordens nem garante prazo de venda.

As telas suspendem a renovação quando estão ocultas e consultam novamente ao voltar se o intervalo venceu. Timers, listeners e requisições são encerrados ao sair da página.

## Navegação unificada

`/storage` reúne armazéns por cidade e inventários por personagem. `/family` reúne ficha dos personagens, equipamentos e benefícios compartilhados. As rotas antigas `/inventory`, `/profile` e `/gear` preservam links existentes e abrem a aba correspondente, mantendo parâmetros e fragmentos.

O catálogo agora faz parte do Mercado: `/database/items` redireciona para `/market`, e os detalhes usam `/market/items/:id`. O servidor preserva as URLs antigas com redirecionamentos permanentes; sitemap e metadados usam os novos endereços. Armazém e Família continuam privados, sem indexação.

Dados e Backup foi retirado da navegação principal, rodapé e ações comuns. O endereço legado continua acessível para recuperação de armazenamento inválido, sem remover dados salvos.

Observações parciais do quadro são marcadas como `hot`. Somente registros completos marcados como `item` alimentam o cache de consulta de variantes; snapshots legados continuam no histórico, mas não são presumidos completos. A cotação completa prevalece em conflitos de timestamp.

Fonte do contrato: [Arsha](https://github.com/guy0090/api.arsha.io) e [documentação do mercado](https://www.postman.com/bdomarket/arsha-io-bdo-market-api/documentation/qpavrc8/bdo-market-api-v2).

## Fonte local

Barlow Semi Condensed nos pesos 400–700, com WOFF2 e licença OFL incluídos no projeto. Acentuação portuguesa verificada. A escolha aproxima as proporções dos menus; não se apresenta como a fonte original Strong Sword. Detalhes e fontes primárias na [referência de tipografia](../.agents/skills/bdo-ui-design/references/typography.md).

## Evidências

O navegador mostrou 393 itens em alta na consulta de validação, 20/50/100 linhas por página, passagem de 101–200 na segunda página de 100 e retorno à primeira página ao trocar o tamanho. Categoria Material retornou 25 itens; “Magnetita” reduziu o resultado a dois. Nomes completos, ícones originais e números em prata foram mantidos. Em 375 px, apenas a tabela rola horizontalmente; a página não transborda.

Regressões cobrem filtragem antes da paginação, troca/cancelamento de escopo, ausência de histórico, contadores inválidos, precisão de preços, coleta/cleanup e isolamento dos snapshots parciais. A revisão independente confirmou a correção do cache de variantes. Não houve migração de schema, nova dependência de produto ou publicação externa.

Validação da primeira etapa: 330 testes passaram. Na unificação das rotas e ampliação do Mercado, `pnpm test` passou com 24 testes de calculadoras, 115 de API e 226 de frontend (365 no total). Lint das alterações de API, frontend e shared aprovado; build de API/web no Docker e smoke SSR na imagem final aprovados.

O navegador confirmou abas internas de Armazém/Família, redirecionamento de `/gear` para a aba de equipamentos, busca por ID fora do quadro inicial e gráfico com volume zero. Em 375 px, Família e gráficos não provocam overflow da página; a tabela de variantes usa rolagem horizontal interna com nomes legíveis. Falhas reais da fonte ao consultar 100 IDs foram tratadas preservando o catálogo e identificando a falta de cotações.

A revisão independente reproduziu e orientou duas correções: o coletor programa a próxima consulta oito minutos depois de concluir a anterior, evitando reutilizar o cache por causa da latência; barras de volume zero ficam na linha zero, enquanto preços constantes permanecem centralizados. Regressões também cobrem aliases com parâmetros/fragmentos, inventário em edição ao trocar a aba, variantes reais de resumos, duplicatas conflitantes e placeholders totalmente zerados do provedor.

Avisos existentes do build: bundle inicial de 939,24 kB acima do orçamento de aviso de 500 kB, abaixo do limite de erro de 1 MB; locale pt-BR usa fallback pt; Tesseract emite avisos CommonJS.
