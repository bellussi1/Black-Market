# Ficha compacta de item na árvore de receitas

**Consulta:** 18/10/2026 · páginas públicas, sem login ou contorno de controles. A captura do tooltip de Black Desert fornecida pelo usuário é a referência visual principal.

## Problema e comportamento local

Na árvore visual, o ícone de informação emitia a mesma ação de “Detalhes e origem”. Isso abria a ficha completa do item, com métodos, origens, estoque, mercado e histórico. Para uma consulta rápida do tooltip do jogo, esse conteúdo ocupava espaço e interrompia a leitura da árvore.

A ação foi separada. O ícone agora abre uma ficha pequena, modeless e ancorada ao nó no canvas. Ela acompanha pan/zoom da árvore e permanece no fluxo da página, sem `position: fixed` nem fundo bloqueante. A ficha usa nome, ícone, raridade, categoria, peso e descrição já localizados no catálogo; mostra até três linhas inicialmente e permite revelar o restante. Dados desconhecidos continuam ausentes. “Detalhes e origem” preserva a ficha completa com suas ações e dados adicionais.

O componente usa a mesma função segura de interpretação da descrição do catálogo que `ItemDossier`: markup e cores conhecidas viram texto/segmentos sem renderizar HTML fornecido pelo catálogo. O carregamento consulta somente o item, não origens, receitas relacionadas ou histórico de mercado.

## Superfícies públicas consultadas

| Fonte                                                                         | Página/estado observado em 18/10/2026                                                                                                                                                                          | Relevância e limite                                                                                                                       |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop — Crafting Workshop](https://bdoworkshop.com/crafting-workshop) | A ferramenta de consulta retornou URL inacessível.                                                                                                                                                             | Nenhuma ficha de item pôde ser observada nesta sessão. Não inferir que a função inexiste.                                                 |
| [BDO Codex — itens](https://bdocodex.com/us/items/)                           | A ferramenta recusou a busca direta como URL restrita.                                                                                                                                                         | Consulta não repetida por endpoints alternativos. A captura do jogo enviada pelo usuário é a evidência visual do tooltip.                 |
| [BDOLytics — Alchemy](https://bdolytics.com/en/alchemy)                       | A página pública abriu, mas não retornou conteúdo textual na ferramenta.                                                                                                                                       | Não foi possível avaliar uma ficha resumida de item nessa superfície.                                                                     |
| [Garmoth — Garmoth’s Scale](https://garmoth.com/market/item/9768/0)           | A página pública exibe item/ID, região EU, janela de 180 dias, preço, estoque, variação semanal, média diária, total vendido, última venda e order book. Parte dos valores está ausente ou zerada no snapshot. | É uma ficha de mercado, não um tooltip de descrição do jogo. A UI separa métricas e região; nenhum valor foi copiado para o Black Market. |

## Decisões e cobertura

- A informação rápida usa diálogo modeless (`aria-modal=false`) com posição absoluta dentro do viewport da árvore; seu posicionamento é recalculado quando o nó se move ou o viewport redimensiona. O cartão não captura eventos de pan no próprio conteúdo.
- Escape e o botão de fechar encerram a ficha e devolvem o foco ao ícone. Loading é anunciado; erros não inventam descrição ou propriedades.
- A descrição completa permanece recolhida inicialmente. A ficha não duplica preço, estoque, receitas relacionadas ou locais; estes continuam no fluxo completo de “Detalhes e origem”.
- Os testes usam itens sintéticos apenas como fixture, sem alterar dados de produção. Nenhum cálculo, snapshot de preço, arquivo de catálogo ou seed foi modificado.

## Revisão da aba “Etapas expansíveis”

A leitura estática de `recipe-tree.html` e `recipe-branch.html` confirma que a aba mantém um botão de expansão por etapa, contagem/estoque visíveis, controles de método/lote e configurações secundárias, além de expansão/recolhimento em lote. A árvore também usa animações de entrada/saída reduzidas por `prefers-reduced-motion`.

Uma próxima revisão visual pode testar uma linha de resumo mais escaneável por etapa (ícone e nome, tipo de produção, quantidade requerida e faltante) e manter lote, rendimento raro e outros ajustes dentro do detalhe expandido. A hierarquia e o comportamento atuais foram preservados neste escopo; uma alteração da própria aba precisa passar por avaliação de layout em desktop e telas estreitas.

## Validação

Os testes cobrem saída compacta, descrição completa sob demanda, peso zero, estado de carregamento, ausência de `fixed`, ação separada da ficha completa e retorno de foco. `pnpm check`, `pnpm test`, build serial e `pnpm test:ssr` passaram. A suíte totalizou 1.162 aprovações e 1 teste ignorado por depender de PostgreSQL descartável; build inicial 499,40 kB/134,67 kB transferidos. Captura visual em localhost não foi realizada porque o navegador integrado recusou acesso; essa limitação e os avisos conhecidos de locale/CommonJS estão em `docs/ACTIVE_CONTEXT.md` §167.
