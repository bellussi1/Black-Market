# Crafting: expansão completa e layout equilibrado

Validação local em 10/10/2026, usando Playwright em `/recipes/items/1407`.

- **Expandir todos** percorre as dependências, abre receitas únicas e mostra origens de trabalhadores e combate. Mantém receitas já escolhidas, rendimentos, quantidades, seleção e viewport. Receitas com várias variantes aguardam escolha explícita em Detalhes do item.
- **Interromper expansão** cancela a consulta atual e mantém os itens já abertos. Testado em uma página isolada com atraso controlado nas consultas de receitas: cinco cards permaneceram abertos e o botão de expansão voltou a ficar disponível.
- **Recolher todos** mantém os dados da árvore e invalida consultas de expansão pendentes. Consultas de contexto e mercado invalidadas têm seus estados de carregamento limpos.
- Layout padrão: quatro colunas em área larga, três em área intermediária e uma em área menor que 560 px. A opção vertical usa duas colunas no desktop. Zoom não altera a distribuição.
- A receita de Edania explorou 14 itens e exibiu 44 cards, incluindo origens. Três itens aguardaram escolha de variante. No desktop, os cards ocuparam quatro colunas e 3.075 px de altura, contra 5.836 px em duas colunas, sem sobreposições após a medição dos cards.
- Em 390 × 844 px, a mesma árvore manteve uma coluna sem overflow horizontal da página.
- Selecionar `root/1/0` destacou os três cards do caminho e suas duas conexões. Roda do mouse, arraste e navegação por setas foram verificados no navegador.
- Console do navegador sem erros durante a verificação final.

Os testes cobrem ciclos, variantes ambíguas, cancelamento, origens de combate, recolhimento durante consultas pendentes, nova tentativa de mercado e colisões entre cards de origens já posicionados. A expansão em lote é limitada a 200 itens e 12 níveis; árvores maiores continuam disponíveis por ramificação. Dados ausentes e rendimentos não confirmados não são inferidos.

Validação automatizada final: 256 testes do frontend passando em 56 arquivos, lint sem erros e build de produção concluído. O build mantém os avisos existentes de tamanho do bundle, fallback de locale `pt-BR` e dependências CommonJS do OCR.

Capturas locais, ignoradas pelo Git: `output/playwright/crafting-balanced-all.png` e `output/playwright/crafting-balanced-mobile.png`.
