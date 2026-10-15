# Acesso por sessão às áreas pessoais — Plano de implementação

> **Para agentes:** execute tarefa a tarefa neste worktree, em sessão, com TDD e commits atômicos.

**Objetivo:** exigir sessão Google/Steam somente em Scan, “O que fazer?” e Armazém; manter as demais ferramentas públicas e redirecionar o retorno do login com segurança.

**Arquitetura:** um `CanActivateFn` inicializa o estado Firebase e protege apenas as três rotas privadas. Visitantes vão para `/account` com o caminho de retorno; a tela de conta permanece pública, expõe apenas Google/Steam e volta ao destino depois do login. O servidor continua sendo a fronteira de autorização para dados sincronizados.

**Stack:** Angular standalone, Router, Signals, Firebase Auth existente, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-14-social-auth-and-staging-design.md` (seção “Limite de acesso por funcionalidade”).

## Restrições globais

- Somente Google e Steam como provedores de conta; não criar senha ou login por e-mail.
- Apenas `/scans` (inclui `/scans/profile`), `/recommendations` e `/storage` exigem sessão.
- Mercado, receitas, crafting e outras ferramentas continuam acessíveis sem conta.
- `/account` é uma entrada pública de autenticação; nunca aceitar retorno externo ou redirect aberto.
- Não confiar no guard do navegador para proteger dados: a API segue verificando tokens.

## Foco de revisão

- Firebase desligado/inacessível: bloquear as áreas pessoais e explicar a indisponibilidade no login.
- Usuário já autenticado: permitir navegação sem flash de redirecionamento.
- Retorno de login: preservar query/fragmentos internos; rejeitar URL externa ou protocolo relativo.
- Steam OpenID: manter destino de retorno entre navegação externa e callback usando somente estado local da sessão.
- Rotas livres: confirmar que a proteção não se propaga ao Mercado, Receitas ou Crafting.

### Tarefa 1: proteção e retorno social

**Arquivos:** `apps/web/src/app/core/auth.guard.ts` (novo), `auth.guard.spec.ts` (novo), `apps/web/src/app/app.routes.ts`, `apps/web/src/app/app.routes.spec.ts`, `apps/web/src/app/core/mvp-scope.spec.ts`, `apps/web/src/app/features/account/account-page.ts`, `account-page.spec.ts`, `account-page.html`, `layout/workspace-layout.ts`, `workspace-layout.html`, `packages/shared/src/mvp-scope.ts`, este documento de spec e `docs/ACTIVE_CONTEXT.md`.

**Interfaces:** `authGuard: CanActivateFn`; o guard aguarda `IdentityService.initialize()`, libera `authenticated() === true` e, caso contrário, retorna um `UrlTree` para `/account?returnUrl=<state.url>`. A página de conta só navega para destinos locais sob `/scans`, `/recommendations` ou `/storage`.

- [x] Primeiro escreva testes do guard para autenticado, visitante, inicialização com falha e preservação de URL.
- [x] Execute os testes e confirme falha pelas rotas sem guard.
- [x] Adicione o guard só em `/scans`, `/recommendations` e `/storage`; habilite `/account` no MVP.
- [x] Implemente retorno local seguro, persistido em `sessionStorage` durante o fluxo Steam e aplicado após Google/Steam.
- [x] Torne a conta encontrável pelo cabeçalho e apresente a razão quando a área privada exige login ainda não configurado.
- [x] Rode os testes do guard, rotas e conta; rode `pnpm check`.
- [x] Atualize o handoff e faça commit `feat(auth): gate personal workspaces with social login`.
