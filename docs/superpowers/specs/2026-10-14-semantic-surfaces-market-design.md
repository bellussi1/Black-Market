# Mercado e fluxo principal: superfícies semânticas

**Estado:** proposta escrita para revisão. A direção visual já foi aprovada; a implementação deste piloto ainda depende da revisão desta especificação.

## Objetivo

Deixar o Mercado Central desktop-first, legível e rápido para responder: qual item está selecionado, qual é a referência de preço atual, há estoque, o que o histórico mostra e quanto sobra depois das taxas? Usar a moldura completa para cada janela ou área independente e organizar seu conteúdo interno com espaço, alinhamento e divisórias discretas. Manter molduras em slots de itens e controles.

O primeiro piloto cobre Mercado, cotação e gráfico. Receitas/Crafting, Scan/Armazém e “O que fazer?” ficam para fatias posteriores, usando os mesmos tokens compartilhados sem reescrever seus cálculos.

## Auditoria baseada no estado atual

Verificados os templates e componentes `market-page`, `market-board`, rotas, identidade e registros recentes em `docs/ACTIVE_CONTEXT.md`. O navegador conseguiu expor a árvore de acessibilidade de `/market`, mas a tela estava em erro de disponibilidade; uma navegação seguinte ao localhost foi recusada. Portanto, os detalhes abaixo sobre estrutura atual vêm do código e dos registros de auditorias anteriores, não de uma nova sessão visual navegável.

1. **Preço que falta na lista.** O quadro apresenta média observada de 30 dias, estoque e volumes, mas não o preço corrente. A regra de referência usada pelo cálculo — preço corrente quando há estoque e preço máximo quando não há — deve aparecer junto ao item, com a origem identificada.
2. **Leitura da tabela.** O cabeçalho contém seis colunas ordenáveis, enquanto cada linha é um único botão dentro de uma célula `colspan="6"`. Seu `aria-label` anuncia o nome do item, não as métricas sob cada cabeçalho. A navegação assistiva perde a relação tabular e o contexto de seleção.
3. **Filtros e escopo.** A página informa que algumas ordenações e filtros afetam apenas itens da página atual, mas o aviso fica abaixo dos controles. O filtro de estoque declara `radiogroup` sem estado acessível de opção selecionada. O escopo precisa ser perceptível junto do controle, e a seleção precisa ter semântica consistente.
4. **Cotação, cálculo e salvamento.** O Mercado tem quatro vistas — quadro, cotação, calculadora e cotações salvas. Selecionar um item leva à cotação; a calculadora continua sendo outra vista. Há `saveLive()` no componente, porém nenhum acionador correspondente no template. A calculadora deve aceitar diretamente a cotação selecionada, e salvar uma observação atual deve acontecer junto dela, sem recadastrar o item. A vista também tem “Gráfico e detalhes” para rolar até o histórico e links separados para catálogo e receitas; manter os dois links como ações secundárias e não duplicar a navegação ao gráfico quando ele estiver visível no detalhe.
5. **Detalhe e gráfico já existem.** A cotação mostra preço, estoque, limites e última venda; a seção de histórico tem um gráfico SVG próprio com seletores de período e métrica, além da tabela de observações. O trabalho é melhorar legibilidade, hierarquia e acessibilidade desse gráfico existente. Não desenhar curvas através de lacunas nem apresentar ausência de observações como zero.
6. **Confiança nos dados.** Auditorias anteriores registraram respostas 404 para consultas de mercado em SA e diferenças relevantes de lucro entre o Black Market e o BDOLytics em receitas examinadas. A sessão local atual também exibiu estado de mercado indisponível. Não se deve promover lucro ou giro como recomendação confiável antes de corrigir e validar disponibilidade, região, preço, rendimento e semântica do volume.
7. **Volume.** Há rótulos que dizem “unidades negociadas”, mas o registro de auditoria ainda não comprova se a origem mede unidades, ordens ou transações em todas as janelas. Preservar o valor bruto e sua janela; só usar “unidades” depois de verificar o contrato do provedor. Distinguir zero observado de histórico insuficiente.

## Direção de interface

### Tokens compartilhados

Centralizar tokens semânticos em CSS, mantendo valores vindos da paleta existente:

