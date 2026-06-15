#!/bin/bash
# One-time server setup for Welona on the VAB EC2 server.
# Run this ONCE manually via SSH before the first CI/CD deploy.
# Usage: bash server-setup-once.sh
#
# Prerequisites:
#   - SSH'd into 43.205.165.167 as ubuntu
#   - PostgreSQL is running (pg_lsclusters shows online)
#   - nginx is installed and running
#   - certbot is installed (sudo apt install certbot python3-certbot-nginx)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# ── 1. App directories ──────────────────────────────────────────────────────
warn "Creating app directories..."
sudo mkdir -p /var/www/html/welona-dev/backend
sudo mkdir -p /var/www/html/welona-dev/frontend
sudo mkdir -p /var/www/html/welona-dev/shared
sudo mkdir -p /var/www/html/welona-prod/backend
sudo mkdir -p /var/www/html/welona-prod/frontend
sudo mkdir -p /var/www/html/welona-prod/shared
sudo chown -R ubuntu:ubuntu /var/www/html/welona-dev /var/www/html/welona-prod
log "Directories created"

# ── 2. PostgreSQL databases ─────────────────────────────────────────────────
warn "Creating PostgreSQL databases and user..."
# Replace STRONG_PASSWORD_HERE with a real password before running
sudo -u postgres psql << 'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'welona_user') THEN
    CREATE USER welona_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
  END IF;
END
$$;
CREATE DATABASE welona_dev OWNER welona_user;
CREATE DATABASE welona_prod OWNER welona_user;
GRANT ALL PRIVILEGES ON DATABASE welona_dev TO welona_user;
GRANT ALL PRIVILEGES ON DATABASE welona_prod TO welona_user;
SQL
log "PostgreSQL databases ready"

# ── 3. .env files on server ─────────────────────────────────────────────────
warn "Writing .env files (edit STRONG_PASSWORD_HERE and secrets before running!)..."

cat > /var/www/html/welona-dev/backend/.env << 'ENV'
DATABASE_URL="postgresql://welona_user:STRONG_PASSWORD_HERE@localhost:5432/welona_dev"
JWT_SECRET="CHANGE_ME_DEV_JWT_SECRET"
JWT_REFRESH_SECRET="CHANGE_ME_DEV_REFRESH_SECRET"
JWT_EXPIRY="1h"
REFRESH_TOKEN_EXPIRY="7d"
CORS_ALLOWED_ORIGIN="https://dev.welona.vabinformatics.com"
PORT=3602
ENV

cat > /var/www/html/welona-prod/backend/.env << 'ENV'
DATABASE_URL="postgresql://welona_user:STRONG_PASSWORD_HERE@localhost:5432/welona_prod"
JWT_SECRET="CHANGE_ME_PROD_JWT_SECRET"
JWT_REFRESH_SECRET="CHANGE_ME_PROD_REFRESH_SECRET"
JWT_EXPIRY="1h"
REFRESH_TOKEN_EXPIRY="7d"
CORS_ALLOWED_ORIGIN="https://welona.vabinformatics.com"
PORT=3702
ENV

cat > /var/www/html/welona-dev/frontend/.env.production << 'ENV'
NEXT_PUBLIC_API_URL=https://dev.welona.vabinformatics.com/api/v1
NEXT_PUBLIC_WS_URL=https://dev.welona.vabinformatics.com
NEXT_PUBLIC_APP_NAME=Welona Admin (Dev)
PORT=3601
ENV

cat > /var/www/html/welona-prod/frontend/.env.production << 'ENV'
NEXT_PUBLIC_API_URL=https://welona.vabinformatics.com/api/v1
NEXT_PUBLIC_WS_URL=https://welona.vabinformatics.com
NEXT_PUBLIC_APP_NAME=Welona Admin
PORT=3701
ENV

log ".env files written"

# ── 4. Nginx vhosts ─────────────────────────────────────────────────────────
warn "Deploying nginx configs..."
# These files should already exist in /tmp or the cloned repo.
# Adjust source paths if needed.
sudo cp /tmp/nginx-dev.welona.vabinformatics.com.conf /etc/nginx/sites-available/welona-dev
sudo cp /tmp/nginx-welona.vabinformatics.com.conf     /etc/nginx/sites-available/welona-prod
sudo ln -sf /etc/nginx/sites-available/welona-dev  /etc/nginx/sites-enabled/welona-dev
sudo ln -sf /etc/nginx/sites-available/welona-prod /etc/nginx/sites-enabled/welona-prod
sudo nginx -t && sudo systemctl reload nginx
log "Nginx configured"

# ── 5. SSL certificates ─────────────────────────────────────────────────────
warn "Obtaining SSL certificates via certbot..."
warn "Make sure DNS A records for dev.welona.vabinformatics.com and welona.vabinformatics.com point to 43.205.165.167 first!"
sudo certbot --nginx -d dev.welona.vabinformatics.com
sudo certbot --nginx -d welona.vabinformatics.com
log "SSL certificates issued"

# ── 6. PM2 processes ────────────────────────────────────────────────────────
warn "Registering PM2 processes (first-time only)..."
pm2 start "npm start" --name welona-dev-backend  --cwd /var/www/html/welona-dev/backend
pm2 start "npm start" --name welona-dev-frontend --cwd /var/www/html/welona-dev/frontend
pm2 start "npm start" --name welona-prod-backend  --cwd /var/www/html/welona-prod/backend
pm2 start "npm start" --name welona-prod-frontend --cwd /var/www/html/welona-prod/frontend
pm2 save
log "PM2 processes registered"

warn "Run the following command to enable PM2 on server reboot:"
pm2 startup

echo ""
echo "========================================"
log "One-time setup complete!"
echo "Next steps:"
echo "  1. Edit the .env files with real passwords and secrets"
echo "  2. Set GitHub Secrets: EC2_SSH_KEY, EC2_HOST, EC2_USER"
echo "  3. Create 'development' and 'production' branches in git"
echo "  4. Push to 'development' branch to trigger first CI/CD deploy"
echo "========================================"
