import { db } from '@/lib/db';
import { Errors } from '@/lib/api/errors';

/**
 * Validate a proposed `parentBranchId` for a branch.
 *
 * - The parent must exist.
 * - A branch may not be its own parent.
 * - The parent may not be one of the branch's own descendants (which would
 *   create a cycle). On create, `branchId` is null so no cycle is possible.
 *
 * Throws a 400 on any violation. A null/undefined `parentBranchId` is a no-op
 * (top-level branch).
 */
export async function assertValidParent(
  branchId: string | null,
  parentBranchId: string | null | undefined,
): Promise<void> {
  if (!parentBranchId) return;

  if (branchId && parentBranchId === branchId) {
    throw Errors.badRequest('A branch cannot be its own parent.');
  }

  // Walk up the proposed parent's ancestry. If we reach `branchId`, the parent
  // sits below the branch and assigning it would create a cycle.
  let cursor: string | null = parentBranchId;
  const seen = new Set<string>();
  while (cursor) {
    if (seen.has(cursor)) break; // defensive: existing data already cyclic
    seen.add(cursor);

    const node: { id: string; parentBranchId: string | null } | null =
      await db.branch.findUnique({
        where: { id: cursor },
        select: { id: true, parentBranchId: true },
      });
    if (!node) {
      throw Errors.badRequest('Selected parent branch no longer exists.');
    }
    if (branchId && node.id === branchId) {
      throw Errors.badRequest('That parent would create a cycle in the branch hierarchy.');
    }
    cursor = node.parentBranchId;
  }
}
