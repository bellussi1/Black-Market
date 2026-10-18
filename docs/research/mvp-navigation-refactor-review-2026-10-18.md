# Refactor de navegação do MVP — 18/10/2026

## Pedido e escopo

O usuário pediu reduzir abas/rotas visíveis e unificar o fluxo, mantendo Life Skills como prioridade. A navegação MVP tinha 13 destinos apresentados no mesmo nível. Esta entrega mantém seis ações de uso frequente à vista — Início, O que fazer, Profissões e rendimento, Mercado, Explorar receitas e Calcular produção — e recolhe os demais destinos em “Materiais e planos” e “Guias e conta”. Todas as rotas MVP continuam acessíveis; rotas suspensas continuam fora da navegação e protegidas pelo escopo atual.

## Superfícies públicas consultadas

Consulta em 18/10/2026, apenas páginas públicas, sem login ou acesso a endpoints privados.

| Fonte e página                           | Observação de interface                                                                                                                                                                   | Limite                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/) | A página apresenta o produto como conjunto de ferramentas de aprimoramento, progressão de equipamento, crafting, cálculos de mercado e leitura de capturas de inventário, armazém e gear. | A página avisa que as ferramentas precisam de JavaScript; o menu interno não ficou visível no leitor público.                 |
| [BDO Codex](https://bdocodex.com/us/)    | A consulta direta à página pública inicial foi tentada.                                                                                                                                   | O leitor bloqueou a URL como restrita; não foi possível verificar a hierarquia da navegação.                                  |
| [BDOLytics](https://bdolytics.com/en)    | A rota `/en` foi aberta como página pública.                                                                                                                                              | O leitor retornou zero linhas; navegação não verificada.                                                                      |
| [Garmoth](https://garmoth.com/)          | O cabeçalho mostra “Tools” e “Guides”; os destinos públicos são agrupados por Market, Enhancing, Tools, Grind Tracker e Gear Planner.                                                     | Observação da navegação pública de Garmoth; não valida a estrutura interna do Black Market nem foi usada como fonte de dados. |

## Decisão e evidência local

As páginas consultadas mostram agrupamentos temáticos em parte das superfícies, mas não estabelecem um padrão obrigatório. A decisão local vem do pedido do usuário e do mapa de rotas existente: destacar o fluxo de Life Skills e produção, recolher materiais/planos e ajuda/conta, mantendo atalhos sociais visíveis para visitantes. A estrutura usa os grupos HTML nativos `<details>`/`<summary>`, foco visível e os links de rota existentes.

Antes, o modo `SCREENSHOT_MVP` mostrava 13 destinos no primeiro nível. Depois, a Home mostra seis links principais e dois grupos recolhidos. Abrir “Materiais e planos” expõe Armazém, Importar capturas, Família, Lista de materiais e Meus planos; “Guias e conta” reúne Configurações e backup e Roadmap. Ao navegar para uma rota dentro de um grupo, a seção correspondente permanece aberta. A autenticação não mudou.

Testes de componente confirmam os seis atalhos, os dois grupos, a presença única de cada destino e a ausência de rotas desativadas. No navegador local, o menu foi verificado em desktop e viewport 390×844; a página manteve `scrollWidth === 390`, a expansão expôs os cinco links de materiais e Escape fechou a navegação e devolveu foco ao botão Menu.

## Limites e próximos passos

Esta mudança organiza os caminhos; não remove páginas MVP nem combina funcionalidades de domínio que ainda não têm contrato comum. Login real, telas pessoais autenticadas e leitor de tela seguem sem validação humana nesta rodada. Rever nomes e agrupamento com usuários depois de medir descoberta e sucesso das tarefas principais.
