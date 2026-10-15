# Mercado e Oficina de Receitas: cache de rota e layout

**Data:** 15/10/2026  
**Estado:** proposta para revisão do usuário  
**Escopo:** experiência de navegação e apresentação em Mercado e Receitas; manter os cálculos de domínio existentes.

## Objetivo

Deixar Mercado e Receitas prontos para aparecer rapidamente, evitar mudanças bruscas ao filtrar categorias e aproximar a Oficina de Receitas da composição mostrada pelo usuário. O conteúdo continua vindo do catálogo e das cotações da aplicação; nomes, itens, categorias, fórmulas e imagens não serão embutidos no código.

Critérios de sucesso:

- Uma categoria selecionada não faz a navegação de categorias desaparecer nem desloca a página.
- Categorias pai e filhas aparecem numa hierarquia clara, com filhas expostas pelo controle da categoria pai, recuo e seleção visível.
- A navegação para Mercado e Receitas usa cache válido imediatamente e atualiza dados vencidos sem apagar o conteúdo durante a consulta.
- Em desktop, a Oficina de Receitas reserva aproximadamente dois terços para produto/configuração e um terço para o resultado. A árvore de produção continua ocupando a largura abaixo dos dois painéis.
- Os controles de maestria alteram apenas a simulação atual; não modificam o personagem salvo.
- O valor de Culinária ou Alquimia e o de Processamento alimentam os rendimentos dos ramos correspondentes em cada cenário de aquisição. Um campo sem efeito na cadeia atual não sugere que altera o resultado.

## Mercado: categorias sem deslocamento

A árvore de categorias será mantida num estado próprio, separado da resposta de itens do filtro. Ela virá da taxonomia devolvida pela API para a região e versão do catálogo ativas. A lista de categorias permanecerá visível durante carregamento, erro e ausência de resultados.

As categorias de nível superior terão controle de expansão acessível; as subcategorias ficarão agrupadas sob a categoria correspondente, com recuo, estado expandido e destaque da seleção. A seleção do pai continuará representando todas as suas subcategorias. A interface não repetirá a categoria pai como se fosse uma subcategoria.

Ao escolher outro filtro, a tabela preservará sua estrutura e dimensões. Se houver resultado em cache para a consulta exata, ele será mostrado enquanto revalida; sem cache correspondente, o espaço de linhas mostrará carregamento estável, sem apresentar resultados de outro filtro como se fossem os atuais. Erros manterão as categorias e oferecerão nova tentativa.

## Resolvers e cache de navegação

Mercado e Receitas passarão a ter resolvedores Angular que compartilham os mesmos repositórios de dados usados pelo aquecimento antecipado. O aquecimento acontecerá apenas quando o usuário indicar intenção de navegar por foco de teclado ou ponteiro num link interno relevante; chamadas duplicadas para a mesma chave serão compartilhadas.

As consultas iniciais contempladas são:

- `/market`: quadro inicial e taxonomia de categorias da região atual.
- `/recipes`: primeira página da lista para atividade/filtro atual.
- `/recipes/items/:id`: detalhe do item e receitas que o produzem.
- `/recipes/:key`: receita selecionada, seu produto e alternativas correspondentes.

O cache de dados de catálogo será mantido em memória e indexado por região, idioma preferido, versão/checksum do conjunto de dados e parâmetros da consulta. Consultas de mercado usarão também os parâmetros efetivos do quadro, incluindo categoria, busca, ordenação, estoque, página e tamanho da página. Dados privados de workspace não serão pré-carregados nem incluídos nesses caches.

No cache fresco, o resolvedor devolverá os dados imediatamente. No cache vencido, disponibilizará o resultado da mesma consulta com sua idade e revalidará em segundo plano. Sem cache, buscará os dados essenciais antes de ativar a rota; durante essa navegação, o layout compartilhado mostrará um indicador discreto de progresso. Erro sem cache produzirá estado recuperável e ação para tentar novamente. Troca de região, idioma ou versão do catálogo nunca reutilizará dado de uma chave incompatível.

O resolvedor não executará cálculo de rentabilidade, expansão completa da árvore, consulta indiscriminada de cotações nem otimização. Esses processos continuarão no contexto da página, com seus estados de carregamento e cancelamento, e usarão cache quando disponível. A entrada direta por URL e a navegação via link deverão convergir no mesmo cache/repositório.

