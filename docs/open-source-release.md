# Preparação para código aberto

Atualizado em 27/10/2026. O usuário escolheu a licença MIT para o código próprio e pediu a publicação do repositório atual com seu histórico. O repositório foi tornado público e a leitura sem autenticação foi confirmada.

## Revisão realizada

- Gitleaks varreu 774 commits acessíveis pelos refs locais, incluindo os 13 branches remotos conferidos. Foram 80 ocorrências da regra genérica: 72 identificadores de receitas em fixtures, um checksum documental, três nomes de chave/evento e quatro valores iguais em testes de configuração do Firebase. O valor de teste tem sequência numérica e não segue o formato de chave Google; a varredura não garante ausência de segredos.
- Os 88 jobs de CI disponíveis no GitHub foram consultados: buscas por padrões de tokens GitHub, chaves Google e AWS, chaves privadas, JWT, endereços de e-mail fora de exemplos/noreply, caminhos de usuário Windows e URLs de Quick Tunnel não encontraram correspondências. Nenhum artifact foi listado nesses 88 runs. A verificação não revisa todo conteúdo ou dados pessoais dos logs.
- O GitHub informou zero issues, pull requests e releases na consulta realizada. Todos os 13 branches remotos correspondiam aos refs locais consultados. Autores dos commits usam endereço GitHub noreply.
- O checkout rastreia 51 imagens/PDFs: 16 referências de interface do jogo, 31 capturas da auditoria e quatro outros arquivos. As 16 referências foram catalogadas como derivadas do [Interface In Game](https://interfaceingame.com/games/black-desert-online/); ao menos uma contém nomes e mensagens de jogadores. O usuário declarou possuir autorização para publicá-las. As evidências de auditoria incluem capturas e dados de jogo. A declaração não foi comprovada por documentação neste checkout.

## Antes de publicar

1. Preservar a distinção entre a autorização declarada pelo usuário e os direitos de terceiros. Apagar imagens em um commit novo não as remove do histórico. Reescrever histórico ou criar uma cópia pública limpa exige decisão específica do responsável.
2. Confirmar que os conteúdos e direitos de terceiros não são apresentados como licenciados pela MIT. A [política de conteúdo de fãs da Pearl Abyss](https://www.pearlabyss.com/en-US/legal/detail?_policyNo=42) exige caráter não comercial para o uso de sua propriedade intelectual e distingue os direitos do jogo dos direitos do criador. A licença do [bdo-data-extractor](https://github.com/iDevelopThings/bdo-data-extractor/blob/main/LICENSE.md) não concede direitos sobre assets ou dados do jogo.
3. Revisar novamente refs, resultados da varredura, histórico de Actions e alterações a publicar. Ao mudar a visibilidade, [logs do Actions ficam públicos](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility). O checkout principal estava 11 commits à frente de `origin/main` antes da preparação.
4. Antes de mudanças futuras de visibilidade, repetir a revisão dos itens anteriores. Manter o portfólio e o perfil GitHub coerentes com o estado real do repositório e da aplicação.
