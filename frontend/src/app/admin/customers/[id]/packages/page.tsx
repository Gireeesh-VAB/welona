'use client';

import { useParams } from 'next/navigation';
import { Card } from 'antd';
import ModulePageHeader from '@/components/admin-customers/ModulePageHeader';
import PackagesTab from '@/components/admin-customers/PackagesTab';

/** Packages sub-page for a customer. */
export default function CustomerPackagesPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="Packages" />
      <Card>
        <PackagesTab customerId={id} />
      </Card>
    </div>
  );
}
