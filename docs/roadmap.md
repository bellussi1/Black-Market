# Roadmap de funcionalidades — Black Market

Atualizado em **24 de outubro de 2026**. Público inicial: jogadores do mercado **SA**, em **português brasileiro**, com foco em economia, profissões e planejamento pessoal.

## Como interpretar a prioridade

**Escopo ativo em 9/10/2026:** importação e gerenciamento de capturas, mercado e [exploração de receitas](recipe-explorer.md). A árvore reutiliza os estoques revisados; outras funcionalidades abaixo permanecem planejamento preservado, sem reativação automática.

Este roadmap parte do código e da [cobertura atual](project-feature-checklist.md), da [visão do produto](product-vision.md), da [pesquisa das referências](research/README.md) e da [auditoria de produção](production-audit.md). Não existe analytics externo validado: frequência, alcance e ordem de uso abaixo são **hipóteses de produto**, não números de audiência dos concorrentes ou do Black Market.

O objetivo inicial é completar esta jornada:

**Encontrar um item → conhecer seu preço → comparar vender ou produzir → usar meus materiais → escolher uma atividade → registrar o resultado.**

Critérios de decisão, nesta ordem:

1. Confiabilidade dos dados e segurança da decisão do jogador.
2. Alcance e frequência esperada de uso no público inicial.
3. Redução de esforço para concluir uma tarefa útil.
4. Dependências disponíveis e esforço de implementação/manutenção.
5. Diferenciação e retorno recorrente ao produto.

**P0** desbloqueia lançamento confiável; **P1** completa a experiência central; **P2** melhora retenção e aprofunda modelos; **P3** expande públicos e ferramentas especializadas. Esforço **P/M/G** é relativo a um desenvolvedor: pequeno, médio ou grande. Não representa prazo contratado. Features com dados incertos podem exigir mais pesquisa que código.

## 1. Portas de entrada para o lançamento — P0

Estas tarefas têm prioridade operacional, independentemente de quantas vezes um jogador as vê. Não reimplementar controles já concluídos; ativar e verificar as partes pendentes.

| ID  | Entrega                                        | Já existe                                                                                                         | Falta / critério de aceitação                                                                                                                                                                                   | Dependências                                                                |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| D1  | Catálogo atualizado, com cobertura verificável | Importação versionada; dataset SA/pt ativo com 74.523 itens e 10.683 relações de receita, importado em 18/10/2026 | Definir rotina após patch, verificar diferenças antes de promover versão, registrar data/origem e lacunas; testar retorno à versão anterior. Não prometer todos os itens/receitas completos                     | Instalação atualizada do jogo, extração válida e revisão de direitos de uso |
| D2  | Mercado SA confiável                           | Adaptador, cache, histórico e coletor configurável                                                                | Validar acesso permitido ao fornecedor; mostrar região, origem e horário. Preço indisponível/antigo não vira zero nem lucro confirmado. Enquanto bloqueado, manter cotação manual explícita e coletor desligado | Fonte permitida; dados D1 para nomes/ícones; teste da integração externa    |
| O1  | Publicação e operação recuperável              | Compose de produção, SSR, controles de segurança, logs, health/readiness e scripts de backup                      | Domínio/HTTPS reais; volume exclusivo; backup agendado e fora do host; restauração ensaiada; monitor e e-mail de queda/recuperação validados; rollback executável                                               | Host/domínio e configuração externa; ver auditoria                          |
| O2  | Privacidade e qualidade de lançamento          | Consentimento, páginas legais, footer e instrumentação preparada                                                  | Revisão humana dos documentos/bases/licenças; verificar mobile, teclado, CSP e prints no navegador real; ativar analytics apenas após consentimento e validação. Login é opcional para a base pública           | Responsável informado; ambiente O1; fornecedores escolhidos                 |

