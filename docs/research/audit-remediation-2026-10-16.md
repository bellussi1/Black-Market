# Implementação dos achados da auditoria — 16/10/2026

Continuação autorizada pelo usuário com “Siga com a implementação”. Base: `81cea47`, branch `codex/audit-remediation`. A [auditoria original](full-product-ui-calculation-performance-audit-2026-10-16.md) registra o estado anterior; este documento registra as correções e seus limites.

## Correções

| Achados         | Entrega                                                                                                                                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUD-01/05       | Configurações e backup acessíveis ao visitante; exportação local independente da conta; seção de conta composta na mesma página; `/account` preserva query/fragment ao redirecionar. Recuperação continua exigindo confirmação explícita para substituir conteúdo corrupto.                                     |
| AUD-03          | WorkspaceStore não lê armazenamento do navegador no servidor. Restauração após hidratação não persiste o workspace vazio sobre os dados existentes. Snapshot público do Roadmap transferido para a primeira renderização do cliente.                                                                            |
| AUD-04/06/07    | Modal de login contextual, backdrop com blur, scroll bloqueado e foco restaurado ao cancelar. Retorno interno validado e preservado em acesso direto. Assets oficiais de Google/Steam; falha de consulta tem estado recuperável e retry.                                                                        |
| AUD-02          | Relação DRY deixou de gerar equivalência culinária de ratio 1. O contrato permanece compatível e retorna conjunto vazio até existir uma relação verificada/versionada; não se atribuiu outro ratio por hipótese.                                                                                                |
| AUD-08/09       | Tempos de referência explicitados como estimativas; produção média fracionária preservada entre interface e economia, sem arredondamento silencioso.                                                                                                                                                            |
| AUD-10          | Busca de alternativas de fórmula da raiz e intermediários, com uma fórmula por item, estoque compartilhado, coleta confirmada e orçamento global de 10.000 estados. Prévia antes de aplicar, descarte e invalidação por mudança do snapshot. Dados incompletos e limite de busca impedem certificação do ótimo. |
| AUD-11/12/17/18 | Paginação antes da grade e status integrado; nomes completos com reserva de duas linhas; detalhe com H1 único; exploração e cálculo identificados e ligados preservando o contexto disponível; rótulos de profissão em português e unidade decorativa fora do nome acessível do lote.                           |
| AUD-19/20       | Contexto atual destacado sobre o histórico; validação desta entrega executada com Node 24.21.0 já instalado, compatível com `^24.15.0`, por PATH do processo.                                                                                                                                                   |

## Evidência de navegador

AUD-16 permanece parcial: perfil e carregamento condicional de warming, modal e busca rápida reduziram 565,31 → 538,21 kB com as funcionalidades novas; baseline da auditoria era 553,57 kB. Continua 38,21 kB acima do aviso de 500 kB. Budget e layout inicial obrigatório preservados.

Ambiente de desenvolvimento `http://localhost:4200`, desktop 1440×900 e tela estreita 390×844, perfil automatizado sem sessão pessoal. Capturas e logs locais ficam em `output/playwright/full-audit-2026-10-16/` (ignorados pelo Git).

- Clique interno em Armazém abriu o modal sem sair da Home. Escape fechou, limpou a intenção, liberou o scroll e devolveu foco ao link Armazém.
- Acesso direto a `/storage?tab=inventory#materials` preservou o destino integral na intenção segura, apresentando Home e modal ao visitante.
- `/settings` abriu sem modal e exportou `black-market-backup.json`. Um fixture local explicitamente corrupto foi mantido e exportado byte a byte (`{corrupt-audit-fixture`), sem login nem substituição automática; o fixture foi removido ao final.
- Modal centralizado após correção do reset de margem: desktop x450/y292, 540×316; mobile x19/y212, 352×420, sem overflow horizontal do documento.
- Três navegações completas da Home: CLS observado de 0,00349 em cada execução, conteúdo principal em y72 e nenhum falso aviso de armazenamento. A auditoria anterior observou 0,16–0,21 e deslocamento y139→72. Resta um pequeno deslocamento de fontes; isto é uma amostra local, não uma métrica de campo.
- Detalhe da Refeição de Balenos mostrou H1 único e média 276,7 para 100 receitas/maestria 1000, sem erro do contrato inteiro legado. Atalho de produção foca o lote existente e preserva rota/valor. Desktop/mobile sem overflow do documento na amostra.
- Pager após estabilização da carga assíncrona: y577,328 e grid y663,328 nas páginas 1 e 2, ambas com 25 cards e scrollY0. Uma primeira leitura antes dessa estabilização apresentou deslocamento inicial de 58px acima da grade; fontes e placeholder do tutorial não foram isolados causalmente. A correção não promete CLS universal zero.
- Otimização real de Balenos atingiu 10.000 estados com preços faltantes e exibiu “Nenhum plano econômico completo encontrado”, sem ação Aplicar. Itens pendentes são identificados e mensagens repetidas agrupadas. Escape fechou a prévia sem alterar lote 100. Login contextual na mesma rota preservou o contexto e reabriu; Tab não focou controles da página de fundo. O foco pode passar pelo chrome do navegador durante o ciclo nativo, o que foi distinguido de foco na página.
- Evidência resumida versionável: [audit-remediation-2026-10-16.json](evidence/audit-remediation-2026-10-16.json). Fixtures de teste são rotuladas e não representam preços ou perfis reais.

