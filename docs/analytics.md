# Analytics de produto

## Análise do produto e plano de eventos

O Black Market é uma aplicação Angular com páginas públicas e ferramentas de catálogo, busca de itens, mercado, criação de receitas, aprimoramento, builds/equipamentos, profissões, armazém, leitura de prints, planos, recomendações, conta/sincronização e império de nodes/trabalhadores. O valor está em concluir tarefas úteis (encontrar um item, avaliar preço/receita, registrar uma sessão e transformar uma leitura em armazém), além de retornar para usar os dados locais.

Antes desta revisão, já existiam os eventos tipados `page_viewed`, `journey_started`, `journey_completed` e `journey_failed`, além de emissão em mercado, leitor de prints, sincronização de conta e salvamento de receitas, personagens, planos, importação do armazém e império de workers. As lacunas observadas eram busca/detalhe no catálogo, funil CSV, sucesso/falha explícitos do OCR e salvamento de sessão de lifeskill.

Plano aplicado: medir navegação por família de funcionalidade; medir somente inícios, conclusões, falhas e resultado agregado de fluxos escolhidos; e permitir funis de passos sem capturar texto ou conteúdo que o jogador fornece. Para abandono, usar a queda entre etapas do funil no PostHog — não gerar um evento de “abandono” no cliente nem gravar sessão. Eventos são agregados por navegador consentido e algumas análises de funil representam usuários que realizaram cada passo, não uma correlação exata de cada tentativa repetida.

## Interface de consentimento

Em 18/10/2026, o painel foi reorganizado para separar o armazenamento necessário, sempre ativo, das estatísticas opcionais. A pessoa vê a escolha atual e a finalidade resumida; pode permitir, recusar ou personalizar quando o serviço está disponível. Depois de permitir, encontra uma ação direta para desativar. A indisponibilidade do serviço aparece separada do consentimento salvo: uma escolha anterior não é descrita como analytics ativo e não gera eventos enquanto não houver configuração válida.

Esta mudança alterou somente a interface e a extração de mensagens. Não adicionou SDK, integração, chamada, categoria ou tipo de cookie. A configuração externa continua desativada, e as regras existentes de produção, consentimento, cancelamento de requests e exclusão do identificador local não foram alteradas. A consulta competitiva e seus limites estão em `docs/research/privacy-controls-ui-review-2026-10-18.md`.

### Esquema tipado

