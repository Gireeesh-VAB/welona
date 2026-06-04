/**
 * Demo data seeder for the Inventory module. Drives the real admin API so all
 * stock, batches, PO/transfer statuses, expiry and audit logs stay consistent.
 * Safe to re-run: master rows are skipped on conflict; transactional docs are
 * created only if no DEMO docs exist yet.
 *
 * Usage: backend running on :3002, then `node prisma/seed-inventory-demo.mjs`.
 */
const B = process.env.DEMO_API || 'http://localhost:3002/api/v1';
const ADMIN = { identifier: 'superadmin@welona.com', password: 'Welona@123' };

let cookie = '';
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.getSetCookie?.() ?? [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok && json?.success !== false, json };
}
const data = (r) => r.json?.data;
const daysFromNow = (d) => new Date(Date.now() + d * 864e5).toISOString();
const swatch = (hex) =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='${hex}'/></svg>`;

async function ensureSupplier(s) {
  const r = await api('/admin/suppliers', { method: 'POST', body: s });
  if (r.status === 409) {
    const list = await api(`/admin/suppliers?search=${encodeURIComponent(s.code)}`);
    return data(list).find((x) => x.code === s.code);
  }
  return data(r);
}
async function ensureWarehouse(w) {
  const r = await api('/admin/warehouses', { method: 'POST', body: w });
  if (r.status === 409) {
    const list = await api(`/admin/warehouses?branchId=${w.branchId}&search=${encodeURIComponent(w.code)}`);
    return data(list).find((x) => x.code === w.code);
  }
  return data(r);
}

(async () => {
  console.log('Logging in…');
  const login = await api('/auth/admin/login', { method: 'POST', body: ADMIN });
  if (!login.ok) throw new Error('Admin login failed — is the backend on :3002?');

  const branches = data(await api('/admin/branches?limit=5'));
  const products = data(await api('/admin/products?limit=12&isActive=true'));
  if (branches.length < 2 || products.length < 6) throw new Error('Need ≥2 branches and ≥6 products seeded first.');
  const [b0, b1, b2] = branches;
  console.log(`Branches: ${branches.map((b) => b.branchName).join(', ')}`);

  // 1) Suppliers
  console.log('\n# Suppliers');
  const suppliers = {};
  for (const s of [
    { name: 'Acme Distributors', code: 'DEMO-ACME', contactPerson: 'Ravi Kumar', phone: '+91-9876543210', email: 'sales@acme.example', gstin: '29ABCDE1234F1Z5', paymentTerms: 'Net 30' },
    { name: 'MediSource Pharma', code: 'DEMO-MEDI', contactPerson: 'Anita Rao', phone: '+91-9811122233', email: 'orders@medisource.example', gstin: '27MEDIS5678G2Z1', paymentTerms: 'Net 15' },
    { name: 'GlowCare Cosmetics', code: 'DEMO-GLOW', contactPerson: 'Sara Khan', phone: '+91-9700088899', email: 'hello@glowcare.example', paymentTerms: 'Advance' },
    { name: 'PureHerbs Supplies', code: 'DEMO-PURE', contactPerson: 'Imran Shaikh', phone: '+91-9655544433', email: 'supply@pureherbs.example', paymentTerms: 'Net 45' },
  ]) {
    suppliers[s.code] = await ensureSupplier(s);
    console.log(`  ✓ ${s.name}`);
  }

  // 2) Extra warehouses at branch 0
  console.log('\n# Warehouses (extra at ' + b0.branchName + ')');
  for (const w of [
    { branchId: b0.id, name: 'Cold Storage', code: 'CS', isDefault: false },
    { branchId: b0.id, name: 'Overflow Store', code: 'OVF', isDefault: false },
  ]) {
    await ensureWarehouse(w);
    console.log(`  ✓ ${w.name}`);
  }

  // 3) Flag a few products batch/expiry-tracked + give some images
  console.log('\n# Product flags + images');
  const batchProducts = products.slice(0, 3);
  const colorList = ['%23C9A227', '%234C9A2A', '%232A6FB0', '%23B0452A', '%237A4CB0'];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const tracked = i < 3;
    await api(`/admin/products/${p.id}`, {
      method: 'PUT',
      body: { trackBatches: tracked, trackExpiry: tracked, imageUrl: i < 5 ? swatch(colorList[i]) : undefined },
    });
  }
  console.log(`  ✓ ${batchProducts.length} products batch/expiry-tracked, 5 product images set`);

  // Idempotency guard for transactional docs.
  const existingDemoPOs = data(await api('/admin/purchase-orders?search=DEMO&limit=1'));
  if (existingDemoPOs.length > 0) {
    console.log('\nDemo purchase orders already exist — skipping transactional docs.');
  } else {
    // 4) Purchase orders + receipts (varied stages)
    console.log('\n# Purchase orders + goods receipts');
    const line = (p, qty, price, tax = 1800) => ({ productId: p.id, quantity: qty, unitPrice: price, taxRate: tax });

    // PO1 → fully received (with batches for the tracked products; one near-expiry)
    const po1 = data(await api('/admin/purchase-orders', { method: 'POST', body: {
      branchId: b0.id, supplierId: suppliers['DEMO-ACME'].id, notes: 'DEMO restock',
      items: [line(products[0], 60, 12000), line(products[1], 40, 8000), line(products[3], 100, 4000)],
    } }));
    await api('/admin/goods-receipts', { method: 'POST', body: { poId: po1.id, items: [
      { productId: products[0].id, quantity: 60, batchNo: 'ACME-A1', expiryDate: daysFromNow(45) },
      { productId: products[1].id, quantity: 40, batchNo: 'ACME-B7', expiryDate: daysFromNow(400) },
      { productId: products[3].id, quantity: 100 },
    ] } });
    console.log(`  ✓ ${po1.number} fully received (3 lines, 2 batches)`);

    // PO2 → partially received
    const po2 = data(await api('/admin/purchase-orders', { method: 'POST', body: {
      branchId: b0.id, supplierId: suppliers['DEMO-MEDI'].id, notes: 'DEMO partial',
      items: [line(products[2], 50, 15000), line(products[4], 30, 6000)],
    } }));
    await api('/admin/goods-receipts', { method: 'POST', body: { poId: po2.id, items: [
      { productId: products[2].id, quantity: 20, batchNo: 'MEDI-EXP', expiryDate: daysFromNow(-5) }, // already expired!
    ] } });
    console.log(`  ✓ ${po2.number} partially received (incl. an EXPIRED batch)`);

    // PO3 → sent + overdue (expected 12 days ago, not received)
    const po3 = data(await api('/admin/purchase-orders', { method: 'POST', body: {
      branchId: b1.id, supplierId: suppliers['DEMO-GLOW'].id, notes: 'DEMO overdue', expectedAt: daysFromNow(-12),
      items: [line(products[5], 25, 9000)],
    } }));
    await api(`/admin/purchase-orders/${po3.id}`, { method: 'PUT', body: { status: 'sent' } });
    console.log(`  ✓ ${po3.number} sent + OVERDUE`);

    // PO4 → draft
    const po4 = data(await api('/admin/purchase-orders', { method: 'POST', body: {
      branchId: b0.id, supplierId: suppliers['DEMO-PURE'].id, notes: 'DEMO draft',
      items: [line(products[1], 15, 8200)],
    } }));
    console.log(`  ✓ ${po4.number} draft`);

    // 5) Stock transfers (varied stages)
    console.log('\n# Stock transfers');
    const t1 = data(await api('/admin/stock-transfers', { method: 'POST', body: {
      fromBranchId: b0.id, toBranchId: b1.id, notes: 'DEMO completed', items: [{ productId: products[3].id, quantity: 15 }],
    } }));
    await api(`/admin/stock-transfers/${t1.id}`, { method: 'PUT', body: { action: 'dispatch' } });
    await api(`/admin/stock-transfers/${t1.id}`, { method: 'PUT', body: { action: 'receive' } });
    console.log(`  ✓ ${t1.number} dispatched + received`);

    const t2 = data(await api('/admin/stock-transfers', { method: 'POST', body: {
      fromBranchId: b0.id, toBranchId: (b2 ?? b1).id, notes: 'DEMO in-transit', items: [{ productId: products[0].id, quantity: 8 }],
    } }));
    await api(`/admin/stock-transfers/${t2.id}`, { method: 'PUT', body: { action: 'dispatch' } });
    console.log(`  ✓ ${t2.number} in transit (dispatched)`);

    const t3 = data(await api('/admin/stock-transfers', { method: 'POST', body: {
      fromBranchId: b1.id, toBranchId: b0.id, notes: 'DEMO requested', items: [{ productId: products[4].id, quantity: 5 }],
    } }));
    console.log(`  ✓ ${t3.number} requested`);

    // 6) Some sales (manual stock-out) to populate reports + create low stock
    console.log('\n# Sales movements (for reports / movement classes)');
    const sales = [
      [products[0].id, 18], [products[0].id, 12], [products[1].id, 9], [products[3].id, 40], [products[3].id, 25], [products[4].id, 6],
    ];
    for (const [productId, qty] of sales) {
      await api('/admin/inventory/movements', { method: 'POST', body: { branchId: b0.id, productId, type: 'sale', delta: -qty, reason: 'DEMO counter sale' } });
    }
    console.log(`  ✓ ${sales.length} sale movements recorded`);
  }

  // 7) Create a low-stock situation: bump reorder level on two products above stock
  console.log('\n# Low-stock triggers');
  const stock0 = data(await api(`/admin/inventory/stock?branchId=${b0.id}&limit=500`));
  const lowTargets = stock0.slice(0, 2);
  for (const row of lowTargets) {
    await api(`/admin/products/${row.productId}`, { method: 'PUT', body: { reorderLevel: row.quantity + 30 } });
  }
  console.log(`  ✓ reorder level raised on ${lowTargets.length} products (creates low-stock alerts)`);

  // --- Verify ---
  console.log('\n=== VERIFY ===');
  const rep = data(await api(`/admin/inventory/reports?branchId=${b0.id}&days=30`));
  console.log(`Reports(${b0.branchName}): valuation=₹${(rep.summary.valuation / 100).toLocaleString('en-IN')}, units=${rep.summary.totalUnits}, sold(30d)=${rep.summary.soldUnits}, classes=${JSON.stringify(rep.products.reduce((a, r) => ((a[r.movementClass] = (a[r.movementClass] || 0) + 1), a), {}))}`);
  const al = data(await api(`/admin/inventory/alerts?branchId=${b0.id}`));
  console.log(`Alerts(${b0.branchName}): ${JSON.stringify(al.counts)}`);
  const alAll = data(await api('/admin/inventory/alerts'));
  console.log(`Alerts(all branches): ${JSON.stringify(alAll.counts)}`);
  const batches = data(await api('/admin/inventory/batches?inStockOnly=false&limit=50'));
  console.log(`Batches: ${batches.length} (${batches.map((x) => `${x.batchNo}:${x.quantity}`).join(', ')})`);
  const pos = await api('/admin/purchase-orders?limit=50');
  console.log(`Purchase orders: ${pos.json.meta.total}`);
  const trs = await api('/admin/stock-transfers?limit=50');
  console.log(`Stock transfers: ${trs.json.meta.total}`);
  const audit = await api('/admin/audit-logs?limit=1');
  console.log(`Audit log entries: ${audit.json.meta.total}`);
  console.log('\n✅ Demo data ready.');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
