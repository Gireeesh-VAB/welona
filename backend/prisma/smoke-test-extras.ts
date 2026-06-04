/**
 * Smoke-test the branch-address / products / inventory endpoints against
 * the running backend. Mirrors smoke-test-hr.ts in style. Exits non-zero
 * if anything fails.
 */
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3002/api/v1';
const ADMIN_EMAIL = 'superadmin@welona.com';
const ADMIN_PASSWORD = 'Welona@123';

interface Check {
  name: string;
  ok: boolean;
  status: number;
  detail?: string;
}

const checks: Check[] = [];

function record(name: string, ok: boolean, status: number, detail?: string) {
  checks.push({ name, ok, status, detail });
  const tag = ok ? '✓' : '✗';
  console.log(`  ${tag} [${status}] ${name}${detail ? '  → ' + detail : ''}`);
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const cookies = res.headers.getSetCookie?.() ?? [];
  if (cookies.length === 0) throw new Error('Login OK but no Set-Cookie');
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

async function call(
  cookieHeader: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: unknown; ok: boolean }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      cookie: cookieHeader,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, json, ok: res.ok };
}

function ok(name: string, r: { status: number; json: unknown; ok: boolean }) {
  if (!r.ok) {
    const detail =
      r.json && typeof r.json === 'object' && 'error' in (r.json as Record<string, unknown>)
        ? JSON.stringify((r.json as { error: unknown }).error)
        : 'no body';
    record(name, false, r.status, detail);
    return false;
  }
  record(name, true, r.status);
  return true;
}

async function main() {
  console.log(`[smoke] login as ${ADMIN_EMAIL}…`);
  const cookie = await login();
  console.log('[smoke] OK — running checks\n');

  const db = new PrismaClient();
  try {
    const branch = await db.branch.findFirst();
    const product = await db.product.findFirst({ where: { isActive: true } });
    if (!branch || !product) {
      console.error('No branch / product seeded.');
      process.exit(1);
    }

    // Branches list now returns isActive + additionalAddresses
    const branchList = await call(cookie, 'GET', '/admin/branches?limit=5');
    ok('GET /admin/branches', branchList);
    if (branchList.ok) {
      const sample = ((branchList.json as { data: Array<{ isActive?: boolean; additionalAddresses?: unknown[] }> }).data ?? [])[0];
      const hasFields =
        sample && typeof sample.isActive === 'boolean' && Array.isArray(sample.additionalAddresses);
      record('  └ payload includes isActive + additionalAddresses', !!hasFields, 200);
    }

    // Branch addresses
    ok(
      `GET /admin/branches/${branch.code}/addresses`,
      await call(cookie, 'GET', `/admin/branches/${branch.id}/addresses`),
    );

    // Create + delete address (clean up after)
    const createRes = await call(cookie, 'POST', `/admin/branches/${branch.id}/addresses`, {
      label: 'Smoke-test',
      line1: '123 Smoke Lane',
      city: 'Test City',
      pincode: '500001',
      isPrimary: false,
      isActive: true,
    });
    ok('POST /admin/branches/[id]/addresses', createRes);
    if (createRes.ok) {
      const id = ((createRes.json as { data: { id: string } }).data).id;
      ok(
        `PUT  /admin/branches/[id]/addresses/[addressId]`,
        await call(cookie, 'PUT', `/admin/branches/${branch.id}/addresses/${id}`, {
          label: 'Smoke-test (renamed)',
          isActive: false,
        }),
      );
      ok(
        `DELETE /admin/branches/[id]/addresses/[addressId]`,
        await call(cookie, 'DELETE', `/admin/branches/${branch.id}/addresses/${id}`),
      );
    }

    // Products
    ok('GET /admin/products', await call(cookie, 'GET', '/admin/products?limit=5'));
    const updateRes = await call(cookie, 'PUT', `/admin/products/${product.id}`, {
      isActive: !product.isActive,
    });
    ok('PUT /admin/products/[id] (toggle isActive)', updateRes);
    // Flip back so the dataset stays clean for the UI
    await call(cookie, 'PUT', `/admin/products/${product.id}`, {
      isActive: product.isActive,
    });

    // Inventory
    ok(
      'GET /admin/inventory/stock',
      await call(cookie, 'GET', `/admin/inventory/stock?branchId=${branch.id}&limit=10`),
    );
    ok(
      'GET /admin/inventory/movements',
      await call(cookie, 'GET', `/admin/inventory/movements?branchId=${branch.id}&limit=5`),
    );

    // Create one purchase movement, then a sale to net out (keeps qty unchanged)
    const purchaseRes = await call(cookie, 'POST', '/admin/inventory/movements', {
      branchId: branch.id,
      productId: product.id,
      type: 'purchase',
      delta: 5,
      reason: 'smoke-test purchase',
      ref: 'SMOKE-1',
    });
    ok('POST /admin/inventory/movements (purchase +5)', purchaseRes);

    const saleRes = await call(cookie, 'POST', '/admin/inventory/movements', {
      branchId: branch.id,
      productId: product.id,
      type: 'sale',
      delta: -5,
      reason: 'smoke-test sale',
      ref: 'SMOKE-2',
    });
    ok('POST /admin/inventory/movements (sale -5)', saleRes);

    // Opening stock — read current qty, set it to itself (no-op-friendly)
    const stock = await db.inventoryStock.findFirst({
      where: { branchId: branch.id, productId: product.id },
    });
    ok(
      'POST /admin/inventory/opening-stock',
      await call(cookie, 'POST', '/admin/inventory/opening-stock', {
        branchId: branch.id,
        entries: [{ productId: product.id, quantity: stock?.quantity ?? 0 }],
      }),
    );
  } finally {
    await db.$disconnect();
  }

  const failed = checks.filter((c) => !c.ok);
  console.log('\n────────────────────────────────');
  console.log(`Passed: ${checks.length - failed.length}/${checks.length}`);
  if (failed.length > 0) {
    for (const f of failed) {
      console.log(`  ✗ [${f.status}] ${f.name}${f.detail ? '\n     ' + f.detail : ''}`);
    }
    process.exit(1);
  }
  console.log('All new endpoints OK ✓');
}

main().catch((err) => {
  console.error('[smoke] fatal:', err);
  process.exit(1);
});
