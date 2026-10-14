# Autenticação social e staging para testers

**Estado:** especificação para revisão do usuário; implementação ainda não iniciada.

## Objetivo

Permitir criação e acesso de conta exclusivamente por Google ou Steam, manter os dados pessoais associados à conta autenticada, cadastrar um personagem e uma família sintéticos para a conta designada de teste e disponibilizar o staging para um grupo de até dez testers.

O primeiro acesso por um provedor cria a conta automaticamente. Não haverá senha local, cadastro por e-mail, magic link, OTP de e-mail ou recuperação por senha. O e-mail retornado pelo Google pode ser exibido como dado de perfil, mas não será um método independente de login. A aplicação continuará utilizável como visitante; autenticação é necessária para sincronizar os dados da conta.

## Estado atual verificado

- A página Minha Conta oferece link de acesso por e-mail e Google por Supabase Auth; não há fluxo Steam.
- A API valida tokens Supabase e usa o UUID do Supabase como dono de `user_workspaces`.
- A configuração de identidade é opcional e não há provedor configurado/ativado para o staging atual.
- O banco do staging é separado e o processo de seed exclui os dados de `user_workspaces`.
- O fixture `production-demo.ts` já contém dados sintéticos de personagem, família e estoque (`AuroraVale` / `ValeDourado`); ele não está ligado a uma conta persistida.
- O staging local está saudável e `pnpm test:staging` passou para HTTP, SSR, catálogo, ícone e bloqueio de indexação. O compartilhamento atual usa Cloudflare Quick Tunnel, cujo endereço muda e depende do computador do mantenedor permanecer ligado.

## Arquitetura aprovada

### Identidade e sessão

1. **Google:** o navegador autentica com o SDK Web do Firebase usando o provedor Google. O Firebase cria a conta no primeiro acesso. A API valida cada ID token com Firebase Admin SDK.
2. **Steam:** a API inicia e valida Steam OpenID 2.0. Depois de verificar a resposta diretamente com o endpoint Steam, extrai o SteamID64 e emite um custom token Firebase para o UID já associado à identidade; no primeiro acesso, cria o mapeamento antes de emitir o token. O navegador troca o custom token por uma sessão Firebase normal.
3. **API:** endpoints privados aceitam somente ID tokens Firebase verificados no servidor. Nenhuma autorização depende de `userId`, e-mail, papel ou metadata enviado pelo navegador.
4. **Dono dos dados:** adicionar um UUID interno canônico de usuário e mapear para ele o UID Firebase e os sujeitos externos Google/Steam. `user_workspaces.user_id` continua usando UUID interno; Firebase UIDs não são forçados a caber nessa coluna nem expostos como dono do workspace.
5. **Permissões:** papéis administrativos são atribuídos pelo servidor, em armazenamento/claims sob controle do servidor. O cliente não pode conceder a si mesmo papel de administrador.

Steam usa OpenID 2.0, não OAuth/OIDC. O fluxo deve validar `state` de uso único, retorno e `realm` exatos, assinatura por `check_authentication`, modo de resposta, identidade e SteamID64 canônicos. O início também define um cookie HttpOnly/SameSite para vincular o retorno ao navegador que iniciou a autenticação; a troca do código de sessão usa PKCE S256, código curto e de uso único. Retornos aceitam apenas caminhos locais permitidos. Configurar produção e staging exige HTTPS e URLs de retorno exatas.

### Somente Google e Steam

- Remover da UI e da API de identidade o login por link/OTP de e-mail.
- No Firebase, habilitar Google e o fluxo de custom token usado pelo Steam; manter desabilitados senha, link/OTP de e-mail e login anônimo.
- O backend só emite custom tokens após prova Steam válida. Não criar endpoint genérico para emissão de custom token.
- Preservar modo visitante para páginas e cálculos que já funcionam sem conta. O pedido limita os métodos de login disponíveis, não exige bloquear o uso público atrás de uma conta.

### Vinculação explícita de provedores

O usuário pode vincular Steam à sessão Google autenticada concluindo a prova Steam iniciada pelo backend. Para vincular Google a uma sessão Steam, usar o fluxo de vinculação do Firebase na sessão existente. Ambos os caminhos exigem prova recente do novo provedor e associam a identidade ao mesmo UUID canônico.

Não vincular nem mesclar contas por coincidência de e-mail. Se o Google ou Steam já estiver associado a outra conta, bloquear a operação e informar que é necessário provar ambas as contas antes de qualquer recuperação/mesclagem. Não sobrescrever nem mover workspaces automaticamente.

