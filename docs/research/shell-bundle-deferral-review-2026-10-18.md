# Redução do bundle inicial do shell — 18/10/2026

Estado mais recente: [continuação de 20/10/2026](#continuação-de-20102026--entrypoints-e-css-sem-consumidores). As medições abaixo conservam suas datas.

## Escopo e resultado local

Esta fatia reduz o JavaScript carregado na abertura do shell, preservando as rotas e os controles existentes. O menu e a barra superior usam os estilos locais que já definiam sua aparência; as preferências de privacidade só carregam quando há uma escolha necessária ou quando a pessoa abre o painel pelo rodapé.

Build Angular de produção com `ng build --stats-json`, analisado pelo metafile do esbuild:

| Medida                 |     Antes |    Depois |  Variação |
| ---------------------- | --------: | --------: | --------: |
| Bundle inicial bruto   | 546,01 kB | 503,18 kB | −42,83 kB |
| Transferência estimada | 146,65 kB | 135,20 kB | −11,45 kB |

O import de `tailwind-merge` deixou o grafo inicial e continua disponível nos componentes que o usam em rotas carregadas sob demanda. O painel de privacidade também passou a ser carregado sob demanda. O limite Angular continua em 500 kB: o bundle ficou 3,18 kB acima do aviso. Nenhum budget foi elevado. Os avisos de locale `pt-BR` usando dados `pt` e de CommonJS do OCR são independentes.

## Pesquisa pública

Consulta em 18/10/2026, restrita às páginas públicas. Nenhuma fórmula, estatística de mercado, imagem ou dataset concorrente foi usado.

| Fonte                                    | Observação pública                                                                                            | Limite desta consulta                                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/) | A página pública descreve ferramentas de gear, crafting, mercado e leitura de capturas.                       | A própria página informa que as ferramentas exigem JavaScript; a navegação interna não pôde ser observada pelo leitor de páginas. Sem equivalente verificável para carregamento sob demanda do shell. |
| [BDO Codex](https://bdocodex.com/us/)    | Página inicial consultada.                                                                                    | O acesso público desta consulta foi bloqueado pelo leitor; fluxo não verificado.                                                                                                                      |
| [BDOLytics](https://bdolytics.com/)      | A página redirecionou para `/en`.                                                                             | O leitor retornou conteúdo vazio; navegação não verificada.                                                                                                                                           |
| [Garmoth](https://garmoth.com/)          | A página pública organiza ferramentas sob grupos como Market, Enhancing, Tools, Grind Tracker e Gear Planner. | Observação da navegação pública; nenhum mecanismo de deferimento do shell ou equivalente de preferências foi identificado.                                                                            |

A comparação não permite concluir como os concorrentes carregam seus módulos. Ela serviu apenas para verificar que grupos de ferramentas são uma organização pública comum; a mudança de desempenho foi baseada no grafo de dependências local.

## Verificação e continuidade

- Testes focados do layout e do rodapé: 16/16.
- `pnpm check`, `pnpm test` e build serial do monorepo passaram; `pnpm test:ssr` passou.
- A suíte completa contabilizou 1.153 aprovados e um teste PostgreSQL descartável ignorado. Executada em Node 24.21.0.
- Inspeção visual em `/recipes` em desktop e 390×844 conferiu shell, navegação e seletor de região sem overflow horizontal. Testes cobriram painel de privacidade por escolha inicial e abertura pelo rodapé.
- O dev server local informou `NG0751`: HMR carrega dependências `@defer` eager durante o desenvolvimento. A separação foi confirmada no grafo do build de produção; o navegador local não serviu como prova de rede lazy.

**Próximo passo:** continuar medindo cortes seguros até ficar abaixo de 500 kB; não alterar o budget nem remover controles do MVP para atingir a meta.

## Snapshot após agrupar a navegação — 18/10/2026

O build serial de produção posterior ao refactor de navegação reportou bundle inicial de **501,70 kB** e transferência estimada de **134,99 kB**. São 1,48 kB a menos que o snapshot anterior deste relatório; o bundle permanece 1,70 kB acima do aviso de 500 kB. A compilação isolada confirma o tamanho atual, mas não atribui toda a diferença a uma dependência específica. Nenhum budget foi elevado. A alteração de navegação e seu QA estão descritos em [`mvp-navigation-refactor-review-2026-10-18.md`](mvp-navigation-refactor-review-2026-10-18.md) e ACTIVE_CONTEXT §164.

## Snapshot após filtragem dos ícones do shell MVP — 18/10/2026

O build de produção serial com `ng build --stats-json` ficou em **499,47 kB** de bundle inicial e **134,68 kB** estimados em transferência. Em relação ao snapshot anterior, a redução foi de 2,23 kB bruto e 0,31 kB transferidos; em relação aos 546,01 kB iniciais, a redução acumulada é 46,54 kB. O shell registra apenas os ícones presentes na navegação MVP quando `SCREENSHOT_MVP` está ativo e mantém o registro completo na configuração alternativa. Um ícone não usado foi removido. O orçamento continua em 500 kB e não foi alterado; a build deixou de emitir o aviso de tamanho inicial. O módulo do registry Lucide caiu de 14,87 kB para 13,09 kB; CSS permaneceu em 57,44 kB. Avisos de fallback de locale `pt-BR`→`pt` e CommonJS do Tesseract continuam independentes.

O teste focado do layout passou 15/15; `pnpm check`, build de produção, `pnpm test:ssr` e a suíte integral (1.154 aprovados/1 ignorado) passaram. Playwright CLI em 390×844 confirmou largura sem overflow e renderização de todos os ícones do menu. O detalhe do código está no commit `4366417` e ACTIVE_CONTEXT §165.

**Próximo passo:** acompanhar o bundle em mudanças do shell e evitar regressão acima de 500 kB; não alterar o budget nem remover controles do MVP para atingir a meta.

## Snapshot após alterações de SEO e aviso de independência — 18/10/2026

Build Angular de produção serial com `ng build --stats-json`: bundle inicial **500,82 kB**, transferência estimada **135,16 kB**. O aviso de 500 kB permanece excedido por 819 bytes; o budget não foi alterado. O grafo segue concentrado no router Angular (85,72 kB do chunk principal), shell/layout (31,37 kB), registry Lucide (13,11 kB) e serviços compartilhados. Não foi removido controle nem recurso para forçar o limite. Locale `pt-BR`→`pt` e CommonJS do Tesseract permanecem avisos separados.

## Snapshot após remoção de dados de locale redundantes — 18/10/2026

O metafile de `ng build --stats-json` mostrou `@angular/common/locales/pt` no bundle `main` por causa do registro global `registerLocaleData(pt, 'pt-BR')`. O build também carrega os dados globais de `pt` nos polyfills e emite aviso de fallback `pt-BR`→`pt`; o produto usa `DecimalPipe` somente no importador de captura, que é lazy. A retirada do registro eager reduziu o bundle inicial de **501,06 kB/135,31 kB** para **499,60 kB/134,70 kB** (bruto/transferência estimada), corte de 1,46 kB e 0,61 kB, respectivamente. A medida ficou abaixo do aviso de 500 kB, sem mudar o budget ou remover funcionalidades. A spec focal confirma `DecimalPipe('pt-BR')` para `1.234,5`; build de produção, `pnpm check` e `pnpm test:ssr` passaram. Os avisos de fallback de locale e CommonJS do Tesseract continuam independentes.

O código está no commit `bb5bd64`; a documentação de continuidade e do checklist fica em commit separado. A suíte integral de 1.209 aprovados/1 ignorado pertence à alteração anterior de privacidade; a otimização teve spec focal 6/6 e não repetiu a suíte integral.

## Snapshot após containers e transições de rota — 18/10/2026

O build Angular final após a rodada de UI mediu **503,37 kB** brutos e **135,47 kB** estimados em transferência. O aviso inicial de 500 kB voltou a ser excedido, em 3,37 kB; PERF-01 foi reaberto no checklist, sem elevar budgets. Não foi atribuído todo o delta a uma dependência isolada sem novo metafile; a rodada incorpora transições do Router e estilos globais. O primeiro build indicou CSS da árvore em 16,21 kB; substituir o estilo dos botões de cenário por utilitários eliminou esse aviso na medição final. Ver ACTIVE_CONTEXT §183 para testes e alcance.

## Snapshot após separar bootstrap de analytics — 18/10/2026

O `main` incluía analytics por dois caminhos: inicialização da raiz e o classificador importado pelos logs operacionais. A raiz passou a usar import dinâmico após renderização; o classificador puro foi movido para um módulo independente. Build medido de **500,75 kB/134,88 kB** (bruto/transferência) contra **503,37/135,47 kB** anteriores. Continua acima do aviso de 500 kB; budget preservado. O registro de tutoriais permanece no `main` devido ao grafo do pacote compartilhado, e uma experiência de anotações de pureza não reduziu o inicial e foi revertida. Não afirmar lazy-loading integral de tutoriais nem PERF-01 concluído. Próxima investigação: consumidores e entrypoints do pacote compartilhado, antes de alterar a arquitetura.

## Continuação de 20/10/2026 — entrypoints e CSS sem consumidores

Retomada de PERF-01 no checkout `codex/ui-ux-audit-completion`. Produção com o mesmo budget e `--stats-json`: **504,83 → 499,84 kB iniciais**, transferência estimada **135,52 → 134,98 kB**. O aviso inicial desapareceu; a margem é de apenas cerca de 160 bytes. Isso mede artefatos, não tempo de navegação ou Core Web Vitals.

O metafile confirmou que tutoriais e perfis sintéticos não pertencem mais ao grafo inicial. A [arquitetura](../architecture.md) registra os entrypoints focados; a entrada geral e os consumidores explícitos continuam funcionando. Quatro regressões de empacotamento verificam import mínimo, fronteira dinâmica, resolução Node e as 27 telas/âncoras dos tutoriais. O caso mínimo falhou antes e passou depois. A revisão independente não encontrou problemas nos exports ou efeitos de inicialização.

Também foram removidos o registro não utilizado de `lucideCompass` no MVP (alternativa completa preservada) e seletores sem consumidores: `.bdo-window`, `.bdo-meter`, `.bdo-meter-fill`, `.item-description-panel`, `.player-workbench` e `.market-item-name`, incluindo a referência responsiva. Nenhum controle ou token ativo foi removido. O teste existente do menu agora confere que os ícones visíveis têm SVG. Adiar os slots de publicidade foi medido, não compensou em transferência e foi revertido; não faz parte da entrega.

`pnpm check` e `pnpm test` passaram: 1.304 aprovados/1 ignorado (78 Calculators, 270 API +1 ignorado, 871 Web, 85 scripts). Produção foi reconstruída após o check (que gera desenvolvimento); a repetição final de SSR sobre produção também passou. O metafile final confirmou 499.842 bytes iniciais e ausência dos módulos de tutoriais/perfis sintéticos nesse grafo. Código dos entrypoints em `c79f963`; limpeza/estado em commit próprio. Avisos independentes permanecem nos estilos da árvore (19,06 kB), catálogo (16,03 kB), fallback de locale e CommonJS do OCR. Sem alteração de banco, sessão real, serviços existentes, push, merge ou deploy.

### Continuação na main publicada — 20/10/2026

A entrega até `054f865` foi integrada por fast-forward e enviada para `origin/main`. A pasta principal em `main` agora alimenta Web 4200 e API 3000, ambos em watch; regras de operação em [desenvolvimento](../development.md#prévia-visual-de-referência). O plano local divergente foi preservado em `tmp`, com hash conferido, e a imagem não rastreada permaneceu intacta.

Limpeza seguinte: 25 declarações anteriores sobrescritas pelo mesmo seletor/contexto, dois seletores mortos da árvore e breadcrumb/emblemas sem consumidores do catálogo. Sass/PostCSS confirmou valores finais por seletor/contexto idênticos para os estilos usados, e a revisão independente não encontrou problemas de cascata, shorthand ou condições responsivas. A primeira tentativa de simplificação foi rejeitada pela comparação por incluir um bloco agrupado; corrigida antes dos gates finais. Baselines e auditoria temporários ficam em `tmp/css-audit/`, fora do Git.

Receitas conferidas no navegador em 1920, 1366 e 390 px, sem overflow horizontal ou pageerror; nenhuma escrita pessoal foi realizada. O aviso de tamanho do catálogo desapareceu. Árvore: **19,06 → 18,27 kB**, ainda acima do aviso de 16 kB; não aumentar o budget para esconder a pendência. Bundle inicial final **499,84 kB / 135,00 kB** de transferência estimada. Locale e CommonJS do OCR continuam independentes.

`pnpm check`, `pnpm test` (1.304 aprovados/1 ignorado), produção com stats e `pnpm test:ssr` passaram na pasta principal. Frontend e readiness da API responderam HTTP 200 após os gates. Nenhuma migration, seed ou atualização de staging. Logs ignorados: `main-final-{check,test,production,ssr}.log`.