**Limites conhecidos:** faltam nomes localizados em 730 registros; não há dataset inglês importado; a receita de Edania #1407 está verificada para lotes 1/10/100, mas outras relações de manufatura continuam incompletas e não devem ser inferidas. Mercado ao vivo e publicação externa continuam pendentes. A curva completa de rendimento de coleta por maestria não foi extraída. Veja a [evidência de receita e custos de Edania](research/edania-harmony-audit-2026-10-24.md).

Se D2 não puder ser validado, é possível lançar catálogo e ferramentas com entradas manuais, reduzindo a promessa do lançamento. Não apresentar esse lançamento como mercado atualizado ou recomendação automática baseada em preços atuais.

## 2. Ordem de funcionalidades por uso esperado

Esta é a ordem padrão do backlog. A leitura de prints é um diferencial importante, mas depende de catálogo e revisão confiáveis; não precisa bloquear consultas públicas.

| Ordem / ID | Prioridade e próxima entrega                                                                                                                                            | Base implementada                                                                                            | Uso esperado / valor                                                        | Esforço  | Dependências                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 / F1     | **P1 — Encontrar qualquer item ou receita com facilidade**: busca por nomes, sinônimos revisados e termos comuns, filtros simples e recuperação de buscas sem resultado | Busca por nome/ID/categoria e fichas compartilháveis com ícones e relações                                   | Muito frequente; entrada para praticamente todas as demais jornadas         | M        | D1; resolver lacunas reais sem inventar itens                                                                                                     |
| 2 / F2     | **P1 — Mercado por nome e decisão de venda**: integrar busca/ficha com preço, imposto, estoque e data; deixar favorito e comparação acessíveis                          | Consulta por ID/variante/região, imposto, favoritos, histórico observado e gráfico de preço/estoque/contador | Frequente; consulta rápida antes de comprar/vender                          | M        | F1 + D2 para preços externos; volume diário/média de vendas dependem de fonte permitida; manual continua possível                                 |
| 3 / F3     | **P1 — Receitas e “vale produzir?”**: fluxo guiado da receita ao cálculo, preencher o que tiver fonte válida e destacar o que exige confirmação                         | Receitas, lucro, cadeias recursivas, comprar/produzir, subprodutos e presets                                 | Frequente entre jogadores de profissões; resultado financeiro direto        | M        | F1; preços F2 ou entradas manuais; rendimento/tempo confirmados                                                                                   |
| 4 / F4     | **P1 — Meu armazém sem dificuldade**: entrada manual curta, edição em lote, indicação de snapshot parcial/completo e proteção contra substituição indevida              | Estoque por local/região, metas, CSV com prévia e reservas                                                   | Cadastro inicial e atualização recorrente; destrava recomendações pessoais  | M        | D1; IDs e quantidades válidos. CSV é formato da plataforma, não exportação nativa do BDO                                                          |
| 5 / F5     | **P1 — Importação por prints confiável**: calibrar recorte/grade, facilitar revisão e tratar várias capturas com sobreposição                                           | OCR numérico, candidatos por ícone, recortes e aplicação confirmada; imagens ficam na memória do navegador   | Recorrente para quem atualiza estoque; maior redução de trabalho manual     | G        | F4 + amostras reais autorizadas; critérios de precisão abaixo                                                                                     |
| 6 / F6     | **P1 — “O que fazer agora?”**: unificar recomendações em poucos resultados explicados e uma ação para montar o plano                                                    | Sugestões a partir de sessões, receitas salvas, estoque, tempo, energia e orçamento                          | Recorrente; principal proposta de valor pessoal                             | M        | F3 + F4 + perfil mínimo; F5 facilita, mas não bloqueia. Dados atuais ou premissas manuais explícitas                                              |
| 7 / F7     | **P1 — Coleta e profissões por prata/hora**: entrada curta de sessão, reutilização e comparação de resultados observados                                                | Sessões, prata/hora/energia, média ponderada, tempo ativo/AFK, investimento e XP observado                   | Frequente entre jogadores de profissões; alimenta decisões e retorno        | M        | Preços F2 ou valores informados; registro de tempo/custos. Maestria isolada não determina rendimento                                              |
| 8 / F13    | **P1 — Império de nodes e trabalhadores; P2 — modelos automáticos**: validar o planejador e ampliar fontes de produção/cidade/espécie                                   | Trabalhadores/tarefas salvos, ciclos observados, custos de cidades, CP compartilhado e ranking diário        | Recorrente para jogadores AFK; antecipado por decisão do responsável        | M/G      | Dados próprios de workload/distância/drops/habilidades para automação; preços F2 ou manuais                                                       |
| 9 / F8     | **P2 — Planos que acompanham a rotina**: transformar sugestão em lista clara, acompanhar faltantes e reutilizar planos                                                  | Planos, tarefas, materiais, reservas e status                                                                | Recorrente para usuários engajados; conecta decisão à execução              | P/M      | F6 + F4; manter proteção contra dupla reserva e conclusão sem débito automático do estoque                                                        |
| 10 / F9    | **P2 — Conta e continuidade entre dispositivos**: ativar provedor e validar onboarding/sincronização simples                                                            | Integração opcional, cópias versionadas, conflito e exclusão                                                 | Recorrente para usuários de mais de um dispositivo; evita perda de trabalho | M        | O1/O2 + fornecedor configurado; duas contas isoladas, sessão expirada e conflito testados. Pode antecipar se troca de dispositivo bloquear adoção |
| 11 / F10   | **P2 — Favoritos e evolução do mercado**: histórico legível, comparação e avisos dentro da plataforma                                                                   | Favoritos e persistência de cotações                                                                         | Recorrente; facilita retorno sem exigir notificações externas               | M        | D2 + amostragem/retenção definidas; só apresentar histórico realmente coletado                                                                    |
| 12 / F11   | **P2 — Coleta por maestria e rota com modelo validado**: previsões quando houver fontes suficientes, calibradas por sessões                                             | Perfil de maestria e sessões; ainda sem curva completa                                                       | Potencialmente frequente, mas confiabilidade é a dependência principal      | G        | F7 + fontes versionadas por patch/atividade, rendimentos e tempos; diferenciar observado/estimado/dados insuficientes                             |
| 13 / F12   | **P2 — Gear e aprimoramento mais completos**: ampliar regras por item/nível, custos de upgrade e failstack                                                              | Builds/AP/DP, referências de aprimoramento/Caphras, probabilidades e custos configuráveis                    | Episódico no público inicial; aumenta utilidade fora de profissões          | G        | Regras verificadas de destruição/rebaixamento/proteção/FS; preços F2 ou manuais                                                                   |
| 14 / F14   | **P3 — Calculadoras e referências especializadas**: priorizar uma família por demanda validada                                                                          | Buffs/cristais, caixas, Night Vendor e referências gerais com limitações                                     | Segmentado/episódico; não justifica implementar todas simultaneamente       | Variável | Dataset e regras de cada família; evidência de uso ou entrevistas                                                                                 |

