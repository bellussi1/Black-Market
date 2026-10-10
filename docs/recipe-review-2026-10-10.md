# Revisão das receitas — SA / português — 10/10/2026

**Resultado: o catálogo ativo apresenta um problema de seleção da fonte regional. Quantidades e cobertura precisam ser corrigidas antes de tratar os cálculos de materiais e lucro por hora como validados.** Esta tarefa foi uma revisão; nenhuma receita, versão ativa ou informação pessoal foi alterada.

## Escopo e resultado

Foram revisados todos os 4.420 registros normalizados da versão ativa, incluindo o suplemento de Edania. O snapshot servido pela API contém 3.228 receitas de profissões:

| Grupo                                                                    | Receitas |
| ------------------------------------------------------------------------ | -------: |
| Alquimia e alquimia simples                                              |    1.040 |
| Culinária e culinária simples                                            |    1.100 |
| Processamento: aquecimento, moagem, secagem, corte, agitação e filtragem |    1.040 |
| Empacotamento imperial                                                   |       48 |
| Oficinas e guildas, fora do snapshot de profissões                       |    1.192 |
| Total do catálogo                                                        |    4.420 |

O adaptador validou as referências de produtos e ingredientes. Não foram encontrados ingredientes vazios, quantidades conhecidas inválidas, duplicações equivalentes por ordenação nem divergências de composição entre extração publicada e API. Isso comprova a consistência da publicação, mas não a correção dos dados de origem.

O `-CheckOnly` da sincronização confirmou que o cliente instalado corresponde à extração ativa (`importNeeded: false`). A revisão também consultou as [notas oficiais de 8/10/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8694), que registram a correção das instruções de Edania nos catalisadores; a falha regional descrita abaixo foi constatada nos arquivos locais e no código do extractor.

## P1 — Pasta regional incorreta na extração

`data/tools/bdo-data-extractor/internal/build/recipes.go:75` busca os XMLs localizados em `ui_html/xml/<idioma>`. Para esta instalação, isso procura `ui_html/xml/pt`, mas os XMLs portugueses estão em `ui_data/ui_html/xml/sa/<id>.xml`. Arquivos espanhóis nessa mesma pasta usam o prefixo `_es_` e foram excluídos da comparação.

Quando não encontra a pasta localizada, o extractor usa os XMLs base. O código em `internal/tables/recipexml.go:139` soma ocorrências de ingredientes sem `<count>` como unidades. Essa regra produz registros como sal ×2 no Reagente Líquido Limpo; o XML regional SA contém sal ×1, com quantidade explícita. O problema chega intacto à API e aos planejadores.

| Exemplo                           | Catálogo ativo | XML português SA |
| --------------------------------- | -------------- | ---------------- |
| Reagente Líquido Limpo #5301, sal | 2              | 1                |
| Cerveja #9213, trigo              | 1              | 5                |
| Cerveja #9213, água mineral       | 1              | 6                |

Trigo, sal e água dos exemplos foram confrontados por ID e quantidade nos XMLs reais, sem inferência de substituição. Fermento ×2 e açúcar ×1 da receita de cerveja já coincidem.

## Cruzamento completo com os XMLs regionais

A extração de auditoria obteve 12.294 arquivos da pasta SA. Foram lidos todos os **6.145 XMLs com nome numérico**, correspondentes ao conjunto português; os demais incluem o conjunto espanhol e arquivos auxiliares. Foram encontradas 4.507 relações de produção associadas a produtos presentes no catálogo de itens.

Para as 3.180 receitas de profissões fora do empacotamento imperial:

| Resultado                                                                         | Registros |
| --------------------------------------------------------------------------------- | --------: |
| Mesmos IDs, método e quantidades que uma variante regional                        |       701 |
| Mesmos IDs e método, mas quantidades diferentes das variantes regionais           |   **573** |
| Há XML regional para o produto/método, mas não a mesma combinação de ingredientes |       295 |
| Não há relação regional correspondente para o produto/método                      |     1.611 |

