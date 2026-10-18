# Disponibilidade do tutorial da oficina e fallback versionado

**Consulta:** 18/10/2026. Pesquisa em páginas públicas, sem login, chamadas privadas ou cópia de conteúdo protegido. A mudança atende ao pedido de tornar o tutorial existente utilizável no ambiente local sem exigir uma gravação manual no banco.

## O que foi observado

| Serviço      | Evidência pública                                                                                                                                                                                                                                                                   | Limite da observação                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BDO Workshop | A [página pública](https://bdoworkshop.com/) apresenta ferramentas de crafting e mercado e informa que as ferramentas interativas dependem de JavaScript.                                                                                                                           | A rota de ferramenta não ficou acessível neste leitor; não foi possível confirmar se existe tutorial contextual ou comportamento interno.                         |
| BDO Codex    | O [catálogo de receitas culinárias](https://bdocodex.com/us/recipes/culinary/) expõe receitas, materiais, níveis e produtos. Uma [página de quest de Culinária](https://bdocodex.com/us/quest/1100/77/?sl=1) lista ações sequenciais para completar uma receita durante uma missão. | A quest é instrução de jogo, não onboarding da interface de um planejador. Não representa cálculo nem regra além do texto exibido.                                |
| BDOLytics    | A [página de uma receita de Culinária](https://bdolytics.com/en/cooking/9256:72a1fd6d2ac5) organiza entradas e retornos em uma ficha calculadora.                                                                                                                                   | Na cobertura pública/indexada consultada não foi localizada uma visita guiada passo a passo. Isso não prova que inexista em partes não indexadas ou autenticadas. |
| Garmoth      | O [guia da Olvia Academy de Culinária](https://garmoth.com/guides/post/olvia-academy-cooking) apresenta instruções sequenciais em texto e imagens; [Family Life Tools](https://garmoth.com/guides/post/family-life-tools) contextualiza ferramentas de Life Skills.                 | São artigos e guias editoriais, não tour ancorado à oficina do usuário.                                                                                           |

## Decisão aplicada

O endpoint público da oficina usa o conteúdo pt-BR já versionado em código quando não há guia correspondente no banco. Quando existe linha ativa, o conteúdo administrativo do banco prevalece; uma linha explicitamente desativada mantém o tour indisponível. O fallback valida âncoras e ordena etapas como o fluxo publicado. A resposta inclui uma data estável de atualização. Nenhum seed, migration ou escrita persistente é necessário.

A implementação cobre somente o guia `recipe-workshop` existente. Não cria conteúdo concorrente, não importa dados externos e não altera fórmulas. O teste da API verifica conteúdo fallback, precedência de guia ativo, respeito a guia desativado e ausência de escrita. A chamada local em `GET /api/v1/tutorials/recipe-workshop?locale=pt-BR` retornou as quatro etapas.

## Próxima validação

Fazer QA visual do launcher e da navegação ancorada na oficina com uma sessão legítima e viewport estreito. Isso valida apresentação e acessibilidade; não é requisito para servir o conteúdo público. Conteúdo por idioma diferente de pt-BR e telas adicionais seguem sem fallback até haver material revisado.
