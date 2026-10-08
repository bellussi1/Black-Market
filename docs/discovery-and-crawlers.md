# Descoberta, metadados e crawlers

Revisado em **7 de outubro de 2026**. Esta etapa prepara a descoberta pública do Black Market; não confirma publicação, indexação ou presença em respostas de IA.

## Implementação e integração

`apps/web/src/app/core/seo.service.ts` fornece `SeoService.start()`, idempotente. No componente raiz, injete o serviço e chame uma vez no construtor:

```ts
private readonly seo = inject(SeoService);

constructor() {
  this.seo.start();
}
```

Importe `inject` de `@angular/core` e `SeoService` de `./core/seo.service`, adaptando o caminho. O serviço usa `DOCUMENT`, `Router`, `Meta` e `Title`; aplica títulos resolvidos das rotas e descrições por página após navegação. A inscrição termina com `takeUntilDestroyed`, conforme a [API Angular](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed).

Rotas públicas conhecidas recebem description, robots, canonical e metadados Open Graph/Twitter. Canonical e `og:url` usam a origem real de `document.URL`, removendo query e fragmento. Não há domínio inventado nem imagem social inexistente. Settings, storage, gear pessoal e rotas desconhecidas recebem `noindex,nofollow`, sem canonical ou tags sociais. Novas rotas privadas também podem declarar `data: { private: true }` ou `data: { noindex: true }`.

Cada navegação remove os metadados gerenciados e canonical anterior, evitando carregar dados da página anterior. Redirecionamento de URL desconhecida para home permanece noindex nessa navegação. A lista pública deve ser ampliada junto com cada nova rota indexável. Nesta versão não existem fichas de item com URL própria; filtros de catálogo não se tornam páginas individuais apenas por receber metadados.

Origens localhost, loopback e `.invalid` recebem noindex. **Homologação em um domínio real requer `X-Robots-Tag: noindex` na hospedagem**; o serviço não reconhece automaticamente domínios de preview. Se a SPA já terminou um redirecionamento antes de iniciar o serviço, a URL original pode não estar disponível; inicializar cedo e implementar tratamento HTTP de URLs inexistentes na produção.

## Limite da SPA

O Google processa JavaScript, mas conteúdo renderizado no servidor ou previamente gerado facilita acesso por robôs que não executam scripts. Títulos, descrições e canonical dinâmicos ajudam depois da renderização; não substituem HTML útil na resposta inicial. [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

O projeto ainda precisa de SSR/prerender para home, catálogo, receitas e futuras fichas públicas. Também precisa de respostas HTTP corretas para páginas inexistentes e conteúdo protegido. O fallback atual de SPA pode responder 200 para caminhos desconhecidos; noindex dinâmico reduz exposição para robôs que renderizam, mas não corrige sozinho o status HTTP.

Não colocar noindex global na resposta HTML de páginas públicas contando com sua remoção via JavaScript. Para páginas privadas, aplicar autenticação/autorização e noindex no servidor ou hospedagem. Metadados nunca devem incluir nomes de usuário, saldo, conteúdo do armazém, URLs de prints privados ou parâmetros de sessão.

## robots.txt e llms.txt

O robots público permite rastrear o conteúdo e restringe `/api/`. Settings e storage não são bloqueados no robots para permitir que robôs compatíveis leiam o noindex. **robots.txt não é controle de segurança nem garantia de remoção de resultados**; APIs privadas precisam validar a sessão e a autorização. A [documentação Google de robots](https://developers.google.com/search/docs/crawling-indexing/robots/intro) explica essas limitações.

`llms.txt` resume páginas públicas com links relativos ao mesmo domínio. A [proposta llms.txt](https://llmstxt.org/) é experimental: sua presença não garante leitura por um crawler, indexação, citações ou destaque em respostas. Não serve dados privados e não dá autorização de reutilização de assets ou da base.

Sitemap ficou pendente até existir domínio real e geração com URLs canônicas publicáveis. Não anunciar um endereço de sitemap inexistente. Ao publicar, gerar o arquivo a partir de rotas e entidades públicas, com datas reais de alteração, e adicioná-lo ao robots.

## SEO, AEO e GEO

O Google informa que as práticas usuais de SEO continuam relevantes para seus recursos de IA; não exige arquivo especial de IA nem schema específico para participar. Elegibilidade não garante exibição. [Google: AI features](https://developers.google.com/search/docs/appearance/ai-features)

Planejar conteúdo com respostas claras, nomes oficiais de itens em pt-BR, IDs estáveis, fontes e versão do patch, preços datados, unidades explícitas e explicação das premissas de cálculos. Usar links HTML reais entre item, receita e materiais; títulos e headings devem descrever a página. FAQs podem existir como conteúdo quando houver perguntas reais, sem inserir avaliações, ratings ou dados estruturados fictícios.

## Próxima etapa de publicação

A página `/sobre/` é HTML estático e apresenta o projeto, as fontes e perguntas frequentes sem depender de JavaScript. As ferramentas continuam sendo uma SPA; essa página não substitui SSR/prerender das fichas de itens e receitas.

- Substituir configurações de API de exemplo pelo endpoint real e validar HTTPS/origem.
- Servir HTML público com SSR/prerender e acesso aos dados necessário à renderização.
- Proteger dados pessoais e prints no backend; noindex em respostas privadas e previews.
- Gerar sitemap real, fichas públicas estáveis e metadados por entidade.
- Conferir conteúdo renderizado e sinais de descoberta no ambiente publicado; acompanhar Search Console e métricas de usuários reais. Nenhuma auditoria de indexação ou medição de Core Web Vitals foi executada nesta etapa.
