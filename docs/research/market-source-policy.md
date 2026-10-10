# Política de fonte de preços do mercado

Revisado em 10/10/2026 para o mercado SA.

## Decisão atual

Ainda não há um feed automático que passe simultaneamente por permissão documentada, estabilidade de contrato e cobertura/consistência medidas. A fonte aceita para dados controlados pelo usuário é a observação manual do Mercado Mundial oficial, incluindo preço informado pelo usuário; ela não é uma API automática. O adaptador Arsha continua classificado como candidato comunitário para consultas sob demanda e não está aprovado como fonte de ingestão, treinamento de histórico ou promessa de disponibilidade.

O README do projeto Arsha descreve o serviço como wrapper de uma API de mercado não oficial e diz que os endpoints foram documentados pela comunidade. A documentação pública menciona cache de 30 minutos e inclui rotas marcadas como desativadas após mudanças da Pearl Abyss. Não encontrei licença de dados, permissão de reutilização comercial ou SLA. Isso não prova que o uso é proibido; significa que não há base para tratá-lo como fonte aprovada e estável.

Os Termos de Serviço oficiais SA dizem que o conteúdo e a propriedade intelectual pertencem à Pearl Abyss e restringem uso lucrativo de informação protegida sem autorização. Os termos não oferecem uma licença de feed de mercado. O Mercado Mundial Web oficial exige que a conta já tenha usado o Armazém do jogo, então não serve como API pública anônima.

## Controles de coleta

- `MARKET_COLLECTOR_ENABLED` controla o coletor de IDs acompanhados.
- `MARKET_BOARD_COLLECTOR_ENABLED` controla a coleta periódica do quadro SA, separada do coletor acima.
- Os dois ficam desligados por padrão, no `.env.example` e em staging. O quadro não deve começar a ser persistido periodicamente enquanto a fonte não passar pelos critérios abaixo.
- `MARKET_PROVIDER_ENABLED` controla consultas sob demanda. Mantê-lo ligado não autoriza coleta agendada: respostas Arsha continuam sendo tratadas como observações comunitárias com `source`, região, horário e estado de cache.
- Não usar endpoints internos de BDOLytics, Garmoth, BDO Codex ou outros sites como contrato do Black Market.

## Critérios para aprovar uma fonte automática

Antes de ligar qualquer coletor, registrar no repositório e revisar:

1. Termos, licença ou autorização escrita que cubra consulta automatizada, retenção, redistribuição e uso comercial pretendido.
2. Contrato publicado e versão do endpoint, limites de uso, política de cache e contato de suporte.
3. Cobertura amostrada por região, categoria, item e variante (`subId`), separando respostas vazias legítimas, IDs ausentes e erros do provedor.
4. Consistência temporal por pelo menos sete dias de observações, comparando IDs/variantes e estrutura, registrando lacunas, resets de contadores e respostas stale. Mudanças reais de preço não contam como falha de consistência.
5. Relatório reproduzível e limite mínimo de cobertura aprovado antes da coleta persistente. Até isso existir, usar cotações informadas manualmente e histórico já existente com sua proveniência.

Uma fonte que não satisfizer os itens 1 e 2 permanece em modo de avaliação sem persistência periódica, mesmo que a resposta pareça tecnicamente válida.

## Evidência consultada

- [README do wrapper api.arsha.io](https://github.com/guy0090/api.arsha.io) — identifica o upstream como API não oficial documentada pela comunidade.
- [Documentação BDO Market API v2](https://www.postman.com/bdomarket/arsha-io-bdo-market-api/documentation/qpavrc8/bdo-market-api-v2) — cache e estado das rotas comunitárias.
- [Termos de Serviço oficiais de Black Desert SA, Art. 23](https://www.sa.playblackdesert.com/pt-BR/Policy?policyNo=96) — direitos de propriedade intelectual e uso lucrativo sem autorização.
- [Mercado Mundial Web oficial](https://na-trade.naeu.playblackdesert.com/) — exige uso prévio do Armazém do jogo para acesso.

As fontes públicas não resolvem a autorização de uso do Arsha. Para mudar a decisão, obter autorização da Pearl Abyss ou contratar uma fonte com licença clara e cobertura verificável.
