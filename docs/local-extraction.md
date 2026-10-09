# Extração local do cliente SA

**Atualização em 9/10/2026:** o patch de 8/10 alterou formatos de experiência e buffs. Para atualizar receitas neste cliente, use o perfil e as instruções de [atualização do catálogo](recipe-catalog-update.md). Esse perfil preserva todas as relações de receitas dos XMLs e registra metadados omitidos; a receita permanece diferente de uma promessa de rendimento no servidor. Os comandos de extração completa abaixo exigem um extractor compatível com todas as tabelas.

O Black Market lê a instalação Steam com o [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor), em modo de leitura. O jogo não precisa estar aberto. Aguarde o launcher concluir os patches antes de extrair.

## Ferramentas usadas nesta instalação

- Cliente: `C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online`.
- Região configurada em `service.ini`: `SA`; localização: `ads/languagedata_pt.loc`.
- Extractor fixado no commit `5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2`.
- Go portátil 1.27.1 para Windows amd64, obtido em [go.dev](https://go.dev/dl/), com SHA-256 verificado contra o índice oficial.
- Código, compilador, caches e executável ficam em `data/tools/`, ignorado pelo Git. Não há instalação global do Go.

O texto de ajuda do extractor ainda lista `en/de/fr/sp`, mas esta revisão lê `ads/languagedata_<lang>.loc` sem uma lista fixa. A extração em `pt` foi concluída com nomes como “Moeda de Prata” e “Pedra Negra”. Outros clientes precisam fornecer seu próprio arquivo de localização; não rotule dados ingleses como portugueses.

## Preparar o extractor

Na raiz do projeto, com Go 1.26 ou superior disponível:

```powershell
New-Item -ItemType Directory -Path data/tools -Force
git clone https://github.com/iDevelopThings/bdo-data-extractor.git data/tools/bdo-data-extractor
git -C data/tools/bdo-data-extractor checkout 5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2
$env:GOPATH = Join-Path (Get-Location).Path 'data/tools/go-cache'
Push-Location data/tools/bdo-data-extractor
go build -o ../bdo-data-extractor.exe .
Pop-Location
```

Nesta máquina, o Go portátil está em `data/tools/go-runtime/go/bin/go.exe`. Se ele não está no PATH, use seu caminho absoluto no lugar de `go`. Não há binário, JSON ou imagem do cliente distribuído pelo repositório. A [licença do extractor](https://github.com/iDevelopThings/bdo-data-extractor/blob/main/LICENSE.md) limita seu código ao uso não comercial e não concede direitos sobre assets da Pearl Abyss.

## Extrair após um patch

Com PowerShell 7, na raiz do projeto:

```powershell
./scripts/extract-game-data.ps1
```

Parâmetros opcionais: `-GamePath`, `-ExtractorPath`, `-ExtractorCommit`, `-Locale` e `-Region`. Ao recompilar outra revisão do extractor, informe seu commit real. O script cria `data/extracted/<versão>/`, registra SHA-256 do executável, índice PAZ e localização, executa `build` e `icons`, e confere os arquivos de referência novamente ao terminar. Não calcula o hash de todos os 85 GB de arquivos PAZ: o identificador usa o índice e a localização, enquanto o importador calcula outro checksum sobre os três JSONs importados.

A pasta existente não é sobrescrita. Uma falha ou atualização do cliente durante a extração interrompe o fluxo. `provenance.json`, `build.log` e `icons.log` ficam locais para diagnóstico. Uma saída com status `failed` não deve ser importada; preserve-a para investigar a incompatibilidade.

## Importar no PostgreSQL com Docker

Defina `$taskVersion` com a versão exibida pelo script. Execute após o build da imagem atual do projeto:

```powershell
docker compose build api
docker compose up -d postgres
docker compose --profile data run --rm --no-deps import pnpm db:migrate
$taskVersion = 'sa-pt-meta-337651819fe3-loc-db615a33d45a-ext-5bf11bd7'
docker compose --profile data run --rm --no-deps import node apps/api/dist/catalog/import-game-data.js --input "/workspace/data/extracted/$taskVersion" --version $taskVersion --region sa --locale pt --assets /workspace/data/assets
docker compose --profile web up -d
```

O importador valida o formato, IDs únicos e relações antes de publicar. Aceita referências antigas numéricas e referências atuais `urn::item:<id>`. Converte graus numéricos para códigos de cor e marca itens sem localização como `Item #<id> (sem nome no cliente)`. Quantidade ausente/zero no XML permanece desconhecida. Receitas idênticas são deduplicadas; `byproductOf` é preservado e não representa rendimento garantido.

O catálogo troca de versão em uma transação. Ícones de itens são validados como WebP e publicados antes da ativação em `data/assets/<checksum>/`. O manifesto do extractor associa IDs a imagens compartilhadas; não presumimos um arquivo por ID. Apenas esses ícones são expostos pela API, com cache imutável por checksum. Arquivos ausentes mantêm a inicial do item na interface. A pasta fica montada em modo de leitura na API; não incluímos localização, tabelas, backups ou outros assets nessa rota.

Para importar pelo host, `pnpm --filter @bdo/api data:import -- --input <pasta> --version <versão> --region sa --locale pt --assets <pasta-assets>` usa `DATABASE_URL` do ambiente. Configure `CATALOG_ASSETS_DIR` para essa mesma pasta quando iniciar a API. O importador mantém `en` como padrão se `--locale` for omitido, por compatibilidade: informe sempre o idioma real.

## Resultado da primeira extração

Extração em 7 de outubro de 2026:

| Conjunto                              |                  Quantidade | Destino                                    |
| ------------------------------------- | --------------------------: | ------------------------------------------ |
| Itens                                 |                      74.216 | Catálogo PostgreSQL                        |
| Sem nome localizado                   |                         730 | Mantidos por ID                            |
| Categorias principais + subcategorias |                    18 + 194 | Catálogo PostgreSQL                        |
| Receitas na saída                     |                       5.063 | 4.406 receitas distintas após normalização |
| Receitas de subproduto                |                         569 | Relação preservada                         |
| Ícones de itens                       | 70.556 IDs / 21.980 imagens | Assets locais compartilhados e versionados |
| Outros artefatos JSON                 |                          20 | Extraídos localmente; integração pendente  |

O build também gerou conhecimento, mundo/nodes, NPCs, zonas, fishing spots, progressão, mastery, aprimoramento, Caphras e outros conjuntos. Esses arquivos estão disponíveis localmente para futuras funcionalidades, mas ainda não foram integrados às telas ou às fórmulas. `manufacture.json` contém receitas cujos resultados podem depender do servidor; não inventamos esses resultados.

O backup anterior à primeira importação está em `data/backups/before-first-extraction.dump`. Os arquivos locais são excluídos do Git e do contexto Docker. O repositório privado contém somente código e documentação.

## Atualização e preços

Depois de um patch: atualizar o cliente, executar o script novamente e importar a nova versão. Não há monitor automático do launcher nesta entrega. Preços, estoque e histórico do Central Market são dados do servidor e continuam no adaptador de mercado separado; executar o extractor não atualiza preços. Veja [pipeline e fontes](data-pipeline.md).
