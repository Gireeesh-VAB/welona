# Deploying to welona.vabinformatics.com

Single subdomain, path-routed by nginx:

- `/api/*` → backend (Next.js route handlers, port **3002**)
- `/*` → frontend (Next.js UI, port **3001**)

Because both services share the origin, **no CORS** is involved in production
and the existing `sameSite=Lax` cookies work end-to-end.

## One-time server setup

```bash
# 1. Clone + install
git clone https://github.com/Gireeesh-VAB/welona.git
cd welona/backend  && npm ci
cd ../frontend     && npm ci

# 2. Backend env — copy the template and set real secrets
cd ../backend
cp .env.example .env
# Edit:  DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
#        (CORS_ALLOWED_ORIGIN already includes the prod URL.)
npx prisma db push                 # or `migrate deploy` once you switch to Postgres
npx tsx prisma/seed-admin.ts       # one super-admin to log in with

# 3. Build both
cd ../backend  && NODE_ENV=production npm run build
cd ../frontend && NODE_ENV=production npm run build
```

## Process manager (PM2 example)

```bash
npm i -g pm2

# Backend on :3002, frontend on :3001
pm2 start "npm start" --name welona-backend  --cwd /srv/welona/backend
pm2 start "npm start" --name welona-frontend --cwd /srv/welona/frontend
pm2 save && pm2 startup
```

Both `npm start` invocations pick up `NODE_ENV=production` automatically (it's
the Next.js default for `next start`), which turns on the `Secure` cookie flag
in `backend/src/lib/auth/service.ts`.

## nginx

The vhost lives at `deploy/nginx-welona.vabinformatics.com.conf`. Install it:

```bash
sudo cp deploy/nginx-welona.vabinformatics.com.conf \
        /etc/nginx/sites-available/welona.vabinformatics.com
sudo ln -s /etc/nginx/sites-available/welona.vabinformatics.com \
           /etc/nginx/sites-enabled/welona.vabinformatics.com
sudo nginx -t && sudo systemctl reload nginx
```

## TLS

```bash
sudo certbot --nginx -d welona.vabinformatics.com
```

Certbot rewrites the nginx vhost in place to insert the `ssl_certificate`
lines and reloads nginx. The redirect block is already in place so plain
HTTP traffic ends up on HTTPS.

## Quick check after deploy

```bash
# Backend liveness through nginx
curl -i https://welona.vabinformatics.com/api/v1/auth/admin/login \
     -H 'Content-Type: application/json' \
     -d '{"identifier":"superadmin@welona.com","password":"<PASSWORD>"}'

# Frontend
curl -I https://welona.vabinformatics.com/
```
