'use client';

import AdminPlaceholder from '@/components/admin/AdminPlaceholder';
import { getAdminNavItem } from '@/config/adminNavigation';

interface Props {
  navKey: string;
}

/** Tiny wrapper used by every leaf report page. */
export default function ReportPlaceholder({ navKey }: Props) {
  const item = getAdminNavItem(navKey);
  if (!item) return null;
  return <AdminPlaceholder title={item.label} description={item.description} />;
}
