# Família preenchida, administração e efeitos compartilhados

Continuação autorizada da auditoria em **19/10/2026**, na branch `codex/ui-ux-audit-completion`. A base anterior está em [reconciliação da auditoria](ui-standardization-completion-2026-10-19.md). Este relatório descreve a validação de apresentação com dados sintéticos, sem certificar login real, autorização do servidor ou publicação administrativa.

## Implementação

- Família: trilhas `minmax(0, 1fr)`, filhos com `min-width: 0` e nomes longos com quebra; corrigidos lista de personagens, complementos de pets/montarias e badge de equipamento. O cabeçalho global também permite reflow dos controles e limita a largura do nome, preservando o texto por quebra.
- Administração: Roadmap e Tutoriais usam `HlmButton`, `HlmInput`, `HlmTextarea` e `BdoSelect`; estilos duplicados de controles foram removidos. Papéis primário, secundário e destrutivo usam variantes existentes. O editor de tutoriais seleciona a tela em um select rotulado, preservando rascunhos por tela, rota e nome do contexto.
- Bug funcional: o botão Adicionar etapa bloqueava na oitava etapa, enquanto a validação compartilhada e o método permitiam doze. O template agora consome `TUTORIAL_MAX_STEPS`, com teste observado falhando antes e passando após a correção.
- Primitivas: botões com texto usam altura mínima e quebra de rótulo; ícones mantêm 36×36 px. Disabled nativo também recebe aparência desativada, inclusive dentro de fieldset. Transições restringem propriedades e usam o token de duração.
- Tokens ativos: raio, raio interno, espessura de borda, tamanho de slot, scrim/blur, sombra de janela/slot/hover e seleção. Consumidores migrados em controles, formulários, painéis, Helm, Família, login e overlay de otimização. Geometria específica da árvore/equipamento e outros efeitos locais continuam tendo seus próprios valores; não se declara tokenização universal.

## Pesquisa pública

Consulta em 19/10/2026 pelo leitor web, sem login ou coleta de datasets. Não houve alteração de cálculo nem comparação numérica.

