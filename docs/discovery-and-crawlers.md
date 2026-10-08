# Descoberta e crawlers

O estado vigente de SEO, SSR, performance, acessibilidade, resultados de build e limitações está em [SEO, performance e acessibilidade](seo-performance-accessibility.md).

Em resumo: páginas públicas são renderizadas no servidor e recebem canonical/metadados apenas com `PUBLIC_SITE_URL`; páginas pessoais são `noindex`/`no-store`; `/robots.txt` aponta para o sitemap gerado; URLs desconhecidas recebem 404; o sitemap inclui páginas públicas e somente dados publicados SA/pt. Não há nota Lighthouse nem CWV de produção registrados.

Não prometer GEO/AEO, classificação ou citação por buscadores/LLMs. Não bloquear crawlers legítimos no WAF sem uma política de conteúdo/carga. HTML regionalizado permanece privado para não misturar mercados por cache compartilhado.
