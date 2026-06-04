'use client';

import { useParams } from 'next/navigation';
import { Card } from 'antd';
import ModulePageHeader from '@/components/admin-customers/ModulePageHeader';
import FollowUpsTab from '@/components/admin-customers/FollowUpsTab';

/** Follow-Ups sub-page for a customer. */
export default function CustomerFollowUpsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="Follow-Ups" />
      <Card>
        <FollowUpsTab customerId={id} />
      </Card>
    </div>
  );
}
