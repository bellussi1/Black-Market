# Império de nodes e trabalhadores

## Objetivo e referência

O planejador fica em **Bases e trabalhadores**, na rota `/world`, e permite avaliar um conjunto de tarefas, não apenas uma produção isolada. Inspiração funcional: Workerman, especialmente [PlantzonesView](https://github.com/shrddr/workermanjs/blob/4d5a392ab43c56eb09da78a4d982260ab3be3fee/src/views/PlantzonesView.vue) e a [pesquisa anterior](research/garmoth-workerman-arsha.md). A URL `/plantzones` respondeu 404 na consulta de 08/10/2026; o código público da revisão pesquisada permitiu conferir o escopo.

A referência diferencia comparação de bases isoladas e resumo do império com reaproveitamento de conexões. O Black Market implementa seu próprio cálculo e interface; não copia banco, algoritmos de rendimento ou endpoints internos dos concorrentes.

## O que está implementado

- Vários impérios salvos, separados por região, usando o workspace e backup existentes.
- Trabalhadores com nome, espécie, nível e cidade de origem.
- Tarefas com base de destino, duração completa observada, produtos/subprodutos, quantidade média e preços informados.
- Alimentação/outros custos por ciclo, horas de produção por dia, imposto, pacote econômico e bônus de venda.
- Uma tarefa ativa por trabalhador; alternativas pausadas podem continuar na comparação.
- Conexões com menor CP adicional considerando bases já investidas; soma das bases compartilhadas uma única vez no total.
- Custos de infraestrutura por cidade, vagas de alojamento e contribuição adicional de produção.
- Resultado diário líquido, contribuição comprometida, prata/CP/dia, economia de CP compartilhado e saldo do orçamento.
- Comparação por resultado diário ou resultado/CP de rota isolada; filtro pela cidade do trabalhador.
- Avisos para falta de conexão, preço, custo de cidade, alojamento e orçamento insuficiente.
- Validação compartilhada no frontend e no backend, aritmética de prata com BigInt e compatibilidade com backups antigos.
- Evento consentido `journey_completed`, `feature=world`, `action=save`, sem nomes, quantidades ou valores pessoais.

## Como usar

1. Abra **Bases e trabalhadores** e informe nome, horas por dia com o jogo aberto e orçamento de CP destinado a esse império.
2. Cadastre um trabalhador e a cidade onde está alojado. Espécie/nível são identificação, não substituem medição de velocidade ou rendimento.
3. Abra **Alojamento e infraestrutura das cidades**; informe CP conjunto e vagas reais, incluindo vagas gratuitas. Não some a mesma casa duas vezes.
4. Crie uma tarefa e escolha trabalhador/base. Informe o tempo completo de um ciclo, incluindo deslocamento, e custo médio de alimentação por ciclo.
5. Para cada produto/subproduto: preencha quantidade média e preço, depois selecione o item no catálogo. Preço vazio significa desconhecido; zero só deve ser usado intencionalmente.
6. Use CP adicional apenas para investimento de produção que não esteja na rota mostrada. Confira se a sub-base já consta na conexão para evitar dupla contagem.
7. Compare tarefas, pause alternativas e confira os avisos. Marque conexões existentes no resumo para priorizar caminhos com menor investimento novo.
8. Clique **Salvar meu império**. Os botões de adicionar/editar alteram o rascunho; recarregar a página sem salvar perde essas alterações. Exporte o backup em **Dados e backup**.

O usuário não precisa instalar extractor nem fornecer credenciais do jogo. Exportação/importação do império usa o backup nativo do Black Market; ainda não importa JSON/cache do Workerman.

## Regras de cálculo

- Ciclos completos/dia = piso de `horas × 60 / minutos de ciclo`. Não remunera ciclo parcial.
- Receita bruta = soma dos preços × quantidades médias × ciclos; rendimentos médios aceitam três casas decimais. Valores de prata são calculados com inteiros e arredondamento conservador.
- Resultado = receita após imposto/bônus − custos por ciclo × ciclos.
- Contribuição total = união das bases das rotas ativas + infraestrutura das cidades dos trabalhadores cadastrados + contribuição adicional das tarefas ativas.
- A infraestrutura conta também trabalhadores ociosos; pausar tarefa não libera automaticamente suas vagas ou casas.
- Investimentos existentes reduzem a necessidade de novas **conexões**, mas permanecem no CP total comprometido. A métrica de novas conexões não afirma que infraestrutura/sub-bases já estão pagas.
- Ausência de preço ou rota ativa deixa o resultado conjunto incompleto. Ausência de infraestrutura deixa CP e eficiência incompletos; não apresentar subtotal como custo completo.
- Ranking individual não inclui alojamento/armazém da cidade. Resumo conjunto inclui esses custos e elimina dupla contagem de conexões.
- Caminhos mínimos são calculados individualmente e reunidos. Isso não garante a melhor rede global nem a melhor alocação de todos os trabalhadores.

## Dados, privacidade e operação

Nodes/conexões/CP vêm do endpoint próprio `/api/v1/world/nodes`, com dataset extraído ativo. Produtos vêm do catálogo próprio. Tempo, quantidade, alimentação, infraestrutura e preços deste planejador são entradas do usuário: não há feed de drops ou preços automático aqui.

`workerEmpires` é um campo opcional com valor padrão vazio em `workspaceSchema` versão 1. Backups anteriores continuam válidos; a sincronização opcional de conta carrega o mesmo documento. Publicar API e frontend compatíveis juntos, pois uma API antiga pode descartar campos novos durante a validação. Não houve mudança no schema PostgreSQL nem dependência nova.

Os dados ficam no armazenamento funcional já inventariado; só vão à conta quando o usuário usa a sincronização configurada. Não há acesso ao processo do jogo, cache local, upload de imagens ou coleta de identidade dos trabalhadores. Analytics envia apenas categoria/ação do salvamento.

## Evolução no roadmap

**P1 — consolidar o planejador atual:** validar tarefas reais com jogadores SA, clareza de CP/custos/pausas, desempenho com impérios grandes e necessidade de atualização dos preços.

**P2 — comparação automática por base/cidade/trabalhador:** obter fontes autorizadas/versionadas de zonas produtivas, vínculos base→produto, workload, distâncias de ida/volta, velocidade, habilidades, sorte, recursos regionais e rendimentos. Documentar unidades e regras antes de calcular. Pré-preencher apenas valores com fonte/patch confirmados, mantendo correção manual.

**P2 — infraestrutura e alocação:** casas/alojamento/armazém com requisitos, custo incremental de adicionar uma base, compartilhamento entre alternativas e comparação entre cidades. Medir heurísticas antes de prometer ótimo global.

**P3 — atlas/importação:** imagem de mapa permitida, camadas, seleção visual; importação de planejamento de terceiros somente após validar formato/licença e prévia. Nenhuma sincronização automática do estoque ou conta do jogo está demonstrada.

Sem mapas/modelos suficientes, não há paridade com Workerman. A entrega atual é um planejador funcional baseado em rendimentos observados.

## Validação desta entrega

- Suíte local: 105 testes passaram — 24 do pacote de calculadoras, 37 da API e 44 do frontend. Sete testes novos de cálculo/validação e três de componente cobrem o império.
- Builds Angular/SSR e NestJS passaram; lint passou. Avisos anteriores de localização pt-BR com fallback pt e módulos CommonJS de OCR permanecem.
- Ensaio de cálculo local com 1.080 nodes e 100 tarefas sintéticas: 277 ms em uma execução no Node deste computador. Não é medição de navegador/mobile, carga de produção ou validação de fórmulas reais do jogo.
- Revisão visual, acessibilidade completa e confronto com sessões de trabalhadores reais permanecem pendentes. Não foi declarada acurácia de modelo automático, pois o módulo usa entradas observadas.
