import { db } from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dba = db as any;
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth, requirePermission } from '@/lib/auth/service';
import type { SessionStats } from '@shared/types/customer-modules';

/** GET /api/v1/sessions/stats — aggregate session dashboard stats. */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  requirePermission(claims, 'customers:read');

  const staffBranchId = claims.branchIds?.[0] ?? null;
  const pkgWhere: Record<string, unknown> = { orgId: claims.orgId };
  if (staffBranchId) pkgWhere.branchId = staffBranchId;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [activeAgg, allAgg, todaySessions] = await Promise.all([
    db.package.aggregate({
      where: { ...pkgWhere, status: 'active' },
      _count: { id: true },
      _sum:   { totalSessions: true, usedSessions: true },
    }),
    db.package.aggregate({
      where: pkgWhere,
      _sum: { totalSessions: true, usedSessions: true },
    }),
    dba.sessionEntry.count({
      where: {
        orgId: claims.orgId,
        status: 'completed',
        sessionDate: { gte: todayStart, lte: todayEnd },
        ...(staffBranchId ? { package: { branchId: staffBranchId } } : {}),
      },
    }),
  ]);

  const totalSessions     = allAgg._sum.totalSessions ?? 0;
  const completedSessions = allAgg._sum.usedSessions  ?? 0;

  const stats: SessionStats = {
    activePackages:     activeAgg._count.id,
    totalSessions,
    completedSessions,
    remainingSessions:  Math.max(0, totalSessions - completedSessions),
    todaySessions,
  };

  return ok(stats);
});
