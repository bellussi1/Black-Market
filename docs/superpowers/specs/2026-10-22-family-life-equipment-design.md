# Equipamento de Vida da Família e importação revisável

**Estado:** spec para revisão do usuário
**Data:** 22/10/2026
**Escopo aprovado para formalização:** editor de equipamento de Vida no nível da Família, ligado ao OCR revisável da captura de equipamento.

## Objetivo

Permitir registrar, revisar e consultar equipamento de Vida organizado por profissão e pela Família. Uma captura real pode sugerir itens e aprimoramentos, mas nada será aplicado ao perfil até a pessoa confirmar cada campo incluído.

O trabalho fecha a pendência J09 do relatório de jornada e melhora a recuperação de itens, níveis e quantidades sem transformar sugestão visual em dado confirmado. As imagens originais permanecem no diretório privado `prints-reais-ocr/` e fora do Git.

## Fatos e limites confirmados

- O workspace atual guarda `families` por região em `workspaceSchema`; cada personagem guarda seu equipamento de combate em `characterSchema.gear`. O novo campo ficará no perfil da Família e será opcional para ler backups existentes. O contrato atual usa o workspace JSON e não exige adicionar uma coluna relacional.
- As notas oficiais SA de 03/09/2026 descrevem equipamento de Vida compartilhado pela Família, itens organizados por conteúdo de Vida e efeitos comuns para acessórios, pedra de alquimia e Orbe da Pureza. Também listam ferramentas, trajes, artefatos, mosquete de caça e outras categorias.
- As notas oficiais SA de 17/09/2026 avisam que o espaço de Nó pode aparecer desativado sem traje de Pérola preparado. Um espaço visível ou moldura na imagem, portanto, não prova que exista um item equipado.
- A captura `gear-lifeskill.jpeg` mostra a opção Coleta, mas não comprova sozinha um rótulo semântico seguro para cada moldura. Ícones cinza e espaços vazios não serão tratados como item identificado.
- O catálogo público do Codex pode confirmar a identidade textual de itens como a Enxada Manos (ID 16479), mas não comprova o item exibido em um recorte do jogador. O Garmoth apresenta um construtor de equipamento de combate e maestrias, sem um editor público confirmado para essa roda de Vida. BDO Workshop e BDOLytics não renderizaram as áreas relevantes nesta consulta; a ausência de conteúdo não prova que não tenham a função.

## Modelo de dados

Adicionar a `familyProfileSchema` um bloco opcional `lifeEquipment`, com default vazio:

- `sharedItems`: acessórios, pedra alquímica e Orbe da Pureza que a pessoa classificou como comuns às profissões;
- `bySkill`: lista separada para cada uma das 11 profissões já declaradas em `lifeSkills`.

Cada item salvo terá um identificador interno estável (`id`), um `catalogItemId` selecionado no catálogo, o nome do catálogo, o tipo escolhido pela pessoa, rótulo de posição opcional e texto de aprimoramento opcional. Tipos controlados: ferramenta, traje, acessório, artefato, pedra de luz, mosquete de caça, Nó, pedra alquímica, Orbe da Pureza e outro. A lista aceita várias ferramentas e artefatos por profissão. Conforme a fonte oficial consultada, apenas acessórios, pedra alquímica e Orbe da Pureza podem ser registrados em `sharedItems`; demais tipos pertencem a `bySkill`. O mesmo `catalogItemId` não pode aparecer simultaneamente nas listas comuns e da profissão. O campo de aprimoramento guarda o texto conferido, sem derivar bônus, estatísticas ou níveis numéricos quando o tipo do item não os comprova.

Itens sem ID do catálogo, tipo, escopo ou confirmação de inclusão continuam somente na revisão do OCR. Registros manuais e importados usam o mesmo contrato e exigem escolha no catálogo. Texto de aprimoramento ausente permanece `null`, nunca `0`; só se oferece esse campo quando o item e a captura indicarem que há aprimoramento. O OCR não preenche `slotLabel`; a pessoa pode nomear a posição quando a evidência ou o conhecimento do jogo forem suficientes.

O perfil permanece no nível Família/região, separado do equipamento de combate do personagem. Perfis e backups sem `lifeEquipment` continuam válidos, com listas vazias após a leitura. Não elevar `schemaVersion`, migrar o banco ou modificar a estrutura dos personagens nesta etapa.

## Experiência de uso

Na aba Equipamento da Família, preservar o painel de combate existente e adicionar uma área de Vida com:

1. seletor para as 11 profissões existentes;
2. bloco de itens comuns da Família;
3. lista editável da profissão selecionada, com inclusão pelo catálogo e remoção explícita;
4. rótulo da posição, tipo e aprimoramento exibidos junto do nome;
5. confirmação de salvamento ligada ao comportamento atual do workspace.

