# Atualização e cobertura do catálogo

## Diagnóstico: Fármaco da Harmonia

O item **1399, Fármaco da Harmonia**, já estava no catálogo SA/pt. A busca antiga só comparava o início do nome, preservando acentos. Isso impedia buscas como `farmaco da harmonia` e `harmonia`.

A busca agora normaliza acentos, procura as palavras em qualquer parte do nome e aceita o código numérico. Nomes exatos e prefixos têm prioridade. `%`, `_` e barras são tratados como texto literal. Um índice GIN/pg_trgm atende à busca parcial. Os nomes originais continuam intactos.

A ficha também existe no [Codex](https://bdocodex.com/pt/item/1399/). A consulta confirmou a identidade do item, sem importar o HTML do concorrente ou usá-lo como contrato de dados.

## De onde os concorrentes conseguem dados

- O administrador do Codex [declarou em 2020](https://bdocodex.com/forum/viewtopic.php?t=241) usar ferramentas próprias para extrair e transformar dados do cliente.
- Em [uma resposta de 2022](https://bdocodex.com/forum/viewtopic.php?f=2&t=376), ele explicou que os arquivos de receitas consultados não eram completos e que parte dos dados havia sido movida para o servidor. É uma declaração histórica, não uma medida da cobertura do cliente atual.
- A pesquisa de BDOLytics/Workshop não comprovou a origem exata nem o processo interno de atualização de seus catálogos. Não assumir que existe uma API aberta de todos os itens/receitas.
- Preços são outro fluxo: o Arsha consulta o mercado e mantém cache. Isso não fornece nomes em todos os idiomas, receitas completas ou inventário pessoal.

Relatórios completos em [pesquisa das referências](research/README.md).

## Fluxo implementado para o mantenedor

`scripts/sync-game-catalog.ps1` compara o índice PAZ/localização do cliente instalado com a versão ativa do banco. Sem mudança, não extrai nem importa novamente.

```powershell
# Apenas conferir a versão instalada versus o catálogo ativo
./scripts/sync-game-catalog.ps1 -CheckOnly

# Após a Steam concluir o patch, sincronizar o cliente com a plataforma
./scripts/sync-game-catalog.ps1
```

Quando necessário, o comando extrai para uma pasta nova, confere procedência, constrói a imagem, faz backup do banco, aplica migrações, publica imagens e importa o catálogo em uma transação. Só depois do sucesso a nova versão fica ativa. A publicação anterior permanece em falhas de importação. `-SkipBuild` exige uma imagem local já construída com o código atual.

O identificador usa hashes do índice/localização e revisão do extractor; não calcula hash de todos os arquivos PAZ. `ImportRevision` identifica mudanças no contrato do importador. Ao alterar esse contrato, mudar a revisão para evitar tratar uma importação antiga como equivalente.

**Limites atuais:** o comando não instala patches da Steam, não foi agendado e não transfere sozinho arquivos ao servidor de produção. A conferência desta entrega indicou que o catálogo corresponde ao cliente instalado. Isso não comprova que a Steam já instalou o último patch oficial nem que o extractor conhece todos os campos desse patch. A ramificação com um patch novo ainda precisa de validação operacional quando houver mudança real dos arquivos.

## Operação pública planejada

1. Manter uma máquina de extração com cliente SA atualizado e conta de serviço para publicar artefatos.
2. Executar conferência após patches; extrair por idioma existente, validar contagens, campos obrigatórios e relações.
3. Transferir artefatos versionados para armazenamento privado e publicar imagens autorizadas no CDN.
4. Importar em staging, comparar com o catálogo anterior e promover após revisão. Expor data de atualização ao jogador.
5. Repetir coleta de preços separadamente, com cache, limites e monitoramento de falhas.

Esses passos de implantação/agendamento não estão configurados nesta versão local. Não prometer “todos os itens atualizados em tempo real” sem evidência de cobertura e uma operação ativa.

## Dados que ainda precisam de integração

O [inventário dos 23 conjuntos](extracted-data-inventory.md) lista campos, quantidades e checksums reais. `manufacture.json` contém 7.066 entradas com `group`, `type`, `success` e `inputs`, sem resultados declarados. A extração atual não relaciona automaticamente essas entradas aos produtos finais. O item 1399, por exemplo, existe, mas não tem receita de produção nas relações importadas. Não inferir resultados pelo número do grupo.

Os 730 registros sem nome localizado, itens sem imagem e demais relações pendentes precisam de curadoria e diagnóstico por patch. Para inglês é necessário um cliente/arquivo de localização inglês válido; a instalação atual só fornece português e espanhol. Não usar tradução automática como se fosse nome oficial do jogo.

## Interface preenchida com dados reais

A oficina busca receitas pelo produto e preenche materiais, quantidades conhecidas, estoque e cotações já salvas na região. Não consulta preços massivamente nem transforma uma cotação antiga em “atual”. Rendimento ou quantidade ausente exige entrada do jogador antes do cálculo. Tempo, custos extras e condições pessoais continuam editáveis. A biblioteca de cadeias manuais permanece separada.
