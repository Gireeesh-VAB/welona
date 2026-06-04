import { db } from '@/lib/db';
import { route } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { Errors } from '@/lib/api/errors';
import { requireAdminOrBranchAuth } from '@/lib/auth/service';
import { resolveOrgId } from '@/lib/org';
import { formatMoney, titleCase } from '@shared/format';

type Ctx = { params: { id: string } };

interface HistoryEvent {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  /** Display date — when the event occurred. */
  at: string;
  /** Sort key — when the record was logged; newest stays on top. */
  sortAt: string;
}

/**
 * GET /api/v1/admin/customers/[id]/history — the customer's activity timeline.
 * A read-only feed aggregated from every customer touchpoint (enquiries,
 * bookings, follow-ups, orders, invoices, packages, offers, prescriptions,
 * reports, feedback and documents), newest first.
 */
export const GET = route<Ctx>(async (req, { params }) => {
  const { branchScope } = requireAdminOrBranchAuth(req);
  const orgId = await resolveOrgId();

  const customer = await db.customer.findFirst({
    where: { id: params.id, orgId, ...(branchScope && { branchId: branchScope }) },
  });
  if (!customer) throw Errors.notFound('Customer');

  const where = { customerId: params.id };
  const [
    leads,
    followUps,
    quotations,
    orders,
    invoices,
    bookings,
    packages,
    offers,
    prescriptions,
    reports,
    feedback,
    documents,
  ] = await Promise.all([
    db.lead.findMany({ where }),
    db.followUp.findMany({
      where: { OR: [{ customerId: params.id }, { lead: { customerId: params.id } }] },
    }),
    db.quotation.findMany({ where }),
    db.salesOrder.findMany({ where }),
    db.invoice.findMany({ where }),
    db.booking.findMany({ where }),
    db.package.findMany({ where }),
    db.offer.findMany({ where }),
    db.prescription.findMany({ where }),
    db.medicalReport.findMany({ where }),
    db.feedback.findMany({ where }),
    db.document.findMany({ where }),
  ]);

  const events: HistoryEvent[] = [
    {
      id: `customer-${customer.id}`,
      type: 'customer',
      title: 'Customer profile created',
      detail: null,
      at: customer.createdAt.toISOString(),
      sortAt: customer.createdAt.toISOString(),
    },
    ...leads.map((l) => ({
      id: `lead-${l.id}`,
      type: 'enquiry',
      title: 'Enquiry registered',
      detail: `Status: ${titleCase(l.status)}`,
      at: l.createdAt.toISOString(),
      sortAt: l.createdAt.toISOString(),
    })),
    ...followUps.map((f) => ({
      id: `followup-${f.id}`,
      type: 'followup',
      title: 'Follow-up logged',
      detail: f.note ?? f.remarks ?? (f.outcome ? titleCase(f.outcome) : null),
      at: (f.contactedAt ?? f.createdAt).toISOString(),
      sortAt: f.createdAt.toISOString(),
    })),
    ...quotations.map((q) => ({
      id: `quotation-${q.id}`,
      type: 'quotation',
      title: `Quotation ${q.number}`,
      detail: `${formatMoney(q.total)} · ${titleCase(q.status)}`,
      at: q.createdAt.toISOString(),
      sortAt: q.createdAt.toISOString(),
    })),
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      type: 'order',
      title: `Order ${o.number}`,
      detail: `${formatMoney(o.total)} · ${titleCase(o.status)}`,
      at: o.createdAt.toISOString(),
      sortAt: o.createdAt.toISOString(),
    })),
    ...invoices.map((i) => ({
      id: `invoice-${i.id}`,
      type: 'invoice',
      title: `Invoice ${i.number}`,
      detail: `${formatMoney(i.total)} · ${titleCase(i.status)}`,
      at: i.createdAt.toISOString(),
      sortAt: i.createdAt.toISOString(),
    })),
    ...bookings.map((b) => ({
      id: `booking-${b.id}`,
      type: 'booking',
      title: `Booking — ${b.serviceName}`,
      detail: titleCase(b.status),
      at: b.scheduledAt.toISOString(),
      sortAt: b.createdAt.toISOString(),
    })),
    ...packages.map((p) => ({
      id: `package-${p.id}`,
      type: 'package',
      title: `Package — ${p.name}`,
      detail: `${p.usedSessions}/${p.totalSessions} sessions`,
      at: p.purchasedAt.toISOString(),
      sortAt: p.createdAt.toISOString(),
    })),
    ...offers.map((o) => ({
      id: `offer-${o.id}`,
      type: 'offer',
      title: `Offer — ${o.title}`,
      detail: titleCase(o.status),
      at: o.createdAt.toISOString(),
      sortAt: o.createdAt.toISOString(),
    })),
    ...prescriptions.map((p) => ({
      id: `prescription-${p.id}`,
      type: 'prescription',
      title: 'Prescription issued',
      detail: p.diagnosis,
      at: p.issuedAt.toISOString(),
      sortAt: p.createdAt.toISOString(),
    })),
    ...reports.map((r) => ({
      id: `report-${r.id}`,
      type: 'report',
      title: `Medical report — ${r.title}`,
      detail: r.reportType,
      at: r.reportedAt.toISOString(),
      sortAt: r.createdAt.toISOString(),
    })),
    ...feedback.map((f) => ({
      id: `feedback-${f.id}`,
      type: 'feedback',
      title: `Feedback — ${f.rating}/5`,
      detail: f.comment,
      at: f.createdAt.toISOString(),
      sortAt: f.createdAt.toISOString(),
    })),
    ...documents.map((d) => ({
      id: `document-${d.id}`,
      type: 'document',
      title: `Document — ${d.title}`,
      detail: d.docType,
      at: d.uploadedAt.toISOString(),
      sortAt: d.createdAt.toISOString(),
    })),
  ];

  // Newest-recorded first — the latest entry always stays on top.
  events.sort((a, b) => b.sortAt.localeCompare(a.sortAt));
  return ok(events);
});
