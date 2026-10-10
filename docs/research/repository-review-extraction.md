# Revisão de extração, catálogo e viewer — 10/10/2026

Esta revisão inspecionou cinco checkouts públicos fixados por commit, sem instalar dependências, executar código, abrir executáveis ou extrair arquivos do jogo. Metadados foram consultados na API GitHub; o inventário reproduzível está em [extraction-repositories.json](evidence/extraction-repositories.json). Checkout local: `data/research/2026-10-10/`, ignorado pelo Git. A leitura estática confirma o que o código implementa, não a correção de fórmulas no servidor nem funcionamento no patch SA atual.

## Decisão para o Black Market

| Repositório                             | Valor principal                                                                                 | Uso recomendado                                                                              | Limite/licença                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| iDevelopThings/bdo-data-extractor       | Pipeline PAZ → tabelas/XML/LOC → entidades relacionadas; já usamos a mesma revisão              | Continuar como ferramenta local de pesquisa; ampliar ingestão seletiva com proveniência      | Licença própria somente não comercial; não concede direitos sobre dados/assets PA                     |
| iDevelopThings/bdo-viewer               | Referência concreta de catálogo, árvores, comparação, conhecimento, fontes de obtenção          | Especificações e estudo arquitetural; implementação nossa adaptada a Angular/Nest/PostgreSQL | Mesma restrição não comercial; dependência Go/Wails e modelos do extractor; bugs e heurísticas abaixo |
| iSayZes/BDO-PAZ-Browser                 | Segundo parser independente, muitos formatos documentados e campos explicitamente desconhecidos | Instrumento de investigação de mudanças de layout e candidatos de decoders MIT               | MIT do software; não licencia arquivos PA; formato e handlers em evolução                             |
| emudevs/BDDatabase                      | Localizador ID/nome multilíngue simples                                                         | Referência histórica, sem importar catálogo antigo                                           | Código decompilado; sem licença geral identificada; último push 2020                                  |
| miyakejima/black-desert-client-research | Pesquisa de hooks/memória/gráficos, pouca relação com catálogo web                              | Registrar como fora do escopo do pipeline; não integrar runtime nem helpers                  | Sem licença geral identificada, inclui binários; offsets/claims não validados                         |

