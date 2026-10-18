# Onboarding automático e ajuda contextual do Black Market

**Data:** 18/10/2026

**Estado:** especificação escrita; aguarda revisão e aprovação antes do plano de implementação.
**Escopo:** tours automáticos por rota/aba e um padrão transversal de orientação, confirmação e estados visuais para os fluxos funcionais do MVP. Este documento substitui as decisões conflitantes do desenho de 15/10/2026 sobre início manual e cobertura limitada.

## Resumo

Na primeira visita a cada superfície funcional, o Black Market apresenta automaticamente um tour curto, contextual e com identidade visual inspirada nos menus de Black Desert. O tour destaca os controles existentes sem inserir launcher, botão ou placeholder no fluxo da página. Depois de concluído ou dispensado, não volta a interromper a pessoa até uma nova versão daquele guia; é possível rever as introduções em **Configurações → Ajuda e tutoriais**.

Os tours complementam a própria interface. Campos importantes explicam para que servem, formato, unidade ou exemplo pertinente; validações dizem como corrigir; ações e cálculos mostram o que está acontecendo e qual foi o resultado. Nenhuma tela funcional deve deixar a pessoa diante de campos sem contexto ou de uma área vazia sem explicar o próximo passo. A orientação usa texto simples, sem presumir conhecimento de Black Desert e sem tom infantil ou condescendente.

## Problema e resultados desejados

Hoje somente seis superfícies têm tours, iniciados por um launcher visível. Várias abas e fluxos funcionais não têm guia, e as dicas do tour não substituem a ajuda necessária depois que ele termina. A pessoa precisa inferir o sentido de entradas como maestria, quantidade de produção, origem do material e destino do armazenamento, além de perceber se uma operação ainda carrega, salvou ou falhou.

O resultado desejado é que a pessoa consiga responder, sem conhecimento prévio de BDO:

1. O que esta tela me ajuda a fazer?
2. O que cada entrada relevante significa e em que unidade devo preenchê-la?
3. O que muda quando altero um valor ou aciono uma ação?
4. A operação está carregando, foi concluída ou precisa da minha atenção?
5. Qual é o próximo passo útil, especialmente para culinária, alquimia, processamento e outras Life Skills?

## Decisões de produto

- O tour abre automaticamente na primeira visita a cada rota funcional e a cada aba real relevante, após a tela e seus alvos estarem prontos.
- Não há botão, launcher, faixa, skeleton ou mensagem de tutorial inserido no layout da página. O Driver.js e seu popover ficam em camada sobreposta e não participam do fluxo normal do documento.
- Cada rota/aba tem uma chave de superfície estável. Alternar para uma aba ainda não visitada inicia o guia daquela aba; revisitar uma superfície concluída ou dispensada não interrompe o uso.
- Concluir e dispensar são estados distintos para telemetria consentida, mas ambos suprimem o início automático daquela versão. Navegação que interrompe um tour não o marca como visto.
- A pessoa pode rever introduções e redefinir o estado de onboarding em Configurações → Ajuda e tutoriais. Não haverá botão de tutorial em cada tela.
- A ajuda breve e contextual permanece visível junto aos campos mesmo depois do tour. Erros são ligados ao campo; exemplos, unidades e limites não ficam escondidos apenas em tooltips.
- Telas vazias e formulários começam com contexto visual, propósito e próximo passo. Resultados de mercado, receita e recomendação destacam o que a pessoa pode fazer em seguida, priorizando Life Skills.
- Estados assíncronos usam skeletons proporcionais ao conteúdo e mantêm os dados anteriores durante atualizações quando possível. Loading, vazio, erro, sucesso e desabilitado têm aparência e texto próprios.
- Conteúdo público continua vindo do banco quando houver guia ativo. Fallback versionado cobre superfícies sem linha no banco; linha explicitamente desativada suprime fallback. Não se faz seed nem gravação automática no banco.
- O produto continua pt-BR e desktop-first, com operação equivalente por teclado, leitor de tela, movimento reduzido e viewport estreito.

## Superfícies cobertas

