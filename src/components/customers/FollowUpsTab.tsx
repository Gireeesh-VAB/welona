'use client';

import { useCustomerFollowUps, useSalespeople } from '@/hooks/useSales';
import FollowUpTimeline from '@/components/sales/FollowUpTimeline';

/** Follow-Ups module — interaction timeline for a customer. */
export default function FollowUpsTab({ customerId }: { customerId: string }) {
  const { data: followUps } = useCustomerFollowUps(customerId);
  const { data: salespeople } = useSalespeople();

  return (
    <FollowUpTimeline
      items={followUps ?? []}
      staff={salespeople ?? []}
      emptyText="No follow-ups recorded for this customer"
    />
  );
}
