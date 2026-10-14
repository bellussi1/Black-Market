# Plano — pendências das funcionalidades principais

## Goal

Entregar o Roadmap de produto como conteúdo persistido e editável, e fechar as lacunas de preço de peixes que já foram identificadas na engenharia reversa, sem listas manuais de IDs/nomes. Preservar os módulos principais existentes e deixar explícitas as dependências externas que não podem ser resolvidas no código local.

## Context

- Spec: `docs/superpowers/specs/2026-10-13-product-roadmap-design.md`.
- Usuário autorizou a implementação na solicitação atual. Não há etapa de aprovação do plano antes do código.
- Não criar conteúdo de Roadmap no frontend: os registros iniciais vêm de uma migração, e a interface lê a API.
- Dados de fontes externas só entram no cálculo quando puderem ser derivados do catálogo ativo e validados; não inventar equivalências nem ativar coletores de mercado.
- As funcionalidades já marcadas como concluídas no `docs/ACTIVE_CONTEXT.md` ficam fora deste escopo.

## Tasks

### Task 1 — Auditar a origem dinâmica das equivalências de peixes

- Conferir as páginas BDOlytics/BDOWorkshop já usadas, receitas reais indicadas, tipos/categorias/qualidade e relações de `DRY` do catálogo ativo.
- Escrever primeiro os testes de regressão da semântica que for comprovada.
- Só ampliar o modelo `ANY OF` se as relações do catálogo provarem o mesmo grupo e fator de conversão. Sem fonte, registrar a limitação no contexto e manter preço equivalente direto atual.

### Task 2 — Persistência dinâmica do Roadmap

- Adicionar teste de schema/contrato para registros de fluxo e pilares.
- Criar tabela e migração com índices/restrições adequados e dados iniciais editáveis.
- Gerar e conferir a migração Drizzle. Não aplicar automaticamente em banco compartilhado/produção.

### Task 3 — API pública e API administrativa

- Escrever testes primeiro para GET público, ordenação, vazio, validação de coleção, links internos, edição otimista/transacional e bloqueio sem role administrativo.
- Criar rotas públicas e protegidas; verificar o token no Supabase e ler permissões somente do `app_metadata` server-side.
- Adicionar tipos compartilhados e documentação de configuração do papel `roadmap_admin`.

### Task 4 — Tela pública e editor administrativo

- Testes primeiro para carregar dados da API, erro/vazio, exibição dos quatro pilares/fluxo, edição/ordenação/exclusão e feedback de salvar.
- Página standalone lazy em `/roadmap`, acessível pelo menu desktop e móvel.
- Página `/roadmap/manage` para quem recebe autorização da API; reordenar e editar os dados sem datas.
- Conferir desktop/mobile, foco, conteúdo longo e layout com Playwright.

### Task 5 — Verificação final e handoff

- Executar os testes focados, `pnpm check`, `pnpm test` e build Angular de desenvolvimento.
- Verificar manualmente cada item pendente relevante no contexto e atualizar `docs/ACTIVE_CONTEXT.md` e documentos do produto.
- Fazer commits atômicos separados: migração/API; telas Roadmap; melhoria de equivalências (somente se comprovada); documentação/handoff.
- Não aplicar migração a banco externo nem publicar/deploy sem autorização específica.

## Acceptance

- Todo conteúdo do Roadmap vem da API e banco; admin de verdade é exigido no servidor.
- Nenhuma lista manual de IDs/nome é adicionada para equivalências do catálogo.
- O fluxo central e quatro pilares são editáveis, sem datas, com destino interno validado.
- Itens já concluídos não são reimplementados; bloqueios externos têm próximo passo e responsável claramente descritos.