A implementação deve derivar a cobertura do conjunto de rotas e componentes que estão ativos com `SCREENSHOT_MVP`, sem duplicar aliases nem habilitar rotas suspensas. A chave identifica a superfície efetiva, composta por rota e, se houver, aba:

| Área                        | Superfícies iniciais                                                                                       | Conteúdo de orientação                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Início e Roadmap            | Home; Roadmap                                                                                              | Como começar, busca de item e caminhos para Life Skills, Mercado, Receitas e planejamento.                                          |
| Mercado                     | Board, detalhe/cotação, calculadora e listas salvas, conforme as abas efetivas do componente               | Busca, região, filtros, cotação/idade do dado, custo, venda, liquidez e ação seguinte. Não afirmar que preço listado garante venda. |
| Receitas e produção         | Catálogo/receita, detalhe de item e Oficina; abas Oficina, Manual e Biblioteca                             | Busca, método, árvore, quantidade de receitas, maestria, rendimento, materiais e opções de compra/produção.                         |
| O que fazer                 | Recomendações                                                                                              | Perfil, preferências, dados ausentes, ranking e por que cada atividade Life Skill aparece.                                          |
| Armazém e inventário        | Armazém e inventário na superfície ativa; alternância de grade/lista é explicada no guia de sua superfície | Quantidade, personagem/local, inclusão/edição, projetos e diferença entre inventário e armazém.                                     |
| Família e personagem        | Personagem, Família e Equipamentos                                                                         | Relação entre personagens, ficha, equipamentos e atributos relevantes para Life Skills.                                             |
| Profissões e rendimento     | Sessões, Maestria e Treino                                                                                 | Entrada, unidade, rendimento, comparação de cenários e interpretação do resultado.                                                  |
| Importações                 | Captura/revisão de Scan e importação de perfil                                                             | Tipo de captura, revisão de todos os itens, estados válido/pendente/removido e confirmação do destino antes de salvar.              |
| Lista de materiais e planos | Shopping e Planos                                                                                          | De onde vêm os materiais, como a lista se relaciona com receitas/projetos e como revisar antes de aplicar mudanças.                 |
| Configurações               | Preferências funcionais da conta e Ajuda e tutoriais                                                       | Preferências, persistência e replay/reset das introduções.                                                                          |

Uma aba de visualização, filtro, faixa do gráfico ou modo de ordenação não recebe um tour separado se não for uma tarefa distinta; seu comportamento é explicado no guia da superfície que contém o controle. Fluxos com estado vazio continuam com ajuda útil e próxima ação, mas o tour só começa quando houver âncoras visíveis e interativas suficientes. Rotas legais, administrativas, redirecionamentos, not-found e funcionalidades suspensas não recebem onboarding de jogador. O editor administrativo de tutoriais continua acessível somente a administradores e não se auto-tutora.

## Experiência do tour

1. O runtime identifica rota, aba e estado de autenticação depois que navegação, resolver e carregamento inicial terminaram. Fluxos protegidos esperam a autenticação e nunca iniciam por cima do modal de login.
2. Se a pessoa ainda não viu a versão da superfície e existe um guia compatível, o popover inicia no primeiro passo. O overlay não bloqueia leitura da tela, rolagem necessária nem interação com o alvo atual.
3. Cada etapa destaca no máximo um controle/seção visível, explica uma decisão e aponta o próximo passo. O texto é curto; conceitos de BDO recebem definição simples e, quando adequado, unidade/exemplo.
4. Navegação pelo tour oferece anterior, próximo, concluir e sair, progresso anunciado e Escape. Não intercepta setas ou teclas usadas em inputs. O foco vai ao popover e retorna ao alvo que iniciou o contexto; se a rota mudar, o tour fecha sem marcar a superfície como vista.
5. Antes de iniciar, o runtime resolve todas as âncoras a partir do registro de código, exigindo uma correspondência única e visível. Passos sem alvo disponível são omitidos com tolerância curta a renderização tardia. Nunca usa `body`, seletor livre ou alvo duplicado.
6. Em telas estreitas, o popover cabe na viewport e não causa overflow horizontal. Com `prefers-reduced-motion`, não há animação nem scroll suave. Cor/contorno não são a única indicação do alvo.

