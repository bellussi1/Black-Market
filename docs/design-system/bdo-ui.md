# Biblioteca UI BDO

Base: Spartan 1.6.3 Brain e Helm, Tailwind 4.3.3, Angular 22.2. Os arquivos Helm ficam em `apps/web/src/app/ui`, importados pelo alias `@bdo/ui`. Botão, input, card, textarea e native-select estão disponíveis. Os templates externos das features, shell e controles compartilhados usam as primitivas BDO.

Personalizações: tokens semânticos de carvão/bronze em `src/styles/tailwind.css`, raio de 2 px, botão/input padrão com altura de 44 px, hover e foco dourado. Componentes gerados mantêm seletores oficiais; exceção de lint limitada às declarações desses seletores. Não editar node_modules. Antes de regenerar Helm, revisar o diff contra a versão instalada e reaplicar as personalizações documentadas.

Selects existentes usam `BdoSelect`, uma diretiva visual Tailwind sobre o elemento nativo, preservando contratos `(change)`, eventos, labels e `ngModel`. `HlmNativeSelect` está disponível para novas composições que aceitem sua estrutura. Checkboxes, radio, sliders e inputs de arquivo conservam controles nativos e estilos acessíveis existentes.

Cards não impõem flex nem recortam seu conteúdo: tabelas, menus e mensagens conservam seu layout. O padding usa `--bm-panel-padding` para alinhar barras de título no desktop e mobile. A variante outline declara cor explícita para evitar herdar texto escuro da classe legada `.btn`.

O grafo especializado e os layouts específicos continuam em SCSS. Não converter seu posicionamento em utilities sem testes de medição, pan e zoom. Não remover esses estilos ativos somente para declarar uma migração completa de sintaxe.
