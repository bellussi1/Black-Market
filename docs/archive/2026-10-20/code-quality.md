> Snapshot histórico arquivado em 20/10/2026. Não é estado atual nem instrução de execução. Consulte [o índice atual](../../README.md). Links relativos foram ajustados; referências em código continuam relativas à raiz do projeto.

# Lint e organização do código

## Ferramentas

- ESLint 10.12.0: regras de código no frontend, API e pacotes compartilhados.
- angular-eslint 22.5.0: regras Angular e acessibilidade em templates externos e inline.
- typescript-eslint 8.71.1: regras TypeScript; a API também usa análise baseada em tipos.
- simple-import-sort: organização automática de imports e exports.
- unused-imports: detecção e remoção automática de imports sem uso.
- Prettier 3.8.1: formatação de TypeScript, templates Angular, SCSS/CSS, JSON, YAML e Markdown.

Escolhemos ESLint/angular-eslint pela cobertura específica de Angular, incluindo seus templates e convenções. O Biome tem formatação HTML experimental e suporte a SCSS ainda incompleto conforme sua [matriz oficial de linguagens](https://biomejs.dev/introduction/language-support/). Usamos Prettier como comando separado do lint, seguindo sua [orientação de integração](https://prettier.io/docs/integrating-with-linters).

## Comandos

```powershell
pnpm lint           # Código, imports, regras Angular e acessibilidade
pnpm lint:fix       # Correções automáticas disponíveis; erros restantes precisam de revisão
pnpm format         # Aplica a formatação padrão
pnpm format:check   # Confere a formatação sem editar arquivos
pnpm check          # Lint + formatação + verificação de tipos

pnpm --filter @bdo/web exec ng lint
pnpm --filter @bdo/web exec ng lint --fix
```

Depois de aplicar `lint:fix`, execute `format` e `check`. Algumas correções de imports alteram suas quebras de linha, então essa ordem evita disputas entre organização e formatação. Testes continuam disponíveis em seus comandos próprios.

## Regras e alcance

`config/eslint-shared.mjs` concentra regras comuns. `eslint.config.mjs` na raiz cobre fontes e configurações dos pacotes e configurações JavaScript da raiz. Cada aplicação mantém sua configuração específica: Angular no frontend; Node/NestJS com análise de tipos na API.

Imports e exports devem estar ordenados. Imports sem uso, `any` explícito, variáveis sem uso, `var` e comparações frouxas são rejeitados. Imports exclusivamente de tipos usam `import type`; o typescript-eslint considera os metadados de decorators ao analisar arquivos NestJS. Parâmetros intencionalmente não utilizados podem começar com `_`.

O Angular exige prefixo `app`, componentes OnPush, injeção por `inject()` e controle de fluxo atual nos templates. As regras de acessibilidade incluem rótulos e interação por teclado. Uma regra de imports impede que o frontend importe `@bdo/database` ou arquivos da API/infraestrutura PostgreSQL diretamente; a comunicação passa pela API e contratos compartilhados.

Na API, promises sem tratamento e argumentos de tipo inseguro são erros. Os pacotes necessários são compilados antes do lint da API para que a análise encontre suas declarações em uma instalação limpa. Todos os comandos ESLint exigem zero warnings.

Prettier define largura de 100 colunas, aspas simples, vírgulas finais e LF. `.editorconfig` aplica UTF-8, dois espaços e LF; `.gitattributes` normaliza texto no Git. Os estilos SCSS são formatados pelo Prettier, sem um linter semântico de estilos nesta configuração.

Dependências, build, cache, coverage, migrations geradas, extrações locais e arquivos de ambiente são excluídos quando aplicável. Excluir arquivos gerados evita alterar dados de migration ou arquivos do jogo ao executar `format`.

## CI

A CI verifica instalação pelo lockfile, lint, formatação, tipos, testes Vitest, build e migrations. `lint` e `format:check` apenas verificam arquivos. Configurações são versionadas para manter o mesmo resultado no editor, desenvolvimento e CI. Supressões de regras devem ser locais, justificadas e revisadas; não desative uma regra globalmente apenas para ocultar um erro.
