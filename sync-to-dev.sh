#!/bin/bash
# Sync local welona changes to the DEV server and seed the database.
# Usage: ./sync-to-dev.sh [--frontend] [--backend] [--all] [--reset-db]
# Default (no args): syncs all + seeds
#
# --reset-db  wipes the dev DB before seeding (clean slate)

SERVER_HOST="64.235.58.36"
SERVER_USER="root"
SERVER_PASS="CZDRdw7rxbEKxb8#f"
SERVER_APP_DIR="/var/www/html/dev.welona"
PM2_BACKEND="dev-welona-backend"
PM2_FRONTEND="dev-welona-frontend"
LOCAL_APP_DIR="$(cd "$(dirname "$0")" && pwd)"

SSH="sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST"
RSYNC="sshpass -p '$SERVER_PASS' rsync -az --exclude='node_modules' --exclude='.next' --exclude='*.db' --exclude='*.db-journal'"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

SYNC_FRONTEND=false
SYNC_BACKEND=false
RESET_DB=false

if [[ $# -eq 0 ]]; then
  SYNC_FRONTEND=true
  SYNC_BACKEND=true
fi

for arg in "$@"; do
  case $arg in
    --frontend) SYNC_FRONTEND=true ;;
    --backend)  SYNC_BACKEND=true  ;;
    --all)      SYNC_FRONTEND=true; SYNC_BACKEND=true ;;
    --reset-db) RESET_DB=true ;;
    *) err "Unknown option: $arg. Use --frontend, --backend, --all, --reset-db" ;;
  esac
done

echo ""
echo "========================================"
echo "   Welona DEV Sync → $SERVER_HOST"
echo "   Dir: $SERVER_APP_DIR"
echo "========================================"
echo ""

# ── BACKEND ───────────────────────────────────────────────────────────────────
if $SYNC_BACKEND; then
  warn "Syncing backend source..."
  eval "$RSYNC \
    --exclude='prisma/dev.db' \
    --exclude='prisma/dev.db-journal' \
    $LOCAL_APP_DIR/backend/ \
    $SERVER_USER@$SERVER_HOST:$SERVER_APP_DIR/backend/"

  warn "Syncing shared package..."
  eval "$RSYNC \
    $LOCAL_APP_DIR/shared/ \
    $SERVER_USER@$SERVER_HOST:$SERVER_APP_DIR/shared/"

  warn "Installing backend dependencies on server..."
  eval "$SSH 'cd $SERVER_APP_DIR/shared && npm install --legacy-peer-deps'"
  eval "$SSH 'cd $SERVER_APP_DIR/backend && npm install --legacy-peer-deps'"

  if $RESET_DB; then
    warn "Resetting dev database (wipe + push schema)..."
    eval "$SSH 'cd $SERVER_APP_DIR/backend && npx prisma db push --force-reset'"
    log "Database wiped and schema applied"
  else
    warn "Pushing Prisma schema..."
    eval "$SSH 'cd $SERVER_APP_DIR/backend && npx prisma db push'"
    log "Prisma schema synced"
  fi

  warn "Seeding dev database (categories, services, branches, employees, HR data, products)..."
  eval "$SSH 'cd $SERVER_APP_DIR/backend && npm run db:seed-all'" \
    || err "Seed failed — check server logs"
  log "Database seeded"

  warn "Patching role permissions to match rbac.ts..."
  eval "$SSH 'cd $SERVER_APP_DIR/backend && npm run db:fix-permissions'" \
    || err "Permission patch failed"
  log "Role permissions updated"

  warn "Building backend on server..."
  eval "$SSH 'cd $SERVER_APP_DIR/backend && npm run build'" \
    || err "Backend build failed"
  log "Backend built successfully"

  warn "Restarting $PM2_BACKEND (PM2)..."
  eval "$SSH 'pm2 restart $PM2_BACKEND && pm2 save'" \
    || warn "PM2 process $PM2_BACKEND not found — start it manually with: pm2 start 'npm start' --name $PM2_BACKEND --cwd $SERVER_APP_DIR/backend"
  log "$PM2_BACKEND restarted"
fi

# ── FRONTEND ──────────────────────────────────────────────────────────────────
if $SYNC_FRONTEND; then
  warn "Building frontend locally..."
  cd "$LOCAL_APP_DIR/frontend"
  npm install --legacy-peer-deps --silent \
    || err "Frontend npm install failed"
  npm run build \
    || err "Frontend build failed"
  log "Frontend built locally"

  warn "Syncing frontend .next build to server..."
  eval "$RSYNC --delete --exclude='cache' \
    $LOCAL_APP_DIR/frontend/.next/ \
    $SERVER_USER@$SERVER_HOST:$SERVER_APP_DIR/frontend/.next/"

  warn "Syncing frontend source & config..."
  eval "$RSYNC \
    $LOCAL_APP_DIR/frontend/src \
    $LOCAL_APP_DIR/frontend/public \
    $LOCAL_APP_DIR/frontend/next.config.mjs \
    $LOCAL_APP_DIR/frontend/package.json \
    $LOCAL_APP_DIR/frontend/tailwind.config.ts \
    $LOCAL_APP_DIR/frontend/postcss.config.js \
    $LOCAL_APP_DIR/frontend/tsconfig.json \
    $SERVER_USER@$SERVER_HOST:$SERVER_APP_DIR/frontend/"

  warn "Installing frontend dependencies on server..."
  eval "$SSH 'cd $SERVER_APP_DIR/frontend && npm install --legacy-peer-deps'"

  warn "Restarting $PM2_FRONTEND (PM2)..."
  eval "$SSH 'pm2 restart $PM2_FRONTEND && pm2 save'" \
    || warn "PM2 process $PM2_FRONTEND not found — start it manually with: pm2 start 'npm start' --name $PM2_FRONTEND --cwd $SERVER_APP_DIR/frontend"
  log "$PM2_FRONTEND restarted"
fi

echo ""
echo "========================================"
log "Dev sync complete! https://dev.welona.vabinformatics.com"
echo ""
echo "  Admin:  superadmin@welona.com  /  Welona@123"
echo "  Staff:  admin@welona.com       /  Welona@123"
echo "  Branch: rohit.sharma           /  welona@123"
echo "========================================"
echo ""
