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