O estado local é associado a `surfaceKey + guideRevision`, sem conta, personagem, formulário ou valor inserido. `completed` e `dismissed` evitam nova abertura automática até a revisão do guia mudar. Erros ao consultar tutorial, armazenamento bloqueado ou guia inexistente não impedem a tela de funcionar; se o armazenamento local não estiver disponível, a sessão mantém a supressão enquanto durar a aba, e a tela deve continuar operável.

## Ajuda de campos e confirmação visual

### Campos

- Campo relevante tem rótulo persistente e instrução curta que responde a pelo menos uma pergunta: finalidade, unidade, formato aceito, exemplo ou efeito no resultado.
- Unidade e convenção são explícitas: silver, itens, operações, nível/maestria, minutos/horas, região e origem de preços, conforme o contexto.
- Ajuda não fica somente em tooltip, placeholder, cor ou etapa do tour. Placeholder mostra exemplo, não substitui rótulo.
- Validação aparece junto ao campo, descreve o problema e como corrigir, preserva o valor digitado e associa mensagem via `aria-describedby`. Confirmação de validade não precisa repetir sucesso em cada tecla.
- Inputs e resultados relacionados têm agrupamento visual e hierarquia BDO consistente, com resumo do objetivo e ação primária. Evitar renderizar uma tela funcional como formulário sem contexto, resultado ou estado de conclusão.

### Estados e ações

- **Carga inicial:** skeleton com forma e dimensões próximas ao conteúdo esperado, `aria-busy` e anúncio acessível sem repetir mensagens. A reserva de espaço impede que controles e conteúdo abaixo saltem quando dados chegam.
- **Atualização:** preservar conteúdo atual quando possível e marcar a área em atualização; não limpar toda a tela por uma busca ou recálculo em andamento.
- **Vazio:** explicar por que está vazio e fornecer o próximo passo possível, como criar/importar personagem, selecionar receita ou atualizar preços.
- **Erro:** descrever o que falhou, o que foi preservado e a ação de retry/correção. Não simular sucesso nem ocultar o erro em toast que desaparece.
- **Salvar/calcular:** comunicar estado pendente no controle/área de resultado sem mudar sua geometria; ao concluir, mostrar resultado ou confirmação adjacente e contextual. Quando falhar, preservar entradas e permitir nova tentativa.
- **Ações destrutivas ou de grande impacto:** confirmar antes, identificando o que será removido/alterado. Para ações reversíveis, preferir feedback de desfazer quando isso for compatível com a operação.
- **Estados selecionados/validados/removidos:** mostrar texto ou ícone sem depender somente de cor; particularmente em Scan, manter todas as linhas visíveis durante a revisão.
- Não usar uma notificação genérica de sucesso para cada mudança de filtro/aba nem toast para informação que precisa permanecer visível.

### Aparência e movimento

Seguir tokens, densidade, tipografia, estados e formas já aprovados para o Black Market, com detalhes discretos inspirados no jogo. Usar ícones sem emojis, hierarquia clara, contraste suficiente e efeitos de hover/foco/transição sem atrair atenção em excesso. Mudanças de estado ocupam área existente ou reservada; helper text persistente substitui texto de validação na mesma região quando aplicável. Respeitar `prefers-reduced-motion` e não animar dimensões que movem o restante da página.

## Conteúdo e gestão

- A biblioteca `TUTORIAL_SCREEN_REGISTRY` passa a definir cada `surfaceKey`, rota, aba, nível de acesso e suas âncoras válidas. O `screen_key` atual é `varchar(64)`, então chaves estáveis curtas podem ser acrescentadas sem migration.
- API pública, validador, editor e fallback usam o mesmo registro. Editor mostra nomes compreensíveis de rotas/abas; não expõe chaves técnicas como única identificação.
- Guia pt-BR pode ter até 12 etapas por superfície; título de até 100 caracteres e corpo de até 360 caracteres por etapa. Guias são focados por aba para evitar tour longo. Etapas gerais sem âncora são permitidas apenas para contexto inicial/final.
- Guias ativos do banco prevalecem. A ausência de registro permite fallback pt-BR versionado. Registro desativado continua sendo decisão editorial e não deve ser sobreposto por fallback. Não usar fallback silencioso para locale sem tradução revisada.
- Editar/publicar guias mantém a validação de âncoras, texto simples, autorização server-side, controle de concorrência e escrita atômica existentes. Conteúdo do banco jamais é HTML executável.
- Ajuda dos campos é conteúdo de produto versionado junto da interface e localizado pelo Angular. Não adicionar outra tela de CMS para dicas de campos nesta etapa; consolidar revisão pelo XLIFF e pelas specs de cada fluxo.
- Reset/replay de onboarding é local e não altera banco, personagem ou estado de domínio.

