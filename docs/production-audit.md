# Auditoria de preparação para produção — Black Market

Data: 08/10/2026. MVP Angular 22 + Nest 12 + Drizzle + PostgreSQL 17; Tailwind/SCSS, Vitest e ESLint. Instância única, Docker Compose, Nginx e entrada Cloudflare planejada. Não há Redis, Kubernetes, microsserviços ou serviços pagos adicionados. O diagnóstico descreve o código atual após as correções; não há medições históricas confiáveis para inventar um antes/depois.

**Conclusão: código preparado e validado localmente; lançamento público ainda depende dos itens P0 externos abaixo. Não declarar produção pronta.**

> A seção [Revalidação final — 08/10/2026](#revalidação-final--08102026), no fim deste documento, prevalece sobre estados, contagens, evidências e recomendações de custos de seções históricas. Infraestrutura pública não foi considerada validada.

## Auditoria por categoria

| Categoria                        | Implementado                                                                                                                                                  | Falta/correção necessária                                                                                            | Prioridade e solução                                                                              | Recorrência / dependências                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Frontend, backend, banco         | Rotas lazy, SSR público, formulários validados, dinheiro BigInt, catálogo versionado real, PostgreSQL próprio                                                 | Inglês ausente, 730 itens sem nome localizado; receitas incompletas na fonte; mercado bloqueado não validado ao vivo | P0 mostrar lacunas; P1 revisar dados após patch e interpretar coleções antes de usar fórmulas     | Frameworks grátis; CPU/disco do host. Depende de cliente do jogo/extractor                  |
| Auth, autorização, segurança     | Supabase opcional, dono derivado de token confirmado, versão de workspace, CORS, CSP/HSTS, headers, rate limits, filtros seguros                              | Configurar provedor/retornos; testar duas contas; CSP real com OCR/login; sessão JS com risco XSS residual           | P0 ativar e validar somente após identidade/HTTPS; P1 sessão opaca se necessidade justificar      | Free Auth sob cotas; SMTP público opcional adicional. Depende de domínio e provedor         |
| Infraestrutura/hospedagem/deploy | Compose produção separado, volumes exclusivos, banco/API privados, web/API sem root e filesystem readonly, gateway loopback                                   | Host/Tunnel/DNS/TLS/firewall ainda não configurados; CI é verificação, não deploy automático                         | P0 um host, uma imagem versionada, publicação manual inicialmente                                 | Host e domínio pagos; Cloudflare Free sob limites. Depende de backup e smoke checks         |
| Logs, erros, monitoramento       | JSON Nest, Request ID, WARN/ERROR, filtro global, telemetria mínima, health/readiness, rotação Docker                                                         | Monitores e e-mails não cadastrados/validados; investigação sem stack detalhada                                      | P0 uptime gratuito + runbook; P1 observar se Sentry é realmente necessário                        | Better Stack Free, sem SDK de logs. Depende de domínio público e operador                   |
| Cookies/privacidade/LGPD         | Inventário, banner apenas quando opção configurada, rejeitar/aceitar/customizar/revogar, armazenamento mínimo, sessão por aba                                 | Revisão jurídica, identidade legal completa, transferências e prazos finais; processo de direitos                    | P0 validar documentos antes de abrir contas/analytics                                             | Código grátis; revisão humana sem custo fixo estimado. Depende de prestadores e responsável |
| Analytics                        | Serviço tipado, eventos relevantes, sem autocapture/replay/PII, consentimento, dev/test OFF                                                                   | Chave PostHog e validação no painel; dashboards nativos e limites externos                                           | P1 ativar após consentimento/documentos; manter apenas PostHog                                    | Free 1M eventos/mês. Depende de domínio, privacidade e conta do mantenedor                  |
| SEO, performance, acessibilidade | SSR público e de ferramentas, titles/descrições/canonical/OG/JSON-LD, sitemap SA/pt, robots, noindex pessoal/404, cache de assets, lazy OCR/Auth, foco/labels | Lighthouse/CWV, compressão/CDN no host, teclado/leitor de tela/mobile e inspeção visual; sem medições públicas       | P0 verificar domínio e políticas de cache antes do lançamento; P1 medir e corrigir evidência real | Código grátis; depende do domínio HTTPS, backend e host/CDN                                 |
| Legal/footer/suporte             | Footer com ano automático, 4 rotas estáticas, alias Bellussi e e-mail informado, preferências pelo footer                                                     | Revisão jurídica e identificação completa; definir rotina de suporte/direitos                                        | P0 revisar conteúdo e titularidade/licença dos dados                                              | Código grátis; parecer humano separado. Depende de responsável                              |
| Testes/backups/recuperação       | Vitest, build/typecheck/lint, migrações, dump+SHA256, retenção opt-in, restore isolado executado                                                              | Agendamento diário, destino externo protegido, simular rollback de release pública                                   | P0 backup offsite e ensaio; P1 repetição mensal                                                   | Local grátis; armazenamento externo conforme volume. Depende de host/disco/credenciais      |

## Checklist final

PASSOU significa evidência local especificada; NÃO VERIFICADO significa credencial, ambiente externo ou revisão humana ausente. Não equivale a certificação de segurança ou conformidade.

| #   | Controle                         | Estado         | Evidência / limite                                                                                          |
| --- | -------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Compilação web/backend           | PASSOU         | pnpm build; servidor Angular SSR e Nest compilados                                                          |
| 2   | Testes automatizados             | PASSOU         | 149 testes Vitest; `pnpm check`, SSR, layout legal e migrações passaram                                     |
| 3   | Segurança fundamental            | PASSOU         | Testes de limite/origem/filtro/chave pública/CSP; não é pentest                                             |
| 4   | Autenticação/autorização         | NÃO VERIFICADO | Fronteira testada com mocks; fluxo real e isolamento entre duas contas pendentes                            |
| 5   | Cookies e privacidade            | PASSOU         | Testes rejeição/aceitação/persistência/expiração/revogação/cancelamento; revisão legal pendente             |
| 6   | Footer/rotas legais              | PASSOU         | Render de 4 documentos, links, contato; revisão jurídica não realizada                                      |
| 7   | Eventos de analytics             | NÃO VERIFICADO | Serviço tipado/consentimento testados; PostHog está desativado, sem ingestão/dashboards                     |
| 8   | Tratamento de erros              | PASSOU         | Filtro seguro inclusive JSON inválido/oversize, mensagens comuns, limites de telemetria                     |
| 9   | Logs estruturados                | PASSOU         | INFO/WARN/ERROR, ISO UTC, requestId e lista permitida; sem payload pessoal                                  |
| 10  | Monitoramento de disponibilidade | NÃO VERIFICADO | health/readiness disponíveis; cadastro externo pendente                                                     |
| 11  | Alertas operacionais             | NÃO VERIFICADO | Procedimento de e-mail documentado; recebimento e resolução não testados                                    |
| 12  | SEO básico                       | PASSOU         | Smoke SSR de rotas públicas, metadados únicos, sitemap/robots, 404 e noindex privado; domínio real pendente |
| 13  | Performance                      | NÃO VERIFICADO | Bundle inicial 429,97 kB bruto/119,07 kB estimados; CWV/Lighthouse do host não medidos                      |
| 14  | Acessibilidade                   | NÃO VERIFICADO | Semântica e contrastes de tokens documentados; visual, leitor de tela, teclado e mobile não certificados    |
| 15  | Variáveis de ambiente            | PASSOU         | Schema e Compose passaram com valores falsos de auditoria; valores reais de produção pendentes              |
| 16  | Backups/recuperação              | PASSOU         | Dump local e restauração isolada conferidos; offsite/agendamento não realizados                             |
| 17  | Pipeline de deploy               | NÃO VERIFICADO | Workflow de CI existe; execução remota atual e deploy público não verificados                               |
| 18  | Credenciais expostas             | PASSOU         | Varredura estática não encontrou candidato a segredo; `.env` ignorado; sem Gitleaks/histórico completo      |
| 19  | Custos e limites                 | PASSOU         | Planos oficiais consultados; orçamento e contratação ainda não escolhidos                                   |
| 20  | Rollback                         | NÃO VERIFICADO | Runbook preparado e restore de banco local validado anteriormente; release pública não ensaiada             |

Qualquer falha detectada nos comandos finais deve substituir o PASSOU correspondente antes da entrega. Resultados e validações HTTP finais estão registrados no final deste arquivo.

## Problemas críticos e configurações externas (P0)

1. Definir domínio/host, TLS, Tunnel/entrada restrita, env/volume exclusivo; não expor PostgreSQL.
2. Resolver autorização/licença de uso dos dados extraídos para o projeto público. A licença conhecida do extractor é não comercial; **anúncios permanecem desligados**.
3. Configurar backup externo, retenção no destino e execução diária; testar restore antes da primeira migração pública.
4. Criar monitores e verificar e-mail de queda/recuperação. API health não comprova página disponível: monitorar ambas.
5. Antes de oferecer conta, configurar Supabase e retornos exatos; testar duas contas, token expirado, conflito de versão e exclusão. E-mail público exige SMTP próprio; padrão do Supabase é limitado ao time e 2 mensagens/hora, sem SLA. [Fonte oficial](https://supabase.com/docs/guides/auth/auth-smtp).
6. Revisar termos/privacidade/bases e identificação legal com responsável; alias Bellussi não foi transformado em razão social.
7. Verificar navegador real: CSP, hidratação, teclado, leitura mobile e prints. Nesta revalidação foi possível ler a árvore de acessibilidade da Home; faltam inspeção visual, teclado e leitor de tela.
8. Mercado ao vivo depende de acesso permitido ao provedor; não contornar bloqueio. Sem dados atuais, não apresentar promessa de preço em tempo real ou lucratividade garantida.

## Serviços e custo mensal

Preços consultados em 08/10/2026, em moeda do prestador, sujeitos a mudança e impostos/câmbio. Estimativa não é contratação.

| Serviço                            | Uso/status                                      | Gratuito                                                                          | Pago/risco                                                                                                                        |
| ---------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Docker + PostgreSQL + Nginx + Node | Local ativo; host público não contratado        | Software sem assinatura                                                           | Recursos do servidor e operação                                                                                                   |
| Cloudflare DNS/CDN/Tunnel          | Planejado, não configurado                      | Plano Free elegível, sujeito a termos/limites                                     | Domínio separado; não hospeda PostgreSQL/Nest gratuitamente nesta arquitetura                                                     |
| Supabase Auth                      | Código opcional, OFF sem env                    | 50k MAU; dois projetos ativos, pausa após semana inativa                          | Pro a partir de US$25/mês; SMTP externo se login por e-mail. Catálogo fica no PG próprio, não na cota grátis de 500 MB            |
| PostHog Cloud                      | Código opcional, OFF                            | 1M eventos/mês; não adicionar cartão inicialmente                                 | Uso pago apenas se habilitado; limites de cobrança e alerta antes de ativar                                                       |
| Better Stack uptime                | Configuração manual pendente                    | 10 monitores/heartbeats e e-mail no Free de projetos pessoais                     | Confirmar elegibilidade; não contratar logs/replay/exceptions redundantes                                                         |
| Arsha/Pearl Abyss                  | Consultas preparadas, acesso atual não validado | Sem contrato de SLA/gratuidade prometido                                          | Mudanças/bloqueios/falta de dados                                                                                                 |
| jsDelivr/tessdata                  | OCR sob demanda no browser                      | Distribuição pública, sem SLA contratado                                          | Preferir hospedar arquivos fixos se necessidade de disponibilidade/privacidade justificar                                         |
| Backups externos                   | Pendente                                        | Pode usar armazenamento já disponível privado                                     | R2 opcional: 10 GB-mês Standard e cotas de operações; excedentes pagos. Não foi contratado/configurado                            |
| Host VPS                           | Pendente                                        | Local já disponível: sem nova mensalidade, disponibilidade depende do equipamento | Referência DigitalOcean Basic: 2 GiB US$12/mês ou 4 GiB/2vCPU US$24/mês; 4 GiB é ponto inicial conservador, dimensionar por carga |

**Orçamento de referência público:** US$12–24/mês de VPS + domínio rateado + backup/egress excedente + SMTP caso necessário. Demais opcionais podem ficar em US$0 dentro das cotas; não contar a base inteira em Supabase Free. Build/extractor fora do VPS pequeno. Não converter para reais sem cotação do dia. Não há garantia de custo zero para serviço público contínuo.

Fontes: [Supabase](https://supabase.com/pricing), [PostHog](https://posthog.com/pricing), [Better Stack](https://betterstack.com/pricing), [DigitalOcean](https://www.digitalocean.com/pricing/droplets), [R2](https://developers.cloudflare.com/r2/pricing/).

Alternativas gratuitas: Better Stack é escolhido para uptime com poucos endpoints; UptimeRobot tem 50 monitores/5 min no Free hobby e não exige contratar segundo serviço. PostHog responde adoção/funis/retorno, Cloudflare Web Analytics apenas tráfego básico: não duplicar. ESLint nativo Angular já atende templates/TS; não adicionar Biome em paralelo. ConsoleLogger/Docker atendem logs iniciais; não instalar ELK/Grafana/Prometheus/OTel.

## Ordem de execução e aceitação

1. **P0 Código/dados:** builds, lint, tipos, testes e migrações passam; catálogo mostra lacunas; nenhuma credencial nos arquivos versionados. Depende da revisão do repositório; realizado localmente.
2. **P0 Infra + backup:** escolher host/domínio, volume exclusivo, pg_dump/offsite agendados; restore isolado recupera contagens/checksum; /health e /ready 200 pelo domínio. Risco: perda do único host, extrair no servidor concorrendo com usuários.
3. **P0 Segurança e operação externa:** validar CSP/login/OCR, duas contas isoladas, origin/rate limits, uptime e e-mail confirmado. Depende de 2. Risco: origem/proxy mal configurado ou SMTP indisponível.
4. **P0 Legal/licença:** conteúdo e dados autorizados, responsável/canal publicados, decisões de retenção/transferência documentadas. Depende dos prestadores escolhidos; responsável humano. Bloqueia publicidade e analytics opcional.
5. **P1 Analytics + qualidade pública:** consentimento verificado na rede e dashboard PostHog recebe evento; cota/billing limit definidos; Lighthouse móvel/desktop repetido com mesma condição, sem notas inventadas. Depende de 2–4.
6. **P1 Go-live:** smoke do domínio, deploy da imagem identificada, backup anterior, teste de rollback de release sem perda. Depende de 1–5. Começar com coleta de mercado limitada/OFF conforme fonte.
7. **P2 Crescimento medido:** aumentar CPU/RAM e índices conforme consultas; monitorar tamanho PG/assets/logs, taxas de erro e uso das cotas. Só separar banco ou adicionar cache/fila quando gargalo observado; antes de replicar API reavaliar limitador em memória e liderança do coletor.

## Deploy

Ver [publicação e contas](production-and-accounts.md), [segurança](security.md), [observabilidade](observability.md), [backup](backup-recovery.md), [analytics](analytics.md) e [inventário](privacy-inventory.md).

1. CI deve passar para revisão alvo. Gerar imagem com tag imutável da revisão em ambiente de build, guardar revisão anterior. Compose usa tag production por conveniência; resolver e anotar digest antes do deploy.
2. Configurar .env.production fora do Git e volumes separados; copiar assets e restaurar catálogo autorizado. Confirmar PUBLIC_SITE_URL HTTPS real.
3. Fazer backup e ensaio; revisar migrações. `docker compose --env-file .env.production -f docker-compose.production.yml build migrate`, depois `up -d`. Migrate deve terminar antes da API; API health deve liberar web.
4. Configurar Tunnel no host para http://127.0.0.1:8080 e DNS do domínio; restringir acesso direto/SSH. Não divulgar secrets em logs de compose config; usar `config --quiet` para validação.
5. Smoke: Home, item 1399, receitas, referências, contato, API sem token rejeitada, rotas pessoais noindex, imagens reais, sitemap/canonical do domínio, cookies e analytics sob escolha. Confirmar alertas e backup.

## Rollback

Antes de alterar: guardar digest/tag anterior e dump/manifesto. Para mudança somente de aplicação, retaggear a imagem anterior para black-market:production e recriar **api web**, sem rodar migrate novamente ou remover volume. Confirmar /health,/ready e páginas. Migrações 0005/0006 são aditivas ou flexibilizam uma coluna sem remover tabelas; compatibilidade com revisão anterior ainda precisa de ensaio no ambiente público.

Para mudança de schema/dados incompatível, parar escritas e restaurar backup em **novo volume**, usar imagem correspondente e validar antes de trocar entrada. Não fazer downgrade de migration à cegas nem usar down -v. Restaurar backup implica perder alterações posteriores ao RPO: preservar origem para reconciliação. Documentar motivo, horários e revisão.

## Métricas disponíveis

Build anterior à última instrumentação desta entrega: 418,48 kB iniciais / 116,44 kB de transferência estimada pelo Angular; OCR/Auth em chunks lazy. Isso é tamanho de compilação, não CWV, tempo percebido ou nota Lighthouse. Não existe medição comparável anterior ao trabalho para calcular ganho. Medição final e checks ficam abaixo.

Revisão complementar em 08/10/2026: depois dos ajustes de SSR/SEO, o bundle inicial mediu 429,97 kB bruto / 119,07 kB estimado pelo Angular; antes desta revisão, 428,54 / 118,77 kB. Esta é uma medição de compilação, não substitui CWV nem a medida 422,16 kB registrada para uma revisão anterior com conteúdo/configuração de build diferentes. Veja [o relatório de SEO/performance/acessibilidade](seo-performance-accessibility.md) para o comparativo e o escopo correspondente.

## Resultados locais registrados em 08/10/2026

- Vitest: 17 testes de cálculos, 37 testes de API, 41 testes de frontend/componentes, todos passaram (95 no total).
- Lint, format:check, typecheck e db:check passaram. Build web/backend passou em Node 24.21.0 no Docker; host local ainda usa Node 24.13.0.
- Smoke HTTP SSR: Home, item 1399 com Harmonia, receitas, NPCs e contato retornaram 200 com h1; perfil retornou HTML client-only com noindex/nofollow. Teste nativo sem banco/credenciais incluído no CI.
- CORS não autoriza origem estrangeira; PUT pessoal de origem estrangeira: 403. JSON inválido: 400 sem payload no erro. Excesso de consultas pessoais: 429 e Retry-After=60. Identidade sem configuração permanece 503, fechada.
- Restore do dump em banco isolado: 148.432 item_versions (inclui versões preservadas), 87.165 reference_records; 228 tabelas incluindo schemas de sistema. Banco original mantido.
- Tokens sólidos: texto/fundo 15,00:1; muted/surface 8,08:1; accent/fundo 8,24:1; control-border/surface 4,83:1. Não é certificação de todos os estados visuais.
- Correções encontradas: document.cookie no SSR sem cookie causava 404 público; acesso agora separado por plataforma. Arquivos .env.\* excluídos também do contexto Docker. Protocolo HTTPS do proxy explícito para canonical e rate limit do gateway usa 429.
- Na execução histórica: Lighthouse, navegador real, login externo, entrega de eventos, uptime/e-mail, backup externo/agendamento, TLS e rollback público: NÃO VERIFICADO. A seção de revalidação final atualiza o estado do navegador.

A exclusão da cópia da conta agora mantém contador monotônico sem conteúdo pessoal. Testes verificam o lock, remoção de conteúdo, rejeição de versão anterior e parâmetros SQL de dono; 0006 aplica apenas DROP NOT NULL em user_workspaces.data.

Build final após compatibilizar CSP com a hidratação Angular: 422,16 kB iniciais / 117,38 kB de transferência estimada. Smoke SSR passou verificando ausência de JavaScript inline incompatível. pnpm usa Node 24.21.0 no projeto; o comando node direto do host ainda aponta 24.13.0. Nginx -t passou para a configuração fornecida; isso não valida TLS/domínio público.

## Ensaio local do Compose de produção e CI

CI GitHub [37781129190](https://github.com/bellussi1/Black-Market/actions/runs/37781129190) passou na revisão 2f2dc3f, incluindo 95 testes, build, lint, format, tipos, extração i18n, migrações e smoke SSR sem scripts inline incompatíveis. [Lista de arquivos](changed-files.md).

O Compose de produção foi executado em projeto/volume **temporários e separados**, com dump restaurado e segredo de teste, flags de mercado/analytics OFF e domínio reservado black-market.example somente como cabeçalho de teste HTTP local. Migração 0006 terminou, API ficou healthy e web/gateway iniciaram. /health, /ready, Home, Harmonia, receitas, NPCs, contato, perfil, sitemap e /sobre/ responderam 200. Páginas públicas emitiram canonical HTTPS e HSTS; perfil emitia noindex/nofollow. API/web executaram como usuário node e filesystem somente leitura conforme Compose. O banco original não foi reutilizado como volume desse ensaio.

Esse teste confirma configuração e execução local; **não valida transporte TLS externo, DNS/Tunnel real, login, analytics, monitores, e-mail ou rollout público**. Ambiente temporário removido depois da verificação.

## Revalidação final — 08/10/2026

Esta seção registra a execução final desta auditoria e prevalece sobre resultados históricos anteriores no documento.

### Checklist de produção

|   # | Controle                         | Estado                          | Evidência e limite                                                                                                                                                                                                      |
| --: | -------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Compilação de frontend e backend | **PASSOU**                      | `pnpm build` final: Angular browser + SSR e Nest compilaram. Browser inicial 429,97 kB bruto / 119,07 kB estimados; maiores funcionalidades seguem em chunks lazy.                                                      |
|   2 | Testes automatizados             | **PASSOU**                      | `pnpm test`: 149/149 (24 calculators, 54 API, 71 web); `pnpm check`: lint, formatação, tipos e verificações do workspace passaram.                                                                                      |
|   3 | Segurança fundamental            | **PASSOU**                      | Testes locais para origens, limites, validação, filtro de erro e CSP passaram. `pnpm audit --prod`: nenhuma vulnerabilidade conhecida. Não é pentest nem validação de configuração no host.                             |
|   4 | Autenticação/autorização         | **NÃO VERIFICADO**              | Código valida identidade pelo provedor e deriva o dono no servidor; secrets do provedor não estão configurados. Fluxo externo, recuperação de conta e isolamento real entre duas contas não foram executados.           |
|   5 | Cookies/privacidade              | **PASSOU**                      | Testes locais de rejeição, aceitação seletiva, persistência, expiração, alteração e revogação passaram. Revisão das bases legais/documentos e validação das transferências pendentes.                                   |
|   6 | Footer e páginas legais          | **PASSOU**                      | Smoke SSR verificou páginas e links públicos; verificação CSS/layout passou. Conteúdo continua exigindo revisão jurídica e visual em navegador real.                                                                    |
|   7 | Analytics                        | **NÃO VERIFICADO**              | Eventos tipados, allowlist e consentimento cobertos por testes. PostHog está desativado e sem chave; ingestão e dashboards não foram validados. Não há Cloudflare Web Analytics detectado no código.                    |
|   8 | Tratamento de erros              | **PASSOU**                      | Filtro global e telemetria mínima com testes; erros de API não expõem stack/SQL/payload pessoal nas respostas.                                                                                                          |
|   9 | Logs estruturados                | **PASSOU**                      | Logger JSON com horário UTC, ambiente, Request ID e campos permitidos; não inclui senha, token, cookie ou corpo arbitrário.                                                                                             |
|  10 | Disponibilidade/health           | **NÃO VERIFICADO**              | `/health` e `/ready` definidos; sem domínio/host externo para fazer teste público. Compose foi validado, não iniciado nesta execução final.                                                                             |
|  11 | Alertas                          | **NÃO VERIFICADO**              | Nenhum monitor externo ou alerta por e-mail foi cadastrado/testado.                                                                                                                                                     |
|  12 | SEO básico                       | **PASSOU**                      | `pnpm test:ssr`: rotas públicas, metadados, canonical, JSON-LD, sitemap, redirects, 404 e noindex privado passaram com API mock local; domínio real não testado.                                                        |
|  13 | Performance                      | **NÃO VERIFICADO**              | Bundle medido e lazy chunks presentes. Lighthouse, compressão/CDN no host e Core Web Vitals reais não medidos; não inferir pontuação a partir do tamanho do bundle.                                                     |
|  14 | Acessibilidade                   | **NÃO VERIFICADO**              | Teste de contrato de CSS/layout legal passou e menor contraste de tokens medido foi 7,80:1. Testes manuais de teclado, leitor de tela, responsividade e zoom ainda faltam.                                              |
|  15 | Variáveis de ambiente            | **PASSOU**                      | Schema valida configurações e `docker compose ... config --quiet` passou com valores falsos transitórios; nenhum segredo real foi lido ou exibido. Configuração do host ainda falta.                                    |
|  16 | Backups/recuperação              | **PASSOU (local)**              | Script de dump, checksum/manifesto e restore isolado já foram exercitados em execução anterior registrada. Agendamento e cópia externa/encriptada continuam pendentes.                                                  |
|  17 | Pipeline de deploy               | **NÃO VERIFICADO**              | `.github/workflows/ci.yml` contém lint, format, tipos, testes, build, smoke SSR, i18n e migrações. `gh` não está instalado; status remoto atual do GitHub não foi consultado. Não existe deploy automático configurado. |
|  18 | Segredos no repositório          | **PASSOU (varredura estática)** | `.env` está ignorado; padrões comuns de tokens/chaves nos arquivos versionados não localizaram candidatos. Sem Gitleaks e sem auditoria completa de todo o histórico Git.                                               |
|  19 | Custos/limites externos          | **PASSOU (estimativa)**         | Planos oficiais consultados e estimativa registrada abaixo; nenhuma contratação/conta ativa foi assumida. Valores e elegibilidade podem mudar.                                                                          |
|  20 | Rollback                         | **NÃO VERIFICADO**              | Procedimento está escrito; não existe release pública para ensaiar retorno de imagem/schema. Restore de banco local não comprova rollback de aplicação em produção.                                                     |

### Comandos e observações finais

- `pnpm build` — passou. Bundles: Angular browser inicial **429,97 kB bruto / 119,07 kB de transferência estimada**; SSR server inicial **928,50 kB**. O número do navegador não é uma medição de LCP/INP/CLS.
- `pnpm test` — passou: **149 testes** no total (calculators 24, API 54, web 71).
- `pnpm check` — passou: lint, `format:check`, typecheck e demais verificações do script.
- `pnpm test:ssr` — passou: rotas públicas e metadados SEO, sitemap, redirect canônico, 404 e `noindex` privado.
- `pnpm test:legal:layout` — passou; contraste mínimo de tokens **7,80:1**. O script não emula navegador, leitor de tela ou reflow.
- `pnpm db:check` — passou: Drizzle reportou integridade das migrações.
- `docker compose --env-file .env.example -f docker-compose.production.yml config --quiet` — passou com credenciais de auditoria descartáveis. Validou sintaxe/resolução; não criou container nem validou secrets reais, DNS ou TLS.
- `pnpm audit --prod` — nenhuma vulnerabilidade conhecida no conjunto de dependências de produção consultado.
- `node -v` no PowerShell foi `v24.13.0`; `pnpm exec node -v` foi `v24.21.0`; CI fixa Node `24.21.0`. O build passou pelo runtime chamado via pnpm, mas convém alinhar NVM/PATH local para evitar discrepâncias em futuras execuções diretas.
- O build emite alertas não bloqueantes: Angular não encontra locale compilado `pt-BR` e usa locale `pt`; a configuração da aplicação registra os dados `pt` sob identificador `pt-BR`. Tesseract (`tesseract.js`/`regenerator-runtime`) gera aviso CommonJS, mas permanece lazy. Revisar formatação de datas/números no navegador brasileiro; não há evidência de falha funcional atual.
- Lighthouse, Gitleaks e GitHub CLI não estão instalados. A árvore da Home no navegador local mostrou skip link, região principal, hierarquia de headings e links/footer nomeados; não capturei evidência visual nem percorri todas as rotas/interações. Testes manuais de teclado, leitor de tela e mobile continuam pendentes.
- Nenhuma alteração funcional foi necessária com base nos comandos executados nesta auditoria. A mudança deste trabalho é este relatório atualizado.

### Configurações externas pendentes — bloqueiam lançamento público

1. Selecionar domínio e host; configurar DNS, TLS/Tunnel e firewall, HTTPS real e `PUBLIC_SITE_URL`.
2. Configurar backups automáticos com destino fora do host, retenção/encriptação e alerta de falha; fazer restore de ensaio no destino externo.
3. Escolher uptime externo e endereço de notificação; monitorar tanto a página quanto `/health` e testar queda e recuperação.
4. Se ativar contas, configurar Supabase Auth, origens/callbacks, SMTP adequado e testar login, recuperação e isolamento; hoje a autenticação externa não está pronta.
5. Manter analytics desativado até definir base legal/revisão e configurar PostHog sob consentimento. Não adicionar Cloudflare Analytics, GA4, replay ou Sentry em paralelo sem caso de uso.
6. Revisar juridicamente Termos/Privacidade/Cookies, identidade do controlador, retenção e transferências internacionais; confirmar licença e autorização dos dados do jogo/extractor antes de monetização.
7. Fazer inspeção manual com navegador real: fluxo público, hidratação, mobile/zoom, teclado, foco, leitor de tela, CSP/login/OCR, contraste de estados e formulário de suporte.
8. Validar que a fonte de preço de mercado permite o uso pretendido e monitorar indisponibilidade/limites; não anunciar atualização em tempo real até confirmar operação no domínio.

### Serviços e custos consolidados

Estimativa mensal, preços oficiais consultados em 08/10/2026. Valores do provedor antes de imposto/câmbio e sujeitos a elegibilidade/alteração. **Nenhum dos serviços opcionais abaixo está configurado ou contratado.**

| Serviço                                                      | Estado/uso                                 | Custo inicial estimado e limites                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js, Angular, NestJS, PostgreSQL, Drizzle, Docker, Nginx | Stack própria                              | US$ 0 de licença; paga-se host, disco, energia e operação.                                                                                                                                                                                                                                                                                                                |
| VPS                                                          | Hospedagem simples sugerida                | Referência de US$ 24/mês para DigitalOcean Basic 4 GiB/2 vCPU; o plano 2 GiB custa US$ 12/mês, mas pode ser apertado para PostgreSQL + API + SSR. [Preços DigitalOcean](https://www.digitalocean.com/pricing/droplets).                                                                                                                                                   |
| Domínio                                                      | Não escolhido                              | Preço anual varia pelo TLD/registrador; sem cotação confiável nesta auditoria.                                                                                                                                                                                                                                                                                            |
| Cloudflare DNS/CDN/Tunnel                                    | Planejado, não configurado                 | DNS sem cobrança por consulta em planos elegíveis; o plano Free é destinado a uso pessoal/hobby e projetos não críticos para negócio. Para site profissional, Pro é US$ 20/mês com cobrança anual ou US$ 25 mês a mês. Confirmar termos/necessidade antes de selecionar. [Planos](https://www.cloudflare.com/plans/) · [DNS](https://developers.cloudflare.com/dns/faq/). |
| Monitor de uptime                                            | Ainda não cadastrado                       | Sugestão para projeto público/comercial: UptimeRobot Free, até 50 monitores com checagem a cada 5 min; Better Stack Free anuncia 10 monitores para projetos pessoais. Escolher um só. [UptimeRobot](https://uptimerobot.com/pricing/) · [Better Stack](https://betterstack.com/pricing/).                                                                                 |
| Supabase Auth                                                | Opcional, desativado                       | Free: até 50.000 MAU e projeto pode pausar após uma semana sem atividade; Pro a partir de US$ 25/mês e envio de e-mail pode exigir SMTP externo. O PostgreSQL de catálogo continua no host próprio. [Planos](https://supabase.com/pricing).                                                                                                                               |
| PostHog Cloud                                                | Opcional, desativado                       | Free: até 1 milhão de eventos de Product Analytics/mês; autocapture/replay não foram habilitados. Na configuração free eventos acima do limite são descartados, sem cobrança automática por upgrade. [Planos](https://posthog.com/pricing).                                                                                                                               |
| Cloudflare R2                                                | Opção para backup externo; não configurado | Cota Standard gratuita de 10 GB-mês, 1M operações Class A e 10M Class B; excedentes conforme preço. Ainda é necessário configurar criptografia/credenciais/retenção e testar recuperação. [Preços R2](https://developers.cloudflare.com/r2/pricing/).                                                                                                                     |
| Email/SMTP                                                   | Não configurado                            | Custo depende do provedor/volume; sem preço ou entrega estimada até selecionar e testar.                                                                                                                                                                                                                                                                                  |
| Fonte de preço BDO / Pearl Abyss / Arsha                     | Acesso não validado                        | Não assumir acesso gratuito, SLA, autorização de redistribuição ou atualização em tempo real.                                                                                                                                                                                                                                                                             |
| jsDelivr/tessdata para OCR                                   | Recurso externo lazy                       | Sem custo direto de uso previsto nesta etapa; disponibilidade, privacidade e SLA não foram contratados.                                                                                                                                                                                                                                                                   |

**Orçamento de referência:** hospedagem a partir de ~US$ 24/mês + domínio anual + backup externo (possível começar dentro das cotas R2) + envio de e-mail quando necessário. Cloudflare Pro adiciona US$ 20–25/mês se necessário/elegível; Supabase Pro adiciona US$ 25/mês se contas exigirem disponibilidade sem pausa; SMTP pode adicionar valor. Se rodar no PC existente, custo financeiro incremental pode ser menor, mas não há disponibilidade/recuperação de servidor público. Não é possível prometer produção contínua confiável a custo total zero.

**Não há duplicação ativa:** PostHog está desligado; Cloudflare Web Analytics não foi encontrado; uptime não foi cadastrado; logs locais JSON atendem investigação inicial; não há Sentry, replay, GA4/GTM, Grafana ou Prometheus. Para lançamento, selecione um único monitor externo de uptime e mantenha analytics opt-in/desligado até configurar consentimento e base legal.

### Procedimento de deploy e rollback

Deploy inicial:

1. Esperar CI verde na revisão exata; fixar imagem por tag imutável/digest e guardar a revisão/digest anterior.
2. Preparar host e domínio HTTPS; criar `.env.production` fora do Git, com segredos aleatórios separados para administrador e usuário runtime; validar com `docker compose ... config --quiet` sem imprimir o resultado.
3. Preparar volume PostgreSQL exclusivo e assets/catálogo cuja licença foi confirmada; criar primeiro backup fora do host e ensaiar restauração antes de migrações públicas.
4. Executar o serviço de migração e depois os serviços web/API/gateway conforme [`docs/deployment.md`](deployment.md), sem `down -v`; configurar Tunnel para `http://127.0.0.1:8080` apenas se Cloudflare for escolhido.
5. Validar `/health`, `/ready`, home, páginas públicas, API, canonical, sitemap, `robots.txt`, imagens, autenticação se ativada e monitores/alertas. Registrar imagem, migration e checksum do backup do release.

Rollback de aplicação: usar o digest anterior, recriar somente API/web/gateway, não repetir migração e não remover volumes; validar health e rotas. Rollback de banco incompatível: suspender escrita, preservar o volume original e restaurar backup em novo volume junto da imagem compatível; aceitar explicitamente a perda até o ponto de recuperação e reconciliar se possível. Nunca executar `docker compose down -v` como rollback.

### Próximos passos após crescimento

Medir primeiro uso de CPU/RAM, latência das consultas, erros, tamanho do PostgreSQL, transferências/assets e cotas externas. Aumentar o host/índices somente quando as medições mostrarem gargalo. Reavaliar limitador em memória/coletor antes de múltiplas réplicas. Considerar fila/cache/segundo serviço apenas quando importações, jobs ou latência justificarem. Antes de monetizar, confirmar licença de dados, elegibilidade dos planos Cloudflare, política de privacidade/consentimento, suporte e termos de uso.
