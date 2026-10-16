# Navegação para recursos autenticados — revisão competitiva

**Consulta:** 16/10/2026 · superfícies públicas, sem login, sem enviar dados e sem contornar restrições de acesso.

## Evidências públicas

| Fonte                                                                                                                                             | Observação verificável                                                                                                                                                                                                                                                             | Limite desta consulta                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop — política de privacidade](https://bdoworkshop.com/privacy-policy) e [Crafting Workshop](https://bdoworkshop.com/crafting-workshop) | A política descreve login por Discord, Google, Steam ou Twitch e separa dados salvos na conta dos dados anônimos mantidos no navegador; planos, presets, estoque e configurações aparecem entre os dados salvos.                                                                   | A rota pública do Crafting Workshop não foi carregada pelo navegador de pesquisa nesta consulta. Não foi possível confirmar quais itens do menu levam a uma tela de login.   |
| [BDO Codex — itens](https://bdocodex.com/us/items/) e [configurações/login](https://bdocodex.com/us/settings/?sl=1)                               | A busca pública mostra o catálogo de itens; o resultado indexado de configurações exibe formulário de usuário/senha, opção “Remember”, registro, recuperação de senha e botão “Login”. Não há evidência observada de login social.                                                 | O acesso direto às páginas do domínio foi restringido pelo leitor de páginas; a evidência veio dos resultados públicos indexados. Não se tentou autenticar.                  |
| [BDOLytics — item #731120](https://bdolytics.com/en/db/item/731120) e [mapa](https://bdolytics.com/en/map?node=464)                               | A página pública do item mostra “Login to leave a comment”; páginas públicas de ferramentas exibem “Sign In” no cabeçalho, enquanto catálogo, mapa, mercado e calculadoras são apresentados como áreas do produto.                                                                 | A rota de item renderizou zero linhas no leitor direto; o rótulo de login foi confirmado no resultado público de busca. O fluxo de salvar dados pessoais não foi exercitado. |
| [Garmoth — checklist](https://garmoth.com/checklist) e [Crystal Planner](https://garmoth.com/crystal-planner)                                     | O checklist informa que é preciso entrar para criar uma lista própria ou ver listas compartilhadas e oferece “Login with Discord”. O Crystal Planner diz que presets não são salvos sem login e apresenta “Login to save”. O menu público continua listando mercado e ferramentas. | Não foi feito login nem verificada persistência entre dispositivos.                                                                                                          |

## Comparação e decisão para o Black Market

As superfícies consultadas combinam ferramentas públicas com ações ou dados pessoais que pedem uma conta. Os concorrentes variam entre login social e formulário próprio. Isso sustenta deixar a função encontrável antes de autenticar, mas **não comprova** que todos os sites mostrem toda função privada no menu.

No Black Market, visitantes passam a ver os atalhos das áreas privadas ativas. Abrir um deles continua passando pelo `authGuard`, que encaminha para `/account` e inclui a rota original em `returnUrl`. Depois do login Google, a tela de conta retorna ao destino permitido; `family` e `shopping` foram incluídos nessa lista. Steam conclui esse retorno pelo callback existente. O guard continua sendo a proteção efetiva dos dados.

`Meus planos` estava suspenso no escopo Screenshot MVP, o que faria o caminho parar na Home antes do guard. A rota existente foi reativada nesse escopo e passou a aparecer junto das outras entradas autenticadas. Ela permanece protegida por `authGuard`. `Dados e backup` também foi adicionado ao menu autenticado.

Os botões Google/Steam da tela `/account` só aparecem quando seus provedores estão configurados. Esta mudança não configura Firebase, domínios autorizados ou credencial Admin e não valida login externo de ponta a ponta.

## Fontes e limites

- [Política de privacidade do BDO Workshop](https://bdoworkshop.com/privacy-policy), atualizada em 10/10/2026; [Crafting Workshop](https://bdoworkshop.com/crafting-workshop).
- [Catálogo público do BDO Codex](https://bdocodex.com/us/items/) e [tela de configurações](https://bdocodex.com/us/settings/?sl=1).
- [BDOLytics Blackstar Sting #731120](https://bdolytics.com/en/db/item/731120) e [mapa](https://bdolytics.com/en/map?node=464).
- [Garmoth Checklist](https://garmoth.com/checklist) e [Crystal Planner](https://garmoth.com/crystal-planner).

As observações são de interface pública, não confirmação de regras internas ou de disponibilidade de autenticação em cada região. Não foram usados preços, algoritmos, dados de contas ou endpoints não documentados.
