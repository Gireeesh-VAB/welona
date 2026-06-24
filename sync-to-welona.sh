#!/bin/bash
# Sync local welona changes to production server
# Usage: ./sync-to-welona.sh [--frontend] [--backend] [--config] [--all]
#        ./sync-to-welona.sh --backend --seed-safe    # sync + upsert master data (safe for live)
#        ./sync-to-welona.sh --backend --seed         # DANGER: wipes ALL data then re-seeds
# Default (no args): syncs all

SERVER_HOST="64.235.58.36"
SERVER_USER="root"
SERVER_PASS="CZDRdw7rxbEKxb8#f"
SERVER_APP_DIR="/var/www/html/welona"
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

# Parse args — default to all if none given
SYNC_FRONTEND=false
SYNC_BACKEND=false
SYNC_CONFIG=false
RUN_SEED=false
RUN_SEED_SAFE=false

if [[ $# -eq 0 ]]; then
  SYNC_FRONTEND=true
  SYNC_BACKEND=true
  SYNC_CONFIG=true
fi

for arg in "$@"; do
  case $arg in
    --frontend)   SYNC_FRONTEND=true  ;;
    --backend)    SYNC_BACKEND=true   ;;
    --config)     SYNC_CONFIG=true    ;;
    --seed-safe)  RUN_SEED_SAFE=true  ;;
    --seed)       RUN_SEED=true       ;;
    --all)        SYNC_FRONTEND=true; SYNC_BACKEND=true; SYNC_CONFIG=true ;;
    *) err "Unknown option: $arg. Use --frontend, --backend, --config, --all, --seed-safe, or --seed" ;;
  esac
done

# Guard: --seed on production is destructive
if $RUN_SEED; then
  echo ""
  echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ⚠  WARNING — DESTRUCTIVE SEED ON PRODUCTION  ⚠    ║${NC}"
  echo -e "${RED}║                                                      ║${NC}"
  echo -e "${RED}║  seed.ts deletes ALL customers, bookings, invoices,  ║${NC}"
  echo -e "${RED}║  payments, staff and branches before re-seeding.     ║${NC}"
  echo -e "${RED}║                                                      ║${NC}"
  echo -e "${RED}║  Use --seed-safe instead to upsert master data       ║${NC}"
  echo -e "${RED}║  without touching real records.                      ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  read -r -p "  Type YES to continue and wipe production data: " confirm
  [[ "$confirm" == "YES" ]] || err "Aborted."
fi

echo ""
echo "========================================"
echo "   Welona Sync → $SERVER_HOST"
echo "========================================"
echo ""

# ── CONFIG ────────────────────────────────────────────────────────────────────
if $SYNC_CONFIG; then
  warn "Syncing nginx config..."
  eval "$RSYNC $LOCAL_APP_DIR/deploy/nginx-welona.vabinformatics.com.conf \
    $SERVER_USER@$SERVER_HOST:/etc/nginx/sites-available/welona.vabinformatics.com"

  eval "$SSH 'nginx -t && systemctl reload nginx'"
  log "Nginx config synced and reloaded"
fi

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

  warn "Running Prisma schema push on server..."
  eval "$SSH 'cd $SERVER_APP_DIR/backend && npx prisma db push'"
  log "Prisma schema synced"

  # --seed-safe: upsert master/reference data only — safe on live, does NOT delete anything
  if $RUN_SEED_SAFE; then
    warn "Running safe master-data seed (upsert only, no deletes)..."
    eval "$SSH 'cd $SERVER_APP_DIR/backend && npx tsx prisma/seed-admin-showcase.ts'" \
      || err "seed-admin-showcase failed"
    log "Branches, zones, categories, services seeded"

    eval "$SSH 'cd $SERVER_APP_DIR/backend && npx tsx prisma/seed-admin-system-users.ts'" \
      || err "seed-admin-system-users failed"
    log "System users seeded"

    eval "$SSH 'cd $SERVER_APP_DIR/backend && npx tsx prisma/seed-hr.ts'" \
      || err "seed-hr failed"
    log "HR master data seeded (departments, designations, leave types, holidays)"

    eval "$SSH 'cd $SERVER_APP_DIR/backend && npx tsx prisma/seed-products-inventory.ts'" \
      || err "seed-products-inventory failed"
    log "Products and opening stock seeded"

    log "Safe seed complete — existing customers/bookings/payments untouched"
  fi

  # --seed: FULL destructive re-seed (wipes everything)
  if $RUN_SEED; then
    warn "Running FULL destructive seed (wipes all data)..."
    eval "$SSH 'cd $SERVER_APP_DIR/backend && npm run db:seed-all'" \
      || err "Full seed failed"
    log "Database fully re-seeded"
  fi

  warn "Building backend on server..."
  eval "$SSH 'cd $SERVER_APP_DIR/backend && npm run build'" \
    || err "Backend build failed"
  log "Backend built successfully"

  warn "Restarting welona-backend (PM2)..."
  eval "$SSH 'pm2 restart welona-backend && pm2 save'"
  log "welona-backend restarted"
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

  warn "Restarting welona-frontend (PM2)..."
  eval "$SSH 'pm2 restart welona-frontend && pm2 save'"
  log "welona-frontend restarted"
fi

echo ""
echo "========================================"
log "Sync complete! https://welona.vabinformatics.com"
echo "========================================"
echo ""
