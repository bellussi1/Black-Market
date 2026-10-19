# Correção dos alvos do tutorial de Família — 19/10/2026

## Evidência local e causa

Na aba Família & Profissões, `family-family.characters` estava no link da própria aba, embora a etapa explique organizar personagens. `family-family.actions` estava no painel inteiro de profissões, com 751,78 px de altura em 390×844. O destaque cobria uma área extensa, incluindo campos e complementos que não são a ação descrita. O tutorial de Personagem também exigia um personagem existente para abrir, impedindo a orientação inicial de criação/seleção.

Os alvos foram movidos para a barra de seleção/criação e a linha de Salvar profissão/Desfazer. O alvo de maestria passou ao cabeçalho compacto da seção, evitando realçar toda a grade. Personagem pode iniciar sem cadastro; Equipamento continua aguardando personagem. Chaves dos guias e campos persistidos foram preservados.

## Consulta pública dos concorrentes

Consulta em 19/10/2026, apenas superfícies públicas; não foram feitas comparações de cálculos, preços ou dados.

- [Garmoth Gear Builder](https://garmoth.com/character/default): navegação pública mostra Character Info, Passives & Fame e Gear Builder. O conteúdo acessível não demonstrou um tour automático comparável; não inferir sua ausência na aplicação completa.
- [BDO Workshop](https://bdoworkshop.com/gear-progression): timeout; tutorial interno não verificado.
- [BDOLytics Cooking](https://bdolytics.com/en/NA/cooking/calculator): página indisponível para a consulta; tutorial não verificado.
- [BDO Codex](https://bdocodex.com/us/): acesso restrito na ferramenta; tutorial não verificado.

A correção segue o contrato dos guias existentes e a reprodução local. Não incorpora implementação ou conteúdo dos concorrentes.

## Validação

Dois testes de regressão falharam antes da correção, demonstrando o alvo na aba e o bloqueio inicial. Após a correção, 33 testes de Player, serviço de tutorial, diretiva de superfície e equipamento passaram. No navegador autenticado sem personagem, Próximo/Anterior apontaram para a linha de ações (44 px) e a barra de personagens (88 px) em 1920×1080; o tutorial de Personagem abriu com sua etapa disponível. Nenhum personagem ou dado de domínio foi criado, alterado ou removido.

Limites: a maestria com personagem preenchido foi coberta com fixture sintética; guias editados no banco permanecem prioritários e seu texto não foi sobrescrito. O usuário confirmou posteriormente que o sintoma era a tela rolando/pulando; a validação complementar está abaixo.

Em 1366×768 os alvos mediram 88/44 px e em 390×844, 156/100 px (barra de personagens/ações), sem overflow horizontal. `pnpm check` passou, incluindo lint, formatação, tipagem e build Angular de desenvolvimento. Console durante a atualização local registrou `AbortError: Transition was skipped` do Vite; sem falha de API do tutorial observada nesta reprodução.

Verificação integral: `pnpm test` passou com Calculators 78, API 270 + 1 ignorado por PostgreSQL descartável, Web 867 e scripts 81: 1.296 aprovados/1 ignorado. Correção em `d3496c7`.

## Complemento: rolagem/pulos confirmados pelo usuário

A resposta assíncrona confirmou o sintoma de rolagem/pulos, sem afirmar que persistia após a correção. A sessão de QA anterior conservava a emulação `prefers-reduced-motion: reduce`, portanto não validava a rolagem suave normal. Essa lacuna foi corrigida na verificação: emulação explicitamente alterada para `no-preference` e o guia real de Família foi repetido pelo serviço de desenvolvimento, sem limpar progresso, criar personagem ou editar dados de domínio.

Próximo e Anterior foram amostrados por `requestAnimationFrame` durante 1.300 ms em cada transição. Inversões contam mudanças de direção sem nova ação; faixa final mede a variação de scroll nos últimos 300 ms.

| Resolução | Próximo: scroll final | Anterior: scroll final | Inversões por transição | Variação final |
| --------- | --------------------- | ---------------------- | ----------------------- | -------------- |
| 1920×1080 | 0 px                  | 0 px                   | 0 / 0                   | 0 px / 0 px    |
| 1366×768  | 571 px                | 119 px                 | 0 / 0                   | 0 px / 0 px    |
| 390×844   | 1966 px               | 422 px                 | 0 / 0                   | 0 px / 0 px    |

No estado atual, a rolagem terminou no alvo e permaneceu estável. Instrumentação temporária de foco e atributos DOM usada na comparação foi restaurada; nenhum patch adicional no runtime foi justificado. A reposição temporária dos alvos antigos na mesma conta vazia também não reproduziu oscilação contínua; portanto a evidência não prova a causa exata dos pulos vistos pelo usuário. A ficha preenchida e condições de corrida de carregamento continuam fora desta amostra. Não declarar que todos os casos de rolagem foram eliminados.
