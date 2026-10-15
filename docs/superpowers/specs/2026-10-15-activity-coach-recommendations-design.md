# Coach de Atividades — refatoração de Recomendações

## Objetivo

Refazer a experiência completa da rota `/recommendations` para responder primeiro à decisão do jogador: **o que vale mais a pena fazer agora, dentro das atividades que ele prefere?** O Coach deve reaproveitar perfil, maestria, armazém, receitas, planejador de produção e cotações já disponíveis, reduzindo a configuração manual e explicando por que cada recomendação aparece.

O resultado é uma estimativa para planejamento e progressão de gear. Não garante preço, liquidez, disponibilidade de compra nem lucro realizado.

## Evidência da pesquisa

- A pesquisa tem 31 respostas e é exploratória, sem pretensão de representar toda a comunidade.
- Calculadora de custo/lucro foi escolhida por 20 pessoas; mapa de coleta por 18; receitas com etapas claras por 17; comparação de atividades por retorno/hora por 10.
- Coleta, Alquimia, Grind/PvE e Pesca aparecem com maior frequência na rotina (19, 16, 14 e 13 respostas, respectivamente).
- Dez pessoas apontaram, cada uma, dificuldade com dados atualizados, entendimento de cálculos ou localização de informações/filtros. Dezessete disseram perder tempo procurando ou conferindo dados.
- Uma resposta aberta propôs integrar preferências, gear, maestria, armazém, compra/produção, liquidez e alternativas de grind. Outra pediu recomendações de Life Skill ou Grind a partir dos materiais no armazém.
- Vinte pessoas preferiram uma tela equilibrada, com resumo e detalhes quando necessários; 25 consultam essas ferramentas no computador enquanto jogam.

Esses sinais orientam a experiência, mas não substituem validação de uso nem autorizam afirmar que a maioria exige uma funcionalidade específica.

## Diagnóstico do checkout

A rota atual já implementa uma comparação econômica extensa, mas a ordem e os controles colocam o custo de preparação no jogador:

1. É preciso acionar `Carregar catálogo`.
2. Tempos por método precisam ser informados para classificar lucro/hora; calibrações específicas de fórmula são editadas na página.
3. A consulta de preços é uma ação separada, seguida por uma tabela paginada de preços manuais.
4. A pessoa pesquisa/filtra milhares de fórmulas, seleciona uma receita para ajustes adicionais e só então aciona a comparação.
5. Teste com personagem fictício e preços de demonstração ocupam o fluxo normal da página.

O resultado existe depois de várias tarefas de configuração; a rota não começa pela recomendação. Perfil e estoque já estão no workspace; `activeMinutes`, prata, peso e maestrias fazem parte do perfil. O motor compara cenários de produção e pode otimizar origens de materiais no grafo da fórmula. A tela de receita já possui otimizador próprio.

Restrições verificadas:

- Não há fonte automática persistente de preços aprovada. Arsha é candidato comunitário para consultas sob demanda, sem permissão/licença e SLA confirmados; coletores ficam desligados.
- Volume de negociação só é conhecido quando a cobertura e a série são suficientes. Estoque/cotação pontual não provam venda provável ou imediata.
- Faltam modelos validados de loot/hora por spot, gear e atividade para comparar Grind/PvE com produção. Maestria ou gear não podem ser convertidos por multiplicador genérico.
- Tempos não disponíveis e cotações ausentes devem impedir a classificação econômica correspondente; não podem ser completados com zero ou suposições silenciosas.

## Decisões de produto

