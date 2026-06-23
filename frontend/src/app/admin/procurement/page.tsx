'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function ProcurementIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/procurement/rfq');
  }, [router]);
  return (
    <div style={{ textAlign: 'center', paddingTop: 80 }}>
      <Spin size="large" />
    </div>
  );
}
