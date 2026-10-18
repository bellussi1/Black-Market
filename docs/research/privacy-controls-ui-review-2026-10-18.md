# Revisão da interface de cookies e analytics — 18/10/2026

## Escopo e decisão

O usuário aprovou reorganizar o painel de preferências existente. A entrega separa armazenamento necessário de estatísticas opcionais, mostra a escolha atual, mantém ações equivalentes para permitir ou recusar e oferece desativação direta após autorização. A interface explica a finalidade em linguagem simples e mantém acesso aos detalhes da política.

Analytics continua desligado quando não há configuração externa. Nenhum SDK, integração, categoria, cookie ou chamada de analytics foi adicionado. A lógica existente de consentimento, retenção, envio e cancelamento de requisições foi preservada. Esta revisão de interface não representa validação jurídica ou configuração de serviço.

## Consulta pública aos concorrentes

| Fonte                                                                            | Observação na superfície pública                                                                                                                                | Limite                                                                                                                                         |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop — Política de Privacidade](https://bdoworkshop.com/privacy-policy) | Explica que Google Analytics só inicia após consentimento e que a pessoa pode alterar a escolha depois. A página descreve categorias essenciais e de analytics. | É uma declaração do próprio site; não testamos a persistência em navegador nem inferimos sua base legal para o Black Market.                   |
| [BDO Codex](https://bdocodex.com/us/)                                            | A página pública inclui um link para “Privacy Statement”.                                                                                                       | O leitor de pesquisa foi bloqueado por `robots.txt`; detalhes do painel e opções equivalentes não foram verificados.                           |
| [BDOLytics](https://bdolytics.com/)                                              | A rota pública consultada redirecionou para `/en`.                                                                                                              | O leitor não retornou conteúdo de política ou controles nesta consulta; não foi possível confirmar o tratamento ou o desenho de consentimento. |
| [Garmoth — Política de Privacidade](https://dev.garmoth.com/privacy)             | Declara usar um gerenciador de consentimento e enumera categorias necessárias, de desempenho/analytics e direcionamento.                                        | A política não comprova como as opções são apresentadas hoje; igualdade de destaque entre aceitar e recusar não foi verificada.                |

A consulta à BDO Workshop e Garmoth foi feita em 18/10/2026. Para BDO Codex e BDOLytics, os limites de acesso registrados nas revisões públicas de 16–18/10 foram mantidos; não os tratamos como ausência de controles. Esta pesquisa serviu para identificar formas de comunicar categorias e alteração posterior da escolha, sem copiar texto ou layout.

## Critérios aplicados

- O armazenamento necessário é identificado como sempre ativo e descrito pelas finalidades observadas no código: lembrar região e escolha de privacidade.
- Analytics fica separado e opcional, com finalidade e exclusões de conteúdo da conta, armazém, buscas, itens e imagens explicadas no painel.
- Quando disponível, a pessoa pode permitir, recusar ou personalizar. Depois de autorizar, pode desativar com uma ação direta.
- A escolha salva e a disponibilidade do serviço são conceitos distintos. Uma autorização anterior não é apresentada como analytics ativo se o serviço estiver indisponível; nenhum evento é enviado nessa condição.
- Sem configuração externa, não há botões de aceite ou promessa de ativação. A preferência anterior pode ser revogada.
- O painel e os controles mantêm foco visível, Escape para fechar preferências abertas, alvo de toque adequado e movimento reduzido.

A [ANPD orienta sobre transparência, compreensão e controle da pessoa titular](https://www.gov.br/anpd/pt-br/assuntos/noticias-periodo-eleitoral/anpd-lanca-guia-orientativo-201ccookies-e-protecao-de-dados-pessoais201d). O guia é referência de boas práticas; esta implementação não é parecer nem certificação de conformidade.

## Verificação

- RED/GREEN na spec de `PrivacyControls`: estados sem escolha, categoria essencial sempre ativa, autorização registrada, desativação direta e persistência da recusa. As specs focadas passaram com 6/6; o teste da página legal foi alinhado ao novo rótulo e passou com 6/6.
- A inspeção local passou em desktop e 390×844. Na viewport estreita, o documento mediu 375 px de largura disponível e 375 px de conteúdo; o painel permaneceu dentro dos limites verticais. Escape fechou o painel e devolveu foco ao controle do rodapé. O console não registrou erros e não houve request de analytics/PostHog nesta sessão local sem configuração.
- `pnpm test` passou com 1.209 testes aprovados e 1 ignorado por depender de PostgreSQL descartável; `pnpm check`, `pnpm test:ssr`, `pnpm test:legal:layout` e `git diff --check` passaram. Build serial concluiu com bundle inicial de 501,06 kB, 1,06 kB acima do aviso de 500 kB; o limite foi preservado. Avisos independentes: dados de locale `pt-BR` usando `pt` e módulos CommonJS do Tesseract.
- Nenhum dado persistente, segredo, banco, staging ou produção foi alterado.
