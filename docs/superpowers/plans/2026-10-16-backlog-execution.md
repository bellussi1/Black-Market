# Black Market — execução das pendências aprovadas

> **Execução:** pedido explícito do usuário em 16/10/2026 para seguir com tudo que estava pendente de aprovação e implementação, em paralelo quando independente.

**Objetivo:** fechar melhorias locais aprovadas e verificáveis, sem repetir entregas prontas nem tratar dependências externas como concluídas.

**Arquitetura:** preservar o monorepo Angular/NestJS/PostgreSQL e as calculadoras compartilhadas. Separar frentes em arquivos/domínios distintos; integrar e validar no controlador. Pesquisar BDO Workshop, BDO Codex, BDOLytics e Garmoth em cada feature de produto conforme `docs/research/competitor-review-playbook.md`.

## Matriz inicial

| Frente                                               | Estado observado nos documentos                                                                               | Próximo passo                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Mercado — categorias, filtros, paginação e skeletons | Implementado nos commits `8422f95`, `e3c844a`, `a1f5f12`; inspeção estreita/teclado pendente                  | Validar por navegador quando a API fornecer dados; corrigir somente defeitos reproduzidos                |
| Receita — maestria e finanças                        | Relato aberto; há teste pareado parcial, mas falta confirmar que todos os valores reagem às entradas modernas | Cobrir Culinária/Alquimia/Processamento e produção versus compra; corrigir após reproduzir               |
| Receita — “melhor lucro possível”                    | Busca dentro do grafo selecionado com limite; possível omissão de coleta se item também tiver produtor        | Confirmar contrato worker, incluir estimativas confirmadas alcançáveis e testar a decisão ótima do caso  |
| Workshop — tour da oficina                           | Driver.js e tutorial genérico implementados; tour detalhado da oficina pendente                               | Adicionar guia contextual e seed compatível com preservação de conteúdo admin                            |
| Build de produção                                    | Último registro aponta estouro de budgets                                                                     | Medir bundles e estilos; reduzir custo mantendo lazy loading, sem elevar budgets como atalho             |
| Guards e privilégios de identidade                   | Auditoria antiga encontrou lacunas                                                                            | Confirmar no código atual; corrigir guard/grants e cobrir testes sem abrir acesso                        |
| Login social Firebase                                | Código pronto; configuração Google real bloqueada pelo Console, Steam sem validação real                      | Preparar/testar código local; registrar passos externos sem inventar credenciais                         |
| OCR, armazém, personagem e gear                      | Fluxos parciais; corpus real pequeno e sem split de avaliação                                                 | Implementar apenas melhorias com evidência local; dados novos exigem captura autorizada e revisão humana |
| Feed/volume de mercado                               | Sem fonte externa aprovada                                                                                    | Manter coletores desligados; documentar como bloqueio de licença/contrato/cobertura                      |

## Execução

- [x] Reconciliar status com código, branch, Git e verificações; ler os planos/specs das frentes selecionadas.
- [x] Em paralelo, revisar rotas/identidades, otimização segura do bundle, Mercado responsivo/teclado e corpus de OCR, cada frente com escopo isolado.
- [x] Corrigir o payload do worker para preservar estimativas de coleta válidas em materiais alcançáveis mesmo quando há receita produtora; manter escolhas fora da árvore excluídas. Regressões Web e do solver passam.
- [~] Caracterizar maestria nas três profissões. A spec altera 0→3.000 e verifica receita bruta/líquida, lucro e lucro/hora; nenhum bug foi reproduzido no fluxo testado. Ainda falta caso real de receita/dados/configuração do usuário para explicar o relato.
- [x] Implementar `recipe-workshop` como guia contextual separado em `/recipes/items/:id`, com quatro etapas registradas e seed independente; preservar o tutorial `recipes` e não executar seed em banco persistente.
- [x] Adicionar guardas de `/plans` e `/settings`, contexto transacional para políticas RLS, migração versionada `0013_identity_rls.sql` e testes de privilégios/identidades. A migração foi validada num PostgreSQL efêmero e não foi aplicada no banco persistente, staging ou produção.
- [x] Otimizar carregamento lazy do `WorkspaceStore` e extrair estilos por subcomponente. O build de produção agora conclui sem erro de budget CSS. O bundle inicial mediu 600,57 kB bruto / 158,90 kB estimados transferidos, ainda acima do aviso de 500 kB. Persistem avisos de locale `pt-BR` com dados `pt` e módulos CommonJS do OCR; SSR de produção não foi validado.
- [x] Completar as fases visuais 1 (Home/Recomendações) e 2 (Mercado/Receitas) aprovadas. A fase 2 acrescenta rótulos e hierarquia no Mercado, skeleton inicial no catálogo, atualização sem overlay e resumo de oficina sem clipping fixo; não muda cálculo, preço, filtro, persistência ou acesso.
- [x] Auditar Mercado, OCR, personagem, armazém e gear. A inspeção estreita/teclado do Mercado não revelou defeito; os fluxos de perfil/estoque/gear também não. O corpus tem 13 capturas/29 rótulos só em calibração e nenhuma avaliação independente; sem alegação de acurácia nem alteração funcional sem defeito reproduzido.
- [x] Atualizar pesquisa competitiva dos quatro sites em cada área consultada, handoff, prompt de continuidade e contexto ativo. Observação de UI continua separada de fórmula/telemetria interna.
- [x] `pnpm check` passou. `pnpm test` passou serialmente: 68 calculadoras, 247 API (1 ignorado), 623 Web e 73 scripts OCR (1.011 aprovados). Specs focadas Mercado/Receitas/árvore: 90/90.
- [x] Build de produção do Web concluiu sem erro de budget CSS; warning de bundle inicial de 600,57 kB, locale e CommonJS documentados. QA visual/DOM em 1440×900 e 390×844 anotado no plano da fase 2.
- [x] Revisar diff, atualizar handoff/checklist/contexto e concluir commits atômicos por fatia; sem push, deploy, migração ou seed em banco persistente.
- Commits da fase 2: `b90f83d` Mercado; `bd0140b` Receitas/oficina. A revisão e pesquisa competitiva ficam no commit documental seguinte.

## Limites da autorização

O usuário autorizou avançar com pendências de implementação e aprovação. Isso cobre código, documentação, testes e alterações locais reversíveis. Não executar operação destrutiva em banco, não criar/alterar recursos externos com cobrança, não publicar, não fazer push e não manipular credenciais. Antes de escrever em PostgreSQL, provar pelo destino e configuração que o banco é descartável/local; caso contrário, preparar código e instruções e marcar o bloqueio.

## Critério de conclusão

Marcar cada item como concluído, parcial ou bloqueado com evidência. Não declarar autenticação real, precisão de OCR, volume de vendas, fórmula de concorrente, migração/seed, acessibilidade visual ou build de produção aprovados sem a verificação correspondente.
