# AGENTS.md — Instruções para Agentes de IA (Codex & Antigravity)

Este repositório é desenvolvido de forma colaborativa e contínua alternando entre **OpenAI Codex** e **Antigravity**. Ambos os agentes devem seguir rigorosamente as diretrizes abaixo para manter consistência, qualidade e continuidade de contexto.

---

## 1. Visão Geral do Projeto

- **Nome**: Black Market · Planejador de Black Desert Online (BDO).
- **Stack**: Monorepo gerenciado com `pnpm` (Node ^24.15.0).
  - `apps/web`: Frontend Angular com SSR, rodando em `http://localhost:4200`.
  - `apps/api`: Backend / BFF rodando na porta `3000`.
  - `packages/calculators`: Lógica de receitas, maestrias, impostos e mercado.
  - `packages/database`: Modelos e migrações (Neon / PostgreSQL).
  - `packages/domain`: Contratos e tipagens de domínio.
  - `packages/shared`: Utilitários compartilhados.

---

## 2. Protocolo de Handoff e Continuidade de Contexto

Para que você (Codex ou Antigravity) saiba exatamente o que o outro agente fez sem perda de contexto:

1. **Ao Iniciar Uma Tarefa**:
   - Leia o arquivo [`docs/ACTIVE_CONTEXT.md`](docs/ACTIVE_CONTEXT.md) para entender a última decisão, tarefa em andamento e próximos passos.
   - Execute `git status` e `git log -n 3 --oneline` para checar o estado exato da branch.
2. **Durante o Desenvolvimento**:
   - Mantenha alterações coesas e evite deixar arquivos quebrados ao terminar um turno.
   - Siga as regras de UI definidas na skill `.agents/skills/bdo-ui-design/SKILL.md`.
   - Para composição e revisão visual, use `.agents/skills/ui-design/SKILL.md` e seu agente `.agents/skills/ui-design/agents/design-ui.md`. Para implementação, consulte as skills oficiais `angular-developer` e `spartan`.
   - **Pesquisa competitiva obrigatória para funcionalidades**: antes de desenhar ou alterar uma feature visível ao usuário, consulte a superfície pública relevante de BDO Workshop, BDO Codex, BDOLytics e Garmoth. Registre em `docs/research/` o que cada um oferece, o que não tem equivalente ou não pôde ser verificado, a data da consulta e as fontes. Para cálculos, compare entradas e saídas com premissas pareadas e separe observação da interface, hipótese de algoritmo e regra confirmada do jogo. Siga `docs/research/competitor-review-playbook.md`.
   - Use essa pesquisa para entender alternativas de fluxo e cobertura, não para copiar implementação ou transformar métricas/snapshots de concorrentes em dados ou fórmulas do Black Market. Consulte apenas páginas públicas e APIs documentadas/autorizadas; respeite licença, termos, rate limits e controles de acesso. Se uma fonte estiver indisponível, registre a tentativa e continue com o código e as fontes verificáveis.
3. **Ao Finalizar o Turno (ou quando o limite de mensagens estiver próximo)**:
   - Atualize [`docs/ACTIVE_CONTEXT.md`](docs/ACTIVE_CONTEXT.md) documentando:
     - O que foi concluído.
     - O que ficou em andamento ou pendente.
     - Arquivos modificados/criados.
     - Instrução clara para o próximo agente (Codex ou Antigravity) continuar.

---

## 3. Skills, Plugins e MCPs

- **Skills do Projeto**: Localizadas em `.agents/skills/`. Ambos os agentes têm suporte nativo a essa pasta.
- **Skills Globais**: As skills em `~/.codex/skills` e `~/.gemini/config/skills` estão sincronizadas via junção de diretório no sistema.
- **MCP Servers Habilitados**:
  - `Neon`: Conexão direta com banco serverless Neon.
  - `playwright`: Navegador automatizado para testes de interface e captura.
  - `context7`: Consulta a documentações e bibliotecas.

---

## 4. Comandos e Verificação de Qualidade

Antes de considerar uma funcionalidade pronta:

- `pnpm check`: Executa lint, format check e typecheck.
- `pnpm test`: Executa testes unitários.
- Para rodar servidores:
  - Web: `pnpm dev:web` (porta 4200)
  - API: `pnpm dev:api` (porta 3000)