Atualização por solicitação do responsável: o império de nodes/trabalhadores foi antecipado de P3 para P1 como planejador observado. A automação equivalente ao Workerman fica em P2, com dependências verificáveis. Ver [escopo, tutorial e próximos incrementos](worker-empire.md). Não é uma prioridade medida por analytics.

F14 contempla as famílias mapeadas nas referências: entrega imperial, fazenda, cavalos/treinamento/criação, barcos/marinheiros/barter, Royal Workshop, quests/knowledge e guias. Não estão todas implementadas. Cada uma precisa de proposta, fonte, teste das regras e prioridade própria antes de entrar em execução.

## 3. Execução por entregas, sem calendário fictício

### Entrega A — Consulta pública útil

**Sequência:** D1 e F1 → D2/F2 → F3. O1/O2 avançam em paralelo quando não dependem de decisões externas.

- Escolher uma amostra versionada com itens/receitas usados pelo público inicial, incluindo nomes ambíguos, item sem receita e item sem preço.
- Buscar por nome em pt-BR, abrir ficha, consultar cotação e iniciar cálculo sem login.
- Apresentar origem/data e lacunas; nunca preencher ausência com uma estimativa silenciosa.
- Validar o fluxo em mobile/teclado; qualquer erro deve informar uma próxima ação compreensível.
- Lançamento público depende das verificações O1/O2. Cobertura técnica já existe: entrega significa completar e validar a experiência, não refazer essas páginas.

