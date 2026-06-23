/**
 * Seed 1000 units of every active product into every warehouse.
 *
 * Run with: npm run db:seed-warehouse-stock
 *
 * Idempotent — sets stock to 1000 only if the current quantity is 0 or
 * the stock row doesn't exist yet. Existing stock above 0 is left untouched.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const SEED_QTY = 1000;

  const [warehouses, products] = await Promise.all([
    db.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, name: true, branchId: true, branch: { select: { name: true } } },
    }),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true },
    }),
  ]);

  if (warehouses.length === 0) {
    console.log('No warehouses found. Run db:seed first.');
    return;
  }
  if (products.length === 0) {
    console.log('No products found. Run db:seed-products first.');
    return;
  }

  console.log(`Seeding ${SEED_QTY} units × ${products.length} products × ${warehouses.length} warehouses…`);

  let created = 0;
  let skipped = 0;

  for (const warehouse of warehouses) {
    for (const product of products) {
      const existing = await db.inventoryStock.findUnique({
        where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } },
        select: { id: true, quantity: true },
      });

      if (existing && existing.quantity > 0) {
        skipped++;
        continue;
      }

      const delta = SEED_QTY - (existing?.quantity ?? 0);

      if (existing) {
        await db.inventoryStock.update({
          where: { id: existing.id },
          data: { quantity: SEED_QTY },
        });
      } else {
        await db.inventoryStock.create({
          data: {
            branchId: warehouse.branchId,
            warehouseId: warehouse.id,
            productId: product.id,
            quantity: SEED_QTY,
          },
        });
      }

      await db.inventoryMovement.create({
        data: {
          branchId: warehouse.branchId,
          warehouseId: warehouse.id,
          productId: product.id,
          type: 'opening',
          delta,
          reason: `Test seed — ${SEED_QTY} units initial stock`,
          ref: 'SEED-1000',
        },
      });

      created++;
    }
    console.log(`  ✓ ${warehouse.branch.name} / ${warehouse.name} — done`);
  }

  console.log(`\nDone. Created/updated: ${created}, skipped (already stocked): ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
