# Design: corpus local e leitura OCR de telas do BDO

**Data:** 10 de outubro de 2026
**Estado:** desenho conversacional aprovado; revisão desta especificação pendente
**Escopo:** organizar as capturas fornecidas e ampliar a leitura para os campos estruturados que o Black Market usa.

## Objetivo e critérios

Organizar imagens de referência com rótulos verificáveis e ampliar a importação existente para reconhecer, com revisão por campo, informações visíveis de armazém, inventário, maestria, peso e personagens. A leitura deve aproveitar os dados já modelados no perfil e no estoque, manter o processamento das capturas no navegador e nunca transformar ausência ou baixa confiança em zero.

Critérios de sucesso:

- Capturas de calibração ficam identificadas por hash, tipo de tela e sessão de origem, com valores de referência revisados manualmente.
- A detecção sugere o tipo de tela e panes; quando houver dúvida, a pessoa escolhe o tipo e a região.
- Campos legíveis são apresentados antes de qualquer alteração. Campos ausentes, cobertos ou ambíguos permanecem sem valor e não apagam dados existentes.
- Métricas de leitura são reportadas por campo e por tipo de tela, sem alegar precisão geral a partir das mesmas imagens usadas para ajustar o algoritmo.
- Capturas pessoais não entram no Git, backup do produto, analytics ou serviço remoto.

## Contexto atual

`apps/web/src/app/features/scans` já lê grades de armazém/inventário, compara ícones com o catálogo, sugere quantidades e permite ler números em recortes. Também há modos de equipamento, limites de revisão, deduplicação, cancelamento e persistência local após confirmação. O componente `NumberReader` e o Tesseract.js existente são carregados sob demanda.

O perfil em `packages/calculators/src/personal.ts` já contém nome de família/personagem, classe, nível, capacidade e uso de inventário, peso carregado/limite, prata, energia, PA/PD e maestria numérica por atividade. O leitor atual, porém, não reconhece automaticamente esses grupos em uma tela completa.

O acervo entregue contém 14 arquivos de capturas próprias do jogo, 13 únicos por SHA-256. Há frames próximos da mesma sessão e uma duplicata binária exata. Também há imagens de referências externas de interface; elas não são capturas próprias nem um conjunto autorizado para treinamento. O acervo é pequeno e concentrado em uma sessão/idioma/resolução. Ele permite calibrar protótipos, mas não sustenta treinamento de um modelo geral nem uma alegação de generalização.

O fluxo continuará local e assistido conforme `docs/storage-import-strategy.md`, `docs/ocr-validation.md` e `docs/screenshot-mvp.md`. A imagem original e os recortes permanecem em memória durante a revisão. Dados estruturados só são aplicados por confirmação explícita.

## Abordagens consideradas

1. **Corpus local e leitores especializados por tela (escolhida).** Combina sinais de layout e rótulos/títulos com OCR existente, validações do domínio e revisão por campo. Preserva privacidade e reutiliza a implementação. O limite é depender de layouts e capturas representativos; campos incertos continuam manuais.
2. **Treinar agora um OCR ou classificador próprio.** Exigiria muitos exemplos distintos, anotações completas e um conjunto independente de avaliação. Com o acervo atual, o risco de sobreajuste é alto e não há evidência de que um modelo resolva o principal problema, que é localizar e interpretar campos diferentes.
3. **Visão computacional remota.** Poderia reduzir trabalho local de parsing, mas enviaria imagens privadas a terceiros, teria custo e criaria uma dependência externa. Contraria a decisão atual de manter a captura no navegador.

O primeiro passo mede erros por tela e campo usando a opção 1. Treinamento local de um modelo só será reavaliado quando dados independentes mostrarem que as regras/recortes especializados são insuficientes e houver amostra diversa consentida.

## Corpus e anotações

As imagens originais serão **copiadas**, sem mover ou renomear os arquivos do usuário, para `data/ocr-corpus/` local. `data/` já é ignorada pelo Git. O corpus deve ter diretórios ou metadados que separem:

- `storage`: pane de armazém, local e capacidade visível;
- `inventory`: pane de inventário, capacidade, peso em LT e grade de itens;
- `mastery`: linhas de profissão, maestria numérica e outros valores visíveis que tenham campo correspondente no produto;
- `characters`: lista/ficha, nome, classe, nível e atributos do perfil que estiverem visíveis;
- `combined`: capturas com mais de uma pane, cada região anotada separadamente;
- `references-only`: referência visual externa, nunca incluída em treino ou avaliação até a procedência/licença permitir esse uso.

Um manifesto JSON local por captura registra versão do esquema, ID derivado do SHA-256, caminho relativo, fonte/autorização, sessão de origem, idioma, resolução, tipo(s) de tela, regiões de interesse, rótulos esperados e divisão do conjunto. Cada rótulo inclui campo de domínio, texto observado, valor normalizado quando válido, caixa delimitadora e estado (`verified`, `ambiguous`, `occluded` ou `not_present`). Ausência e oclusão são distintas de zero. Valores pessoais, nomes e caminhos permanecem no manifesto local ignorado.

