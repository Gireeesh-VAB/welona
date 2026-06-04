import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminBranchCatalogSchema, type AdminBranchCatalogInput } from '@shared/schemas/admin-branch-catalog';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/v1/admin/branches/:id/catalog
 *   -> the master-data ids currently assigned to the branch.
 * PUT /api/v1/admin/branches/:id/catalog
 *   -> replace the branch's whole assignment (products, services, payment
 *      modes, categories, ledgers) in one call.
 *
 * Availability toggle only — no per-branch pricing (the global values apply).
 */
export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const exists = await db.branch.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound('Branch');

  const [products, services, paymentModes, categories, ledgers] = await Promise.all([
    db.branchProduct.findMany({ where: { branchId: params.id }, select: { productId: true } }),
    db.branchService.findMany({ where: { branchId: params.id }, select: { serviceId: true } }),
    db.branchPaymentMode.findMany({ where: { branchId: params.id }, select: { paymentModeId: true } }),
    db.branchCategory.findMany({ where: { branchId: params.id }, select: { categoryId: true } }),
    db.branchLedger.findMany({ where: { branchId: params.id }, select: { ledgerId: true } }),
  ]);

  return ok<AdminBranchCatalogInput>({
    productIds: products.map((p) => p.productId),
    serviceIds: services.map((s) => s.serviceId),
    paymentModeIds: paymentModes.map((p) => p.paymentModeId),
    categoryIds: categories.map((c) => c.categoryId),
    ledgerIds: ledgers.map((l) => l.ledgerId),
  });
});

export const PUT = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const exists = await db.branch.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound('Branch');

  const body = await parseBody(req, adminBranchCatalogSchema);
  const productIds = Array.from(new Set(body.productIds));
  const serviceIds = Array.from(new Set(body.serviceIds));
  const paymentModeIds = Array.from(new Set(body.paymentModeIds));
  const categoryIds = Array.from(new Set(body.categoryIds));
  const ledgerIds = Array.from(new Set(body.ledgerIds));

  // Verify every submitted id exists so a bad id can't silently drop rows.
  const countOk = async (
    n: number,
    delegate: { count: (args: { where: { id: { in: string[] } } }) => Promise<number> },
    ids: string[],
    label: string,
  ) => {
    if (ids.length === 0) return;
    const found = await delegate.count({ where: { id: { in: ids } } });
    if (found !== n) throw Errors.badRequest(`One or more selected ${label} no longer exist.`);
  };
  await Promise.all([
    countOk(productIds.length, db.product, productIds, 'products'),
    countOk(serviceIds.length, db.service, serviceIds, 'services'),
    countOk(paymentModeIds.length, db.paymentMode, paymentModeIds, 'payment modes'),
    countOk(categoryIds.length, db.category, categoryIds, 'categories'),
    countOk(ledgerIds.length, db.ledger, ledgerIds, 'ledgers'),
  ]);

  await db.$transaction([
    db.branchProduct.deleteMany({ where: { branchId: params.id } }),
    db.branchService.deleteMany({ where: { branchId: params.id } }),
    db.branchPaymentMode.deleteMany({ where: { branchId: params.id } }),
    db.branchCategory.deleteMany({ where: { branchId: params.id } }),
    db.branchLedger.deleteMany({ where: { branchId: params.id } }),
    db.branchProduct.createMany({
      data: productIds.map((productId) => ({ branchId: params.id, productId })),
    }),
    db.branchService.createMany({
      data: serviceIds.map((serviceId) => ({ branchId: params.id, serviceId })),
    }),
    db.branchPaymentMode.createMany({
      data: paymentModeIds.map((paymentModeId) => ({ branchId: params.id, paymentModeId })),
    }),
    db.branchCategory.createMany({
      data: categoryIds.map((categoryId) => ({ branchId: params.id, categoryId })),
    }),
    db.branchLedger.createMany({
      data: ledgerIds.map((ledgerId) => ({ branchId: params.id, ledgerId })),
    }),
  ]);

  return ok<AdminBranchCatalogInput>({ productIds, serviceIds, paymentModeIds, categoryIds, ledgerIds });
});
