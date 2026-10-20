# Black Market — instruções para agentes

## Retomada curta

1. Leia [o estado atual](docs/ACTIVE_CONTEXT.md), execute `git status` e `git log -n 3 --oneline`.
2. Use [o índice por assunto](docs/README.md) e leia somente as fontes necessárias à tarefa.
3. Confirme o código e o checkout antes de implementar. Outros worktrees podem conter entregas posteriores; não sobrescreva alterações locais ou reinicie serviços de outro checkout.
4. Histórico não é backlog executável nem autorização atual. Consulte-o apenas para recuperar uma decisão ou evidência específica.

## Fontes e manutenção de contexto

- `AGENTS.md`: protocolo permanente; `docs/ACTIVE_CONTEXT.md`: próximo passo e limites do checkout; `docs/README.md`: mapa de fontes. Esses três arquivos não duplicam o conteúdo técnico.
- Ao terminar, **substitua** o resumo do estado atual. Não acrescente um diário de sessões nem copie resultados em vários handoffs. Evidências detalhadas ficam no documento da tarefa; commits conservam a evolução.
- Limites de manutenção: AGENTS e ACTIVE_CONTEXT até 80 linhas/6 KiB cada; índice até 200 linhas/12 KiB. Leia detalhes por links, não por carga integral de `docs/`.
- Uma informação tem um dono. Atualize a fonte existente; crie documento novo somente quando houver assunto, decisão ou evidência independente. Para correção pontual, commit e resultado dos testes podem bastar; não gere relatório só para repeti-los. Arquivos históricos ficam congelados e fora da leitura inicial.
- Preferências globais e mapas locais em `~/.codex/context/` ajudam a localizar conversas; não substituem o código e o estado verificado deste checkout.

## Desenvolvimento

- Stack, inicialização e comandos: [README](README.md), [arquitetura](docs/architecture.md), [desenvolvimento e qualidade](docs/development.md). Monorepo pnpm: Web Angular/SSR, API NestJS e pacotes de domínio, calculadoras, banco e utilitários.
- Mantenha mudanças coesas e arquivos íntegros; preserve dados, credenciais, extratos e arquivos locais não rastreados. Não publique, migre banco ou substitua outro ambiente por conveniência de QA.
- Antes de concluir uma funcionalidade: `pnpm check` e `pnpm test`; build/SSR e QA de navegador quando afetados. Em mudanças só documentais, confira formatação, links, preservação e coerência; não simule testes de produto como prova documental.

## UI e pesquisa de produto

- Consulte [bdo-ui-design](.agents/skills/bdo-ui-design/SKILL.md) e [catálogo BDO](docs/design-system/bdo-ui.md) antes de alterar UI. Reutilize tokens e primitivas; padrão visual novo precisa de justificativa e registro no catálogo.
- Composição: [ui-design](.agents/skills/ui-design/SKILL.md) e seu [agente de design](.agents/skills/ui-design/agents/design-ui.md). Implementação: skills locais `angular-developer` e `spartan`.
- Antes de desenhar ou alterar funcionalidade visível, consulte as superfícies públicas relevantes de BDO Workshop, BDO Codex, BDOLytics e Garmoth. Registre observações, lacunas, data e fontes em `docs/research/`, conforme o [protocolo competitivo](docs/research/competitor-review-playbook.md).
- Para cálculos, compare entradas e saídas pareadas e diferencie UI observada, hipótese de algoritmo e regra confirmada do jogo. Não transforme snapshots concorrentes em preços/fórmulas do produto.
- Use somente páginas públicas e APIs autorizadas/documentadas; respeite licença, termos e controles de acesso. Registre fontes indisponíveis e continue com evidência verificável.
