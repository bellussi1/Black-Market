# Desempenho de navegação e SSR — 18/10/2026

## Ambiente e método

Angular 22.2, API Docker local e PostgreSQL existente, desktop sem throttling de CPU/rede. Chrome DevTools trace real em `localhost:4200`; produção compilada servida temporariamente em 4300 por gateway local, API em 3000 e SSR em 4301. O gateway temporário em `data/audits/performance-preview.mjs` permite atrasar apenas o quadro público em 1.500 ms, para comparar a abertura da mesma rota. Não foi aplicado atraso ao ambiente do usuário, nem removido armazenamento de conta.

Métricas são de laboratório local, com caches e estado explicitados; não representam percentis de usuários reais. “Abrir rota” mede clique até montagem do componente, incluindo skeleton quando há dados pendentes. Não significa que o mercado terminou de responder. SSR mede resposta do documento; mudanças internas de rota usam Angular no navegador.

## Evidência anterior

| Medição                                                 | Resultado                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Home em desenvolvimento, trace de reload                | LCP 300 ms, TTFB 204 ms, CLS 0,01                                           |
| Mercado em desenvolvimento, trace de reload quente      | LCP 431 ms, TTFB 283 ms, CLS 0,00                                           |
| Home → Mercado em desenvolvimento                       | Componente em 401 ms; tarefa longa de 128 ms                                |
| Produção Home → Mercado com quadro atrasado em 1.500 ms | Componente em 1.762 ms; requisição do quadro em 1.615 ms                    |
| Documento SSR de Mercado, produção                      | 453.978 bytes descomprimidos; outra amostra 453.632 caracteres, TTFB 241 ms |
| Hidratação do Mercado em produção                       | Nova requisição do quadro em 117 ms após receber HTML SSR                   |
| Categorias desktop recolhidas                           | 194 botões instanciados sem necessidade inicial                             |

Não foi identificado gargalo geral na API local: amostras de readiness 51 ms, roadmap 8 ms, primeira página de receitas 118 ms. SSR em desenvolvimento teve Home 47 ms, receitas 169 ms e Mercado frio 1.026 ms em outra sequência. A dispersão importa: provedor, caches, compilação e carga da máquina mudam o resultado. Não extrapolar uma amostra quente para uma resposta externa fria.

## Causas e correções

