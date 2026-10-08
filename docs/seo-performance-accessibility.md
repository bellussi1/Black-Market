# SEO, performance e acessibilidade

Revisão e implementação em **8 de outubro de 2026**. Escopo: MVP Angular com SSR em Express, páginas públicas e ferramentas pessoais no mesmo aplicativo. A revisão não certifica conformidade WCAG, Core Web Vitals nem indexação por buscadores.

## SEO

- O `TitleStrategy` centraliza título, descrição, robots, canonical sem query string, Open Graph/Twitter e JSON-LD (`WebSite` na Home; `WebPage` nas páginas públicas). O servidor completa os metadados no HTML SSR usando `PUBLIC_SITE_URL`, sem confiar no `Host` da requisição.
- Páginas públicas em SSR: Home, catálogo/itens, receitas, referências, mapa de nodes, ferramentas públicas e páginas legais. SSR foi mantido porque esses caminhos devem entregar conteúdo e metadados sem depender da execução do JavaScript do crawler. O catálogo consulta dados por região; por isso o HTML tem `private`/`Vary: Cookie` e não usa cache compartilhado.
- Páginas pessoais continuam client-side, `noindex,nofollow` e `private,no-store`; não entram no sitemap. Isso evita indexar áreas de armazém, equipamento, configurações, conta ou recomendações.
- Caminhos desconhecidos agora entregam página 404 com status HTTP 404 e noindex, em vez de redirecionar para a Home. Caminhos com barra final recebem 308 para a URL sem barra; `/sobre/index.html` e `/sobre/` também são normalizados.
- `/robots.txt` anuncia o sitemap quando `PUBLIC_SITE_URL` está configurada. O sitemap é gerado pela API em lotes de até 10 mil e contém as páginas públicas, itens, receitas e referências do dataset SA/pt ativo. URLs dinâmicas só aparecem quando há dataset publicado.
- `og-black-market.png` fornece uma imagem social de 1200×630. Localhost, loopback e hosts `.invalid` recebem noindex; produção precisa definir `PUBLIC_SITE_URL` com o domínio canônico HTTPS.

## Performance

- A divisão por rotas já existente foi preservada. OCR/Tesseract, autenticação e páginas não visitadas são chunks sob demanda; imagens de itens mantêm a origem otimizada do catálogo; não foram adicionadas fontes externas ou bibliotecas de SEO.
- Comparação de build Angular de produção disponível nesta revisão:

| Medida do bundle do navegador                  |             Antes |            Depois |               Variação |
| ---------------------------------------------- | ----------------: | ----------------: | ---------------------: |
| Chunks iniciais, tamanho bruto                 |         428,54 kB |         429,97 kB |       +1,43 kB (+0,3%) |
| Transferência estimada pelo Angular            |         118,77 kB |         119,07 kB |      +0,30 kB (+0,25%) |
| Chunk OCR lazy, bruto / transferência estimada | 450,95 / 85,09 kB | 450,94 / 85,09 kB | essencialmente estável |

Esses valores são os relatórios do compilador, não uma medição de rede real nem de LCP/INP/CLS. A pequena variação inicial vem dos metadados/estratégia de título. Não havia amostra confiável de Core Web Vitals antes da alteração.

- Os assets com hash usam cache longo; o HTML pessoal não é armazenado em cache; o sitemap usa cache de uma hora. O HTML público varia por cookie de região e continua privado. Não há regra de CDN ou configuração Cloudflare no repositório. Compressão gzip/Brotli deve ser habilitada e medida no host/CDN de produção; não foi presumida como concluída.
- O build atual mantém warnings conhecidos: Angular usa dados de locale `pt` como fallback para `pt-BR`; `tesseract.js`/`regenerator-runtime` CommonJS ficam no chunk de OCR. OCR já é carregado sob demanda; a melhoria adicional depende de uma distribuição ESM ou worker devidamente suportado.
- Não foi adicionado prerender estático: páginas consultam dataset por região, que pode mudar sem novo deploy. Uma opção futura é prerenderizar apenas conteúdo legal e institucional se a operação justificar.

## Acessibilidade

- A navegação compartilhada já inclui link para pular ao conteúdo, landmark `main`, navegação nomeada, foco visível de 3 px, controles/labels e suporte a `prefers-reduced-motion`. A nova página 404 usa um heading principal e links claros para continuar.
- Os tokens de tema foram calculados pela fórmula WCAG de luminância sRGB: texto/fundo 15,00:1; texto secundário/painel 8,08:1; acento/fundo 8,24:1; borda de controle/painel 4,83:1. São combinações de tokens sólidos, não pixels medidos de todos os componentes/estados.
- O smoke SSR verifica `lang="pt-BR"`, presença de `main` e `h1`, footer e links legais, metadados únicos, CSP, 404 e noindex privado. Os testes de componentes existentes também exercitam controles e labels.
- Lighthouse, axe e Playwright não estão instalados/disponíveis neste checkout; não foram adicionados para esta revisão. Uma leitura da árvore acessível local não pôde validar conteúdo: a Home em `localhost:4200` mostrava a mensagem de falha de carregamento da aplicação. A auditoria visual de breakpoints, teclado, zoom 200/400%, leitores de tela, contrastes de componentes próprios e hidratação ainda precisa ser feita com o backend acessível.

## Validação e pendências

- `pnpm --filter @bdo/web build`: passou. Relatório de tamanho acima; warnings de locale e CommonJS descritos acima.
- `pnpm test:ssr`: passou com um servidor de API local simulado. Confere páginas públicas SSR, títulos/metadados/canonical/JSON-LD, sitemap e robots, redirecionamento 308, imagem social, noindex privado e 404.
- `pnpm --filter @bdo/web test`: 27 arquivos e 71 testes passaram; `pnpm test` em paralelo teve dois timeouts de 5 s por concorrência de builds; os dois testes foram aprovados no re-run isolado e a suíte web completa passou.
- `pnpm check`: passou (lint, Prettier e typecheck). Dois arquivos identificados fora de formatação no primeiro ciclo foram corrigidos antes da validação final.
- `pnpm build`: passou para os pacotes e aplicações web/API. Os avisos de locale/CommonJS listados acima continuam presentes.
- Não foram obtidas notas Lighthouse nem métricas de campo. Para produção, configurar `PUBLIC_SITE_URL`, validar sitemap e canonicals no domínio HTTPS, medir compressão/cache no host e executar Lighthouse em desktop e mobile, além da inspeção manual assistiva.

## Melhorias futuras

1. Medir Lighthouse/CWV em uma URL pública real com backend e dados carregados; registrar LCP, INP e CLS antes de otimizar.
2. Ativar compressão Brotli/gzip e cache de HTML público no gateway somente depois de definir uma chave de cache que respeite a região; nunca compartilhar HTML pessoal.
3. Corrigir os dados de locale por uma configuração Angular formal de `pt-BR` quando o catálogo exigir formatos diferentes do fallback `pt`.
4. Automatizar auditoria axe/Lighthouse em CI se a frequência de mudanças e um host de preview justificarem o tempo de build.
5. Revisar links, heading order, contraste específico e operação por teclado/leitor de tela nos componentes de dados após ativar o backend real.
