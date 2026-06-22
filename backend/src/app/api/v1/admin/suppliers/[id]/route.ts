import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminSupplierUpdateSchema, supplierProductMappingSchema } from '@shared/schemas/admin-suppliers';
import { z } from 'zod';
import { toAdminSupplier } from '@/lib/admin-supplier-mapper';
import {
  toAdminPurchaseOrder,
  purchaseOrderInclude,
  type PurchaseOrderWithRelations,
} from '@/lib/admin-purchase-order-mapper';
import { recordAudit, actorFromClaims } from '@/lib/audit';

interface RouteContext {
  params: { id: string };
}

const supplierUpdateWithProductsSchema = adminSupplierUpdateSchema.extend({
  products: z.array(supplierProductMappingSchema).optional(),
});

export const GET = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const supplier = await db.supplier.findUnique({
    where: { id: params.id },
    include: {
      createdByAdmin: true,
      _count: { select: { supplierProducts: true } },
      supplierProducts: {
        include: {
          product: { select: { id: true, name: true, sku: true, uom: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      purchaseOrders: {
        include: purchaseOrderInclude,
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
  if (!supplier) throw Errors.notFound('Supplier');
  return ok({
    ...toAdminSupplier(supplier),
    products: supplier.supplierProducts.map((sp) => ({
      id: sp.id,
      productId: sp.productId,
      productName: sp.product.name,
      productSku: sp.product.sku,
      productUom: sp.product.uom,
      unitPrice: sp.unitPrice,
      leadTimeDays: sp.leadTimeDays,
      moq: sp.moq,
      notes: sp.notes,
      isActive: sp.isActive,
    })),
    purchaseOrders: supplier.purchaseOrders.map(
      (po) => toAdminPurchaseOrder(po as PurchaseOrderWithRelations),
    ),
  });
});

export const PUT = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  const body = await parseBody(req, supplierUpdateWithProductsSchema);

  try {
    const row = await db.$transaction(async (tx) => {
      const supplier = await tx.supplier.update({
        where: { id: params.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.code !== undefined && { code: body.code }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson ?? null }),
          ...(body.phone !== undefined && { phone: body.phone ?? null }),
          ...(body.email !== undefined && { email: body.email ?? null }),
          ...(body.gstin !== undefined && { gstin: body.gstin ?? null }),
          ...(body.address !== undefined && { address: body.address ?? null }),
          ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms ?? null }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        include: {
          createdByAdmin: true,
          _count: { select: { supplierProducts: true } },
        },
      });

      if (body.products !== undefined) {
        await tx.supplierProduct.deleteMany({ where: { supplierId: params.id } });
        if (body.products.length > 0) {
          await tx.supplierProduct.createMany({
            data: body.products.map((p) => ({
              supplierId: params.id,
              productId: p.productId,
              unitPrice: p.unitPrice ?? null,
              leadTimeDays: p.leadTimeDays ?? null,
              moq: p.moq ?? null,
              notes: p.notes ?? null,
              isActive: p.isActive,
            })),
          });
        }
      }

      return supplier;
    });

    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'update',
      entity: 'supplier',
      entityId: row.id,
      summary: `Updated supplier ${row.name} (${row.code})`,
    });
    return ok(toAdminSupplier(row));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Supplier');
      if (error.code === 'P2002') {
        throw Errors.conflict('A supplier with this code already exists.');
      }
    }
    throw error;
  }
});

export const DELETE = route<RouteContext>(async (req, { params }) => {
  const claims = requireAdminAuth(req);
  try {
    await db.supplier.delete({ where: { id: params.id } });
    await recordAudit({
      actor: actorFromClaims(claims),
      action: 'delete',
      entity: 'supplier',
      entityId: params.id,
      summary: `Deleted supplier ${params.id}`,
    });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw Errors.notFound('Supplier');
      if (error.code === 'P2003') {
        throw Errors.conflict(
          'This supplier is linked to purchase orders or receipts and cannot be deleted. Mark it inactive instead.',
        );
      }
    }
    throw error;
  }
});
