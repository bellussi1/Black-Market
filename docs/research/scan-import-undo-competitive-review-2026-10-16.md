# Reversão de importação por capturas — pesquisa de 16/10/2026

Consulta pública antes da implementação. Escopo: revisão e reversão local de aplicação de estoque/gear, sem cálculos novos ou cópia de dados.

| Fonte        | URL/estado atual                                                                                            | Equivalente e limite                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| BDO Workshop | https://bdoworkshop.com/crafting-workshop/storage-tracker — ferramenta inacessível ao leitor nesta consulta | Histórico local registra oferta pública de OCR de estoque; não foi possível verificar ação Desfazer, conflitos, campos ou persistência.               |
| BDO Codex    | https://bdocodex.com/us/items/ — acesso restrito no leitor                                                  | Referência de catálogo; nenhum equivalente público de reversão de importação pessoal confirmado. Não inferir inexistência em áreas não acessíveis.    |
| BDOLytics    | https://bdolytics.com/en/character — inacessível nesta consulta                                             | Não foi possível confirmar importação pessoal ou reversão; não há comparação de UI/algoritmo sustentada nesta tentativa.                              |
| Garmoth      | https://garmoth.com/character/default — página pública acessível, inglês/região EU                          | Planejamento de equipamento e comparação de builds descritos; a superfície textual não confirmou reversão de importação OCR nem política de conflito. |

As limitações são de acesso/observação, não prova de inexistência. A solução do Black Market vem do contrato próprio em `docs/storage-import-strategy.md` §6: aplicação atômica, preservação de alterações posteriores e possibilidade de desfazer. Reversão é uma operação sobre valores informados, sem dado econômico ou regra de jogo inferida dos concorrentes. Sem APIs privadas, autenticação em contas alheias, contorno de bloqueios ou ingestão de assets/datasets externos.
