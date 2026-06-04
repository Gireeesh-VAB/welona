'use client';

import { useParams } from 'next/navigation';
import { Card } from 'antd';
import ModulePageHeader from '@/components/admin-customers/ModulePageHeader';
import DocumentsTab from '@/components/admin-customers/DocumentsTab';

/** Client Documents sub-page for a customer. */
export default function CustomerDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="Client Documents" />
      <Card>
        <DocumentsTab customerId={id} />
      </Card>
    </div>
  );
}
