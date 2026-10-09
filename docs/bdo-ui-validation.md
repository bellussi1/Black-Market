# Validação do redesign BDO

Implementação de 9 de outubro de 2026, após aprovação do usuário para todo o projeto.

## Entrega

- Tokens compartilhados de carvão, bronze e ouro, fonte Segoe UI, controles retangulares, tabs sublinhadas e ícones SVG de navegação. Estilos de catálogo, estoque, equipamentos, importação, ferramentas, rodapé e páginas legais alinhados ao sistema visual.
- Receitas com modo simples padrão, avançado sem remontar o grafo, detalhes sob demanda, custo conhecido quando calculável e campos obrigatórios de rendimento preservados.
- Cards com altura natural e nomes completos. Conexões SVG usam medidas reais. Posições e reservas persistem ao recolher/reabrir; colisões por crescimento de card são resolvidas mantendo o card editado ancorado.
- Zoom pelo cursor, pan com limiar de 5 px e supressão de clique após arrastar, fit em duas dimensões, controles e atalhos de teclado. Observers, listeners e frames são limpos no destroy. Sem nova dependência de produto.

## Verificação automatizada

- Frontend: 47 arquivos, 198 testes aprovados, incluindo regressões de wheel, fit, drag, dimensões medidas, colisões, reservas espaciais, rendimento e preservação de modo.
- Calculadoras: 24 testes aprovados. API: 69 testes aprovados.
- ESLint do frontend aprovado. Build de produção aprovado.
- Smoke SSR aprovado: conteúdo público, metadados, imagem social, sitemap, canonical, redirecionamentos, 404 e noindex de páginas privadas. Expectativas de títulos antigas foram atualizadas aos títulos atuais.
- Build emite avisos: bundle inicial 937,84 kB acima do orçamento de aviso de 500 kB, fallback de locale pt-BR para pt e CommonJS do Tesseract. O limite de erro de 1 MB é respeitado.

## Navegador real

- Revisadas receitas, início, mercado, armazéns, inventário, equipamentos, perfil, materiais, catálogo, importação, configurações e páginas legais. Sem overflow horizontal em 375, 768, 1024 px e desktop.
- Wheel manteve o ponto de mundo sob o cursor com diferença inferior a 0,003 px na leitura arredondada da matriz; scroll da página permaneceu em 720 px.
- Drag deslocou o canvas em 60 × 40 px, conforme o gesto, com seleção de texto desativada apenas no canvas.
- Aquecimento de Barra de Latão: produto e cinco materiais conservaram posições; descendentes recuperaram as mesmas coordenadas ao reabrir. Transform do canvas idêntico antes/depois de recolher.
- Alternância simples/avançado em 768 px conservou `translate(12.4335,198.022) scale(.481936)`.
- Ícones base medidos em 44 px; cards de 205–234 px sem conteúdo cortado. Navegação móvel corrigida para evitar breadcrumb quebrado palavra por palavra; menu recolhível até 900 px.
- Revisão independente concluída sem achados pendentes após corrigir colisões entre ramos, fit abaixo de 8%, altura em cache de nova raiz e seleção visual de tabs.

## Limites da verificação

Gestos de dois dedos estão implementados, mas não foram testados em hardware de toque. Leitor de tela e carga de centenas de nós não foram avaliados manualmente; ARIA, teclado, limites e layout são cobertos por código e testes. Reduced-motion foi conferido nos estilos. Ferramentas suspensas pelo guard MVP continuam redirecionando e receberam apenas revisão de estilos compartilhados. Nenhum deploy foi realizado.

Capturas locais: `bdo-recipes-redesign.png` e `bdo-recipes-mobile.png` na pasta de visualizações desta conversa.
