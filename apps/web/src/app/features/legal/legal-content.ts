export interface LegalDocument {
  title: string;
  intro: string;
  sections: { title: string; paragraphs: string[] }[];
  reviewPoints?: string[];
}
export const legalUpdatedOn = '2026-10-08';
export const legalDocuments: Record<string, LegalDocument> = {
  terms: {
    title: 'Termos de Uso',
    intro: 'Condições para usar as consultas e ferramentas gratuitas do Black Market.',
    reviewPoints: [
      'Identificação completa do responsável.',
      'Direitos de uso e distribuição dos dados e imagens do jogo.',
      'Condições de uso, responsabilidades e procedimento para mudanças relevantes.',
    ],
    sections: [
      {
        title: 'Uma plataforma independente',
        paragraphs: [
          'Black Market é uma plataforma independente para a comunidade de Black Desert Online. Não há afiliação com a Pearl Abyss. Consultas e ferramentas deste MVP são gratuitas. Informações do responsável e contato são apresentadas abaixo quando configuradas.',
        ],
      },
      {
        title: 'Estimativas e dados do jogo',
        paragraphs: [
          'Preços têm origem e horário de consulta; podem estar desatualizados. Rendimentos dependem de tempo, energia, maestria, custos, impostos e disponibilidade. Resultados não garantem lucro, obtenção de itens ou sucesso em aprimoramento. Dados ausentes são indicados como indisponíveis.',
          'A plataforma não realiza compras, vendas, transferências ou ações no jogo. Você toma suas decisões e confere os valores antes de aplicá-los.',
        ],
      },
      {
        title: 'Conta e materiais informados',
        paragraphs: [
          'Você pode usar as ferramentas sem conta. A sincronização, quando disponível, exige entrar na sua conta e confirmar qual cópia utilizar. Não compartilhe o acesso. A plataforma não solicita sua senha do BDO.',
          'Informe apenas dados que você tem autorização para usar. Prints são revisados no navegador; confira os itens e números antes de confirmar. Não inclua dados pessoais desnecessários de outras pessoas.',
        ],
      },
      {
        title: 'Uso permitido e direitos',
        paragraphs: [
          'Não use a plataforma para tentar acessar dados de outras pessoas, comprometer sua operação ou enviar conteúdo ilícito. Imagens e dados do jogo pertencem aos respectivos titulares. A apresentação de referências não transfere direitos sobre esses materiais.',
          'A disponibilidade e a cobertura dos dados podem mudar. Em caso de erro, preserve seu backup e procure suporte. Os direitos garantidos pela legislação aplicável são preservados.',
        ],
      },
      {
        title: 'Mudanças e contato',
        paragraphs: [
          'Mudanças relevantes nestas condições serão indicadas com nova versão e data. Consulte a Política de Privacidade para entender o tratamento de dados e como exercer seus direitos.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade',
    intro:
      'Entenda quais informações são utilizadas, o que fica no seu navegador e como fazer solicitações sobre seus dados.',
    reviewPoints: [
      'Identificação jurídica do responsável e canal de atendimento aos titulares.',
      'Bases legais por finalidade, incluindo segurança e telemetria operacional.',
      'Prazos de retenção, exclusão de conta e remoção de backups.',
      'Prestadores, contratos e garantias para transferências internacionais.',
    ],
    sections: [
      {
        title: 'Quais informações são utilizadas',
        paragraphs: [
          'Preferências de região e dados que você informa sobre estoque, personagem, prata virtual, maestria, equipamentos, sessões e planos ficam neste navegador. Quando você confirma sincronização, a cópia estruturada é guardada para sua conta.',
          'Quando o acesso à conta estiver configurado, o serviço de identidade Supabase trata as informações necessárias ao acesso, como e-mail e identificador de conta. O acesso por Google é opcional quando configurado. Não pedimos credenciais do jogo.',
          'Prints e recortes são processados na memória deste navegador. Não são enviados ao servidor nem incluídos na cópia da conta. A confirmação salva somente os valores estruturados revisados.',
          'Para investigar falhas, a plataforma registra horário, funcionalidade, status, duração e código de atendimento. Relatos de erro não incluem o conteúdo de formulários, prints, senhas ou sua identidade de conta. Prestadores de conexão podem tratar o endereço de rede para entregar e proteger o serviço.',
        ],
      },
      {
        title: 'Finalidades e escolhas',
        paragraphs: [
          'Dados funcionais permitem atender às consultas e ao planejamento que você solicita, manter preferências, sincronizar sua cópia e proteger a operação. As bases legais dessas finalidades precisam ser validadas pelo responsável.',
          'Estatísticas de uso são opcionais e ficam desligadas até sua autorização e a configuração do serviço. Você pode rejeitar ou revogar essa escolha no rodapé. Não incluímos nomes, e-mail, prints, valores do seu estoque ou credenciais nesses eventos.',
        ],
      },
      {
        title: 'Serviços envolvidos',
        paragraphs: [
          'A plataforma guarda a cópia sincronizada em seu banco de dados. Supabase Auth fornece identidade quando ativado. Cloudflare pode atender à entrada e proteção; Better Stack pode verificar a disponibilidade pública. PostHog Cloud recebe estatísticas de funcionalidades apenas quando configurado e autorizado. A presença destes serviços na política não significa que todos estejam ativados.',
          'O mecanismo de leitura de prints baixa arquivos técnicos de reconhecimento na primeira utilização. Isso envolve conexões a provedores de distribuição de arquivos; a imagem permanece no navegador. Prestadores de infraestrutura podem processar dados técnicos de conexão. Não presumimos anonimato só por uma ferramenta não usar cookies.',
          'Serviços podem tratar dados fora do Brasil. A configuração de regiões, contratos, garantias de transferência e retenção precisa ser validada antes da ativação pública.',
        ],
      },
      {
        title: 'Conservação e remoção',
        paragraphs: [
          'Dados locais permanecem até você remover o armazenamento ou substituir a cópia. Preferências de privacidade expiram após 180 dias para solicitar nova escolha. Sair da conta não apaga o estoque deste navegador. Excluir a cópia da conta remove seu conteúdo, mantendo apenas uma referência de identidade, versão e horário para evitar sobrescritas por dispositivos antigos; a retenção dessa referência exige definição pelo responsável.',
          'Estatísticas opcionais usam um identificador aleatório deste navegador, removido ao revogar a escolha. Isso impede novas emissões; não apaga automaticamente eventos já recebidos pelo prestador. A retenção de dados remotos, backups e eventos deve ser definida pelo responsável e informada antes da publicação.',
          'Registros operacionais são substituídos conforme o volume armazenado, sem prazo em dias garantido nesta versão. Excluir a cópia sincronizada não exclui automaticamente a identidade de acesso, os registros operacionais ou todas as cópias de segurança. Solicite orientação pelo contato abaixo.',
        ],
      },
      {
        title: 'Seus direitos e suporte',
        paragraphs: [
          'Você pode exportar seus dados nas ferramentas de backup e excluir a cópia sincronizada em Minha conta. Para solicitações de acesso, correção, informação sobre compartilhamento ou exclusão que não consiga concluir na interface, use o contato informado abaixo.',
          'Conforme a LGPD e as condições aplicáveis, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou exclusão, portabilidade, informação sobre compartilhamento e sobre a possibilidade de não consentir, além de revogar consentimento. Solicitações serão avaliadas conforme sua finalidade e os requisitos legais; não prometemos exclusão automática de dados cuja conservação seja legalmente exigida.',
          'O atendimento pode exigir confirmação mínima de identidade para proteger seus dados. Não envie senha, código de acesso ou documento pessoal por iniciativa própria. Caso seja necessário verificar alguma informação, o responsável deve orientar um procedimento adequado.',
          'O responsável e o canal de solicitações estão apresentados em Responsável e contato. A identificação jurídica completa e o procedimento de atendimento aos direitos da LGPD devem ser revisados antes do lançamento.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies e armazenamento',
    intro:
      'Usamos armazenamento para funções solicitadas e, somente com autorização, estatísticas opcionais. Rejeitar estatísticas não impede o uso das ferramentas.',
    reviewPoints: [
      'Classificação de tecnologias necessárias e opcionais.',
      'Bases legais, duração e tratamento pelos prestadores.',
      'Nova avaliação antes de ativar publicidade ou outras ferramentas de rastreamento.',
    ],
    sections: [
      {
        title: 'Funcionalidades necessárias',
        paragraphs: [
          'A preferência de mercado usa o cookie black-market-region. Os dados das ferramentas, preferências de privacidade e backups usam armazenamento local deste navegador. Informações de acesso, quando você entra na conta, usam armazenamento da sessão. Não são cookies de publicidade.',
          'O cookie de mercado pode durar até um ano. A preferência de privacidade solicita nova escolha após 180 dias. Os dados locais das ferramentas permanecem até você removê-los. A sessão de acesso é limitada a esta aba; sua validade também depende do serviço de identidade.',
        ],
      },
      {
        title: 'Estatísticas opcionais',
        paragraphs: [
          'Quando configurado e autorizado, PostHog Cloud recebe eventos de navegação e conclusão de tarefas com nomes de funcionalidades. Um identificador aleatório do navegador permite estimar retorno e retenção. Não enviamos sua identidade de conta. Não há gravação de sessão, captura automática de formulários ou publicidade ativada nesta versão.',
          'Rejeitar mantém as ferramentas disponíveis. Revogar remove o identificador local e interrompe novos eventos. Preferências podem ser alteradas a qualquer momento pelo rodapé.',
        ],
      },
      {
        title: 'Como gerenciar suas escolhas',
        paragraphs: [
          'Use Preferências de privacidade no rodapé para aceitar, rejeitar ou personalizar estatísticas. A alteração interrompe novos envios conforme a escolha; dados já enviados não são apagados automaticamente.',
          'Você também pode apagar cookies e dados deste site pelas configurações do seu navegador. Antes de fazer isso, exporte seu backup em Dados e backup: apagar o armazenamento local remove os dados salvos neste dispositivo e pode encerrar sua sessão.',
        ],
      },
      {
        title: 'Serviços externos',
        paragraphs: [
          'O acesso à conta e a distribuição de arquivos de reconhecimento têm políticas próprias dos respectivos prestadores. Cloudflare pode processar dados técnicos da conexão para segurança. O monitoramento de disponibilidade consulta páginas públicas. A lista de prestadores deve ser conferida na Política de Privacidade.',
          'Não há GA4, GTM, Clarity ou coleta simultânea de Cloudflare Web Analytics adicionada pelo código. Caso o mantenedor ative um recurso de estatísticas automaticamente pelo provedor, ele precisa ser inventariado e vinculado às escolhas pertinentes antes do lançamento.',
        ],
      },
    ],
  },
  contact: {
    title: 'Contato e suporte',
    intro:
      'Informe a ferramenta em que ocorreu o problema e o horário aproximado. Nunca envie senhas, códigos de acesso, cookies ou arquivos do cliente do jogo.',
    sections: [
      {
        title: 'Como preparar seu pedido',
        paragraphs: [
          'Descreva os passos e o resultado esperado. Se uma mensagem tiver um código de atendimento, inclua apenas esse código. Remova nome, guilda, chat e outras informações desnecessárias de capturas.',
          'Você pode exportar um backup para sua própria segurança; não o envie completo ao suporte sem uma necessidade específica e orientação sobre o tratamento.',
        ],
      },
      {
        title: 'Privacidade',
        paragraphs: [
          'Use o canal apresentado em Responsável e contato para dúvidas sobre tratamento de dados ou direitos. Não há formulário de contato ou envio automático nesta versão.',
        ],
      },
    ],
  },
};
