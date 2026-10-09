# Evolução do produto — Black Market

Pesquisa e implementação realizadas em 9 de outubro de 2026. O foco continua desktop; as adaptações básicas existentes foram mantidas. Angular, Nest, PostgreSQL e reconhecimento local foram preservados, sem novos serviços pagos ou bibliotecas de UI.

## Auditoria e referências

O produto já tinha catálogo canônico por região/versão, consultas ao Arsha, inventário compartilhado, importação de oito imagens, revisão visual, detecção de duplicatas, modos de sincronização, cálculo de taxas e árvore recursiva. A interface dispersava ações, mostrava configuração cedo e perdia cenários ao navegar. Personagens e família não tinham uma entrada progressiva dentro do escopo ativo.

| Referência pública inspecionada                                                | Funcionalidades e acertos observados                                                                              | Fricção ou limite observado                                                                                       | Decisão aplicada                                                                                |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [BDolytics](https://bdolytics.com/en/crafting?category=processing)             | Tabela compacta de receitas, filtros de atividade, ícones dos ingredientes, preço, volume e configuração separada | Muitos indicadores antes de explicar as premissas; anúncios ocupam espaço. Não auditamos funcionalidades privadas | Busca no início e na navegação, detalhes avançados recolhidos, lacunas de rendimento explícitas |
| [BDO Workshop](https://bdoworkshop.com/crafting-workshop/storage-tracker)      | Navegação por oficinas; armazém ligado à área de produção                                                         | O fluxo público de armazém exige login. Não entramos em uma conta para avaliar edição ou importação               | Estoque local e consulta pública disponíveis sem cadastro; sincronização revisada               |
| [Garmoth](https://garmoth.com/)                                                | Ferramentas por objetivo, mercado, gear, artefatos, cristais e guias                                              | Menu muito extenso, conteúdo editorial concorre com ferramentas. Não auditamos planos privados                    | Menu estável para tarefas ativas; personagem, família e planejamento acessíveis diretamente     |
| [Inventário oficial](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=416) | Grade de slots, abas, pesquisa, peso, categorias e busca entre locais                                             | Muitas ações pequenas juntas. Capturas do guia misturam revisões de diferentes datas                              | Ícones limitados a 48 px, painéis de carvão, destaque dourado, pesquisa e modos grade/lista     |
| [Ficha oficial](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=415)      | Identidade, combate, peso, energia, profissões e histórico                                                        | Grande volume de dados para quem precisa só de uma tarefa                                                         | Cadastro com nome; atributos opcionais em seções, salvos ao sair do campo                       |
| [Mercado oficial](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=47)     | Preços, estoque e recebimento após taxas                                                                          | O recebimento precisa considerar os modificadores aplicáveis                                                      | Bruto/líquido na própria cotação, regras configuráveis e preferências reutilizadas              |

As páginas públicas foram abertas no navegador e as interfaces inspecionadas visualmente. Também examinamos uma [captura oficial de inventário](https://s1.pearlcdn.com/NAEU/Upload/WIKI/5d7e9d6af4920240112154340895.png). Ela é uma referência de molduras e hierarquia, não evidência de todas as regras do patch atual. Nenhum login, scraping em lote ou cópia de dados privados dos concorrentes foi realizado.

O guia oficial do mercado informa imposto base de 35% e recebimento de 84,5% com Value Pack. O modelo mantém bônus sobre a coleta e isenção configuráveis. Energia máxima e contribuição são dados compartilhados; energia atual, peso e maestria com o conjunto equipado pertencem ao personagem. A separação de ferramentas familiares é descrita em [Family Life Tools](https://garmoth.com/guides/post/family-life-tools); esses equipamentos compartilhados ainda precisam de um fluxo específico, separado dos slots históricos do personagem.

## Arquitetura de informação e prioridades

1. Consultar antes de cadastrar: busca por item na página inicial e no cabeçalho; acesso imediato a catálogo, receita e mercado.
2. Importar → reconhecer → revisar pendências → confirmar sincronização. A área de leitura, personagem ativo e local de estoque são reaproveitados quando disponíveis.
3. Ver preço bruto ou líquido sem refazer a busca. Taxas compartilhadas com o crafting.
4. Explorar a produção, preservar o cenário e salvar uma lista de materiais.
5. Cadastrar apenas o nome. Preencher atributos, maestria, conjuntos e família conforme necessário.

O design usa painéis escuros, acentos dourados, títulos serifados, controles compactos e contraste legível. O sistema existente de ícones, foco visível, mensagens de estado e controles nativos foi reutilizado. A navegação não depende da cor dos estados.

## Implementado

- Tema e densidade atualizados nos componentes comuns; menu com acesso a personagem/família, planejamento, catálogo e backup.
- Busca global e busca inicial com ações de receita, mercado e catálogo.
- Consulta automática ao selecionar um item; bruto/líquido por unidade, ícone, região, origem e horário preservados; Value Pack e taxas salvos para uso no crafting.
- Importação automática quando há exatamente uma grade detectada, ou molduras suficientes de equipamentos. Casos sem uma área confiável mantêm o ajuste manual. Arquivos repetidos e sobreposições continuam tratados pelo fluxo existente.
- Fila de pendências e visualização de todos os itens. Confirmação em grupo somente por ação explícita para sugestões visuais nítidas com quantidade inteira, confiança de OCR de pelo menos 85 e sem abreviação. Equipamentos continuam exigindo revisão individual.
- Personagem ativo reutilizado na importação, na ficha e na inclusão manual de inventário.
- Criação de personagem dentro da importação, sem sair da página nem perder o lote. Capturas de personagem sem destino recebem o novo personagem, com correção disponível por imagem.
- Cadastro mínimo e edição progressiva de identidade, especialização, atributos, peso, inventário e maestria. Valores inválidos preservam o estado anterior.
- Registros opcionais de artefatos, pedras de luz, cristais e trajes; presets de equipamentos/cristais com desfazer.
- Família por região: nome, contribuição, energia máxima, níveis de profissões, pets e montarias. Dados históricos permanecem no backup; níveis antigos só entram na família da região após confirmação explícita.
- Cenários de crafting preservados em memória da sessão, separados por região, versão, item e método; até vinte cenários. Carregamentos interrompidos não ficam presos no estado restaurado.
- Lista consolidada gerada pela árvore, salva no WorkspaceStore. Estoque é alocado uma vez entre planos e reservas são descontadas; locais excluídos são respeitados. A lista possui paginação de 48 materiais e remoção reversível.

## Refinamento da interface desktop

Segunda etapa visual, realizada em 9 de outubro de 2026:

- Campos de quantidade, seletores, upload e botões passam a usar controles comuns. Foram removidas regras concorrentes que transformavam todas as ações de páginas guiadas em botões primários. Ações principais, secundárias, destrutivas e desabilitadas mantêm hierarquia própria.
- O mercado separa consulta, cálculo de venda e cotações salvas. Trocar de área preserva a busca, a resposta e os valores do cálculo. Guardar uma cotação abre o cálculo correspondente. A busca é recolhida quando a resposta chega, mantendo preço, estoque, taxas e origem em destaque.
- A oficina combina método e parâmetros em duas colunas. Busca, ingredientes, estimativas e procedência podem ser expandidos quando necessários; a árvore ganha espaço. A opção exibida no seletor acompanha o método realmente calculado, inclusive após a projeção do componente.
- Personagens usam duas colunas para identidade e complementos, com uma orientação específica para o primeiro cadastro. Estoque tem seletor grade/lista consistente, ações de edição separadas e histórico recolhido. Planejamento organiza materiais e planos lado a lado.
- Catálogo adota a paleta comum de carvão e dourado, título direto e cabeçalho compacto. Estilos de navegação antigos sem elementos correspondentes foram removidos. Detalhes separam descrição e atributos; nome e descrição deixam de aparecer novamente na lista de atributos.
- Importação e backup herdam o mesmo padrão de controles, foco e estados. A correção manual de equipamento fica em uma seção opcional, preservando a ficha como conteúdo principal.

Validação: 33 testes em nove arquivos dos fluxos afetados, lint dos templates e TypeScript alterados, build de produção e inspeção no navegador local. A revisão visual cobriu oficina, consulta e cálculo de mercado, cadastro vazio, armazém vazio, importação, catálogo e detalhes de item. Os testes usam dados em memória; não foram importadas capturas nem alterados personagens ou inventários reais nesta etapa.

Esta etapa não resolve o benchmark de reconhecimento com oito capturas reais, as regras ausentes de maestria e bônus nem a virtualização de todas as listas. Permanecem os avisos anteriores de tamanho do bundle inicial, fallback de locale e dependências CommonJS do reconhecimento.

## Fonte de verdade dos dados

Itens e receitas usam IDs e versão do catálogo. Preços usam item, variante, região e horário da fonte. Estoque, personagens, família e planos pessoais usam o WorkspaceStore e seu backup versionado. Não há cadastro paralelo de itens para os novos fluxos.

O esquema mantém compatibilidade com backups existentes. A nova família usa um registro opcional por região. Campos antigos de família nos personagens são preservados: valores diferentes não são fundidos automaticamente. Maestria não é convertida em nível de profissão.

## Limitações e pendências do MVP

- A lista salva registra as necessidades externas do cenário calculado. Mudanças em método, rendimento ou disponibilidade de produtos intermediários exigem abrir a árvore e salvar novamente; atualização de estoque dos materiais listados é automática. Ela não consome nem reserva os itens.
- A seleção de receita fica na URL; nós e quantidades do cenário ficam na memória da sessão, não sobrevivem a recarregar o navegador. Zoom/pan seguem preservados na troca de visualização; não são restaurados entre páginas.
- Os rendimentos ausentes no cliente continuam desconhecidos. Não estimamos probabilidades de produção, drops ou efeitos de maestria sem regras verificadas.
- Registros pessoais de cristais, artefatos e trajes não calculam bônus. Presets desta etapa abrangem equipamentos e cristais, não todo o estado de buffs ou ferramentas familiares.
- Pets e montarias têm registro manual; não existe identificação visual confiável desses dados nas capturas de inventário.
- O histórico de preços continua limitado às observações coletadas. A fonte não autoriza inferir volume diário ou ordens de compra/venda inexistentes na resposta.
- Importações não têm um benchmark novo com oito capturas reais fornecidas pelo usuário. A análise automática é conservadora; a revisão humana continua obrigatória antes da sincronização.
- Ferramentas históricas suspensas (enhancement, world, buffs, atividades etc.) não foram liberadas por um simples desligamento do guard. Precisam de datasets compatíveis e validação própria.
- O bundle inicial mantém dependências antigas de validação; otimização adicional de carregamento e virtualização de todas as listas permanece pendente. As listas novas têm paginação e o reconhecimento continua carregado sob demanda.

## Validação

Builds de frontend e API, lint dos arquivos alterados e testes dos fluxos de criação mínima, edição inválida, separação por região, sugestões ambíguas, taxas compartilhadas, cenários de receita e alocação de estoque. Validação visual e navegação no navegador local também fazem parte da entrega. Os resultados finais e eventuais restrições estão registrados na resposta da implementação.
