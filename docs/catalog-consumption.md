# Consumo central de itens, categorias e imagens

## Fonte e contratos

O frontend consulta a API do Black Market. O mantenedor importa dados extraídos do cliente para PostgreSQL; usuários não precisam do extractor. Preços atuais vêm do adaptador separado de mercado e não dos preços de referência contidos no cliente.

| Recurso                     | Contrato                                                               |
| --------------------------- | ---------------------------------------------------------------------- |
| Busca de itens              | `GET /api/v1/items?q=Pedra&region=sa&preferredLocale=pt`               |
| Busca por IDs               | `GET /api/v1/items?ids=1,16001&region=sa&pageSize=100` — até 100 IDs   |
| Categorias                  | `GET /api/v1/categories?region=sa&preferredLocale=pt`                  |
| Detalhe completo disponível | `GET /api/v1/items/16001?region=sa&preferredLocale=pt`                 |
| Receitas relacionadas       | `GET /api/v1/items/16001/recipes?direction=produces&region=sa`         |
| Imagem                      | Campo `iconUrl` retornado pela API; pode apontar à rota própria ou CDN |

A lista é paginada e leve. O detalhe inclui `sourceData`, preservando os campos do registro extraído em JSONB por versão: propriedades, flags, valores de referência, equipamento e relações que o extractor tiver produzido. Campos desconhecidos ou ainda sem interpretação não viram automaticamente fórmulas. Relações URN para outros conjuntos não significam que esses conjuntos já tenham endpoints próprios.

Isso significa todos os campos **disponíveis nessa extração de item**, não todos os dados privados ou do servidor do jogo. Alguns campos podem faltar, e a API não inventa traduções, estatísticas ou receitas. Preservar o payload no detalhe evita descartar informações ao importar e evita enviar todos esses dados em cada página da lista.

## Imagens

O manifesto publicado mapeia IDs a imagens compartilhadas. O frontend não monta caminhos DDS nem busca imagens de concorrentes: usa `iconUrl` e `CatalogApiService.resolveIconUrl`. Quando uma imagem falta, o componente apresenta a inicial do item.

Sem CDN, a API serve WebP em uma rota versionada por checksum. `CATALOG_ASSETS_PUBLIC_URL` permite configurar a base de assets/CDN em produção, mantendo o mesmo contrato. A base pública deve conter `<checksum>/icons/...`; o servidor conserva o manifesto local. A configuração não envia arquivos a R2 automaticamente e deve ser habilitada somente depois de publicar os assets.

## Seleção nas ferramentas

`CatalogItemPicker` é a busca compartilhada por nome/categoria, com atraso curto, cancelamento de requisições antigas e até doze resultados. Mercado, materiais/projetos, ingredientes/produtos, sessões e resultados de caixas usam os mesmos nomes, IDs, categorias e imagens da API.

IDs opcionais foram adicionados aos modelos de dados pessoais para manter backups anteriores compatíveis. Nomes antigos permanecem como snapshots pessoais; não são promovidos a registros do catálogo. Novas seleções guardam o ID canônico. Quantidade, preço manual, taxa observada e objetivo continuam entradas do jogador, não atributos inventados do item.

O CSV de armazém resolve IDs em lotes no catálogo, apresenta prévia e atualiza apenas identidades confirmadas (região, ID e local). Registros antigos sem ID ou duplicados exigem revisão antes de mesclar. [Estratégia de importação](storage-import-strategy.md).
