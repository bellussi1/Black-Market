# Auditoria de preparação para produção — Black Market

Data: 08/10/2026. MVP Angular 22 + Nest 12 + Drizzle + PostgreSQL 17; Tailwind/SCSS, Vitest e ESLint. Instância única, Docker Compose, Nginx e entrada Cloudflare planejada. Não há Redis, Kubernetes, microsserviços ou serviços pagos adicionados. O diagnóstico descreve o código atual após as correções; não há medições históricas confiáveis para inventar um antes/depois.

**Conclusão: código preparado e validado localmente; lançamento público ainda depende dos itens P0 externos abaixo. Não declarar produção pronta.**

## Auditoria por categoria

| Categoria                        | Implementado                                                                                                                                            | Falta/correção necessária                                                                                            | Prioridade e solução                                                                          | Recorrência / dependências                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Frontend, backend, banco         | Rotas lazy, SSR público, formulários validados, dinheiro BigInt, catálogo versionado real, PostgreSQL próprio                                           | Inglês ausente, 730 itens sem nome localizado; receitas incompletas na fonte; mercado bloqueado não validado ao vivo | P0 mostrar lacunas; P1 revisar dados após patch e interpretar coleções antes de usar fórmulas | Frameworks grátis; CPU/disco do host. Depende de cliente do jogo/extractor                  |
| Auth, autorização, segurança     | Supabase opcional, dono derivado de token confirmado, versão de workspace, CORS, CSP/HSTS, headers, rate limits, filtros seguros                        | Configurar provedor/retornos; testar duas contas; CSP real com OCR/login; sessão JS com risco XSS residual           | P0 ativar e validar somente após identidade/HTTPS; P1 sessão opaca se necessidade justificar  | Free Auth sob cotas; SMTP público opcional adicional. Depende de domínio e provedor         |
| Infraestrutura/hospedagem/deploy | Compose produção separado, volumes exclusivos, banco/API privados, web/API sem root e filesystem readonly, gateway loopback                             | Host/Tunnel/DNS/TLS/firewall ainda não configurados; CI é verificação, não deploy automático                         | P0 um host, uma imagem versionada, publicação manual inicialmente                             | Host e domínio pagos; Cloudflare Free sob limites. Depende de backup e smoke checks         |
| Logs, erros, monitoramento       | JSON Nest, Request ID, WARN/ERROR, filtro global, telemetria mínima, health/readiness, rotação Docker                                                   | Monitores e e-mails não cadastrados/validados; investigação sem stack detalhada                                      | P0 uptime gratuito + runbook; P1 observar se Sentry é realmente necessário                    | Better Stack Free, sem SDK de logs. Depende de domínio público e operador                   |
| Cookies/privacidade/LGPD         | Inventário, banner apenas quando opção configurada, rejeitar/aceitar/customizar/revogar, armazenamento mínimo, sessão por aba                           | Revisão jurídica, identidade legal completa, transferências e prazos finais; processo de direitos                    | P0 validar documentos antes de abrir contas/analytics                                         | Código grátis; revisão humana sem custo fixo estimado. Depende de prestadores e responsável |
| Analytics                        | Serviço tipado, eventos relevantes, sem autocapture/replay/PII, consentimento, dev/test OFF                                                             | Chave PostHog e validação no painel; dashboards nativos e limites externos                                           | P1 ativar após consentimento/documentos; manter apenas PostHog                                | Free 1M eventos/mês. Depende de domínio, privacidade e conta do mantenedor                  |
| SEO, performance, acessibilidade | Títulos/descrições/canonical/OG/JSON-LD, sitemap SA/pt, robots, noindex pessoal, SSR público, cache de assets, gzip gateway, lazy OCR/Auth, foco/labels | Lighthouse/CWV em domínio e auditoria manual teclado/leitor de tela/mobile; verificar CSP do navegador               | P0 smoke público sem dados pessoais; P1 medir e corrigir evidência real                       | Código grátis, host. Depende de publicação HTTPS; sem nota Lighthouse inventada             |
| Legal/footer/suporte             | Footer com ano automático, 4 rotas estáticas, alias Bellussi e e-mail informado, preferências pelo footer                                               | Revisão jurídica e identificação completa; definir rotina de suporte/direitos                                        | P0 revisar conteúdo e titularidade/licença dos dados                                          | Código grátis; parecer humano separado. Depende de responsável                              |
| Testes/backups/recuperação       | Vitest, build/typecheck/lint, migrações, dump+SHA256, retenção opt-in, restore isolado executado                                                        | Agendamento diário, destino externo protegido, simular rollback de release pública                                   | P0 backup offsite e ensaio; P1 repetição mensal                                               | Local grátis; armazenamento externo conforme volume. Depende de host/disco/credenciais      |

## Checklist final

PASSOU significa evidência local especificada; NÃO VERIFICADO significa credencial, ambiente externo ou revisão humana ausente. Não equivale a certificação de segurança ou conformidade.

