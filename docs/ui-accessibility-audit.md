# UI compartilhada e acessibilidade

Revisão de código em **7 de outubro de 2026**. Escopo: tokens e estilos compartilhados de formulários, ferramentas, métricas, tabelas e mensagens. Não é certificação de conformidade WCAG nem auditoria de todos os componentes.

## Direção visual

Preservar a Home como referência: fundo verde escuro, texto marfim, acento cobre, títulos serifados e organização editorial com espaços para separar conteúdos. As páginas de ferramentas passam a usar a mesma família de títulos, painéis, controles e métricas. Não foram adicionadas fontes externas, bibliotecas de animação ou imagens decorativas.

Skills utilizadas: `frontend-design`, `ui-ux-pro-max` e `web-design-guidelines`. As [guidelines públicas](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) foram consultadas na revisão. O arquivo `scripts` do skill `ui-ux-pro-max` é um ponteiro textual para `../../../src/ui-ux-pro-max/scripts`; o destino está ausente nesta instalação. A geração automática `--design-system` não pôde ser executada. Foram aplicadas as instruções documentadas do skill à identidade existente.

## Medidas de contraste

Cálculo realizado com as cores hexadecimais dos tokens, conversão sRGB para luminância relativa e fórmula `(LmaisClara + 0,05) / (LmaisEscura + 0,05)`. Valores arredondados a duas casas. É uma medição das combinações abaixo, não dos pixels renderizados, overlays, opacidade ou todos os estados das páginas.

| Primeiro plano              | Fundo `#101713` | Painel `#141d18` | Input `#0f1712` | Painel elevado `#20291d` |
| --------------------------- | --------------- | ---------------- | --------------- | ------------------------ |
| Texto `#eee9db`             | 15,00:1         | 14,21:1          | 15,03:1         | 12,40:1                  |
| Texto secundário `#aab5a3`  | 8,53:1          | 8,08:1           | 8,55:1          | 7,05:1                   |
| Acento `#d6a577`            | 8,24:1          | 7,80:1           | 8,26:1          | 6,81:1                   |
| Borda de controle `#7c8c7a` | 5,10:1          | 4,83:1           | 5,11:1          | 4,22:1                   |
| Foco `#e5b47c`              | 9,66:1          | 9,15:1           | 9,68:1          | 7,99:1                   |
| Erro `#edafa0`              | 9,74:1          | 9,22:1           | 9,76:1          | 8,05:1                   |
| Sucesso `#b8d5a6`           | 11,36:1         | 10,75:1          | 11,38:1         | 9,39:1                   |

As combinações de texto medidas excedem 4,5:1; bordas de controles excedem 3:1 contra essas superfícies. Bordas estruturais decorativas usam outro token e não são usadas para identificar inputs ou botões. Estados desabilitados têm opacidade reduzida e não estão incluídos nessa afirmação. Erro/sucesso precisam continuar acompanhados de texto ou símbolo compreensível, sem depender apenas da cor.

## Alterações implementadas

- `_tokens.scss`: fontes de corpo/títulos e tokens distintos para borda decorativa, borda de controle, foco e painel elevado.
- `_base.scss`: corpo de 16px e entrelinha 1,6; foco de 3px para links/botões/summary/elementos com tabindex; títulos com quebra balanceada; parágrafos com quebra adequada; âncoras com margem para cabeçalho; preferência por redução de movimento também limita repetição de animações.
- `_layout.scss`: títulos serifados compartilhados, descrições de 16px com largura de leitura até 68 caracteres, painéis e cabeçalhos que permitem quebra em telas estreitas.
- `_forms.scss`: inputs/selects/textareas de 16px, bordas contrastantes e placeholders legíveis; botões e labels de checkbox com mínimo declarado de 44px nos alvos; erro e ação secundária mais visíveis.
- `_controls.scss`: tabs de pelo menos 44px, estado hover/ativo reconhecível, textos auxiliares e badges maiores.
- `_tables.scss`: texto de 14px no desktop, cabeçalhos com quebra, números tabulares/alinhados e células capazes de quebrar conteúdos longos. Wrappers de rolagem existentes foram preservados.
- `_feedback.scss`: mensagens de 16px, links de ajuda sublinhados e borda de erro visível.
- `_metrics.scss`: títulos e descrições de métricas maiores, fundo elevado compartilhado e números tabulares também nas métricas em destaque.
- `_responsive.scss`: até 600px, corpo de controles/ajudas/tabelas/métricas de 16px, formulários e métricas em uma coluna, ações e tabs flexíveis.

## Verificações e limites

Foram lidos os estilos, a referência visual em código da Home e os wrappers de tabelas. Foram calculados os contrastes acima. Nenhum teste unitário novo foi criado nem executado nesta revisão. A validação de build/lint é consolidada na entrega da tarefa principal.

Não houve inspeção visual no navegador: a automação de localhost foi bloqueada nesta sessão, e a restrição não foi contornada. Permanecem necessários revisão humana em 320/375/768/1024/1440px, zoom de 200%/400%, teclado, leitor de tela e dispositivos de toque. O tamanho CSS declarado de um alvo não comprova ausência de sobreposição ou espaçamento suficiente quando renderizado.

## Pendências fora do escopo dos estilos

- Componentes com SCSS próprio, incluindo Home e catálogo, podem sobrescrever tamanho, cor e regras compartilhadas; revisar suas combinações renderizadas separadamente.
- A associação entre labels/inputs, nomes de botões de ícone, ordem dos títulos, anúncios de carregamento/erro e navegação de teclado depende dos templates. CSS não corrige semântica ou ARIA.
- Tabelas extensas precisam manter cabeçalhos semânticos e área de rolagem alcançável por teclado; avaliar foco e nome acessível por componente.
- Reservar dimensões de imagens e anúncios, prevenir CLS e não cobrir conteúdo/foco com publicidade. A decisão de anúncios deve preservar controles, tabelas e experiência mobile.
- SSR/prerender, metadados, canonical, dados estruturados, sitemap, robots, cache e política de crawlers precisam de revisão independente. Boa legibilidade ajuda compreensão, mas não comprova SEO/GEO/AEO ou inclusão em respostas de buscadores.
- Catálogos grandes requerem paginação/virtualização e carregamento apropriado de imagens. Esta alteração de estilos não mede LCP, INP, CLS nem substitui análise de desempenho em produção.

## Localização dos pontos de revisão

Formato de achados do skill: `arquivo:linha`.

- `apps/web/src/styles/_tokens.scss:1` — contrastes documentados para tokens; não extrapolar para componentes com cores próprias.
- `apps/web/src/styles/_base.scss:1` — foco e redução de movimento compartilhados; navegação real com teclado não verificada.
- `apps/web/src/styles/_forms.scss:1` — controles maiores e bordas corrigidas; verificar associação semântica e mensagens de validação nos templates.
- `apps/web/src/styles/_tables.scss:1` — leitura e quebra melhoradas; responsividade real e semântica das tabelas precisam de inspeção por página.
- `apps/web/src/styles/_responsive.scss:1` — adaptação mobile declarada em código; inspeção visual pendente.
