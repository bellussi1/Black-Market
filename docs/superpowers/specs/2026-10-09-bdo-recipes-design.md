# Redesign de receitas · Black Market

Estado: implementado após aprovação. Sistema visual aplicado ao projeto, árvore de crafting reconstruída e revisão independente concluída. Evidências e limites em [validação](../../bdo-ui-validation.md).

## Objetivo e escopo

Executar o briefing fornecido pelo usuário para a página `/recipes/00b1fe5601a28b41f9d1b3297d71aef1f537a53680ec03e17aaf3a794def061e`. Priorizar a árvore de crafting, conteúdo legível, estabilidade espacial e divulgação progressiva. Criar a skill local `.agents/skills/bdo-ui-design`, preservando as 16 imagens como referências duráveis. A etapa de implementação aplica o sistema visual às receitas e aos componentes compartilhados necessários; não reescreve cálculos, catálogo ou backend.

## Diagnóstico verificado

- Angular 22, componentes standalone/OnPush, signals, SCSS e testes Vitest. Nenhuma biblioteca de grafo instalada: o projeto possui seu próprio layout SVG/DOM.
- `recipe-graph.scss`: cards 220 × 168 px, nome limitado a duas linhas e mensagem absoluta após o card. `recipe-graph-model.ts`: conexões assumem altura de 168 px, linhas a cada 220 px. Corrigir apenas o CSS causaria conexões incorretas e colisões.
- O modelo recalcula X pela contagem das folhas VISÍVEIS. No navegador, ao expandir Barra de Latão com Aquecimento, o produto passou de X=528 para 717; ao recolher retornou a 528. Materiais vizinhos mudaram 252 px. O viewport não precisou mudar para o usuário perceber o salto.
- `RecipeGraph` não tem listener wheel. `scale()` muda a escala sem compensar pan. `fit()` considera só a largura. `center()` assume meia largura de 110 px e usa Y fixo de 50 px.
- O grafo usa `pointercapture` no fundo; há proteção para buttons/inputs/selects, mas falta limiar para diferenciar drag de clique e não há `user-select: none` limitado ao canvas.
- Seleção usa borda 2 px contra borda 1 px no estado comum; isso muda a área útil interna. A fonte de título global usa serifas, enquanto referências de menus BDO mostram uma sans estreita.
- Tela inicial apresenta configuração extensa e um painel de detalhes vazio de 340 px. No CSS, a visualização de grafo desaparece em larguras inferiores a 1050 px e vira etapas, sem controle explícito de modo simples/avançado.
- O componente ItemIcon já reserva 44 × 44 px e limita a 48 px; preservar esse comportamento, refinando slots e raridade somente quando os dados a fornecem.
- Catálogo deste exemplo tem rendimento ausente. O estado inicial exige confirmação. O redesign deve manter esse aviso; não pode inventar produção ou custo para mostrar métricas completas.

## Abordagens avaliadas

1. **Reusar o grafo e corrigir estado/medição (recomendada).** Sem dependência nova, integra diretamente com ações e testes existentes. Exige layout estável por path e observers bem delimitados.
2. Substituir por biblioteca de grafo. Mais comportamento pronto, porém novo peso, integração Angular e migração de acessibilidade. Não há evidência de necessidade.
3. CSS somente. Mais rápido, mas não resolve âncora do zoom, fit bidimensional ou saltos causados pela distribuição de folhas. Não atende o briefing.

## Design visual

Aplicar as regras da skill `bdo-ui-design`: carvão neutro, faixas bronze, bordas finas, slots, tabs sublinhadas e seleção estável. Ouro reservado a contexto, quantidade importante e ação principal. Nada de neon, vidro intenso ou emojis.

Fonte original não identificada. Segoe UI como fallback local imediato; Barlow Semi Condensed como alternativa documentada para eventual auto-hospedagem com licença. Não adicionar chamadas de fontes externas apenas por estética. Corpo 14–16 px, metadata 12–13 px e títulos de janela 18–20 px. Texto completo no card, inclusive nomes longos.

## Organização da página