| #   | Controle                         | Estado         | Evidência / limite                                                                                       |
| --- | -------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Compilação web/backend           | PASSOU         | pnpm build; servidor Angular SSR e Nest compilados                                                       |
| 2   | Testes automatizados             | PASSOU         | Vitest dos cálculos, API e componentes; contagem final abaixo                                            |
| 3   | Segurança fundamental            | PASSOU         | Testes de limite/origem/filtro/chave pública/CSP; não é pentest                                          |
| 4   | Autenticação/autorização         | NÃO VERIFICADO | Fronteira testada com mocks; fluxo real e isolamento entre duas contas pendentes                         |
| 5   | Cookies e privacidade            | PASSOU         | Testes rejeição/aceitação/persistência/expiração/revogação/cancelamento; revisão legal pendente          |
| 6   | Footer/rotas legais              | PASSOU         | Render de 4 documentos, links, contato; revisão jurídica não realizada                                   |
| 7   | Eventos de analytics             | NÃO VERIFICADO | Emissão/consentimento/allowlist testados; ingestão PostHog e dashboards não ativados                     |
| 8   | Tratamento de erros              | PASSOU         | Filtro seguro inclusive JSON inválido/oversize, mensagens comuns, limites de telemetria                  |
| 9   | Logs estruturados                | PASSOU         | INFO/WARN/ERROR, ISO UTC, requestId e lista permitida; sem payload pessoal                               |
| 10  | Monitoramento de disponibilidade | NÃO VERIFICADO | health/readiness disponíveis; cadastro externo pendente                                                  |
| 11  | Alertas operacionais             | NÃO VERIFICADO | Procedimento de e-mail documentado; recebimento e resolução não testados                                 |
| 12  | SEO básico                       | PASSOU         | SSR público, metadados e sitemap implementados; domínio/canonical real pendentes                         |
| 13  | Performance                      | NÃO VERIFICADO | Bundle medido e cache/lazy/gzip preparados; CWV/Lighthouse de produção ausentes                          |
| 14  | Acessibilidade                   | NÃO VERIFICADO | Testes semânticos básicos e foco/labels; leitor de tela, contraste renderizado e mobile não certificados |
| 15  | Variáveis de ambiente            | PASSOU         | Schema e exemplos, integrações OFF; valores reais de produção ainda pendentes                            |
| 16  | Backups/recuperação              | PASSOU         | Dump local e restauração isolada conferidos; offsite/agendamento não realizados                          |
| 17  | Pipeline de deploy               | NÃO VERIFICADO | CI valida código; deploy público manual preparado, não executado                                         |
| 18  | Credenciais expostas             | PASSOU         | Revisão de arquivos a versionar e .env ignorado; valores locais do exemplo são demonstrativos            |
| 19  | Custos e limites                 | PASSOU         | Planos oficiais consultados; orçamento e contratação ainda não escolhidos                                |
| 20  | Rollback                         | NÃO VERIFICADO | Runbook preparado e restore local testado; retorno de release pública não ensaiado                       |

Qualquer falha detectada nos comandos finais deve substituir o PASSOU correspondente antes da entrega. Resultados e validações HTTP finais estão registrados no final deste arquivo.

## Problemas críticos e configurações externas (P0)

1. Definir domínio/host, TLS, Tunnel/entrada restrita, env/volume exclusivo; não expor PostgreSQL.
2. Resolver autorização/licença de uso dos dados extraídos para o projeto público. A licença conhecida do extractor é não comercial; **anúncios permanecem desligados**.
3. Configurar backup externo, retenção no destino e execução diária; testar restore antes da primeira migração pública.
4. Criar monitores e verificar e-mail de queda/recuperação. API health não comprova página disponível: monitorar ambas.
5. Antes de oferecer conta, configurar Supabase e retornos exatos; testar duas contas, token expirado, conflito de versão e exclusão. E-mail público exige SMTP próprio; padrão do Supabase é limitado ao time e 2 mensagens/hora, sem SLA. [Fonte oficial](https://supabase.com/docs/guides/auth/auth-smtp).
6. Revisar termos/privacidade/bases e identificação legal com responsável; alias Bellussi não foi transformado em razão social.
7. Verificar navegador real: CSP, hidratação, teclado, leitura mobile e prints. A automação de navegador local não esteve disponível; não foi substituída para contornar essa restrição.
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

## Resultados locais registrados em 08/10/2026

- Vitest: 17 testes de cálculos, 37 testes de API, 41 testes de frontend/componentes, todos passaram (95 no total).
- Lint, format:check, typecheck e db:check passaram. Build web/backend passou em Node 24.21.0 no Docker; host local ainda usa Node 24.13.0.
- Smoke HTTP SSR: Home, item 1399 com Harmonia, receitas, NPCs e contato retornaram 200 com h1; perfil retornou HTML client-only com noindex/nofollow. Teste nativo sem banco/credenciais incluído no CI.
- CORS não autoriza origem estrangeira; PUT pessoal de origem estrangeira: 403. JSON inválido: 400 sem payload no erro. Excesso de consultas pessoais: 429 e Retry-After=60. Identidade sem configuração permanece 503, fechada.
- Restore do dump em banco isolado: 148.432 item_versions (inclui versões preservadas), 87.165 reference_records; 228 tabelas incluindo schemas de sistema. Banco original mantido.
- Tokens sólidos: texto/fundo 15,00:1; muted/surface 8,08:1; accent/fundo 8,24:1; control-border/surface 4,83:1. Não é certificação de todos os estados visuais.
- Correções encontradas: document.cookie no SSR sem cookie causava 404 público; acesso agora separado por plataforma. Arquivos .env.\* excluídos também do contexto Docker. Protocolo HTTPS do proxy explícito para canonical e rate limit do gateway usa 429.
- Lighthouse, navegador real, login externo, entrega de eventos, uptime/e-mail, backup externo/agendamento, TLS e rollback público: NÃO VERIFICADO.

A exclusão da cópia da conta agora mantém contador monotônico sem conteúdo pessoal. Testes verificam o lock, remoção de conteúdo, rejeição de versão anterior e parâmetros SQL de dono; 0006 aplica apenas DROP NOT NULL em user_workspaces.data.
