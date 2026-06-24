import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { route, parseBody } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminAuth } from '@/lib/auth/service';
import { adminGoodsReceiptUpdateSchema } from '@shared/schemas/admin-purchase-orders';
import {
  toAdminGoodsReceipt,
  type GoodsReceiptWithRelations,
} from '@/lib/admin-purchase-order-mapper';

const goodsReceiptInclude = {
  branch: true,
  supplier: true,
  po: true,
  createdByAdmin: true,
  items: { include: { product: true } },
} satisfies Prisma.GoodsReceiptInclude;

interface RouteContext {
  params: { id: string };
}

export const PATCH = route<RouteContext>(async (req, { params }) => {
  requireAdminAuth(req);
  const body = await parseBody(req, adminGoodsReceiptUpdateSchema);

  const existing = await db.goodsReceipt.findUnique({ where: { id: params.id } });
  if (!existing) throw Errors.notFound('Goods receipt');

  const grn = await db.goodsReceipt.update({
    where: { id: params.id },
    data: {
      ...(body.invoiceNumber !== undefined && { invoiceNumber: body.invoiceNumber }),
      ...(body.invoiceDate !== undefined && {
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
      }),
      ...(body.invoiceAmount !== undefined && { invoiceAmount: body.invoiceAmount }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: goodsReceiptInclude,
  });

  return ok(toAdminGoodsReceipt(grn as GoodsReceiptWithRelations));
});