- Cabeçalho compacto de janela com nome da oficina, produto e acesso à pesquisa.
- Configuração principal: quantidade e método escolhido. Rendimento obrigatório ausente permanece junto ao produto; demais premissas ficam em avançado.
- Modo simples padrão: árvore, controles essenciais (+/−, fit, reset), materiais, quantidades, origens e custo conhecido quando calculável.
- Modo avançado: estoques, impostos, fontes/versões, ajustes detalhados e controles secundários da árvore. Alternância preserva a instância do grafo, root, seleção, pan e zoom.
- Painel de detalhes aparece quando solicitado, preserva seleção de texto e rolagem interna. No desktop, não comprimir a árvore com coluna vazia permanente. Em tela pequena, apresentar detalhes abaixo e disponibilizar etapas.

## Contrato do grafo

### Cards e conexões

Largura consistente de cerca de 248 px; altura natural sem line-clamp. Medir border-box usando ResizeObserver, agrupar por frame e atualizar apenas quando o tamanho mudar. Posicionar conexões com largura/altura reais. Mensagens participam do fluxo; loading e falha de imagem não mudam o slot.

### Layout persistente

Guardar coordenadas e reservas espaciais por path. Recolher altera a visibilidade, não remove a reserva de descendentes conhecidos. Reabrir recupera exatamente a posição anterior. Novos filhos ocupam posições livres; nós não afetados permanecem nas suas coordenadas. Quando ajuste for inevitável por colisão, restringir ao ramo e compensar pan para ancorar o card acionado. Troca da receita raiz reinicia a sessão espacial; recálculo de quantidades não.

### Zoom e pan

Wheel normalizado e limitado, listener não passivo apenas no viewport. Mundo sob o cursor permanece invariante: `world=(cursor-pan)/zoom` e `panNovo=cursor-world*zoomNovo`. Agrupar eventos por requestAnimationFrame sem CSS lag na transformação. Botões ancoram no centro. Fit considera min/max X/Y e dimensões medidas, margem e viewport completo. Reset explícito.

Pan via pointer, capture e limiar de 5 px. Arrastar não gera expansão; clique real seleciona/expande conforme papel da ação. Limitar bloqueio de seleção ao canvas. up/cancel/destroy limpam o gesto. Atalhos de teclado só interceptam viewport, respeitando controls.

### Animação e performance

Entrada/saída de ramos em 140–200 ms usando opacity/transform, conexões sincronizadas. Reduced-motion remove transições. Indexed allocations por path. Renderização dos nós visíveis, observers e listeners destruídos corretamente, nenhuma API de browser executada durante SSR. Manter limites existentes e mensagem de truncamento.

## Arquivos e responsabilidades

- `styles/_tokens.scss` e estilos compartilhados: tokens novos e regras básicas de foco/contraste, sem overrides espalhados.
- `features/recipes/recipes-page.*`: identidade da oficina, pesquisa e seleção de método.
- `shared/recipe-tree/recipe-tree.*`: modo simples/avançado, detalhes sob demanda e preservação do estado existente.
- `shared/recipe-tree/recipe-graph-model.ts`: posições estáveis, bounding boxes e conexões reais.
- `shared/recipe-tree/recipe-graph.*`: wheel, pan, medição, ações e animação.
- Specs existentes mais regressões específicas: álgebra da âncora, fit, gestos, dimensões, posições e preservação de modo.

## Verificação e critérios de conclusão

1. Testes de comportamento escritos primeiro para bugs do layout e viewport; verificar falha antes da correção.
2. Suíte web existente, lint, build/SSR conforme scripts do projeto; reportar falhas existentes por nome.
3. Navegador real: wheel em vários pontos, pan após zoom, controles, expansão repetida e seleção/teclado.
4. Coordenadas de nós não afetados antes/depois de collapse devem permanecer iguais; a âncora visual do nó acionado deve permanecer constante.
5. Card com nome longo, categoria, mensagens e estado de loading sem corte, sobreposição ou clipping; ícones nunca maiores que 48 px.
6. Árvore multinível e cenário com dezenas/centenas de nós, mantendo proteção contra ciclos e limites.
7. Modo avançado conserva escolhas, pan e zoom; parâmetros essenciais não desaparecem quando obrigatórios.
8. Capturas em desktop e 375/768/1024 px, sem overflow horizontal da página. Verificar foco e reduced-motion.
9. Revisão visual de receitas e telas que compartilham tokens. Entrega só concluída após implementação funcional e esta validação.

## Fora do escopo

Login Google, Valyu e Morph ficam pendentes na tarefa anterior. Nenhuma mudança de credenciais, plano pago, integração externa, deploy ou publicação faz parte deste redesign.
