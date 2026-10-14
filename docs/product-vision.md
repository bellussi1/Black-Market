# Black Market: plataforma brasileira de BDO

Direção definida em 7 de outubro de 2026. Este documento descreve o produto desejado e a ordem de implementação. Recursos planejados não devem aparecer como disponíveis na interface.

## Objetivo

Uma plataforma pública para a comunidade brasileira de Black Desert, com português brasileiro como idioma principal e SA como mercado inicial. Referências de produto: BDOLytics, BDO Codex e BDO Workshop. Interface, implementação e recomendações próprias.

A experiência começa com as decisões do jogador: o que fazer com os materiais guardados, o que coletar, produzir ou vender e em qual melhoria investir para aumentar o retorno do tempo jogado. Navegação e explicações usam termos conhecidos pela comunidade, com nomes de itens em português.

## Duas formas de usar

| Experiência               | Recursos                                                                                                            | Conta                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Consulta pública gratuita | Itens, receitas, materiais, mercado SA, preços e sua atualização, calculadoras e estimativas por atividade/maestria | Sem login                                                                         |
| Planejamento pessoal      | Prints, armazéns, inventário, prata, maestria, equipamentos, preferências, sessões e planos com recomendações       | Conta para sincronizar e guardar; entrada manual de visitante continua disponível |

Usuários não precisam executar o extractor ou importar arquivos do cliente. A operação do Black Market atualiza um catálogo central após patches e coleta preços no servidor com cache compartilhado. A instalação local do mantenedor é uma fonte de ingestão para a plataforma.

O requisito confirmado é manter gratuitas as consultas e ferramentas citadas. O modelo de receita da plataforma não foi definido.

## Fluxo: meus dados → o que fazer

1. Em **Meu personagem**, o jogador informa ou envia prints de prata, níveis/maestria e equipamentos.
2. Em **Meus materiais**, escolhe o armazém ou inventário e adiciona prints; pode continuar com preenchimento manual.
3. A plataforma apresenta uma prévia dos itens/quantidades e destaca dúvidas. O jogador corrige e confirma.
4. O jogador informa tempo disponível, preferência por atividade ativa/AFK, energia e objetivo.
5. **O que fazer agora** apresenta opções com passos, materiais disponíveis/faltantes, custo adicional, retorno estimado e motivo da sugestão.
6. O jogador pode transformar uma opção em plano e registrar o resultado real da sessão. O histórico melhora a comparação com seu próprio ritmo.

Cada recomendação explica suas premissas. Sem preços ou dados de rendimento suficientes, a interface informa o que falta para calcular.

## Navegação e UX

- **Início:** busca global e atalhos por objetivo; sugestões e planos recentes para quem possui perfil.
- **Mercado:** busca por nome/categoria, preço, estoque, nível de aprimoramento e horário/frescor. Favoritos com uma ação.
- **Receitas:** busca, ingredientes, alternativas, resultado/subproduto e comparação de comprar/produzir. Links diretos, sem exigir perfil.
- **Ganhar prata:** coleta, cozinha, alquimia, processamento e outras atividades conforme cobertura de dados; filtros por maestria, energia, tempo e estilo de jogo.
- **Meus materiais:** armazéns/inventários com local explícito, busca, prints e entrada manual.
- **Meu personagem:** equipamentos, prata, habilidades de vida e maestria por atividade. Edição sempre disponível.
- **Meus planos:** materiais faltantes, tarefas, custo e acompanhamento do resultado.

Uma ação principal por tela; memória de cálculo e termos avançados em detalhes expansíveis. Estados vazios ensinam o próximo passo. No celular, controles funcionam sem hover ou tabelas largas. SA e pt-BR são padrões, com configuração central para expansão.

## Prints e reconhecimento

O print é uma forma de preencher dados. Uma imagem reconhecida não modifica estoque, perfil ou plano antes da confirmação.

### Pipeline previsto

