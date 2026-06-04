/**
 * Inventory top-up — adds 5 new SKUs, opening stock at every branch, and a
 * batch of fresh-dated movements (purchases, sales, adjustments) so the
 * Recent Movements feed shows today's activity.
 *
 * Idempotent: re-running upserts the products and skips opening rows that
 * already exist. New today-movements are always appended.
 *
 * Usage: `npx tsx prisma/top-up-inventory.ts`
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const r = (rupees: number) => Math.round(rupees * 100);

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pick<T>(items: T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

interface ProductSeed {
  sku: string;
  name: string;
  brand: string;
  category: string;
  hsnSacCode: string;
  uom: string;
  barcode: string;
  mrp: number;
  salePrice: number;
  purchasePrice: number;
  taxPercent: number;
  reorderLevel: number;
  description: string;
}

const newProducts: ProductSeed[] = [
  { sku: 'TN-001', name: 'Rose Hydration Toner 200ml', brand: 'Welona', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000130',
    mrp: r(575), salePrice: r(495), purchasePrice: r(320), taxPercent: 1800,
    reorderLevel: 12, description: 'Alcohol-free rose hydrosol toner with witch hazel' },
  { sku: 'MA-001', name: 'Clay Detox Face Mask 100g', brand: 'Welona Pro', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'pack', barcode: '8901100000140',
    mrp: r(695), salePrice: r(595), purchasePrice: r(380), taxPercent: 1800,
    reorderLevel: 10, description: 'Kaolin + bentonite weekly detox mask' },
  { sku: 'HM-001', name: 'Argan Hair Mask 200g', brand: 'Welona', category: 'Hair Care',
    hsnSacCode: '3305', uom: 'pack', barcode: '8901100000040',
    mrp: r(795), salePrice: r(685), purchasePrice: r(420), taxPercent: 1800,
    reorderLevel: 10, description: 'Deep-conditioning weekly hair mask with argan + macadamia' },
  { sku: 'SP-006', name: 'Magnesium Glycinate (60 tabs)', brand: 'Welona Health', category: 'Wellness',
    hsnSacCode: '3004', uom: 'pack', barcode: '8901100000205',
    mrp: r(845), salePrice: r(735), purchasePrice: r(470), taxPercent: 1200,
    reorderLevel: 15, description: 'Chelated magnesium for sleep + muscle recovery' },
  { sku: 'AC-006', name: 'Gua Sha Rose Quartz Stone', brand: 'Welona Pro', category: 'Skin Services',
    hsnSacCode: '9018', uom: 'unit', barcode: '8901100000305',
    mrp: r(595), salePrice: r(495), purchasePrice: r(265), taxPercent: 1200,
    reorderLevel: 14, description: 'Natural rose quartz facial gua sha contouring tool' },
];

async function main() {
  console.log('[inv-top-up] Starting …');

  const admin = await db.adminUser.findFirst();
  if (!admin) {
    console.error('No AdminUser — run the base admin seed first.');
    process.exit(1);
  }

  // ---- Categories ----
  const categoryNames = Array.from(new Set(newProducts.map((p) => p.category)));
  for (const name of categoryNames) {
    await db.category.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Auto-seeded for product master (${name})`,
        isActive: true,
        createdByAdminId: admin.id,
      },
    });
  }
  const allCats = await db.category.findMany();
  const catByName = new Map(allCats.map((c) => [c.name, c]));

  // ---- Products (upsert) ----
  let productsSynced = 0;
  for (const p of newProducts) {
    const cat = catByName.get(p.category);
    await db.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name, brand: p.brand, categoryId: cat?.id ?? null,
        hsnSacCode: p.hsnSacCode, uom: p.uom, barcode: p.barcode,
        description: p.description, mrp: p.mrp, salePrice: p.salePrice,
        purchasePrice: p.purchasePrice, taxPercent: p.taxPercent,
        reorderLevel: p.reorderLevel, isActive: true,
      },
      create: {
        sku: p.sku, name: p.name, brand: p.brand, categoryId: cat?.id ?? null,
        hsnSacCode: p.hsnSacCode, uom: p.uom, barcode: p.barcode,
        description: p.description, mrp: p.mrp, salePrice: p.salePrice,
        purchasePrice: p.purchasePrice, taxPercent: p.taxPercent,
        reorderLevel: p.reorderLevel, isActive: true,
        createdByAdminId: admin.id,
      },
    });
    productsSynced += 1;
  }
  console.log(`[inv-top-up] New/updated products: ${productsSynced}`);

  const branches = await db.branch.findMany();
  console.log(`[inv-top-up] Branches: ${branches.length}`);

  const newProductRows = await db.product.findMany({
    where: { sku: { in: newProducts.map((p) => p.sku) } },
  });

  // Default warehouse per branch — stock is keyed by (warehouse, product).
  const whOf = new Map<string, string>();
  for (const branch of branches) {
    const wh =
      (await db.warehouse.findFirst({ where: { branchId: branch.id, isDefault: true } })) ??
      (await db.warehouse.create({
        data: { branchId: branch.id, name: 'Main', code: 'MAIN', isDefault: true },
      }));
    whOf.set(branch.id, wh.id);
  }

  // ---- Opening stock for new products at every branch ----
  let openingsWritten = 0;
  const openingRand = rng(990099);
  for (const branch of branches) {
    const warehouseId = whOf.get(branch.id)!;
    for (const p of newProductRows) {
      const seed = newProducts.find((np) => np.sku === p.sku)!;
      const stock = await db.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId: p.id } },
        create: { branchId: branch.id, warehouseId, productId: p.id, quantity: 0 },
        update: {},
      });
      const existingOpening = await db.inventoryMovement.findFirst({
        where: { warehouseId, productId: p.id, type: 'opening' },
      });
      if (existingOpening) continue;
      const qty = Math.max(0, Math.floor(openingRand() * 60) + seed.reorderLevel);
      await db.inventoryStock.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity + qty },
      });
      await db.inventoryMovement.create({
        data: {
          branchId: branch.id,
          warehouseId,
          productId: p.id,
          type: 'opening',
          delta: qty,
          reason: 'Opening stock (top-up)',
          createdByAdminId: admin.id,
        },
      });
      openingsWritten += 1;
    }
  }
  console.log(`[inv-top-up] Opening rows written for new products: ${openingsWritten}`);

  // ---- Fresh today-dated movements across all products ----
  const allActiveProducts = await db.product.findMany({ where: { isActive: true } });
  const moveRand = rng(Date.now() & 0xffffffff);
  const todayLabel = new Date().toISOString().slice(0, 10);
  let extraMovements = 0;

  for (let i = 0; i < 35; i++) {
    const branch = pick(branches, moveRand);
    const p = pick(allActiveProducts, moveRand);
    const warehouseId = whOf.get(branch.id)!;
    const stock = await db.inventoryStock.findUnique({
      where: { warehouseId_productId: { warehouseId, productId: p.id } },
    });
    if (!stock) continue;
    const roll = moveRand();
    const type: 'purchase' | 'sale' | 'adjustment' =
      roll < 0.4 ? 'purchase' : roll < 0.9 ? 'sale' : 'adjustment';
    const baseQty = Math.max(1, Math.floor(moveRand() * 10) + 1);
    let delta = type === 'purchase' ? baseQty : -baseQty;
    if (type === 'adjustment' && moveRand() > 0.5) delta = baseQty;
    if (stock.quantity + delta < 0) continue;
    await db.inventoryMovement.create({
      data: {
        branchId: branch.id,
        warehouseId,
        productId: p.id,
        type,
        delta,
        reason:
          type === 'purchase'
            ? `GRN ${todayLabel}`
            : type === 'sale'
              ? 'Counter sale'
              : 'Stock-take adjustment',
        ref:
          type === 'purchase'
            ? `PO-${2000 + i}`
            : type === 'sale'
              ? `INV-${7000 + i}`
              : null,
        createdByAdminId: admin.id,
      },
    });
    await db.inventoryStock.update({
      where: { id: stock.id },
      data: { quantity: stock.quantity + delta },
    });
    extraMovements += 1;
  }
  console.log(`[inv-top-up] Today's movements logged: ${extraMovements}`);

  // ---- Summary ----
  const totals = await db.inventoryStock.aggregate({ _sum: { quantity: true } });
  const productCount = await db.product.count({ where: { isActive: true } });
  const movementCount = await db.inventoryMovement.count();
  console.log(`[inv-top-up] Active products: ${productCount}`);
  console.log(`[inv-top-up] Total units on hand: ${totals._sum.quantity}`);
  console.log(`[inv-top-up] Total movements logged: ${movementCount}`);
  console.log('[inv-top-up] Done.');
}

main()
  .catch((err) => {
    console.error('[inv-top-up] Failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
