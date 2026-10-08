# Analytics de produto

## Plano e configuração

PostHog Cloud é o único analytics preparado. Desligado por padrão, sem SDK, autocapture, replay, dados de conta, nomes, URLs/query strings, valores de estoque ou imagens. Usuários ativos e retorno correspondem a **navegadores consentidos**, não a todas as pessoas nem identidades autenticadas. Limpeza de armazenamento e dispositivos diferentes alteram a contagem.

1. Criar um projeto PostHog Cloud na região escolhida após avaliar transferência internacional.
2. Copiar apenas a Project API key `phc_...`. Nunca uma Personal API key.
3. No arquivo privado de produção: `ANALYTICS_ENABLED=true`, `POSTHOG_PUBLIC_KEY`, `POSTHOG_HOST=https://eu.i.posthog.com` ou `https://us.i.posthog.com`.
4. Recriar API; usar frontend compilado para produção. Desenvolvimento/testes ficam desativados.
5. Rejeitar no banner: verificar ausência de Capture na rede. Aceitar: conferir eventos em Activity/Live events. Revogar e repetir. Essas validações externas estão **pendentes**, sem chave configurada.
6. Não ativar Web Analytics simultaneamente no Cloudflare; desabilitar injeção automática do beacon.

## Eventos implementados

| Evento              | Propriedades permitidas               | Objetivo / emissão                                                                                                                            |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `page_viewed`       | `feature`                             | Navegação entre famílias de ferramentas; rotas de itens não enviam IDs; consecutivos da mesma família são suprimidos                          |
| `journey_started`   | `feature`, `action`                   | Consulta de mercado, leitura de print, envio de cópia da conta                                                                                |
| `journey_completed` | `feature`, `action`, `status=success` | Salvar personagem/plano/receita; importar estoque; aplicar print de estoque/equipamento; consulta de mercado concluída; enviar cópia da conta |
| `journey_failed`    | `feature`, `action`, `status=failed`  | Consulta de mercado rejeitada ou operação de conta com falha, sem mensagem original                                                           |

Ações: search/save/import/calculate/sync/read_print. Famílias tipadas no `AnalyticsService`. Nem todo botão ou cálculo reativo gera evento. Não atribuir um abandono individual se não houver início correspondente. No funil de prints, início usa read_print e conclusão import: filtrar ambas por feature=scans. Falhas de conta são agregadas, não um funil exclusivo de upload.

## Dashboards nativos

- Trends: usuários únicos com `page_viewed`, agrupamento diário/semanal; DAU/WAU/MAU de consentidos.
- Trends: contagem e usuários únicos por feature; comparar semana anterior e últimas 4 semanas para adoção/perda de uso.
- Retention: primeiro page_viewed → retorno page_viewed, por semana; 4–8 semanas.
- Paths: eventos page_viewed agrupados por feature; jornadas mais comuns.
- Funnels: market started/search → completed/search; scans started/read_print → completed/import; account started/sync → completed/sync. Janela inicial de 30 minutos, revisar com dados.
- Trends: journey_completed por feature/action; principais conclusões, evolução temporal. Sessão não é gravada.

## Limites e custos

[PostHog pricing](https://posthog.com/pricing): 1 milhão de eventos/mês gratuitos, um projeto no modo gratuito e retenção de um ano. Não adicionar cartão inicialmente. O modo gratuito interrompe uso ao atingir franquia; conferir condição no painel contratado. Se houver cobrança habilitada, definir billing limit de produto em zero ou orçamento explicitamente aprovado e alertas de uso. O código limita 100 emissões por instância de navegador; **isso não é um teto global antifraude**. Rever volume a 70% da cota, manter flags para interromper coleta. O endpoint público Capture pode receber eventos falsificados; não usar analytics para autorização, saldo ou cobrança.

Testes cobrem rejeição, aceitação, persistência, expiração, revogação, cancelamento pendente, ausência de scripts, UUID inválido, propriedades sensíveis, duplicação de navegação e ambiente de desenvolvimento. Não foi construída dashboard própria.
