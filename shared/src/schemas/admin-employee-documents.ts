import { z } from 'zod';

export const adminEmployeeDocumentCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  docType: z.string().trim().max(60).optional().or(z.literal('').transform(() => undefined)),
  // Data URL (no upload backend) or an external URL.
  fileUrl: z.string().trim().min(1, 'A file or URL is required').max(3_000_000),
  notes: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
});

export type AdminEmployeeDocumentCreateInput = z.infer<typeof adminEmployeeDocumentCreateSchema>;
