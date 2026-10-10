# Atualização do catálogo de receitas — 9/10/2026

> Revisão de 10/10/2026: foi identificada uma falha na seleção da pasta regional dos XMLs. As contagens abaixo descrevem a extração publicada naquele momento, mas não demonstram cobertura de todos os XMLs portugueses SA nem correção de suas quantidades. Consulte a [revisão completa](recipe-review-2026-10-10.md), que prevalece para a qualidade das receitas.

Região SA, localização portuguesa do cliente instalado. O cliente foi atualizado pelo usuário antes da extração, após o [patch oficial de 8/10/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8694).

## Cobertura verificada

| Dado                                                 | Resultado |
| ---------------------------------------------------- | --------: |
| Itens do cliente atualizado                          |    74.287 |
| Relações brutas de receitas extraídas dos XMLs       |     5.063 |
| Receitas distintas após a normalização do importador |     4.406 |
| Receitas cujo rendimento não consta no XML           |     4.406 |
| Maior quantidade de receitas que produzem um item    |       156 |
| Receitas que usam Pó de Pedra Negra #4901            |     1.107 |

A contagem total de receitas não mudou em relação à extração anterior. A comparação de produto, método, ingredientes e quantidades não encontrou novas composições nem composições removidas. As 44 chaves acrescentadas e 44 removidas decorrem de metadados de subproduto inferidos pelo extractor, não de mudanças verificadas de receita no servidor. A rotina de inferência do extractor pode escolher um produto diferente quando há múltiplos candidatos para a mesma combinação; não usar essas diferenças como notícia de patch.

O endpoint de relações por item agora oferece páginas de até 100 receitas. O frontend busca todas as páginas do item solicitado, verifica versão e contagem e rejeita respostas incompletas. Assim, não oculta receitas após o limite anterior de 50; a árvore continua carregando apenas os itens explorados.

Esta cobertura significa **todas as relações de receitas expostas pelos XMLs do cliente instalado**. Não prova que todos os registros sejam receitas ainda válidas no servidor, nem que o cliente exponha todos os resultados possíveis. Grupos de `manufacture.json` sem resultado não são associados a produtos por suposição. Quantidades extraídas podem divergir das descrições; o exemplo do sal no Reagente Líquido Limpo permanece uma lacuna de qualidade conhecida. Rendimentos e probabilidades ausentes continuam desconhecidos.

## Extração compatível com o patch

O extractor v0.1.9 falhou nas tabelas atualizadas de experiência e buffs. O patch local versionado em `scripts/patches/extractor-character-progression.patch` adiciona o perfil explícito `--recipe-catalog-only`, sem relaxar os decodificadores dessas tabelas.

O perfil mantém itens, descrições, ícones, XMLs de receitas, categorias de mercado, mundo, NPCs, spots, pesca, conhecimento, curvas de profissões e grupos de processamento. Omite efeitos estruturados de itens, curvas de aprimoramento, regras de habilidades, progressão de personagens, missões, livros de aventura, conjuntos, cristais, reformas, maestria e Caphras. Coleções omitidas não são copiadas da extração anterior. Os módulos relacionados continuam suspensos.

A versão de extração incorpora SHA-256 do índice PAZ, localização **e executável do extractor**, além do perfil. Isso evita reutilizar uma extração feita com outro binário ou conjunto de flags sob a mesma versão upstream.

Versão atual extraída: `sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-80ebbce2-catalog`.

Relatório completo local: `data/extracted/<versão>/recipe-audit.json`. Backup antes da publicação: `data/backups/catalog-20261009T144556-e71fc9e331794b91a448d257dba33017.dump`.

## Reproduzir após atualizar o cliente

```powershell
./scripts/prepare-catalog-extractor.ps1
./scripts/sync-game-catalog.ps1 -ExtractorPath ./data/tools/bdo-catalog-extractor.exe -RecipeCatalogOnly
```

Para conferir sem publicar, acrescente `-CheckOnly`. A sincronização faz backup, valida a procedência, publica o catálogo, importa apenas as referências da mesma extração e reinicia a API local.

Para gerar a auditoria usando exatamente a normalização do importador:

```powershell
pnpm --filter @bdo/api build
node scripts/audit-recipe-catalog.mjs data/extracted/<versão> data/extracted/<versão>/recipe-audit.json data/extracted/<versão-anterior>
```

Não há atualização automática recorrente configurada. A execução é manual após o launcher concluir o patch.

## Publicação e validação

Catálogo ativo: versão de extração acima com sufixo `-catalog-v2`, checksum `a40ef27779f719e11001356a81fddea75573bdb2b05e9d2a35e49083228b30c0`, publicado em 9/10/2026 às 11:56:35 (UTC−3). Foram publicados 21.993 arquivos de ícone e 70.530 aliases de itens. O índice de reconhecimento foi regenerado; itens sem imagem válida mantêm o fallback existente.

A publicação dos ícones usa oito operações de arquivo em paralelo, com validação, hashes, staging e ativação por renomeação. Uma cópia interrompida ou inválida não ativa o diretório parcial. O backup antecede a troca de catálogo, e nenhuma quantidade de inventário pessoal é modificada.

Passaram 177 testes de frontend, 67 testes de backend e dois testes adicionais da publicação de ícones, além dos testes Go de build/tabelas do extractor, lint dos arquivos alterados e compilação de produção. No navegador, #4901 exibiu 151 variantes e 1.107 links de usos. A página 12 do endpoint de usos retornou as últimas sete receitas. `-CheckOnly` confirmou `importNeeded: false` após a publicação.
