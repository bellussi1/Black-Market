# Reconhecimento assistido: calibração e validação

Atualizado em 08/10/2026. As capturas fornecidas foram usadas para calibrar e validar algoritmos; **não foi treinada uma rede neural** nem enviada qualquer captura para treinamento externo.

## Implementação

- Detector local: luminância, periodicidade e verificação dos quatro lados dos espaços. Exclui colunas de menu, separa painéis vizinhos e sugere até quatro áreas, com ajuste manual disponível. Não identifica cidade, dono do inventário ou rolagem.
- Até 400 espaços; revisão paginada em 12. Espaços desconhecidos e vazios permanecem disponíveis, sem inferir uma unidade.
- `rgb-top-v2`: assinatura RGB 8 × 8 dos 80% superiores do ícone, fundo preto e redimensionamento `fit: fill`. O navegador calcula médias explícitas dos pixels e compara cinco recortes para selecionar até 12 fontes candidatas. Isso reduz diferenças entre motores de redimensionamento.
- Segunda etapa: carrega apenas os ícones públicos candidatos e compara detalhes em 16 × 16, preservando a silhueta e mascarando o canto inferior direito onde aparecem os números. Reutiliza downloads entre espaços, processa quatro espaços por vez, limita cada download a dez segundos e cancela pedidos pendentes ao cancelar a leitura. Os bitmaps são liberados ao concluir. A imagem do usuário continua local; os pedidos levam somente IDs públicos e o checksum do catálogo.
- A revisão exibe nome e ícone sugeridos mesmo quando a identidade ainda exige escolha. Empates visuais priorizam registros categorizados e comuns na apresentação; isso não comprova qual variante está no jogo nem confirma o estoque.
- Aliases do mesmo arquivo determinam ícones compartilhados; arquivos com assinaturas parecidas permanecem separados. O índice antigo `dhash-top-v1` continua aceito.
- Leitura local de silhuetas de dígitos calibradas com um exemplo autorizado: segmentação da faixa numérica, comparação de proporção/forma e concordância entre pelo menos dois de três limiares. Os modelos guardam somente pequenos padrões binários dos dígitos. Não são uma rede neural nem um modelo universal para todas as fontes.
- Tesseract.js existente é carregado sob demanda para os espaços não resolvidos pela leitura local, em folhas de contato de até 50 recortes. Linhas que cruzam espaços e fragmentos ambíguos são recusados.
- `k/K` e `m/M` geram estimativas, nunca quantidades exatas pré-preenchidas. Inteiros são sugeridos a partir de confiança 50 do OCR; esse limiar **não significa 50% de precisão medida**. Tudo exige revisão.
- Correção de item, quantidade, posição, aprimoramento e Caphras desfaz a revisão da linha e a confirmação final. Importar preserva os demais itens e reservas.
- Analytics não recebe imagens, nomes de arquivo, texto OCR ou quantidades privadas. Nenhum estoque pessoal foi alterado durante a validação.

## Validação de geometria

Foram examinadas as sete imagens novas e as duas anteriores:

| Captura                                         | Resultado observado                           |
| ----------------------------------------------- | --------------------------------------------- |
| Velia, janela de armazém                        | 9 × 10, 90 espaços                            |
| Velia com inventário e overlay                  | 9 × 10; menu excluído e última linha incluída |
| Olvia com transporte                            | 9 × 10; painel de transporte excluído         |
| Heidel, grade recortada                         | 9 × 10, incluindo espaços vazios              |
| Inventário e depósito lado a lado               | Duas áreas de 8 × 8                           |
| Gear em posições irregulares e inventário vazio | Sem grade confiável; recorte manual           |
| Velia, materiais de trabalhadores               | 9 × 10                                        |
| Armazém largo com interface alternativa         | 19 × 10, 190 espaços                          |
| Duas grades em recortes combinados              | Duas áreas de 9 × 10                          |

O script passou nos nove casos; a recusa do layout irregular é esperada. Isso **não demonstra cobertura de todos os layouts**. Tempos locais do detector ficaram aproximadamente entre 0,14 e 1,80 segundos, com imagens limitadas a 1.100 pixels no maior eixo. São medições com Node/Sharp, não Core Web Vitals ou tempo de OCR no navegador.

