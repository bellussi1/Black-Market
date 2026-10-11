# Biblioteca UI BDO

Base: Spartan 1.6.3 Brain e Helm, Tailwind 4.3.3, Angular 22.2. Os arquivos Helm ficam em `apps/web/src/app/ui`, importados pelo alias `@bdo/ui`. Botão, input e card estão disponíveis. Botões dos cenários de receita já usam Helm; os demais controles ainda estão em migração.

Personalizações: tokens semânticos de carvão/bronze em `src/styles/tailwind.css`, raio de 2 px, botão/input padrão com altura de 44 px, hover e foco dourado. Componentes gerados mantêm seletores oficiais; exceção de lint limitada às declarações desses seletores. Não editar node_modules. Antes de regenerar Helm, revisar o diff contra a versão instalada e reaplicar as personalizações documentadas.

O grafo especializado continua em SCSS. Não converter seu posicionamento em utilities sem testes de medição, pan e zoom. A migração integral de formulário, shell e demais features ainda está pendente.
