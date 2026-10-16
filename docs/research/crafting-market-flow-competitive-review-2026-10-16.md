# Revisão competitiva — fluxo de Crafting e Mercado

**Consulta:** 16/10/2026 · superfícies públicas, sem login, scraping de endpoints privados ou contorno de controles.

Esta nota cobre a clareza dos fluxos `/crafting` e `/market`. Observações de interface ajudam a decidir hierarquia e próximos passos; não demonstram fórmulas internas nem garantem venda, liquidez ou volume.

## Referências públicas consultadas

| Fonte                                                                                                                                             | Observação nesta consulta                                                                                                                                                                                                                                                                                                                  | Limites                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop — Crafting Workshop](https://bdoworkshop.com/crafting-workshop) e [plano 9601](https://bdoworkshop.com/crafting-workshop/plan/9601) | A abertura direta não ficou acessível pela ferramenta nesta sessão. A captura de tela enviada pelo usuário e as auditorias já registradas no projeto mostram uma oficina com produto, quantidade, maestrias, cadeia, valor após imposto, materiais, tempo, lucro/lucro por hora e estratégias `Buy all`, `Craft all` e `Best profit/hour`. | Essa evidência visual é histórica. Não revalidei o estado atual do plano nem sua fórmula nesta sessão. Os resultados dependem de região, preços, estoque, tempo e escolhas e não foram copiados para o Black Market.                    |
| [BDO Codex — lista de receitas](https://bdocodex.com/us/mrecipes/) e [lista geral](https://bdocodex.com/us/recipes/)                              | A superfície pública/indexada apresenta filtros e uma tabela relacional com ID, nome, tipo, nível de profissão, materiais, peso e produtos. Páginas de item também expõem usos, relações de receita, imagem e preços do jogo.                                                                                                              | A abertura direta da lista foi bloqueada pela ferramenta nesta consulta. A evidência descreve catálogo e relações, não uma calculadora de cadeia com escolha de compra/produção nem uma fonte autorizada para os nossos preços.         |
| [BDOLytics — calculadora de Alquimia](https://bdolytics.com/en/alchemy)                                                                           | A lista indexada separa Culinária, Alquimia e Processamento, permite filtros de prata/hora e volume médio diário, e mostra receita, entrada, preço, volume médio de 14 dias e experiência.                                                                                                                                                 | A página direta abriu sem conteúdo textual extraível; os detalhes vieram da superfície pública indexada. A região mostrada no resultado foi North America. Não usei snapshots como preço ou benchmark do produto.                       |
| [Garmoth — ferramentas](https://garmoth.com/tools)                                                                                                | A página abriu e lista Central Market, Market Alerts, Imperial Delivery, biblioteca de trocas, ferramentas de maestria, grind tracker e gear planner. Há módulos úteis para tarefas específicas.                                                                                                                                           | A página de ferramentas não apresentou um planejador público geral de cadeia de crafting. Isso é ausência na superfície consultada, não afirmação de inexistência em todo o site. Os módulos de mercado não provam fórmula ou liquidez. |

## Direção adotada no Black Market

- `/recipes` continua sendo a área de descoberta de catálogo e planejamento da árvore.
- `/crafting` passa a abrir na oficina de uma receita: escolhe o produto, fórmula e lote e reutiliza a árvore/planner já existente para avaliar recursos e aquisição. Os modos de simulação manual e biblioteca própria permanecem acessíveis; os registros existentes não são migrados ou apagados.
- `/market` mantém a busca/tabela, detalhes e histórico, simulação de venda e cotações pessoais. Os rótulos agora descrevem cada espaço; o detalhe deixa explícitas origem, região, horário e natureza estimada do valor líquido, além de conectar o item a Receitas e Oficina.
- Cotações pessoais continuam salvas no workspace e filtradas pela região ativa. As ações `Calcular`, favorito e exclusão permanecem; itens catalogados também têm atalhos para Receitas e Oficina.
- Contagem acumulada de negociações continua sendo atividade observada. Ela não é apresentada como unidade vendida, liquidez ou prazo de escoamento.

## Cache, premissas e limites

- O cache local de cotações tem TTL de **5 minutos** (`DEFAULT_MARKET_CACHE_TTL_MS`). O provedor pode informar cache upstream de até 30 minutos. Um registro recém-inserido no cache local pode, portanto, refletir uma observação mais velha; idade local não é a idade da origem.
- No preenchimento da simulação manual, o Mercado da região ativa é usado apenas se o registro local ainda estiver dentro do TTL; depois, a cotação pessoal existente serve como fallback e pode estar desatualizada. A tela orienta a conferir origem e horário no Mercado. A oficina principal usa a árvore e os fluxos de preço existentes.
- O `getCachedQuote()` do cache retorna entradas sem verificar `expiresAt` apesar da descrição do método dizer “unexpired”. O preenchimento de Crafting evita essa discrepância consultando `getCachedQuoteEntry()` e validando a expiração, sem alterar semântica global do cache.
- A API preserva `cacheStatus`, região e `fetchedAt` para a consulta de detalhe; a entrada individual do cache local não guarda `cacheStatus` upstream. Esse contrato não foi ampliado nesta frente porque exigiria mudança de modelo e testes no serviço compartilhado.
- Não foi feita comparação matemática pareada com concorrentes nesta revisão. Nenhuma fórmula, preço, quantidade de mercado ou receita concorrente foi importada para o código.

## Fontes de código verificadas

- `apps/web/src/app/features/crafting/crafting-page.ts` e `crafting-page.html` — seleção de produto, cache de cotações, tabs manual/receitas e árvore `RecipeTree`.
- `apps/web/src/app/features/market/market-page.ts` e `market-page.html` — origem/frescor, cálculo de venda, fluxo de cotações pessoais, navegação para Receitas e Oficina.
- `apps/web/src/app/core/market-cache.service.ts` — TTL de 5 minutos e cache de consultas individuais.

## Verificação desta frente

- `pnpm --filter @bdo/web typecheck` — passou em 16/10/2026.
- Testes focados de `crafting-page.spec.ts` e `market-page.spec.ts` — 14 testes passaram em 16/10/2026.
- O build ainda apresenta o aviso já existente de locale: `pt-BR` recai para `pt`.
