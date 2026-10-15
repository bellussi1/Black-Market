# Backup e recuperação

## Implementado e validado localmente

`scripts/backup-database.ps1` gera pg_dump custom, copia para data/backups e grava manifesto SHA-256, UTC e revisão Git. `-ApplyRetention` mantém até 7 dias distintos mais 4 semanas distintas entre os dumps gerados; poda apenas arquivos com prefixo específico dentro do diretório validado no projeto. Não usar diretório público ou versionar backups. O script não inclui arquivos de imagens.

`scripts/restore-drill.ps1` exige manifesto com nome e SHA-256 válidos por padrão; dump externo sem manifesto exige -AllowUnverified explícito após verificar sua origem. Em seguida, cria banco com nome reservado de verificação, restaura com pg_restore --exit-on-error --no-owner e consulta tabelas/catálogo/referências. Remove apenas o banco que criou. O banco original é preservado. Um ensaio foi executado no PostgreSQL local em 08/10/2026; evidência da contagem está na auditoria final.

```powershell
pwsh -File scripts/backup-database.ps1 -ComposeFile docker-compose.production.yml -EnvFile .env.production -ApplyRetention
pwsh -File scripts/restore-drill.ps1 -Dump data/backups/black-market-AAAA.dump -ComposeFile docker-compose.production.yml -EnvFile .env.production
```

## Pendências de operação

Agendar uma execução diária no host (Task Scheduler Windows ou cron nativo no Linux, com PowerShell 7 instalado). A execução deve usar a raiz do projeto como diretório de trabalho e usuário autorizado, sem imprimir env/secrets. Não há agendamento criado. Monitorar data do último backup e falha do job. Alvo inicial de RPO 24 h e RTO 2 h é objetivo, **não SLA medido**.

Copiar dump/manifesto e `data/assets/<checksum>` para armazenamento externo privado protegido; aplicar retenção também ali e criptografia em trânsito/repouso. Sem chave/destino informado, cópia externa não foi configurada. Backup no mesmo disco não protege contra perda do host. Não tratar Git como backup do catálogo ou dos usuários.

## Recuperação real

1. Suspender escritas e preservar banco atual e logs. Confirmar ambiente e checksum.
2. Executar o ensaio em banco separado. Conferir contagem de itens, referências, versões e, se existirem, cópias de usuários com consultas agregadas sem publicar conteúdos.
3. Restaurar em **novo volume/banco** com nomes exclusivos, reaplicar migrações compatíveis somente após revisar versão.
4. Copiar assets do checksum esperado e verificar integrity.json. Subir aplicação da revisão correspondente e executar smoke checks.
5. Trocar entrada somente após aprovação operacional; manter volume anterior para retorno. Não usar `down -v` e não sobrescrever o banco de origem durante diagnóstico.
6. Testar mensalmente e antes de migração relevante. Documentar duração, volume, revisão e resultado sem dados pessoais.

## Helper Linux e controles adicionais

`scripts/backup-database.sh` usa Docker Compose e coreutils, sem exigir PowerShell. Gera dump e manifesto, protege gravação com lock/arquivo parcial e aplica retenção opcional com APPLY_RETENTION=1. Ver [agendamento e evidências de restauração](security-hardening.md). Agendamento e cópia externa permanecem pendentes.

## Plano para cópias externas cifradas

As cópias remotas devem receber o dump PostgreSQL e os assets por checksum. O destino será um bucket privado compatível com S3, escolhido e configurado por ambiente; endpoint, bucket, região e credencial de escrita não entram no código nem no Git. A identidade de upload terá acesso restrito ao prefixo de backup, sem leitura do banco e sem permissão para alterar a configuração de retenção.

Antes do upload, cifrar cada arquivo no host com `age` usando um destinatário público configurado fora do repositório. O arquivo privado de recuperação fica em um gerenciador de segredos e em uma cópia offline separada do host de backup. O serviço de backup não recebe a chave privada. TLS protege o transporte; a criptografia do objeto no provedor pode ser habilitada como camada adicional. O manifesto remoto registra nomes, horários, revisão e SHA-256 do arquivo cifrado, sem IDs de usuário, nomes de personagem ou conteúdo do workspace.

Manter a retenção atual de 7 cópias diárias e 4 semanais, com versionamento e proteção contra exclusão no bucket quando disponíveis. Monitorar idade e resultado do último upload; falha ou cópia vencida deve gerar alerta operacional. Aplicar o mesmo fluxo ao conjunto de assets, com verificação do checksum antes e depois da transferência.

O ensaio de restauração deve baixar e validar os objetos, decifrá-los em ambiente temporário isolado e conferir a restauração antes de apagar o ambiente. Backups de produção não devem ser restaurados no staging: ele permanece com dados sintéticos. Alvos iniciais de recuperação são RPO de 24 horas e RTO de 2 horas; ainda precisam ser medidos e não constituem SLA.

Este é o desenho operacional, não uma configuração ativa. O provedor, destino, credenciais e destinatário de criptografia ainda não foram definidos, e não há configuração real de deploy produtivo disponível para confirmar frequência, retenção ou cobertura. O backup local de staging continua sem criptografia externa até essas decisões e credenciais existirem.
