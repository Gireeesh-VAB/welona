'use client';

import { useParams } from 'next/navigation';
import { Card } from 'antd';
import ModulePageHeader from '@/components/customers/ModulePageHeader';
import OffersTab from '@/components/customers/OffersTab';

/** Offers sub-page for a customer. */
export default function CustomerOffersPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="Offers" />
      <Card>
        <OffersTab customerId={id} />
      </Card>
    </div>
  );
}
