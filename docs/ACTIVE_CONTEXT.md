# Estado atual — Black Market

Atualizado em 23/10/2026. Resumo substituível deste checkout; detalhes e evidências estão no [relatório da jornada](research/player-journey-audit-2026-10-22.md).

## Checkout

- Checkout principal: `C:\Users\Bellussi\Documents\ChatGPT\Site de BDO`, branch `main`. Correções da auditoria e evidências citadas foram commitadas localmente em commits separados por responsabilidade; não houve push.
- Os originais em `prints-reais-ocr/` continuam privados, locais e fora do stage; padrão `/prints-reais-ocr/` adicionado somente a `.git/info/exclude`. Não reiniciei nem substituí `localhost:4200` ou a API; sem migração, seed, alteração de staging ou push.

## Estado

- Correções J01–J09 e seus limites estão documentados no relatório. Equipamento de Vida fica separado por Família/profissão, busca no catálogo sem filtro de receitas e não se mistura com gear PvP. Histórico marca lotes heterogêneos como “Importação mista”. Importação de estoque agora tem regressões isoladas para mesclagem e substituição integral de um destino.
- J07 abstém de sugerir `14M` sem separador e mantém texto OCR para revisão manual. Estoque/inventário só confirma inteiros de 1 a 1.000.000.000; zero e valores acima do limite ficam pendentes com aviso. `Permuta: O` não vira zero; Maestria `0` exige edição, seleção e aplicação explícitas.
- No Coach, limite de peso `0` significa não informado e deixa de bloquear cenários como se fosse `0 LT`; peso carregado e limite agora podem ser editados na configuração rápida. O botão de expandir de uma etapa aninhada está coberto por teste de clique.

## Verificação e limites

- `pnpm check` e `pnpm test` passaram em 23/10. Suíte integral: 85 calculadoras, 270 API, 938 Web e 85 scripts; 1 skip da API. Build Web e SSR também passaram nesta data antes da cobertura de importação. A suíte cobre limites de quantidade OCR, expansão individual/em lote, massa sem duração informada, margem, importação de Vida, limite de peso e políticas de merge/replace.
- As 5 regressões privadas passaram após conferir os SHA-256 das 8 imagens do manifesto. O novo caso do armazém recusa `1698k` (OCR de `169.2k`) sem sugerir número; os originais não foram modificados.
- Avisos conhecidos: fallback locale `pt-BR` para `pt`, orçamento de `recipe-tree.scss` e dependências CommonJS do Tesseract.
- QA visual de `localhost:4200` não foi concluída: não há listener atendendo e a aba ativa mostra erro de acesso. O aviso de quantidades inválidas foi verificado pelo teste Angular renderizado; merge/replace foram verificados em armazenamento isolado, sem certificação pela conta QA. O OCR ainda não tem holdout independente nem taxa global de acerto; `1.4M` continua sujeito a revisão manual.

## Próximo passo

- QA visual e reenvio pela conta QA quando o preview da porta 4200 responder; homologar OCR de todas as páginas com gabarito e gear completo continuam pendentes. Preservar os 22 arquivos de evidência sem citação e o plano local sem adicioná-los ao Git. Manter `prints-reais-ocr/` fora do Git e não reiniciar serviços de outro checkout.
