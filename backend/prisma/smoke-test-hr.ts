/**
 * Smoke-test every Phase 1 HR endpoint against the running backend dev
 * server. Logs in as `superadmin@welona.com / Welona@123` and walks every
 * route, printing a pass/fail summary. Exits non-zero if anything failed.
 *
 * Usage: `npx tsx prisma/smoke-test-hr.ts`
 * Pre-req: `npm run dev` running on port 3002.
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
  if (!res.ok) {
    throw new Error(`Admin login failed: ${res.status} ${await res.text()}`);
  }
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) {
    throw new Error('Login succeeded but no Set-Cookie header returned');
  }
  return setCookies.map((c) => c.split(';')[0]).join('; ');
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
    // non-JSON body
  }
  return { status: res.status, json, ok: res.ok };
}

function expectSuccess(name: string, r: { status: number; json: unknown; ok: boolean }) {
  if (!r.ok) {
    const errMsg =
      r.json && typeof r.json === 'object' && 'error' in (r.json as Record<string, unknown>)
        ? JSON.stringify((r.json as { error: unknown }).error)
        : 'no error body';
    record(name, false, r.status, errMsg);
    return false;
  }
  record(name, true, r.status);
  return true;
}

async function main() {
  console.log(`[smoke-test] Logging in as ${ADMIN_EMAIL}…`);
  const cookieHeader = await login();
  console.log('[smoke-test] OK — running checks\n');

  const db = new PrismaClient();
  try {
    // GET endpoints
    expectSuccess('GET /admin/hr/dashboard',         await call(cookieHeader, 'GET', '/admin/hr/dashboard'));
    expectSuccess('GET /admin/hr/attendance',        await call(cookieHeader, 'GET', '/admin/hr/attendance?limit=5'));
    expectSuccess('GET /admin/hr/leave-types',       await call(cookieHeader, 'GET', '/admin/hr/leave-types?limit=10'));
    expectSuccess('GET /admin/hr/leaves',            await call(cookieHeader, 'GET', '/admin/hr/leaves?limit=10'));
    expectSuccess('GET /admin/hr/holidays',          await call(cookieHeader, 'GET', '/admin/hr/holidays?limit=20'));
    expectSuccess('GET /admin/departments',          await call(cookieHeader, 'GET', '/admin/departments?limit=5'));
    expectSuccess('GET /admin/designations',         await call(cookieHeader, 'GET', '/admin/designations?limit=5'));
    expectSuccess('GET /admin/employees',            await call(cookieHeader, 'GET', '/admin/employees?limit=5'));
    expectSuccess('GET /admin/system-users',         await call(cookieHeader, 'GET', '/admin/system-users?limit=5'));

    // Employee profile + leave balance need a real employee id
    const anyEmp = await db.employee.findFirst({ where: { isActive: true } });
    if (anyEmp) {
      expectSuccess(
        `GET /admin/hr/employees/${anyEmp.employeeCode}/profile`,
        await call(cookieHeader, 'GET', `/admin/hr/employees/${anyEmp.id}/profile`),
      );
      expectSuccess(
        `GET /admin/hr/leaves/balance (${anyEmp.employeeCode})`,
        await call(cookieHeader, 'GET', `/admin/hr/leaves/balance?employeeId=${anyEmp.id}`),
      );
    } else {
      record('GET /admin/hr/employees/[id]/profile', false, 0, 'no active employees in DB');
      record('GET /admin/hr/leaves/balance', false, 0, 'no active employees in DB');
    }

    // POST + state-changing endpoints: pick a *pending* leave and approve, then cancel
    const pending = await db.leaveApplication.findFirst({ where: { status: 'pending' } });
    if (pending) {
      const approveRes = await call(
        cookieHeader,
        'POST',
        `/admin/hr/leaves/${pending.id}/approve`,
        { approverNote: 'smoke-test approve' },
      );
      expectSuccess(`POST /admin/hr/leaves/[id]/approve (${pending.id})`, approveRes);

      const cancelRes = await call(
        cookieHeader,
        'POST',
        `/admin/hr/leaves/${pending.id}/cancel`,
      );
      expectSuccess(`POST /admin/hr/leaves/[id]/cancel (${pending.id})`, cancelRes);
    } else {
      record('POST /admin/hr/leaves/[id]/approve', false, 0, 'no pending application to approve');
      record('POST /admin/hr/leaves/[id]/cancel', false, 0, 'no application to cancel');
    }

    // Mark one attendance row and delete it
    if (anyEmp) {
      const date = new Date();
      const dateIso = new Date(Date.UTC(
        date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
      )).toISOString();
      const upsertRes = await call(cookieHeader, 'POST', '/admin/hr/attendance', {
        employeeId: anyEmp.id,
        date: dateIso,
        status: 'wfh',
        remarks: 'smoke-test',
      });
      expectSuccess('POST /admin/hr/attendance (upsert)', upsertRes);

      if (
        upsertRes.ok &&
        upsertRes.json &&
        typeof upsertRes.json === 'object' &&
        'data' in (upsertRes.json as Record<string, unknown>)
      ) {
        const id = ((upsertRes.json as { data: { id: string } }).data).id;
        const delRes = await call(cookieHeader, 'DELETE', `/admin/hr/attendance/${id}`);
        expectSuccess(`DELETE /admin/hr/attendance/[id] (${id})`, delRes);
      }
    }

    // Bulk attendance — single entry, then delete (to keep DB clean)
    if (anyEmp) {
      const date = new Date();
      const dateIso = new Date(Date.UTC(
        date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
      )).toISOString();
      const bulkRes = await call(cookieHeader, 'POST', '/admin/hr/attendance/bulk', {
        date: dateIso,
        entries: [{ employeeId: anyEmp.id, status: 'present', remarks: 'smoke-bulk' }],
      });
      expectSuccess('POST /admin/hr/attendance/bulk', bulkRes);
    }
  } finally {
    await db.$disconnect();
  }

  // Summary
  const failed = checks.filter((c) => !c.ok);
  console.log('\n────────────────────────────────');
  console.log(`Passed: ${checks.length - failed.length}/${checks.length}`);
  if (failed.length === 0) {
    console.log('All HR endpoints OK ✓');
  } else {
    console.log(`Failed: ${failed.length}`);
    for (const f of failed) {
      console.log(`  ✗ [${f.status}] ${f.name}${f.detail ? '\n     ' + f.detail : ''}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[smoke-test] fatal:', err);
  process.exit(1);
});