## Privacidade, SSR e telemetria

Manter a regra existente: Analytics registra início, conclusão e dispensa somente com consentimento. Pode enviar a chave de superfície e revisão do guia; nunca texto do guia, passo/âncora específica, URL completa, dados de conta, campos, preços pessoais, personagem, inventário, captura ou armazenamento. Nenhum progresso do tour ou dica de campo exige nova tabela, cookie ou identificador.

SSR e hidratação não acessam `window`, `document`, `localStorage` nem carregam Driver.js no servidor. Falhas de tutorial não interrompem resolver, renderização, cálculo, navegação ou operações da funcionalidade principal.

## Critérios de aceite

1. Primeira visita inicia automaticamente um tour para cada rota/aba funcional registrada; a visita subsequente não o reabre depois de concluir ou dispensar.
2. Alterar revisão publicada do guia habilita a nova introdução apenas para a superfície alterada; navegar para outra rota no meio do tour não grava conclusão.
3. Não há launcher, botão, mensagem de loading/erro ou elemento reservado de tutorial no layout das páginas; comparações antes/depois comprovam ausência de layout shift causado pelo onboarding.
4. As rotas e abas reais do MVP descritas nesta especificação têm guias pt-BR versionados e âncoras revisadas. Rotas suspensas, legais, administrativas e aliases não iniciam tour.
5. A guia não começa antes da autenticação, sobre o login, nem enquanto as âncoras estiverem ocultas, duplicadas ou ainda não prontas.
6. Toda etapa é operável com teclado, foco visível e restaurado, progresso anunciado, texto acessível, Escape para sair e movimento reduzido respeitado.
7. Todo formulário funcional tem título/propósito, hierarquia visual e ação seguinte. Cada campo importante tem instrução persistente contextual e unidades/exemplo adequados; nenhum depende apenas do tour ou do placeholder.
8. Os fluxos assíncronos têm estados distintos de carga, atualização, vazio, erro e sucesso. Skeletons correspondem ao conteúdo; salvar/erro não apaga entradas; atualizações não removem dados úteis.
9. Confirmações indicam a ação realmente concluída ou o resultado produzido. Erros oferecem correção/retry; ações destrutivas indicam seu impacto; estados não dependem só de cor ou animação.
10. Nenhuma orientação altera fórmula, preço, inventário ou outra regra de domínio. Exemplos indicam claramente que são ilustrativos; qualquer alegação de regra do jogo mantém fonte própria e atualizada.
11. Fallback versionado atende todas as superfícies pt-BR sem registro ativo no banco; registro ativo prevalece, registro desativado suprime fallback, e nenhum seed/migration é necessário.
12. Eventos de tutorial só saem com consentimento e dados allowlisted. SSR e a tela principal continuam funcionais mesmo sem guia, sem localStorage ou com falha da API de tutorial.
13. Cobertura de specs valida mapeamento rota/aba, auto-start/idempotência, dismiss/completion/versionamento, navegação, âncoras ausentes/duplicadas, auth, acessibilidade, privacidade e layout estável. QA visual cobre desktop 1440×900 e viewport 390×844.

## Pesquisa competitiva pública — 18/10/2026

