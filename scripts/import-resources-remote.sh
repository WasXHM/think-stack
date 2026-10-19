#!/usr/bin/env bash
set -euo pipefail
ARCHIVE=${1:?Missing archive}
IMPORT_ID=${2:?Missing import ID}
[[ $EUID == 0 && "$IMPORT_ID" =~ ^[a-zA-Z0-9-]+$ ]] || exit 1
BASE=/mnt/apps/think-stack
DATA="$BASE/shared/resources"
MARKER="$BASE/shared/.resources-imported"
[[ -d "$DATA" && -L "$BASE/current" ]] || { echo 'Deploy the application before importing resources' >&2; exit 1; }
exec 9>"$BASE/.deploy.lock"
flock -n 9 || { echo 'A deployment or import is running' >&2; exit 1; }
[[ ! -e "$MARKER" ]] || { echo "Import already completed: $MARKER. Refusing to overwrite remotely maintained data." >&2; exit 1; }
# Require the new shared image storage code before importing any data.
[[ -f "$BASE/current/lib/resources.js" ]] || { echo 'Run npm run deploy with the updated storage code before importing.' >&2; exit 1; }
command -v python3 >/dev/null || { echo 'python3 is required to validate the resource archive' >&2; exit 1; }
STAGE="$BASE/shared/.resources-import-$IMPORT_ID"
BACKUP="$BASE/backups/resources-before-$IMPORT_ID"
[[ ! -e "$STAGE" && ! -e "$BACKUP" ]] || exit 1
mkdir -p "$STAGE" "$BASE/backups"
chmod 700 "$BASE/backups"
# Accept only ordinary files/directories and validate JSON before stopping service.
python3 - "$ARCHIVE" "$STAGE" <<'PY'
import json, pathlib, sys, tarfile
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    members = archive.getmembers()
    for member in members:
        p = pathlib.PurePosixPath(member.name)
        if p.is_absolute() or '..' in p.parts or not (member.isfile() or member.isdir()):
            raise SystemExit('Unsafe archive entry: ' + member.name)
        if member.isfile() and p.suffix == '.json':
            json.load(archive.extractfile(member))
    archive.extractall(sys.argv[2], members=members)
PY
chown -R think-stack:think-stack "$STAGE"
chmod -R u=rwX,go= "$STAGE"
WAS_ACTIVE=false
systemctl is-active --quiet think-stack && WAS_ACTIVE=true
OLD_MOVED=false
NEW_MOVED=false
rollback() {
  status=$?
  trap - ERR HUP INT TERM
  systemctl stop think-stack || true
  if [[ "$NEW_MOVED" == true ]]; then mv "$DATA" "$STAGE.failed"; fi
  if [[ "$OLD_MOVED" == true ]]; then mv "$BACKUP" "$DATA"; fi
  rm -f "$MARKER"
  if [[ "$WAS_ACTIVE" == true ]]; then systemctl start think-stack || true; fi
  echo 'Import failed; original resources restored where possible. Inspect service logs.' >&2
  exit "$status"
}
trap rollback ERR
trap 'false' HUP INT TERM
systemctl stop think-stack
# Moving the full old directory preserves an exact backup; no file is overwritten.
mv "$DATA" "$BACKUP"
OLD_MOVED=true
mv "$STAGE" "$DATA"
NEW_MOVED=true
systemctl start think-stack
HEALTHY=false
for attempt in {1..30}; do
  if curl -fsS --connect-timeout 2 --max-time 5 http://127.0.0.1:3100/think-stack/api/health >/dev/null 2>&1; then HEALTHY=true; break; fi
  sleep 2
done
[[ "$HEALTHY" == true ]]
if [[ "$WAS_ACTIVE" != true ]]; then systemctl stop think-stack; fi
printf 'Imported %s\nBackup: %s\n' "$IMPORT_ID" "$BACKUP" > "$MARKER"
trap - ERR HUP INT TERM
rm -f "$ARCHIVE" "$(dirname "$ARCHIVE")/import-resources-remote.sh"
rmdir "$(dirname "$ARCHIVE")"
printf 'Import complete. Previous resources preserved at %s\n' "$BACKUP"