| Evento               | Propriedades permitidas                                  | Uso                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page_viewed`        | `feature`                                                | Navegação inicial e mudanças de rota, agrupadas por família. Não enviamos pathname, query string, URL dinâmica ou ID de item. Repetições consecutivas da mesma família são suprimidas. |
| `item_detail_opened` | `feature=catalog`                                        | Mede se a busca leva jogadores a consultar fichas, sem informar qual item.                                                                                                             |
| `journey_started`    | `feature`, `action`                                      | Início de busca no catálogo/mercado, leitura de print, importação CSV, registro de sessão e envio de cópia à conta.                                                                    |
| `journey_completed`  | `feature`, `action`, `status=success`, `result` opcional | Conclusão de tarefas. `result` só aceita `matches` ou `no_matches` nas buscas/leitura.                                                                                                 |
| `journey_failed`     | `feature`, `action`, `status=failed`                     | Falha de uma tarefa. Não envia texto de erro, parâmetros, IDs nem conteúdo submetido.                                                                                                  |

Famílias (`feature`) são um enum revisado: home, catalog, recipes, reference, market, crafting, enhancement, gear, lifeskills, storage, rng, buffs, settings, profile, plans, account, scans, world, recommendations, legal e other. Ações são `search`, `save`, `import`, `calculate`, `sync` e `read_print`.

### Eventos emitidos nos fluxos atuais

| Fluxo                                                  | Etapas medidas                                                                                                                        | Propriedades adicionais                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Catálogo: busca → detalhe                              | `journey_started/search` → `journey_completed/search` ou `journey_failed/search`; `item_detail_opened`                                | Resultado `matches`/`no_matches`. Texto pesquisado e ID/nome do item não são enviados.                                 |
| Mercado                                                | `journey_started/search` → `journey_completed/search` ou `journey_failed/search`                                                      | Nenhum ID de item, região em URL, preço, estoque ou resultado financeiro.                                              |
| CSV do armazém                                         | `journey_started/import` → `journey_completed/import` ou `journey_failed/import`                                                      | Não envia nome de arquivo, linhas, local, ID, preço ou quantidade. Abandonar a revisão deixa o funil sem conclusão.    |
| Leitura de print                                       | `journey_started/read_print` → `journey_completed/read_print` ou `journey_failed/read_print` → `journey_completed/import` se aplicado | Resultado agregado `matches`/`no_matches`; imagem, recorte, candidato, número e itens reconhecidos nunca são enviados. |
| Salvar sessão de profissão                             | `journey_started/save` → `journey_completed/save` ou `journey_failed/save`                                                            | Sem nome de sessão, atividade, itens, tempo, energia, custo, renda ou prata/hora.                                      |
| Conta/sincronização                                    | `journey_started/sync` → `journey_completed/sync` ou `journey_failed/sync`                                                            | Sem UUID de conta, email, token, versão do snapshot ou dados sincronizados.                                            |
| Salvar personagem, plano, receita e império de workers | `journey_completed/save`                                                                                                              | A adoção da funcionalidade é medida sem enviar nome, valores ou configurações.                                         |

Calculadoras reativas não geram evento a cada tecla, mudança de campo ou recálculo. A família de rota informa adoção; somente ações explícitas e conclusões de fluxo acima são emitidas. Não medimos ainda cada filtro, comparação de equipamento, favorito, subferramenta ou cálculo individual. Adicionar novos eventos exige uma pergunta de produto clara e uma propriedade permitida; não transmitir texto livre nem acrescentar um stream indiscriminado.

## Privacidade e operação

- O `AnalyticsService` central tipa eventos/feature/action, valida a lista de nomes e reconstrói propriedades a partir de uma allowlist. Chaves extras, inclusive query, itemId, stock, silver, email ou token, são descartadas.
- PostHog usa HTTP Capture diretamente; não há SDK JavaScript, cookie PostHog, autocapture, replay ou identificação de conta. Um UUID aleatório local só é criado após escolha positiva e fica no cookie próprio `black-market-analytics-id` por até 180 dias.
- A captura só começa em produção, quando `/api/v1/analytics/config` retorna configuração ativa e o usuário autorizou analytics. `.env.example` mantém `ANALYTICS_ENABLED=false`, chave vazia e host regional editável. Desenvolvimento, testes, configuração incompleta ou erro de configuração não enviam eventos.
- Não chamamos `identify()` e não associamos UID Firebase ao `distinct_id`. Os relatórios contam navegadores consentidos, não todos os visitantes nem pessoas únicas. Rejeitar e revogar param a captura; revogar cancela requisições pendentes e apaga o UUID local. Eventos já recebidos precisam ser tratados no painel do prestador se houver pedido de exclusão.
- A propriedade `$ip: null` pede ao PostHog para não anexar o IP ao evento; conexão/rede e hosting ainda podem processar endereço IP e metadados. A base legal, região do projeto, contrato e transferência internacional precisam de validação.
- Não enviar telemetria operacional de erro ao PostHog. O endpoint próprio de erros é finalidade distinta, com limites e payload minimizado; rever sua base legal separadamente.
- O limite atual é 100 eventos por instância da aplicação aberta. Ele reduz loops acidentais naquela instância, mas reinicia ao recarregar e não é um teto global nem proteção contra falsificação.

## Métricas e dashboards nativos do PostHog

Usar somente Product Analytics e salvar as insights/dashboards nativas do PostHog. A interface da aplicação não ganha dashboard de analytics.

1. **Ativos:** Trends, evento `page_viewed`, medida `Unique users`/`Daily active users`, séries diária, semanal e mensal. Renomear no painel para DAU/WAU/MAU de navegadores com consentimento.
2. **Retorno:** Retention, início e retorno `page_viewed`, por coorte semanal; revisar D7/D30 depois de haver 7/30 dias de dados. Preferir retorno ao app (feature ampla) e, em análise separada, retorno à família funcional.
3. **Adoção/perda de uso:** Trends com `page_viewed`, usuários únicos por `feature`, comparação com período anterior e série semanal nas últimas 4–8 semanas. Filtrar eventos `legal` para análise de ferramentas.
4. **Fluxos concluídos e mais comuns:** Trends para `journey_completed`, dividido por `feature` e `action`; User Paths para `page_viewed` e eventos de jornada para explorar transições. Paths mostra as transições mais frequentes; valide uma hipótese com funnel, porque não é um censo de todos os caminhos.
5. **Abandono aproximado:** Funnels por sequência (abaixo), janela inicial de 30 minutos. Ler conversão por etapa e tempo até conclusão. Funnels identificam usuários que avançam entre etapas; com eventos repetidos pelo mesmo usuário, não provam qual tentativa específica foi abandonada.
6. **Evolução temporal:** Trends de `journey_completed` e usuários únicos por feature, semanal/mensal, comparando o período anterior. Revisar sazonalidade, campanhas e mudanças de dados antes de atribuir causalidade.
7. **Eventos frequentes:** Trends de contagem total por nome e, separadamente, usuários únicos. Contagem não equivale a usuários.

Funis iniciais:

- Catálogo: `journey_started` (feature=catalog, action=search) → `journey_completed` (feature=catalog, action=search). Usar `journey_failed` como uma etapa alternativa/diagnóstico e `result=no_matches` para procurar problema de cobertura.
- Mercado: `journey_started` (market/search) → `journey_completed` (market/search); observar falhas como série separada.
- Armazém CSV: `journey_started` (storage/import) → `journey_completed` (storage/import).
- Prints: `journey_started` (scans/read_print) → `journey_completed` (scans/read_print) → `journey_completed` (scans/import). Comparar também falhas de leitura e resultado `no_matches`.
- Sessões de profissão: `journey_started` (lifeskills/save) → `journey_completed` (lifeskills/save).
- Cópia da conta: `journey_started` (account/sync) → `journey_completed` (account/sync); não usar IDs de conta ou conteúdo salvo.

Um volume baixo de consentimentos pode distorcer DAU e retenção. Não extrapolar a toda a audiência nem usar diferenças pequenas para decisão. Combinar dados agregados com conversas e testes de tarefa com jogadores.

## Configuração externa (ainda não ativada)

1. Criar um projeto PostHog Cloud e escolher região após revisar contrato e transferência internacional.
2. Guardar somente a Project API key pública (`phc_...`) em variável privada de deploy. Nunca usar Personal API key.
3. Definir `ANALYTICS_ENABLED=true`, `POSTHOG_PUBLIC_KEY=<project-key>` e `POSTHOG_HOST=https://eu.i.posthog.com` ou `https://us.i.posthog.com` na API; recriar API e publicar frontend em produção.
4. Testar navegador limpo: recusar → nenhum request de Capture; aceitar → eventos esperados; revogar → nenhum request novo e cancelamento de pendente. Confirmar que valores observáveis nas páginas não aparecem no painel.
5. Salvar insights e funnels descritos acima no PostHog. Não instalar autocapture, session replay, GA4, GTM, Clarity ou outro produto.
6. Não considerar analytics configurado antes de observar esses eventos no painel e validar a política/região.

