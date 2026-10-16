# Concorrentes: Armazém, Perfil, Equipamentos e OCR

**Consulta:** 16/10/2026  
**Motivo:** informar a fase 3 do rollout visual da Roadmap em Armazém, Família/Personagem, Gear e importação de capturas.  
**Limite:** inspeção pública de páginas e conteúdos indexados; não houve login, chamadas privadas, cópia de código ou tentativa de descobrir endpoints internos.

## Como ler as observações

- **Renderizada:** conteúdo que a página pública expôs na navegação consultada.
- **Indexada:** descrição ou conteúdo de página pública exposto pelo mecanismo de busca. Não comprova que todos os controles funcionem nem que os dados continuem iguais.
- **Não verificável:** página dependente de JavaScript, falha de carregamento, estado sem sessão ou acesso restrito impediu inspecionar o fluxo completo.
- Os números de preços, volume, estoque e estatísticas dos exemplos são dinâmicos. Não são fixtures nem valores para os cálculos do Black Market.

## BDO Workshop

**Páginas:** [site](https://bdoworkshop.com/), [política de privacidade](https://www.bdoworkshop.com/privacy-policy).  
**Estado:** a página inicial carregou apenas uma descrição estática, aviso de JavaScript e painel de cookies. A interface interna do plano e do Storage Tracker não ficou acessível nesta consulta. A captura de tela do plano Balenos Meal fornecida pelo usuário em 16/10 mostra os atalhos “Login to save”, “Tutorial”, “Custom prices” e “Storage Tracker”; isso é evidência da captura, não uma inspeção nova do tracker.

**Cobertura encontrada:** a descrição pública indexada anuncia calculadoras de crafting e mercado, progressão de gear e leitura de capturas de inventário, armazém e gear. O texto indexado da política, atualizado em 22/09/2026, afirma que há salvamento de planos, gear, inventário/armazém lidos por captura e preços personalizados: sem login, os dados salvos ficam no armazenamento local do navegador; com conta, ficam associados ao usuário. A mesma política declara que as capturas enviadas e resultados de reconhecimento entram num log de revisão usado para conferir erros e melhorar o reconhecimento. Como a política não pôde ser aberta nesta consulta e o produto depende de JavaScript, esses itens ficam classificados como **declarações indexadas do próprio site**, não como fluxo reproduzido.

**Não verificado:** telas e controles do tracker, campos por personagem/armazém, correções do OCR, comportamento de salvar/sincronizar, permissões, retenção real e detalhes do tour atual. A captura fornecida mostra o botão do Storage Tracker, mas não prova a interação nem a forma de armazenamento.

**Aplicação ao Black Market:** manter a prévia original, destino e correção humana visíveis antes de confirmar. A leitura de capturas do projeto deve continuar descrita conforme seu comportamento local em memória; não adotar upload ou retenção de capturas com base na política do concorrente.

## BDO Codex

**Páginas:** [catálogo de itens](https://bdocodex.com/us/items/), [receita da Master's Cooking Box](https://bdocodex.com/us/mrecipe/2366/?sl=1).  
**Estado:** a página de itens expôs categorias, classes, raridades e filtros, mas a tabela dizia que carregava os dados do servidor. A página de receita foi renderizada com materiais, resultado base e calculadora.

**Observado na receita:** mostra materiais e produto-base, nível de habilidade, quantidade, seleção de mercado/região, preço do material e do produto, custo, dedução de imposto premium (15,5%) e alternativa de taxa de 35%, lucro e controle para limitar receitas de materiais a resultados garantidos. Também exibe variantes de receita dos materiais. A página avisa que nível de habilidade pode alterar materiais e quantidade de produto e expõe regras gerais de substituição por grau.

**Não verificado:** persistência por conta, inventário/armazém pessoal, construtor de personagem ou gear, e execução atual dos cálculos com entradas controladas. A nota sobre habilidade não é especificação suficiente para reproduzir a fórmula.

**Aplicação ao Black Market:** Codex é referência pública para catálogo, relações de receita e nomenclatura. Preço e resultado devem continuar separados entre dados observados, entradas editáveis e regras de cálculo verificadas; não tomar a nota do Codex como fórmula de maestria.

## BDOLytics

**Páginas:** [mercado e histórico de item](https://bdolytics.com/en/market/item/6719), [calculadora de crafting](https://bdolytics.com/en/crafting/9855%3Adc94e8a443f6), [comparação de Imperial Cooking](https://bdolytics.com/en/NA/cooking/imperial).  
**Estado:** páginas de mercado e crafting dependem de JavaScript e não expuseram o DOM completo ao abrir diretamente. O índice de busca retornou conteúdo recente dessas páginas. Os detalhes abaixo são, portanto, **indexados**, sem afirmar que a interação foi reproduzida.

**Cobertura indexada no mercado:** região, preço e variação de sete dias, faixa chamada “fair price”, unidades listadas/estoque, volume diário, total de negociações e histórico separado de preço, volume e estoque, com intervalos de 1D, 7D, 30D, 6M e 1Y em exemplos atuais.

**Cobertura indexada em crafting:** receitas alternativas, quantidade planejada, materiais em estoque, preço personalizado, imposto e custo por linha; itens de retorno com opção “Keep”; faturamento, custo, lucro e margem; análise de duração, total de crafts e lucro/hora; árvore de materiais e resultado. A página de Imperial Cooking expõe campos de maestria, CP e turn-ins e colunas separadas para “Profit (Buy)” e “Profit (Craft)”, além de estoque, preço e volume médio de 14 dias.

**Não verificado:** origem/metodologia dos preços e volumes, tratamento de ordens sem venda, modelos exatos de rendimento por maestria, arredondamento, premissas de tempo e comportamento ao alterar cada controle. Os resultados indexados não constituem uma reprodução pareada da fórmula.

**Aplicação ao Black Market:** separar compra e produção, mostrar materiais cobertos pelo estoque, retornos, custo, receita, lucro líquido e tempo com unidades explícitas. Preservar as lacunas da fonte de volume e os limites de certificação do otimizador; não inferir venda garantida a partir de estoque ou negociações.

## Garmoth

**Páginas:** [visão geral do mercado](https://garmoth.com/market), [Gear Planner](https://garmoth.com/character/default), [exemplo público de personagem](https://garmoth.com/character/Choice), [informações de personagem e maestrias](https://garmoth.com/character/dP6D3eCw1f/character-info), [guia do planner](https://garmoth.com/guides/post/garmoth-gear-planner).  
**Estado:** a página do Mercado foi renderizada com os agrupamentos, porém os totais principais estavam como “-”. O perfil público expôs abas Character Info, Passives & Fame, Gear Builder, Upgrade Path, Compare, Stats, Silver e calculadoras PvE/PvP. A página de informações de personagem mostra campos de classe/especialização, fitness, masteries de 11 profissões e capítulos de journals. As descrições indexadas do planner relatam editar equipamento, comparar builds, acompanhar stats, valor total do gear e caminho de upgrade.

**Observado/indexado no mercado:** seções de itens populares (favoritos e acompanhamento recentes), tendência definida pela relação entre volume de venda e estoque, maiores altas/baixas e itens adicionados recentemente. A tela de item individual não expôs preço/histórico legível na consulta atual.

**Não verificado:** cálculo de preço do Gear Builder, persistência/limites da conta, atualização da fonte de mercado, fórmula do caminho de upgrade e qualquer leitura OCR do gear. “Screenshot it” na página pública não foi tratado como OCR.

**Aplicação ao Black Market:** manter perfil/família e gear ligados ao personagem ativo, distinguir equipamento conhecido de atributo desconhecido e não apresentar o conjunto atual como simulador integral de combate. Upgrade e valor de mercado precisam de fonte e premissas atuais, sem misturar a confirmação do OCR com a edição manual.

## Decisões para a fase 3

1. Reutilizar kicker, título, descrição, painéis e hierarquia carvão/bronze da Roadmap sem impor uma timeline às telas de dados.
2. Em captura com resultados, manter contexto e estado da revisão na tela junto da lista pendente. Em dados de perfil, manter prévia, seleção de destino/campos e ação explícita de aplicação no mesmo fluxo visual.
3. Preservar incerteza OCR, campos manuais, destino por captura/personagem e confirmação. Nenhum resultado incerto deve parecer importado automaticamente.
4. Tratar concorrentes como referências de fluxo e cobertura; não copiar código, datasets ou fórmulas, nem usar snapshots de busca como dados do produto.

## Fontes abertas

- [BDO Workshop](https://bdoworkshop.com/) — descrição pública indexada; app interno não carregou sem JavaScript.
- [BDO Workshop Privacy Policy](https://www.bdoworkshop.com/privacy-policy) — declarações públicas indexadas; tentativa de abrir o texto completo expirou.
- [BDO Codex Items](https://bdocodex.com/us/items/) — categorias e filtros públicos; resultados da tabela ainda carregavam.
- [BDO Codex Master's Cooking Box](https://bdocodex.com/us/mrecipe/2366/?sl=1) — receita e calculadora visíveis.
- [BDOLytics Central Market item](https://bdolytics.com/en/market/item/6719) — campos de mercado/histórico retornados pelo índice.
- [BDOLytics Crafting](https://bdolytics.com/en/crafting/9855%3Adc94e8a443f6) — análise de lucro/hora e materiais retornada pelo índice.
- [BDOLytics Imperial Cooking](https://bdolytics.com/en/NA/cooking/imperial) — campos de maestria e comparação compra/craft retornados pelo índice.
- [Garmoth Market](https://garmoth.com/market) — categorias renderizadas; os totais estavam ausentes.
- [Garmoth Gear Planner](https://garmoth.com/character/default) e [perfil de personagem](https://garmoth.com/character/dP6D3eCw1f/character-info) — estrutura pública de gear e maestrias.
