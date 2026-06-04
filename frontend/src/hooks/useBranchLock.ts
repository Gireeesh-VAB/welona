import { useBranchAuthStore } from '@/store/branchAuthStore';
import { getSessionKind } from '@/lib/api-client';

/**
 * Branch-session lock helper for the admin panel.
 *
 * A branch (SystemUser) login lands in the shared /admin panel scoped to a
 * single branch. Pages that expose a "Branch" filter should pin it to the
 * session branch and disable the control. This hook centralises that check:
 *
 *   const { isBranchSession, lockedBranchId, lockedBranchName } = useBranchLock();
 *   const [branchId, setBranchId] = useState(lockedBranchId);
 *   <Select disabled={isBranchSession} allowClear={!isBranchSession} ... />
 *
 * For admin sessions everything is null/false, so call sites behave exactly as
 * before.
 */
export function useBranchLock() {
  const branch = useBranchAuthStore((s) => s.branch);
  const isBranchSession = getSessionKind() === 'branch';
  return {
    isBranchSession,
    lockedBranchId: isBranchSession ? branch?.branchId ?? undefined : undefined,
    lockedBranchName: isBranchSession ? branch?.branchName ?? null : null,
  };
}