| Concorrente  | Evidência pública consultada                                                                                                                                                            | Observação e limite                                                                                                                                                                                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BDO Workshop | [Página pública](https://bdoworkshop.com/)                                                                                                                                              | Anuncia ferramentas de aprimoramento, progressão de equipamento, crafting, mercado e scans; requer JavaScript. A superfície interativa não ficou disponível no leitor, então não foi possível verificar tours, dicas nos campos ou estados de operação.                                                                                                       |
| BDO Codex    | [Catálogo de receitas de Culinária](https://bdocodex.com/us/recipes/culinary/)                                                                                                          | Exibe navegação de database, filtros por nível/efeito/tipo e colunas de materiais, peso, produto e EXP; a tabela ainda mostrava loading de servidor. É uma referência de dados, não evidência de orientação contextual de um planejador. Não foi encontrado equivalente público de tour ancorado nesta consulta; isso não prova inexistência em outras áreas. |
| BDOLytics    | [Página de receita consultada](https://bdolytics.com/en/cooking/9256:72a1fd6d2ac5)                                                                                                      | A URL respondeu com redirecionamento, mas o leitor não recebeu texto renderizado. O relatório anterior documenta cálculo público de entradas/retornos, porém não foi possível observar esta sessão atual nem confirmar tours ou ajuda persistente.                                                                                                            |
| Garmoth      | [Tools](https://garmoth.com/tools/), [Family Life Tools](https://garmoth.com/guides/post/family-life-tools), [Gear Planner guide](https://garmoth.com/guides/post/garmoth-gear-planner) | A navegação agrupa Market, Tools, Gear Planner e Guides. Guias editoriais explicam passos e conceitos de Life Skills; o guia do planner contextualiza slots, builds, stats e Life Skill gear. Não foi verificado tour ancorado na UI. Essas observações apoiam combinar ajuda permanente e tour interativo, sem copiar layout ou fórmulas.                    |

Esta pesquisa informa organização e conteúdo da ajuda, não regras de jogo nem cálculos. “Não verificado” significa que a interface pública consultada não permitiu confirmar o recurso.

## Relação com a especificação anterior

`2026-10-15-guided-tutorial-library-design.md` continua como registro histórico do desenho original e da implementação da biblioteca dinâmica. Esta especificação substitui explicitamente quatro decisões para a próxima mudança: acionamento manual passa a ser automático na primeira visita; o launcher por página deixa de existir; cobertura amplia-se de poucas telas para todas as superfícies funcionais e abas reais do MVP; e ajuda contextual/feedback visual passa a complementar os tours.

Mantêm-se as decisões anteriores de texto simples seguro, allowlist de âncoras, autorização server-side, controle de concorrência, consentimento de analytics, SSR, reduced motion e precedência editorial do banco sobre o fallback.

## Fora de escopo

- Refazer integralmente todas as páginas ou mudar a navegação do MVP.
- Alterar cálculos de maestria, receitas, mercado, lucro, impostos, rendimento, OCR, mercado ou dados pessoais.
- Criar uma central de documentação, CMS de dicas de cada campo, papel administrativo novo, migration ou seed.
- Copiar assets, textos ou implementação de concorrentes.
- Inserir botões persistentes de ajuda/tutorial em cada tela.

## Fontes no repositório

- `docs/ACTIVE_CONTEXT.md`, seções 161–168: decisões recentes, estado do MVP, padrões de loading e telas atuais.
- `docs/superpowers/specs/2026-10-15-guided-tutorial-library-design.md`: contrato original da biblioteca dinâmica.
- `docs/research/tutorial-versioned-fallback-review-2026-10-18.md`: fallback já aprovado e pesquisa pública prévia.
- `docs/research/competitor-review-playbook.md`: método e limites da análise competitiva.
- `packages/shared/src/tutorials.ts`, `packages/shared/src/mvp-scope.ts`, `apps/web/src/app/app.routes.ts`: registro e roteamento atuais.
- `apps/web/src/app/core/tutorial.service.ts`, `apps/web/src/app/shared/tutorials/tutorial-launcher.ts`, `apps/api/src/tutorials/`: implementação existente a evoluir depois da aprovação do plano.
- `.agents/skills/bdo-ui-design/SKILL.md`, `.agents/skills/ui-design/SKILL.md` e Angular Developer: tokens e práticas de interface do produto.
