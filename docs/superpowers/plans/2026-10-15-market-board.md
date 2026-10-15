# Piloto de superfícies semânticas do Mercado — Plano de implementação

> **Para agentes:** execute tarefa a tarefa neste worktree, em sessão, com TDD e commits atômicos.

**Objetivo:** completar no Mercado a referência de preço, a leitura tabular acessível e o fluxo de cotação, mantendo visual desktop-first inspirado nas janelas do BDO e dados inteiramente dinâmicos.

**Arquitetura:** compartilhar uma regra pura para referência (preço corrente com estoque; preço máximo sem estoque; desconhecido quando faltar dado), aplicar a regra à ordenação API/cliente e exibir preço/origem/horário. O quadro usa células reais por coluna; o nome do item é a ação de seleção. O detalhe mantém o SVG atual, mas melhora escala, rótulos e hierarquia usando observações reais.

**Stack:** Angular standalone, NestJS, `@bdo/shared`, Arsha API já integrada, Signals, SCSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-14-semantic-surfaces-market-design.md`.

## Restrições globais

- Não inserir IDs, preços, estoque, demanda, regiões ou métricas fixas como dados de produto.
- `totalTrades` segue rotulado como registros; não tratá-lo como unidades vendidas.
- Sem estoque: usar `maxPrice` fornecido pela origem, se existir; sem dado, mostrar indisponível.
- Respeitar região, catálogo, cotações, cache e rotas atuais.
- Moldura por janela independente; grupos internos por espaço e divisórias discretas; slots/controles mantêm molduras.
- Preservar teclado, foco, tabela alternativa do gráfico e estados de cache/erro/sem histórico.

## Foco de revisão

- Estoque positivo sem preço e estoque zero sem `maxPrice`.
- Cotações resumidas de busca/categoria que não incluem variantes.
- Contador de negociação com cobertura insuficiente ou reiniciado.
- Sort preço nos resultados paginados e em todo o quadro quente.
- Nome de item longo, sem ícone e cotações antigas/desatualizadas.

### Tarefa 1: preço de referência e ordenação

**Arquivos:** `packages/shared/src/market-board.ts` e spec, `apps/api/src/market/market-board.service.ts` e spec, `apps/web/src/app/features/market/market-board.ts` e spec, `market-board.html`, `market-board.scss`, `docs/ACTIVE_CONTEXT.md`.

**Interface:** `marketPriceReference(item) -> { value: string | null; basis: 'current' | 'maximum' | 'unavailable' }`, compartilhada pelo servidor e web.

- [x] Escreva testes para preço corrente, máximo sem estoque, e ausência de preço/estoque.
- [x] Rode-os e observe a falha porque não existe referência compartilhada.
- [x] Use a função no sort por preço da API e da página; preserve máximo fornecido pelo resumo sem criar valores.
- [x] Mostre referência, base, origem e horário da cotação no quadro; mantenha a média de 30 dias como métrica histórica separada.
- [x] Rode testes direcionados e `pnpm check`; atualize handoff e commit `feat(market): show dynamic reference prices`.

### Tarefa 2: tabela e hierarquia visual

**Arquivos:** `apps/web/src/app/features/market/market-board.html`, `market-board.scss`, specs de mercado, `market-page.html`, `market-page.scss`, `docs/ACTIVE_CONTEXT.md`.

- [x] Escreva testes DOM para colunas reais, células associadas, seleção por teclado e estados acessíveis do filtro.
- [x] Rode os testes e confirme falha na estrutura atual de botão/célula `colspan` e filtro sem estado semântico.
- [x] Faça da seleção um botão somente na célula do item e apresente os dados nas células correspondentes aos cabeçalhos.
- [x] Retire molduras internas redundantes no piloto; use espaçamento e divisórias discretas entre grupos.
- [x] Mantenha o gráfico fiel às observações e melhore rótulos de escala/tempo sem interpolar lacunas.
- [x] Coloque cálculo e salvamento de cotação junto do detalhe; salvar não muda de tela, calcular não persiste a cotação.
- [x] Rode testes direcionados, `pnpm check` e `pnpm test`; confira a hierarquia desktop e o foco por teclado. Registro manual de cotação ficou limitado por CORS no servidor temporário, conforme handoff.
- [x] Atualize handoff e commit atômico `fix(market): make board semantic and streamline quote flow`.