“Pegar pronto” do viewer não é uma decisão segura de engenharia: os trechos dependem de RPC Wails, stores Go, URNs e uma licença que proíbe uso comercial. A restrição é explicitada em [LICENSE do viewer](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/LICENSE.md#L5-L18) e [LICENSE do extractor](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/LICENSE.md#L5-L18). Monetização, anúncios e produto/serviço comercial precisam de autorização/licenciamento aplicável antes de incorporação desse código. Isso não é uma afirmação de que dados do jogo passam a ser livres por outra implementação.

## Snapshot e frescor

| Projeto / branch       | Commit inspecionado                        | Último push informado pela API (UTC) |
| ---------------------- | ------------------------------------------ | ------------------------------------ |
| extractor / main       | `5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2` | 2026-08-15 15:33:52                  |
| viewer / main          | `7f1643237d722a7414f5ec62e0b05aa3b623e23c` | 2026-08-15 15:34:54                  |
| client-research / main | `93fa2efa3756da2cb250f767c73b31ed7e577bf5` | 2026-07-29 15:32:01                  |
| BDDatabase / master    | `ebeee8dc6cdebc890108809c29d230d39ef000ec` | 2020-06-17 00:33:01                  |
| PAZ Browser / main     | `4726e588b31f38079629e4aee14dfecb0729df22` | 2026-10-09 20:21:56                  |

Push recente não comprova compatibilidade regional. O PAZ Browser menciona versões futuras nos exemplos de README (`v2026.10.12`, handler `2026.10.14`) no snapshot observado em 10/10: essas strings não foram usadas como datas reais de validação. Exemplos, badges e alegações de autor permanecem declarações até teste independente.

## bdo-data-extractor: o que há efetivamente

Arquitetura Go: `internal/paz` lê índice/arquivos e decodifica ICE/compressão; `internal/bss` fornece cursores/leitura binária; `internal/tables` conhece os layouts; `internal/build` relaciona entidades e localização; `src/model` define contrato; `src/models` stores/referências URN; `src/output` escreve JSON e compara builds; `pipeline` expõe entrada para CLI/embedding. Fontes são arquivos do cliente instalado, não uma cópia da base dos sites.

Evidências decisivas:

- [pipeline/pipeline.go:34-92](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/pipeline/pipeline.go#L34-L92): configuração/progresso globais, execuções precisam ser serializadas; idiomas são descobertos pela existência dos LOC, sem lista fixa. Não paralelizar dois builds embutidos no mesmo processo.
- [internal/build/recipes.go:18-51](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/internal/build/recipes.go#L18-L51): normalização de caixas imperiais, classificação de subprodutos, ordenação estável, identidade de receita por output + índice. O índice é posicional: não servir como identidade permanente entre patches; nossa chave normalizada é melhor para deduplicar fórmulas.
- [recipes.go:56-126](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/internal/build/recipes.go#L56-L126): XML localizado é prioritário; XML base complementa aquisição e receitas ausentes; nomes de NPCs coreanos são relacionados ao registro localizado. XML base frequentemente não contém quantidades.
- [internal/tables/recipexml.go:138-153](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/internal/tables/recipexml.go#L138-L153): `max(1, it.Count)` converte count ausente/zero em um e soma ingredientes. Isto perde evidência de desconhecimento. Nosso perfil de atualização preserva esse dado; não substituir pelo output upstream sem verificar.
- [src/model/item.go:706-724](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/src/model/item.go#L706-L724): receita relaciona output, tipo, estação, ingredientes e subproduto; não é promessa de rendimento garantido.
- [pipeline/manifest.go:18-52](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/pipeline/manifest.go#L18-L52): `RunAll` dispõe de `manifest.json` com gameFingerprint, appVersion, lang, region, extractedAt. Fingerprint vem de índice PAZ + ads_version, truncado a 16 hex; não de cada arquivo/LOC. A documentação anterior sobre ausência de fingerprint **em items.json** continua correta, mas existe manifesto no fluxo embedding. Nosso checksum completo dos JSON e hash do LOC permanecem necessários.
- [pipeline/worldmap.go:24-41](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/pipeline/worldmap.go#L24-L41): radar nativo a 100 unidades do jogo/pixel, tile de 128px, pirâmide de zoom; coordenadas de tile absolutas. [recorte:127-130](https://github.com/iDevelopThings/bdo-data-extractor/blob/5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2/pipeline/worldmap.go#L127-L130) é hardcoded e pode envelhecer com expansões. Mapa precisa projeção/versionamento; longitude/latitude WGS84 seriam uma interpretação errada.

Famílias que merecem contratos próprios: conhecimento/ecologia, NPC/spawns, mundo/regiões/nodes, zonas, mastery, Caphras, curvas de enhancement, classes/skills, cristais/sets, diário de aventura, pesca e manufacture. Elas já têm modelos/builders, mas o nosso importador aceita somente três JSONs. “Há decoder” não significa “regra completa disponível”: resultados de manufacture, rendimento variável e detalhes de pesca podem depender do servidor, de layouts desconhecidos ou de inferências.

Compatibilidade conhecida: nossa documentação registra falha do build completo após patch de 08/10 em experiência/buffs; o checkout aqui é exatamente o extractor já fixado em `docs/local-extraction.md`. Nenhuma atualização de branch ocorreu que, por si, corrigisse essas falhas. O perfil seletivo de receitas continua necessário.

## bdo-viewer: análise das quatro funcionalidades solicitadas

### Comprehensive crafting calculator

O backend implementa índice por output/input e separa subprodutos; árvore e BOM usam o mesmo resolvedor, evitando UI mostrar uma seleção e somatório usar outra. Só expande o caminho escolhido; envia alternativas como metadados e mapas de itens reduzidos, sem duplicar curvas pesadas. [resolver.go:87-146](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/recipe/resolver.go#L87-L146), [resolvetree.go:12-33](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/recipe/resolvetree.go#L12-L33).

Algoritmo: DFS com stack para ciclo e maxDepth padrão 10; escolhe receita e fabricar/comprar; calcula `ceil(necessidade/yield)`; acumula folhas por URN; BOM de múltiplos alvos soma requisitos e ordena deterministicamente. [craftplan.go:51-166](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/recipe/craftplan.go#L51-L166). Não há alocação global de sobras entre alvos: cada alvo arredonda operações separadamente antes da soma. Um planejamento conjunto pode economizar operações, mas não se deve confundir essa BOM agregada com otimização inteira global.

O custo mínimo usa memoização por item por consulta, marca `computing` para ciclo, compara compra e produção, ignora recuperação de equipamento e certos HEAT/GRIND unitários; custos desconhecidos usam sentinel e soma/multiplicação saturadas. Preço NPC só é usado se existe vendedor identificado, evitando interpretar preço nominal como compra real. [cost.go:28-136](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/recipe/cost.go#L28-L136). As exclusões de recuperação são **heurísticas**, não autoridade de quais receitas são válidas. Stock de mercado, imposto, oportunidade do inventário, tempo, orçamento e disponibilidade de vendedores não entram nesse custo mínimo.

Limitações que impedem copiar a matemática:

1. [source_mastery.go:69-99](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/catalog/source_mastery.go#L69-L99) retorna `1 + basicMaxDropRate`/procRate como yield; o próprio comentário admite que rendimento base por receita é server-side. Uma taxa de proc máximo não determina, sozinha, média real por operação. Resultado é estimativa parcial, não fórmula confirmada.
2. `max(opt.Count,1)` e fallback yield 1 inventam um valor para campos ausentes. Nosso projeto conserva `null`, solicita estimativa/calibração ou usa suplemento oficial específico.
3. [resolvetree.go:315-376](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/recipe/resolvetree.go#L315-L376) agrupa por método/estação/número de slots e guarda tuplas de variantes reais. Porém [clampSelection:396-410](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/recipe/resolvetree.go#L396-L410) apenas limita índices por slot; não valida que a tupla está em `Variants`. Seleção recebida pode formar combinação inexistente. Requisito nosso: validar composição concreta, inclusive batch e proporção.
4. Custo por unidade ignora arredondamento do lote e sobras, então melhor receita por unidade pode não ser melhor para a quantidade pedida. Ciclos interrompidos continuam como folhas na BOM, sem equivaler a cadeia resolvida.

O projeto atual já contém `packages/calculators/src/production-planner.ts`: rendimento explícito, estoque/reservas, escolha buy/produce/stock, quote age, market stock, tempo/peso/orçamento, impostos e dinheiro BigInt; somente planos completos são ranqueados. Nosso ganho prioritário é **BOM multiobjetivo e DTO compacto por árvore**, preservando essas garantias, não substituir o planner por cost.go.

### Item catalog/data

`internal/catalog/source_items.go` carrega `items.json`, enhancements e categorias; stores pesados são `json:"-"`, detalhes ficam sob demanda; cria relações reversas item→variants, NPC→itens e contagem por categoria. [source_items.go:41-76](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/catalog/source_items.go#L41-L76). Esta separação deve orientar DTOs do nosso backend: listagem leve e detalhe completo versionado.

Busca não é um motor sofisticado nem uma nova fonte: `FilterAndRank` filtra a coleção em memória, tokeniza, pontua nome e desempata por comprimento; sort explícito prevalece. [search.go:10-69](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/catalog/search.go#L10-L69). Para serviço multiusuário, manter índices PostgreSQL/paginação/cancelamento e validar busca pt/acento/sinônimos, evitando carregar 74k itens em todo navegador.

Nosso `apps/api/src/catalog/extractor-dataset.ts` guarda campos adicionais em `sourceData` mas só normaliza campos básicos dos itens e três arquivos. Possíveis novas APIs: efeitos com chave estável/unidade; níveis de enhancement/Caphras; item-set; variantOf; vínculos NPC/nodes/conhecimento. Requer validar cada shape com Zod e vínculos por versão. Não expor `sourceData` bruto e pesado para cada card.

### Compare

Estado persistido em Valtio por URN; colunas carregam detalhes e stats Go, com sliders independentes de enhancement e Caphras. Tabela une títulos de stats e destaca máximo do valor numérico bruto, sem comparar strings formatadas. [state/compare.ts:13-25](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/frontend/src/state/compare.ts#L13-L25), [compare-items-panel.tsx:136-179](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/frontend/src/components/compare/compare-items-panel.tsx#L136-L179).

Achados de leitura: `results[urn].stats` é acessado antes de necessariamente existir resultado assíncrono (linhas 147 e 246); há risco de crash ao adicionar item, não reproduzido nesta auditoria. Stats são relacionados por **título localizado**, sujeito a colisão/mudança de idioma; máximo não é sempre melhor (peso/cooldown/custo). README descreve nível compartilhado, mas implementação oferece níveis por coluna. Nossa versão deveria suportar comparar no mesmo nível opcionalmente e incluir `statId`, unidade, direção da preferência, estado de loading/missing/error e região/versão da fonte. É funcionalidade viável com os efeitos corretos extraídos, não depende de copiar React/Wails.

### Knowledge / Ecology

`knowledge.json` contém themes e entries; índices por parent/theme/item/character, roots e subtree counts; breadcrumb, navegação recursiva e relações reversas para itens/NPCs. [source_knowledge.go:22-43](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/catalog/source_knowledge.go#L22-L43), [load:68-165](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/catalog/source_knowledge.go#L68-L165).

Filtra roots sem filhos por decisão de apresentação; mantém entries em All Knowledge. Essa é heurística sobre conteúdo obsoleto, não autorização para apagar registros. `countSubtree`/breadcrumb não têm proteção explícita contra ciclo; nosso importador deve validar floresta e detectar relações quebradas. Estado pessoal de conhecimento adquirido não está garantido pelo catálogo: a base indica que uma entrada existe, não que usuário a adquiriu. Separar dados estáticos de checklist por conta.

### Preços e arquitetura de aplicação

[market.go:159-216](https://github.com/iDevelopThings/bdo-viewer/blob/7f1643237d722a7414f5ec62e0b05aa3b623e23c/internal/market/market.go#L159-L216) chama `https://apiv2.bdolytics.com/en/{region}/market/central-market-data`, normaliza price/trades/stock por itemID e guarda em memória. Isso confirma que **o viewer usa um endpoint do domínio BDOLytics**; não revela de onde BDOLytics obtém seus preços, cadence/SLA, permissão para ingestão massiva ou contrato público dessa rota. Não migrar nosso MarketProvider Arsha por descoberta de URL interna. Nosso preço mantém subId/enhancement e freshness, que esse snapshot por ID não representa integralmente.

O viewer inclui setup/reextração, auto-update GitHub, asset handlers, gear engine, configuração pessoal e painéis dockáveis. São necessidades desktop; no nosso serviço web o navegador não lê PAZ local diretamente nem recebe executáveis. Extrair em ambiente controlado e publicar snapshot validado continua sendo arquitetura adequada.

## BDO-PAZ-Browser: melhor candidato para investigação de parsers

Python 3.14 + pywebview/aiohttp/numpy, parsers/handlers plugáveis, cache/paginação/CSV, arquivos companion e fallback de localização. O software é [MIT](https://github.com/iSayZes/BDO-PAZ-Browser/blob/4726e588b31f38079629e4aee14dfecb0729df22/LICENSE#L1-L21). A licença não concede direitos adicionais sobre conteúdo do jogo.

- [paz/bdo_paz_reader.py:13-92](https://github.com/iSayZes/BDO-PAZ-Browser/blob/4726e588b31f38079629e4aee14dfecb0729df22/PAZ-Parser/paz/bdo_paz_reader.py#L13-L92): struct de header/tabela, leitura em lotes de 500 arquivos e decriptação vetorizada de blocos de caminho. É um desenho de performance a avaliar com benchmark local; não comprova ser mais rápido que Go.
- [handlers/\_bss/buffsimply/parser.py:1-65](https://github.com/iSayZes/BDO-PAZ-Browser/blob/4726e588b31f38079629e4aee14dfecb0729df22/PAZ-Parser/handlers/_bss/buffsimply/parser.py#L1-L65): row 32 bytes, buff ID uint32 e sanity checks; preserva campos `unknown_*`. Layout que não fecha com string table falha em vez de retornar números plausíveis errados.
- [docs/file-formats/buffsimply_bss.md:33-65](https://github.com/iSayZes/BDO-PAZ-Browser/blob/4726e588b31f38079629e4aee14dfecb0729df22/docs/file-formats/buffsimply_bss.md#L33-L65): autor registra buff ID antes uint16 e agora uint32 no cliente 3464, mudança concreta candidata para investigar a falha recente do extractor. Número de build é relato da fonte, não identificação verificada do nosso SA. `buffsimply` não contém duração/efeito: precisa `buff.dbss`/LOC companions.
- `docs/file-formats/` e `handlers/_dbss/` expandem investigação além dos JSONs atuais: quest, skill, plant/worker, buffs e muito mais. A quantidade de formatos no README é declaração do autor; inventário não equivale a campos totalmente entendidos. Usar Open Questions e In-Game Checks para separar fatos estruturais de semântica inferida.
- O app baixa handler packs Python e oferece updates de GitHub. Neste estudo nenhum foi instalado; futura execução para pesquisa deve fixar commit e desabilitar updates automáticos para reproduzir exatamente parser e outputs.

Candidato concreto de curto prazo: confrontar offsets de `buffsimply` e `buff.dbss` com a instalação atual somente em leitura; confirmar contagem, string table, IDs e exemplos conhecidos; escrever teste de contrato do nosso parser com fixture mínima sintética. Só então avaliar um parser novo. Não obter o output de outro cliente e atribuir região SA.

## BDDatabase: catálogo legado, não uma API de dados atual

C# WinForms e assemblies comprimidos Costura; `Form1.cs` identifica-se como decompilado nas linhas 1-5. Troca idioma carregando strings Resources `items_en/items_pt/...`; busca por ID ou substring com timer de 2 segundos e laço linear; download síncrono de ícone substitui bdocodex.com por bddatabase.net. [Form1.cs:51-116](https://github.com/emudevs/BDDatabase/blob/ebeee8dc6cdebc890108809c29d230d39ef000ec/Form1.cs#L51-L116), [busca:153-203](https://github.com/emudevs/BDDatabase/blob/ebeee8dc6cdebc890108809c29d230d39ef000ec/Form1.cs#L153-L203).

README cita “database API” mas esse caminho de execução não demonstra um pipeline atual de atualização: recursos locais carregados e ícones remotos. Não usar como fonte de fórmulas/receitas ou canonical item names em 2026. Sem licença raiz identificada; licença de Newtonsoft/Costura não licencia código decompilado ou dataset. Utilidade marginal: caso histórico de lookup rápido/copiar ID, funcionalidade que nosso catálogo já cobre melhor.

## black-desert-client-research: escopo distinto

README descreve FOV, supersampling, chams/ESP e atlas de offsets. Código real em [FOV_Tool.pyw:327-359](https://github.com/miyakejima/black-desert-client-research/blob/93fa2efa3756da2cb250f767c73b31ed7e577bf5/FOV_Tool.pyw#L327-L359) e [449-459](https://github.com/miyakejima/black-desert-client-research/blob/93fa2efa3756da2cb250f767c73b31ed7e577bf5/FOV_Tool.pyw#L449-L459) acessa/escreve memória e cria thread remota, além de helper executável/DLLs e hooks C++. Não equivale ao fluxo estático somente leitura do extractor, mesmo se README disser que não modifica pacotes server-side.

O badge promete 3.054 Lua files, mas inventário versionado local identificou **3 arquivos com extensão .lua**, não 3.054 fontes Lua legíveis no checkout. Não registrar badge como dataset disponível. São possíveis referências de UI do cliente e nomes de funções, mas não há benefício demonstrado para importação de itens/receitas que compense a falta de licença/procedência e dependência de runtime. Arquivos/binários não foram executados; não houve busca de bypass, implantação de ESP ou integração com jogo.

## Comparação com o estado atual e sequência recomendada

| Candidato         | O que já existe nosso                                                        | Trabalho adicional útil                                                  | Critério para aceitar                                                          |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Catálogo rico     | Importador três JSONs, sourceData, checksum, snapshots region/locale, ícones | DTOs de effects/enhancement/item sets, detalhe sob demanda               | Shape validado, IDs íntegros, fonte/patch visíveis                             |
| Multi-alvo + BOM  | Árvore, estoque, fórmulas concretas, planner com restrições                  | Carrinho de alvos, reservas/sobras compartilhadas                        | Não duplicar estoque; operações inteiras; unknown bloqueia estimativa completa |
| Comparação        | Itens e referências do cliente                                               | Estatísticas por ID/unidade, loading/error, nível e Caphras selecionados | Valores de referência testados; direção por stat; versões compatíveis          |
| Conhecimento      | JSON local ainda não integrado                                               | Themes/cards/links, breadcrumbs, filtros, checklist pessoal              | Parent graph válido; catálogo separado de progresso usuário                    |
| Mapa              | Mundo/nodes/JSON locais; roteamento em calculadoras                          | CRS próprio, tiles + pontos/node edges, filtros                          | Alinhamento validado com pontos conhecidos; assets/uso autorizados             |
| Parser atualizado | Extractor fixado; perfil recipes protege patch                               | Investigar PAZ Browser MIT para layout buffs/experiência                 | Decodificação consistente no SA atual e fixture independente                   |
| Novos preços      | MarketProvider Arsha com região/subId/freshness                              | Manter adaptador; registrar viewer endpoint só como pista                | Contrato/licença/limites públicos antes de novo provider                       |

Não há necessidade de importar o aplicativo desktop inteiro. Primeiro corrigir/comprovar decoders após patch; depois normalizar dados disponíveis em contratos versionados; em seguida adicionar conhecimento e comparação, que trazem valor sem inventar rendimento. BOM multi-alvo precisa especificação própria de estoque/sobra compartilhados.

## Cobertura e limites da varredura

Inventariados todos os paths Git dos cinco repos e manifests/licenças/README; examinados os entrypoints, parsers e domínio prioritário citados acima. No viewer: leitura detalhada dos quatro arquivos de resolver/plano/custo, source_items, source_mastery, source_knowledge, search, compare state/panel e market; mapeamento de componentes calc/details e demais serviços. No extractor: pipeline/manifest/worldmap, recipes/XML parser, modelos e organização build/tables/output. No PAZ Browser: parser PAZ, parser/docs buffsimply, estrutura handlers/API/cache/update. No BDDatabase: Form1, Item e estrutura Resources/Costura. No client-research: README, FOV e inventário de módulos/binários/third_party/Lua.

Esta é varredura geral com aprofundamento em caminhos relevantes, **não auditoria linha por linha de todos os arquivos**, nem revisão de supply chain de todas as dependências. Testes encontrados foram catalogados, não executados. Bugs apontados são achados estáticos; nenhuma compatibilidade runtime foi declarada. Repetir revisão ao mudar commit ou patch e manter este snapshot como evidência histórica.