Não foi medida a acurácia global de identificação ou quantidade: falta uma referência completa, confirmada pelo jogador, por espaço. A execução no navegador mostrou erros em capturas borradas, inclusive confusão entre dígitos e abreviações. Sugestões, estimativas e campos pendentes são exibidos para correção.

### Regressão de reconhecimento em 08/10/2026

Na captura nítida de inventário/depósito lado a lado, a primeira página foi conferida no navegador com as quantidades **48, 11, 7, 16, 4, 2, 5, 3, 2, 3, 14 e 33**: doze campos corretos e preenchidos, contra quatro campos corretos/preenchidos observados antes nesta mesma amostra. Ela também participou da calibração; **12/12 não é uma medida de generalização**. Os testes de regressão guardam somente máscaras binárias de pequenos recortes, sem a captura original.

O catálogo passou a apresentar as famílias visuais de corda, pirilampo, intensificadores, poções e poções de tendão de baleia. Existem imagens literalmente iguais em registros distintos: por exemplo, uma poção compartilha desenho com um registro de batom, e cordas normais/eventos/outros objetos podem compartilhar desenho. Por isso a leitura mantém variantes na seleção e solicita confirmação; reconhecer o desenho não prova o ID exato. Imagens borradas e outras fontes ainda podem resultar em campos vazios ou sugestões incorretas.

## Repetir sem guardar capturas no Git

Use Node 24 e as dependências existentes de `apps/api`. Crie um manifesto local ignorado, por exemplo `data/ocr-layout-validation.json`:

```json
[
  {
    "label": "Armazém com dois painéis",
    "path": "C:/capturas/armazem.png",
    "areas": [
      {
        "columns": 8,
        "rows": 8,
        "bounds": { "left": 499, "top": 154, "width": 424, "height": 424 },
        "tolerance": 10
      },
      {
        "columns": 8,
        "rows": 8,
        "bounds": { "left": 21, "top": 150, "width": 428, "height": 428 },
        "tolerance": 10
      }
    ]
  },
  { "label": "Ficha irregular", "path": "C:/capturas/gear.png", "manual": true }
]
```

```powershell
node scripts/validate-print-layouts.mjs data/ocr-layout-validation.json
pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/*.spec.ts"
pnpm --filter @bdo/api exec vitest run src/catalog/catalog-assets.service.spec.ts src/catalog/icon-fingerprint.spec.ts
```

Informe todos os painéis esperados com limites distintos quando tiverem a mesma contagem. Sem `bounds`, valida apenas linhas/colunas. O script imprime aprovação, dimensões e tempo, termina com código 1 se falhar e não copia/envia as imagens.

Para medir reconhecimento completo, anote localmente ID e quantidade exata por espaço. Separe capturas de calibração das de avaliação; inclua escalas, idiomas, atualizações e imagens borradas. Meça candidatos corretos, erro numérico, campos pendentes e tempo de correção. Não use as mesmas imagens para anunciar precisão de generalização.

## Publicação do índice

O gerador existente escreve `icon-index-v2.json`, sem alterar assets ou v1. A publicação local SA gerou 21.980 assinaturas, cerca de 6,50 MB antes de compressão. A API valida formato, checksum e limite de 8 MB. Gere na publicação do catálogo, nunca a cada requisição:

```powershell
pnpm --filter @bdo/api build
node apps/api/dist/catalog/build-icon-index.js data/assets/<checksum> <checksum>
```

`scripts/publish-reference-data.ps1` já chama o gerador. Recompile a imagem antes de usar esse fluxo. Índices existentes são preservados: não edite arquivos publicados. Copie v2 junto dos assets ao servidor. A API prefere v2 e detecta sua publicação sem reinício; cache HTTP permanece de cinco minutos. O cliente usa `version=2` para separar o cache do importador anterior.

## Famílias de materiais