Na revisão da captura:

1. reconhecer a tela de equipamento de Vida somente por texto/controles compatíveis; se a profissão estiver ilegível, solicitar seleção manual;
2. enviar molduras encontradas como recortes de sugestão, sem definir automaticamente tipo, posição, profissão, item escolhido ou aprimoramento;
3. oferecer os grupos `comum à Família` e `profissão selecionada`; a pessoa escolhe um deles para cada item;
4. manter campos ambíguos pendentes, permitindo descartar cada recorte;
5. salvar apenas linhas com item de catálogo selecionado e inclusão confirmada. Aprimoramento e posição só são salvos quando explicitamente conferidos.

Se o layout não puder ser segmentado com segurança, manter a recusa legível e oferecer cadastro manual ou recorte único. Nunca converter uma captura desconhecida em armazém.

## Persistência e segurança dos dados

- Usar `WorkspaceStore.update()` e o perfil `families[region]` já existente. Não criar sincronização automática nem alterar a cópia remota.
- Não persistir os bytes da captura. O registro de importação pode guardar modo, quantidade salva, região e hash conforme o contrato já usado pelo scanner.
- Não editar os personagens QA, os planos, o armazém ou os equipamentos de combate existentes por script.
- Não interpretar item, slot ou nível com base apenas em semelhança, cor de raridade, ícone cinza ou valor de um concorrente.

## Fora de escopo

- Aplicar efeitos de equipamento a maestria, recomendações, calculadoras ou atributos; nenhuma fórmula está incluída.
- Equipar, trocar ou sincronizar itens dentro do jogo.
- Identificação automática de todos os IDs, aprimoramentos ou posições da roda sem revisão.
- Fazer backup, upload ou publicação das capturas privadas.
- Suporte a páginas, rodas ou categorias não cobertas pelas evidências reais desta etapa.

## Critérios de aceitação

1. Um workspace anterior sem `lifeEquipment` é validado e preserva personagens, equipamento de combate, família, presets e demais dados.
2. É possível consultar, incluir e remover itens comuns e itens de cada uma das 11 profissões, sem alterar o personagem ativo ou seu equipamento de combate.
3. A captura real de Vida reconhece a profissão quando a evidência textual é inequívoca; caso contrário, pede confirmação manual.
4. Sugestões de item, tipo, posição e aprimoramento começam pendentes. A persistência só inclui linhas revisadas e confirmadas.
5. Molduras vazias, cinzas, incerteza de OCR e itens fora do catálogo nunca viram item, ID ou nível zero automaticamente.
6. Captura PvP continua usando seu fluxo e slots de combate atuais; a extensão de Vida não muda seus resultados.
7. Testes cobrem parsing de backups antigos, limites/duplicidade dos itens, edição por profissão, seleção do escopo comum/profissão e importação parcial/descartada.
8. Regressões privadas exercitam as capturas fornecidas por caminho local e hash; os arquivos permanecem fora do Git. Evidência pública contém texto de resultado dos testes e do OCR, sem nome de conta, tokens ou bytes da captura privada.

## Verificação e evidência

Executar os testes focados do schema, editor da Família e scanner; depois `pnpm check`, `pnpm test`, build Web e SSR. Inspecionar diffs e verificar hashes dos oito arquivos originais. Registrar comandos, contagens e limites no relatório existente `docs/research/player-journey-audit-2026-10-22.md` e substituir `docs/ACTIVE_CONTEXT.md` ao fim.

Uma nova captura do produto no navegador seria evidência adicional. Nesta formalização, o navegador conectado bloqueou a observação de `localhost:4200` pela política de URL; não será substituída por captura de outra superfície. Se o bloqueio persistir na implementação, testes e regressões locais continuam obrigatórios e a limitação será registrada.

## Pesquisa pública usada

- [Notas oficiais SA de 03/09/2026 — integração de Equipamento de Vida](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8539): compartilhamento familiar, categorias e itens comuns.
- [Notas oficiais SA de 17/09/2026](https://www.sa.playblackdesert.com/pt-BR/News/Notice/Detail?groupContentNo=8594): estado do espaço de Nó sem traje preparado.
- [Garmoth — Gear Builder](https://garmoth.com/character/default/): construtor de equipamento/estatísticas de combate; não confirma esta roda de Vida.
- [BDO Codex — Enxada Manos](https://bdocodex.com/gl/item/16479/): referência pública para identidade e descrição de um item; não confirma OCR de ícone.
- BDO Workshop e BDOLytics: páginas relevantes dependentes de JavaScript/sem conteúdo acessível nesta consulta; comparação funcional continua limitada.
