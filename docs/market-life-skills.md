# Receitas de profissões e Mercado Central

Refinamento do redesign aprovado em 9 de outubro de 2026.

## Receitas

A descoberta de receitas inclui culinária, alquimia, processamento e entrega imperial, com filtros aplicados antes da contagem e paginação. A pesquisa da oficina e suas categorias usam os produtos e ingredientes desses mesmos métodos. Consultas do catálogo geral e rotas diretas de itens/receitas permanecem completas.

O catálogo local contém 3.214 receitas nesse escopo e 1.457 itens relacionados. A busca por “Habilidade” não encontrou resultados. Itens de equipamento que realmente participam de processamento continuam acessíveis como ingredientes; não há exclusão por palavras do nome.

Categorias da busca: 61 opções relacionadas a essas atividades, contra 212 no catálogo geral. A troca de escopo cancela consultas pendentes e descarta categorias e resultados anteriores.

## Mercado

O mercado abre no quadro de itens em alta fornecido pelo Arsha para a região selecionada. Uma consulta compartilhada, com cache de 30 minutos, fornece o quadro; filtros, ordenação e paginação são aplicados ao conjunto completo antes da resposta. Páginas de 20, 50 ou 100 linhas, busca por nome/ID, categorias do catálogo e consulta completa de variantes permanecem disponíveis.

- Preço atual: preço base informado pela fonte.
- Topo/bottom: limites máximo e mínimo permitidos pelo mercado, não extremos de negócios no período.
- Média 30d: média aritmética das cotações positivas observadas dentro dos últimos 30 dias, com pelo menos duas observações distintas. Não é média ponderada das vendas.
- Volumes 24h/15d/30d: diferença do contador acumulado, somente com observações válidas nas extremidades, intervalos máximos de uma hora e ausência de reset do contador. Dados insuficientes aparecem como `—`, sem tratar ausência como zero.

O coletor de SA/PT consulta o quadro a cada 30 minutos enquanto a API está ativa e mantém 31 dias de snapshots para preservar a referência inicial do período de 30 dias. Pode ser desativado com `MARKET_BOARD_COLLECTOR_ENABLED=false`; também respeita `MARKET_PROVIDER_ENABLED=false`. Histórico incompleto, parada do servidor ou saída do item do quadro podem impedir o cálculo de volumes. As métricas não ficam disponíveis retroativamente.

Observações parciais do quadro são marcadas como `hot`. Somente registros completos marcados como `item` alimentam o cache de consulta de variantes; snapshots legados continuam no histórico, mas não são presumidos completos. A cotação completa prevalece em conflitos de timestamp.

Fonte do contrato: [Arsha](https://github.com/guy0090/api.arsha.io) e [documentação do mercado](https://www.postman.com/bdomarket/arsha-io-bdo-market-api/documentation/qpavrc8/bdo-market-api-v2).

## Fonte local

Barlow Semi Condensed nos pesos 400–700, com WOFF2 e licença OFL incluídos no projeto. Acentuação portuguesa verificada. A escolha aproxima as proporções dos menus; não se apresenta como a fonte original Strong Sword. Detalhes e fontes primárias na [referência de tipografia](../.agents/skills/bdo-ui-design/references/typography.md).

## Evidências

O navegador mostrou 393 itens em alta na consulta de validação, 20/50/100 linhas por página, passagem de 101–200 na segunda página de 100 e retorno à primeira página ao trocar o tamanho. Categoria Material retornou 25 itens; “Magnetita” reduziu o resultado a dois. Nomes completos, ícones originais e números em prata foram mantidos. Em 375 px, apenas a tabela rola horizontalmente; a página não transborda.

Regressões cobrem filtragem antes da paginação, troca/cancelamento de escopo, ausência de histórico, contadores inválidos, precisão de preços, coleta/cleanup e isolamento dos snapshots parciais. A revisão independente confirmou a correção do cache de variantes. Não houve migração de schema, nova dependência de produto ou publicação externa.

Verificação final: `pnpm test` aprovado (24 testes de calculadoras, 99 de API e 207 de frontend; 330 no total), lint das alterações de API e frontend aprovado, build de API/web no Docker aprovado e smoke SSR aprovado na imagem final. Avisos do build: bundle inicial de 939,37 kB acima do orçamento de aviso de 500 kB, abaixo do limite de erro de 1 MB; locale pt-BR usa fallback pt; Tesseract emite avisos CommonJS.
