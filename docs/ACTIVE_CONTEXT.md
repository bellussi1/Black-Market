# Estado atual — Black Market

Atualizado em 24/10/2026. Resumo substituível deste checkout; detalhes e evidências estão no [relatório da jornada](research/player-journey-audit-2026-10-22.md).

## Checkout

- Checkout principal: `C:\Users\Bellussi\Documents\ChatGPT\Site de BDO`, branch `main`. Correções da auditoria foram commitadas localmente em commits separados por responsabilidade; sem push. Commits recentes: `56448b3`, `330ba76`, `70ad33b`.
- `pnpm dev:web` e `pnpm dev:api` estão ativos neste checkout. A prévia responde em `http://localhost:4200/`; API `/ready` responde 200. PostgreSQL local permanece saudável. Nenhuma migração, seed ou push foi executado.
- Originais em `prints-reais-ocr/` seguem privados e fora do Git por `/prints-reais-ocr/` em `.git/info/exclude`. Preservar os 22 arquivos de evidência sem citação e o plano local sem adicioná-los ao stage.

## Estado

- Correções J01–J09 e seus limites estão documentados no relatório. Equipamento de Vida fica separado por Família/profissão, busca no catálogo sem filtro de receitas e não se mistura com gear PvP. Histórico marca lotes heterogêneos como “Importação mista”. Importação de estoque tem regressões para mesclagem e substituição integral de um destino.
- J07 abstém de sugerir `14M` sem separador e mantém texto OCR para revisão manual. Estoque/inventário só confirma inteiros de 1 a 1.000.000.000; zero e valores acima do limite ficam pendentes com aviso. `Permuta: O` não vira zero; Maestria `0` exige edição, seleção e aplicação explícitas.
- No Coach, limite de peso `0` significa não informado e deixa de bloquear cenários como se fosse `0 LT`; peso carregado e limite agora podem ser editados na configuração rápida. O botão de expandir de uma etapa aninhada está coberto por teste de clique.

## Verificação e limites

- `pnpm build` passou em 24/10 com Node 24.21.0, incluindo os bundles browser e SSR. `pnpm test:ssr` passou nesta data. Avisos conhecidos: fallback locale `pt-BR` para `pt`, orçamento de `recipe-tree.scss` e dependências CommonJS do Tesseract.
- `pnpm check` e `pnpm test` passaram em 23/10. Suíte integral: 85 calculadoras, 270 API, 938 Web e 85 scripts; 1 skip da API. As 5 regressões privadas passaram após conferir os SHA-256 das 8 imagens do manifesto; originais não foram modificados.
- A Web agora responde, mas a inspeção visual da conta QA ainda precisa ser concluída pela aba do navegador. O aviso de quantidades inválidas foi verificado pelo teste Angular renderizado; merge/replace foram verificados em armazenamento isolado. OCR ainda não tem holdout independente nem taxa global de acerto; `1.4M` continua sujeito a revisão manual.

## Próximo passo

- Atualizar a aba `http://localhost:4200/recipes/items/5301` para conferir visualmente o checkout reconstruído e continuar a QA da auditoria. Homologar OCR de todas as páginas com gabarito e gear completo continuam pendentes. Manter `prints-reais-ocr/` fora do Git e não reiniciar serviços de outro checkout.
