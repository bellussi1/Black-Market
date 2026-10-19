---
name: ui-design
description: Use ao criar, refatorar ou auditar layouts, formulários, cards e interações do Black Market, aplicando hierarquia e espaçamento do PDF de design fornecido pelo usuário.
---

# Design UI

Esta skill orienta composição, hierarquia e revisão. A identidade, paleta, tokens e variantes de componentes pertencem à fonte canônica [`bdo-ui-design`](../bdo-ui-design/SKILL.md); não crie um segundo tema nem valores de controle concorrentes.

Comece pela decisão que o usuário precisa tomar. Identifique conteúdo principal, ação principal e informações de apoio antes de escolher componentes.

- Leia [princípios do PDF](references/pdf-principles.md) para hierarquia, espaçamento, tipografia e cor.
- Leia [implementação](references/implementation.md) para Angular, Tailwind e Spartan.
- Use a skill `bdo-ui-design` e [`docs/design-system/bdo-ui.md`](../../../docs/design-system/bdo-ui.md) para identidade e tokens do produto. Este material não substitui nem redefine esses contratos.
- Consulte [agente de design](agents/design-ui.md) ao executar uma revisão visual.

O PDF fornece heurísticas de composição, não regras de negócio nem comprovação de acessibilidade. Preserve números, fontes e estados pendentes. Sem emojis. Verifique a interface renderizada, teclado, texto longo e mobile antes de declarar conclusão.

## Revisão de capturas

Após upload, priorize resultados e correção. Recolha tutorial, substituição, recorte e configuração já reconhecida em seus contextos, preservando acesso manual. Não exiba seletor sem opções nem quantidade presumida como valor reconhecido. Valide uma captura real em desktop e mobile; compactar a interface não comprova acurácia do OCR.
