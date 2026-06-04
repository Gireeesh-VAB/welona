import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminEmployeeDocumentCreateSchema } from '@shared/schemas/admin-employee-documents';
import type { AdminEmployeeDocument } from '@shared/types/admin-employee-document';
import type { EmployeeDocument } from '@prisma/client';

interface RouteContext {
  params: { id: string };
}

function toDto(row: EmployeeDocument): AdminEmployeeDocument {
  return {
    id: row.id,
    employeeId: row.employeeId,
    title: row.title,
    docType: row.docType,
    fileUrl: row.fileUrl,
    notes: row.notes,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

/**
 * GET  /api/v1/admin/employees/:id/documents
 * POST /api/v1/admin/employees/:id/documents
 */
export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const exists = await db.employee.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound('Employee');
  const rows = await db.employeeDocument.findMany({
    where: { employeeId: params.id },
    orderBy: { uploadedAt: 'desc' },
  });
  return ok(rows.map(toDto));
});

export const POST = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, adminEmployeeDocumentCreateSchema);
  const exists = await db.employee.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound('Employee');

  const row = await db.employeeDocument.create({
    data: {
      employeeId: params.id,
      title: body.title,
      docType: body.docType ?? null,
      fileUrl: body.fileUrl,
      notes: body.notes ?? null,
      createdByAdminId: claims.sub,
    },
  });
  return created(toDto(row));
});
