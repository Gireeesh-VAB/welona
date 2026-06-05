import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { medicalReportUpdateSchema } from '@shared/schemas/customer-modules';

type Ctx = { params: { id: string; itemId: string } };

/** PATCH /api/v1/admin/customers/[id]/medical-reports/[itemId] — update a report. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  requireAdminAuth(req);
  const orgId = await resolveOrgId();

  const report = await db.medicalReport.findFirst({
    where: {
      id: params.itemId,
      customerId: params.id,
      orgId,
      
    },
  });
  if (!report) throw Errors.notFound('Medical report');

  const body = await parseBody(req, medicalReportUpdateSchema);
  const data: Prisma.MedicalReportUpdateInput = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.reportType !== undefined) data.reportType = body.reportType || null;
  if (body.findings !== undefined) data.findings = body.findings || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.fileUrl !== undefined) data.fileUrl = body.fileUrl || null;
  if (body.reportedAt !== undefined) data.reportedAt = new Date(body.reportedAt);

  const updated = await db.medicalReport.update({ where: { id: params.itemId }, data });
  return ok(updated);
});
