# Auditoria de arquitetura

Estado inicial em 11/10/2026: Angular 22.2.1, CLI/build/SSR 22.2.2, TypeScript 6.0.3, pnpm 10.28.1 e lockfile compartilhado. Shell encontrou Node 24.13.0; o projeto declara ^24.15.0. Não atualizar o framework junto da migração visual.

`apps/web/angular.json` usa application builder, saída server, SSR e componentes standalone com OnPush. Rotas são carregadas por feature. Tailwind 4.3.3 e PostCSS já estão configurados; `tailwind.css` precede `styles.scss`. Material/CDK 22.2.2 já existem. Preservar contratos de serviços e calculadoras durante a migração.

Baseline imediatamente anterior: `pnpm check` passou, incluindo build de desenvolvimento; `pnpm test` passou com 598 testes. A compilação registra aviso preexistente de locale pt-BR, usando pt. Produção e regressão visual integral ainda precisam de baseline próprio.
