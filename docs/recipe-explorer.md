# Recipe Explorer e árvore interativa

Atualizado em 9 de outubro de 2026. Mercado SA e catálogo em português como padrões.

## Escopo entregue

- Pesquisa universal reutiliza o catálogo central: nome, categorias, resultados com ícones e IDs. Não exige uma receita para abrir um item.
- Rotas públicas: `/recipes`, `/recipes/items/:id` e `/recipes/:key`. A navegação, Home, catálogo, mercado, armazéns e inventários oferecem acesso contextual.
- Receita alternativa explícita, grafo de nós e conexões com pan/zoom, centralização, destaque de ancestrais e filtro de ramificação; expansão sob demanda e recolhimento sem remover a escolha do plano.
- Em telas até 1050 px, etapas hierárquicas substituem o grafo. A lista consolidada permanece disponível sem reiniciar quantidade ou seleção de estoques.
- Painel contextual: descrição do jogo, categoria, quantidades conhecidas por local, receitas, usos, produção por trabalhadores, território, coordenadas, conexões e produtos vinculados, cotação e histórico observado.
- Uma base conhecida pode ser escolhida como origem depois de selecionar obtenção externa, em vez de fabricar o material. A lista mantém esse rótulo; não calcula automaticamente velocidade nem custo operacional dos trabalhadores.
- Campos ausentes e preços desconhecidos são sinalizados. Rendimento por operação é um cenário informado, sem coeficiente de maestria presumido.
- Nenhuma simulação modifica os itens importados. Impostos usam a configuração existente. Preferências de imposto só são salvas quando o usuário as altera.
- Outras calculadoras, mundo/império completo e demais módulos continuam suspensos.

## Referência observada

