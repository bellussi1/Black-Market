# Componentes

## Janela e barra de título

Screenshots 01, 04, 09 e 12: faixa bronze horizontal sobre painel carvão. Na web, usar borda 1 px, raio 0–3 px e faixa opaca; textura geométrica, quando usada, apenas em pseudo-elemento de fundo com baixo contraste e `pointer-events: none`.

## Slot e card

Screenshots 06, 07 e 14: slot escuro, ícone proporcional, contorno fino. Reservar dimensão antes de carregar o ícone. Cards de receita agrupam slot, nome completo, quantidade e origem; detalhes extensos ficam no painel selecionado. Mensagens de erro têm espaço no fluxo e influenciam a medição do card, sem sobreposição absoluta.

```scss
.recipe-node {
  width: var(--bm-node-width, 248px);
  min-height: 160px;
  height: auto;
  border: 1px solid var(--bm-border);
  background: var(--bm-surface);
}
.recipe-node__name { overflow-wrap: anywhere; line-height: 1.4; }
.recipe-node[aria-selected='true'] {
  border-color: var(--bm-accent);
  box-shadow: inset 0 0 0 1px var(--bm-accent);
}
```

## Botões, campos e tabs

Screenshots 03, 04, 07, 08 e 16: retângulos de cinza e bronze, seleção por faixa fina. Alvos web têm pelo menos 44 px de altura, fonte legível e foco visível. Bordas permanecem com espessura constante. Botões destrutivos usam texto explícito; não replicar ícone de lixeira sem nome acessível.

## Tooltips e estados

Tooltip para identificação/qualidade ou informação complementar, nunca para esconder informação essencial. Sucesso e erro incluem texto, não apenas verde/vermelho. Loading preserva o nome do item e desabilita somente a ação duplicada; `aria-busy` comunica o estado.