Grupos de sangue seguem o [guia oficial SA de Alquimia Avançada](https://www.sa.playblackdesert.com/es-mx/Wiki?wikiNo=71); membros visuais vêm do caminho de ícone do catálogo extraído. A numeração de outros sites varia. Esse agrupamento não implementa substituição nas receitas: a extração atual apresenta IDs específicos, sem um contrato geral de alternativas. O armazém preserva a identidade escolhida.

## Campos de telas e corpus local

Atualizado em 10/10/2026. A rota privada `/scans/profile` usa Tesseract.js com o pacote `por`, detecção por cabeçalhos reconhecidos e parser de campos conhecidos. Ela cobre nome e nível, PA/PD identificados por rótulo, maestria por profissão, capacidade usada no inventário e peso do personagem em LT. Local/capacidade do armazém e carga de mercado em VT aparecem apenas como prévia. A leitura automática não reconhece identidade de item por texto nem grava valores sem seleção explícita de um personagem existente e dos campos.

As capturas atuais estão em `data/ocr-corpus/`, ignorado pelo Git. O manifesto `manifest.json` guarda versão, caminho relativo, SHA-256, dimensões, sessão aproximada, idioma, categorias de tela, divisão e rótulos com limites em pixels. Cada rótulo registra texto de origem, valor conferido e estado. Os nomes dos arquivos locais são derivados do hash. Uma cópia binária repetida foi removida; referências de comunidade e layout não entram na calibração. O validador verifica contenção de caminhos, integridade, dimensões, hashes únicos e limites dos rótulos, e imprime apenas totais:

```powershell
node scripts/validate-ocr-corpus.mjs data/ocr-corpus/manifest.json
```

O corpus contém 13 capturas únicas e 29 rótulos manuais de uma amostra pequena, concentrada em poucas sessões. Todo o material está marcado como calibração. Esses números descrevem a composição do acervo; **não são uma medida de acurácia**, não justificam treino de um modelo próprio e não demonstram generalização para outras interfaces, resoluções ou idiomas. A imagem e o manifesto permanecem locais; só arquivos de distribuição do Tesseract podem ser carregados sob demanda, nunca a captura.

LT e VT são domínios separados. Um valor em VT é somente leitura e nunca preenche `carriedWeight` ou `weightLimit`. Se a unidade de uma fração associada ao rótulo Peso não for lida, os campos ficam ambíguos e desmarcados; o jogador precisa confirmar explicitamente LT antes de selecioná-los. Frações seguidas de LT/VT são excluídas da leitura de capacidade de inventário. A ocupação do armazém só é associada à cidade indicada no cabeçalho do próprio armazém; cidades vizinhas não competem silenciosamente pelo mesmo campo. Conflitos de valores ficam ambíguos e desmarcados. Editar qualquer campo remove sua confirmação anterior; o jogador deve marcá-lo novamente. A tela também compara o valor proposto com o valor atual do personagem selecionado. Não há uso de chat, HUD ou diálogo.

### Avaliar as capturas locais

O leitor amplia capturas pequenas até 1,5×, limitado a 2.400 pixels no maior lado, e converte as caixas OCR de volta para as coordenadas da imagem original. Com o manifesto local validado, execute o mesmo idioma, modo esparso, escala e parser de campos usados pela rota no navegador:

```powershell
node scripts/validate-screen-ocr.mjs data/ocr-corpus/manifest.json --split calibration
```

O relatório agrupa contagens absolutas por tela e campo: `exact`, `unread`, `incorrect`, `ambiguous` e `unsupported`. Só rótulos marcados como conferidos entram na comparação. Antes da comparação, cada candidato precisa pertencer a um tipo de painel compatível com o campo e sua caixa precisa coincidir espacialmente com a área anotada. Valores diferentes para o mesmo campo na região anotada são contados como ambíguos, mesmo quando um deles coincide com o rótulo. Quando o detector não encontra uma tela, a categoria anotada no manifesto é usada apenas para avaliar o parser; `paneSources` informa quantas telas foram detectadas e quantas usaram esse recurso. O JSON não inclui texto OCR, valores esperados, nomes de arquivo nem caminhos. A imagem é lida localmente pelo processo Node e não é enviada a um serviço de OCR.

Resultado observado em 10/10/2026 nas 13 capturas e 29 rótulos de calibração, com associação por painel e região: **16 exatos, 11 sem leitura, 1 incorreto e 1 não suportado; nenhum ambíguo**. Foram reconhecidos 14 painéis automaticamente; 7 categorias anotadas foram usadas como fallback para medir os campos sem atribuir sucesso à detecção da tela. O candidato incorreto permanece visível para revisão e não é aplicado sem confirmação. A amostra não é independente e não representa uma taxa geral de acerto.

O manifesto aceita `calibration` e `evaluation`. Uma mesma `sessionId` não pode aparecer nos dois splits. Cada captura de avaliação exige pelo menos um rótulo `verified`, `authorizationRef` para localizar o registro de permissão/origem e `authorizedAt` com a data da autorização. O comando usa calibração por padrão; para medir um holdout, execute `node scripts/validate-screen-ocr.mjs data/ocr-corpus/manifest.json --split evaluation`. Se o split estiver vazio, a ferramenta falha em vez de publicar uma métrica zero. O relatório inclui o split escolhido e só pontua capturas dele.

Hoje as 13 capturas únicas continuam em `calibration`; `evaluation` está vazio. Não há ainda avaliação independente do OCR de tela. Adicione somente novas capturas reais com origem e autorização registradas, de sessões que não aparecem na calibração; anote cada campo diretamente no jogo antes de marcar a captura como `evaluation`. As imagens existentes não devem ser promovidas para avaliação, pois já foram usadas na calibração. A revisão manual permanece obrigatória até haver dados independentes suficientes e uma avaliação por campo/tela que sustente mudança.

## Pipeline de amostras sintéticas e reais

Os scripts abaixo criam um conjunto local para armazéns e inventários e exercitam os leitores existentes. A meta 80/20 é uma proporção de volume, não uma autorização para coletar imagens. Capturas reais só são baixadas com permissão registrada para cada origem. O acesso público a uma postagem não concede, por si só, direito de treinamento; confira os [termos oficiais da API do Reddit](https://redditinc.com/policies/data-api-terms) e mantenha a evidência de autorização do titular.

### Gerar capturas sintéticas

O gerador usa ícones WebP de itens publicados no catálogo local fornecido por `--catalog`; não extrai arquivos do cliente do jogo e não inventa IDs. Ele produz JPEGs de 1920×1080, 2560×1440 e 3840×2160, escalas de interface 100%, 110% e 120%, grades de oito/nove colunas, valores comuns e abreviados, e tiers romanos I–X. O manifesto mantém hash, split, resolução, parâmetros, retângulos exatos dos slots e rótulos.

```powershell
node scripts/generate-synthetic-ocr-dataset.mjs --count 18 --seed 4102026 --split calibration --catalog data/assets/<checksum> --output tmp/ocr-dataset/synthetic
node scripts/generate-synthetic-ocr-dataset.mjs --count 18 --seed 4102027 --split evaluation --catalog data/assets/<checksum> --output tmp/ocr-dataset/synthetic-evaluation
```

O split padrão é `calibration`. Use outra seed para `evaluation`; não ajuste leitores com o conjunto que será usado para medir avaliação. A saída é ignorada pelo Git em `tmp/ocr-dataset/`. O gerador recusa diretórios de saída não vazios sem o marcador próprio; `--overwrite` só substitui imagens listadas em um manifesto válido do próprio gerador.

### Coletar capturas autorizadas

`scripts/scrape-bdo-screenshots.mjs` ingere URLs diretas de guias autorizados sem navegar ou rastrear páginas. Cada fonte exige `sourceId`, provedor, URLs de imagem, hosts HTTPS permitidos, status de autorização, finalidade (`validation` ou `training`), titular, referência da autorização e data. Para Reddit, inclua também o `postId` e use somente a API OAuth oficial de `r/blackdesertonline`; nunca use endpoint anônimo ou scraping HTML.

Exemplo de manifesto de guia (substitua os campos somente por uma fonte cuja permissão foi registrada):

```json
{
  "schemaVersion": 1,
  "sources": [
    {
      "sourceId": "guide-example-001",
      "provider": "guide",
      "imageUrls": ["https://images.example.org/bdo/storage.jpg"],
      "allowedHosts": ["images.example.org"],
      "status": "authorized",
      "use": "validation",
      "rightsHolder": "Titular identificado no registro local",
      "authorizationRef": "referencia-local-de-consentimento",
      "authorizedAt": "2026-10-10T12:00:00.000Z"
    }
  ]
}
```

Para imagens de guia, não configure credenciais Reddit:

```powershell
node scripts/scrape-bdo-screenshots.mjs --sources tmp/ocr-sources.json
```

Para pesquisar Reddit, solicite credenciais de um aplicativo OAuth registrado e informe-as apenas no ambiente do processo. O User-Agent deve identificar o aplicativo e um contato real. Não salve o token no manifesto, no repositório ou no terminal.

```powershell
$env:REDDIT_ACCESS_TOKEN = '<token OAuth emitido para o aplicativo registrado>'
$env:REDDIT_USER_AGENT = 'web:BlackMarketOCR:1.0 (contact: contato-do-responsavel)'
node scripts/scrape-bdo-screenshots.mjs --sources tmp/ocr-sources.json --query storage --limit 25 --use validation
```

O coletor cruza ID da postagem e URL exata com a permissão, limita redirects e bytes, valida o formato decodificado, e aceita apenas imagens de pelo menos 1920×1080. O manifesto usa SHA-256 para nomes e deduplicação sem perder a proveniência por titular. A URL gravada remove query strings; tokens OAuth nunca são armazenados. Não há downloads reais automatizados pelos testes. A coleta precisa das credenciais e registros de permissão do operador.

Para revogar uma fonte, altere seu status para `revoked` no manifesto e execute a limpeza local:

```powershell
node scripts/scrape-bdo-screenshots.mjs --sources tmp/ocr-sources.json --prune-revoked
```

A limpeza verifica o marcador do coletor e só remove arquivos cujo hash não tenha outra autorização ativa no manifesto. A finalidade `validation` nunca dá direito de treino. Mesmo uma autorização `training` permanece sem elegibilidade até que os rótulos tenham sido revisados manualmente; screenshots reais não recebem ground truth automático.

### Privacidade e proporção do corpus

Imagens, URLs de origem, evidências de consentimento, manifestos e relatórios permanecem locais em `tmp/ocr-dataset/real/` e `tmp/ocr-dataset/`; não são enviados ao serviço de OCR nem incluídos no Git. O manifesto registra a meta de 80% sintético/20% real, além das capturas disponíveis, mas os percentuais reais só podem ser medidos depois de coleta autorizada. Não aumente a amostra para alcançar 20% sem novos registros de permissão.

### Medir o leitor

O benchmark usa o detector de grades, o leitor Tesseract em português com modo esparso, a escala do `ScreenTextReader` e os parsers de quantidade e aprimoramento existentes no frontend. Ele valida hash e dimensões antes de OCR, pontua a grade por associação um a um e IoU mínimo de 0,5, e associa texto aos limites rotulados no manifesto. Em imagens de 4K, limita o maior eixo do recorte de OCR a 2.400 px para manter o consumo de memória previsível; as coordenadas reconhecidas voltam à resolução original. A divisão `evaluation` é padrão; `calibration` exige seleção explícita. O JSON agregado não inclui texto OCR, rótulos esperados, caminhos ou URLs.

```powershell
node scripts/benchmark-ocr.mjs --manifest tmp/ocr-dataset/synthetic-evaluation/ground-truth.json --output tmp/ocr-dataset/benchmark.json
node scripts/benchmark-ocr.mjs --manifest tmp/ocr-dataset/synthetic/ground-truth.json --split calibration --output tmp/ocr-dataset/benchmark-calibration.json
```

`--real-manifest` acrescenta contagens de capturas reais únicas, rótulos revisados e permissões de treino. Capturas reais não rotuladas não entram nas métricas de leitura. O relatório separa precisão, recall e F1 da grade; acurácia, incorretos e não lidos para números comuns, abreviados e tiers romanos; e resultados por variante. A acurácia exige igualdade exata do valor normalizado.

Na avaliação local de 18 telas sintéticas em 10/10/2026, a grade atingiu F1 1,0 (837 slots encontrados, sem falsos positivos ou negativos). O leitor identificou exatamente 47 de 576 quantidades (8,16%; 31/273 comuns e 16/303 abreviadas) e 3 de 45 tiers romanos (6,67%). A baixa leitura dos rótulos revela um problema do OCR atual em texto pequeno sobre ícones; esses valores são um diagnóstico do lote sintético, não uma estimativa de acurácia em capturas reais. Não houve coleta real: a execução depende de credenciais OAuth e permissões registradas.
