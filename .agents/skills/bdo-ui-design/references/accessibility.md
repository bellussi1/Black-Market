# Acessibilidade

Adaptações web, não reprodução literal das limitações do jogo:

- Texto normal com contraste mínimo 4.5:1; elementos gráficos e controles relevantes 3:1.
- Alvos de toque de pelo menos 44 × 44 px. Sem informação exclusiva de hover.
- Botões reais, `aria-label` para ícones, `aria-expanded` para dependências, `aria-pressed` para modo/seleção quando apropriado.
- Card não pode conter button dentro de button; escolher estrutura semântica adequada e ações separadas.
- Ordem de Tab previsível. Setas navegam a viewport quando ela tem foco. Enter/Space operam ações; atalhos não interceptam inputs/selects.
- Foco com outline independente de seleção. Não substituir foco por cor sutil.
- `prefers-reduced-motion: reduce` elimina animações de entrada/movimento e scroll suave.
- Mensagens assíncronas com `role="status"`; erros acionáveis sem repetição excessiva de anúncios.
- Ícone duplicado pelo nome ao lado usa alt vazio; fallback não causa mudança de dimensão.
- Mobile sem overflow horizontal da página. Grafo pode manter viewport própria, acompanhado por visualização de etapas adequada a telas estreitas. Não alterar escolha persistida de visualização apenas por resize.
