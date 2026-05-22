'use client';

import { Spin } from 'antd';
import { useParams } from 'next/navigation';
import { useAdminCategory } from '@/hooks/useAdminCategories';
import CategoryForm from '@/components/admin/CategoryForm';
import { useBrandColors } from '@/hooks/useBrandColors';

export default function AdminCategoryEditPage() {
  const params = useParams<{ id: string }>();
  const colors = useBrandColors();
  const { data, isLoading, isError } = useAdminCategory(params.id);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div style={{ padding: 24, color: colors.status.error }}>
        Could not load category {params.id}.
      </div>
    );
  }
  return <CategoryForm mode="edit" initial={data} />;
}
