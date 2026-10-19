# Plano de implementação — Coach de Atividades

- **Especificação:** `docs/superpowers/specs/2026-10-15-activity-coach-recommendations-design.md`
- **Pesquisa de referências:** `docs/research/activity-coach-competitive-review.md`
- **Objetivo:** refazer `/recommendations` para priorizar lucro líquido/hora de produção Life Skill que ajude a financiar gear Life Skill e PvPvE, removendo a preparação manual do catálogo/mercado/comparação.

## Estado inicial confirmado

- Branch `main`, limpa e um commit local à frente de `origin/main` antes desta atualização documental.
- `/recommendations` hoje baixa `ProductionApi.catalog()` somente após o clique “Carregar catálogo”, mostra calibrações/tabela de preços, tem botões separados de consulta e comparação e inclui demonstração/preços fictícios.
- A rota é privada e já usa `authGuard`, mas não declara resolver.
- `PublicRouteData` aquece dados públicos apenas para `/market` e `/recipes`; `CatalogApiService` tem cache público por região/locale/dataset, enquanto `ProductionApi.catalog()` não usa esse cache.
- `MarketCacheService.resolveProductionQuotes()` reaproveita cotações por região, busca em lotes de até 100 e mantém cache quando a fonte falha. Evitar chamadas por item e escopo global indiscriminado.
- `WorkspaceStore` fornece personagem ativo, perfil, inventário, reservas, prata, tempo e impostos. `workspaceSchema` aplica defaults e permite adicionar preferências sem quebrar backups antigos.
- O motor `planProduction()` e a página de receita já calculam comparação de produção. A rota não deve recriar essa lógica.

## Fatias de trabalho e commits atômicos

### 1. Persistir preferências e calibrações mínimas do Coach

**Arquivos prováveis:** `packages/calculators/src/workspace.ts`, `packages/calculators/src/workspace.spec.ts` (ou spec correspondente), `apps/web/src/app/core/workspace-store.ts` se o acesso exigir helper.

1. Escrever teste de schema para carregar backup antigo sem a nova propriedade e preencher defaults.
2. Adicionar a seleção de atividades de produção preferidas (Culinária, Alquimia, Processamento) ao workspace.
3. Adicionar calibração por personagem/método, validando número positivo e limite de registros; evitar gear como multiplicador.
4. Verificar roundtrip de backup, região e demonstração sem sobrescrever o workspace real.
5. Commit: `feat(workspace): persist activity coach preferences`.

### 2. Usar cache público e resolver para o catálogo de produção

**Arquivos prováveis:** `apps/web/src/app/core/catalog-api.service.ts`, `apps/web/src/app/core/public-route-data.ts`, `apps/web/src/app/core/public-route-data.spec.ts`, `apps/web/src/app/app.routes.ts` e testes de rotas.

1. Adicionar `getProductionCatalog(region)` em `CatalogApiService`, usando a chave de região/locale/dataset, cache de leitura pública, deduplicação in-flight e memória de ícones já existentes.
2. Criar `recommendationsRouteResolver` que aquece o snapshot público na região ativa e declara estados `ready/unavailable`, sem serializar nem consultar perfil/estoque.
3. Registrar resolver depois da autorização da rota. O componente lerá o mesmo serviço/cache e não fará uma segunda chamada independente.
4. Cobrir cache fresco, revalidação, mudança de região e falha sem estado privado no resultado do resolver.
5. Commit: `feat(recommendations): preload production data by route`.

### 3. Trocar a tela por um resumo de decisão

**Arquivos prováveis:** `apps/web/src/app/features/recommendations/recommendations-page.ts`, `.html`, `.scss`, `.spec.ts`.

1. Substituir primeiro os testes de fluxo atual: ausência dos botões manuais de catálogo, mercado e comparar; carregamento automático; perfil ativo; filtros; estado vazio/erro.
2. Remover tabela de preços do fluxo principal e ações de demonstração/preços fictícios da página.
3. Criar cabeçalho alinhado à meta de gerar prata para evoluir gear Life Skill e PvPvE; resumo compacto de perfil e seletor das atividades suportadas.
4. Priorizar receitas que podem ser calculadas com perfil/estoque e preferências. Derivar o conjunto de IDs de cotação apenas das receitas habilitadas e reutilizar lotes/cache da região.
5. Iniciar cotação em segundo plano automaticamente. Preservar cache durante atualização/erro, indicar progresso, fonte e horário, e encerrar sem fan-out individual.
6. Acionar `planProduction()` automaticamente quando catálogo, preferências, perfil, estoque, cotações ou calibração mudarem; limitar atualização concorrente e descartar resultado de contexto antigo.
7. Ordenar só candidatos completos. Manter pendências separadas; mostrar lucro líquido por lote/hora, custos, tempo, quantidades, uso do armazém e explicação curta.
8. Mover correções manuais e calibração para detalhes contextuais, com persistência no workspace; nunca inferir duração/saída ausente.
9. Revisar teclado, foco, leitor de tela, responsividade, carregamento inicial e conteúdo longo conforme as skills de UI BDO.
10. Commit: `feat(recommendations): replace manual workflow with activity coach`.

### 4. Atualizar documentação e handoff

**Arquivos:** `docs/research/implementation-gap-matrix.md`, `docs/ACTIVE_CONTEXT.md`.

1. Registrar o que mudou, o que continua sem cobertura, diferença entre dados de mercado e venda e lacunas de comparação PvPvE/coleta.
2. Atualizar instrução clara de continuação com arquivos, commits, verificações e limitações.
3. Commit: `docs(recommendations): record coach scope and handoff`.

## Verificação

- Testes direcionados primeiro para schema, cache/resolver e fluxo da página.
- Executar `pnpm check` conforme `AGENTS.md`; executar `pnpm test` após as fatias integradas, observando as instabilidades de testes Web registradas na seção 112/116 de `ACTIVE_CONTEXT.md`.
- Validar a rota autenticada em desktop e viewport estreita: primeiro acesso com cache vazio, volta com cache quente, cache vencido durante atualização, erro de cotação, sem personagem, sem tempo e sem preço.
- Conferir que mudanças no personagem/região/estoque invalidam o resultado anterior e que nenhum preço/proveniência externa aparece como dado do jogador.
- Não publicar, fazer push ou alterar fonte externa. Commits locais e separados por responsabilidade.

## Questões que o código deve resolver sem ampliar o escopo

- O snapshot é amplo; usar o cache e a seleção de atividades para não repetir chamadas nem buscar cotações item a item. Se os limites do provedor encerrarem o lote, conservar o cache e marcar o restante como desconhecido.
- O ranking é do escopo de receitas suportado pela seleção atual e pelo planner; não é prova de ótimo sobre todas as atividades de BDO.
- Sessões manuais já registradas em `/lifeskills` não serão misturadas ao ranking nesta etapa. Definir ingestão/revisão/cobertura de sessões antes de comparar com Grind/PvE, coleta, pesca ou caça.
- O caminho de prata até upgrades de gear é a finalidade do Coach. Sem modelo validado, o equipamento não altera a estimativa de produção nem transforma silver/h em previsão de gear/PvPvE.
