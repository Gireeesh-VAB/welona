'use client';

import { useParams } from 'next/navigation';
import { Card } from 'antd';
import ModulePageHeader from '@/components/customers/ModulePageHeader';
import BookingsTab from '@/components/customers/BookingsTab';

/** Bookings sub-page for a customer. */
export default function CustomerBookingsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <ModulePageHeader customerId={id} title="Bookings" />
      <Card>
        <BookingsTab customerId={id} />
      </Card>
    </div>
  );
}
