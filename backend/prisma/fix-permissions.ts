/**
 * Idempotent permission patch — updates all system roles to match rbac.ts
 * without touching any other data. Safe to run on any environment at any time.
 *
 * Usage: npx tsx prisma/fix-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { SYSTEM_ROLES } from '../src/lib/rbac';

const db = new PrismaClient();

async function main() {
  console.log('Patching role permissions from rbac.ts...\n');
  for (const def of SYSTEM_ROLES) {
    const role = await db.role.findFirst({ where: { key: def.key } });
    if (!role) {
      console.log(`  SKIP  ${def.key} — not found in DB`);
      continue;
    }
    await db.role.update({
      where: { id: role.id },
      data: { permissions: JSON.stringify(def.permissions) },
    });
    console.log(`  OK    ${def.key}`);
  }
  console.log('\nDone. All role permissions synced to rbac.ts definitions.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