1. **Substituir o fluxo inteiro da página.** Não empilhar um painel Coach acima da oficina/formulário atual. Preservar a rota e reaproveitar serviços, contratos e cálculo onde forem adequados.
2. **Começar pelo resultado.** Ao abrir a rota, carregar em segundo plano o catálogo necessário e selecionar o personagem ativo da região. Se não existir personagem, apresentar uma ação direta para cadastrar/selecionar um; a demonstração permanece secundária.
3. **Preferências não bloqueiam a primeira recomendação.** Na primeira visita, considerar os métodos de produção Life Skill que o catálogo realmente suporta. A pessoa pode marcar as atividades favoritas em um controle compacto; salvar essa preferência no workspace e aplicá-la nas próximas visitas.
4. **Usar os dados que já pertencem à pessoa.** Estoque livre, personagem ativo, maestria, orçamento, tempo de jogo (`activeMinutes`), peso, região e opções de imposto vêm do workspace. Seleção de personagem continua disponível, mas não é uma etapa obrigatória em cada visita.
5. **Eliminar entrada repetida.** Calibrações manuais existentes passam a ser opcionais e persistidas no workspace, associadas ao personagem e à atividade/fórmula. Uma ausência só solicita entrada contextual quando for necessária para completar um resultado; não exibir previamente um formulário para todas as atividades e receitas.
6. **Resolver cotações no fluxo.** Consultar primeiro o cache da mesma região/chave e buscar em segundo plano somente cotações necessárias ao conjunto de candidatos habilitado, obedecendo os limites existentes. Preservar resultados do cache com origem e idade durante atualização/erro. Preços manuais continuam disponíveis como ajuste opcional nos detalhes.
7. **Ranking somente com dados suficientes.** Uma oportunidade entra no ranking de lucro/hora quando a conta tem saída, custos, tempo e cotações necessários. Resultados parciais e pendências aparecem em um grupo separado com causa explícita; não são pontuados como zero nem ordenados como piores oportunidades.
8. **Liquidez não é garantia de venda.** Exibir preço, estoque e volume apenas quando cada campo tiver origem e cobertura identificáveis. Volume desconhecido permanece desconhecido. Um preço cotado não implica que toda a produção poderá ser vendida no lote ou no tempo planejado.
9. **Gear só entra em modelos verificados.** Para Life Skills, aplicar maestrias conforme os calculadores existentes. Presets de gear não alteram lucro/hora sem modelo comprovado por atividade. A comparação entre produção e Grind/Coleta/Pesca aguarda uma etapa separada de dados de sessão.
10. **Sem nova dependência de servidor nesta etapa.** Preferências e calibrações permanecem no workspace local e seguem o mecanismo existente de backup/exportação. Não criar tabelas, coletores ou APIs comunitárias para o MVP do Coach.

## Experiência proposta

### Cabeçalho e controles rápidos

- Título em linguagem de decisão, como “O que vale mais a pena fazer?” e uma frase curta de contexto.
- Usar automaticamente o personagem ativo. Troca de personagem fica disponível junto do nome e de indicadores essenciais, sem um painel inicial longo com todas as estatísticas.
- Mostrar o tempo disponível do perfil de forma compacta e editável no contexto; não duplicar `activeMinutes` com uma segunda configuração sem fonte definida.
- Atividades favoritas aparecem como opções compactas e editáveis. Sem preferência salva, todas as categorias Life Skill suportadas entram no primeiro cálculo, evitando uma configuração obrigatória antes de ver valor.
- Atualização de preços é automática/cache-first. Ação de atualizar pode existir como controle secundário, nunca como pré-requisito para exibir conteúdo já válido.

### Resultados

- A primeira área de conteúdo mostra as melhores oportunidades completas dentro das atividades habilitadas, com lucro líquido estimado por hora como métrica principal.
- Cada resultado mostra também, de forma compacta, lucro do lote/tempo, desembolso necessário, custo econômico do estoque próprio, quantidade e disponibilidade de venda conhecida.
- Um motivo curto explica a recomendação, por exemplo: atividade selecionada, maestria aplicada, insumos disponíveis, compra necessária e vantagem relativa aos demais cenários completos.
- Detalhes sob demanda contêm etapas, materiais, origem/data das cotações, volume/cobertura quando disponível, escolhas comprar/produzir/estoque, impostos, tempos e calibrações.
- Candidatos incompletos ficam em “Dados pendentes” com causas acionáveis (preço, estoque/volume desconhecido, tempo ou rendimento); podem oferecer ajuste manual pontual sem transformar a tabela inteira de insumos na tela inicial.
- A comparação mostra quantos candidatos foram avaliados e quantos ficaram incompletos, sem chamar uma busca parcial de ótimo global.

### Estados

- **Carregando:** manter o resumo e o progresso no fluxo; não bloquear a página inteira nem remover conteúdo válido.
- **Sem personagem:** orientar cadastro/seleção na Família; não criar um personagem fictício automaticamente.
- **Sem preços atuais:** usar fontes alternativas válidas quando existirem, identificar preço antigo/manual/NPC e separar candidatos sem base suficiente.
- **Sem tempos calibrados:** conservar calibração já salva; se faltar, solicitar somente a medição necessária para aquele candidato e salvar no workspace. Não atribuir lucro/hora sem duração válida.
- **Sem resultados completos:** explicar quais dados faltam e oferecer próximo passo. Não preencher com listas falsas, preços simulados ou cartões de atividades sem modelo.
- **Falha no provedor:** manter dados de cache marcados com idade e mostrar a indisponibilidade; não refazer consultas individuais indiscriminadamente para cada material ausente.