| Fonte                                                     | Observação                                                                                         | Aplicação/limite                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Garmoth](https://garmoth.com/character/default)          | Navegação pública Character Info, Passives & Fame, Gear Builder e Upgrade Path, contexto inglês/EU | Confirma separação por contexto; não prova algoritmo ou cobertura administrativa |
| [BDO Codex](https://bdocodex.com/us/)                     | Navegação pública de catálogo e acesso separado de conta                                           | Nenhum editor administrativo equivalente verificável nessa superfície            |
| [BDO Workshop](https://bdoworkshop.com/crafting-workshop) | Leitor não conseguiu acessar                                                                       | Sem inferir ausência de recurso                                                  |
| [BDOLytics](https://bdolytics.com/en/SA/cooking/market)   | Leitor não conseguiu acessar                                                                       | Sem confirmar conteúdo interno, números ou algoritmo                             |

## QA reproduzível e isolamento

`scripts/qa-ui-layout.mjs` executa contra um **build de desenvolvimento local**, em contexto novo do Chrome headless, sem carregar o perfil do usuário. `UI_QA_ORIGIN` aceita somente localhost. O runner requer Playwright disponível no ambiente, por resolução normal ou pelo caminho absoluto em `QA_PLAYWRIGHT_MODULE`.

Todas as chamadas `/api/**` são interceptadas. O runner configura sinais de identidade e fixtures pelo runtime de debug Angular apenas nessa instância isolada; não altera guards, API ou configuração de autenticação do produto. Família tem dois personagens, maestrias, equipamento, dados compartilhados, pet/montaria e nomes longos sem espaços. Gavetas de complementos são abertas. Quatro PUTs simulados exercitam erro e sucesso de salvar Roadmap/Tutoriais; nenhuma requisição de gravação chega ao servidor.

Exemplo PowerShell, após compilar e servir o build de desenvolvimento em 4202:

```powershell
$env:UI_QA_ORIGIN = 'http://localhost:4202'
$env:QA_PLAYWRIGHT_MODULE = 'C:\caminho\node_modules\playwright\index.mjs'
pnpm test:ui:layout
```

O runner aguarda fontes, conteúdo e término de animações finitas antes de medir/capturar. Isso evita capturar duas rotas durante a transição. O teste de foco usa modalidade de teclado, pois foco programático após clique não exige `:focus-visible`.

## Matriz e limites

Cinco superfícies: Personagem, Equipamento, Família compartilhada, Roadmap administrativo e Tutoriais administrativos. Cinco resoluções: 1920×1080, 2560×1440, 1600×900, 1366×768 e 390×844. Dez amostras adicionais correspondem a 125%/150% em monitor de referência 1920×1080: viewport CSS 1536×864/DPR 1,25 e 1280×720/DPR 1,5. Total: **35 amostras**.

Zoom usa emulação CDP de viewport/DPR, não o comando nativo de zoom do navegador. Capturas desse cenário usam CDP diretamente para não resetar a emulação. A medição verifica largura do documento e limites de descendentes de conteúdo/cabeçalho, incluindo overflow cortado por ancestrais. Canvas e geometria especializada explicitamente roláveis são exceções.

Na linha de base, a amostra preenchida revelou transbordamento em Família compartilhada em 1366 px e 150%, e nas três abas de Família em 390 px. O badge de nome de Equipamento também precisou de correção após a primeira iteração.

`pnpm test:ui:layout` passou: **35 amostras, zero overflow detectado, zero erros de página não tratados**, negação administrativa apresentada após remoção do papel simulado, quatro gravações interceptadas. Troca de tela de tutorial, adição da nona etapa e limite de doze passaram. Roadmap/Tutoriais passaram salvando → erro com rascunho preservado → sucesso. Foco de Família computou outline sólido de 2 px, e reduced-motion computou `0.00001s`.

Capturas e métricas fora do Git: `C:/Users/Bellussi/.codex/visualizations/2026/10/19/01a1544f-c7df-7d10-9ca6-ea8ed5d33e83/followup/verify-metrics.json`, com arquivos `verify-family-*-1920-100.png`, `verify-*-390-100.png`, `verify-*-1920-125.png`, `verify-*-1920-150.png` e `verify-family-family-*-complements.png` na mesma pasta. Inspecionadas Família/nomes longos, editor Roadmap e seletor/controles de Tutoriais; a captura localizada de complementos mobile pode incluir artefato de elemento fixo fora da viewport ao capturar uma região maior que a tela. A medição e as capturas de viewport são a referência para overflow.

A amostra sintética não substitui uma homologação de conta real ou permissões do backend. As rotas suspensas por MVP continuam fora desta matriz; os gates não foram desativados. QA com zoom nativo do navegador continua distinta da emulação equivalente aqui executada.

## Gates

Teste de regressão das etapas teve RED antes da correção e GREEN depois; 48 testes focados passaram. Revisão estática independente do diff de produto, cabeçalho e runner não encontrou achados acionáveis.

`pnpm check` passou. `pnpm test` integral passou: 78 Calculators, 270 API + 1 ignorado por exigir PostgreSQL descartável, 868 Web e 81 scripts — **1.297 aprovados e 1 ignorado**. XLIFF extraído: 1.680 mensagens, com localizações atualizadas. Build de produção Web e `pnpm test:ssr` passaram; smoke cobre rotas públicas, metadados, social card, sitemap, redirects, 404 e noindex privado.

Inicial: **504,37 kB**, transferência estimada 135,57 kB; 1,57 kB acima da base desta rodada e 4,37 kB acima do aviso. Árvore: 18,55 kB ante 16 kB; catálogo: 16,03 kB ante 16 kB. Avisos de locale pt-BR→pt e CommonJS do OCR permanecem; budgets intactos. A primeira tentativa de `pnpm check` encontrou ordenação de imports, corrigida antes da execução integral aprovada. O formatter não possui parser para XLIFF; o arquivo gerado foi preservado e a checagem dos arquivos suportados passou.

Servidor QA temporário 4202 encerrado; servidor anterior 4200 preservado. Nenhum banco, conta, staging ou produção foi alterado. Sem push, merge ou deploy.
