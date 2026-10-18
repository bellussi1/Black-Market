# Checklist executável e comparação de sessões — 16/10/2026

Pedido: configurar o checklist com as features que ainda faltam e implementar. Reconciliado o estado atual com código e docs, preservando as alterações anteriores da auditoria/reversão de capturas.

> **Estado atual — 18/10/2026:** `/lifeskills` passou a ser pública. Visitantes registram sessões no armazenamento local; sincronização continua vinculada à conta. As referências abaixo a `authGuard`, `noindex/no-store` e à rota fora do sitemap descrevem o estado histórico de 16/10 e foram substituídas por `docs/research/home-social-login-ui-review-2026-10-18.md`.

## Recorte implementável

`LifeskillsPage` já registra duração, profissão, modo, maestria, custos, itens/preços e receita direta; o histórico só oferecia uma média geral e resultados individuais. A comparação agrupa as sessões da região ativa por nome da atividade/rota (sem diferença de caixa/espaço externo), profissão, maestria e modo. Campos antigos ausentes permanecem desconhecidos, distintos de zero ou ativo.

Cada grupo informa amostra, minutos totais, período registrado, lucro total e prata líquida/h ponderada pelo tempo. Soma lucros calculados com os preços/impostos gravados em cada sessão e divide pela soma das durações; não faz média simples de taxas. Usa BigInt para prata e não altera os registros salvos. Ordena pelo rendimento observado, preservando prejuízos. É comparação pessoal, sem extrapolação por maestria ou garantia de venda/drop.

Patch, buffs e equipamento detalhado não são coletados pelo contrato atual. A UI precisa explicitar que observações não são cenários controlados, preços são os registrados e regiões/contextos informados são distintos; não certifica rendimento geral do jogo. Sem novo schema, migração, seed, dependência, chamada externa operacional ou emissão de dados pessoais em analytics.

A checagem da navegação mostrou `/lifeskills` suspensa pela lista antiga do MVP. Para entregar um recurso utilizável no pedido de implementação, somente essa ferramenta é reativada, como apoio às Recomendações. Passa a exigir `authGuard`, dados privados no roteamento e renderização cliente com noindex/no-store; retirada do sitemap público. Menu oferece o destino com indicação de login, preservando retorno contextual. Não reativa world, aprimoramento, buffs ou outras expansões; não contorna sessão real para QA.

## Pesquisa pública atual

| Fonte e URL consultada                                        | Observação de acesso em 16/10                                                                                              | Uso e limites                                                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/)                      | Shell público em inglês descreve ferramentas de crafting/mercado e leitura de capturas; exige JavaScript para ferramentas. | Comparação de sessões não verificada nesta consulta; não conclui inexistência. Região/patch e parâmetros comparáveis não observáveis. |
| [BDO Codex](https://bdocodex.com/us/)                         | Leitor recusou URL restrita.                                                                                               | Referência de catálogo, sem equivalente de sessões verificável. Não contornado.                                                       |
| [BDOLytics](https://bdolytics.com/en/NA/character/lifeskills) | Página não acessível pelo leitor.                                                                                          | Sem confirmar campos ou cálculo; NA na URL não representa fonte SA.                                                                   |
| [Garmoth Grind Tracker](https://garmoth.com/grind-tracker)    | Redireciona à página pública `best-grind-spots`; sem conteúdo textual extraível.                                           | Não confirmados parâmetros, amostra, período, algoritmo ou região. Não usamos ranking/preço do concorrente como dado próprio.         |

Não houve comparação matemática pareada possível nos concorrentes. A fórmula desta entrega deriva dos registros próprios e da calculadora já existente: lucro total × 60 / minutos totais. Os testes usam valores sintéticos para validar aritmética e isolamento; não são evidência de drops, preço atual ou acurácia do OCR.

## Checklist e validação

A fila em `docs/project-feature-checklist.md` agora distingue FEAT-01 de dependências DATA/RULE/AUTH/TOUR/QA/PERF/OPS/LEGAL/PRODUCT, com próxima ação concreta. O endpoint local do tour retornou `guide: null`; nenhum seed foi aplicado.

RED observado no utilitário (5 falhas/1 aprovação), UI ausente (1 falha/1 aprovação), reativação (5 falhas/13 aprovações) e contrato de auth (3 falhas/20 aprovações). GREEN focado final 45/45 em sete arquivos, incluindo 8 casos puros e 3 casos da tela. Revisão independente encontrou dois P2 de retorno/logout e conferiu as correções; sem P1/P2 restante. pnpm check e pnpm test passaram: 1.132 aprovados/1 ignorado (77 Calculators, 248 API, 729 Web, 78 scripts/OCR). O teste ignorado exige PostgreSQL descartável. XLIFF atualizado para 1.560 mensagens. Build Web de produção e pnpm test:ssr passaram, incluindo status 200, noindex/nofollow e private,no-store para /lifeskills. Inicial 538,53 kB/transferência estimada 145,29 kB: o aviso 500 kB permanece (antes 538,21 kB), sem elevar budget. Locale pt-BR→pt e CommonJS do OCR também permanecem. Logs: check.log, test.log, build.log, ssr.log, i18n.log e RED/GREEN focados. Evidência local ignorada: `output/playwright/feature-checklist/`.

Browser local: novo atalho Profissões e rendimento, acesso visitante abre modal Google/Steam e cancelar retorna à Home. Sem login humano nesta rodada; tabela preenchida, desktop/mobile e leitor de tela não certificados em browser. Testes de componente verificam dados, rótulos desconhecidos, maestria zero, exclusão da última amostra, troca regional e perda da sessão.
