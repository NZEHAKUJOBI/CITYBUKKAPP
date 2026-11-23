#!/bin/sh
set -e

# Two modes:
#  - DATABASE_URL set (e.g. Render, external database): just run the app.
#  - DATABASE_URL empty: start the PostgreSQL server bundled in this image, with its data
#    in $PGDATA (on the /var/data volume), listening on 127.0.0.1 only, then run the app.

if [ "$(id -u)" != "0" ]; then
  exec "$@"   # not root: can't manage Postgres or fix ownership, run as-is
fi

# A volume may be mounted root-owned, hiding the ownership set in the image.
mkdir -p "$UPLOAD_DIR"
chown -R node:node "$UPLOAD_DIR"

if [ -n "$DATABASE_URL" ]; then
  exec su-exec node "$@"
fi

# ---- Bundled PostgreSQL ----------------------------------------------------------------
: "${POSTGRES_USER:=citybukka}"
: "${POSTGRES_DB:=citybukka}"
if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "POSTGRES_PASSWORD is required for the bundled PostgreSQL (or set DATABASE_URL to use an external database)." >&2
  exit 1
fi

mkdir -p "$PGDATA" /run/postgresql
chown -R postgres:postgres "$PGDATA" /run/postgresql
chmod 700 "$PGDATA"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "Initialising PostgreSQL data directory in $PGDATA"
  pwfile=$(mktemp)
  printf '%s\n' "$POSTGRES_PASSWORD" > "$pwfile"
  chown postgres "$pwfile"
  su-exec postgres initdb -D "$PGDATA" -U "$POSTGRES_USER" --pwfile="$pwfile" \
    --auth=scram-sha-256 --encoding=UTF8 --locale=C >/dev/null
  rm -f "$pwfile"
fi

su-exec postgres pg_ctl -D "$PGDATA" -w -t 60 \
  -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=/run/postgresql" \
  -l "$PGDATA/server.log" start

export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}"
export DATABASE_SSL=false

stop_postgres() {
  su-exec postgres pg_ctl -D "$PGDATA" -m fast -w stop || true
}

# Run the app as a child (not exec) so Postgres is shut down cleanly when the container stops.
su-exec node "$@" &
app=$!
trap 'kill -TERM "$app" 2>/dev/null' TERM INT
set +e
wait "$app"            # returns early if a signal arrives…
wait "$app" 2>/dev/null # …so wait again for the app to actually exit
status=$?
set -e
stop_postgres
exit $status
