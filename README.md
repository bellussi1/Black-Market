# Black Market

Planejador independente para Black Desert Online, com SA e português brasileiro como padrões. Reúne consulta de itens, receitas e mercado, planejamento de produção e revisão de capturas de estoque/equipamento. Não há afiliação com a Pearl Abyss.

## Começar

- [Documentação por assunto](docs/README.md): fontes canônicas e recuperação de decisões.
- [Desenvolvimento local](docs/development.md): requisitos, inicialização, banco, comandos e qualidade.
- [Visão do produto](docs/product-vision.md) e [escopo MVP](docs/screenshot-mvp.md): objetivos e limites; confirme a disponibilidade das rotas no código atual.
- [Pedidos e prioridades](docs/project-feature-checklist.md): entregas, dependências e evidências.

Agentes: leia [AGENTS.md](AGENTS.md) e [o estado deste checkout](docs/ACTIVE_CONTEXT.md). Consulte detalhes sob demanda; não carregue todos os planos e handoffs.

## Estrutura

Monorepo pnpm com Angular/SSR, NestJS e PostgreSQL/Drizzle:

| Diretório                             | Responsabilidade        |
| ------------------------------------- | ----------------------- |
| `apps/web`                            | Interface e SSR         |
| `apps/api`                            | API/BFF e integrações   |
| `packages/calculators`                | Regras de cálculo       |
| `packages/database`                   | Schema e migrations     |
| `packages/domain` e `packages/shared` | Contratos e utilitários |

[Arquitetura e frontend](docs/architecture.md) detalham os limites entre essas partes.

## Dados e operação

Clonar o código não popula o banco nem transfere os assets locais. Consulte [pipeline](docs/data-pipeline.md), [catálogo](docs/catalog-updates.md) e [validação de OCR](docs/ocr-validation.md). Resultados de capturas continuam sujeitos à revisão; dados ausentes não são presumidos.

Para ambientes e releases: [operação local](docs/local-operations.md), [staging](docs/staging-local.md), [deploy](docs/deployment.md) e [recuperação](docs/backup-recovery.md). Configurações, credenciais e dados reais dependem do ambiente; nenhum snapshot documental prova a versão atualmente implantada.

As listas antigas de comandos, releases e métricas deste README estão no [arquivo histórico](docs/archive/README.md). O [índice](docs/README.md) define onde cada informação passa a ser mantida, evitando cópias paralelas.
