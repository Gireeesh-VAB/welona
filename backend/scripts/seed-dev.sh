#!/bin/bash
# Run all seed scripts in order for the dev environment.
# Usage: bash scripts/seed-dev.sh
#
# To also wipe the DB first:  bash scripts/seed-dev.sh --reset

set -e

cd "$(dirname "$0")/.."

if [ "$1" = "--reset" ]; then
  echo "==> Resetting database..."
  npx prisma db push --force-reset
fi

echo ""
echo "==> [1/5] Base seed (org, branches, roles, staff, admin users)..."
npx prisma db seed

echo ""
echo "==> [2/5] Master data (zones, 8 branches, categories, services, ledgers, payment modes, taxes, media, marketing offers, designations, departments, employees)..."
npx tsx prisma/seed-admin-showcase.ts

echo ""
echo "==> [3/5] System users (branch login accounts for employees)..."
npx tsx prisma/seed-admin-system-users.ts

echo ""
echo "==> [4/5] HR data (leave types, holidays, attendance records)..."
npx tsx prisma/seed-hr.ts

echo ""
echo "==> [5/5] Product inventory..."
npx tsx prisma/seed-products-inventory.ts

echo ""
echo "All seeds complete."
echo ""
echo "Admin login:   /admin/login  →  superadmin@welona.com  /  Welona@123"
echo "Staff login:   /login        →  admin@welona.com       /  Welona@123"
echo "Branch login:  /login        →  rohit.sharma           /  welona@123"
