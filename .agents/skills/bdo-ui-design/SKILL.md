---
name: bdo-ui-design
description: Construir e revisar interfaces do Black Market inspiradas nos menus de Black Desert Online, incluindo receitas, inventário, mercado e árvores de crafting. Usar nas alterações de UI deste projeto; não generalizar o tema para outros produtos.
---

# Black Market · BDO UI

Use as imagens em `assets/` como referência primária. Preserve a densidade e o material visual do jogo, adaptando contraste, alvos de toque e navegação à web. Não identifique a fonte original sem evidência.

## Decisões essenciais

- Painéis de carvão neutro, bordas finas, barras de título bronze e controles retangulares. Ouro indica contexto e seleção; não colore todo o texto.
- Ícones reais do catálogo em slots reservados de 44 × 44 px, no máximo 48 × 48 px, `object-fit: contain`. Não usar imagens de menus como fundo de interface.
- Conteúdo legível determina a altura do card. Não cortar nomes com line-clamp; quebrar texto e medir o card antes de calcular conexões.
- Títulos de janelas usam uma sans discreta; não impor serifas decorativas aos controles de crafting.
- Modo simples mostra produto, quantidade, materiais, origens e custo conhecido. Modo avançado revela opções existentes sem desmontar o grafo ou perder escolhas.
- Dados não conhecidos continuam identificados como ausentes. Não presumir rendimentos, preços, origens ou qualidade de itens por estética.
- Unificar fórmulas do mesmo produto que diferem apenas por ingredientes substituíveis. Elixires com adjetivos de qualidade e carnes/sangues de um mesmo grupo são escolhas de ingrediente, não receitas independentes. Preservar IDs, estoques e proporções de substituição (como 3 comuns para 1 superior). Confirmar equivalências pelas fórmulas do catálogo; não considerar toda carne ou todo sangue intercambiável. Ver [Equivalências](references/recipe-equivalences.md).
- Posições, seleção, expansão e viewport são estados separados. Expandir não significa recentralizar.

## Referências por tarefa

- [Princípios](references/design-principles.md): escopo e arquitetura visual.
- [Paleta](references/color-palette.md): tokens semânticos e cores propostas.
- [Tipografia](references/typography.md): escolha de fonte e hierarquia.
- [Componentes](references/components.md): slots, barras, cards, inputs e feedback.
- [Interações](references/interaction-patterns.md): divulgação progressiva e estados.
- [Crafting tree](references/crafting-tree.md): zoom, pan, medição e estabilidade.
- [Acessibilidade](references/accessibility.md): foco, teclado, contraste e movimento.
- [Imagens](references/visual-references.md): identificação das 16 referências.

## Antes de entregar

Validar no navegador o conteúdo mais longo, expansão de vários níveis, scroll com cursor fora do centro, pan após zoom, teclado e largura móvel. Usar os testes existentes de receitas para preservar cálculo, estoque e alternativas. Documentar as limitações verificadas; imagem bonita não prova funcionamento.
