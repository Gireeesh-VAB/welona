/**
 * Seed script: add inventory stock + service/package inventory mappings for demo/testing.
 * Run: npx tsx prisma/seed-inventory-demo.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // ── 1. Get org
  const org = await db.organization.findFirst();
  if (!org) throw new Error('No org found — run db:seed first');

  // ── 2. Get all branches + their default warehouse
  const branches = await db.branch.findMany({ where: { orgId: org.id } });
  console.log(`Found ${branches.length} branches`);

  const warehouseMap = new Map<string, string>(); // branchId → warehouseId
  for (const branch of branches) {
    const wh = await db.warehouse.findFirst({
      where: { branchId: branch.id },
      orderBy: { createdAt: 'asc' },
    });
    if (wh) warehouseMap.set(branch.id, wh.id);
  }
  console.log(`Found warehouses for ${warehouseMap.size} branches`);

  // ── 3. Get products (by name for readability)
  const products = await db.product.findMany({ where: { isActive: true } });
  const byName = new Map(products.map(p => [p.name, p]));

  const shampoo      = byName.get('Anti-Dandruff Shampoo 200ml');
  const hairShampoo  = byName.get('Hair-Fall Defence Shampoo 200ml');
  const conditioner  = byName.get('Repair Conditioner 200ml');
  const hairSerum    = byName.get('Hair Growth Serum 30ml');
  const arganMask    = byName.get('Argan Hair Mask 200g');
  const hairOil      = byName.get('Onion Hair Oil 100ml');
  const vitaminC     = byName.get('Vitamin C 20% Serum 30ml');
  const niacin       = byName.get('Niacinamide 10% Serum 30ml');
  const faceMask     = byName.get('Clay Detox Face Mask 100g');
  const moisturizer  = byName.get('Daily Moisturizer SPF 30 50ml');
  const sunscreen    = byName.get('Mineral Sunscreen SPF 50 60ml');
  const faceWash     = byName.get('Acne-Control Face Wash 100ml');
  const vitCWash     = byName.get('Vitamin C Face Wash 100ml');
  const collagen     = byName.get('Collagen Powder (250g)');
  const biotin       = byName.get('Biotin 5000mcg (60 tabs)');
  const multivit     = byName.get('Multivitamin Daily (60 tabs)');

  // ── 4. Seed InventoryStock for EVERY branch + warehouse
  const stockData: Array<{ productId: string; qty: number; label: string }> = [
    // Hair products
    ...(shampoo    ? [{ productId: shampoo.id,     qty: 24, label: shampoo.name }]    : []),
    ...(hairShampoo? [{ productId: hairShampoo.id,  qty: 30, label: hairShampoo.name }]: []),
    ...(conditioner? [{ productId: conditioner.id,  qty: 18, label: conditioner.name }]: []),
    ...(hairSerum  ? [{ productId: hairSerum.id,    qty: 12, label: hairSerum.name }]  : []),
    ...(arganMask  ? [{ productId: arganMask.id,    qty: 15, label: arganMask.name }]  : []),
    ...(hairOil    ? [{ productId: hairOil.id,      qty: 20, label: hairOil.name }]    : []),
    // Skin products
    ...(vitaminC   ? [{ productId: vitaminC.id,     qty: 10, label: vitaminC.name }]   : []),
    ...(niacin     ? [{ productId: niacin.id,        qty: 14, label: niacin.name }]     : []),
    ...(faceMask   ? [{ productId: faceMask.id,     qty: 8,  label: faceMask.name }]   : []),
    ...(moisturizer? [{ productId: moisturizer.id,  qty: 20, label: moisturizer.name }]: []),
    ...(sunscreen  ? [{ productId: sunscreen.id,    qty: 16, label: sunscreen.name }]  : []),
    ...(faceWash   ? [{ productId: faceWash.id,     qty: 25, label: faceWash.name }]   : []),
    ...(vitCWash   ? [{ productId: vitCWash.id,     qty: 22, label: vitCWash.name }]   : []),
    // Wellness
    ...(collagen   ? [{ productId: collagen.id,     qty: 6,  label: collagen.name }]   : []),
    ...(biotin     ? [{ productId: biotin.id,        qty: 9,  label: biotin.name }]     : []),
    ...(multivit   ? [{ productId: multivit.id,     qty: 12, label: multivit.name }]   : []),
  ];

  let stockCreated = 0;
  for (const [branchId, warehouseId] of warehouseMap.entries()) {
    for (const { productId, qty } of stockData) {
      await db.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: { branchId, warehouseId, productId, quantity: qty },
        update: { quantity: qty },
      });
      stockCreated++;
    }
  }
  console.log(`✅ Created/updated ${stockCreated} InventoryStock records across ${warehouseMap.size} branches`);

  // ── 5. Map ServiceInventoryItems to services
  const services = await db.service.findMany({ where: { isActive: true } });
  const svcByName = new Map(services.map(s => [s.name, s]));

  const serviceMappings: Array<{
    serviceName: string;
    items: Array<{ productId: string; qty: number; threshold: number }>;
  }> = [
    // Hair Care
    {
      serviceName: 'Hair Spa Treatment',
      items: [
        ...(shampoo    ? [{ productId: shampoo.id,    qty: 30, threshold: 60 }] : []),
        ...(conditioner? [{ productId: conditioner.id, qty: 20, threshold: 40 }] : []),
        ...(arganMask  ? [{ productId: arganMask.id,   qty: 50, threshold: 100 }] : []),
        ...(hairSerum  ? [{ productId: hairSerum.id,   qty: 5,  threshold: 20 }] : []),
      ],
    },
    {
      serviceName: 'Scalp Deep Cleansing',
      items: [
        ...(shampoo    ? [{ productId: shampoo.id,    qty: 30, threshold: 60 }] : []),
        ...(hairOil    ? [{ productId: hairOil.id,     qty: 10, threshold: 30 }] : []),
      ],
    },
    {
      serviceName: 'Trichology Consultation',
      items: [
        ...(hairShampoo? [{ productId: hairShampoo.id, qty: 15, threshold: 30 }] : []),
      ],
    },
    // Skin Services
    {
      serviceName: 'TCA Peel',
      items: [
        ...(faceWash  ? [{ productId: faceWash.id,   qty: 10, threshold: 30 }] : []),
        ...(vitaminC  ? [{ productId: vitaminC.id,    qty: 5,  threshold: 15 }] : []),
        ...(sunscreen ? [{ productId: sunscreen.id,  qty: 8,  threshold: 20 }] : []),
      ],
    },
    {
      serviceName: 'Pumpkin Peel',
      items: [
        ...(faceMask  ? [{ productId: faceMask.id,   qty: 15, threshold: 30 }] : []),
        ...(moisturizer?[{ productId: moisturizer.id, qty: 8,  threshold: 20 }] : []),
      ],
    },
    {
      serviceName: 'Under-Eye Peel',
      items: [
        ...(niacin    ? [{ productId: niacin.id,      qty: 5,  threshold: 15 }] : []),
        ...(vitaminC  ? [{ productId: vitaminC.id,    qty: 3,  threshold: 10 }] : []),
      ],
    },
    {
      serviceName: 'Cerascape Face Cleanser',
      items: [
        ...(vitCWash  ? [{ productId: vitCWash.id,   qty: 10, threshold: 25 }] : []),
        ...(moisturizer?[{ productId: moisturizer.id, qty: 5,  threshold: 15 }] : []),
      ],
    },
    // Wellness
    {
      serviceName: 'Wellness Membership (Annual)',
      items: [
        ...(collagen  ? [{ productId: collagen.id,   qty: 30, threshold: 60 }] : []),
        ...(biotin    ? [{ productId: biotin.id,      qty: 1,  threshold: 3 }] : []),
        ...(multivit  ? [{ productId: multivit.id,   qty: 1,  threshold: 3 }] : []),
      ],
    },
  ];

  let svcMapped = 0;
  for (const { serviceName, items } of serviceMappings) {
    const svc = svcByName.get(serviceName);
    if (!svc || !items.length) continue;

    // Full-replace: delete existing then create new
    await db.serviceInventoryItem.deleteMany({ where: { serviceId: svc.id } });
    await db.serviceInventoryItem.createMany({
      data: items.map((item, i) => ({
        serviceId: svc.id,
        productId: item.productId,
        quantityPerSession: item.qty,
        lowStockThreshold: item.threshold,
        sortOrder: i,
      })),
    });
    console.log(`  ✅ ${serviceName}: ${items.length} product(s) mapped`);
    svcMapped++;
  }
  console.log(`\n✅ Mapped inventory to ${svcMapped} services`);

  // ── 6. Package session master inventory mapping
  //    PackageSessionMaster.serviceIds is a JSON array of service IDs.
  //    We show here which packages include which services, and hence which
  //    inventory items each package session will consume.
  const packageMasters = await db.packageSessionMaster.findMany();
  console.log(`\n📦 Package Session Masters (${packageMasters.length}) — inventory flows via their services:`);
  for (const pm of packageMasters) {
    let svcIds: string[] = [];
    try { svcIds = JSON.parse(pm.serviceIds ?? '[]'); } catch { /* ignore */ }
    if (!svcIds.length) {
      console.log(`  ${pm.name}: no services linked`);
      continue;
    }
    const linkedSvcs = services.filter(s => svcIds.includes(s.id));
    const svcWithItems = await db.serviceInventoryItem.findMany({
      where: { serviceId: { in: linkedSvcs.map(s => s.id) } },
      include: { product: { select: { name: true, uom: true } } },
    });
    const itemLines = svcWithItems.map(i => `${i.product.name} ×${i.quantityPerSession}${i.product.uom}/session`).join(', ');
    console.log(`  ${pm.name}: services=[${linkedSvcs.map(s=>s.name).join(', ')}] → inventory=[${itemLines || 'none yet'}]`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
