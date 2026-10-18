# Footer e páginas legais

## Implementação

Conteúdo estático em `apps/web/src/app/features/legal/legal-content.ts`, com HTML e SCSS próprios, carregado pelas rotas públicas `/termos`, `/privacidade`, `/cookies` e `/contato`. Não há CMS, novas tabelas, dependências ou cobrança adicional. O contato usa Bellussi e enzobellussi3@gmail.com como valores informados; a configuração pública existente pode atualizar o bloco de contato. O documento continua legível se essa consulta falhar.

O componente `PlatformFooter` é compartilhado por todas as rotas Angular e contém identidade, documentos, contato, preferências e aviso de independência. A página estática `/sobre/` mantém somente a apresentação geral do produto e links legais; não publica fornecedores de dados nem explicações de cálculo. O ano é calculado em UTC para manter consistência entre servidor e navegador; em `/sobre/`, o servidor atualiza o ano no HTML sem adicionar JavaScript. A cópia estática usada pelo servidor de desenvolvimento mantém o ano editado no arquivo. Cache de cinco minutos pode atrasar a atualização na virada do ano.

As menções públicas a Black Desert Online são acompanhadas de aviso explícito de que o Black Market é uma ferramenta independente e não tem afiliação com a Pearl Abyss. A regra se aplica ao shell, footer, descrições SEO/SSR, página estática `/sobre/`, `llms.txt` e documentação de entrada. Esse aviso não concede licença, não confirma direitos de uso de dados/assets e não substitui revisão jurídica.

A interface preserva a paleta verde, tipografia e controles existentes. Links e botões têm altura mínima de 44px e foco visível. Footer passa de três colunas para uma em até 760px; sumário legal passa para uma coluna em até 600px. Texto e contato longo podem quebrar linhas; não há dimensões horizontais fixas. Cada página tem um h1, seções nomeadas, sumário com âncoras e navegação com `aria-current`. A atualização do documento é explícita em `legalUpdatedOn`, não a data automática do copyright.

Preferências abrem o `PrivacyService` e o painel já existente; a ação funciona também quando analytics não está configurado. Ela não autoriza coleta por si só. O componente só oferece a categoria opcional se o serviço estiver disponível, permite revogar escolha anterior, comunica falha de persistência e devolve foco após fechar por teclado. A preferência fica em cookie próprio por até 180 dias; o identificador opcional só é gravado em cookie próprio depois do aceite e é removido ao revogar. Preferências entre abas usam `BroadcastChannel` quando disponível. Cookies usam `SameSite=Lax` e `Secure` em HTTPS. Não foi adicionada outra solução de consentimento.

## Conteúdo conforme funcionalidades reais

- Termos: consultas e estimativas sem garantia de resultado, ausência de operações dentro do jogo, conta, revisão das informações cadastradas, uso permitido, direitos dos titulares e mudanças.
- Privacidade: categorias de dados, finalidades, sincronização voluntária, processamento local de imagens, analytics consentido, prestadores, retenção e direitos. O conteúdo público não descreve a origem dos dados de jogo nem fórmulas internas.
- Cookies: cookie de região por até um ano, escolha por até 180 dias, identificador opcional por até 180 dias após consentimento, armazenamento local e revogação.
- Contato: canal direto, instruções para relatar erros, código de atendimento e minimização de informações enviadas. Não há formulário, promessa de resposta em prazo inventado ou abertura automática de chamados.

Nenhuma razão social, CNPJ, endereço ou afiliação foi inventada. A seção pública não informa fontes de dados do jogo nem métodos de cálculo. A divulgação de analytics descreve o PostHog Cloud porque é o serviço configurável no código; o envio só ocorre em produção quando configurado e após aceite.

## Revisão humana antes da publicação

**Os documentos não são juridicamente validados.** Pontos específicos aparecem nas próprias páginas e devem ser resolvidos pelo responsável e profissional habilitado:

1. Confirmar identificação completa do responsável/controlador e requisitos de canal/encarregado aplicáveis ao porte e atividade; Bellussi é identificação provisória fornecida pelo mantenedor.
2. Validar bases legais de cada finalidade, necessidade e proporcionalidade da telemetria e dos armazenamentos funcionais. Não considerar toda operação necessária automaticamente dispensada de avaliação.
3. Definir prazos efetivos de conta, cópia sincronizada, referência operacional de exclusão, logs, backups e analytics; aplicar os prazos antes de afirmar que a retenção está definida. Revogar analytics não apaga eventos recebidos; excluir a cópia não exclui automaticamente a identidade.
4. Conferir direitos de utilização e distribuição de dados/imagens, licença do extractor, política dos titulares e viabilidade de publicidade. Este footer não concede direitos sobre conteúdo do jogo.
5. Conferir regiões, contratos dos prestadores e garantias para transferências internacionais. Inventariar novamente depois da ativação do domínio e dos serviços.
6. Definir atendimento aos direitos, confirmação mínima de identidade, processo de incidentes e comunicações exigíveis. Avaliar as obrigações do Marco Civil da Internet conforme a operação efetiva; esta etapa não estabelece prazo obrigatório de logs sem essa análise.
7. Revisar condições de uso, mudanças relevantes, público-alvo e eventual tratamento de dados de crianças/adolescentes; não foi inventada uma política etária.

Fontes de referência consultadas em 08/10/2026: [texto da LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) e [guia de cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais). A consulta não substitui revisão jurídica ou validação da configuração real.

## Testes e limites

- Vitest/Angular: quatro documentos, h1 único, data semântica, destinos das âncoras, seções nomeadas, contato, aviso de revisão, navegação real das quatro rotas com indicador atual, links do footer, ano, rejeição/aceite seletivo, revogação quando analytics está indisponível, foco com Escape e aviso quando a escolha não pode ser salva.
- `pnpm test:legal:layout`: contratos CSS de quebra, colunas móveis, alvos de toque e foco. Contraste calculado dos tokens de texto/link contra fundo e superfície: mínimo **7,80:1**. O script entra no CI.
- `pnpm test:ssr`: HTML real de Home, páginas legais e Sobre, presença dos links legais no footer, ano, preferências, headers e ausência de JavaScript inline incompatível com CSP; preserva teste de noindex pessoal.
- Compilação e lint executados. Nenhum teste de navegador visual ou leitor de tela foi declarado concluído; JSDOM não mede geometria, zoom ou reflow.

Validação visual manual pendente: 320, 390, 760 e 1280px, zoom 200%, Tab/Shift+Tab, ativação com Enter/Space, foco retornando após fechar preferências, âncoras do sumário e leitura das seções com leitor de tela. Confirmar ausência de rolagem horizontal e que nenhuma camada encobre foco. Esses checks completam os contratos automatizados, sem certificação de acessibilidade.
