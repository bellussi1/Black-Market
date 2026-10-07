# Deploy e custos

## Implantação enxuta

- **Frontend:** Cloudflare Pages para saída estática do Angular (`apps/web` como diretório base ou build no root com `pnpm --filter @bdo/web build`; publicar `apps/web/dist/web`). Usar domínio, TLS, cache de assets e regras de segurança na borda.
- **API:** host Node/container compatível com NestJS 12 (o Dockerfile do repositório). Railway é uma opção simples de hobby, mas cobra uso e seu valor mínimo/limites mudam; comparar a página oficial de [preços Railway](https://railway.com/pricing) na data de deploy. Uma VPS pode custar menos em uso constante, com maior manutenção.
- **PostgreSQL:** banco gerenciado no mesmo provedor/região da API reduz latência e egress. Railway oferece banco como serviço; alternativamente, PostgreSQL numa VPS ou serviço gerenciado. Não presumir que os planos gratuitos sejam persistentes, sem expiração ou adequados para produção.
- **Cloudflare R2:** opcional; adicionar somente quando existir mídia própria com permissão de hospedagem. Não guardar arquivos de instalação do jogo.

O domínio e TLS podem ficar na Cloudflare, mas DNS/CDN/WAF não executam o NestJS nem hospedam PostgreSQL. Workers/Pages Functions têm ambiente e limites diferentes de um processo Nest tradicional. O app conecta PostgreSQL por TCP usando `DATABASE_URL`; não introduzir Hyperdrive se a API roda fora de Workers.

## Ambiente de produção

1. Criar API e PostgreSQL em uma região próxima; configurar TLS e pool pequeno.
2. Definir `DATABASE_URL`, `PORT`, `WEB_ORIGIN` e `NODE_ENV=production` como variáveis secretas/configuração.
3. Aplicar migrations versionadas antes de trocar tráfego; ter backup e plano de restore.
4. Publicar `apps/web/dist/web` no Pages com fallback SPA para `index.html`.
5. Configurar domínio/API CORS para domínio final, health check `/ready`, rate limits e logs sem segredos.
6. Validar rollback da aplicação e restauração do banco antes de carga real.

## Controle de despesa

Para a primeira validação, desenvolvimento local custa zero de hospedagem. Para uma demonstração pública, começar com os menores recursos pagos que garantam persistência; preço baixo nominal pode ter franquia, pausa, expiração e cobrança por uso. Limitar histórico de preços, backups e logs; alertas de gasto e limites de conexão devem ser configurados no provedor. Reavaliar antes de ativar coleta frequente ou login. Não prometer um custo mensal fixo sem região, tráfego, retenção e plano escolhidos.