## Cloudflare Web Analytics

Não está ligado ao código nem ao domínio publicado verificado nesta auditoria. O painel de Cloudflare também não foi verificado. A ferramenta é gratuita segundo o fornecedor, útil para Real User Monitoring/Core Web Vitals e usa um beacon JavaScript; não responde às perguntas de adoção de ferramentas e funis do produto. Considerá-la apenas se Black Market passar a usar Cloudflare e houver necessidade real de métricas de desempenho. Evitar comparar visitantes/pageviews de Cloudflare com os usuários consentidos de PostHog como se fossem a mesma base. Conferir scripts no domínio antes de ativar qualquer integração externa.

Referências oficiais verificadas em 08/10/2026: [PostHog Pricing](https://posthog.com/pricing), [Trends](https://posthog.com/docs/product-analytics/trends/overview), [Funnels](https://posthog.com/docs/product-analytics/funnels), [Retention](https://posthog.com/docs/product-analytics/retention), [Paths](https://posthog.com/docs/product-analytics/paths), [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/) e [origem dos dados do beacon](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/).

## Limites e custos atuais do PostHog

A página oficial consultada informa Product Analytics com 1 milhão de eventos gratuitos por mês, um projeto e retenção de um ano no plano Free; sem cartão, excedentes no Free são descartados e a franquia mensal é renovada. Limites e condições podem mudar: confirmar na conta antes de configurar. Se o responsável adicionar pagamento ou migrar para pay-as-you-go, definir um billing limit por produto e alertas antes de liberar faturamento. Não habilitar replay ou demais produtos.

Revisar volume quando a utilização chegar a 70% da franquia; deixar `ANALYTICS_ENABLED=false` interrompe novas emissões após o deploy. A chave do projeto pode ser pública para coleta, mas o endpoint é público e pode receber eventos falsificados; não usar analytics para segurança, saldo, autorização ou cobrança. Sem serviço de analytics ativo, custo recorrente do PostHog/Cloudflare Web Analytics é zero.

Testes cobrem consentimento, bloqueio de emissão em desenvolvimento, allowlist de propriedades, identificador anônimo, privacidade em buscas/importações/leitura de prints, deduplicação de navegação e revogação imediata. Configuração de conta, região, teto de cobrança, coleta no domínio e revisão jurídica dependem de validação humana/externa.
