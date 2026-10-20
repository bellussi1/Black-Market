> Snapshot histórico arquivado em 20/10/2026. Não é estado atual nem instrução de execução. Consulte [o índice atual](../../README.md). Links relativos foram ajustados; referências em código continuam relativas à raiz do projeto.

# Arquitetura Angular, estilos e testes

O frontend segue a organização por funcionalidade do [Style Guide do Angular](https://angular.dev/style-guide). Componentes são standalone, páginas usam `loadComponent`, e a detecção de mudanças usa `OnPush`. Bootstrap, providers e rotas permanecem em `main.ts`, `app.config.ts` e `app.routes.ts`.

## Responsabilidades

```text
apps/web/src/
  app/
    core/
      region-preferences.ts       Preferência e resumo regional leve
      workspace-models.ts         Schemas, tipos e estado inicial
      workspace-store.ts          Persistência e recuperação
      catalog-api.service.ts      Acesso HTTP ao catálogo
    features/
      market/
        market-api.ts             Acesso HTTP da funcionalidade
        market-api.spec.ts        Contrato HTTP isolado
        market-page.ts            Estado e ações da página
        market-page.html          Template
        market-page.spec.ts       Interação e renderização
      crafting/ ...               Demais funcionalidades
    shared/                      Componentes, feedback e formatação
    layout/                      Navegação e região global
    testing/                     Helpers exclusivos dos specs
  styles/
    tailwind.css                 Entrada Tailwind/PostCSS e tema
    _tokens.scss                 Paleta compartilhada
    _base.scss                   Base e acessibilidade
    _layout.scss                 Páginas e painéis
    _forms.scss                  Formulários
    _metrics.scss                Indicadores
    _feedback.scss               Avisos e estados
    _tables.scss                 Tabelas
    _controls.scss               Controles reutilizados
    _visualizations.scss         Gráficos e progresso
    _responsive.scss             Ajustes responsivos comuns
  styles.scss                    Composição com @use
```

As regras financeiras ficam em `@bdo/calculators`, compartilhado com NestJS. Componentes coordenam entrada, estado e apresentação; serviços fazem HTTP; o store trata persistência. Schemas e formatação não dependem da classe do store. Arquivos e specs relacionados ficam juntos. Serviços exclusivos ficam na funcionalidade; `core` contém serviços transversais e `shared` contém elementos reutilizados.

Use `inject()`, signals para estado reativo, `computed()` para derivação, inputs/outputs com signals em novos componentes, `@if`/`@for` e bindings de classe/estilo. A aplicação usa o comportamento zoneless do Angular atual. Campos com FormsModule são atualizados por eventos do Angular. Subscriptions e timers devem ser liberados ao destruir componentes. Separe componentes quando tiverem uma responsabilidade própria.

## Tailwind e SCSS

Tailwind 4.3.3 usa `@tailwindcss/postcss`. Sua entrada CSS é processada pelo PostCSS; Sass compila `styles.scss` e estilos locais. Essa separação permite usar ambos sem passar o código Tailwind pelo Sass, considerando a [orientação de compatibilidade do Tailwind](https://tailwindcss.com/docs/compatibility#sass-less-and-stylus). A [documentação Angular](https://angular.dev/guide/tailwind) descreve a integração PostCSS.

Use Tailwind para layout, espaçamento e responsividade. Use SCSS para apresentação dos componentes, regras comuns e tokens. A paleta SCSS gera propriedades `--bm-*`; o `@theme inline` expõe os mesmos valores como utilitários `text-market-accent` e `bg-market-surface`. Classes Tailwind devem aparecer completas nos templates.

Estilos globais semânticos ficam na camada `components`; base e tokens ficam em `base`. A camada `utilities` pode sobrescrevê-los. Estilos locais usam o encapsulamento padrão do Angular. Evite `::ng-deep`, importar Tailwind em cada SCSS e transformar todas as classes em `@apply`.

O CLI gera componentes standalone com SCSS, OnPush e specs:

```powershell
pnpm --filter @bdo/web exec ng generate component features/market/quote-card
```

## Vitest unitário e de componentes

O target `@angular/build:unit-test` usa explicitamente Vitest 4.1.11 com `tsconfig.spec.json`. O builder prepara a compilação Angular e o DOM jsdom conforme a [configuração oficial de testes](https://angular.dev/guide/testing).

```powershell
pnpm --filter @bdo/web test              # Todos os testes do frontend
pnpm --filter @bdo/web test:unit         # Serviços, HTTP e funções puras
pnpm --filter @bdo/web test:components   # Páginas e componentes reutilizados
pnpm --filter @bdo/web test:watch        # Modo interativo
pnpm test                              # Inclui calculadoras e API
```

Specs ficam ao lado do código, com sufixo `.spec.ts`. Testes puros não precisam de TestBed. Serviços com DI usam TestBed; HTTP usa `provideHttpClientTesting` e `HttpTestingController`. Componentes são compilados com templates reais, recebem inputs por `componentRef.setInput`, e verificam DOM e eventos. localStorage é isolado por teste; o teardown destrói componentes e libera subscriptions/timers.

jsdom valida comportamento e templates, mas não mede layout, pixels ou desempenho de um navegador real. CI executa lint, tipos, Vitest, build de produção e verificação de migrations.