### Personagem e família da conta de teste

- Reutilizar o fixture sintético existente `AuroraVale` / `ValeDourado`, alinhando-o aos schemas atuais de workspace, personagem e família. Não copiar dados reais nem popular cada novo tester com o perfil de outra pessoa.
- Criar um comando administrativo de seed, disponível somente em staging, direcionado a uma identidade de teste explicitamente configurada. Ele executa após o primeiro login daquela conta ou por comando local depois do login.
- Seed idempotente: adiciona apenas registros do fixture ausentes, preserva preferências e dados existentes, e informa quantos registros foram criados ou já existiam. Não apagar nem substituir um workspace.
- Bloquear o comando se a configuração indicar produção, se o UID não estiver explicitamente definido ou se o banco não for o banco de staging. Não criar um endpoint público de seed.
- A identidade de teste e os detalhes operacionais devem ficar em configuração ignorada pelo Git/gerenciador de segredos, não em código, migration, fixture público ou log compartilhável.

### Staging para dez pessoas

- Usar projeto Firebase e credenciais próprios para staging, separados de produção; dados, tokens e callbacks não podem atravessar ambientes.
- Manter banco e API isolados no Compose de staging, analytics e coletores desligados, `noindex`, sem dados pessoais de produção e com o mesmo smoke test antes de compartilhar.
- O modo atual pode atender um grupo pequeno de até dez testers com a máquina ligada e Quick Tunnel protegido por lista de e-mails autorizados. Essa proteção de acesso à URL é separada da autenticação de conta do produto. A URL temporária muda quando o túnel é recriado; callbacks/domínios autorizados do Firebase precisam acompanhar a URL ativa.
- Para ciclos de teste previsíveis, usar domínio estável e túnel nomeado ou hospedagem de staging. Isso remove a troca de hostname e a dependência do computador ligado; não faz parte da primeira configuração enquanto domínio/hosting não estiverem disponíveis.
- Restringir a lista de acesso a no máximo os dez testers convidados. O túnel não deve ser descrito como ambiente 24/7 nem como hospedagem permanente.

## Segurança, privacidade e dados

- Firebase Web config é configuração pública do cliente; Firebase Admin credentials são exclusivamente do servidor e nunca entram no bundle, Git, logs ou mensagens.
- Usar variáveis de ambiente tipadas para projeto Firebase, emissor/audience esperados, URL pública e modo do app; validar que staging aponta somente para o Firebase/banco de staging.
- Tokens de Steam e estado de OpenID são efêmeros, de curta duração, de uso único e não registrados em logs. Aplicar limites de tentativas no início e callback.
- Guardar somente os identificadores de provedor e dados de perfil necessários. Não exigir nem usar e-mail Steam. Não solicitar credenciais Steam ou Google.
- Respostas da conta/workspace permanecem privadas, `no-store`, fora de caches compartilhados e com o cabeçalho `noindex` existente.
- Remover Supabase Auth da execução depois que a migração for validada. Não apagar dados de usuários Supabase sem inventariar e migrar workspaces legítimos; o staging atual não contém workspaces seedados, mas isso não prova ausência de dados em qualquer projeto Supabase externo.

## Migração e implantação

1. Adicionar configuração e validação Firebase no Nest e configuração pública mínima do Firebase Web.
2. Criar tabela(s) de identidade com UUID canônico e restrições únicas para UID Firebase e para cada sujeito de provedor. Criar migração sem associar por e-mail.
3. Implementar verificação de ID token, login Google, Steam OpenID e fluxo de custom token.
4. Migrar workspace/API e funções administrativas para UUID canônico e papéis controlados pelo servidor.
5. Atualizar Minha Conta para Google, Steam, estado de sessão, saída e vinculação explícita; remover Supabase/e-mail magic link após todos os consumidores migrarem.
6. Configurar projeto Firebase de staging e executar o seed apenas na conta de teste designada.
7. Executar smoke, verificar as duas entradas de login e sincronização, então compartilhar o túnel protegido com os dez e-mails autorizados.

Não há evidência de usuários reais no staging que exija migração. Antes de remover a autenticação Supabase de uma instalação com dados externos, fazer inventário e plano de migração/backup desse ambiente.

## Critérios de aceitação

