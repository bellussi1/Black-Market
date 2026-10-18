# Continuidade das funcionalidades — 16/10/2026

Pedido: conferir a documentação das funcionalidades por implementar e seguir com a execução. Código e Git prevalecem sobre checkboxes históricos; alterações locais anteriores da auditoria foram preservadas na branch `codex/audit-remediation`.

## Reconciliação antes da implementação

| Capacidade                                                  | Estado conferido                                                                                                                                                               | Decisão desta rodada                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Fase visual3: Armazém, Família, Gear e Scan                 | Já implementada em `6f35431`, com pesquisa e specs. O plano não rastreado permanece sem marcação, mas não representa ausência de código. QA autenticado ainda é uma limitação. | Preservar o plano antigo e não refazer as telas.                                              |
| Otimizador recursivo, login modal, Settings/backup e SSR    | Implementados na rodada anterior, relatório `audit-remediation-2026-10-16.md`.                                                                                                 | Não reimplementar.                                                                            |
| Peso/capacidade, pets, montarias, trajes, níveis familiares | Existem em PlayerPage/modelo, além das onze maestrias e slots. A nota de cobertura de 10/10 é histórica.                                                                       | Atualizar o mapa do checklist; existência dos campos não certifica OCR ou efeitos calculados. |
| Reversão da aplicação de capturas                           | `storage-import-strategy.md` §6 prevê desfazer, mas ScansPage não oferecia essa ação.                                                                                          | Implementar a reversão local segura da última importação.                                     |
| Ranking SA por vendas/lucro e comparações universais        | Fonte, cobertura, janela/unidade e premissas insuficientes.                                                                                                                    | Preservar como pendência de dados, sem inventar ranking.                                      |
| OCR com avaliação independente e login/sync reais           | Dependem de corpus separado e sessão interativa do titular.                                                                                                                    | Não tratar testes sintéticos ou mocks como esses gates.                                       |
| Monetização, domínio e novos mercados                       | Exigem decisões de produto/escopo e dados regionais.                                                                                                                           | Não inferir decisões comerciais do pedido genérico de continuidade.                           |

## Entrega: desfazer a última importação

Depois de salvar um lote de capturas, a tela oferece **Desfazer última importação**, identificando a região e a disponibilidade limitada à tela atual. Um novo lote salvo substitui a opção anterior. Sair da tela/recarregar encerra a opção; não existe histórico persistente de undo nem junção automática de imagens.

A reversão usa snapshots dos valores do workspace, sem guardar imagens ou URLs. Restaura os registros de estoque e apenas os campos de personagem que o lote alterou. Cotações, preferências e edições posteriores em registros/campos não afetados permanecem. O histórico anterior é restaurado, inclusive quando o limite de 60 entradas havia removido a mais antiga.

Antes de alterar qualquer dado, confere região/contexto demonstração, histórico, IDs e identidades de estoque e valores atuais dos campos de personagem afetados. Mudança posterior, duplicidade criada com outro ID, exclusão ou reserva incompatível bloqueia toda a reversão. A opção permanece disponível após falha. A validação final reaproveita o schema/reservas do workspace.

Quando o navegador recusa escrita mas o WorkspaceStore mantém o resultado em memória, o feedback informa a limitação e orienta exportar backup; não apresenta essa situação como gravação durável. Revisão, confirmação do OCR e guard de autenticação permanecem como eram.

## Verificação e limites

- RED do utilitário: 9 falhas comportamentais/1 aprovação genérica de erro; o teste de reserva foi fortalecido para exigir mensagem de reserva. Antes disso, uma fixture com literal regional amplo causou erro de tipo e foi corrigida antes da execução comportamental.
- GREEN inicial do utilitário: 10/10. RED da integração: 1 falha esperada/30 aprovados, pela opção ausente após salvar.
- GREEN integrado final: **42/42** em dois arquivos, incluindo 11 testes do utilitário e 31 da tela. Abrange salvar→desfazer pelo botão, persistência, preservação de outro campo, conflitos, retorno `update=false`, quota indisponível e histórico60.
- Revisão independente sem P1/P2 confirmado; relatório local em `.superpowers/sdd/scan-import-undo-2026-10-16/review.md`. Não é prova formal de todos os cenários.
- Suíte global: **1.121 testes aprovados e 1 ignorado** (77 Calculators, 248 API, 718 Web e 78 scripts/OCR), com Node 24.21.0 e quatro workers. O caso ignorado exige PostgreSQL descartável. Logs: `test.log`.
- `pnpm check`, build Web de produção e `pnpm test:ssr` aprovados. SSR verifica rotas públicas, metadados, social card, sitemap, redirects canônicos, 404 e noindex privado. XLIFF regenerado com 1.542 mensagens. Logs: `check.log`, `build.log`, `ssr.log` e `i18n.log`.
- Avisos existentes do build: bundle inicial 538,21 kB (38,21 kB acima do aviso de 500 kB, abaixo do limite de erro); locale pt-BR usa pt e Tesseract/regenerator-runtime são CommonJS. Nenhum budget foi aumentado.
- Sem sessão social humana nesta rodada. Não há alegação de QA visual autenticado ou acurácia do OCR. A proteção cobre o estado atual desta instância do workspace, sem criar coordenação distribuída de edição entre abas/dispositivos.
- Sem migração, seed, novas dependências, coleta periódica, credenciais, push ou deploy.

Pesquisa pública específica: [reversão de importações](scan-import-undo-competitive-review-2026-10-16.md), com limites atuais das quatro fontes. Plano: `docs/superpowers/plans/2026-10-16-scan-import-undo.md`. Evidências locais ignoradas: `output/playwright/scan-import-undo-2026-10-16/`.
