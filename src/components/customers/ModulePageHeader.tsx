'use client';

import { useRouter } from 'next/navigation';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useCustomer } from '@/hooks/useSales';

const { Title, Text } = Typography;

interface ModulePageHeaderProps {
  customerId: string;
  /** The module name, e.g. "Bookings". */
  title: string;
}

/** Shared header for a customer module sub-page — back link + context. */
export default function ModulePageHeader({ customerId, title }: ModulePageHeaderProps) {
  const router = useRouter();
  const { data: customer } = useCustomer(customerId);

  return (
    <div style={{ marginBottom: 16 }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push(`/customers/${customerId}`)}
        style={{ paddingLeft: 0 }}
      >
        Back to profile
      </Button>
      <Title level={3} style={{ margin: 0 }}>
        {title}
      </Title>
      {customer && <Text type="secondary">{customer.name}</Text>}
    </div>
  );
}
