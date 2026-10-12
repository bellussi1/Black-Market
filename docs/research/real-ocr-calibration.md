# Calibração do Scan com capturas reais

## Dados e separação

`scripts/build-real-slot-corpus.mjs` transcreve 180 quantidades visíveis de duas capturas fornecidas pelo usuário. Imagens e manifestos permanecem locais em `data/ocr-corpus/`, excluídos do Git. O script verifica origem e SHA-256, e `real-ocr-corpus.mjs` rejeita vazamento de sessão/imagem entre calibração e avaliação, além de coordenadas fora da captura.

- Calibração: `velia-20261008`, sessão `session-2026-10-08-1747`, grade de 90 slots, captura recortada de 513×571.
- Avaliação reservada: `velia-20261010`, sessão `session-2026-10-10-1413`, grade de 90 slots em captura de 1600×899.
- Abreviações representam o número exibido normalizado. `1.3M` não comprova uma pilha exata de 1.300.000. Continua exigindo revisão.
- Seis referências visuais de ícones foram conferidas com os assets locais (5301, 5302, 4801, 4802). São referências de família de ícone; não comprovam um ID único entre aliases. Os IDs exatos permanecem sem rótulo e sua acurácia é `null`, nunca zero ou uma taxa inventada.
- Este piloto contém armazéns. Ainda faltam inventários rotulados, mais sessões, fontes de UI/resoluções e IDs confirmados por tooltip ou declaração do titular.

## Pipeline

```powershell
node scripts/build-real-slot-corpus.mjs
node scripts/calibrate-quantity-glyphs.mjs
pnpm exec prettier --write apps/web/src/app/features/scans/quantity-real-glyphs.ts
```

O calibrador extrai máscaras apenas das sessões de calibração, nos limiares 150/170/190, com alinhamento por rótulo transcrito. Gera 273 variantes de caracteres e um perfil local em `tmp/ocr-dataset/real-quantity-profile.json`. Não treina pesos do Tesseract. A segmentação por colunas exige separação dos caracteres; falha em caracteres unidos ou muito pequenos.

O gerador aceita `--quantity-profile tmp/ocr-dataset/real-quantity-profile.json`, junto com `--catalog`, para renderizar quantidades com máscaras medidas, alinhamento à direita e contorno preto. Registra as fontes de calibração no manifesto e bounds das máscaras. Caracteres sem máscara usam o renderizador anterior; slots medidos recebem `labelRenderer`. Dois exemplos foram gerados em `tmp/ocr-dataset/measured-calibration/`. Reprodução sintética e hashes não demonstram ganho de acurácia real.

`scripts/browser-scan-benchmark.mjs` exporta `benchmarkScanPage(page, imagePath)`: upload pela UI, detecção automática e execução do ScansPage real, seguida de comparação do leitor de caracteres isolado com o NumberReader usando somente o Tesseract. Requer servidor de desenvolvimento em localhost:4200 e Playwright; utiliza `ng.getComponent`, indisponível em produção. Ground truth não entra no browser. Pode ser incorporado num callback do `playwright-cli run-code --filename`; o CLI não permite import dinâmico no callback.

```powershell
node scripts/evaluate-scan-reader-output.mjs data/ocr-corpus/lifeskill-slots.json velia-20261010 tmp/real-ocr-independent-comparison.log tmp/real-ocr-independent-comparison-report.json
```

O scorer associa slots por IoU ≥ 0,5, sem premiar sugestões incertas. Reporta rótulo visível, quantidade aceita, pares aceitos incorretos, candidatos para referências de ícone, revisão e duração. As métricas de cada leitor usam exatamente os mesmos recortes. Uma imagem não mede o desempenho da aplicação inteira.

## Medição de 12/10/2026

| Métrica                                     | Calibração | Avaliação reservada |
| ------------------------------------------- | ---------: | ------------------: |
| Slots associados                            |      90/90 |               90/90 |
| Rótulos visíveis corretos no fluxo completo |      66/90 |               30/90 |
| Quantidades aceitas corretas                |      37/39 |               18/20 |
| Quantidades aceitas erradas                 |          2 |                   2 |
| Slots enviados para revisão                 |      84/90 |               89/90 |
| Tempo do fluxo completo                     |    12,31 s |              9,20 s |

Avaliação reservada: leitor de caracteres isolado 0/90 (306 ms), Tesseract isolado 22/90 (3,23 s). A combinação não é uma soma: confiança, conflito e fallback alteram decisões. Cobertura dos dois ícones de referência na avaliação: 0/2 candidatos. Os dados atuais não demonstram melhoria de reconhecimento de itens nem segurança para reduzir revisão. Os resultados anteriores de 7,59% eram de OCR textual geral em sintéticos e não são um baseline comparável.

Para preparar um callback executável sem imports no sandbox do CLI:

```powershell
node scripts/prepare-scan-benchmark.mjs data/ocr-corpus/lifeskill-slots.json velia-20261010
npx --yes --package @playwright/cli playwright-cli -s=ocr-evaluation open http://localhost:4200/scans
npx --yes --package @playwright/cli playwright-cli -s=ocr-evaluation run-code --filename tmp/ocr-dataset/velia-20261010-browser.js > tmp/ocr-evaluation.log
node scripts/evaluate-scan-reader-output.mjs data/ocr-corpus/lifeskill-slots.json velia-20261010 tmp/ocr-evaluation.log tmp/ocr-report.json
```

O harness compara também o arredondamento e a ausência de suavização do recorte local. Sua versão inicial usava interpolação diferente; a comparação foi repetida para corrigir o harness, sem recalibrar o modelo na avaliação.

O limiar de quantidade exata foi elevado de 50 para 85, mas confiança não garante acerto, como demonstram os dois erros restantes. Ausência de texto continua como dúvida. Ícones ambíguos apresentam opções sem selecionar o primeiro ID arbitrariamente.

## Continuidade

Preservar esta sessão de avaliação sem ajustá-la para obter resultados favoráveis. Caso seus erros sejam usados para calibrar uma nova versão, registrar sua promoção para diagnóstico e reservar uma nova sessão independente. Priorizar segmentação e escala de texto em slots pequenos e cobertura do candidato correto no índice, antes de alterar thresholds para aceitar mais resultados. Completar rótulos reais de inventário e IDs com evidência; medir pares corretos antes de liberar qualquer confirmação automática.
