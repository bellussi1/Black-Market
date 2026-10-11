# Migração incremental

1. Concluir inventário, compatibilidade Spartan, configuração MCP e análise integral do PDF (252 páginas confirmadas). Criar skill curta com referências por página e revisar exemplos visuais.
2. Integrar Brain/Helm e Lucide em componentes base: botão, input, card, seleção e feedback. Mapear tokens semânticos para identidade BDO. Validar reset e layers.
3. Migrar receitas: três cenários visíveis, retirar modo avançado e preços manuais, manter expandir/recolher no contexto da árvore. Testar cadeia longa, lucro negativo, falta de preços e coleta sem calibração.
4. Migrar shell, mercado, armazém, família, OCR e recomendações em commits próprios. Remover SCSS somente após substituir seus consumidores.
5. Adicionar Playwright Test e axe-core ao CI com dados determinísticos, três viewports e baselines revisados. Medir bundles e registrar limites de métricas de agentes disponíveis.

Cada etapa exige testes relevantes, build, lint, screenshots examinados, documentação de continuidade e commit atômico. Merge após validação da etapa, sem acumular reescrita integral.
