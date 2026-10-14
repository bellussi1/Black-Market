# Migração das telas para a biblioteca BDO

11/10/2026, branch `codex/recipe-workspace-ui`.

36 templates externos migrados: telas de conta, buffs, catálogo, crafting, início, demonstração, aprimoramento, equipamentos, legal, life skills, mercado e board, 404, planos, família, perfil, receitas, recomendações, referências, RNG, OCR e perfil OCR, configurações, lista de materiais, estoque, armazém legado, mundo e trabalhadores; shell, presets, impostos, busca do catálogo, referência de equipamento e rodapé.

Aplicados botão Helm, input Helm, textarea Helm, card Helm e select nativo com tokens Tailwind. Não alterar handlers nem dados para facilitar a migração. Layouts especializados, checkbox, radio, range e arquivo preservam comportamento nativo. Novos componentes Helm mantêm as APIs upstream e exceções de lint documentadas pontualmente.

Validação: build de desenvolvimento e 598 testes passaram. Playwright percorreu início, Mercado, Armazém, Família, OCR, O que fazer, lista de materiais, configurações e termos em 1440 × 900 e 390 × 844, sem overflow horizontal. Capturas examinadas de Mercado, Armazém, Família, OCR e recomendações. Exercitados cadastro de personagem em sessão isolada, abas da Família, calculadora do Mercado, abas e visualizações do Armazém e foco por teclado no OCR. Dados de mercado locais indisponíveis; não valida preços reais nem reconhecimento OCR de uma imagem neste fluxo visual.

Limites: `/family` é a rota correta, `/player` e `/catalog` não são rotas públicas. Ferramentas desativadas pelo escopo MVP foram migradas no código e cobertas pela compilação/testes de componentes; redirecionamento de rota não constitui validação visual dessas ferramentas. Screenshots em `output/playwright/pages-*`, ignorados pelo Git. Não remover o guard do MVP para essa migração.
