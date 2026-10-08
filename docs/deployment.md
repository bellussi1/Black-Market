# Hospedagem e deploy do MVP

A configuração atual usa um único host Docker Compose com PostgreSQL, Nest, Angular SSR e Nginx. Cloudflare fica na entrada via Tunnel/CDN/DNS; não há Nest/PostgreSQL em Workers. Não adicionar Redis, fila/worker de OCR ou banco externo nesta fase: leitura de prints ocorre no navegador.

Procedimento, custos, checklists e rollback: [auditoria de produção](production-audit.md). Variáveis e identidade: [produção e contas](production-and-accounts.md). [Backup e recuperação](backup-recovery.md), [segurança](security.md), [logs/uptime](observability.md).

Domínio, host, Tunnel e contas dos serviços ainda não configurados. Código/Compose não comprovam deploy público. Clonar Git não popula catálogo: transferir banco autorizado e data/assets/<checksum> com manifests e índice visual. Não publicar arquivos de instalação nem dumps no servidor web. Assets são montados em leitura para a aplicação; publicação do catálogo é uma tarefa separada do mantenedor.

CI compila/testa/linta e executa smoke HTTP SSR; o deploy público inicial permanece manual com imagem identificada. Não inserir secrets no Docker build context ou registrar compose config com valores. Usar arquivo privado específico para produção e volumes distintos de desenvolvimento/staging.
