# Progresso da modernização

11/10/2026 — descoberta iniciada na branch `codex/recipe-workspace-ui`. Auditoria registrou base Angular/Tailwind existente e baseline de 598 testes. Skills Angular e Spartan instaladas e lidas. PDF acessível, com 252 páginas; somente sumário inicial extraído até este checkpoint. Análise integral e visual ainda pendente.

Spartan CLI 1.6.3 em instalação. Componentes não foram migrados para Helm neste checkpoint. MCP, axe-core, Playwright Test e análise de performance ainda pendentes. Ver `migration-plan.md` para sequência.

A solicitação mais recente sobre três cenários, preços da API e remoção do modo avançado está incorporada ao escopo; ainda não foi aplicada à interface. O trabalho anterior de compactação passou check/test e foi commitado; a branch não foi integrada em develop.

Etapa implementada: skill `ui-design`, agente documental e metadata `openai.yaml`, princípios com páginas do PDF; estrutura validada pelo quick_validate.py. Texto de todas as páginas extraído para tmp ignorado. Revisão visual cobre as 12 páginas citadas, não todo o livro. Skills oficiais descobertas no catálogo do turno seguinte.

Spartan Brain/CLI 1.6.3 instalado; Helm button/input/card gerados e personalizados por tokens BDO. Receitas usam três botões de cenário Helm, configurações contextuais e preços da API; modo avançado e editor de preço removidos da tela. Cotações manuais do workspace não entram no adaptador de receitas. Suíte completa passou com 598 testes após ajustar os testes do fluxo removido.

Playwright em servidor desta pasta na porta 4301 confirmou três ações, ausência de modo avançado e ausência de overflow horizontal em desktop/mobile. A porta 4200 mostrava outra versão. As requisições locais de mercado falham; lucro real e otimização Edania continuam pendentes. Capturas em output/playwright. Ver docs/design-system/bdo-ui.md para personalizações. MCP, axe-core, ícones Lucide e migração integral permanecem pendentes.