As **573 divergências de quantidade atingem 386 produtos**:

| Método            | Registros divergentes |
| ----------------- | --------------------: |
| Alquimia          |                    70 |
| Alquimia simples  |                    64 |
| Culinária         |                   206 |
| Culinária simples |                    19 |
| Aquecimento       |                    79 |
| Moagem            |                    26 |
| Agitação          |                    13 |
| Corte             |                    33 |
| Secagem           |                    51 |
| Filtragem         |                    12 |

Há também **702 produtos sem receitas no catálogo ativo que possuem relações nos XMLs regionais**. Desses, 414 possuem pelo menos uma relação de alquimia, culinária ou suas versões simples. Exemplos: Perfume do Mar Profundo #771, Perfume da Sombra Verde #890, Sanduíche de Cogumelo Arco-Íris #9316, Refeição de O'dyllita #9638 e Kimchi Branco #820801.

Essas contagens representam relações dos XMLs, incluindo eventos, subprodutos e equipamentos. Não equivalem a 702 novas receitas convencionais confirmadas no servidor. Os 295 registros de combinações não representadas e os 1.611 sem relação regional também não foram declarados inválidos: substituições e cobertura da fonte precisam ser preservadas e verificadas durante a correção.

## P1/P2 — Dados que continuam ausentes

- **3.220 das 3.228 receitas de profissões têm rendimento ausente** na fonte publicada. No catálogo completo, são 4.412 de 4.420. Não substituir por rendimento fixo nem presumir uma média a partir da maestria.
- **25 linhas de ingredientes imperiais têm quantidade ausente**, distribuídas entre culinária (8) e alquimia (17). O empacotamento exige revisão separada da orientação produto/caixa e das quantidades atuais; não comparar automaticamente a relação inversa do XML à fórmula publicada.
- A comparação complementar com seções explícitas de materiais nas descrições sinalizou 150 registros de 104 produtos. Essa heurística compara nomes exatos e não cobre todas as substituições; os resultados completos estão separados dos achados dos XMLs.

## Correção indicada pela revisão

1. Corrigir a escolha de pasta regional do extractor e testar português SA e exclusão dos XMLs espanhóis. Não converter contagens ausentes dos XMLs base em quantidades presumidas.
2. Gerar uma nova extração isolada e revisar diferenças por produto, método, ingredientes, subproduto e quantidade. Manter variantes válidas e receitas só disponíveis nas outras fontes.
3. Rever o suplemento de Edania contra essa nova extração antes de atualizar seu checksum. A validação existente deve continuar impedindo sua aplicação sobre uma extração não revisada.
4. Só depois fazer backup e publicar uma nova versão; validar cerveja, reagentes, refeições regionais, elixires, processamento e caixas imperiais na API e no planejamento. Recalcular os cenários de lucro com ingredientes corretos e rendimentos explicitamente confirmados.

## Evidências e reprodução

Versão ativa: `sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-80ebbce2-catalog-catalog-v3-supp-cd06294d`.

Checksum conferido tanto no adaptador quanto na API: `2cf91933839c35a0abd2f6e0b6e2fd2234fc1ac9cb997f9b9b6adac6da85c47b`.

Relatório completo local: `data/audits/production-recipes-2026-10-10.json`. XMLs de auditoria: `data/audits/sa-xml/`. Ambos ficam fora do Git, assim como os demais arquivos do cliente.

```powershell
data/tools/bdo-catalog-extractor.exe extract --game 'C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online' --lang pt --region sa ui_html/xml/sa/ data/audits/sa-xml
node scripts/review-production-recipes.mjs data/extracted/sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-80ebbce2-catalog data/audits/production-recipes-2026-10-10.json http://localhost:3000 data/audits/sa-xml/ui_data/ui_html/xml/sa
```

A auditoria exige o build existente do adaptador da API e interrompe a comparação se o checksum da API divergir da extração revisada. O script não publica dados nem modifica o banco.
