# Revisão de UI, carregamento e movimento — 16/10/2026

Pedido do usuário: procurar novamente erros de UI, melhorias, transições, animações suaves, loading e problemas relacionados. Escopo desta rodada: shell/busca/menu, Mercado e ficha de equipamentos/itens, preservando Life Skills e cálculos existentes.

## Achados e correções

| Before                                                                                              | After                                                                                                                         | Why                                                                                   |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Busca global abria mantendo o foco no gatilho; Escape não fechava o painel (reproduzido no browser) | Foco no input após render do picker deferido; Escape/Fechar devolvem foco ao gatilho                                          | Busca utilizável imediatamente por teclado, sem timers ou listeners globais           |
| Menu móvel sem fechamento por Escape                                                                | Escape fecha o menu e retorna foco a Menu                                                                                     | Mantém orientação do teclado sem transformar o menu inline em modal                   |
| Gear declarava descrição indisponível durante a requisição; falha sem nova tentativa                | Loading explícito e skeleton com nome preservado; retry de catálogo sem alterar equipamento; cancelamento anterior preservado | Distingue espera, ausência e erro; não exige recarregar a página                      |
| Categorias/filtros do Mercado com transition:all; linhas deslizando em cada atualização             | Propriedades de cor/borda explícitas em 140 ms; linhas estáveis                                                               | Evita animação acidental de geometria e repetição em dados consultados frequentemente |
| Seleção do gear mudava bruscamente; alvos móveis com 40 px e links pequenos                         | Transições de cor/borda em 140 ms, Menu e links de conta com altura mínima de 44 px                                           | Feedback discreto e controles mais fáceis de alcançar                                 |

Movimento novo apenas no skeleton assíncrono: pulso de opacidade, sem layout/transform, desativado em reduced-motion. Transições de controles usam o token --bm-motion-fast. Navegação de teclado e tabelas não recebem entrada decorativa. Mantida a proteção global existente a movimento reduzido. Não foram adicionadas bibliotecas nem animação geral em cada troca de página.

## Referências públicas e limites

Consulta em 16/10/2026, apenas leitura pública:

- [BDO Workshop](https://bdoworkshop.com/gear-progression): timeout nesta rodada; captura/revisão de gear anterior em gear-lifeskill-layout-2026-10-16.md continua referência histórica, sem alegar nova medição.
- [BDO Codex](https://bdocodex.com/us/): leitor bloqueado/restrito nesta consulta; não verificar loading/interações por inferência.
- [BDOLytics](https://bdolytics.com/en/NA): redireciona para /en, sem conteúdo extraído; sem comportamento dinâmico certificado.
- [Garmoth Character](https://garmoth.com/character/default): shell público inglês/EU com builder, comparação e seções de atributos; leitor não comprova duração/easing ou equivalente de teclado/retry. Nenhum algoritmo ou métrica externa usado.

Esta é uma correção de apresentação/interação, sem comparação matemática ou alteração de fórmulas. A evidência primária dos defeitos é o próprio aplicativo e testes controlados.

## Validação e limites

RED: quatro falhas novas em busca/Escape, menu, loading e retry. GREEN focado: 20/20 em quatro suítes. Revisão independente e gates globais em andamento. Evidência local ignorada em output/playwright/ui-polish/.

QA privado com sessão OAuth real, leitor de tela real e toda a matriz de telas/dispositivos continuam pendentes; não declarar auditoria exaustiva. O gear usa testes de componente para espera/erro/retry, sem contornar autenticação no navegador. Variações de duração por hardware/rede não foram quantificadas.
