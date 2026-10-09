# Tipografia

A família original do BDO não é identificável com segurança apenas nestes screenshots. As referências mostram sans estreita, títulos pequenos e números densos; não justificar uma fonte alegando ser a original.

Alternativa: Barlow Semi Condensed, distribuída pelo [Google Fonts](https://fonts.google.com/specimen/Barlow+Semi+Condensed). Usar peso 400 para leitura e 500/600 para títulos/seleção. Validar acentuação em português. Para evitar nova dependência de rede durante a primeira implementação, a pilha nativa `'Segoe UI', sans-serif` é uma alternativa operacional; Barlow deve ser auto-hospedada com sua licença quando adotada.

Tokens sugeridos: corpo 14–16 px, título de página 26–30 px, janela 18–20 px, nome de item 14–16 px, metadata 12–13 px. Line-height 1.35–1.5. Quantidades, preços e percentuais com `font-variant-numeric: tabular-nums`.

Texto completo nos cards. Rótulos curtos podem usar uppercase; não tornar descrições longas em caixa alta. Evitar escala tipográfica de landing page ou títulos serifados dentro de slots e controles.