A [página pública do BDOLytics](https://bdolytics.com/en/crafting/1411:030aef873a21), consultada em 9/10/2026, exibiu Perfume of Envy, duas variantes, quantidade desejada, abas Overview/Recipe Variants/Graph/Analytics/Weight, materiais consolidados, estoque, preço personalizado e imposto. Selecionar Graph exibiu nós, conexões, controles e minimapa; a lateral manteve a cadeia de ingredientes. Totais de custo, lucro, tempo e lucro/hora estavam presentes.

Isso descreve a interface observada, não a validação das fórmulas nem o funcionamento interno de seus dados. Não consumimos endpoints internos nem copiamos os preços e coeficientes da referência. O Black Market usa SVG e componentes Angular existentes, sem instalar uma biblioteca de grafos.

## Dados e procedência

A consulta local durante a implementação encontrou **74.216 itens e 4.406 receitas** no catálogo SA/pt, versão `sa-pt-meta-337651819fe3-loc-db615a33d45a-ext-5bf11bd7-catalog-v2`, importada em 8/10/2026.

| Relação                                                | Cobertura desta entrega                                                                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Item → receita → ingredientes/resultados               | Relações importadas, com IDs estáveis e variantes. Nem todos os rendimentos estão disponíveis.                                                |
| Item → trabalhadores → base/território                 | Relações explícitas em `world.json`; nomes relacionados resolvidos somente na mesma versão.                                                   |
| Base → coordenadas/conexões/produtos                   | Coordenadas finitas validadas; visualização relativa, não um mapa topográfico. CP exibido é da produção, não o investimento total do império. |
| Coleta, caça, combate, pesca, NPCs e outras atividades | Descrição do jogo quando existente. Não há cobertura estruturada completa de ferramentas, criaturas, vendedores, requisitos e spots.          |
| Mercado                                                | Arsha através do backend existente, sob ação do usuário. Variante base, região, origem, horário e estado de cache; preço não garante compra.  |
| Estoque pessoal                                        | Registros revisados e vinculados por ID. Quantidades conhecidas, não uma sincronização automática com o jogo.                                 |

Exemplo de divergência real: a receita extraída de **Reagente Líquido Limpo #5301** informa duas unidades de sal; sua descrição informa uma. O rendimento de saída é nulo. A interface mostra os dados disponíveis e permite corrigir quantidades como cenário; não altera o catálogo nem promete que o dado bruto esteja correto.

Cotações novas ficam apenas na sessão do explorador; cotações salvas anteriormente também são usadas com seu horário. Valores marcados como antigos pelo provedor não substituem preços no cálculo. Parte das receitas que usam um material é limitada pelas consultas existentes a 50 resultados; a relação não deve ser interpretada como exaustiva.

## Como usar

1. Abra **Explorar receitas** e busque um item, mesmo que seja matéria-prima.
2. Se houver várias receitas, escolha a combinação de materiais adequada. A nova variante substitui a anterior.
3. Informe a quantidade total desejada. Estoque do produto final reduz a produção adicional necessária.
4. Confira o rendimento por operação. Campos vazios impedem a consolidação; um rendimento médio é uma hipótese de planejamento.
5. Abra um ingrediente para consultar seus detalhes. Escolha uma sub-receita ou mantenha obtenção externa. Use **Obter pronto em vez de produzir** para retirar os componentes daquela etapa.
6. Selecione quais armazéns/inventários entram no cálculo. Reservas existentes são descontadas. Dados antigos/sem horário são avisados; duplicatas no mesmo ID/local bloqueiam o cálculo até correção ou exclusão do local.
7. Em **Materiais consolidados**, confira necessário, estoque utilizado, produzir, obter fora e origem escolhida. Um material compartilhado não usa o mesmo estoque duas vezes; sobras produzidas podem abastecer outra ramificação.
8. Consulte o preço de cada material no painel. Sem cotação, o custo é parcial. Valores de referência dos materiais não incorporam tempo, energia, ferramentas ou custo real de trabalhadores.
9. Abra uma base conhecida para ver território e coordenadas. Nenhuma posição é estimada para preencher lacunas.
10. Alterne visualizações sem perder o plano atual. O plano é da sessão; recarregar a página reinicia os métodos e cenários. Os itens importados continuam salvos pelo mecanismo existente.

## Arquitetura e limites

- `RecipeKnowledge`: leituras compartilhadas e cache por versão, região, idioma e ID, com até 300 entradas por tipo. A página verifica compatibilidade da versão entre item e receitas; o painel recusa relacionamentos de versões divergentes.
- `recipe-tree-model.ts`: estado por caminho, substituição de receita e planejamento separado da interface.
- `calculateProduction`: aritmética existente, consumo global de estoque, consolidação por ID e aproveitamento de sobras. Aceita até 4.000 registros de estoque, compatível com importações de screenshots.
- `recipe-graph-model.ts`: layout determinístico, até 200 nós visíveis e filtro de ramificação. A árvore carregada é limitada a cerca de 500 nós/12 níveis; o cálculo mantém o limite existente de 100 receitas selecionadas e 20.000 operações.
- `RecipeGraph`: pan com ponteiro/setas, zoom entre 35% e 175%, botões rotulados e foco visível.
- Backend de fontes: consulta parametrizada, até 50 bases por item, indicação de truncamento, nomes vinculados por IDs e coordenadas validadas. Não necessita migrations.
- Ícones continuam no componente padrão, até 48×48, sem alterar proporção.
- Não foram adicionados serviços, dependências, filas ou custos recorrentes. O explorador não envia inventário pessoal para concorrentes.

## Validação e reprodução

Resultado desta entrega: **163 testes de frontend, 63 de backend e 24 do pacote de cálculos passaram**. Lint, formatação, compilação de frontend/backend e smoke SSR (incluindo as novas rotas públicas e proteção dos módulos suspensos) passaram. A build de produção mediu o módulo lazy de receitas em **67,59 kB** bruto / **18,32 kB** de transferência estimada; o carregamento inicial ficou em **901,01 kB** bruto / **207,77 kB** estimado. O aviso existente de orçamento inicial de 500 kB permanece; essas medidas não são Core Web Vitals nem um benchmark de rede real.

```powershell
pnpm --filter @bdo/web test
pnpm --filter @bdo/api test
pnpm --filter @bdo/calculators test
pnpm --filter @bdo/web build
pnpm --filter @bdo/api build
pnpm lint
pnpm format:check
pnpm test:ssr
```

Testes controlados cobrem cenários com estoque 20+50+10 para demanda 100 (faltam 20), reservas/região/locais, produto já possuído, alternativas excludentes, rendimento ausente, preços desconhecidos, duplicatas, ciclos, árvore grande, zoom, teclado e respostas atrasadas. Os exemplos de receitas nos testes são fixtures explícitas; rendimento 2,5 não é declarado como taxa oficial.

Conferência no navegador usou Reagente Líquido Limpo #5301 e sua sub-receita Água Purificada #6656. Com alvo 10 e cenário 2,5, o catálogo selecionado exige 8 de sal e 4 de cada outro ingrediente. Escolher a filtragem revelou Garrafa Cheia de Água do Rio e exigiu confirmar o rendimento da sub-receita. Água Purificada também mostrou bases conhecidas, como Abrigo do Kunid, com território e coordenadas do catálogo.

Não há medição de precisão geral dos dados, produtividade real, Core Web Vitals ou lucro/hora nesta entrega. Lighthouse e teste manual com leitor de tela completo permanecem pendentes. O ambiente de automação não aplicou efetivamente a alteração de viewport para mobile; a adaptação foi conferida no código, sem declarar validação visual em 375 px.

## Enriquecimento futuro

1. Revisar quantidades e interpretar rendimentos/probabilidades com fontes verificáveis, preservando versão/região.
2. Vincular recursos de gathering/hunting/monstros/pesca e lojas de NPCs por IDs; descrever mecanismos distintos, sem transformar qualquer abate em Hunting.
3. Adicionar mapa topográfico apenas com coordenadas e arte compatíveis; o painel geográfico atual é modular.
4. Ampliar paginação de usos/fontes, métricas de tempo e custos de trabalhadores quando houver dados suficientes.
5. Salvar planos de exploração se o uso justificar. Esta entrega mantém a arquitetura e os dados pessoais atuais.
