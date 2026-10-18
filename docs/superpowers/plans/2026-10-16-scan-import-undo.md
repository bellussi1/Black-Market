# Desfazer a última importação de capturas

Pedido de 16/10/2026: conferir funcionalidades documentadas e continuar a implementação. Lacuna confirmada em `docs/storage-import-strategy.md` §6 e checklist de importação em lote. A fase visual3 já existe em `6f35431`; não executar novamente o plano antigo nem alterá-lo.

## Escopo e critérios

- Uma reversão em memória da última aplicação bem-sucedida de capturas enquanto a tela permanece aberta. Sem nova persistência, migração, dependência ou alteração das regras do OCR.
- Reverter apenas registros de estoque e campos de personagens alterados pelo lote; preservar cotações, preferências e edições posteriores em campos/registros não afetados.
- Recusar a reversão quando os dados afetados mudaram, o contexto demonstração/região mudou, outro lote foi importado ou a restauração viola reservas. Falha não altera dados nem consome a opção.
- Restaurar o histórico anterior junto com os dados. Imagens não entram no token nem no backup. Novo lote aplicado substitui a opção anterior; sair da tela encerra a opção.
- UI com ação explícita Desfazer última importação, região e limite de sessão, feedback acessível e nenhuma execução automática.

## Execução inline

1. Testes RED do utilitário: adição/alteração/remoção, conflitos, mudanças alheias, gear/PA/PD, contexto, histórico e reservas.
2. Utilitário puro com comparação de valores e validação do workspace; GREEN.
3. Teste de integração RED salvar→desfazer, persistência e falha segura; UI e integração; GREEN.
4. Revisão independente, check/test/build e atualização XLIFF/docs/handoff.

Pesquisa pública específica em `docs/research/scan-import-undo-competitive-review-2026-10-16.md`. Validação autenticada real continua dependente do titular; testes de componente e navegação visitante não substituem login real.
