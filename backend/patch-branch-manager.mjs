import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const role = await db.role.findFirst({ where: { key: 'branch_manager' } });
if (!role) { console.log('Role not found'); await db.$disconnect(); process.exit(1); }
const perms = JSON.parse(role.permissions);
const merged = [...new Set([...perms, 'staff:create', 'staff:update'])];
await db.role.update({ where: { id: role.id }, data: { permissions: JSON.stringify(merged) } });
console.log('Done. New permissions:', merged.join(', '));
await db.$disconnect();
