'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
// Branch-side indent creation (branchId inferred from auth claims on backend)
type BranchIndentInput = {
  items: { productId: string; requestedQty: number }[];
  reason?: string;
  notes?: string;
};

export function useRaiseIndent() {
  return useMutation({
    mutationFn: (body: BranchIndentInput) =>
      api.post<{ id: string; status: string; createdAt: string }>('/indents', body),
  });
}