## Persistência e compatibilidade

- Preferências de atividades pertencem ao workspace do jogador, não a uma recomendação efêmera.
- Tempos/rendimentos que o jogador calibrar pertencem ao personagem e à chave de método/fórmula, pois podem mudar conforme personagem/equipamento/contexto.
- Novos campos precisam aceitar backups locais anteriores por meio de defaults/validação compatível; preservar todos os dados existentes ao carregar e salvar.
- Nenhum dado de armazém, preços manuais ou perfil é enviado para uma tabela pública/comunitária nesta etapa.
- Manter SSR, guard da rota e estado de demonstração sem permitir que a demonstração sobrescreva o workspace real.

## Fora do escopo inicial

- Ranking entre lucro de produção e Grind/PvE, coleta, pesca, caça ou barter.
- Cálculo de AP/DP ou gear score como prova de rendimento por spot.
- Coleta ou armazenamento automático persistente de preços de todo o catálogo.
- Submissão comunitária de logs, OCR de loot, agregação de benchmarks e moderação.
- Integração oficial de armazém/conta Pearl Abyss. Só considerar após autorização formal e desenho de consentimento/revogação.
- Overlay dentro do jogo.

Essas áreas podem ser especificadas depois com origem, licença, validação, cobertura e regras de privacidade próprias. A experiência inicial não deve insinuar que já compara tais atividades.

## Critérios de aceite do redesenho

1. O primeiro uso não exige botões separados para carregar o catálogo e iniciar a consulta de mercado.
2. Com personagem existente, a rota abre o Coach já associado ao personagem ativo e reaproveita estoque, maestria, orçamento, tempo, peso e região.
3. A tela inicial não pede preço manual de cada ingrediente, calibração de todos os métodos nem pesquisa de uma receita específica para mostrar as primeiras recomendações possíveis.
4. Filtros de atividades preferidas são editáveis, persistidos no workspace e afetam quais candidatos entram no cálculo.
5. Mercado usa cache e fonte já configurados, busca apenas o conjunto necessário e mostra idade/origem. Uma falha ou resposta incompleta não gera fan-out de chamadas por ingrediente nem lucro inventado.
6. Resultado completo mostra lucro líquido/hora e custo/tempo/lote; a explicação revela dados, premissas e limitações. Estoque próprio tem custo econômico separado do desembolso.
7. Cenários sem custo, tempo ou rendimento necessários aparecem em pendências explicadas e nunca em um ranking completo.
8. Volume desconhecido não é interpretado como zero, e nenhum texto promete venda ou rentabilidade garantida.
9. Ajustes manuais permanecem disponíveis no contexto do item/resultado e persistem quando apropriado, sem serem requisito para preencher uma grade inteira antes do cálculo.
10. Nenhum resultado usa gear para prever produção ou Grind/PvE sem um modelo verificável.
11. Backups existentes continuam carregáveis, e dados reais são preservados ao entrar/sair da demonstração.
12. A página comunica sua cobertura: Life Skill de produção nesta etapa; demais atividades sem ranking até haver dados adequados.
13. Composição BDO segue resumo primeiro e detalhes no contexto, sem excesso de cartões aninhados; a tela funciona com teclado, leitor de tela, conteúdo longo, desktop e viewport móvel.

## Pontos de atenção para o plano

- O maior risco não é o layout: é conseguir candidatos suficientes com cotação e tempo confiáveis sem voltar a solicitar toda a configuração manual. O plano deve identificar como o catálogo e o cache limitam esse conjunto e como a UI comunica cobertura parcial.
- O índice de volume observado não prova venda realizável. Se o contrato disponível não fornecer um volume confiável, a saída deve dizê-lo e continuar sem esse fator.
- O otimizador por fórmula e o ranking do catálogo têm escopos/limites diferentes; a interface deve declarar o escopo de cada um sem inferir ótimo global.
- A lista de métodos deve derivar do catálogo e do mapeamento existente, sem hardcode de métodos ausentes.