## Revisão e verificações

- Core: 12 testes aprovados, incluindo SSR sem storage, restauração pós-hidratação sem escrita prematura, backup corrupto e transferência pública do Roadmap. O teste de exportação antes do primeiro render falhou com conteúdo vazio antes de chamar `restore()` na exportação e passou após a correção.
- API de equivalências: 16 testes aprovados após dois casos RED confirmarem o ratio indevido.
- Autenticação: 61 testes aprovados em 10 arquivos; UI: 14 aprovados. Esses números são dos gates focados, não devem ser somados ao total global sem eliminar sobreposição.
- Revisão independente executou um oráculo com 300 grafos pequenos determinísticos, comparando a enumeração recursiva às combinações de fontes/fórmulas em lucro e duração. Encontrou uma lacuna nas variantes de ingredientes verificadas da Ração Orgânica; o grafo foi corrigido para expandir todas as variantes, mantendo a checagem de cobertura sobre a resposta bruta.
- `VITEST_MAX_WORKERS=4 pnpm test`, Node 24.21.0: **1.109 aprovados e 1 ignorado** (77 Calculators, 248 API, 706 Web, 78 scripts/OCR). O ignorado depende de PostgreSQL descartável. Timeouts foram preservados. Execuções anteriores identificaram harness de redirect acoplado a HTTP real e corrida de fixture de maestria entre debounce de 350 ms real e fake timers; ambos corrigidos no teste, sem relaxar a produção. A reprodução focada teve 78/78 aprovados antes da correção causal da fixture.
- Bundle Web de produção: **538,21 kB bruto / 145,31 kB estimados transferidos**. A redução real remove warming, modal e busca rápida do caminho inicial, sem deslocar o shell obrigatório para disfarçar a métrica. Avisos remanescentes: orçamento de 500 kB, locale pt-BR com fallback pt e CommonJS do OCR.
- `pnpm check`, build serial completo (`pnpm -r --workspace-concurrency=1 --if-present build`), `pnpm test:ssr`, `pnpm test:legal:layout`, `pnpm db:check` e smokes auth local/staging: **aprovados** em Node 24.21.0. XLIFF regenerado com 1.539 mensagens. A ordenação de reexports foi ajustada após o lint; sem alteração funcional posterior à suíte global. O servidor de desenvolvimento foi pausado durante as compilações finais e reaberto ao terminar. Staging foi apenas consultado.

## Limites preservados

- AUD-13: login real Google/Steam, expiração e sincronização entre dispositivos dependem da sessão interativa do titular. Testes de callbacks e QA como visitante não certificam esses fluxos reais.
- AUD-14: não existe split independente suficiente de OCR. Nenhum benchmark de acurácia foi inventado nem corpus de calibração tratado como avaliação independente.
- AUD-15: demanda SA e fórmulas do patch atual continuam dependentes de fontes adequadas. Coletores, dados persistentes e credenciais não foram alterados.
- A certificação do otimizador é relativa ao catálogo e snapshot de premissas disponíveis. Tempos padrão não se tornam medições só por a enumeração terminar; preços/estoque observados não garantem venda futura.
- Sem migração, seed persistente, push, deploy ou rebuild do staging nesta implementação. A imagem em `8081` continua representando a entrega anterior.

Pesquisa competitiva: seção 5 da auditoria original, consultas públicas de 16/10/2026 e limitações de acesso preservadas. Não foram importadas fórmulas, métricas ou snapshots dos concorrentes.

Smoke SSR foi alinhado aos títulos novos de exploração/cálculo, preservando asserções de H1 único, metadata, canonical e robots. O build final Web passou novamente após retirar estilos dispensáveis da prévia; não há aviso adicional de orçamento CSS nessa compilação. Artefatos locais completos: `remediation-test.log`, `remediation-check.log`, `remediation-build.log`, `remediation-web-final-build.log`, `remediation-ssr.log`, `remediation-i18n.log`, `remediation-legal.log`, `remediation-db-check.log`.
