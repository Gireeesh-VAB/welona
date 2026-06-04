'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminEmployeeDocument } from '@shared/types/admin-employee-document';
import type { AdminEmployeeDocumentCreateInput } from '@shared/schemas/admin-employee-documents';

const KEY = 'admin-employee-documents';

export function useEmployeeDocuments(employeeId: string | null) {
  return useQuery<AdminEmployeeDocument[]>({
    queryKey: [KEY, employeeId],
    enabled: Boolean(employeeId),
    queryFn: () => api.get<AdminEmployeeDocument[]>(`/admin/employees/${employeeId}/documents`),
  });
}

export function useUploadEmployeeDocument(employeeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminEmployeeDocumentCreateInput) =>
      api.post<AdminEmployeeDocument>(`/admin/employees/${employeeId}/documents`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, employeeId] }),
  });
}

export function useDeleteEmployeeDocument(employeeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.delete(`/admin/employees/${employeeId}/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, employeeId] }),
  });
}
