# Mapa público das referências de BDO

- [Auditoria de uso como jogador — 22/10/2026](player-journey-audit-2026-10-22.md): sessão Google real, personagem/estoque QA, OCR com capturas fornecidas, cálculos independentes, persistência, achados priorizados, correções J01–J09 e evidências/limites de cobertura.

- [Atividade de mercado e bootstrap — 18/10/2026](market-activity-and-bootstrap-review-2026-10-18.md): contador acumulado, estoque desconhecido e separação de dependências iniciais.

- [Receitas, Mercado e consistência de navegação — 18/10/2026](recipe-market-flow-review-2026-10-18.md): fluxo público dos quatro concorrentes, decisões de UI e limites de validação numérica.

Para consulta por funcionalidade, veja [links úteis e anexos de referência](useful-links.md), incluindo os 21 links fornecidos em 9 de outubro de 2026 e a planilha de subprodutos de alquimia.

Antes de desenhar ou alterar qualquer feature de produto, siga o [protocolo de análise competitiva](competitor-review-playbook.md): consultar BDO Workshop, BDO Codex, BDOLytics e Garmoth, registrar evidências e limites e comparar cálculos com entradas pareadas.

Pesquisa em **7 de outubro de 2026**, dividida entre três subagentes. Foram consultadas páginas públicas e fontes de código/documentação acessíveis; não houve login, upload de prints, coleta de dados pessoais nem contorno de bloqueios.

## Auditoria transversal atual — 16/10/2026

- [Prompt refinado com os cinco chats](full-product-audit-prompt-2026-10-16.md).
- [Auditoria de produto, UI, cálculos e desempenho](full-product-ui-calculation-performance-audit-2026-10-16.md): cobertura, 20 achados, pesquisa atual, medidas e sequência recomendada, sem implementar correções.
- [Evidência estruturada e inventário documental](evidence/full-product-audit-2026-10-16.json).
- [Implementação autorizada dos achados, evidências e limites](audit-remediation-2026-10-16.md).

## Relatórios e cobertura

- [Correção dos alvos do tutorial de Família — 19/10/2026](family-tutorial-target-fix-2026-10-19.md): âncoras compactas, orientação inicial sem personagem e validação de navegação do guia.

- [Hub único de Profissões, Família e revisão de todas as rotas](unified-professions-ui-review-2026-10-19.md): rota canônica, proteções de dados, controles alinhados, QA desktop/autenticado e limites de amostra.

- [Inventário de rotas para padronização de UI](ui-route-inventory-2026-10-19.md): owners, guardas, SSR, redirects, componentes, testes e limite da navegação MVP.
- [Auditoria de padronização MMORPG](ui-standardization-audit-2026-10-18.md): baseline da auditoria; especificação e execução estão em `docs/design-system/` e `docs/superpowers/plans/`.
- [Life Skills e navegação compartilhada](lifeskills-hub-competitor-review-2026-10-19.md): pesquisa pública sobre sessões, recomendações e organização do hub.
- [Painéis de Família e equipamento](family-workspace-tabs-review-2026-10-19.md): pesquisa pública de ficha e gear builder, com limites de acesso registrados.
- [Revisão de UI, loading e movimento](ui-loading-motion-review-2026-10-16.md).

- [Equipamentos e descrição de itens com foco em Life Skills](gear-lifeskill-layout-2026-10-16.md).

