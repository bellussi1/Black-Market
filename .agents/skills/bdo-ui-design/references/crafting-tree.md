# Crafting tree

O projeto usa posicionamento próprio em `recipe-graph-model.ts`, transform único no canvas e SVG para conexões. Reusar essa estrutura enquanto ela atende os critérios; substituir só com evidência de incapacidade.

## Zoom

Capturar wheel apenas no viewport interativo, usando listener não passivo quando necessário. Normalizar `deltaMode` e limitar escala. Para coordenadas do cursor locais `cx, cy`, pan `px, py`, escala `z`:

```ts
const worldX = (cx - px) / z;
const worldY = (cy - py) / z;
const nextPan = { x: cx - worldX * nextZoom, y: cy - worldY * nextZoom };
```

Botões usam centro do viewport como âncora. Fit considera largura E altura do bounding box real e margem, não apenas número de folhas. Reset é ação explícita. Não aplicar transição CSS que prejudique a precisão da âncora em wheel contínuo; agrupar eventos por frame.

## Pan

Mouse recebe pointer capture somente após drag confirmado; touch recebe captura imediata para manter os dois pointers do pinch, conforme `recipe-graph.ts`. Soltar em up/cancel e limpar estado ao destruir o componente. Limiar separa click de drag. Fundo com grab/grabbing e `user-select: none` limitado ao canvas. Painéis de detalhes continuam selecionáveis. Preservar atalhos das setas quando viewport tem foco; controles dos cards não herdam os atalhos.

## Dimensões e estabilidade

Card tem altura natural. `ResizeObserver` mede o retângulo sem transform (`offsetHeight` ou tamanho de border-box), com atualização agrupada por frame. SVG conecta centro inferior REAL do pai ao centro superior REAL do filho. Nunca manter `y1 = parent.y + 168` após mudar a altura do card.

Organizar por tiers: todos os cards de uma profundidade ficam na mesma linha. Pais ficam centralizados sobre as faixas de seus descendentes, formando uma árvore triangular para baixo. Conexões mudam de direção apenas nos intervalos vazios entre tiers. Reservar cards de ingredientes próximos à raiz antes de gastar o limite visual com locais opcionais. Recolher preserva escolhas e dados dos descendentes. Reorganização pode mover faixas, mas mantém o card acionado ancorado por compensação de pan. Atualizar posições, conexões e compensação juntas; animações de posição independentes deixam conexões soltas. Manter entrada, saída e destaque como feedback visual, respeitando redução de movimento.

Não recentralizar em cada emissão de dados. Mudança de receita raiz pode reiniciar o layout; seleção e alteração de cálculo não devem fazer isso. Desligar observers/listeners/frames no destroy e preservar SSR.

Para centenas de nós, iterar apenas os visíveis para renderização e indexar allocations por path. Os limites atuais de segurança (ciclos, profundidade, nós) continuam válidos e devem comunicar truncamento.
