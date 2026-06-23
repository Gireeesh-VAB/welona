const { PrismaClient } = require('C:/Users/UNITECH2/welona-admin/backend/node_modules/@prisma/client');
const db = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/UNITECH2/welona-admin/backend/prisma/dev.db' } } });
async function run() {
  const b = await db.booking.findFirst({ where: { id: 'cmqoydq8m000mhmic3pbc9loe' }, select: { customerId: true, number: true } });
  console.log('Booking:', b.number, '| Customer ID:', b.customerId);

  // Now simulate the exact backend GET logic for this customer
  const bookings = await db.booking.findMany({
    where: { customerId: b.customerId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { scheduledAt: 'desc' },
  });

  const masterIds = [...new Set(bookings.flatMap(bk => bk.items.map(it => it.packageSessionMasterId).filter(Boolean)))];
  const packageNames = [...new Set(bookings.flatMap(bk => bk.items.filter(it => it.category === 'Packages' && !it.packageSessionMasterId).map(it => it.service)))];
  console.log('masterIds:', masterIds);
  console.log('packageNames:', packageNames);

  const orConditions = [
    ...(masterIds.length ? [{ id: { in: masterIds } }] : []),
    ...(packageNames.length ? [{ name: { in: packageNames } }] : []),
  ];
  const masters = orConditions.length ? await db.packageSessionMaster.findMany({ where: { OR: orConditions }, select: { id: true, name: true, inventoryItemsJson: true } }) : [];
  const masterMap = {};
  const nameMap = {};
  for (const m of masters) {
    const items = JSON.parse(m.inventoryItemsJson || '[]');
    masterMap[m.id] = items;
    nameMap[m.name] = items;
    console.log(`Master "${m.name}" → ${items.length} items`);
  }

  for (const bk of bookings) {
    for (const it of bk.items) {
      const pkgItems = it.packageSessionMasterId ? (masterMap[it.packageSessionMasterId] || []) : (it.category === 'Packages' ? (nameMap[it.service] || []) : []);
      if (pkgItems.length > 0) {
        console.log(`\nBKG ${bk.number} | "${it.service}" | masterInventoryItems: ${pkgItems.length}`);
        pkgItems.forEach(p => console.log('  -', p.productName));
      }
    }
  }
}
run().catch(e => console.error(e)).finally(() => db.$disconnect());