- [Checklist executável e comparação de sessões observadas](observed-sessions-checklist-2026-10-16.md).
- [Reconciliação das funcionalidades e reversão da última importação](feature-continuation-2026-10-16.md).
- [Pesquisa pública sobre reversão de capturas](scan-import-undo-competitive-review-2026-10-16.md).
- [Subproduto aleatório na listagem de receitas](recipe-byproduct-listing-review-2026-10-18.md): correção de “Comida Retirada” na página 4, metadado ausente, evidência local e limites da pesquisa competitiva.
- [Disponibilidade do tutorial da oficina](tutorial-versioned-fallback-review-2026-10-18.md): comparação pública de guias e decisão de fallback versionado sem seed persistente.
- [Tours automáticos e ajuda em contexto](automated-onboarding-review-2026-10-18.md): cobertura do rollout, confirmação de reinício em Configurações, limites da pesquisa pública e QA local.
- [Redução do bundle inicial do shell](shell-bundle-deferral-review-2026-10-18.md): análise do grafo inicial, controles carregados sob demanda e novo baseline de produção.
- [Interface de cookies e analytics](privacy-controls-ui-review-2026-10-18.md): categorias, escolha/revogação, disponibilidade do serviço, consulta pública e limites de validação.
- [Home, acesso público a Profissões e botões sociais](home-social-login-ui-review-2026-10-18.md): primeira dobra da Home, mudança de acesso de `/lifeskills`, padronização dos botões Google/Steam e pesquisa pública atual.
- [Ficha compacta de item na árvore de receitas](recipe-item-quick-info-review-2026-10-18.md): tooltip inspirado no jogo, pesquisa pública, acesso separado à ficha completa e revisão estática das etapas expansíveis.
- [Revisão de fluxos pessoais e leitura de capturas](authenticated-workflows-ui-review-2026-10-18.md): cobertura automatizada de Scan/Armazém/Família/Recomendações/Profissões, correção do filtro inicial do Scan, pesquisa competitiva e limites do browser autenticado.
- [Pesquisa pública de perfis, armazenagem e capturas](private-workspace-ui-competitor-review-2026-10-19.md): comparação atual de superfícies de equipamento e OCR; limitações de JavaScript, erro 502 e acesso restrito.
- [Pesquisa pública de planejamento e utilitários](planning-utility-competitor-review-2026-10-19.md): comparação de crafting, aprimoramento e presets; distingue páginas indexadas de fórmulas verificadas.

| Documento                                                                                                                     | Cobertura                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [Estado implementado e lacunas verificadas](implementation-gap-matrix.md)                                                     | Checkout de 10/10/2026, capacidades consumidas, lacunas, dados necessários e limites de confiança                                            |
| [BDO Codex e Black Desert Foundry](codex-foundry.md)                                                                          | 35 páginas Codex e 18 Foundry; 460 URLs Codex e 277 links internos Foundry descobertos no HTML                                               |
| [BDOLytics e BDO Workshop](lytics-workshop.md)                                                                                | Cerca de 35 rotas Workshop; shell atual e páginas/indexação BDOLytics distinguidos                                                           |
| [Garmoth, Workerman e Arsha](garmoth-workerman-arsha.md)                                                                      | Nove páginas Garmoth; aplicação/código Workerman; documentação e código Arsha                                                                |
| [Política de fonte do mercado](market-source-policy.md)                                                                       | Fonte manual aprovada; Arsha candidato não aprovado; controles e critérios para habilitar coleta                                             |
| [Auditoria inicial de catálogo, receitas e mercado de Culinária/Alquimia](cooking-alchemy-catalog-market-audit-2026-10-16.md) | Cobertura local de peixe seco, ícones e preços NPC; riscos de equivalência; limites para ranquear lucro/volume atuais na SA                  |
| [Equivalência de preço entre peixe fresco e seco](fish-price-equivalence-review-2026-10-16.md)                                | Revisa o ratio 1:1 atual de DRY, os dados ausentes de substituição culinária e as fontes públicas conflitantes; não confirma um ratio seguro |
| [Navegação autenticada e login social](authenticated-navigation-competitive-review-2026-10-16.md)                             | Revisão pública de menus, ferramentas pessoais e chamadas de login em 16/10/2026                                                             |
| [Carregamentos e paginação em Receitas](ui-loading-competitive-review-2026-10-16.md)                                          | Padrões públicos observáveis e limites para comparar filtros, paginação e loading na tela de Receitas                                        |

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

- [Cotações de receitas e cliente instalado — 18/10/2026](recipe-quotes-and-client-patch-2026-10-18.md): referência de preço sem estoque, atualização forçada, extração e revisão do suplemento.

- [Desempenho de navegação e SSR — 18/10/2026](navigation-ssr-performance-2026-10-18.md): traces locais, espera nos resolvers, normalização da origem no transfer cache, DOM recolhido e HMR.
- [Auditoria de padronização MMORPG — 18/10/2026](ui-standardization-audit-2026-10-18.md): rotas de Recomendações/Life Skills e Família, divergências de tabs/controles, pesquisa competitiva pública, limites de QA e proposta aguardando revisão.
- [Especificação de padronização MMORPG — 18/10/2026](../design-system/ui-standardization-spec-2026-10-18.md): requisitos de design system, rotas, compatibilidade, Família, densidade e critérios de aceite; aguarda revisão do usuário.
