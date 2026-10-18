# Cotações de receitas e cliente instalado — 18/10/2026

## Diagnóstico reproduzido

Receita reportada: `5670a9e98801c39fb5b8114c0915fca0d456d61b2f7f6e97473da1808c31cab0`, Acompanhamentos Variados.

A API de produção já consulta o mercado automaticamente. A resposta em lote fornece preço-base e estoque, mas não fornece preço máximo. O seletor descartava um preço-base positivo quando o estoque era zero. Queijo, Trigo e o produto final tinham cotações válidas nessas condições. O botão de atualização também não repassava `forceRefresh` ao cache.

A correção mantém a prioridade cotação com estoque → máxima informada → preço-base de referência. A interface identifica a referência e conserva estoque zero. O adaptador preserva origem de mercado e data de observação; não transforma a cotação em disponibilidade de compra. Atualização manual passa a renovar o cache do navegador, respeitando os caches/limites do BFF e do provedor. Não há uma requisição individual por ingrediente.

No navegador, Queijo, Pássaro Frito, Leite e Acompanhamentos Variados receberam preços. Restou Lula #8211: o próprio cliente a classifica como peixe de comércio, sem registro no Mercado Central. Calamar Desidratado #8511 é outro item, negociável. O endpoint de equivalentes retorna vazio intencionalmente porque a relação de secagem não comprova proporção culinária. Não atribuir a cotação do desidratado à Lula fresca sem uma regra validada.

O [guia oficial de culinária](https://www.sa.playblackdesert.com/es-Mx/Wiki?wikiNo=27) distingue frutos do mar frescos/processados e informa que substitutos podem precisar de outras quantidades; não confirma nessa página a proporção específica da Lula. A busca oficial não bastou para certificar essa regra. Essa pendência permanece explícita.

## Patch e extração

Consultadas as [notas oficiais de 15/10/2026](https://www.sa.playblackdesert.com/PT-BR/News/Detail?groupContentNo=8726). O fingerprint do cliente instalado divergia do catálogo ativo extraído em outubro: índice `11e938d92a61…`, localização `72e54f5dc932…`. Isso comprova uma instalação diferente da extração anterior; o fingerprint sozinho não certifica o número do patch do launcher.

Nova extração somente de leitura, concluída em 18/10, usando o mesmo binário regional revisado `60bd5677…` e perfil `recipe-catalog-only`:

- 74.523 itens; 13.291 relações brutas, das quais 272 têm referências inválidas.
- Original preservado em `recipes.raw.json`; rejeitadas em `invalid-recipe-references.json`; 13.019 relações válidas, 10.681 normalizadas antes do suplemento.
- Nenhuma composição nova e duas composições removidas frente à extração anterior. Isso não comprova mudança de regra no servidor.
- 27.071 imagens e 83.926 aliases de tipos diferentes; não são contagens exclusivas de ícones de itens.
- Checksum normalizado: `dae590a980d234ded0de347590b853facdf8175202a4186197917f017cc6a917`.

A primeira importação foi recusada pelo checksum do suplemento, preservando a versão anterior. Revisão local comparou integralmente os 27 registros de itens referenciados no suplemento: nenhum campo mudou, inclusive nomes e descrições. `manufacture.json` inteiro é idêntico à extração anterior. As 16 fórmulas suplementares foram preservadas, sem alterar quantidades/rendimentos. Só depois dessa comparação foram renovados checksum, data e procedência do suplemento.

Backups completos precedem a publicação. Não há reset de banco, remoção de volumes nem limpeza de armazenamento pessoal. Resultado da publicação e verificações de integridade em ACTIVE_CONTEXT §185.

## Comparação pública e limites

A revisão dos quatro concorrentes está em [fluxo de receitas e mercado](recipe-market-flow-review-2026-10-18.md) e [atividade de mercado](market-activity-and-bootstrap-review-2026-10-18.md), consultadas nesta rodada. Workshop e BDOLytics apresentam compra/produção e substituições; Codex fornece relações; Garmoth apresenta cotações e estoque. Nenhuma dessas observações autoriza reutilizar os preços ou assumir uma proporção de substituição. Não houve validação numérica pareada de uma receita com Lula fresca nesta consulta. Preços do projeto continuam vindo do adaptador autorizado de mercado, separadamente da extração estática.
