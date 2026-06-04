'use client';

import { Select } from 'antd';
import { useAdminSalespeople } from '@/hooks/useAdminSales';

interface Props {
  /** Currently assigned salesperson id. */
  value?: string;
  /** Called with the new salesperson id. */
  onAssign: (staffId: string) => void;
  loading?: boolean;
  size?: 'small' | 'middle';
}

/**
 * Inline salesperson selector — used to assign or reassign the owner of a
 * lead, quotation or order at any time.
 */
export default function OwnerAssign({ value, onAssign, loading, size = 'small' }: Props) {
  const { data } = useAdminSalespeople();
  return (
    <Select
      size={size}
      value={value}
      loading={loading}
      onChange={onAssign}
      showSearch
      optionFilterProp="label"
      style={{ minWidth: 190 }}
      options={(data ?? []).map((s) => ({ label: s.name, value: s.id }))}
    />
  );
}