1. Resolvers de rotas aguardavam catálogo/mercado antes de ativar o componente também no navegador. Agora apenas SSR mantém essa espera; as páginas no navegador ativam imediatamente seus loaders existentes. Prefetch por intenção e caches continuam disponíveis. Não criar uma assinatura de background duplicada no resolver.
2. O filtro de HTTP transfer cache excluía o quadro público, levando a uma consulta repetida na hidratação. Além disso, o Angular instalado calcula a chave a partir da URL: SSR serializava uma URL absoluta pública, mas o cliente usava uma relativa. O interceptor apiOriginInterceptor normaliza somente caminhos de API relativos no navegador, antes do cache; mantém URLs absolutas/assets/SSR e a proteção XSRF de mesma origem. Agora inclui somente o caminho exato GET `/api/v1/market/board`, com região/locale/filtros na chave HTTP. Não inclui cotações pessoais, workspace, identidade, requisições com Authorization ou POST. Snapshot mantém timestamp; cache e revalidação normais continuam após hidratação.
3. Os 194 botões de subcategoria eram construídos com `[hidden]`. Container/aria-controls permanecem, mas seus botões são instanciados apenas ao expandir. Subcategoria selecionada mantém a abertura obrigatória. O select móvel conserva todas as opções.
4. HMR de desenvolvimento antecipava dependências de `@defer`, como documentado pelo [Angular](https://angular.dev/errors/NG0751). `serve.options.hmr=false` preserva os gatilhos de lazy loading na sessão local; para preferir atualização parcial durante edição, use `pnpm --filter @bdo/web exec ng serve --hmr`. Isso não altera o bundle de produção.

SSR continua nas páginas públicas e CSR nas áreas pessoais, sem cache público de HTML de conta. SSR e dados de mercado não são sinônimos: uma API externa lenta ainda pode atrasar a primeira resposta SSR de uma página que a consulta. Esta rodada não introduz cache global de HTML nem elimina SSR para ocultar esse custo. A [documentação Angular](https://angular.dev/best-practices/performance/ssr) explica estabilidade e transferência HTTP; as opções específicas foram conferidas via documentação atual e pelo código instalado.

## Consulta competitiva

| Fonte pública consultada                                               | Observação verificável e limite                                                                                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Garmoth Mercado](https://garmoth.com/market)                          | Estrutura, seções e rótulos aparecem sem números na leitura pública inicial. Isso mostra um estado pendente, sem provar SSR/CSR nem desempenho comparável. |
| [BDO Codex Itens](https://bdocodex.com/us/items/)                      | Filtros/tabela e mensagem “Loading data from server” disponíveis. Não inferir algoritmo ou arquitetura a partir disso.                                     |
| [BDOLytics Mercado](https://bdolytics.com/en/SA/market/central-market) | Redireciona para `/en/market`; leitor não retornou conteúdo. Sem números de desempenho verificáveis.                                                       |
| [Workshop](https://bdoworkshop.com/crafting-workshop)                  | Página indisponível pelo leitor nesta consulta. Sem medição confiável.                                                                                     |

Não houve acesso a APIs internas, cópia de dados ou benchmark de fornecedores diferentes como se tivessem o mesmo workload.

## Resultado e limites

| Comparação no build otimizado                             |         Antes |        Depois |
| --------------------------------------------------------- | ------------: | ------------: |
| Montagem do Mercado com atraso controlado de 1.500 ms     |      1.762 ms |         52 ms |
| Requisição do quadro nessa comparação                     |      1.615 ms |      1.636 ms |
| HTML SSR do Mercado descomprimido                         | 453.978 bytes | 244.596 bytes |
| Requisições adicionais de categorias/quadro na hidratação |         1 + 1 |         0 + 0 |
| Botões desktop de subcategorias recolhidas                |           194 |             0 |

A melhoria de abertura é da estrutura/feedback: a cotação ainda espera a API. O documento ficou cerca de 46% menor, mesmo incluindo o quadro no transfer cache. Após expandir a primeira categoria, 25 botões apareceram; o select móvel conservou 213 opções. Em viewport emulada 390×844, largura e scrollWidth foram ambos 390, sem overflow horizontal.

No trace otimizado após reduzir o DOM: Mercado LCP 294 ms, TTFB 157 ms, CLS 0,00. Não comparar como ganho percentual com o trace de desenvolvimento anterior. Três amostras quentes do SSR otimizado deram Home 30–79 ms, Mercado 123–146 ms e receitas 114–126 ms de TTFB. O primeiro acesso após reiniciar o processo foi mais lento (Home 570 ms); não confundir caches quentes com inicialização fria. Trocas internas adicionais chegaram à rota Receitas em 63 ms, Profissões em 61 ms e Home em 53 ms; esse marcador é ativação/navegação, não conclusão de todos os dados.

O teste real final de hidratação em produção confirmou zero consultas repetidas de categorias/quadro, mantendo 20 linhas. Receitas também não repetiu sua leitura pública após SSR. Sem erros no console nessas rotas. Chamadas de identidade/analytics-config/tutoriais continuam separadas e não foram incluídas no cache público.

O bundle inicial passou de 500,75 para 501,04 kB: o pequeno custo de normalização/cache não é uma redução de JS. PERF-01 continua parcial e os budgets não foram ampliados. Ainda há advertências de locale pt-BR/pt e CommonJS do OCR. Compressão e cache no gateway devem ser medidos no ambiente de publicação; o gateway temporário do experimento não aplica gzip e suas medidas são descomprimidas.

Gates, ressalvas de teste e commits em ACTIVE_CONTEXT §186. Preservar o plano visual3 não rastreado. Sem mudanças de banco, seed, credenciais, fórmulas, staging ou publicação externa nesta rodada.
