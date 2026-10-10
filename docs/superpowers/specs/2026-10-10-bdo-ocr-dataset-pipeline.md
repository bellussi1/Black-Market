# Especificação: pipeline local de dados OCR para armazém e inventário BDO

**Data:** 10 de outubro de 2026  
**Estado:** arquitetura aprovada; revisão desta especificação pendente  
**Escopo:** geração sintética reproduzível, coleta real autorizada e benchmark local dos leitores existentes.

## Objetivo

Criar um conjunto local que permita medir e calibrar a leitura de grades de armazém e inventário, quantidades e aprimoramentos. A geração sintética deve produzir rótulos exatos; as capturas reais servem para validação de mundo real e só podem entrar em avaliação/treino quando houver rótulos revisados e autorização documentada.

As imagens e os relatórios que contenham nomes/caminhos de origem ficam fora do Git. Os scripts não enviam capturas a serviços remotos. Não é objetivo desta etapa treinar um modelo visual próprio: o benchmark deve exercitar os detectores, parsers e OCR já presentes no monorepo e expor seus erros.

## Abordagens consideradas

1. **Gerador SVG/Sharp + leitores atuais + coletor com fontes autorizadas (escolhida).** Usa Sharp que já existe em `apps/api`, SVG para compor painéis e rótulos, `tesseract.js` já existente e os parsers de `apps/web/src/app/features/scans`. Não adiciona dependências. O resultado é um benchmark local e reprodutível; a tipografia sintética aproxima a interface, sem alegar ser a fonte ou renderização exata do jogo.
2. **Canvas e novo modelo de OCR.** Acrescentaria dependências e exigiria volume/diversidade de imagens rotuladas suficiente para evitar sobreajuste. Não é necessário para avaliar o leitor atual.
3. **Raspagem pública sem autenticação.** Não será implementada. As regras oficiais do Reddit exigem acesso autorizado; os termos da API não concedem automaticamente direitos de treinamento sobre conteúdo de usuários. O coletor usa OAuth oficial e exige permissão registrada por amostra, ou ingere fontes/licenças autorizadas. [Política do Reddit](https://support.reddithelp.com/hc/en-us/articles/360043512931-Don-t-break-the-site) · [Termos da API](https://redditinc.com/policies/data-api-terms)

## Componentes

### 1. Gerador sintético

Criar `scripts/generate-synthetic-ocr-dataset.mjs`. O script é determinístico por seed, exporta funções para testes e só executa o CLI quando chamado diretamente. Reutiliza `sharp` via resolução do pacote existente `apps/api`; não instala `canvas` nem bibliotecas adicionais.

Renderiza painéis próprios inspirados no estilo do BDO, com fundos escuros, cabeçalhos, bordas e slots afundados. Produz grades de 8 e 9 colunas e panes de armazém/inventário; ocupa slots aleatoriamente com IDs e ícones existentes do catálogo local. Não extrai nem empacota arquivos do cliente do jogo. Se o catálogo ou ícones não estiverem instalados, o comando falha com uma mensagem acionável em vez de inventar IDs.

Cada amostra varia resolução (1920×1080, 2560×1440 ou 3840×2160), escala de UI (100%, 110%, 120%), densidade, ocupação, pequenos artefatos de ruído e compressão JPEG. Os textos incluem inteiros de 1 a 999, quantidades com sufixos `k`/`M` e tiers romanos I–X. Os rótulos numéricos usam contorno ou sombra escura de 1–2 px. A composição usa fontes locais disponíveis com fallback; a saída registra fonte/variante usada e não afirma fidelidade pixel a pixel à fonte proprietária do jogo.

Saída padrão:

```text
tmp/ocr-dataset/synthetic/
  images/<sample-id>.jpg
  ground-truth.json
```

O manifesto versão 1 contém seed, parâmetros da amostra, hash SHA-256, resolução, idioma, tela, grade e uma lista de slots. Cada slot tem índice de linha/coluna, caixa `left/top/width/height` em pixels da imagem final, ID de item, tipo de rótulo (`quantity` ou `enhancement`), texto exibido e valor esperado normalizado. Valores abreviados também marcam que a leitura é aproximada pelo formato exibido (por exemplo, `139.1k` representa `139100` na métrica de conversão, não a contagem não abreviada original do jogo). Slots vazios são anotados para avaliar falsos positivos.

CLI mínimo: `--count`, `--seed`, `--output`, `--catalog` e `--help`. Por padrão, uma execução nova substitui apenas o conjunto sintético gerado pelo próprio comando ou recusa sobrescrever quando o destino não pertence ao pipeline; nunca remove diretórios fornecidos pelo usuário.

### 2. Coletor real e proveniência

Criar `scripts/scrape-bdo-screenshots.mjs`. Deve usar API oficial registrada do Reddit via OAuth (sem HTML, endpoint JSON anônimo, rotação para contornar limites ou scraping de páginas); aceita fontes de guias por uma lista allowlist/manifesto de URLs explicitamente autorizadas. Não tenta autenticar por scraping e não assume que “público” significa autorizado para treinamento.

O fluxo exige credenciais OAuth no ambiente e um registro de permissão/licença para cada origem antes de retenção. O registro identifica base de uso (`validation` ou `training`), titular/fonte, escopo autorizado e evidência/referência da autorização. Se a fonte não autorizar treino, uma imagem pode ser guardada apenas como validação local autorizada; sem base registrada, não é baixada nem mantida. O script respeita limites e exclusões/removals expostos pela API e oferece modo de limpeza de entradas expiradas ou revogadas.

Baixa somente imagens de hosts/imagens aceitos por configuração, com tamanho máximo configurável e decodificação por Sharp. Rejeita dimensões menores que 1920×1080, formatos inesperados, respostas que não sejam imagens, URLs não autorizadas, redirecionamentos para hosts fora da allowlist e conteúdo acima do limite. Nomes locais derivados do hash, não do título ou nome de usuário.

Saída padrão:

```text
tmp/ocr-dataset/real/
  images/<sha256>.<ext>
  manifest.json
```

O manifesto registra ID/hash, URL de origem, ID da postagem/referência, data de coleta, licença/consentimento, finalidade permitida, dimensões, formato, idioma/tela quando conhecidos, estado do rótulo e eventual agrupamento por sessão. Não registra tokens OAuth. Conteúdo não rotulado não entra no benchmark nem no conjunto de treino. Imagens reais nunca recebem ground truth inferido automaticamente.

### 3. Benchmark local

Criar `scripts/benchmark-ocr.mjs`. Lê o `ground-truth.json`, valida caminhos, hashes e dimensões, executa a detecção de grades e OCR/parsings existentes, e grava um relatório agregado em JSON sem texto bruto ou caminho da origem. O acesso aos módulos TypeScript do frontend segue o padrão local já usado em `scripts/validate-screen-ocr.mjs`; a imagem permanece local e o script não altera perfis ou estoque.

Métricas:

- **Detecção de slots:** correspondência entre slot esperado e slot derivado das grades detectadas, com IoU de pelo menos 0,5; informar encontrados/corretos, não encontrados, falsos positivos, precisão, revocação e F1.
- **Quantidade:** exatidão do valor numérico parseado, incluindo interpretação de `k` e `M`; leitura ausente ou incorreta conta como erro. Reportar separadamente rótulos abreviados e comuns.
- **Romano:** exatidão da leitura do tier I–X nos slots de equipamento; ausente conta como erro.

As métricas são calculadas por resolução, escala, tipo de grade e classe de rótulo, além do agregado. O relatório inclui `evaluatedAt`, versão dos parsers e configuração de confiança, mas não apresenta um único percentual como garantia de desempenho geral. Capturas sintéticas usadas para calibrar parâmetros não servem também como avaliação independente: o manifesto precisa separar `calibration` e `evaluation` por seed/variante. Capturas reais só entram em uma seção distinta quando autorizadas e anotadas manualmente.

CLI mínimo: `--manifest`, `--output` e `--help`. Sem OCR disponível ou sem catálogo necessário, o comando falha claramente; não substitui métricas ausentes por zero.

## Proporção e separação de dados

O alvo de volume é 80% sintético e 20% real no planejamento do corpus. Como exemplos reais são de validação e podem ser não rotulados ou limitados por licença, o relatório conta separadamente as proporções disponíveis e nunca incorpora amostras reais ao treino sem autorização de treinamento e rótulos revisados. O benchmark não mistura conjuntos: sintético rotulado, real rotulado autorizado e real não rotulado têm estados separados.

## Privacidade e segurança operacional

- Adicionar `tmp/ocr-dataset/` ao `.gitignore`; nenhum binário de amostra, token, arquivo de origem ou relatório com metadados pessoais é commitado.
- Restringir downloads a HTTPS e hosts autorizados; validar redirecionamentos, tamanho declarado e efetivo, formato real do arquivo e dimensão decodificada.
- Não executar comandos de exclusão recursiva sobre caminhos configuráveis. Sobrescrita/limpeza deve validar que o destino final está dentro do diretório esperado e contém marcador do pipeline.
- Não registrar tokens, URLs assinadas, nomes de usuário, título de postagem ou OCR bruto no terminal. Logs sem emoji.
- A proporção 80/20 é um alvo medido, não uma licença para coletar mais dados nem para enviar imagens a serviços externos.

## Testes e critérios de aceite

- Testes de unidade verificam seed/determinismo, caixas exatas e limites, valores de quantidade, numerais romanos, métricas de precisão/revocação/F1 e validações de manifesto.
- Testes do coletor usam HTTP e respostas simuladas; cobrem exigência de OAuth/consentimento, host permitido, redirecionamento, tamanho e rejeição de imagem abaixo de 1920×1080 sem chamar Reddit real.
- Integração sintética gera um lote pequeno, confere manifestos contra imagens e executa benchmark offline. Cobrir pelo menos 8 e 9 colunas, e o conjunto de variantes exigido.
- `pnpm test` e `pnpm check` concluem sem falhas; executar benchmark pequeno e guardar somente o relatório agregado local em `tmp/`.
- `docs/ocr-validation.md` documenta comandos, formato dos dados, métricas e limitações; `docs/ACTIVE_CONTEXT.md` registra resultados e próximos passos.

## Fora de escopo

Treinar/publicar um modelo novo, fazer scraping anônimo, obter credenciais OAuth, capturar jogo ao vivo, copiar a fonte/arte de interface do cliente, rotular screenshots reais automaticamente ou garantir 20% de amostras reais antes de existirem fontes autorizadas e rótulos revisados.
