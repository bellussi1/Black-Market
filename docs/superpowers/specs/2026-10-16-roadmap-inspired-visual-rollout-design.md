# Design: linguagem visual da Roadmap nas telas principais

**Data:** 16/10/2026 · **Estado:** proposta aprovada em conversa; aguardando revisão do documento antes do plano de implementação.
**Escopo:** consistência visual progressiva das telas existentes do Black Market.

## Contexto e intenção

O usuário gostou da tela `/roadmap` e pediu aplicar a mesma direção visual às outras telas. O objetivo é tornar a experiência mais coesa e clara, reforçando a identidade BDO já usada pelo produto. A aprovação recebida foi para um rollout progressivo nas telas principais.

Na inspeção visual de `/`, `/roadmap`, `/market`, `/recipes` e `/account`, a aplicação já compartilha superfícies escuras, bronze/ouro, contornos retangulares e tipografia. A Roadmap se destaca pela hierarquia mais deliberada: kicker, título e descrição, seções bem separadas, cartões com metadados/status e ações agrupadas. Mercado e Receitas precisam manter suas estruturas de trabalho: filtros/tabela/histórico e busca/árvore/cálculos, respectivamente.

## Princípio de design

Reutilizar a **linguagem visual**, não copiar a composição de timeline. Cada tela mantém o modelo de interação do seu domínio. Não alterar cálculos, contratos da API, regras de acesso ou semântica dos dados como parte da migração visual.

### Elementos compartilhados

- Cabeçalho de página com kicker contextual, título, descrição curta e separação visual do conteúdo.
- Seções com hierarquia clara entre rótulo contextual, título e conteúdo.
- Painéis carvão com borda fina e ênfase bronze contida para contexto selecionado, foco ou título.
- Metadados e estados em chips legíveis, com rótulo textual e sem depender apenas da cor.
- Ações principais e secundárias agrupadas e retangulares, com alvo e foco de teclado acessíveis.
- Ritmo comum de largura, espaçamento, alinhamento e reflow em desktop e telas estreitas.

Os tokens e estilos existentes em `apps/web/src/styles/_tokens.scss`, `_layout.scss` e `_responsive.scss` são a base. Reutilizar classes existentes quando sua semântica servir; criar uma primitiva compartilhada pequena somente quando a mesma estrutura aparecer em mais de uma tela. Evitar wrappers genéricos ou uma abstração de layout que force markup desnecessário.

### Composição própria por tela

- **Home:** dar destaque aos focos ativos e à próxima ação, mantendo a trilha do produto como contexto e sem duplicar CTAs.
- **Recomendações:** apresentar a decisão e os resultados antes dos detalhes; destacar uma opção apenas quando a classificação e os dados a sustentarem. Estados desconhecidos ou incompletos permanecem explícitos.
- **Mercado:** preservar categorias expansíveis, filtros, paginação, tabela e gráfico. Aplicar hierarquia e agrupamento a toolbar, estados e resumos sem trocar tabela por cards nem alterar a interpretação de preço/estoque/negociações.
- **Receitas e produção:** preservar seleção de produto, controles de quantidade/maestria, árvore interativa, escolhas e indicadores financeiros. Destacar resultado e ações sem reduzir a área útil da árvore nem perder alternativas.
- **Armazém, Scan, Personagem e Gear:** aplicar cabeçalhos, painéis, status e agrupamento de etapas onde ajudarem a revisão. Preservar prévia/confirmação, dados incertos e revisão humana do OCR.
- **Utilitários restantes:** seguir os mesmos tokens e hierarquia após as telas de maior uso, sem alterar a função de cada ferramenta.

## Sequência de rollout

1. **Base visual e Home/Recomendações:** revisar tokens/classes comuns, alinhar cabeçalhos e painéis, e aplicar a composição aprovada às telas de entrada e decisão.
2. **Mercado/Receitas:** migrar os painéis e controles dentro dos modelos existentes de tabela e árvore; não mudar cálculos nem semântica.
3. **Armazém/Scan/Personagem/Gear:** harmonizar fluxos de dados pessoais e importação, preservando revisão, confirmação e estados de erro.
4. **Utilitários e acabamento:** aplicar os padrões às demais rotas pertinentes e remover divergências visuais comprovadas.

Cada fase deve ser revisada antes de avançar, para limitar regressões e permitir correção da direção visual com evidência de tela.

## Fora de escopo

- Reproduzir a timeline da Roadmap em telas sem fluxo sequencial.
- Redesenhar navegação global, marca, domínio ou identidade do produto.
- Alterar fórmula, otimização, preços, conteúdo, permissões, persistência ou chamadas de API.
- Adicionar efeitos decorativos que reduzam contraste, legibilidade ou espaço útil.
- Aumentar budgets, remover estados funcionais ou substituir métricas ausentes por valores presumidos.

## Critérios de aceite

- Cabeçalho, seções, painéis, estados e ações seguem uma hierarquia visual consistente entre as telas migradas.
- A ação principal e o resultado mais importante ficam identificáveis sem leitura extensa.
- A organização continua adequada à tarefa: tabela no Mercado, árvore na produção, conteúdo editorial na Home/Roadmap e revisão explícita no Scan.
- Nomes, quantidades e métricas não são cortados; conteúdo variável expande o painel.
- Estados de carregamento, vazio, erro e sucesso continuam distintos; skeletons mantêm espaço reservado e atualizações preservam resultados existentes quando aplicável.
- Teclado, foco visível, rótulos acessíveis, contraste e `prefers-reduced-motion` permanecem verificados.
- Inspeção no navegador em desktop (1440×900) e tela estreita (390×844) por fase; conferir texto longo, overflow, estado carregado e ao menos um estado de loading/erro apropriado à tela.
- Specs e verificações existentes da área passam; nenhum teste de cálculo ou comportamento da tela é removido para facilitar o redesign.

## Evidência inicial e riscos

- A inspeção visual em 16/10/2026 abriu `/`, `/roadmap`, `/market`, `/recipes` e `/account` em `localhost:4200`.
- A Home já usa um cartão destacado de foco, próximo da linguagem da Roadmap.
- O Mercado e a lista de receitas já usam painéis escuros e bordas; a melhoria deve atuar em hierarquia, agrupamento e consistência, sem diluir suas interfaces densas.
- O ambiente local mostrou um aviso de recuperação do workspace e uma versão antiga do cabeçalho do Mercado em `4200`. Resolver/validar esse runtime antes de usar a captura local como prova de uma fase; preservar dados locais.
- O repositório tem alterações locais preexistentes em múltiplas frentes. Cada fase precisa revisar `git status` e os diffs antes de editar ou commitar.

## Decisões para a próxima etapa

O usuário selecionou rollout progressivo. Este documento especifica a direção visual; ainda não é autorização para modificar telas. Após a revisão/aprovação desta especificação, preparar o plano de implementação da primeira fase (base visual, Home e Recomendações) com arquivos, dependências, sequência TDD, verificações e commits atômicos. A implementação começa somente depois de o plano ser revisado e o método de execução ser escolhido.