### Entrega B — Meu estoque vira uma decisão

**Sequência:** F4 → F6 → F8; F5 avança após validação da entrada manual. F7 pode avançar antes de F5. F13 (império de trabalhadores) integra esta entrega; modelos automáticos dependem de fontes adicionais na Entrega D.

- Jogador informa poucos materiais e um perfil mínimo; campos avançados são opcionais.
- Comparar vender, produzir e atividade observada com custo de oportunidade do estoque, capital necessário, tempo e faltantes.
- Cálculos mostram rendimento/preço assumidos; recomendar “dados insuficientes” quando necessário.
- Criar plano a partir da decisão e manter reservas consistentes; nenhuma sugestão altera o estoque físico automaticamente.
- Não exigir preenchimento completo de gear e onze maestrias para uma primeira comparação simples.

### Entrega C — Prints com revisão rápida

**Sequência:** validar prata/maestria numérica → estoque → capturas com rolagem/sobreposição → equipamento.

- Montar conjunto de avaliação autorizado e separado das imagens usadas para ajustar reconhecimento: diferentes resoluções, escalas, locais, ícones parecidos e quantidades abreviadas.
- Medir separadamente identificação correta de item, leitura exata da quantidade, itens não reconhecidos, tempo de revisão e duplicação entre capturas.
- **Meta proposta para piloto, ainda não medida:** em pelo menos 30 capturas e 300 células revisadas, atingir 95% de acerto de item e 95% de quantidade exata dentro do escopo suportado. Reportar também cobertura e resultado por resolução/escala; esses números não certificam generalização.
- Nunca aplicar sem confirmação, mesmo ao atingir a meta. Candidato ambíguo exige escolha; captura parcial não zera itens ausentes; repetir importação não duplica quantidades silenciosamente.
- Validar com pelo menos cinco jogadores se importar e revisar é mais rápido que digitar o mesmo conjunto. Se não for, manter como experimental e melhorar o fluxo.
- Preservar processamento no navegador nesta fase; sem uploads persistentes, worker remoto ou serviço de IA por necessidade hipotética.

### Entrega D — Retenção e previsões mais úteis

**Sequência:** F7/F8 → F9/F10 → F11 e modelos automáticos de F13. Antecipar F9 quando houver demanda real de continuidade entre dispositivos.

- Reutilizar sessões, planos e favoritos sem novo cadastro de todos os dados.
- Validar sincronização explícita, conflito, isolamento e exclusão antes de divulgar contas.
- Histórico só ganha destaque quando houver amostras suficientes e horários claros.
- Previsão por maestria exige conjunto de regras verificável e comparação com sessões não usadas na calibração; definir tolerância por atividade antes de avaliar. Não adotar uma margem universal sem dados.

### Entrega E — Expansão guiada por demanda

Executar F12 e F14 uma família por vez, além da expansão visual do mapa em F13. Outros idiomas/mercados vêm depois de estabilizar SA/pt-BR: preservar as dimensões de região/idioma já existentes, mas obter traduções, fontes de preço e validação próprios antes de habilitar cada combinação.

## 4. Como confirmar ou mudar esta ordem

Ativar o [plano de analytics](analytics.md) somente após consentimento e validação externa. A instrumentação atual não mede todos os cálculos nem todas as conclusões; complementar apenas ações necessárias para avaliar a entrega em execução, usando o serviço tipado e propriedades permitidas. Não mandar texto livre, prints, inventário, saldo ou identidade para medir uso.

