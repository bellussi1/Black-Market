# Pesquisa competitiva: ficha, equipamento e abas de Família

**Consulta:** 19/10/2026  
**Escopo:** organização pública de ficha de personagem, maestrias de Life Skill e equipamento. A implementação desta etapa trata de navegação e apresentação; não altera atributos, cálculos ou dados do jogo.

## Evidência atual

| Fonte        | URL e acesso em 19/10/2026                                                                                                | Observação e limite                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Garmoth      | [Gear Builder](https://garmoth.com/character/default) e [Character Info](https://garmoth.com/character/EU/character-info) | A página pública organiza `Character Info`, `Gear Builder`, `Upgrade Path`, `Compare` e `Stats` como superfícies distintas. O texto de apresentação descreve equipamento, cristais, artefatos e estatísticas do build. A página pública/indexada de informações de personagem lista classe/especialização, fitness, onze maestrias de Life Skill e journals. O conteúdo não foi alterado nem usado como regra de cálculo. |
| BDO Workshop | [Gear Progression](https://bdoworkshop.com/gear-progression)                                                              | A página pública atual apresenta apenas descrição, aviso de JavaScript e preferências de cookies. Anuncia ferramentas de gear/progressão e leitura de capturas; a navegação e o workspace interno não ficaram verificáveis.                                                                                                                                                                                               |
| BDOLytics    | [Character](https://bdolytics.com/en/NA/character)                                                                        | A tentativa de abertura atual não foi acessível. O relatório anterior de 16/10 registra superfícies públicas de mercado, crafting e experiência, sem equivalente de ficha de personagem verificado naquela consulta. Não se conclui ausência do recurso.                                                                                                                                                                  |
| BDO Codex    | [Itens](https://bdocodex.com/us/items/)                                                                                   | A abertura atual foi bloqueada para a ferramenta de pesquisa. O relatório anterior de 16/10 verificou catálogo de itens e receitas; não registrou um workspace público de personagem/equipamento. É uma referência de identidade do jogo, não de navegação de perfil nesta alteração.                                                                                                                                     |

Referências anteriores: `docs/research/gear-lifeskill-layout-2026-10-16.md` e `docs/research/storage-profile-gear-competitive-review-2026-10-16.md`.

## Decisão para o Black Market

Garmoth é o equivalente público mais próximo observado para separar informações do personagem e construção de equipamento em superfícies próprias, mantendo ambas dentro do mesmo contexto de personagem. A especificação aprovada do Black Market mantém também uma superfície de dados compartilhados da Família. Para tornar a seleção explícita, a barra local será navegação por links com query `tab=character|equipment|family`; o seletor e a criação de personagem permanecem no cabeçalho comum.

Essa comparação orienta apenas a organização visual. Ela não confirma fórmulas, preços, atributos derivados, persistência do concorrente ou equivalência de patch/região. Nenhum cálculo externo foi comparado porque a fatia não altera cálculos.

## Limites

- As consultas atuais foram públicas e não autenticadas; as ferramentas internas do Workshop não carregaram.
- BDOLytics e BDO Codex ficaram indisponíveis nesta consulta, portanto a observação para esses sites está limitada aos relatórios prévios referenciados acima.
- Nenhum dado, imagem, fórmula, preço ou texto de concorrente foi copiado para o produto.