1. Identificar a tela: armazém, inventário, prata, habilidades de vida ou equipamentos; permitir escolha manual.
2. Recortar regiões relevantes e normalizar escala/contraste, considerando resolução e escala da UI do jogo.
3. Usar OCR para números/textos e correspondência de ícones para candidatos de itens. OCR textual não reconhece sozinho um grid sem nomes.
4. Cruzar candidatos com o catálogo. Variantes vinculadas e níveis de aprimoramento podem compartilhar arte; mostrar alternativas ambíguas.
5. Guardar um rascunho com posição, candidato, quantidade, origem e avaliação de confiança. Valores incertos permanecem desconhecidos.
6. Revisar e confirmar o lote em transação, com controle da versão anterior do estoque/perfil.

Começar por prata e maestria, depois armazéns/inventário e finalmente gear com aprimoramentos. [Tesseract.js](https://github.com/naptha/tesseract.js) oferece OCR em browser e Node; é candidato para texto/números, sujeito à avaliação com prints reais de BDO. Seu suporte geral não comprova precisão nesses layouts.

Um protótipo pode ler números no browser para reduzir custo e upload. A versão com envio usa processamento em segundo plano e um adaptador de reconhecimento. Não depender obrigatoriamente de uma API de IA paga por print antes de medir precisão e custo.

### Atualização do estoque

- Associar prints a região, cidade/armazém ou personagem/inventário, momento da captura e parte do grid.
- Detectar repetição e sobreposição: um slot visto duas vezes não dobra sua quantidade.
- Diferenciar **substituir os slots observados** de **adicionar uma movimentação** na prévia.
- Um print parcial não zera itens ausentes. Substituir todo o local exige cobertura conhecida e confirmação.
- Quantidades abreviadas, separadores pt-BR, oclusão e destaque do mouse podem impedir leitura. Pedir correção sem inventar resultado.
- Gear identifica item, slot e aprimoramento somente quando reconhecidos; campos não visíveis permanecem desconhecidos. Maestria exibida pode incluir buffs temporários.

### Dados privados

Imagens e perfil ficam privados por padrão. O jogador pode recortar chat antes do envio, editar o resultado e excluir seus dados. Proposta inicial: expirar imagens de processamento em até sete dias e permitir excluir logo após confirmar; conservar os dados estruturados necessários ao perfil e planos. Implementar e documentar retenção antes da abertura de uploads públicos.

## Recomendações de prata por hora

O primeiro motor será determinístico e explicável, reutilizando `packages/calculators`. Um eventual assistente textual pode explicar a conta, mas não gerar preços, probabilidades ou fórmulas ausentes.

| Entradas    | Dados                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| Jogador     | Prata, estoque confirmado, gear/ferramenta, níveis/maestria por atividade, energia, buffs, tempo e preferências |
| Jogo        | Receitas, quantidades/rendimentos conhecidos, requisitos, locais, regras e versões                              |
| Mercado     | Região, item/nível, preço após imposto, estoque, horário e indicadores de liquidez disponíveis                  |
| Observações | Drops, duração, custos, rota, ritmo do jogador, maestria/buffs da sessão e tamanho da amostra                   |

### Comparação das opções

- **Prata líquida por hora:** receita líquida estimada menos custos, dividida pelo tempo necessário. Separar tempo ativo e AFK; incluir preparo/deslocamento quando medidos.
- **Desembolso:** quanto de prata adicional será necessário, mesmo com materiais disponíveis.
- **Custo de oportunidade:** comparar produzir com vender materiais guardados. Material próprio não é economicamente gratuito; se não pode ser vendido, indicar a alternativa de uso considerada.
- **Restrições:** energia, nível, maestria, equipamento, estoque, capital, capacidade e preferências.
- **Mercado:** margem alta não garante venda imediata. Considerar horizonte e liquidez observada; dados insuficientes reduzem a confiança.
- **Incerteza:** preço antigo, rendimento desconhecido, subprodutos e amostras pequenas aparecem na explicação. Resultado aleatório não é lucro garantido.

Mostrar materiais faltantes e quantidades sugeridas para coletar/comprar. Simulação não reserva nem debita estoque. Uma reserva exige ação explícita e impede usar os mesmos materiais em planos simultâneos.

### Coleta e maestria

Maestria não determina sozinha rendimento por hora. A previsão depende também de atividade/recurso/rota, velocidade, disponibilidade, energia, buffs, ferramenta e taxas verificadas de obtenção.

O `mastery.json` extraído atualmente cobre cozinha, alquimia e processamento. Não fornece uma curva completa de coleta nem taxas de todas as rotas. Precisamos de modelos com fonte, versão e premissas e/ou sessões medidas para calibrar estimativas. Campos sem interpretação confirmada não entram automaticamente em fórmulas.

Antes de existirem modelos suficientes, usar rendimento informado ou sessões do jogador, declarando essa base. Distinguir **observado**, **estimado com modelo** e **dados insuficientes**. Percentis/intervalos exigem amostra ou modelo que os sustente.

## Ordem de entrega

A ordem abaixo resume a visão inicial. Para executar o backlog a partir do estado atual, usar o [roadmap priorizado](roadmap.md), que diferencia funcionalidades existentes, melhorias pendentes e dependências de lançamento. Upload privado e processamento assíncrono descritos nesta visão não são requisitos da primeira entrega de prints: o reconhecimento atual ocorre no navegador, com revisão obrigatória.

| Etapa                    | Entrega                                                                                                             | Critério de conclusão                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1. Base pública gratuita | Busca de itens/receitas, mercado SA ligado ao catálogo, frescor, calculadoras com fontes e publicação web/API/banco | Consultas por nome e links compartilháveis sem conta; nenhum preço fictício    |
| 2. Perfil sincronizado   | Login, prata, maestria, gear, estoque, sessões e migração confirmada do backup local                                | Dados isolados por usuário e recuperáveis em outro dispositivo                 |
| 3. Recomendações manuais | Comparar vender/produzir/coletar com perfil e rendimento informado/medido                                           | Sugestões reproduzíveis, materiais/custos claros e versões registradas         |
| 4. Leitura de prints     | Rascunho de prata/maestria, depois estoque/gear; upload privado e processamento assíncrono                          | Precisão medida com exemplos autorizados; nenhum dado aplicado sem confirmação |
| 5. Estimativas ampliadas | Coleta por maestria/rota, calibração por sessões e outros datasets                                                  | Fontes verificadas e distinção de observação e estimativa                      |

Recomendações usam preenchimento manual antes de o reconhecimento estar pronto. Recursos gratuitos continuam acessíveis durante a evolução.

## Estado atual

Catálogo SA/pt com 74.216 itens, 212 categorias e 4.406 receitas distintas; ícones para 70.556 IDs. Consulta comunitária de mercado por ID e calculadoras/presets manuais. A aplicação roda localmente e o código está no GitHub privado.

Atualização de 14 de outubro: páginas compartilháveis de itens e receitas, 26 tipos de referência, mapa de conexões, perfil, planos/reservas, sugestões de produção/atividades/venda e leitura revisável de prints estão implementados. Mercado tem persistência e coletor configurável, desligado por padrão. A integração de contas/sincronização usa Google/Steam via Firebase e exige configurar projetos separados de staging e produção antes do login real. Publicação web, ativação dos provedores, calibração com prints reais e modelos completos de coleta por maestria permanecem dependências externas/de dados. A [cobertura](feature-coverage.md) descreve a implementação; [operação e publicação](production-and-accounts.md) registra as configurações necessárias.

## Publicação e fontes

Arquivos ignorados pelo Git podem ser publicados pelos jobs de ingestão em produção. Manter assets fora do Git não implica uso restrito ao localhost.

A [licença do extractor](https://github.com/iDevelopThings/bdo-data-extractor/blob/main/LICENSE.md) restringe seu código ao uso não comercial e não concede direitos sobre assets do jogo. O [Manual de Conteúdo de Fã da Pearl Abyss](https://www.sa.playblackdesert.com/pt-BR/Policy?policyNo=90) inclui sites/screenshots, impõe condições e exige indicar o caráter independente. São permissões diferentes: o manual não altera a licença do extractor nem esclarece por si só toda distribuição de dados extraídos. Antes de introduzir anúncios, assinatura ou outra receita, resolver compatibilidade com o autor do extractor e os termos da Pearl Abyss.
