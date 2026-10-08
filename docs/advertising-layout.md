# Espaços de publicidade

O layout prevê duas laterais em telas largas e um banner no conteúdo, sem publicidade ativa. `core/advertising.ts` mantém `previewSlots: false`; `AdSlot` reserva dimensões e identifica “Publicidade” quando a prévia é habilitada. Não há SDK, rastreamento, chamadas ou script de rede de anúncios.

- Laterais: 160 × 600, exibidas a partir de 1.800 px de viewport.
- Banner: altura mínima de 90 px, respeitando a largura do conteúdo.
- Páginas de dados pessoais, importação e backup ficam fora da prévia.
- Não cobrir navegação, foco, formulários, tabela ou confirmação de importação.
- Reservar dimensões antes do carregamento para reduzir mudanças de layout. No celular, laterais não são exibidas.

Antes de ativar: escolher provedor, medir impacto em desempenho/CLS, definir privacidade/consentimento e resolver a compatibilidade da monetização com a licença do extractor. Sua licença não comercial não é alterada pela criação desses espaços. [Licença](https://github.com/iDevelopThings/bdo-data-extractor/blob/main/LICENSE.md).
