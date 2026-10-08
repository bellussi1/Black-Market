#!/bin/sh
# Linux host: Docker Compose + standard coreutils; no monitoring/backup service required.
set -eu
umask 077
task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
task_output="$task_root/data/backups"
mkdir -p "$task_output"
task_output=$(CDPATH= cd -- "$task_output" && pwd -P)
[ "$task_output" = "$task_root/data/backups" ] || { echo 'Backup directory must stay inside the project.' >&2; exit 1; }
chmod 700 "$task_output"
task_lock="$task_output/.backup-lock"
mkdir "$task_lock" || { echo 'Another backup is running or a stale lock needs review.' >&2; exit 1; }
trap 'rmdir "$task_lock"' EXIT
task_retention() {
  task_days=' '; task_weeks=' '; task_daily=0; task_weekly=0
  find "$task_output" -maxdepth 1 -type f -name 'black-market-*.dump' -printf '%f\n' |
    LC_ALL=C sort -r | while IFS= read -r task_name; do
      printf '%s\n' "$task_name" | grep -Eq '^black-market-[0-9]{8}T[0-9]{6}Z\.dump$' || continue
      task_day=$(printf '%s' "$task_name" | cut -c14-21)
      task_year=$(printf '%s' "$task_day" | cut -c1-4)
      task_month=$(printf '%s' "$task_day" | cut -c5-6)
      task_date=$(printf '%s' "$task_day" | cut -c7-8)
      task_week=$(date -u -d "$task_year-$task_month-$task_date" +%G-%V) || continue
      task_keep=0
      case "$task_days" in *" $task_day "*) ;; *)
        if [ "$task_daily" -lt 7 ]; then
          task_days="$task_days$task_day "; task_daily=$((task_daily + 1)); task_keep=1
        fi ;;
      esac
      if [ "$task_keep" -eq 0 ]; then
        case "$task_weeks" in *" $task_week "*) ;; *)
          if [ "$task_weekly" -lt 4 ]; then
            task_weeks="$task_weeks$task_week "; task_weekly=$((task_weekly + 1)); task_keep=1
          fi ;;
        esac
      fi
      if [ "$task_keep" -eq 0 ]; then
        rm -f -- "$task_output/$task_name" "$task_output/$task_name.json"
      fi
    done
}
if [ "${1:-}" = '--retention-only' ]; then task_retention; exit 0; fi
task_stamp=$(date -u +%Y%m%dT%H%M%SZ)
task_dump="$task_output/black-market-$task_stamp.dump"
# Write atomically: partial dumps are never selected by retention or restore.
if ! docker compose --env-file "$task_root/${ENV_FILE:-.env.production}" \
  -f "$task_root/${COMPOSE_FILE:-docker-compose.production.yml}" exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$task_dump.partial"; then
  rm -f -- "$task_dump.partial"; exit 1
fi
mv -- "$task_dump.partial" "$task_dump"
task_hash=$(sha256sum "$task_dump" | cut -d ' ' -f1)
task_revision=$(git -C "$task_root" rev-parse HEAD 2>/dev/null || printf 'unknown')
printf '{"dump":"%s","sha256":"%s","createdAt":"%s","gitRevision":"%s","assets":"copy versioned data/assets separately","retention":"7 daily + 4 weekly"}\n' \
  "$(basename "$task_dump")" "$task_hash" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$task_revision" > "$task_dump.json"
if [ "${APPLY_RETENTION:-0}" = 1 ]; then task_retention; fi
printf 'Backup completed: %s\n' "$(basename "$task_dump")"
