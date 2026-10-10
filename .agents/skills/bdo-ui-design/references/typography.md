# Tipografia

As referências mostram sans estreita, títulos pequenos e números densos. A Pearl Abyss identifica **Strong Sword**, criada com a Yoon Design para coreano e inglês, no [aviso oficial de 25/10/2019](https://blackdesert.pearlabyss.com/GlobalLab/en-US/News/Notice/Detail?_boardNo=6805). Esse aviso não fornece licença de redistribuição pública; a pesquisa realizada em 09/10/2026 não encontrou uma distribuição oficial autorizada para auto-hospedagem. Não extrair nem redistribuir arquivos do jogo. O aviso também não prova qual fonte está presente em cada screenshot ou tradução.

Alternativa adotada: **Barlow Semi Condensed**, uma sans de proporções estreitas que aproxima o ritmo dos menus sem se apresentar como a fonte original. Corpo e títulos usam a mesma família pelos tokens `--bm-font-body` e `--bm-font-display`. Usar peso 400 para leitura, 500/600 para títulos/seleção e 700 para ênfase. A pilha nativa `'Segoe UI', sans-serif` permanece como fallback durante o carregamento.

Os quatro WOFF2 originais são auto-hospedados em `apps/web/public/fonts/barlow-semi-condensed/`, com a licença SIL Open Font License 1.1 em `OFL.txt`. Fonte dos arquivos: [repositório oficial do projeto Barlow, commit dc2940e2e04ef4ec96c07e23e0f02aefbddd343b](https://github.com/jpt/barlow/tree/dc2940e2e04ef4ec96c07e23e0f02aefbddd343b/fonts/woff2), de Jeremy Tribby. Os arquivos completos preservam acentuação portuguesa e outros glifos latinos. `styles/_fonts.scss` declara os pesos com `font-display: swap`; não há chamadas a Google Fonts durante o uso do site.

Tokens sugeridos: corpo 14–16 px, título de página 26–30 px, janela 18–20 px, nome de item 14–16 px, metadata 12–13 px. Line-height 1.35–1.5. Quantidades, preços e percentuais com `font-variant-numeric: tabular-nums`.

Texto completo nos cards. Rótulos curtos podem usar uppercase; não tornar descrições longas em caixa alta. Evitar escala tipográfica de landing page ou títulos serifados dentro de slots e controles.
