import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';

type Ctx = { params: { id: string } };

export const GET = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);

  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');

  // Verify master exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any;
  const master = await dba.packageSessionMaster.findFirst({
    where: { id: params.id, orgId: org.id },
    select: { id: true },
  });
  if (!master) throw Errors.notFound('Package Session Master');

  const packages = await db.package.findMany({
    where: { masterId: params.id, orgId: org.id },
    orderBy: { purchasedAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      branch:   { select: { id: true, name: true } },
    },
  });

  const data = packages.map((p) => ({
    id:            p.id,
    customerId:    p.customerId,
    customerName:  p.customer.name,
    customerPhone: p.customer.phone,
    branchName:    p.branch?.name ?? null,
    name:          p.name,
    totalSessions: p.totalSessions,
    usedSessions:  p.usedSessions,
    status:        p.status,
    purchasedAt:   p.purchasedAt.toISOString(),
    expiresAt:     p.expiresAt?.toISOString() ?? null,
  }));

  return ok(data);
});
