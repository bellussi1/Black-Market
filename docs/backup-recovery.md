# Backup e recuperação

## Implementado e validado localmente

`scripts/backup-database.ps1` gera pg_dump custom, copia para data/backups e grava manifesto SHA-256, UTC e revisão Git. `-ApplyRetention` mantém até 7 dias distintos mais 4 semanas distintas entre os dumps gerados; poda apenas arquivos com prefixo específico dentro do diretório validado no projeto. Não usar diretório público ou versionar backups. O script não inclui arquivos de imagens.

`scripts/restore-drill.ps1` confere manifesto quando presente, cria banco com nome reservado de verificação, restaura com pg_restore --exit-on-error --no-owner e consulta tabelas/catálogo/referências. Remove apenas o banco que criou. O banco original é preservado. Um ensaio foi executado no PostgreSQL local em 08/10/2026; evidência da contagem está na auditoria final.

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
