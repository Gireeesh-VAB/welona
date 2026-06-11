'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { StockIndentCreateInput } from '@shared/schemas/admin-indents';

export function useRaiseIndent() {
  return useMutation({
    mutationFn: (body: StockIndentCreateInput) =>
      api.post<{ id: string; status: string; createdAt: string }>('/indents', body),
  });
}
