# Segurança fundamental do MVP

## Controles

- Tokens Bearer verificados em Supabase Auth via getUser; UUID do dono vem da identidade confirmada. Não aceitar userId enviado pelo visitante.
- Workspace com SELECT/UPDATE/DELETE filtrados pelo dono e versão esperada; transação e advisory lock em gravações. Retorno privado/no-store. Testar duas contas reais ainda exige credenciais.
- CORS com uma origem HTTP(S) normalizada, métodos/cabeçalhos explícitos e credentials=false. Origem estrangeira em escrita pessoal é rejeitada.
- Não há autenticação por cookie ou credenciais ambientes enviadas automaticamente; CSRF clássico por cookie não se aplica ao Bearer atual. PKCE para retorno de identidade; SameSite=Lax/Secure no cookie funcional de região.
- CSP na resposta web de produção: self para código, jsDelivr/WASM/worker para OCR sob demanda, sem unsafe-eval; inline de estilos para Angular. HSTS apenas na origem HTTPS. DENY, nosniff, Permissions-Policy e políticas de referência. CSP precisa de validação em navegador com login e OCR reais antes de publicar.
- Middleware nativo limitado em memória: workspace/market 30 requisições/min/IP; telemetria 10/min/IP, mapa limitado a 10 mil chaves. Gateway reduz mercado a 10/min. Limitador por processo, apropriado para instância única.
- Validação Zod em contratos e listagens, limites de body e assets, propriedades operacionais restritas. SQL Drizzle parametrizado. Renderização de conteúdo por texto/escape Angular; sem HTML arbitrário importado.
- Filtro global sem erro original sensível; Swagger desativado em produção. Logs mínimos e rotação. Timeouts de pool/query.
- Supabase aceita chave publicável/anon; rejeita secret/service_role. .env fora do Git. Arquivo exemplo só tem valores locais explicitamente demonstrativos.
- Produção: PostgreSQL/API sem portas públicas, entrada 127.0.0.1:8080 para Tunnel. Proxy aceita IP apenas na cadeia privada configurada. Não expor gateway direto a redes não confiáveis nem confiar em XFF de visitante.

## Limitações e configurações obrigatórias

Sessão em sessionStorage acessível por JavaScript; risco residual XSS documentado. Limites na borda/provedor de login complementam os da aplicação; habilitar controle de abuso e endereços de retorno exatos no Supabase. SMTP padrão não é adequado a login público por e-mail: [limites oficiais](https://supabase.com/docs/guides/auth/auth-smtp). OAuth pode reduzir necessidade de outro serviço, mas exige credenciais Google e validação.

TLS e HSTS real dependem de domínio HTTPS. Configurar Cloudflare Full (strict) quando houver conexão TLS ao origin; no desenho Tunnel o processo local do túnel termina em loopback HTTP, sem porta pública no host. Manter SSH restrito, atualizações, usuários de sistema e acesso Docker privilegiado controlados. Ambientes com bancos/volumes/identidades separados; nunca usar senha do exemplo em produção.

Não houve pentest externo, prova de ausência absoluta de vulnerabilidades, login real de duas contas ou validação visual de CSP. Novos formulários e terceiros precisam repetir revisão de escape contextual e minimização. Ao escalar para mais de uma instância, reavaliar limitador/coletor e concorrência antes de replicar processos.

No servidor SSR, confiar somente em X-Forwarded-Proto no modo de produção; o gateway privado define HTTPS explicitamente para a entrada Tunnel. Não confiar em Forwarded/X-Forwarded-Host enviados por visitantes. Angular valida host em lista explícita, evitando origens arbitrárias para canonical e fetch de SSR.

A inspeção HTTP encontrou scripts inline gerados por replay de eventos e CSS crítico. O MVP desativa replay de eventos e inlineCritical no build, mantendo hidratação e stylesheet minificado normal, para respeitar script-src sem unsafe-inline. O smoke SSR verifica que HTML público não emite JavaScript inline incompatível. Reavaliar nonce por resposta apenas se houver benefício medido para esses recursos.

Angular 22 ativa hidratação incremental/replay por padrão; a configuração usa withNoIncrementalHydration para impedir scripts inline de replay e mantém a hidratação normal. connect-src libera apenas o endereço de identidade configurado, sem wildcard de projetos Supabase.
