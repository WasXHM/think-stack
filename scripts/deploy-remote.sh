#!/usr/bin/env bash
set -euo pipefail
ARCHIVE=${1:?Missing archive}
RELEASE=${2:?Missing release}
SERVER_NAME=${3:?Missing server name}
[[ "$RELEASE" =~ ^[a-zA-Z0-9-]+$ && "$SERVER_NAME" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 1
[[ $EUID == 0 ]] || { echo 'Run as root or using sudo' >&2; exit 1; }
BASE=/mnt/apps/think-stack
APP="$BASE/releases/$RELEASE"
for command in node npm nginx systemctl curl flock runuser useradd; do
  command -v "$command" >/dev/null || { echo "Please install $command on the server first" >&2; exit 1; }
done
NODE=$(command -v node)
NPM=$(command -v npm)
BUILD_PATH="$(dirname "$NODE"):$(dirname "$NPM"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
"$NODE" -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(1)' || { echo 'Node.js >=20 is required' >&2; exit 1; }
[[ -d /etc/nginx/conf.d && -d /run/systemd/system ]] || { echo 'Requires Nginx conf.d and systemd' >&2; exit 1; }
diagnostics() {
  echo '--- Service diagnostics (before rollback) ---' >&2
  systemctl status think-stack nginx --no-pager -l >&2 || true
  journalctl -u think-stack -u nginx -n 80 --no-pager >&2 || true
  if command -v ss >/dev/null; then
    ss -ltnp '( sport = :80 or sport = :443 or sport = :3100 )' >&2 || true
  fi
  if [[ -r /var/log/nginx/error.log ]]; then tail -n 40 /var/log/nginx/error.log >&2 || true; fi
}
# A manually launched Nginx, Apache or container can already own port 80.
# Never stop that process or try to start a second gateway over it.
if ! systemctl is-active --quiet nginx && command -v ss >/dev/null; then
  LISTENERS=$(ss -H -ltnp 'sport = :80')
  if [[ -n "$LISTENERS" ]]; then
    echo 'Port 80 is occupied, but nginx.service is not active. Resolve the existing gateway before deploying:' >&2
    printf '%s\n' "$LISTENERS" >&2
    diagnostics
    exit 1
  fi
fi
nginx -t || { diagnostics; exit 1; }
# Refuse a duplicate IP virtual host rather than silently replacing another site.
if nginx -T 2>&1 | awk -v host="$SERVER_NAME" '
  /^# configuration file / { file=$4; sub(/:$/, "", file) }
  $1 == "server_name" && file != "/etc/nginx/conf.d/think-stack.conf" {
    for (i=2; i<=NF; i++) { name=$i; gsub(/;/, "", name); if (name == host) found=1 }
  }
  END { exit !found }
'; then
  echo "An existing Nginx server_name uses $SERVER_NAME; merge the /think-stack/ location into that site first." >&2
  exit 1
fi
mkdir -p "$BASE"
exec 9>"$BASE/.deploy.lock"
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
if ! id think-stack >/dev/null 2>&1; then
  useradd --system --user-group --home-dir "$BASE" --shell /usr/sbin/nologin think-stack
fi
mkdir -p "$BASE/releases" "$BASE/shared/resources" "$BASE/shared/home"
chown think-stack:think-stack "$BASE/shared" "$BASE/shared/resources" "$BASE/shared/home"
# nvm installations under a private home cannot be traversed by the service.
# Copy Node and npm together into a root-owned, release-specific runtime.
# Do not change home permissions or leave links pointing back into /root.
NODE_REAL=$("$NODE" -p 'process.execPath')
case "$NODE_REAL" in
  */.nvm/versions/node/*/bin/node)
    NODE_PREFIX=${NODE_REAL%/bin/node}
    [[ -f "$NODE_PREFIX/lib/node_modules/npm/bin/npm-cli.js" ]] || {
      echo "Cannot locate npm in nvm installation: $NODE_PREFIX" >&2; exit 1;
    }
    RUNTIME="$BASE/runtimes/$RELEASE"
    [[ ! -e "$RUNTIME" ]] || { echo "Runtime already exists: $RUNTIME" >&2; exit 1; }
    mkdir -p "$RUNTIME/bin" "$RUNTIME/lib/node_modules"
    cp -L "$NODE_REAL" "$RUNTIME/bin/node"
    cp -RL "$NODE_PREFIX/lib/node_modules/npm" "$RUNTIME/lib/node_modules/npm"
    ln -s ../lib/node_modules/npm/bin/npm-cli.js "$RUNTIME/bin/npm"
    ln -s ../lib/node_modules/npm/bin/npx-cli.js "$RUNTIME/bin/npx"
    chown -R root:root "$RUNTIME"
    chmod -R u=rwX,go=rX "$RUNTIME"
    chmod 755 "$BASE/runtimes" "$RUNTIME/bin/node"
    NODE="$RUNTIME/bin/node"
    NPM="$RUNTIME/bin/npm"
    BUILD_PATH="$RUNTIME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    echo "Using project Node.js runtime: $RUNTIME"
    ;;
esac
# runuser can reset PATH. Check the exact binaries as the service user before
# extracting or building a release, and pass the same PATH to every npm child.
if ! runuser -u think-stack -- env PATH="$BUILD_PATH" "$NODE" --version ||
   ! runuser -u think-stack -- env HOME="$BASE/shared/home" PATH="$BUILD_PATH" "$NPM" --version; then
  printf 'think-stack cannot execute Node.js/npm: node=%s npm=%s\n' "$NODE" "$NPM" >&2
  echo 'Check execute permissions on these binaries and their parent directories; think-stack must be able to traverse /mnt/apps/think-stack.' >&2
  exit 1
fi
[[ ! -e "$APP" ]] || { echo 'Release already exists' >&2; exit 1; }
mkdir "$APP"
tar -xzf "$ARCHIVE" -C "$APP"
chown -R think-stack:think-stack "$APP"
# Build on Linux so native dependencies match the target machine.
runuser -u think-stack -- env HOME="$BASE/shared/home" PATH="$BUILD_PATH" NEXT_TELEMETRY_DISABLED=1 \
  bash -c 'cd "$1"; "$2" ci --no-audit --no-fund && "$2" run build' bash "$APP" "$NPM"
UNIT_FILE=/etc/systemd/system/think-stack.service
if [[ -f "$UNIT_FILE" ]]; then cp "$UNIT_FILE" "$APP/service.previous"; fi
cat > "$UNIT_FILE" <<UNIT
[Unit]
Description=ThinkStack Next.js
After=network.target

[Service]
Type=simple
User=think-stack
Group=think-stack
WorkingDirectory=$BASE/current
Environment="PATH=$BUILD_PATH"
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=RESOURCES_DIR=$BASE/shared/resources
ExecStart=$NODE $BASE/current/node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100
Restart=on-failure
RestartSec=5
UMask=0027
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
NGINX=/etc/nginx/conf.d/think-stack.conf
if [[ -f "$NGINX" ]]; then cp "$NGINX" "$APP/nginx.previous"; fi
cat > "$NGINX" <<NGINX_CONF
server {
    listen 80;
    server_name $SERVER_NAME;
    client_max_body_size 11m;

    # Next.js owns slash normalization; proxy both forms without redirecting.
    location ~ ^/think-stack(/|$) {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
NGINX_CONF
restore_nginx() {
  if [[ -f "$APP/nginx.previous" ]]; then cp "$APP/nginx.previous" "$NGINX"; else rm -f "$NGINX"; fi
}
restore_unit() {
  if [[ -f "$APP/service.previous" ]]; then cp "$APP/service.previous" "$UNIT_FILE"; else rm -f "$UNIT_FILE"; fi
  systemctl daemon-reload
}
if ! nginx -t; then diagnostics; restore_nginx; restore_unit; exit 1; fi
PREVIOUS=$(readlink "$BASE/current" || true)
activate() {
  ln -s "$1" "$BASE/.current-$RELEASE"
  mv -Tf "$BASE/.current-$RELEASE" "$BASE/current"
}
rollback() {
  local status=$?
  trap - ERR
  diagnostics
  echo 'Deployment failed; restoring previous release' >&2
  restore_nginx
  # Stop while the new unit still exists, then restore the old runtime path too.
  systemctl stop think-stack || true
  restore_unit || true
  if [[ -n "$PREVIOUS" ]]; then
    activate "$PREVIOUS"
    systemctl restart think-stack || true
  else
    systemctl stop think-stack || true
    rm -f "$BASE/current"
  fi
  if systemctl is-active --quiet nginx; then
    nginx -t && systemctl reload nginx || true
  fi
  exit "$status"
}
trap rollback ERR
activate "$APP"
systemctl daemon-reload
systemctl enable think-stack
systemctl restart think-stack
healthy=false
for attempt in {1..30}; do
  if curl -fsS --connect-timeout 2 --max-time 5 http://127.0.0.1:3100/think-stack/api/health >"$APP/health-check.log" 2>&1; then healthy=true; break; fi
  sleep 2
done
if [[ "$healthy" != true ]]; then
  echo 'Next.js did not become healthy on port 3100 within the startup retry window.' >&2
  cat "$APP/health-check.log" >&2
  false
fi
echo 'Next.js health check passed; starting/reloading Nginx.' 
systemctl enable nginx
if systemctl is-active --quiet nginx; then systemctl reload nginx; else systemctl start nginx; fi
curl -fsS -H "Host: $SERVER_NAME" http://127.0.0.1/think-stack/api/health
# Follow redirects so a redirect loop fails deployment instead of passing.
for APP_PATH in /think-stack /think-stack/; do
  curl -fsSL --max-redirs 5 --connect-timeout 2 --max-time 30 \
    -H "Host: $SERVER_NAME" "http://127.0.0.1$APP_PATH" >/dev/null
done
trap - ERR
rm -f "$ARCHIVE" "$(dirname "$ARCHIVE")/deploy-remote.sh"
rmdir "$(dirname "$ARCHIVE")"
echo "Release ready: $APP"
