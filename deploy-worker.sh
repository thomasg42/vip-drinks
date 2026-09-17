#!/usr/bin/env bash
# VIP Drinks -> the shared shift ledger (Cloudflare Worker + D1).
#
# Run ONCE, from Thomas's own terminal:
#     bash /tmp/claude-501/vip-drinks/deploy-worker.sh
#
# Then run deploy.sh, which picks up the URL this writes.
#
# Claude Code cannot run this: no Cloudflare credentials in that sandbox. The
# PIN is typed by you, into wrangler, and never touches this repo or any log.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$SRC/sync-worker/wrangler.jsonc"
WRANGLER=(npx --yes wrangler@4)

cd "$SRC"
test -f "$CONFIG" || { echo "FATAL: $CONFIG missing"; exit 1; }

echo "==> who am I"
"${WRANGLER[@]}" whoami

# ---------------------------------------------------------------- database
if grep -q 'REPLACE_WITH_D1_DATABASE_ID' "$CONFIG"; then
  echo "==> creating the D1 database"
  CREATE_OUT="$("${WRANGLER[@]}" d1 create vip-drinks 2>&1 || true)"
  echo "$CREATE_OUT"
  DB_ID="$(printf '%s' "$CREATE_OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
  if [ -z "$DB_ID" ]; then
    # Already existed, most likely. Ask for it rather than guessing.
    DB_ID="$("${WRANGLER[@]}" d1 info vip-drinks 2>/dev/null \
      | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
  fi
  test -n "$DB_ID" || { echo "FATAL: could not find the database id. Run 'npx wrangler d1 list' and paste it into $CONFIG."; exit 1; }
  # A macOS-safe in-place edit.
  perl -pi -e "s/REPLACE_WITH_D1_DATABASE_ID/$DB_ID/" "$CONFIG"
  echo "==> database id written into wrangler.jsonc: $DB_ID"
else
  echo "==> database id already set, reusing it"
fi

echo "==> applying the schema to the REMOTE database"
"${WRANGLER[@]}" d1 execute vip-drinks --remote --config "$CONFIG" \
  --file "$SRC/sync-worker/migrations/0001_shift_ledger.sql"

# -------------------------------------------------------------------- PIN
# Every authenticated route 401s until this is set, on purpose: a ledger
# deployed without its secret should be broken, not open.
echo
echo "==> the bar PIN"
echo "    Six digits or more. You will type it once here and once on each device."
echo "    It is never written to this repo, the wiki, or any log."
"${WRANGLER[@]}" secret put OWNER_PIN --config "$CONFIG"

# ----------------------------------------------------------------- deploy
echo "==> deploying"
DEPLOY_OUT="$("${WRANGLER[@]}" deploy --config "$CONFIG" 2>&1 | tee /dev/stderr)"
URL="$(printf '%s' "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | head -1)"

if [ -z "$URL" ]; then
  echo
  echo "Deployed, but the URL was not in the output. Find it with:"
  echo "  npx wrangler deployments list --config $CONFIG"
  echo "then write it into $SRC/sync-url.txt and run deploy.sh."
  exit 0
fi

printf '%s\n' "$URL" > "$SRC/sync-url.txt"
echo
echo "==> ledger live at: $URL"
echo "==> written to sync-url.txt — deploy.sh bakes it into the app from there."

echo "==> proving it answers"
curl -s "$URL/api/health" && echo
echo "==> proving it is NOT open without the PIN (expect 401):"
curl -s -o /dev/null -w '%{http_code}\n' "$URL/api/state"

echo
echo "Next:  bash $SRC/deploy.sh"
echo "Then on each device: Cash tab -> Connect this device -> type the PIN."
