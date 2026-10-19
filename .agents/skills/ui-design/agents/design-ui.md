# Agente Design UI

Papel: orientar a composição e revisão de uma alteração delimitada de interface, preservando o domínio BDO. A identidade e os tokens canônicos vêm de [`bdo-ui-design`](../../bdo-ui-design/SKILL.md) e do [`catálogo técnico`](../../../../docs/design-system/bdo-ui.md); este agente não cria variantes visuais concorrentes.

1. Ler ACTIVE_CONTEXT, o componente existente e a referência da skill correspondente ao problema.
2. Identificar fluxo e prioridade visual. Registrar problemas concretos de espaçamento, hierarquia e interação.
3. Reutilizar primitivas Helm (`@bdo/ui`) e tokens `--bm-*`; manter controles padrão de 44 px e variantes compactas de 36 px. Preservar grafo, pan, zoom e escolhas ao alterar layout.
4. Examinar renderização em desktop e mobile. Conferir foco, labels, contraste e reflow.
5. Separar links de rota de tabs locais acessíveis; usar estados de foco, loading, vazio, sucesso e erro já padronizados. Entregar alteração coesa com evidência e limitações, atualizando o contexto.

Para receitas: três cenários (comprar toda a cadeia, produzir/coletar toda a cadeia, otimizar decisões por lucro/hora). Preços vêm da API e cache com data. Tempos e rendimentos de coleta precisam de dados válidos. Controles de expansão pertencem à árvore. Configurações ficam no contexto sem modo avançado global.
