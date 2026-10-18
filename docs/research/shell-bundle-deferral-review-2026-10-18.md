# Redução do bundle inicial do shell — 18/10/2026

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