- A conta pode ser criada/retomada por Google ou Steam; não existe caminho de senha, magic link, OTP ou login por e-mail.
- O fluxo Steam rejeita respostas adulteradas, repetidas, com retorno divergente ou identidade não canônica.
- API rejeita ID tokens inválidos, expirados, de outro projeto ou vindos de UID sem mapeamento permitido.
- Uma identidade Google e uma Steam só compartilham o mesmo workspace após vinculação provada; e-mail coincidente sozinho não liga contas.
- Dados de conta continuam ligados ao mesmo UUID canônico após logout/login por qualquer provedor vinculado.
- O seed cria o personagem e família sintéticos somente na conta de teste do staging; repetição não duplica, substitui nem apaga dados.
- Dez pessoas permitidas conseguem abrir o staging e acessar a aplicação; a camada de acesso da URL e o login social ficam claramente distintos.
- `pnpm check`, testes direcionados de API/web, smoke do staging e fluxos reais Google/Steam passam antes de divulgar o ambiente.

## Testes previstos

- Unitários: validação Steam (assinatura, state/retorno/realm, replay, claimed ID/SteamID64); mapeamento único e vinculação; emissão custom token mockada; rejeição de tokens Firebase incorretos; seed idempotente e bloqueado fora de staging.
- Web/API: login, logout, sessão restaurada, endpoint privado com Bearer token, criação de conta no primeiro login, falha e recuperação da vinculação já utilizada; ausência de chamadas Supabase e login por e-mail.
- Integração: Google e Steam reais no Firebase de staging, callbacks HTTPS, persistência do workspace e seed do usuário designado.
- Operação: `pnpm check`, `pnpm test`, `pnpm test:staging` antes da rodada com testers; verificar que dez contas allowlisted carregam sem expor API/banco diretamente.

## Dependências externas antes da validação ponta a ponta

- Projeto Firebase para staging e, antes da publicação, projeto separado de produção; Google habilitado e domínios/retornos autorizados.
- Credencial Firebase Admin carregada como segredo apenas pela API.
- URL HTTPS estável de staging ou aceitação operacional do hostname temporário e sua atualização no Firebase.
- Lista de até dez e-mails autorizados no túnel e identificação de qual conta Google ou Steam será a conta designada para o personagem/família de teste.
- Nenhuma senha ou chave deve ser enviada pelo chat. Configurar segredos em `.env.staging` ignorado pelo Git ou gerenciador de segredos.

## Alternativas consideradas

- **Supabase com sessão Google e uma sessão separada Steam:** rejeitada por deixar dois formatos de sessão e obrigar a API a validar cada token de forma diferente.
- **Supabase Custom OAuth para Steam:** rejeitada porque Steam usa OpenID 2.0, enquanto o suporte custom OAuth/OIDC documentado pelo Supabase requer OAuth2/OIDC.
- **Autenticação própria para tudo:** rejeitada por duplicar a emissão, renovação e segurança de sessão que Firebase já fornece para Google e tokens customizados.

## Referências oficiais

- [Steamworks: User Authentication and Ownership](https://partner.steamgames.com/doc/features/auth?l=english) — autenticação web via OpenID 2.0.
- [Firebase: Google sign-in for web](https://firebase.google.com/docs/auth/web/google-signin) — login Google pelo SDK Web.
- [Firebase: Create custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens) — criação no servidor e troca por sessão Firebase.
- [Firebase: Verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens) — validação de bearer token pela API.
- [Supabase: Custom OAuth/OIDC providers](https://supabase.com/docs/guides/auth/custom-oauth-providers) — protocolo de provedores personalizados.
- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) e [Protected Quick Tunnels](https://developers.cloudflare.com/changelog/post/2026-10-02-protected-quick-tunnels/) — limites e proteção por e-mail do túnel temporário.

## Revisão antes do plano

- [x] Atende ao pedido de login exclusivo Google/Steam e não introduz senha.
- [x] Preserva o UUID do workspace através de um mapeamento explícito, sem confiar em dados enviados pelo cliente.
- [x] Define a prova de Steam e o bloqueio de vinculação por e-mail coincidente.
- [x] Restringe o seed sintético à conta designada e ao staging.
- [x] Expõe a limitação do Quick Tunnel e separa sua allowlist do login do produto.
- [x] Não inclui credenciais, e-mails de testers ou UID de conta no documento.

**Após a revisão do usuário:** escrever o plano de implementação em entregas atômicas; só então alterar API, web, banco e scripts de staging.
