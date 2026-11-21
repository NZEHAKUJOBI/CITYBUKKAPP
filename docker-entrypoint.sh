#!/bin/sh
set -e

# A persistent disk (e.g. Render's at /var/data) may be mounted root-owned, hiding the
# ownership set in the image. Fix the upload folder, then run the app as "node", not root.
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR"
  chown -R node:node "$UPLOAD_DIR"
  exec su-exec node "$@"
fi

exec "$@"
