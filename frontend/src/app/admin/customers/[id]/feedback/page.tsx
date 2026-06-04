'use client';

import { useParams } from 'next/navigation';
import { Card } from 'antd';
import ModulePageHeader from '@/components/admin-customers/ModulePageHeader';
import FeedbackTab from '@/components/admin-customers/FeedbackTab';

/** Client Feedback sub-page for a customer. */
export default function CustomerFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="Client Feedback" />
      <Card>
        <FeedbackTab customerId={id} />
      </Card>
    </div>
  );
}
