/**
 * Products + inventory + branch-addresses demo seed.
 *
 * Run with: `npm run db:seed-products`
 *
 * Idempotent — upserts on natural keys (SKU for products, (branchId, label)
 * pair for addresses, (branchId, productId) for stock). Existing data is
 * preserved; running twice produces the same set of rows.
 *
 * Populates:
 *   - ~22 products across hair/skin/wellness categories
 *   - 1–2 additional addresses per existing branch (billing, warehouse, …)
 *   - Opening stock per branch × product (random realistic quantities)
 *   - ~30 movement entries (purchases / sales / adjustments)
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
  taxPercent: number; // basis points, 1800 = 18%
  reorderLevel: number;
  description: string;
}

const products: ProductSeed[] = [
  // ----- Hair Care -----
  { sku: 'SH-001', name: 'Anti-Dandruff Shampoo 200ml', brand: 'Welona', category: 'Hair Care',
    hsnSacCode: '3305', uom: 'bottle', barcode: '8901100000001',
    mrp: r(650), salePrice: r(550), purchasePrice: r(380), taxPercent: 1800,
    reorderLevel: 12, description: 'Medicated anti-dandruff shampoo with zinc pyrithione' },
  { sku: 'SH-002', name: 'Hair-Fall Defence Shampoo 200ml', brand: 'Welona', category: 'Hair Care',
    hsnSacCode: '3305', uom: 'bottle', barcode: '8901100000002',
    mrp: r(720), salePrice: r(620), purchasePrice: r(420), taxPercent: 1800,
    reorderLevel: 10, description: 'Strengthens hair roots and reduces breakage' },
  { sku: 'CN-001', name: 'Repair Conditioner 200ml', brand: 'Welona', category: 'Hair Care',
    hsnSacCode: '3305', uom: 'bottle', barcode: '8901100000010',
    mrp: r(580), salePrice: r(490), purchasePrice: r(340), taxPercent: 1800,
    reorderLevel: 10, description: 'Deep-repair conditioner with keratin and argan oil' },
  { sku: 'OL-001', name: 'Onion Hair Oil 100ml', brand: 'Welona', category: 'Hair Care',
    hsnSacCode: '3305', uom: 'bottle', barcode: '8901100000020',
    mrp: r(450), salePrice: r(395), purchasePrice: r(260), taxPercent: 1800,
    reorderLevel: 14, description: 'Cold-pressed onion oil with vitamin E' },
  { sku: 'SR-001', name: 'Hair Growth Serum 30ml', brand: 'Welona Pro', category: 'Hair Care',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000030',
    mrp: r(1450), salePrice: r(1250), purchasePrice: r(840), taxPercent: 1800,
    reorderLevel: 8, description: '5% minoxidil-equivalent botanical hair growth serum' },

  // ----- Skin Care -----
  { sku: 'FW-001', name: 'Vitamin C Face Wash 100ml', brand: 'Welona', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000100',
    mrp: r(395), salePrice: r(340), purchasePrice: r(220), taxPercent: 1800,
    reorderLevel: 15, description: 'Brightening face wash with kakadu plum' },
  { sku: 'FW-002', name: 'Acne-Control Face Wash 100ml', brand: 'Welona', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000101',
    mrp: r(420), salePrice: r(365), purchasePrice: r(240), taxPercent: 1800,
    reorderLevel: 15, description: 'Salicylic-acid based daily anti-acne cleanser' },
  { sku: 'SE-001', name: 'Niacinamide 10% Serum 30ml', brand: 'Welona Pro', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000110',
    mrp: r(995), salePrice: r(850), purchasePrice: r(560), taxPercent: 1800,
    reorderLevel: 10, description: 'Reduces blemishes and balances sebum' },
  { sku: 'SE-002', name: 'Vitamin C 20% Serum 30ml', brand: 'Welona Pro', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000111',
    mrp: r(1295), salePrice: r(1095), purchasePrice: r(720), taxPercent: 1800,
    reorderLevel: 8, description: 'Brightens skin and fades dark spots' },
  { sku: 'SE-003', name: 'Hyaluronic Acid Serum 30ml', brand: 'Welona Pro', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000112',
    mrp: r(995), salePrice: r(850), purchasePrice: r(560), taxPercent: 1800,
    reorderLevel: 10, description: 'Triple-weight HA for plump, hydrated skin' },
  { sku: 'MO-001', name: 'Daily Moisturizer SPF 30 50ml', brand: 'Welona', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000120',
    mrp: r(620), salePrice: r(525), purchasePrice: r(355), taxPercent: 1800,
    reorderLevel: 12, description: 'Light, broad-spectrum SPF 30 moisturizer' },
  { sku: 'SN-001', name: 'Mineral Sunscreen SPF 50 60ml', brand: 'Welona', category: 'Skin Services',
    hsnSacCode: '3304', uom: 'bottle', barcode: '8901100000121',
    mrp: r(795), salePrice: r(685), purchasePrice: r(465), taxPercent: 1800,
    reorderLevel: 12, description: 'Zinc oxide based mineral sunscreen, no white cast' },

  // ----- Wellness / Supplements -----
  { sku: 'SP-001', name: 'Biotin 5000mcg (60 tabs)', brand: 'Welona Health', category: 'Wellness',
    hsnSacCode: '3004', uom: 'pack', barcode: '8901100000200',
    mrp: r(595), salePrice: r(495), purchasePrice: r(310), taxPercent: 1200,
    reorderLevel: 20, description: 'Daily biotin for hair, skin and nail health' },
  { sku: 'SP-002', name: 'Multivitamin Daily (60 tabs)', brand: 'Welona Health', category: 'Wellness',
    hsnSacCode: '3004', uom: 'pack', barcode: '8901100000201',
    mrp: r(795), salePrice: r(685), purchasePrice: r(440), taxPercent: 1200,
    reorderLevel: 18, description: '24 vitamins & minerals — once-daily formula' },
  { sku: 'SP-003', name: 'Omega-3 Fish Oil (60 caps)', brand: 'Welona Health', category: 'Wellness',
    hsnSacCode: '3004', uom: 'pack', barcode: '8901100000202',
    mrp: r(1095), salePrice: r(940), purchasePrice: r(600), taxPercent: 1200,
    reorderLevel: 15, description: 'Molecular-distilled, IFOS-certified fish oil' },
  { sku: 'SP-004', name: 'Whey Protein Vanilla 1kg', brand: 'Welona Health', category: 'Wellness',
    hsnSacCode: '2106', uom: 'pack', barcode: '8901100000203',
    mrp: r(2495), salePrice: r(2195), purchasePrice: r(1380), taxPercent: 1200,
    reorderLevel: 10, description: 'Grass-fed whey, 24g protein / serving' },
  { sku: 'SP-005', name: 'Collagen Powder (250g)', brand: 'Welona Health', category: 'Wellness',
    hsnSacCode: '2106', uom: 'pack', barcode: '8901100000204',
    mrp: r(1495), salePrice: r(1295), purchasePrice: r(840), taxPercent: 1200,
    reorderLevel: 10, description: 'Type-I & III hydrolysed marine collagen peptides' },

  // ----- Accessories -----
  { sku: 'AC-001', name: 'Wide-Tooth Wooden Comb', brand: 'Welona', category: 'Hair Care',
    hsnSacCode: '9615', uom: 'unit', barcode: '8901100000300',
    mrp: r(395), salePrice: r(295), purchasePrice: r(140), taxPercent: 1800,
    reorderLevel: 25, description: 'Anti-static wooden detangling comb' },
  { sku: 'AC-002', name: 'Microfibre Hair Towel', brand: 'Welona', category: 'Hair Care',
    hsnSacCode: '6302', uom: 'unit', barcode: '8901100000301',
    mrp: r(595), salePrice: r(495), purchasePrice: r(280), taxPercent: 500,
    reorderLevel: 20, description: 'Quick-dry microfibre hair wrap towel' },
  { sku: 'AC-003', name: 'Silk Pillowcase', brand: 'Welona', category: 'Hair Care',
    hsnSacCode: '6302', uom: 'unit', barcode: '8901100000302',
    mrp: r(1495), salePrice: r(1295), purchasePrice: r(680), taxPercent: 500,
    reorderLevel: 12, description: '22-momme mulberry silk pillowcase' },
  { sku: 'AC-004', name: 'LED Face Massager', brand: 'Welona Pro', category: 'Skin Services',
    hsnSacCode: '9018', uom: 'unit', barcode: '8901100000303',
    mrp: r(3495), salePrice: r(2995), purchasePrice: r(1980), taxPercent: 1800,
    reorderLevel: 6, description: '7-colour LED therapy face wand' },
  { sku: 'AC-005', name: 'Jade Face Roller', brand: 'Welona Pro', category: 'Skin Services',
    hsnSacCode: '9018', uom: 'unit', barcode: '8901100000304',
    mrp: r(795), salePrice: r(695), purchasePrice: r(390), taxPercent: 1200,
    reorderLevel: 12, description: 'Natural jade dual-head face roller' },
];

// Address templates seeded per branch (Billing + Warehouse).
const addressTemplates = [
  {
    label: 'Billing',
    line1: 'Welona Health Pvt Ltd — Accounts',
    line2: 'Tower B, 4th Floor, Park Square',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    country: 'India',
    phone: '+91 40 4567 8900',
    email: 'billing@welona.com',
  },
  {
    label: 'Warehouse',
    line1: 'Welona Logistics — Plot 21, Industrial Estate',
    line2: 'Phase 2, Block C',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500045',
    country: 'India',
    phone: '+91 40 4567 8910',
  },
];

async function main() {
  console.log('[prod-inv-seed] Starting …');

  const admin = await db.adminUser.findFirst();
  if (!admin) {
    console.error('No AdminUser — run the base admin seed first.');
    process.exit(1);
  }

  // ---- Categories: ensure all referenced ones exist ----
  const categoryNames = Array.from(new Set(products.map((p) => p.category)));
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
  console.log(`[prod-inv-seed] Categories ready: ${allCats.length}`);

  // ---- Products ----
  let productsSynced = 0;
  for (const p of products) {
    const cat = catByName.get(p.category);
    await db.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        brand: p.brand,
        categoryId: cat?.id ?? null,
        hsnSacCode: p.hsnSacCode,
        uom: p.uom,
        barcode: p.barcode,
        description: p.description,
        mrp: p.mrp,
        salePrice: p.salePrice,
        purchasePrice: p.purchasePrice,
        taxPercent: p.taxPercent,
        reorderLevel: p.reorderLevel,
        isActive: true,
      },
      create: {
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        categoryId: cat?.id ?? null,
        hsnSacCode: p.hsnSacCode,
        uom: p.uom,
        barcode: p.barcode,
        description: p.description,
        mrp: p.mrp,
        salePrice: p.salePrice,
        purchasePrice: p.purchasePrice,
        taxPercent: p.taxPercent,
        reorderLevel: p.reorderLevel,
        isActive: true,
        createdByAdminId: admin.id,
      },
    });
    productsSynced += 1;
  }
  console.log(`[prod-inv-seed] Products synced: ${productsSynced}`);

  const allProducts = await db.product.findMany({ where: { isActive: true } });

  // ---- Branch addresses ----
  const branches = await db.branch.findMany();
  let addressesAdded = 0;
  for (const b of branches) {
    for (const tpl of addressTemplates) {
      const existing = await db.branchAddress.findFirst({
        where: { branchId: b.id, label: tpl.label },
      });
      if (existing) continue;
      await db.branchAddress.create({
        data: {
          branchId: b.id,
          label: tpl.label,
          line1: tpl.line1,
          line2: tpl.line2 ?? null,
          city: tpl.city ?? null,
          state: tpl.state ?? null,
          pincode: tpl.pincode ?? null,
          country: tpl.country ?? 'India',
          phone: tpl.phone ?? null,
          email: tpl.email ?? null,
          isPrimary: false,
          isActive: true,
        },
      });
      addressesAdded += 1;
    }
  }
  console.log(`[prod-inv-seed] Branch addresses added: ${addressesAdded}`);

  // Resolve a default warehouse per branch (created by the warehouse backfill /
  // Warehouse master). Stock is keyed by (warehouse, product).
  const whOf = new Map<string, string>();
  for (const branch of branches) {
    const wh =
      (await db.warehouse.findFirst({ where: { branchId: branch.id, isDefault: true } })) ??
      (await db.warehouse.create({
        data: { branchId: branch.id, name: 'Main', code: 'MAIN', isDefault: true },
      }));
    whOf.set(branch.id, wh.id);
  }

  // ---- Opening stock per branch × product ----
  let openingsWritten = 0;
  const rand = rng(424242);
  for (const branch of branches) {
    const warehouseId = whOf.get(branch.id)!;
    for (const p of allProducts) {
      const qty = Math.max(0, Math.floor(rand() * 80) + p.reorderLevel);
      const stock = await db.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId: p.id } },
        create: { branchId: branch.id, warehouseId, productId: p.id, quantity: 0 },
        update: {},
      });
      const existingOpening = await db.inventoryMovement.findFirst({
        where: { warehouseId, productId: p.id, type: 'opening' },
      });
      if (existingOpening) continue;
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
          reason: 'Opening stock (seed)',
          createdByAdminId: admin.id,
        },
      });
      openingsWritten += 1;
    }
  }
  console.log(`[prod-inv-seed] Opening-stock rows written: ${openingsWritten}`);

  // ---- Sample purchases / sales / adjustments ----
  let extraMovements = 0;
  for (let i = 0; i < 40; i++) {
    const branch = pick(branches, rand);
    const p = pick(allProducts, rand);
    const warehouseId = whOf.get(branch.id)!;
    const stock = await db.inventoryStock.findUnique({
      where: { warehouseId_productId: { warehouseId, productId: p.id } },
    });
    if (!stock) continue;
    const roll = rand();
    const type: 'purchase' | 'sale' | 'adjustment' =
      roll < 0.45 ? 'purchase' : roll < 0.9 ? 'sale' : 'adjustment';
    const baseQty = Math.max(1, Math.floor(rand() * 12) + 1);
    let delta = type === 'purchase' ? baseQty : -baseQty;
    if (type === 'adjustment' && rand() > 0.5) delta = baseQty;
    if (stock.quantity + delta < 0) continue; // skip would-go-negative
    await db.inventoryMovement.create({
      data: {
        branchId: branch.id,
        warehouseId,
        productId: p.id,
        type,
        delta,
        reason:
          type === 'purchase'
            ? 'GRN against vendor PO'
            : type === 'sale'
              ? 'Counter sale'
              : 'Stock-take adjustment',
        ref: type === 'purchase' ? `PO-${1000 + i}` : type === 'sale' ? `INV-${5000 + i}` : null,
        createdByAdminId: admin.id,
      },
    });
    await db.inventoryStock.update({
      where: { id: stock.id },
      data: { quantity: stock.quantity + delta },
    });
    extraMovements += 1;
  }
  console.log(`[prod-inv-seed] Extra movements logged: ${extraMovements}`);

  console.log('[prod-inv-seed] Done.');
}

main()
  .catch((err) => {
    console.error('[prod-inv-seed] Failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
