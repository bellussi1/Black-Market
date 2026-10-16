# Mapa público das referências de BDO

Para consulta por funcionalidade, veja [links úteis e anexos de referência](useful-links.md), incluindo os 21 links fornecidos em 9 de outubro de 2026 e a planilha de subprodutos de alquimia.

Antes de desenhar ou alterar qualquer feature de produto, siga o [protocolo de análise competitiva](competitor-review-playbook.md): consultar BDO Workshop, BDO Codex, BDOLytics e Garmoth, registrar evidências e limites e comparar cálculos com entradas pareadas.

Pesquisa em **7 de outubro de 2026**, dividida entre três subagentes. Foram consultadas páginas públicas e fontes de código/documentação acessíveis; não houve login, upload de prints, coleta de dados pessoais nem contorno de bloqueios.

## Relatórios e cobertura

| Documento                                                                                                                     | Cobertura                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Estado implementado e lacunas verificadas](implementation-gap-matrix.md)                                                     | Checkout de 10/10/2026, capacidades consumidas, lacunas, dados necessários e limites de confiança                           |
| [BDO Codex e Black Desert Foundry](codex-foundry.md)                                                                          | 35 páginas Codex e 18 Foundry; 460 URLs Codex e 277 links internos Foundry descobertos no HTML                              |
| [BDOLytics e BDO Workshop](lytics-workshop.md)                                                                                | Cerca de 35 rotas Workshop; shell atual e páginas/indexação BDOLytics distinguidos                                          |
| [Garmoth, Workerman e Arsha](garmoth-workerman-arsha.md)                                                                      | Nove páginas Garmoth; aplicação/código Workerman; documentação e código Arsha                                               |
| [Política de fonte do mercado](market-source-policy.md)                                                                       | Fonte manual aprovada; Arsha candidato não aprovado; controles e critérios para habilitar coleta                            |
| [Auditoria inicial de catálogo, receitas e mercado de Culinária/Alquimia](cooking-alchemy-catalog-market-audit-2026-10-16.md) | Cobertura local de peixe seco, ícones e preços NPC; riscos de equivalência; limites para ranquear lucro/volume atuais na SA |
| [Navegação autenticada e login social](authenticated-navigation-competitive-review-2026-10-16.md)                             | Revisão pública de menus, ferramentas pessoais e chamadas de login em 16/10/2026                                            |
| [Carregamentos e paginação em Receitas](ui-loading-competitive-review-2026-10-16.md)                                          | Padrões públicos observáveis e limites para comparar filtros, paginação e loading na tela de Receitas                       |

Essas contagens não representam todas as rotas possíveis. Cada site tem entidades, filtros, idiomas e paginações que multiplicam URLs. Áreas autenticadas, respostas apenas com shell JavaScript, páginas indisponíveis e bloqueios estão registrados nos relatórios. Não é correto apresentar a pesquisa como uma cópia integral das bases dos concorrentes.

## Famílias a considerar no Black Market

| Família               | Aplicação no produto                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| Catálogo              | Busca por nomes/IDs, categorias, relações, tooltips, localização e origem/versão    |
| Mercado               | Região, preços, estoque, histórico controlado, favoritos, cálculo líquido e frescor |
| Receitas              | Ingredientes, alternativas, rendimentos conhecidos, subprodutos e comprar/produzir  |
| Coleta e profissões   | Maestria, sessões observadas, energia, rotas e estimativas com premissas            |
| Gear e aprimoramento  | Builds, níveis, custos, probabilidades e planejamento de melhorias                  |
| Armazéns e planos     | Materiais por local, revisão de scans, faltantes, reservas e decisões de produção   |
| Trabalhadores e nodes | Planejamento de tarefas e produção, com fontes e modelos verificados                |
| Referência e guias    | Knowledge, NPCs, quests, mapa e conteúdo editorial com revisão por patch            |

## Procedência: o que foi comprovado

- **Codex:** administrador declara extração do cliente com ferramentas próprias; alterações e correções manuais aparecem no fórum. As declarações de API/preços têm datas e limites nos relatos.
- **Foundry:** guias editoriais, traduções e colaboradores; links e integração de tooltips Codex. Isso não prova cópia integral de uma base externa.
- **Workshop:** implementação pública do Storage Tracker mostra reconhecimento/revisão de prints, calibração, itens parecidos e sobreposição. Provedor exato de catálogo/preço não foi comprovado.
- **BDOLytics:** famílias e rotas públicas/indexadas foram mapeadas; provedor exato e cadência interna continuam desconhecidos.
- **Garmoth:** aplicativo oficial declara OCR de loot visível. Isso não demonstra sincronização completa de armazéns.
- **Workerman:** código consulta BDOLytics para preços e Arsha como fallback; JSON/cache de trabalhadores não comprova exportação de todo o estoque pessoal.
- **Arsha:** código combina dados do mercado da Pearl Abyss com metadados extraídos do Codex e cache. É integração comunitária, não API oficial de armazéns/contas.

As fontes diretas, datas e distinções entre declaração, observação e inferência estão nos relatórios. Não consumir endpoints internos desses sites como contrato público do Black Market. A API própria serve o catálogo extraído/versionado e o adaptador de mercado autorizado para o projeto.

## Próximas decisões

1. Priorizar itens/receitas/mercado por nome e importação de materiais antes de reproduzir todas as calculadoras especializadas.
2. Separar referência estática, preço, observação de sessão e dado pessoal.
3. Usar CSV/manual agora; implementar [prints revisáveis](../storage-import-strategy.md) após avaliar exemplos reais.
4. Validar fórmulas por patch e região. Os guias pesquisados contêm divergências de números de maestria; não copiar automaticamente uma tabela antiga.
5. Preparar anúncios no layout; resolver a licença não comercial do extractor antes de ativar monetização.
