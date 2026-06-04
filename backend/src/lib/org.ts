import { db } from '@/lib/db';
import { Errors } from '@/lib/api/errors';

/**
 * Resolve the single Organization id. The admin/branch JWTs don't carry an
 * orgId (single-tenant), so transactional documents that need org-scoped
 * counters / uniqueness resolve it at request time.
 */
export async function resolveOrgId(): Promise<string> {
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw Errors.notFound('Organization');
  return org.id;
}
