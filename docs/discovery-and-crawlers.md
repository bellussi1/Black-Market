# SEO, descoberta, performance e acessibilidade

Estado em 08/10/2026. Home, catálogo/fichas de itens, receitas, referências, nós e 4 páginas legais usam Angular SSR para entregar HTML público. Áreas pessoais são client-only, noindex/nofollow e private/no-store. Regiões iniciam pelo cookie funcional e são transferidas para a hidratação; nenhum workspace pessoal vai para o HTML público.

Títulos, descriptions, canonical sem query, Open Graph/Twitter e JSON-LD contextual são gerados sem domínio social inventado. Localhost/loopback/.invalid recebem noindex; staging real precisa de política adicional no gateway. Itens inexistentes devolvem 404; indisponibilidade de consulta usa 503. Falhas de render público usam 503 com mensagem simples, sem stack. Caminhos desconhecidos client-only podem continuar com fallback e noindex; avaliar 404 HTTP dedicado quando existir demanda de indexação desses caminhos.

PUBLIC_SITE_URL real habilita sitemap por lotes de 10 mil URLs SA/pt; não enumerar todos os mercados sem tradução válida. Robots aponta sitemap, exclui API. llms.txt é orientação experimental, sem promessa de GEO/AEO, ranking ou citação. Não bloquear robôs legítimos no WAF sem decidir a política de conteúdo e carga.

Lazy loading em rotas, SDK Auth e OCR sob demanda; fonts locais de sistema, ícones WebP com dimensões, cache longo para assets com hash, gzip no gateway. HTML que depende de região não recebe cache compartilhado. Build medido ~418,48 kB inicial / ~116,57 kB de transferência estimada. Sem dado comparável antes/depois e sem CWV/Lighthouse medido em produção.

Foco visível, skip link, layout com um main, labels, mensagens por status, tabelas semânticas, controles com alvo mínimo, suporte a reduced motion, diagramas acompanhados de lista/formulário. Testes de componentes e políticas não certificam leitores de tela, contraste de todo conteúdo ou responsividade visual. A automação do navegador local não ficou disponível; não foi contornada. Executar Lighthouse móvel/desktop e inspeção humana no domínio autorizado, incluindo teclado, zoom 200%, leitor de tela e hidratação, antes de certificar a experiência.

O teste nativo `pnpm test:ssr` verifica HTML da Home, contato/termos, headers e noindex pessoal sem banco externo. Foi adicionado após corrigir acesso indevido a document.cookie no servidor. O checklist e limites estão na [auditoria](production-audit.md).