| Pergunta                | Medida para decisão                                                      | Limitação / ação necessária                                                                           |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| O que é mais utilizado? | Navegadores únicos por família + conclusões úteis por semana             | Pageviews não comprovam sucesso; comparar alcance e conclusão separadamente                           |
| A busca resolve?        | Busca iniciada → resultado escolhido → ficha aberta; taxa sem resultados | Instrumentação complementar necessária; não transmitir texto da pesquisa                              |
| O cálculo ajuda?        | Receita selecionada → cálculo confirmado → plano salvo                   | Não contar cada alteração reativa como conclusão; completar eventos do fluxo                          |
| Prints reduzem esforço? | Leitura iniciada → revisão → aplicação, tempo e correções agregadas      | Eventos existentes cobrem parte do funil; precisão vem de avaliação consentida, não de pageviews      |
| Sugestões viram ação?   | Sugestão consultada → plano criado → resultado de sessão registrado      | Completar eventos correspondentes; salvar plano não prova que jogador o executou no jogo              |
| Há retorno?             | Retenção D7/D30 e WAU/MAU por coorte                                     | Medir navegadores consentidos, não toda a população; primeiro aguardar a coorte amadurecer            |
| Onde há abandono?       | Início e conclusão correspondentes, na mesma definição de jornada        | Sem início instrumentado não atribuir abandono; não coletar mais dados só para reconstruir indivíduos |

**Cadência proposta:** revisar problemas críticos semanalmente e ordenar o backlog a cada quatro semanas usando entrevistas, suporte e métricas disponíveis. Em baixo volume, priorizar observação de tarefas com 5–10 jogadores; não concluir tendências com percentuais de amostras mínimas. D7 requer sete dias de acompanhamento; D30 requer trinta.

Não usar crescimento de pageviews como único objetivo. O sucesso central é o jogador concluir uma decisão compreensível e voltar para uma nova decisão. Esforço, fonte disponível e custo de manter regras por patch continuam critérios mesmo para páginas populares.

## 5. Custos, riscos e itens adiados

- **Arquitetura preservada:** Angular, NestJS, PostgreSQL, Docker e o pacote compartilhado de calculadoras. Sem novos serviços para executar este roadmap por padrão.
- Busca, revisão manual, cálculos, planos, OCR no navegador e melhoria de fluxos não exigem assinatura externa adicional; aumentam consumo de CPU, banco, assets e tráfego conforme uso.
- Coleta/histórico de mercado precisam de orçamento de chamadas, cache, retenção e controle de tamanho; não coletar todo o mercado continuamente no MVP.
- Conta depende do provedor já preparado e, conforme método de login, configuração de e-mail. Monitoramento/analytics dependem de ativação externa, cotas e privacidade. Custos e configurações estão na [auditoria](production-audit.md); este roadmap não contrata serviços.
- Anúncios continuam desligados até revisão de licenças e direitos. Slots de layout não justificam carregar scripts publicitários agora.
- Adiar alertas por e-mail/push de mercado, app desktop, overlay, integração contínua com conta do jogo, IA generativa de recomendações, ranking público e colaboração em tempo real. São ampliações com custo/manutenção ou fontes ainda não demonstradas.
- Não tratar o scraping dos concorrentes como alimentação permanente. A pesquisa ajuda a definir funcionalidades; catálogo, regras e preços precisam de fontes próprias/permitidas e procedência documentada.

## Próximas três entregas recomendadas

1. **Confiabilidade do catálogo e busca:** fechar D1/F1, listar lacunas com origem e rotina de atualização após patch.
2. **Item → mercado SA → receita → decisão:** fechar D2/F2/F3; se fornecedor continuar indisponível, oferecer o fluxo manual com rótulos explícitos.
3. **Meu estoque → sugestão → plano:** fechar F4/F6/F8 e validar prints F5 com capturas reais antes de promover reconhecimento a recurso confiável.

Este documento é planejamento: não marca integrações, novas funcionalidades ou validações externas como concluídas. A cobertura atual e a auditoria continuam sendo as fontes do estado implementado.
