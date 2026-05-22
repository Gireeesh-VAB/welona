'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Segmented } from 'antd';

const TABS = [
  { label: 'Dashboard', value: '/sales' },
  { label: 'Enquiries', value: '/sales/enquiries' },
  { label: 'Quotations', value: '/sales/quotations' },
  { label: 'Orders', value: '/sales/orders' },
  { label: 'Invoices', value: '/sales/invoices' },
];

/** Section navigation shown at the top of every Sales page. */
export default function SalesNav() {
  const router = useRouter();
  const pathname = usePathname();

  // Longest matching tab wins so /sales/leads stays on "Leads", not "Dashboard".
  const active =
    [...TABS]
      .sort((a, b) => b.value.length - a.value.length)
      .find((t) => pathname === t.value || pathname.startsWith(`${t.value}/`))?.value ?? '/sales';

  return (
    <Segmented
      options={TABS}
      value={active}
      onChange={(value) => router.push(String(value))}
      style={{ marginBottom: 16 }}
    />
  );
}
