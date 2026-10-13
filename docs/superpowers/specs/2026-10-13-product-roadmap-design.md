# Roadmap do Black Market

## Propósito

Apresentar a direção do produto numa tela pública, bonita e fácil de entender. O roadmap reúne os quatro focos do Black Market e mostra como eles se conectam. Ele não é um calendário: não exibe prazos, datas, percentuais de progresso ou promessas de entrega.

## Decisão aprovada

Usar quatro pilares em cards, ligados visualmente por um fluxo central. O fluxo principal deve deixar claro que o Armazém, a Maestria e o Mercado alimentam a decisão de comprar, coletar ou produzir materiais e subreceitas para recomendar uma atividade por lucro por hora.

## Estrutura e conteúdo

1. **Mercado** — consulta de itens e cotações do Mercado Central. Explica que preços e disponibilidade também alimentam as simulações de produção. Link: `/market`.
2. **Crafting** — exploração de receitas e cálculo de produção, com materiais, rendimento e alternativas da cadeia. Links: `/recipes` e `/crafting`.
3. **Scan de armazém + Armazém** — importar captura, revisar reconhecimento e manter quantidades por local. Links: `/scans` e `/storage`.
4. **O que fazer?** — destino da integração. A direção do produto é recomendar a receita mais rentável por hora usando Armazém, Maestria, cotações e tempo, mesmo quando faltam materiais. O plano pode comparar compra, coleta e produção de subitens/subreceitas. Link: `/recommendations`.

Os cards devem separar o que a tela já oferece da direção que ainda está em evolução. Usar rótulos textuais concisos, como “Disponível” e “Em evolução”, somente após conferir cada afirmação no código. Não mostrar um percentual, uma barra vazia ou um estado “Planejado” sem uma funcionalidade concreta explicada. O estado manual não é um indicador de trabalho em tempo real.

Estados iniciais para a tela: **Mercado** e **Crafting** como “Disponível”, pois as respectivas rotas existem; **Scan de armazém + Armazém** como “Em evolução”, com foco no reconhecimento de itens e quantidades; **O que fazer?** como “Em evolução”, ampliando a recomendação para avaliar ingredientes ausentes que podem ser comprados, coletados ou produzidos em subreceitas. “Disponível” indica que a área existe no produto, não que todo o trabalho nela terminou.

## Composição visual

- Cabeçalho curto com título “Roadmap” e uma frase sobre o foco do Black Market.
- Um fluxo central com três momentos: **Seu contexto** (Armazém + Maestria + Mercado) → **Suas opções** (comprar, coletar ou produzir) → **Sua melhor atividade** (receita por lucro/hora).
- Quatro cards com ícone consistente, título, resumo, estado atual/evolução e links para as telas existentes. “O que fazer?” deve receber o maior destaque visual por ser o ponto de integração.
- Desktop: fluxo horizontal e cards em grade 2×2. Mobile: fluxo vertical, seguido pelos cards em uma coluna. Conectores decorativos não podem substituir os títulos nem o sentido textual das etapas.
- Seguir a identidade atual do Black Market: carvão neutro, bordas finas, bronze/dourado como acento, ícones Lucide consistentes, tipografia e espaçamento existentes. Evitar datas, gráfico de progresso, grandes espaços vazios, excesso de brilho e dependências de UI novas.
- Cada link leva a uma tela existente. Nenhum botão promete uma função ainda indisponível.

## Arquitetura e dados

- Criar uma página Angular standalone e lazy-loaded em `apps/web/src/app/features/roadmap/`, servida em `/roadmap` dentro de `WorkspaceLayout`.
- Incluir “Roadmap” na navegação lateral e no estado móvel, com o indicador de rota ativa existente.
- Manter o conteúdo editorial numa constante tipada local à página. Não buscar dados, ler perfil pessoal nem escrever em banco; a tela é informativa e igual para todos.
- Usar links Angular para destinos internos. Não criar novos serviços, endpoints, tabelas ou dependências.
- Definir os estados por pilar junto do conteúdo, com rótulos textuais. Se um destino não existir ou uma descrição não puder ser confirmada na implementação, corrigir o conteúdo em vez de apontar para uma rota fictícia.

## Estados e acessibilidade

Como a tela é estática, não há carregamento nem erro de rede. Se o roadmap ficar sem um destino acionável, o card mantém a descrição e não renderiza um botão falso.

Usar títulos em ordem semântica, cards identificáveis por seus títulos, nomes acessíveis para ícones decorativos ou ocultação deles para leitores de tela, foco visível e alvos confortáveis. O fluxo deve manter significado quando lido linearmente e sem cor. Respeitar `prefers-reduced-motion`; animações não são necessárias para comunicar progresso.

## Fora de escopo

- Entregar ou alterar o funcionamento do Mercado, Crafting, OCR, Armazém ou recomendador.
- Adicionar datas, cronograma, votação, comentários, autenticação, edição do roadmap, percentual de conclusão ou atualizações em tempo real.
- Criar uma tela administrativa ou permitir que cada usuário personalize os estados.

## Critérios de aceite

- `/roadmap` abre dentro do layout existente, tem título de página apropriado e está acessível pela navegação lateral desktop e móvel.
- Os quatro pilares aparecem com as descrições e links corretos; a área “O que fazer?” comunica o fluxo integrado e opções de compra, coleta e produção de subreceitas.
- A tela não exibe prazos ou percentuais e não atribui capacidades não confirmadas.
- O fluxo é legível no desktop e no mobile, sem overflow horizontal, e os cards não perdem conteúdo ou navegação por teclado.
- Testes de componente verificam os quatro pilares, os estados e os destinos. A verificação visual cobre desktop e mobile e o foco por teclado.
