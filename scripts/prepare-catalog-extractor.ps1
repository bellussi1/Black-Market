param([string]$ExtractorDirectory = '', [string]$GoPath = '')
$ErrorActionPreference = 'Stop'
$recipeWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $ExtractorDirectory) { $ExtractorDirectory = Join-Path $recipeWorkspace 'data/tools/bdo-data-extractor' }
if (-not $GoPath) { $GoPath = Join-Path $recipeWorkspace 'data/tools/go-runtime/go/bin/go.exe' }
$recipeCommit = (git -C $ExtractorDirectory rev-parse HEAD).Trim()
if ($recipeCommit -ne '5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2') { throw 'Patch preparado para o extractor v0.1.9. Confira a revisão antes de recompilar.' }
$recipePatch = Join-Path $PSScriptRoot 'patches/extractor-character-progression.patch'
git -C $ExtractorDirectory apply --reverse --check $recipePatch 2>$null
if ($LASTEXITCODE -ne 0) {
  git -C $ExtractorDirectory apply --check $recipePatch
  if ($LASTEXITCODE -ne 0) { throw 'O patch conflita com alterações locais. Preserve o código e revise.' }
  git -C $ExtractorDirectory apply $recipePatch
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao aplicar o patch do extractor.' }
}
$env:GOPATH = Join-Path $recipeWorkspace 'data/tools/go-cache'
$regionalPatch = Join-Path $PSScriptRoot 'patches/extractor-sa-recipes.patch'
git -C $ExtractorDirectory apply --reverse --check $regionalPatch 2>$null
if ($LASTEXITCODE -ne 0) {
  git -C $ExtractorDirectory apply $regionalPatch
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao aplicar correção regional SA.' }
}
& $GoPath -C $ExtractorDirectory build -o ../bdo-catalog-extractor.exe .
if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar o extractor.' }
Write-Output 'Extractor preparado. -RecipeCatalogOnly mantém itens, receitas e geografia; omite buffs, habilidades, progressão e curvas de aprimoramento.'
