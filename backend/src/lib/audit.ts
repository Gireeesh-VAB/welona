import { db } from '@/lib/db';
import type { AdminAuthClaims, BranchAuthClaims, AuthClaims } from '@/lib/auth/jwt';

export interface AuditActor {
  actorType: 'admin' | 'branch' | 'staff' | 'system';
  actorId: string | null;
  actorName: string | null;
}

/** Derive a denormalised audit actor from auth claims. */
export function actorFromClaims(claims: AuthClaims): AuditActor {
  if (claims.type === 'admin') {
    const c = claims as AdminAuthClaims;
    return { actorType: 'admin', actorId: c.sub, actorName: c.name };
  }
  if (claims.type === 'branch') {
    const c = claims as BranchAuthClaims;
    return { actorType: 'branch', actorId: c.sub, actorName: c.userName };
  }
  return { actorType: 'staff', actorId: claims.sub, actorName: null };
}

/**
 * Append an audit-trail entry. Best-effort: a logging failure is swallowed so
 * it can never break the business operation it records.
 */
export async function recordAudit(input: {
  actor: AuditActor;
  action: string;
  entity: string;
  entityId?: string | null;
  summary?: string;
  branchId?: string | null;
  metadata?: unknown;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorName: input.actor.actorName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        branchId: input.branchId ?? null,
        metadata: input.metadata === undefined ? null : JSON.stringify(input.metadata),
      },
    });
  } catch (err) {
    console.error('[audit] failed to record entry:', err);
  }
}
