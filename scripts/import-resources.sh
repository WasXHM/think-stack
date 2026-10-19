#!/usr/bin/env bash
set -euo pipefail

# Usage: SSH_USER=root npm run import:resources
SSH_HOST=${SSH_HOST:-101.37.105.190}
SSH_USER=${SSH_USER:-root}
SSH_PORT=${SSH_PORT:-22}
if [[ ! "$SSH_HOST" =~ ^[a-zA-Z0-9.-]+$ || ! "$SSH_USER" =~ ^[a-zA-Z0-9_-]+$ || ! "$SSH_PORT" =~ ^[0-9]+$ ]]; then
  echo 'Invalid SSH_HOST, SSH_USER or SSH_PORT' >&2; exit 1
fi
for command in ssh scp tar; do command -v "$command" >/dev/null || exit 1; done
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d /tmp/think-stack-deploy.XXXXXX)
RELEASE=$(date -u +%Y%m%dT%H%M%SZ)-$$
TARGET="$SSH_USER@$SSH_HOST"
SSH_ARGS=(-p "$SSH_PORT" -o ControlMaster=auto -o ControlPersist=600 -o "ControlPath=$WORK/ssh")
cleanup() {
  ssh "${SSH_ARGS[@]}" -O exit "$TARGET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
# A normal SSH prompt handles the password. No password is stored in this project.
ssh "${SSH_ARGS[@]}" "$TARGET" 'true'
[[ -d "$ROOT/webapi/resources" ]] || { echo 'Local webapi/resources is missing' >&2; exit 1; }
echo 'Importing local resources snapshot; existing remote resources will be backed up and replaced.'
COPYFILE_DISABLE=1 tar -czf "$WORK/resources.tar.gz" -C "$ROOT/webapi/resources" --exclude=.DS_Store .
REMOTE=$(ssh "${SSH_ARGS[@]}" "$TARGET" 'mktemp -d /tmp/think-stack-deploy.XXXXXXXX')
[[ "$REMOTE" =~ ^/tmp/think-stack-deploy\.[a-zA-Z0-9]+$ ]] || exit 1
scp -P "$SSH_PORT" -o "ControlPath=$WORK/ssh" "$WORK/resources.tar.gz" "$ROOT/scripts/import-resources-remote.sh" "$TARGET:$REMOTE/"
# -t allows sudo to prompt for a password for a non-root SSH account.
REMOTE_RUN=sudo
[[ "$SSH_USER" != root ]] || REMOTE_RUN=
ssh -t "${SSH_ARGS[@]}" "$TARGET" "$REMOTE_RUN bash '$REMOTE/import-resources-remote.sh' '$REMOTE/resources.tar.gz' '$RELEASE' '$SSH_HOST'"
printf '\nResources imported to %s:/mnt/apps/think-stack/shared/resources\n' "$SSH_HOST"