- superfície de janela: carvão e borda externa;
- superfície elevada para seleção, hover e estados ativos;
- divisória interna discreta;
- bronze para barra de título, foco de tarefa e seleção;
- escalas de espaço para grupos, conteúdo de janela e controles.

Não alterar de uma vez a semântica global da classe `.panel`. O piloto deve aplicar os tokens no Mercado e permitir migração por componente. A barra bronze identifica a janela; não repetir borda e fundo em cada grupo interno. Slots de item e controles preservam suas molduras.

### Composição do Mercado

- Manter título e região visíveis. Região continua persistente e afeta quadro, cotação, histórico e cálculo.
- A lista e o detalhe do item são áreas independentes no espaço principal e podem ter molduras próprias. Busca, filtro, paginação, fatos da cotação e seletor de métrica são grupos internos sem cartões aninhados.
- No quadro, mostrar preço de referência atual com origem, média observada de 30 dias como dado secundário, estoque e volumes disponíveis. Ordenar por preço usando a mesma referência e regra do cálculo. Manter explícito se o resultado é global ou apenas da página atual.
- Usar tabela com células reais para nome, preço, estoque e períodos. O item continua selecionável por teclado e seu nome acessível pode incluir as métricas relevantes; cabeçalhos mantêm ordenação e relação com as células.
- Na cotação selecionada, manter fatos atuais e histórico lado a lado no desktop. O gráfico existente precisa de escalas e rótulos suficientes para interpretar valor e tempo, pontos inspecionáveis por teclado/leitor de tela e lacunas fiéis às observações. A tabela de observações permanece como alternativa acessível.
- Colocar **Calcular venda** e **Salvar cotação** junto à cotação escolhida. A calculadora recebe preço e item selecionados; quantidade e custo continuam editáveis. Cotações salvas mantêm a informação de que ficam neste navegador.
- Manter “Mercado”, “Cotação”, “Calcular venda” e “Salvas” como vistas do mesmo espaço, com controle de alternância que anuncie seleção corretamente. Eliminar voltas redundantes: quando um item está selecionado, o detalhe oferece cálculo e salvamento, sem obrigar a alternar para recadastrar a mesma cotação.
- Reescrever o estado vazio de cotação para indicar a ação disponível; não dizer “escolha uma compra ou venda” se a interface não oferece essa escolha.

### Navegação e escopo geral

O usuário identificou quatro pilares: Mercado; Crafting; Scan + Armazém; e “O que fazer?”. Preservar as URLs existentes para favoritos e links compartilhados. Depois do piloto do Mercado, avaliar a navegação para:

- reunir `Explorar receitas` e `Calcular produção` sob uma entrada de Crafting com modos claros, preservando catálogo e análise de produção como tarefas distintas;
- colocar importação de Scan junto do fluxo de Armazém, mantendo a revisão OCR independente quando for necessária;
- manter Família/maestria e lista de materiais acessíveis como recursos do espaço do aventureiro, sem ocupar a mesma hierarquia visual das quatro tarefas principais;
- manter Roadmap e ferramentas independentes fora do primeiro nível das tarefas diárias.

Não remover rotas nem funcionalidades com base apenas em aparência ou sem dados de uso. Primeiro consolidar pontos de entrada, preservar deep links e confirmar que os atalhos internos continuam disponíveis.

## Triagem das solicitações anteriores

