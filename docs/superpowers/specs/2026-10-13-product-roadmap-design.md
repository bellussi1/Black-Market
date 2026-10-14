# Roadmap do Black Market

## Propósito

Apresentar a direção do produto em uma tela pública, sem prazos, datas, percentuais ou promessas de entrega. O Roadmap apresenta Mercado, Crafting, Scan/Armazém e “O que fazer?” e explica como os dados alimentam a recomendação por lucro/hora.

## Decisões aprovadas

- Quatro pilares em cards, conectados por um fluxo central.
- Conteúdo editável em banco de dados por uma tela administrativa, sem precisar alterar código ou publicar um deploy para atualizar textos, estados, ícones, ordem e links.
- Os quatro pilares são Mercado, Crafting, Scan de armazém + Armazém, e “O que fazer?”.
- Sem prazos.

## Conteúdo inicial

O banco recebe dados iniciais por migração, que podem ser alterados na tela de edição:

1. **Mercado** — consulta de itens e cotações do Mercado Central; preços e disponibilidade alimentam simulações de produção. Link inicial: `/market`.
2. **Crafting** — exploração de receitas e cálculo de produção com materiais, rendimentos e alternativas da cadeia. Links iniciais: `/recipes` e `/crafting`.
3. **Scan de armazém + Armazém** — importar capturas, revisar itens e quantidades reconhecidos e manter estoque por local. Links iniciais: `/scans` e `/storage`.
4. **O que fazer?** — recomendar atividades por lucro/hora com Armazém, Maestria, cotações e tempo, considerando compra, coleta e produção de subitens/subreceitas quando faltam materiais. Link inicial: `/recommendations`.

Estados iniciais, que também são editáveis: Mercado e Crafting “Disponível”; Scan/Armazém e “O que fazer?” “Em evolução”. A tela não pode afirmar que uma etapa está concluída além do que a descrição explica.

O fluxo inicial tem três etapas em ordem: **Seu contexto** (Armazém + Maestria + Mercado) → **Suas opções** (comprar, coletar ou produzir) → **Sua melhor atividade** (receita por lucro/hora). Etapas, textos e ordem vêm do banco.

## Modelo e interface de edição

- Uma tabela comum armazena etapas do fluxo e pilares; cada registro tem identificador estável, tipo, ordem, título, resumo, descrição, estado/rotulo opcional, ícone, destaque e links internos.
- Uma migração inicial semeia o fluxo e os quatro pilares. A tela pública nunca usa uma cópia constante local nem conteúdo substituto embutido se a API falhar.
- API pública somente leitura. A API de edição exige sessão Supabase válida e a marcação server-side `app_metadata.roles` com `roadmap_admin` ou `admin`; a interface não decide autorização.
- A tela administrativa permite criar, editar, reordenar e remover etapas/pilares. A gravação envia a coleção validada de uma vez para evitar estados parciais.
- Validar campos, tamanho dos textos, slugs únicos, tipos, links em caminhos internos (`/...`) e tamanho máximo da coleção no servidor. Renderizar textos como texto, nunca como HTML.
- A API devolve `updatedAt`; respostas públicas usam cache curto e a interface de edição força revalidação após salvar.
- Se não houver conteúdo no banco ou ocorrer falha, mostrar erro/estado vazio e ação de tentar novamente; não reconstruir conteúdo com hardcode.

## Composição visual e acessibilidade

- Cabeçalho curto com título “Roadmap” e frase de foco.
- Fluxo central horizontal no desktop e vertical no mobile, seguido por cards 2×2 no desktop e uma coluna no mobile. “O que fazer?” pode receber destaque vindo do campo `featured`.
- Identidade Black Market: carvão, bordas finas, bronze/dourado como acento, ícones Lucide e espaçamento existente. Não adicionar dependências de UI.
- Texto longo quebra linha; nenhum nome, descrição ou link deve ser cortado. Não usar cor como única forma de indicar estado.
- Foco visível, ordem de títulos semântica, labels em todos os campos, confirmação de exclusão, feedback de salvar e respeito a `prefers-reduced-motion`.

## Fora de escopo

- Adicionar datas, cronograma, percentuais de progresso, votação, comentários ou atualização em tempo real.
- Tornar a rota pública personalizada por usuário.
- Alterar fórmulas ou afirmar paridade total com concorrentes.

## Critérios de aceite

- `/roadmap` lê exclusivamente o conteúdo persistido, mostra fluxo e cards em ordem, sem prazos/percentuais, e links para rotas existentes.
- `/roadmap/manage` permite ao administrador editar, reordenar, criar e remover dados; usuário sem papel administrativo recebe 403 na API, mesmo chamando a rota diretamente.
- Alterações persistem após recarregar a página. Uma edição não pode gravar links externos, HTML, slugs duplicados ou tipos inválidos.
- Testes verificam carga pública, estados vazios/erro, autorização, validação, gravação e UI responsiva/teclado.
