# Tours automáticos e ajuda em contexto — revisão de 18/10/2026

## Escopo

Esta revisão acompanha o rollout de apresentações automáticas nas superfícies funcionais do MVP e a ação local de reinício adicionada em Configurações. A pesquisa comparativa trata de organização de ferramentas e orientação pública; não pretende comprovar algoritmos, regras do jogo nem a existência ou inexistência de tours privados.

Consulta feita em 18/10/2026, somente em páginas públicas. Não houve login, envio de dados, uso de APIs privadas, seed ou alteração de conta.

## Pesquisa competitiva

| Fonte                                                                                                                        | Observação direta nesta consulta                                                                                                                                                                                                   | Limites e interpretação                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/)                                                                                     | A página pública descreve ferramentas de aprimoramento, progressão de equipamento, crafting, mercado e leitura de capturas de inventário, armazém e equipamento. A própria página avisa que as ferramentas dependem de JavaScript. | O leitor recebeu o shell e o aviso de JavaScript, não o fluxo interativo. Tours, dicas persistentes e estados de confirmação não puderam ser verificados. Isso não prova que estejam ausentes.                              |
| [BDO Codex — Knowledge](https://bdocodex.com/en/knowledge/)                                                                  | A página expõe pesquisa e categorias como Life Skills, Trade, Adventure Logs e Knowledge. A informação está organizada como catálogo consultável.                                                                                  | Nenhum tour ancorado apareceu na página observada; não foi inspecionada uma conta nem toda a biblioteca. Tratar como referência de busca e organização, sem afirmar ausência geral de orientação.                           |
| [BDOLytics](https://bdolytics.com/en/)                                                                                       | A busca pública indexa Database, Central Market, Crafting Calculator, Training, Map, Skill Builder e funções de Life Skills.                                                                                                       | A abertura direta retornou zero linhas ao leitor nesta sessão. Não foi possível observar a UI atual, estados ou um tour. Usar o índice apenas como indício de cobertura pública, não como reprodução ou confirmação visual. |
| [Garmoth — Guides](https://garmoth.com/guides/post/complete-gearing-guideintroduction) e [Tools](https://garmoth.com/tools/) | A navegação pública separa Tools e Guides; o índice observado lista Market, Gear Planner, Checklists e guias de Life Skills, inclusive conteúdos de Gathering, Cooking, Processing, Hunting e Alchemy.                             | O acesso confirmou guias editoriais e ferramentas organizadas. Não verificou um tour ancorado nem uma experiência autenticada. Guias editoriais e tours são formatos distintos.                                             |

## Decisão aplicada ao Black Market

O rollout usa tours automáticos por rota, aba ou estado pronto e ajuda permanente junto dos controles. Não mostra um launcher em cada página nem reserva espaço vazio para tutorial. Configurações concentra a opção de reiniciar as apresentações; a confirmação informa o efeito antes da limpeza e o sucesso é anunciado ao leitor de tela.

O reinício limpa somente `bm_tutorial_onboarding_progress_v1`, o progresso local de tutorial. `WorkspaceStore`, backup, preferências de privacidade, dados de conta, inventário e cálculos permanecem fora dessa operação. Depois da confirmação, cada superfície volta a oferecer seu tour na próxima visita. Cancelar mantém o progresso; o foco retorna ao botão que abriu a confirmação.

Os textos e exemplos continuam versionados e localizados com a interface. Conteúdo ativo editado no banco prevalece; um registro desativado não recebe fallback. Nenhuma regra de jogo ou fórmula veio da pesquisa concorrencial.

## Validação e limites

- Specs de Configurações cobrem confirmação, cancelamento, feedback, foco restaurado, preservação de `WorkspaceStore` e ausência de exportação de backup. O serviço cobre a limpeza de mais de uma revisão/tela sem remover outra chave do `localStorage`.
- No navegador Playwright local, Configurações foi observada em 1440×900 e 390×844. A confirmação cabe na largura móvel, não cria rolagem horizontal e cancelar devolve foco ao acionador.
- A página abriu, mas as chamadas locais de `localhost:3000/api/v1/identity/config` e `/api/v1/tutorials/settings?locale=pt-BR` falharam com `ERR_CONNECTION_REFUSED`. Portanto a captura valida a seção de Configurações e a confirmação local; não valida login real nem a apresentação do guia servido pela API.
- A Home foi observada em 1440×900 e 390×844. O primeiro bloco mantém busca e acesso a Profissões visíveis sem rolagem horizontal; o painel de focos exibiu o estado de erro com nova tentativa porque os serviços locais estavam indisponíveis. A sessão autenticada/OAuth depende de API e credenciais válidas; não se alteram dados reais como parte do QA.
- A consulta é um retrato público em 18/10/2026. JavaScript, idioma, região, login e alterações posteriores podem mudar a superfície observável.

## Fontes locais

- [Especificação de onboarding e ajuda contextual](../superpowers/specs/2026-10-18-onboarding-e-ajuda-contextual-design.md)
- [Plano de onboarding automático](../superpowers/plans/2026-10-18-auto-onboarding-tutorials.md)
- [Fallback pt-BR versionado](tutorial-versioned-fallback-review-2026-10-18.md)
- [Protocolo de revisão competitiva](competitor-review-playbook.md)