| Tema                                    | Estado encontrado                                                                                                              | Próxima ação focada                                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marca lateral e favicon                 | Concluídos em commits anteriores; favicon e marca lateral estão separados.                                                     | Preservar os dois ativos independentes.                                                                                                                                                                           |
| Itens e quantidades OCR                 | Revisão manual, validação explícita, ícones e aplicação automática de K/M têm entregas registradas.                            | Acurácia real ainda não está certificada: registro anterior tem 13 capturas e 29 rótulos em calibração, sem conjunto de avaliação independente. Medir com imagens reais revisadas antes de alegar taxa de acerto. |
| Receitas: maestria, NPC e peixes        | Há lógica e testes registrados para maestria por profissão, preços de NPC e peixes equivalentes desidratados.                  | Repetir a matriz de lucro com preços e dados de região validados; preservar origem/preço efetivo visíveis.                                                                                                        |
| Ícones nas receitas                     | Correção dinâmica por ID de catálogo registrada para toda a cadeia.                                                            | Continuar usando ícones reais de catálogo; sem fallback de inicial como resultado final.                                                                                                                          |
| Retornos previstos e mudança de fórmula | Lista de retornos consolidada e troca de fórmula sem recarga têm implementação e testes.                                       | Preservar estado da árvore ao alternar fórmula; corrigir falhas existentes de `recipe-tree.spec.ts` em uma tarefa separada.                                                                                       |
| Volume e rentabilidade das receitas     | Auditoria apontou diferenças contra BDOLytics e cobertura de histórico insuficiente.                                           | Tratar confiabilidade regional e semântica do volume antes de ordenar “O que fazer?” por demanda.                                                                                                                 |
| Roadmap sem prazos                      | Tela pública e editor com conteúdo no banco têm implementação local.                                                           | Validar migração e papel administrativo no ambiente de destino antes de considerar publicado.                                                                                                                     |
| Analytics e páginas legais              | Consentimento em cookie e textos legais foram implementados; analytics de produção não foi ativado.                            | Verificar a configuração e retenção no serviço antes da ativação em produção.                                                                                                                                     |
| Login somente social                    | `IdentityService` tem Google e também um método de link por e-mail; não há implementação Steam localizada.                     | Revisar a restrição para permitir apenas Google/Steam, configurar Steam e confirmar fluxo no provedor. Não criar conta ou perfil real durante a auditoria.                                                        |
| Staging com grupo de feedback           | Há registro de staging local e smoke test; não há evidência neste contexto de implantação compartilhada com dez participantes. | Separar a preparação do ambiente e do convite de usuários do trabalho de UI; definir acesso e política de dados antes de convidar.                                                                                |

## Ordem de trabalho

1. **Confiabilidade do Mercado e das receitas.** Reproduzir e corrigir a indisponibilidade SA; validar preço atual/máximo e proveniência; comprovar a unidade e cobertura do volume; repetir comparações de lucro em receitas de Culinária e Alquimia. Resultado financeiro incompleto permanece marcado como incompleto.
2. **Piloto visual do Mercado.** Implementar tokens de superfície localmente, quadro tabular acessível, referência de preço atual, continuidade cotação → cálculo/salvamento e gráfico interpretável. Preservar comportamento, cache e URL durante a refatoração.
3. **Validação ponta a ponta.** Verificar os estados de dados fresco, cacheado, desatualizado, sem estoque, sem histórico e erro; teclado, leitores de tela, zoom, texto longo e layout desktop. Fazer uma verificação móvel de regressão, sem priorizar redesenho mobile.
4. **Migrações restantes.** Aplicar a linguagem aprovada em Receitas/Crafting, Scan/Armazém e “O que fazer?” em commits pequenos, cada um revisado sem alterar cálculos não cobertos por testes existentes.

## Critérios de aceitação do piloto

- Em uma olhada na tabela é possível distinguir preço atual de referência, média histórica, estoque e volume disponível, incluindo origem e data do dado.
- A tabela expõe colunas e valores associados semanticamente; seleção e ordenação funcionam sem mouse.
- Abrir uma cotação permite calcular após taxas ou guardar a observação sem procurar outro formulário.
- Gráfico e tabela representam as mesmas observações e não inventam pontos ou unidades.
- Estados de fonte indisponível, cotação antiga, sem estoque e histórico insuficiente explicam claramente o limite e mantêm ações seguras.
- Os grupos internos deixam de formar quadros aninhados; janela, áreas independentes, slots e controles mantêm hierarquia visual clara.
- Preços, itens, categorias, disponibilidade, históricos e conteúdo exibido vêm de catálogo, API ou estado de cache identificado. Nenhum item, preço, métrica de mercado ou conteúdo de roadmap é introduzido como dado de produto hardcoded.
- Seleção de item, região e deep links são preservados. Não se apaga rota nem atalho durante a consolidação visual.

## Limites deste documento

Esta especificação cobre o piloto do Mercado e registra a triagem da conversa. Não autoriza mudanças no mecanismo de dados, autenticação, configuração de analytics, implantação compartilhada de staging ou exclusão de rotas. Esses trabalhos continuam separados. A unidade de volume e a compatibilidade da fonte SA precisam de validação antes da implementação de indicadores financeiros dependentes.
