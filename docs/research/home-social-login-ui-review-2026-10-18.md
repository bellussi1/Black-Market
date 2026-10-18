# Home, Profissões públicas e botões sociais — revisão de UI

**Consulta:** 18/10/2026. Escopo: primeira dobra da Home, acesso de visitantes a Profissões e rendimento e apresentação dos botões Google/Steam. A interface de concorrentes foi consultada apenas em páginas públicas; não houve login, envio de dados ou comparação de fórmulas.

## Diagnóstico local

- A Home colocava o painel de focos do Roadmap antes da busca de item. Em celular, a pessoa precisava passar pelo hero e pelos focos antes de chegar à primeira ação de consulta.
- A busca rápida da Home também exibia o filtro de categoria, embora uma busca por nome/ID seja suficiente para abrir a ficha, as receitas ou o mercado. O seletor completo continua em Receitas.
- A chamada “Profissões e rendimento” da navegação levava a `/lifeskills`, mas essa rota exigia login. A tela registra sessões no `WorkspaceStore`, que mantém dados do visitante no navegador.
- Os dois botões sociais usavam a mesma classe, mas sem moldura comum e com 216px de largura fixa. O Google era declarado como 189×40px apesar de o PNG medir 360×80px; essa declaração alterava a proporção original. O Steam mede 180×35px.

## Mudanças aplicadas

- Um bloco de entrada reúne hero compacto, acesso destacado a Profissões e rendimento e busca rápida antes dos focos dinâmicos do Roadmap. O seletor da Home usa modo compacto e oferece nome/ID; filtros por categoria permanecem no catálogo de Receitas.
- `/lifeskills` ficou acessível sem login e passou para renderização SSR. Visitantes podem registrar e comparar observações locais. A sincronização entre dispositivos continua exigindo uma conta. O aviso da página explica onde os registros ficam.
- Carregamento, erro, vazio, ordenação e lista completa de focos do Roadmap permanecem presentes. Não foram alteradas premissas de rendimento, ranking ou cálculo.
- Google e Steam usam uma grade compartilhada: mesma largura por coluna, altura de 52px, conteúdo centralizado e largura total em telas estreitas. A arte original de cada provedor continua no botão; largura e altura intrínsecas preservam a proporção. Foco, hover, desabilitado durante espera e movimento reduzido têm tratamento explícito.
- A imagem Google no repositório corresponde por hash ao PNG escuro retangular do pacote pré-aprovado no [guia oficial de marca do Google](https://developers.google.com/identity/branding-guidelines?hl=pt-br). O guia recomenda preservar proporção e dar destaque semelhante às opções de terceiros. A [documentação oficial do Steamworks](https://partner.steamgames.com/doc/features/auth?l=english) descreve OpenID em navegador e fornece imagens de acesso Steam para sites de terceiros.

## Pesquisa pública atual

| Fonte                                       | Resultado consultado em 18/10/2026                                                                                                                                                                                                          | Limite                                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/)    | A página de entrada abriu. A [política de privacidade](https://bdoworkshop.com/privacy-policy) descreve ferramentas de aprimoramento, gear progression, crafting, mercado e scans, e lista Discord, Google, Steam e Twitch como provedores. | A rota [Crafting Workshop](https://bdoworkshop.com/crafting-workshop) falhou no leitor público. Não foi possível comparar os controles do fluxo nem o desenho atual dos botões.   |
| [BDO Codex](https://bdocodex.com/us/items/) | Catálogo de itens e [lista de receitas](https://bdocodex.com/us/mrecipes/) estão acessíveis publicamente; receitas mostram tipo, nível, materiais, peso e produtos, com paginação.                                                          | A tela de configurações/login não abriu no leitor e foi sinalizada como bloqueada por robots. Sem comparação visual de autenticação.                                              |
| [BDOLytics](https://bdolytics.com/en/)      | O índice público lista database, Central Market, Crafting Calculator, Training, Map e Storage como áreas do produto.                                                                                                                        | A Home direta retornou zero linhas e `/en/login` falhou no leitor. A lista indexada não comprova o conteúdo interativo atual nem o desenho do login.                              |
| [Garmoth](https://garmoth.com/)             | A Home atual agrupa Market, Mastery Brackets, Tools, Grind Tracker e Gear Planner. [Checklist](https://garmoth.com/checklist) e [Crystal Planner](https://garmoth.com/crystal-planner) são páginas públicas de ferramentas.                 | A navegação não confirma um fluxo único de rendimento de profissões; não foi feita autenticação e o controle de login dessas páginas não foi verificado visualmente nesta rodada. |

As superfícies públicas reforçam a descoberta por áreas e ferramentas. Não provam comportamento privado, algoritmos de rendimento ou a necessidade de conta para cada ação. A organização escolhida segue o foco aprovado do Black Market em Life Skills e usa os fluxos locais já existentes; nenhum texto, imagem ou dado de concorrente foi copiado.

## Testes e limites

- RED reproduziu as lacunas antes da mudança. GREEN passou em 48/48 testes focados de Home, conta/login, guardas, configuração de rotas e navegação. A suíte completa passou com 1.156 testes e 1 teste ignorado por depender de PostgreSQL descartável; `pnpm check`, `pnpm build` serial e `pnpm test:ssr` também passaram.
- Os testes cobrem que a busca e o acesso a Profissões aparecem antes do Roadmap, o destino `/lifeskills`, os estados públicos da rota e o uso de imagens acessíveis com dimensões intrínsecas.
- Nenhuma fixture de domínio ou preço foi criada. A Home usa o fixture existente do Roadmap e os testes de conta usam doubles já existentes para identidade; não se compararam cálculos.
- **Revisão visual pendente:** o navegador integrado recusou acesso de leitura a `localhost:4200` pela política de URL. Não foi coletada captura atual nem medida da primeira dobra nesta etapa. A próxima revisão visual deve verificar Home/Settings em desktop e 390×844, além de teclado e foco. O smoke SSR passou; essa validação confirma renderização e metadata HTTP, mas não substitui a inspeção visual.
- Login OAuth real, consentimento e sincronização continuam pendentes de validação humana conforme AUTH-01.

## Arquivos envolvidos

`apps/web/src/app/features/dashboard/dashboard-page.html`, `dashboard-page.scss`, `dashboard-page.spec.ts`, `apps/web/src/app/core/login-panel.ts`, `apps/web/src/app/features/account/account-page.spec.ts`, rota e guarda de `/lifeskills`, navegação, testes de rotas e `scripts/smoke-ssr.mjs`. A fila e a continuidade do projeto apontam para este relatório.
