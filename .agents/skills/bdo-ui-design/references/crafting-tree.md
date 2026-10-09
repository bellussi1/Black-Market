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

Pointer capture somente durante drag confirmado; soltar em up/cancel, limpar estado ao destruir o componente. Limiar separa click de drag. Fundo com grab/grabbing e `user-select: none` limitado ao canvas. Painéis de detalhes continuam selecionáveis. Preservar atalhos das setas quando viewport tem foco; controles dos cards não herdam os atalhos.

## Dimensões e estabilidade

Card tem altura natural. `ResizeObserver` mede o retângulo sem transform (`offsetHeight` ou tamanho de border-box), com atualização agrupada por frame. SVG conecta centro inferior REAL do pai ao centro superior REAL do filho. Nunca manter `y1 = parent.y + 168` após mudar a altura do card.

Guardar posições pelo `path` na sessão visual. Recolher esconde descendentes, preserva coordenadas e reservas espaciais já conhecidas. Expandir novamente recupera as mesmas posições. Inserção de filhos novos busca espaço livre sem mover nós não afetados; se uma colisão exigir rearranjo, manter o card acionado ancorado por compensação de pan e limitar movimento ao ramo envolvido.

Não recentralizar em cada emissão de dados. Mudança de receita raiz pode reiniciar o layout; seleção e alteração de cálculo não devem fazer isso. Desligar observers/listeners/frames no destroy e preservar SSR.

Para centenas de nós, iterar apenas os visíveis para renderização e indexar allocations por path. Os limites atuais de segurança (ciclos, profundidade, nós) continuam válidos e devem comunicar truncamento.
