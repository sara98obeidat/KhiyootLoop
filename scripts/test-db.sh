#!/usr/bin/env bash
# Applies the Supabase migrations to a throwaway local PostgreSQL and checks
# row-level security. Needs PostgreSQL 15+ binaries (initdb, pg_ctl, psql).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$(mktemp -d)"
RUNAS=""
PORT="${PGTEST_PORT:-54329}"
cleanup() { $RUNAS "$PGBIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

if [ "$(id -u)" = "0" ]; then chown -R postgres "$DATA"; RUNAS="runuser -u postgres --"; fi
$RUNAS "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
$RUNAS "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -w start >/dev/null
PSQL=(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -t -A)
"${PSQL[@]}" -c "create database kl_test"
"${PSQL[@]}" -d kl_test -f "$ROOT/tests/db/supabase-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -d kl_test -f "$f"; done
"${PSQL[@]}" -d kl_test -f "$ROOT/tests/db/rls-test.sql" 2>&1 | sed "s/^psql:[^ ]* NOTICE:  /  /" | grep -v "^$"
