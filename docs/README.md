# Documentação do Black Market

## Por onde começar

Para agentes: [protocolo](../AGENTS.md) → [estado atual](ACTIVE_CONTEXT.md) → uma fonte por assunto abaixo. Não leia todo o histórico, todos os planos ou o checklist inteiro na inicialização. O código e a revisão Git conferidos prevalecem sobre um snapshot datado.

## Fontes canônicas

| Pergunta                                                 | Fonte a manter                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| O que fazer agora neste checkout?                        | [Estado atual](ACTIVE_CONTEXT.md)                                                                                         |
| O que foi pedido, entregue ou depende de dados externos? | [Catálogo de pedidos e prioridades](project-feature-checklist.md)                                                         |
| Qual é a direção do produto?                             | [Visão](product-vision.md); [escopo MVP e limitações](screenshot-mvp.md)                                                  |
| Como o sistema e o frontend se organizam?                | [Arquitetura](architecture.md)                                                                                            |
| Como executar, testar e manter qualidade?                | [Desenvolvimento](development.md)                                                                                         |
| Como manter a UI BDO?                                    | [Skill canônica](../.agents/skills/bdo-ui-design/SKILL.md); [catálogo de implementação](design-system/bdo-ui.md)          |
| Como funcionam receitas, estoque e lucro?                | [Receitas](recipe-explorer.md); [calculadoras](calculators.md); [equivalências](crafting-equivalences-and-totals.md)      |
| Como entram catálogo e assets?                           | [Pipeline](data-pipeline.md); [atualização](catalog-updates.md); [inventário extraído](extracted-data-inventory.md)       |
| Como validar OCR e importação?                           | [Validação](ocr-validation.md); [estratégia](storage-import-strategy.md); [uso do armazém](storage-tutorial.md)           |
| Como operar serviços, releases e recuperação?            | [Operação local](local-operations.md); [staging](staging-local.md); [deploy](deployment.md); [backup](backup-recovery.md) |
| Como tratar dados e segurança?                           | [Segurança](security.md); [inventário de privacidade](privacy-inventory.md); [contas](production-and-accounts.md)         |
| O que falta para abrir o código?                         | [Preparação open source](open-source-release.md)                                                                          |
| Onde estão contratos de API e banco?                     | [API](api.md); [banco](database.md)                                                                                       |
| Onde estão pesquisa e evidências?                        | [Índice de pesquisa](research/README.md); [protocolo competitivo](research/competitor-review-playbook.md)                 |
| Preciso recuperar uma decisão antiga?                    | [Arquivo histórico](archive/README.md), plano específico ou `git log`                                                     |

Documentos temáticos restantes são referências especializadas. Planos e auditorias datados registram o que foi proposto ou medido naquele momento; não são outro backlog ativo. O [Roadmap](roadmap.md) descreve direção/etapas, não substitui o catálogo de pedidos.

## Regra de escrita e recuperação

- Estado atual: substitua o resumo, sem anexar sessões. Decisão durável: atualize sua fonte técnica. Evidência de uma tarefa: registre uma vez no relatório pertinente e linke. Evolução: Git.
- Não copie stack, comandos, filas, números de testes e limites entre README, handoff, prompt e contexto. Atualize o dono indicado na tabela.
- Handoffs Codex/Antigravity usam o mesmo estado atual. Oito atalhos documentais redundantes foram removidos após migrar as referências; os originais permanecem acessíveis pelo índice histórico e pelo Git.
- Para buscas comuns: `rg "termo" docs`. Snapshots de `docs/archive/` ficam fora da busca padrão por `.ignore`; para investigação histórica explícita: `rg --no-ignore "termo" docs/archive`.
- Arquivar não conclui uma pendência. Preserve IDs/origens, data e limitações; confirme código/ambiente antes de reutilizar uma recomendação antiga.
- Orçamento inicial: AGENTS + estado atual, até 12 KiB combinados. O índice é consultado por necessidade; detalhes não entram automaticamente no prompt. Tamanho em bytes é mensurável, tokens variam por modelo.

## Consolidação de 20/10/2026

Um estado atual substitui os três handoffs; catálogo de pedidos substitui os snapshots de implementação/fila/cobertura; arquitetura absorve organização Angular; desenvolvimento absorve qualidade. A lista histórica de arquivos alterados é substituída por `git diff`/`git log`. [Originais e manifesto](archive/README.md) preservam conteúdo, origem e hashes.

Os documentos de pesquisa, especificações e operação com assunto próprio foram preservados. Reuni-los indiscriminadamente num único arquivo recriaria o problema de carregar tudo para qualquer tarefa. Novas fusões devem seguir dono e finalidade, não apenas nomes semelhantes.

Validação da fusão: 13 snapshots conferidos contra a revisão de origem, 62 registros de pedidos e 28 IDs de prioridade preservados; links ativos conferidos sem novos destinos ausentes. O contexto principal passou de 480.112 para cerca de 3.200 bytes (redução superior a 99% nesse arquivo; não é medição de tokens). Originais continuam disponíveis sob demanda. Somente documentação foi alterada; não houve execução de testes de produto para alegar validação desta fusão.

## ai-memory

[Repositório upstream](https://github.com/akitaonrails/ai-memory), clonado em `C:\Users\Bellussi\Documents\ChatGPT\ai-memory`, revisão `11ab100` (19/10/2026), licença MIT. A cópia é externa ao repositório do site; não foi incorporada como dependência ou submódulo.

O upstream descreve uma wiki Markdown versionada e índice reconstruível para busca/handoff entre agentes, com caminho padrão sem chamadas de LLM. Isso complementa fontes curtas e bem organizadas; não resolve por si só documentos contraditórios. [README](https://github.com/akitaonrails/ai-memory/blob/11ab100/README.md), [tratamento de dados](https://github.com/akitaonrails/ai-memory/blob/11ab100/DATA_HANDLING.md), [Windows](https://github.com/akitaonrails/ai-memory/blob/11ab100/docs/windows.md).

Nesta etapa foi baixado e analisado, sem executar instalador ou ativar binário, serviço, hooks, MCP, importação de históricos ou provedores. O upstream classifica Windows nativo como experimental. Antes de integração futura, conferir a versão, plano de instalação, diretório local, agentes envolvidos e política de captura; manter os documentos canônicos como fonte de verdade e medir se a busca reduz a leitura efetiva.

- [Plano hierárquico da receita](research/recipe-plan-hierarchy-2026-10-26.md) — árvore lateral de sub-receitas e lucro/h único.
