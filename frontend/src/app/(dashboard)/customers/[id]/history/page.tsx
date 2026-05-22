'use client';

import { useParams } from 'next/navigation';
import { Card } from 'antd';
import ModulePageHeader from '@/components/customers/ModulePageHeader';
import HistoryTab from '@/components/customers/HistoryTab';

/** Activity history sub-page for a customer. */
export default function CustomerHistoryPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="History" />
      <Card>
        <HistoryTab customerId={id} />
      </Card>
    </div>
  );
}
