export interface AdminEmployeeDocument {
  id: string;
  employeeId: string;
  title: string;
  docType: string | null;
  fileUrl: string;
  notes: string | null;
  uploadedAt: string;
}
