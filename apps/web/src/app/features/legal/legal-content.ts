export interface LegalDocument {
  title: string;
  intro: string;
  sections: { title: string; paragraphs: string[] }[];
}

export const legalUpdatedOn = '2026-10-13';

export const legalDocuments: Record<string, LegalDocument> = {
  terms: {
    title: 'Termos de Uso',
    intro: 'Condições para usar as ferramentas gratuitas do Black Market.',
    sections: [
      {
        title: 'Sobre o serviço',
        paragraphs: [
          'Black Market é uma plataforma independente para a comunidade de Black Desert Online e não tem afiliação com a Pearl Abyss. As ferramentas disponíveis podem mudar conforme a plataforma evolui.',
          'O uso das ferramentas não concede acesso ao jogo nem executa ações na sua conta. A plataforma não realiza compras, vendas ou transferências por você.',
        ],
      },
      {
        title: 'Informações e resultados',
        paragraphs: [
          'Valores e projeções são informativos e podem estar incompletos ou desatualizados. Confira as informações na tela e avalie se atendem ao seu objetivo antes de tomar uma decisão. Resultados não garantem lucro, disponibilidade de itens ou sucesso no jogo.',
          'Você é responsável por revisar informações que cadastrar ou importar antes de salvá-las ou usá-las em suas decisões.',
        ],
      },
      {
        title: 'Conta e informações salvas',
        paragraphs: [
          'As ferramentas podem guardar informações neste navegador. Quando a sincronização estiver disponível, uma cópia só será vinculada à conta após você iniciar o acesso e confirmar a operação. Mantenha o acesso à sua conta protegido.',
          'Não compartilhe credenciais da sua conta de jogo. Informe somente dados que tenha autorização para usar e evite incluir informações pessoais de outras pessoas.',
        ],
      },
      {
        title: 'Uso permitido e direitos',
        paragraphs: [
          'Não tente acessar dados de outras pessoas, comprometer a operação ou enviar conteúdo ilícito. Marcas e materiais de Black Desert Online pertencem aos respectivos titulares; estes termos não transferem direitos sobre eles.',
          'A disponibilidade do serviço pode ser interrompida para manutenção ou por circunstâncias fora do controle da plataforma. Os direitos garantidos pela legislação aplicável permanecem preservados.',
        ],
      },
      {
        title: 'Alterações e contato',
        paragraphs: [
          'Alterações relevantes nestes termos serão publicadas nesta página com a data de atualização. Para falar com o responsável, consulte Responsável e contato ou a página Contato e suporte.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade',
    intro:
      'Veja quais categorias de informações são tratadas, para que são usadas, por quanto tempo ficam armazenadas e com quem podem ser compartilhadas.',
    sections: [
      {
        title: 'Informações tratadas',
        paragraphs: [
          'As ferramentas podem processar informações que você fornece, como preferências, materiais, personagens, configurações e planejamentos. Esses dados ficam no armazenamento deste navegador até você removê-los. Consultas também processam os critérios necessários para responder ao que você solicitou.',
          'Se você usar uma conta e confirmar a sincronização, os dados selecionados são associados à identidade da conta para manter sua cópia sincronizada. O provedor de identidade pode tratar os dados necessários para autenticação, como um identificador da conta e, quando fornecido, seu e-mail. A plataforma não solicita credenciais do jogo.',
          'Imagens enviadas para leitura são processadas no navegador e não são incluídas na cópia sincronizada pela ferramenta de leitura. Revise as informações reconhecidas antes de salvá-las.',
          'Para operar e proteger o serviço, são tratados registros técnicos como horário, área funcional, tipo de falha, status e identificador da solicitação. Prestadores de conexão e hospedagem podem processar dados técnicos da conexão, como endereço IP, para entregar e proteger o serviço.',
        ],
      },
      {
        title: 'Finalidades e compartilhamento',
        paragraphs: [
          'As informações são usadas para oferecer as ferramentas que você solicita, manter suas preferências, sincronizar a cópia que você confirmar, atender solicitações e investigar falhas. Os critérios de uma consulta são processados para produzir a resposta e não são incluídos nos eventos opcionais de analytics.',
          'Estatísticas de uso são opcionais. Somente após seu aceite, a plataforma pode enviar ao PostHog Cloud um identificador aleatório do navegador e eventos limitados à área visitada, à etapa realizada e a resultados agregados. Esses eventos não incluem sua identidade de conta, e-mail, texto de busca, identificadores ou nomes de itens, conteúdo do armazém, quantidades, valores pessoais, imagens, credenciais ou URL completa. O provedor e os serviços de rede podem processar metadados da conexão necessários à entrega da solicitação.',
          'Dados sincronizados são compartilhados com os serviços que mantêm a conta e a cópia que você pediu para guardar. Prestadores de hospedagem e segurança podem tratar dados técnicos da conexão. Não usamos estatísticas para publicidade. A operação dos prestadores pode ocorrer fora do Brasil.',
        ],
      },
      {
        title: 'Conservação e exclusão',
        paragraphs: [
          'A preferência de região pode permanecer no navegador por até um ano. A escolha de privacidade e o identificador de analytics permanecem por até 180 dias; o identificador de analytics é removido quando você rejeita ou revoga essa categoria. Os prazos e categorias de cookies estão detalhados em Cookies e armazenamento.',
          'Informações guardadas apenas neste navegador permanecem até você apagá-las ou substituir a cópia. Dados sincronizados permanecem enquanto a cópia estiver ativa ou até você pedir sua remoção. Após excluir uma cópia sincronizada, pode ser mantida uma referência técnica mínima de versão e horário enquanto for necessária para impedir que outro dispositivo restaure uma versão antiga.',
          'Eventos já recebidos pelo serviço de analytics não são apagados automaticamente quando você revoga o aceite. O PostHog informa retenção de um ano no plano gratuito e sete anos no plano pago; o prazo depende do plano ativo para o projeto e não é definido pelo aplicativo. Registros operacionais são rotacionados por tamanho; o tempo até sua substituição varia conforme o volume de uso.',
          'Sair da conta não apaga os dados locais deste navegador. Para remover dados sincronizados, use os controles da conta ou o contato indicado nesta página. Cópias de segurança e registros técnicos podem seguir ciclos de retenção próprios da operação.',
        ],
      },
      {
        title: 'Suas escolhas e direitos',
        paragraphs: [
          'Você pode aceitar, rejeitar ou personalizar analytics em Preferências de privacidade no rodapé. A escolha pode ser alterada a qualquer momento. Rejeitar analytics não impede o uso das ferramentas.',
          'Você pode consultar, corrigir, exportar ou solicitar a exclusão de informações ligadas à sua conta conforme os controles disponíveis. Para pedidos de informação sobre tratamento ou compartilhamento, ou para exercer direitos previstos na legislação aplicável, use o canal de contato abaixo.',
          'Não envie senhas, códigos de acesso ou documentos pessoais sem que o responsável indique um procedimento apropriado. O atendimento pode pedir uma confirmação mínima de identidade para proteger seus dados.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies e armazenamento',
    intro:
      'Cookies necessários guardam preferências essenciais. Analytics é opcional, fica desligado até seu aceite e pode ser revogado pelo rodapé.',
    sections: [
      {
        title: 'Cookies necessários',
        paragraphs: [
          'O cookie próprio black-market-region guarda a região selecionada por até um ano. O cookie próprio black-market-privacy registra se você aceitou ou rejeitou analytics e a data dessa escolha por até 180 dias. Esses cookies permitem lembrar preferências e aplicar sua decisão; não medem sua navegação. São cookies próprios, legíveis pela aplicação e enviados apenas ao site que os definiu.',
          'As ferramentas também usam armazenamento local para os dados que você salva neste navegador. O acesso autenticado pode usar armazenamento de sessão quando você inicia o fluxo de conta. Esses dados funcionais são diferentes dos cookies de analytics.',
        ],
      },
      {
        title: 'Analytics opcional',
        paragraphs: [
          'Se você aceitar, o cookie próprio black-market-analytics-id guarda um identificador aleatório por até 180 dias para reconhecer retornos sem associá-los à identidade da sua conta. Enquanto não houver aceite, esse identificador não é criado nem usado e nenhum evento de analytics é enviado.',
          'Os eventos opcionais registram a área da plataforma, a etapa de uso e resultados agregados de algumas ações. Eles são enviados ao PostHog Cloud somente quando o recurso está configurado e você autorizou. O PostHog informa retenção de um ano no plano gratuito e sete anos no plano pago; o prazo depende do plano ativo para o projeto. O aplicativo não inclui pesquisas, nomes ou IDs de itens, conteúdo do armazém, quantidades, imagens ou dados da conta nos eventos. Não há publicidade, gravação de sessão ou captura automática de formulários.',
          'O identificador do navegador é um cookie próprio, legível pela aplicação e enviado apenas ao site que o definiu. Os eventos são enviados ao prestador indicado acima, que pode receber metadados técnicos da conexão para entregar a solicitação. A aplicação não instala cookies de terceiros para publicidade ou medição.',
        ],
      },
      {
        title: 'Aceitar, rejeitar e revogar',
        paragraphs: [
          'O painel oferece opções equivalentes para aceitar ou rejeitar analytics, além de permitir personalizar e salvar a escolha. Você pode reabrir Preferências de privacidade pelo rodapé. Rejeitar ou revogar remove o identificador local, cancela envios pendentes e impede novos eventos. Dados já recebidos pelo prestador não são removidos automaticamente.',
          'A escolha expira após 180 dias para que você possa decidir novamente. Você também pode apagar os cookies nas configurações do navegador. Apagar o armazenamento local remove dados salvos neste dispositivo e pode encerrar sua sessão; exporte um backup antes se quiser guardar sua cópia.',
        ],
      },
    ],
  },
  contact: {
    title: 'Contato e suporte',
    intro:
      'Use o canal indicado em Responsável e contato para dúvidas sobre a plataforma, privacidade ou seus dados.',
    sections: [
      {
        title: 'Como preparar seu pedido',
        paragraphs: [
          'Descreva a ferramenta, os passos realizados e o resultado esperado. Se houver um código de atendimento, inclua apenas esse código. Remova nomes, conversas e outras informações que não sejam necessárias.',
          'Você pode exportar um backup para sua própria segurança. Não envie o arquivo completo ao suporte sem uma necessidade específica e orientação sobre o tratamento.',
          'Nunca envie senhas, códigos de acesso, cookies ou arquivos do cliente do jogo.',
        ],
      },
    ],
  },
};
