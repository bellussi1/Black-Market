# Implementação dos achados da auditoria

**Autorização:** usuário pediu “Siga com a implementação” após receber a auditoria e os requisitos concretos. Executar as correções locais, sem outra confirmação intermediária. A auditoria é a especificação-base: `docs/research/full-product-ui-calculation-performance-audit-2026-10-16.md`.

**Objetivo:** preservar dados, corrigir SSR e entrada/autenticação, tornar premissas econômicas verificáveis e melhorar estabilidade/semântica da interface existente.

**Arquitetura:** reaproveitar WorkspaceStore, IdentityService, AccountPage, SettingsPage, primitivas de dialog existentes e RecipeTree. Login contextual mantém intenção segura separada da autenticação; Settings compõe conta/nuvem e backup local. O solver recursivo segue sua especificação existente.

**Restrições:** não alterar credenciais/Firebase, não fazer seed/migração persistente, não publicar/push. Não inventar ratios, dados OCR, volumes, preços ou calibração. Preservar documentação da auditoria e plano preexistente da fase 3. Usar branch `codex/audit-remediation` no checkout atual; sem mover dados/arquivos de trabalho nem recriar instalações.

## Tarefas e propriedade de arquivos

- [x] **1 — Recuperação/SSR e equivalência segura (principal):** testes RED/GREEN para WorkspaceStore server/browser, restauração após hidratação, backup corrupto preservado e sem falso aviso; equivalências DRY não confirmadas não entram como custo exato. Arquivos: core/workspace-store*, API recipe-market-equivalents*, testes afetados. Auditar gates em Node suportado.
- [x] **2 — Login e configurações (agente auth):** AUD-01/04/05/06/07/13: modal acessível com overlay/blur e retorno seguro, links antigos/callback Steam compatíveis, Settings público para backup local e funções de conta autenticadas internamente; estados de erro recuperáveis e botões oficiais de marca. Propriedade: auth guard/return URL/identity, novo login dialog/service, account/settings, layout e links Home/Roadmap, mvp paths e testes desses fluxos, API identity callback se necessário. Não editar WorkspaceStore nem documentação global.
- [x] **3 — Economia e otimizador (agente optimizer):** AUD-08/09/10/18: seguir `2026-10-16-recursive-recipe-alternative-optimizer.md` e spec correspondente; testar oráculo, alternativas recursivas, ciclo/versão/limite, prévia/aplicação/invalidação. Distinguir origem de tempo padrão da calibração, mostrar quantidade média fracionária coerente e labels pt-BR. Propriedade: production-planner*, shared/recipe-tree/* e suas specs. Não editar API de equivalência nem páginas RecipesPage.
- [x] **4 — UI/estabilidade/bundle (agente UI):** AUD-11/12/16/17: heading principal no detalhe sem repetição, estabilizar grid/pager com textos completos, nomenclatura descoberta/oficina e otimização de bundle baseada em stats sem elevar budgets. Propriedade: features/recipes/recipes-page*, features/crafting/crafting-page* (copy/navegação), estilos globais pontuais e app providers lazy se necessário, specs. Não editar layout/account/settings/Home nem shared/recipe-tree.
- [x] **5 — Integração/revisão/verificação (principal):** revisar contratos e diffs; teste focado de cada frente, revisão independente final, pnpm check/test/build serial e smoke SSR/auth. Browser desktop/estreito: Home sem banner falso, modal cancel/login intent, Settings visitante export, receitas/paginação/gráfico. Atualizar checklist/contexto/handoff com estado verdadeiro.

## Decisões de execução

- Frontes 1–4 compartilham contratos existentes, mas possuem arquivos delimitados. Mudanças de interfaces devem ser comunicadas antes de editar fora da propriedade.
- A proteção de dados remotos permanece na API. Abrir Settings para exportar arquivo local não expõe conteúdo de conta sem token.
- No acesso direto protegido, o guard mantém a intenção e navega a uma superfície pública segura para exibir o modal; ao cancelar retorna à Home, pois não existe contexto anterior confiável. No clique interno preserva rota/scroll de origem.
- Dados externos e login humano não podem ser fabricados para concluir AUD-13/14/15. Entregar controles/contratos seguros e manter esses gates parciais.
- Registro de execução em `.superpowers/sdd/audit-remediation-2026-10-16/progress.md`; nenhuma outra pasta SDD deve ser modificada.

**Fechamento:** implementação e gates concluídos; AUD-13/14/15 dependem de validação/dados externos, AUD-16 permanece parcial (538,21 kB). Evidência e limites em `docs/research/audit-remediation-2026-10-16.md`.
