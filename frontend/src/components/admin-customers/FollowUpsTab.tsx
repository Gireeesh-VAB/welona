'use client';

import { useAdminCustomerFollowUps } from '@/hooks/useAdminCustomers';
import { useAdminSalespeople } from '@/hooks/useAdminSales';
import FollowUpTimeline from '@/components/sales/FollowUpTimeline';

/** Follow-Ups module (admin) — interaction timeline for a customer. */
export default function FollowUpsTab({ customerId }: { customerId: string }) {
  const { data: followUps } = useAdminCustomerFollowUps(customerId);
  const { data: salespeople } = useAdminSalespeople();

  return (
    <FollowUpTimeline
      items={followUps ?? []}
      staff={salespeople ?? []}
      emptyText="No follow-ups recorded for this customer"
    />
  );
}
