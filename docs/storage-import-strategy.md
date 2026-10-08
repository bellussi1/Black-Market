# Importação de armazéns, inventários e perfil

Decisão de produto e arquitetura em **7 de outubro de 2026**. Prioridade: SA e português brasileiro, com região/idioma explícitos para expansão futura. Complementa a [visão do produto](product-vision.md) e as pesquisas de [BDOLytics/Workshop](research/lytics-workshop.md), [Codex/Foundry](research/codex-foundry.md) e [Garmoth/Workerman/Arsha](research/garmoth-workerman-arsha.md).

## Decisão

O catálogo central fornece IDs, nomes, categorias e imagens. O mercado fornece preços públicos datados. O jogador fornece e confirma **quantidades privadas**, local, maestria e equipamentos. A extração do cliente não popula automaticamente o armazém da conta.

A base é entrada manual por catálogo e importação CSV/JSON com prévia. Nesta entrega, a importação CSV com prévia está implementada no armazenamento pessoal do navegador; **upload, OCR, leitura de vídeo, captura passiva, contas e processamento de imagens na nuvem não estão implementados**. Não apresentar esses recursos como disponíveis.

### O que os concorrentes demonstram

- BDO Workshop tem fluxo público no cliente de múltiplos prints, seleção da área, grade, sobreposição, revisão e correção. A execução com imagens reais e a precisão do backend não foram avaliadas. [Storage Tracker](https://bdoworkshop.com/crafting-workshop/storage-tracker), [módulo público](https://bdoworkshop.com/build/assets/storage_tracker-CdAbNmve.js).
- Garmoth documenta OCR de **loot visível durante sessões**, distinto de reconhecer todos os slots de um armazém. É evidência de viabilidade de captura passiva, não de sincronização completa de estoque. [Aplicativo](https://garmoth.com/app).
- Workerman importa JSON de trabalhadores/alojamento e referencia cache local de trabalhos, que pode estar antigo. Não demonstra lista completa de itens guardados. [HomeView](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/HomeView.vue), [ajuda](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/AboutView.vue).
- Arsha expõe mercado público com cache; seus contratos examinados não incluem inventário privado. Acesso a preços não oferece acesso ao estoque do jogador. [Controlador V2](https://github.com/guy0090/api.arsha.io/blob/0d04e43a75bb90983781ad4374e8dd06926c4552/src/main/java/io/arsha/api/controllers/V2Controller.java).

Nenhuma API pública oficial de armazém pessoal foi comprovada nas fontes examinadas. O plano não depende de credenciais do jogo, leitura de memória, bot ou automação de comandos do jogo.

## Comparação de entradas

| Entrada                      | Papel no produto                                        | Precisão e limitações                                                                          | Custo/complexidade                                               |
| ---------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Manual com busca no catálogo | Caminho sempre disponível para adicionar/corrigir       | ID validado, mas quantidade e local dependem do usuário                                        | Baixos; acessível por teclado e leitor de tela                   |
| CSV                          | Preencher muitos itens a partir de planilha             | Validação determinística; não prova que o arquivo reflete o jogo agora                         | Baixos; prévia, erros por linha e formato documentado            |
| JSON versionado              | Backup/interoperabilidade futura de dados estruturados  | Esquema, região e versão precisam ser validados; backup não vira fonte de mercado              | Baixos/médios; migrações explícitas                              |
| Prints revisáveis            | Reduzir digitação de slots visíveis                     | Ícones semelhantes, quantidade encoberta e escala podem gerar dúvidas                          | Médios; dataset autorizado e reconhecimento calibrado            |
| Vídeo/captura passiva        | Ler várias páginas que o usuário mostra voluntariamente | Frames repetidos, movimento e itens movidos durante captura impedem snapshot confiável         | Altos; seleção de frames, alinhamento e consentimento específico |
| Cache local                  | Pesquisa opcional após provar formato/cobertura         | Pode não conter itens, estar antigo ou mudar após patches; evidência atual cobre trabalhadores | Altos; cliente auxiliar e manutenção por versão                  |

Arquivo JSON de backup que já existir na plataforma mantém sua finalidade; um importador novo de itens deve ter contrato próprio. Não aceitar JSON arbitrário como atualização integral de perfil.

## Contrato de importação CSV desta etapa

Campos funcionais: **ID do catálogo, quantidade local e, opcionalmente, meta e preço informado**. Nomes dos cabeçalhos, separador e formatos numéricos aceitos devem coincidir com o parser e o exemplo exibido na própria tela.

- Validar cada ID na API do catálogo; nunca inventar nome, ícone ou categoria para um ID desconhecido.
- Não tratar um ID válido como prova de que o item é vendável ou negociável.
- Quantidade representa o **total confirmado para a linha**, não um incremento automático. Meta é objetivo pessoal, não estoque. Preço informado é referência manual, não cotação atual.
- O local identifica cidade/armazém ou personagem/inventário. Região faz parte do contexto, mesmo se SA for o padrão.
- Mostrar prévia com dados do catálogo, ação por linha e erros. Não aplicar automaticamente ao selecionar o arquivo.
- Aplicar somente linhas observadas e confirmadas. Dados ausentes no arquivo permanecem como estão; arquivo vazio não limpa o estoque.
- Reimportar o mesmo lote confirmado produz o mesmo estado. Linhas repetidas para a mesma identidade exigem resolução explícita, sem soma silenciosa.
- Valores opcionais ausentes não devem apagar dados existentes sem ação explicitamente indicada na prévia. Exibir a política aplicada para novas linhas.
- Não deixar quantidade zero significar exclusão implicitamente; caso permitida, a semântica deve estar indicada e confirmada.
- Antes de oferecer exportação/importação JSON de itens, definir versão de esquema, tamanho máximo, migração e rejeição segura de campos inválidos.

Para CSV, a identidade deve acompanhar o modelo vigente: região, local e ID canônico. Variantes de aprimoramento, vínculo ou pilhas individuais só podem ser importadas quando o contrato as representar sem perda. Não afirmar que o formato simples já preserva todas as variantes do jogo.

## Pipeline futuro de reconhecimento

### 1. Contexto e consentimento

Selecionar tipo de tela: armazém, inventário, prata, habilidades de vida ou gear. Identificação automática pode sugerir, mas o usuário pode corrigir. Registrar região, idioma, cidade/personagem, data da captura, resolução, escala da UI e versão do layout quando conhecidos.

Captura passiva pede permissão para uma janela escolhida e começa/termina por ação do usuário. Mostrar indicador de captura e permitir interromper. Não registrar toda a área de trabalho por padrão.

### 2. Calibração e segmentação

Determinar área útil, borda e tamanho dos slots, posição da rolagem e overlays. Permitir ajuste manual do recorte/grade. Normalizar escala e contraste preservando o original; filtrar imagens borradas ou recortes incompatíveis. Valores escondidos por tooltip, cursor ou animação permanecem desconhecidos.

Usar calibração separada para telas de prata, maestria e gear. OCR genérico sozinho não identifica um grid que mostra somente ícones. [Tesseract.js](https://github.com/naptha/tesseract.js) é candidato para texto/números, sujeito à avaliação; sua existência não comprova precisão em BDO.

### 3. Ícones, números e variantes

Gerar candidatos de item com o catálogo e ícones versionados. Separar reconhecimento de quantidade, texto, slot e aprimoramento. Não escolher item pelo ícone quando várias entidades compartilham a imagem.

Regras de identificação:

- Item sem nome visível recebe candidatos por ícone. Sem evidência suficiente, fica **item desconhecido**, com revisão manual.
- Itens vinculados ao personagem/família e versões negociáveis podem compartilhar arte. Não concluir vínculo por aparência; pedir confirmação quando isso afetar receita, venda ou recomendação.
- Nível de aprimoramento só é aplicado quando reconhecido ou informado. Um ícone de arma não determina TRI/TET/PEN.
- Quantidade abreviada, separadores pt-BR, unidades e valor encoberto não são convertidos em número exato sem regra verificada. Ausência de quantidade não significa automaticamente uma unidade.
- Guardar candidatos alternativos e região recortada para revisão. Ícone ausente no catálogo não deve receber imagem genérica que pareça identificação confirmada.

### 4. Capturas múltiplas e sobreposição

Cada slot observado guarda sua origem, posição e captura. Alinhar páginas por geometria, rolagem e conteúdo estável; deduplicar a mesma observação. Não somar por ID, porque prints repetidos podem mostrar a mesma pilha.

Se o usuário movimentar itens entre imagens ou a posição não puder ser resolvida, pedir revisão. Um vídeo precisa selecionar frames estáveis; mais frames não equivalem a mais itens. Manter página/local separados e não misturar inventários de personagens ou cidades.

### 5. Confiança calibrada e revisão

Guardar avaliações separadas para classificação da tela, item, quantidade, aprimoramento e alinhamento. Similaridade de imagem não é probabilidade de acerto. Calibrar scores usando amostras autorizadas distintas das usadas para ajustar o modelo; revisar comportamento após patches.

Na prévia, mostrar recorte, resultado, alternativas e motivo da dúvida. Permitir corrigir, excluir ou deixar pendente por slot. O usuário deve conseguir confirmar sem depender somente de cor e navegar por teclado. Nenhuma quantidade incerta alimenta cálculo como fato confirmado.

### 6. Aplicação e auditoria

Confirmar rascunho em uma atualização atômica; no backend futuro, transação com versão anterior e controle de concorrência. Manter chave de idempotência do lote para que retries não dupliquem alterações. Se o estado mudou durante a revisão, apresentar o conflito antes de aplicar.

Auditoria mínima proposta: usuário, região/local, lote, fonte, horário informado/recebido, valores anteriores/novos, catálogo, parser/modelo, campos corrigidos e versão do snapshot. Possibilitar desfazer/importar backup e excluir o histórico conforme política de retenção. Não guardar imagens indefinidamente como requisito de auditoria.

Prata e maestria pertencem ao perfil; itens pertencem ao local. Maestria lida pode incluir buffs temporários: registrar a condição declarada, sem deduzir valor base. Gear exige slot/item/aprimoramento e não preenche atributos ocultos.

## Semântica de atualização

| Situação                      | Comportamento                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Print/CSV parcial             | Atualizar apenas identidades observadas; não zerar ausentes                       |
| Várias capturas sobrepostas   | Deduplicar slots alinhados; revisar conflito de quantidade                        |
| Snapshot completo             | Substituir local inteiro somente com cobertura demonstrada e confirmação distinta |
| Movimentação de entrada/saída | Fluxo próprio e explícito; não inferir pelo mesmo item aparecer em outro print    |
| Região/local diferente        | Rascunho separado; não sobrescrever o local atual por coincidência de ID          |
| Reconhecimento inconclusivo   | Manter pendente; não converter desconhecido em zero                               |
| Preço antigo ou indisponível  | Exibir data/fonte e limitação; não fabricar cotação atual                         |

O estoque representa uma observação, não sincronização contínua. Mostrar última confirmação e permitir corrigir manualmente a qualquer momento.

## Relação com recomendações

Catálogo, receitas, observações de rendimento e preços precisam de versão e procedência. Preservar a versão usada na explicação do cálculo. Não inferir imposto, probabilidade de drop, rendimento ou duração a partir de um print de estoque.

Mostrar separadamente materiais disponíveis, materiais faltantes, desembolso, custo de oportunidade, tempo ativo/AFK e condições necessárias. Materiais próprios têm valor de oportunidade quando vendáveis; itens vinculados precisam de alternativa de uso compatível.

Maestria isolada não determina prata/hora. Usar modelo validado por atividade/região/patch ou sessão medida do jogador, com premissas visíveis. Divergências encontradas entre guias de [coleta](https://www.blackdesertfoundry.com/gathering-guide/) e [maestria](https://www.blackdesertfoundry.com/life-skill-mastery/) demonstram por que copiar tabelas sem validar não basta. Na ausência de dados suficientes, mostrar a lacuna em vez de ranquear uma oportunidade com precisão falsa.

## Privacidade, custo e jobs futuros

- Arquivo CSV pode ser processado no navegador; logs não precisam armazenar conteúdo integral. Definir limites de bytes, linhas, campos e tempo para evitar travamento.
- Imagens ficam privadas, com recorte para remover chat/nome; acesso autenticado por usuário no backend e objetos fora de rotas públicas/indexação.
- Antes de abrir uploads, definir e implementar retenção, exclusão, exportação e finalidade de processamento. A proposta de até sete dias na visão do produto precisa virar política e rotina reais.
- OCR local pode reduzir envio/custo; processamento na nuvem exige fila, limite por usuário, tamanho/resolução máxima, timeout, tentativas limitadas, cancelamento e estados claros. Não prometer infraestrutura gratuita ilimitada.
- Objetos temporários e resultados estruturados são separados. URLs de acesso precisam de prazo e autorização; não incluir tokens, imagens ou dados do perfil em telemetria pública.
- Jobs fixam versão do catálogo/modelo/layout. Atualização de um modelo não reaplica resultado antigo automaticamente ao estoque.
- Permissão para importar um print não é permissão para usá-lo em treinamento. Exemplos de avaliação/treinamento exigem consentimento específico e finalidade declarada.

## Avaliação com exemplos reais autorizados

Coletar exemplos voluntários de SA/pt-BR com resposta correta revisada pelo jogador: armazém e inventário, diferentes cidades/personagens, resoluções, escalas/fontes, scroll/sobreposição, quantidades altas/abreviadas, itens parecidos/vinculados, aprimoramentos, tooltips, cursor e imagens ruins. Incluir casos que o sistema deve rejeitar. Remover informações pessoais desnecessárias.

Separar conjuntos de ajuste e avaliação por participante/sessão quando possível. Registrar patch/layout e não avaliar somente screenshots fáceis ou recortes sintéticos. Medir por campo e cenário:

- Item correto, quantidade exata, aprimoramento e vínculo corretamente identificados.
- Quantidade de casos desconhecidos, falsos resultados apresentados como seguros e trabalho de correção.
- Duplicações, apagamentos indevidos e conflitos detectados em múltiplas capturas.
- Tempo de revisão, latência, memória/custo e conclusão do fluxo por teclado/leitor de tela.
- Diferença entre estimativa de confiança e resultados reais, com tamanho da amostra explícito.

Não existe meta de acurácia comprovada ainda. Critério de liberação: comportamento medido nos cenários definidos, dúvidas visíveis, correção viável, nenhuma aplicação sem confirmação, importação repetida idempotente, atualização parcial preservando ausentes e exclusão/retenção funcionando. Publicar limitações conhecidas; evoluir por tipo de tela antes de anunciar reconhecimento geral.

## Nota sobre anúncios

Antes de ativar anúncios ou outra monetização, resolver a compatibilidade da [licença não comercial do extractor](https://github.com/iDevelopThings/bdo-data-extractor/blob/main/LICENSE.md) e das permissões sobre dados/assets. Preparar espaço de anúncios na UI não resolve essa condição nem autoriza publicar imagens pessoais.