## Oficina de Receitas: dois painéis

Em desktop, o painel de produto/configuração terá cerca de `2fr` e o painel de resultado `1fr`, com largura mínima que preserve leitura dos valores e ações. Fórmula, quantidade, maestrias e ajustes permanecem no painel esquerdo. Resultado, cenários e métricas financeiras permanecem no painel direito. Botões do cenário podem quebrar ou reorganizar a linha em telas menores, sem criar uma segunda área de controle. A árvore continua abaixo, em largura total. Em viewports estreitos, os painéis empilham.

O primeiro controle de maestria representa a profissão da fórmula principal, obtida dinamicamente do tipo da receita. O segundo representa Processamento quando existe etapa ativa de Processamento cujo rendimento possa mudar com essa maestria; caso contrário, o estado da área explicará que Processamento não se aplica à cadeia selecionada. A disponibilidade acompanha mudanças de fórmula e cadeia, e não apenas o cenário de compra/produção.

Os valores editados continuam sendo sobreposições temporárias de simulação. Limpar o campo volta à maestria do personagem ativo, ou ao padrão atual do sistema quando não houver personagem. Cada alteração recalcula imediatamente quantidade esperada, faturamento, lucro e lucro/hora, desde que os demais dados necessários estejam disponíveis. Pendências e dados ausentes permanecem explícitos.

Os três cenários existentes — comprar subreceitas, fazer/coletar tudo e otimizar lucro por hora — continuam comparáveis com a mesma configuração de maestria. A maestria afeta o rendimento das etapas efetivamente produzidas no cenário; não altera quantidades compradas, preços, estoque ou tempo sem dados. A otimização continua cancelável e fora do resolvedor.

## Acessibilidade e estados

- Campos de maestria terão rótulos visíveis, limites existentes de 0–3000 e atualização anunciada sem roubar foco.
- Expansão de categoria terá nome acessível, `aria-expanded` e operação por teclado; seleção terá estado semântico além da cor.
- Loading, revalidação, cache vencido e erro usarão mensagens de estado concisas, sem trocar a geometria do conteúdo.
- Respeitar `prefers-reduced-motion`; animações de expansão não serão necessárias para entender a hierarquia.

## Verificação

Os testes incluirão:

1. Estado de categoria preservado ao trocar filtro, incluindo carregamento, erro, categoria pai, filha e ausência de itens.
2. Resolvedores e cache: acerto fresco, dado vencido e revalidação, ausência de cache, falha, deduplicação do aquecimento e invalidação por região/idioma/versão/parâmetros.
3. Receitas: parâmetros de rota e seleção de fórmula, divisão responsiva dos painéis, uso temporário da maestria, retorno ao valor do perfil, recálculo dos valores e ausência de mutação do personagem.
4. Cenários comprar, produzir/coletar e otimizar com uma receita que contenha Processamento e outra sem essa etapa, além de inspeção visual do viewport desktop solicitado.
5. `pnpm check`, `pnpm test` e conferência visual no navegador local; o roteiro da conferência deverá verificar que nenhuma informação antiga aparece sem indicação durante revalidação.

## Fora de escopo

- Alterar fórmulas de rendimento, impostos, preços ou disponibilidade de mercado.
- Persistir as sobreposições de maestria no perfil do personagem.
- Aquecer em massa o catálogo, histórico de mercado, todos os ramos de receitas ou áreas autenticadas.
- Alterar os fluxos de autenticação, menu, staging ou banco de dados.

## Arquivos previstos

- `apps/web/src/app/app.routes.ts` e novos resolvedores/repositórios no núcleo Web.
- `apps/web/src/app/core/market-cache.service.ts`, `apps/web/src/app/core/catalog-api.service.ts` e links internos usados para prefetch, conforme necessário para compartilhar requisições.
- `apps/web/src/app/features/market/market-board.ts`, `market-board.html`, estilos e testes.
- `apps/web/src/app/features/recipes/recipes-page.ts`, `recipes-page.html`, estilos e testes.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.html`, `recipe-tree.scss`, `recipe-tree.ts` e testes quando necessários para os dois campos e para o layout.

