'use client';

import { Card, Tag, Typography } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Title, Text } = Typography;

interface AdminPlaceholderProps {
  title: string;
  description: string;
}

/** Lightweight stub for admin modules that have a sidebar entry but no UI yet. */
export default function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  const colors = useBrandColors();
  return (
    <div>
      <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
        {title}
      </Title>
      <Text style={{ color: colors.text.placeholder }}>{description}</Text>

      <Card
        style={{
          marginTop: 24,
          background: colors.black.secondary,
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}
        styles={{ body: { padding: 48 } }}
      >
        <ToolOutlined style={{ fontSize: 40, color: colors.gold.primary, marginBottom: 12 }} />
        <div>
          <Tag color="gold" style={{ marginBottom: 8 }}>
            COMING SOON
          </Tag>
        </div>
        <Text style={{ color: colors.text.secondary }}>
          The {title} module is part of the admin console and is not built out yet.
        </Text>
      </Card>
    </div>
  );
}