O par duplicado exato entra uma única vez. Frames próximos da mesma sessão permanecem no mesmo grupo; a divisão entre ajuste e avaliação nunca será aleatória por recorte. Imagens externas servem apenas para estudar organização visual nesta etapa. Não se guardam modelos/arquivos de jogo extraídos no corpus.

## Leitura e aplicação dos resultados

1. A captura passa por validação de formato/tamanho e hash local; a imagem não é enviada para análise.
2. Um detector leve busca títulos, âncoras textuais e geometria conhecida para sugerir panes e tipo de tela. Capturas combinadas podem produzir mais de uma região. Se a confiança operacional não bastar, a pessoa seleciona o tipo e ajusta o recorte, como já faz no modo atual.
3. O leitor existente de grade/ícones/quantidades continua responsável pelos slots. Tesseract.js e o leitor numérico existente são reutilizados em regiões de texto/números, com pré-processamento e parser específicos por campo.
4. Adaptadores validam números, separadores, unidades, limites do schema e correspondência com `lifeSkills`. A tela mostra valor lido, valor atual e estado por campo; revisão e correção removem a confirmação do campo alterado.
5. Só campos revisados e escolhidos são aplicados ao perfil/local selecionado. Uma captura não cria ou mescla personagem automaticamente quando a identidade não foi confirmada. Campos não vistos preservam o valor atual.

### Campos cobertos no primeiro recorte

- Armazém: cidade/local e ocupação `usados/total` quando visíveis, além dos itens/quantidades já reconhecidos pela grade.
- Inventário: ocupação `usados/total`, `peso atual/limite` em LT e itens/quantidades.
- Maestria: valor numérico ligado à atividade existente no modelo do personagem. Nome da atividade deve corresponder a uma chave conhecida; nunca aproximar uma atividade desconhecida para outra.
- Personagem: nome, classe, nível e atributos existentes no perfil quando a tela os identifica sem ambiguidade. Usuário escolhe o registro de destino antes de aplicar.
- Equipamento/atributos: mantém leitura assistida de slots e pode sugerir PA/PD visíveis para revisão, sem inferir nível de aprimoramento/Caphras pelo ícone.

O valor de peso do Mercado Central em VT não será gravado como peso carregado do personagem, que é expresso em LT. Como o modelo atual não guarda limite de carga do mercado, esse valor pode ser exibido como reconhecido sem persistência, ou permanecer fora do escopo do primeiro recorte. Nível/rank e porcentagem de progresso de cada profissão também não têm campo confirmado no perfil atual; não serão gravados até uma decisão de domínio criar esses campos.

## Falhas, incerteza e privacidade

- Leitura sem candidato, OCR interrompido ou campo inválido mantém o valor em branco e mostra a ação manual disponível.
- Várias panes, idioma/layout desconhecido, overlays e resolução reduzida podem reduzir a confiança. O usuário escolhe a área/tipo ou corrige o valor.
- Pontuação bruta do OCR não é apresentada como probabilidade até ser calibrada contra referências rotuladas.
- Métricas nunca misturam custo de oportunidade ou preços de mercado; a importação só registra dados observados no print.
- A imagem original, recortes e saídas intermediárias de OCR permanecem no navegador durante a revisão; o corpus de desenvolvimento fica local. Analytics não recebe imagem, nome de arquivo, texto ou valores privados. Depois da confirmação, dados estruturados seguem apenas os fluxos de persistência/sincronização explícita já existentes.
- O corpus é de calibração/avaliação local, não autorização para treinamento externo ou distribuição.

## Validação

Estender o validador local com casos rotulados para as novas regiões sem exigir que as capturas sejam versionadas. Medir, separadamente por tipo de tela e campo: valor exato correto, falso preenchimento, campo não reconhecido, ambiguidade que chegou à revisão e tempo de revisão. Contadores abreviados permanecem estimativas, não quantidades exatas.

Separar imagens por sessão de origem. Com a pequena amostra inicial, reportar contagens absolutas e limitações em vez de porcentagens de acurácia generalizável. Adicionar casos unitários para parsing de pesos LT/VT, frações de capacidade, rótulos portugueses de maestria e validação de perfil. Validar a captura e revisão no navegador em desktop e largura móvel, inclusive teclado, cancelamento e erro do OCR. Depois de alterar código, executar `pnpm check`, `pnpm test` e os fluxos Playwright relevantes.

## Fora do escopo

- OCR de chat, HUD geral, diálogos ou transcrição de texto arbitrário.
- Captura passiva de tela/vídeo, integração com o processo do jogo, sincronização automática de conta, OCR remoto ou envio de imagens para terceiros.
- Reconhecer com certeza um item apenas pelo ícone quando IDs compartilham a mesma imagem.
- Aplicar dados sem revisão, substituir snapshots completos com capturas parciais ou apagar valores de campos não visíveis.
- Treinar um modelo próprio antes de existir evidência e volume suficiente.
