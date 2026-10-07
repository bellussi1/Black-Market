# Pipeline e procedência dos dados

## O que as fontes conseguem fornecer

| Família                                                                                   | Fonte candidata                                                                                                                                                                               | Atualização/frescor conhecido                                                                                                                                                                                                                       | Confiança e limite                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Referência do jogo: itens, receitas, localização, NPCs, nodes, mapa, zonas e conhecimento | [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor), lendo a instalação local do cliente                                                                               | Atualiza quando o jogo é atualizado e o extractor é executado de novo. O README atual descreve saídas JSON determinísticas e comparação de builds, mas não promete fingerprint do cliente embutido em `items.json`.                                 | Fonte local da referência estática; requer uma instalação legítima e compatibilidade com a versão/idioma/região do cliente. É ferramenta comunitária de engenharia reversa, não API da Pearl Abyss.                                                                              |
| Central Market: preço, estoque, total de trades, ordens, fila e histórico                 | Rotas do market da Pearl Abyss documentadas pela comunidade; [Arsha](https://www.postman.com/bdomarket/arsha-io-bdo-market-api/documentation/qpavrc8/bdo-market-api-v2) oferece wrapper/cache | Documentação do Arsha declara cache de 30 minutos e descarte conforme frequência de uso. Tem WebSocket que notifica expiração de entrada de cache; isso não garante que o valor novo já esteja carregado nem constitui streaming de cada transação. | A documentação do endpoint é comunitária, não uma API pública oficialmente documentada pela Pearl Abyss. A própria documentação do Arsha diz que os endpoints não foram documentados oficialmente pela PA e que o wrapper reduz chamadas diretas ao servidor. Sem SLA garantido. |
| Dados de usuário: presets, planos, storage e valores customizados                         | Usuário da aplicação                                                                                                                                                                          | Atualiza por edição/importação do próprio usuário.                                                                                                                                                                                                  | Estado pessoal, não fonte confiável do catálogo ou do preço global. O BDO Workshop declara guardar esses dados por conta ou no browser quando anônimo.                                                                                                                           |
| Dados comunitários: reports, leaderboards e estimativas                                   | Contribuições voluntárias em funcionalidades como DPS leaderboard ou Night Vendor                                                                                                             | Depende de submissões e revisão; sem cadência fixa descoberta.                                                                                                                                                                                      | Crowdsourced/estimado e separado dos dados extraídos do jogo ou do market.                                                                                                                                                                                                       |

### O que conseguimos confirmar sobre BDOLytics e BDO Workshop

Os dois sites mostram informações e cálculos de mercado, mas não encontramos documentação pública indicando qual provedor específico consultam, se fazem ingestão direta do market ou usam um wrapper, com que frequência atualizam, nem contrato público de API/exportação. Portanto, **não podemos afirmar que usem Arsha**. A interface do Workshop mostra valores de mercado que podem ser alterados e sua política confirma custom prices e servidor preferido; isso sugere uma integração de preço regional, mas não revela a origem automática. No BDOLytics, páginas públicas mostram market regional e séries de preço/volume/stock, mas o backend e o cronograma de coleta não estão publicamente descritos.

Também não localizamos documentação oficial pública da Pearl Abyss para essas rotas de market durante esta pesquisa. A documentação de Arsha as classifica como endpoints não oficialmente documentados pela Pearl Abyss e agradece à comunidade por descrevê-los. Isso não prova que não exista qualquer endpoint público em qualquer região; apenas define o limite do que conseguimos verificar. A documentação do wrapper é uma integração comunitária e deve ser avaliada quanto a termos, disponibilidade e limites antes de uso.

## Atualização de catálogo e receitas

O extractor lê dados do cliente instalado: arquivos PAZ, tabelas `.bss`/`.dbss`, XMLs de receitas e localização. Ele produz JSONs determinísticos e inclui itens, receitas, categorias de market, conhecimento, mundo, NPCs, zonas e outros conjuntos. Seu README é explícito: os dados de referência vêm do cliente, não há scraping de sites, e o extractor não faz chamadas de rede. Também explicita que **preço ao vivo não está no cliente** porque a economia do market é server-side. O formato dos JSONs é versionado no changelog; o README atual documenta `diff-outputs`, mas não um `gameFingerprint` embutido nos arquivos. [README](https://github.com/iDevelopThings/bdo-data-extractor) e [changelog](https://github.com/iDevelopThings/bdo-data-extractor/blob/main/CHANGELOG.md).

Essa extração não deve ser tratada como cópia integral de toda regra/dado do servidor. O próprio schema do extractor marca, por exemplo, que o yield variável por receita, os grupos de resultado de algumas receitas de manufatura e a tabela de peixes por fishing spot são server-side. Assim, cada entidade deve carregar uma indicação de completude/fonte quando algum campo depender de conhecimento comunitário, observação do jogo ou estimativa.

Fluxo implementado para itens, categorias de mercado e receitas:

1. Depois de um patch relevante, executar o extractor contra uma instalação legítima e escolher idioma/região. A instalação Steam SA foi extraída com `--lang pt --region sa`; o código lê o arquivo de localização presente na instalação, apesar da lista antiga no texto de ajuda. O procedimento reproduzível está em [extração local](local-extraction.md).
2. Guardar `items.json`, `recipes.json` e `marketcategories.json` numa pasta local fora do Git. O extractor atual documenta comparar diretórios de saída com `diff-outputs`, mas não assumir um `gameFingerprint` em cada arquivo.
3. Definir um rótulo imutável para `--version`, de preferência combinando versão do extractor e patch/fingerprint do cliente quando conhecidos. O importer calcula SHA-256 do conteúdo dos três JSONs e registra região, idioma, versão e hora da importação.
4. Validar formato, IDs únicos e referências de itens nas receitas/categorias antes de escrever. Referências inválidas interrompem a importação.
5. O comando grava em lotes dentro de uma transação, arquiva a versão ativa e ativa a nova no mesmo commit. Se falhar, a transação reverte e a versão anterior continua ativa.

Exemplo no PowerShell (substitua o caminho e o rótulo pela sua extração):

```powershell
pnpm --filter @bdo/api data:import -- --input "C:\bdo\extracted\data" --version "extractor-v0.1.9-patch-fingerprint" --region sa --locale en
```

É um comando manual executado na máquina que tem os arquivos extraídos; não atualiza o catálogo sozinho depois de um patch nem disponibiliza o dataset publicamente. O README do extractor informa licença não comercial para o código do projeto e não concede direitos sobre dados/assets do jogo; revisar licença e termos antes de integração ou redistribuição. Não commitar JSONs extraídos nem ícones no repositório.

Na primeira extração SA/pt foram gerados 74.216 itens, 212 categorias e 5.063 receitas. O importador normaliza o formato atual (graus numéricos e referências URN), mantém 730 itens sem nome pelo ID e deduplica as receitas para 4.406 registros distintos. As 569 relações de subproduto permanecem identificadas. O catálogo e seus ícones podem ser publicados localmente pelo perfil Docker `data`; preços continuam em uma fonte separada. Os outros 20 JSONs do build foram preservados localmente para integrações futuras.

## Atualização de preços de mercado

A documentação do Arsha descreve dados por região e idioma, endpoints de hot list, preço/estoque/trades, listagem por categoria, detalhe de item, ordens, fila e histórico. O wrapper declara cache por 30 minutos, que pode ser removido conforme frequência de uso. Seu WebSocket publica eventos quando uma entrada de cache expira, com ID, região e endpoint; o evento representa expiração, não um feed contínuo nem garantia de atualização imediata. [Documentação Arsha no Postman](https://www.postman.com/bdomarket/arsha-io-bdo-market-api/documentation/qpavrc8/bdo-market-api-v2) e [código do wrapper self-hosted](https://github.com/guy0090/api.arsha.io).

Para este projeto, caso a fonte seja aprovada e permaneça compatível:

- Criar adaptador `MarketProvider` isolado, sem acoplar o domínio ou UI ao formato específico do Arsha/PA.
- Coletar em job de backend, não a partir de cada navegador. Usar cache, controle de concorrência, timeout, limite de taxa e backoff para não multiplicar chamadas.
- Começar com itens usados por páginas/favoritos/cálculos e buscar lotes quando o provedor suportar, em vez de varrer todo o catálogo repetidamente.
- Separar região e `itemId + subId`/nível de enhancement; preço da base não representa automaticamente todos os níveis.
- Salvar resposta normalizada, `source`, `region`, `fetchedAt` e, quando presente, horário da transação informado pela fonte. Não substituir uma cotação válida por payload vazio/inválido.
- Expor a idade da cotação (`fresh`, `stale`, `unavailable`), preservar último valor válido e limitar tentativas durante indisponibilidade.
- Reter snapshots para os gráficos próprios e não tratar uma amostra periódica como histórico completo do jogo.
- Evitar chamar o dado de “tempo real”: o Arsha documenta cache de 30 minutos; coleta por polling, filas, upstream e falhas introduzem atraso.

## Atualização de fórmulas e dados crowdsourced

Regras de aprimoramento, crafting, mastery e cálculos de mercado precisam de versionamento independente do catálogo: registrar versão/região e data da regra, criar casos de referência e atualizar após patch validado. Valores de usuário (preços, inventário, gear, planos) pertencem a uma camada isolada, podendo substituir preço padrão apenas para aquela pessoa. Dados comunitários precisam de origem, data, método e rótulo explícito de estimativa; não devem sobrescrever referência do cliente ou cotação observada.

## BDO Workshop como referência

O Workshop serve para estudar fluxos de calculadora e presets. A política pública diz que usuários podem salvar gear/crystal presets, planos de progressão/crafting, projetos e resultados de enhancement, conteúdos de scans de storage/inventory e preços customizados; para uso anônimo, esses dados ficam no local storage do navegador e podem ser importados para uma conta ao entrar. Isso descreve os dados dos usuários do próprio Workshop e não disponibiliza um dump global para sincronização. [Política de privacidade](https://www.bdoworkshop.com/privacy-policy).

Não encontramos API de exportação pública do Workshop ou BDOLytics. Usar seus sites como referência de produto e validação visual, sem raspar endpoints internos nem tratar conteúdo de conta, fórmulas privadas ou uploads de usuários como dataset público. O inventário funcional está em [product-research.md](product-research.md).

## Integração Arsha implementada em 7 de outubro de 2026

A consulta pública por item foi verificada em SA e passou a estar disponível em GET /api/v1/market/items/:id?region=sa. É consulta sob demanda por ID, independente do extractor. O backend é o único cliente do Arsha; valida payload, usa timeout e cache de 30 minutos e limita concorrência/frequência. As regiões disponibilizadas são SA, NA e EU. Uma falha mantém a última resposta válida como stale sem renovar seu horário. Base price zero é tratado como indisponível. MARKET_PROVIDER_ENABLED=false desativa o adaptador.

O endpoint e a instância pública são descritos no [repositório do operador](https://github.com/guy0090/api.arsha.io). Isso não identifica o fornecedor usado pelo BDOLytics ou Workshop. FetchedAt é o horário da nossa consulta, não uma garantia de idade do dado dentro do cache upstream. Última venda traz seu horário separado quando disponível.

O usuário pode guardar cotações no navegador e criar histórico pessoal; não há cron, ingestão massiva ou histórico global em PostgreSQL nesta entrega. A futura coleta persistente precisa definir retenção e escopo antes de ser ativada.
