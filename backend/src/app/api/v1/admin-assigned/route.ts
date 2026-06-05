import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/service';
import { Errors } from '@/lib/api/errors';

/**
 * GET /api/v1/admin-assigned
 *
 * Returns ALL data the admin has explicitly assigned to the calling staff
 * member's branch — services, products, offers, payment modes, categories
 * and staff. Each section is empty when nothing is assigned.
 *
 * Strict isolation: only the logged-in branch's assignments are returned.
 * Org-wide staff (no branchId) receive a 400.
 */
export const GET = route(async (req) => {
  const claims = requireAuth(req);
  const branchId = claims.branchIds[0] ?? null;

  if (!branchId) {
    throw Errors.badRequest('This endpoint is only available for branch-scoped staff.');
  }

  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { id: true, name: true, code: true },
  });
  if (!branch) throw Errors.notFound('Branch');

  const now = new Date();

  const [
    branchServices,
    branchProducts,
    branchPaymentModes,
    branchCategories,
    branchOffers,
    branchStaff,
  ] = await Promise.all([
    // Services assigned via BranchService
    db.branchService.findMany({
      where: { branchId },
      include: {
        service: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    }),

    // Products assigned via BranchProduct
    db.branchProduct.findMany({
      where: { branchId },
      include: {
        product: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    }),

    // Payment modes assigned via BranchPaymentMode
    db.branchPaymentMode.findMany({
      where: { branchId },
      include: { paymentMode: true },
    }),

    // Service categories assigned via BranchCategory
    db.branchCategory.findMany({
      where: { branchId },
      include: { category: true },
    }),

    // Marketing offers/packages assigned to this branch (active + upcoming)
    db.marketingOfferBranch.findMany({
      where: { branchId },
      include: {
        offer: {
          include: {
            items: {
              include: {
                service: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    }),

    // Staff members assigned to this branch
    db.staff.findMany({
      where: { branchId, status: 'active' },
      include: { role: { select: { key: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return ok({
    branch: { id: branch.id, name: branch.name, code: branch.code },
    fetchedAt: now.toISOString(),

    services: branchServices.map((bs) => ({
      id: bs.service.id,
      name: bs.service.name,
      categoryId: bs.service.categoryId,
      categoryName: bs.service.category?.name ?? null,
      minPrice: bs.service.minPrice,
      maxPrice: bs.service.maxPrice,
      taxPercent: bs.service.taxPercent,
      hasMeasurements: bs.service.hasMeasurements,
      hasComplementary: bs.service.hasComplementary,
      isActive: bs.service.isActive,
    })),

    products: branchProducts.map((bp) => ({
      id: bp.product.id,
      name: bp.product.name,
      sku: bp.product.sku,
      brand: bp.product.brand,
      uom: bp.product.uom,
      categoryId: bp.product.categoryId,
      categoryName: bp.product.category?.name ?? null,
      salePrice: bp.product.salePrice,
      mrp: bp.product.mrp,
      reorderLevel: bp.product.reorderLevel,
      trackBatches: bp.product.trackBatches,
      trackExpiry: bp.product.trackExpiry,
      isActive: bp.product.isActive,
      imageUrl: bp.product.imageUrl,
    })),

    paymentModes: branchPaymentModes.map((bpm) => ({
      id: bpm.paymentMode.id,
      name: bpm.paymentMode.name,
      isActive: bpm.paymentMode.isActive,
    })),

    categories: branchCategories.map((bc) => ({
      id: bc.category.id,
      name: bc.category.name,
      description: (bc.category as { description?: string | null }).description ?? null,
      isActive: bc.category.isActive,
    })),

    offers: branchOffers.map((bo) => ({
      id: bo.offer.id,
      packageName: bo.offer.packageName,
      packageCode: bo.offer.packageCode,
      fromDate: bo.offer.fromDate.toISOString(),
      toDate: bo.offer.toDate.toISOString(),
      minAmount: bo.offer.minAmount,
      maxAmount: bo.offer.maxAmount,
      remarks: bo.offer.remarks,
      frontImageUrl: bo.offer.frontImageUrl,
      isActive: bo.offer.isActive,
      isCurrentlyActive:
        bo.offer.isActive &&
        bo.offer.fromDate <= now &&
        bo.offer.toDate >= now,
      items: bo.offer.items.map((item) => ({
        id: item.id,
        serviceName: item.service.name,
        categoryName: item.category.name,
        quantity: item.quantity,
      })),
    })),

    staff: branchStaff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role.name,
      roleKey: s.role.key,
      avatarUrl: s.avatarUrl,
      status: s.status,
    })),

    summary: {
      totalServices: branchServices.length,
      totalProducts: branchProducts.length,
      totalPaymentModes: branchPaymentModes.length,
      totalCategories: branchCategories.length,
      totalOffers: branchOffers.length,
      totalStaff: branchStaff.length,
      totalAssigned:
        branchServices.length +
        branchProducts.length +
        branchPaymentModes.length +
        branchCategories.length +
        branchOffers.length,
    },
  });
});
