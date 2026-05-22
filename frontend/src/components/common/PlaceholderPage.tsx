'use client';

import { Card, Tag, Typography } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { colors } from '@/theme/colors';

const { Title, Paragraph, Text } = Typography;

interface PlaceholderPageProps {
  title: string;
  description: string;
  /** Module ID from the reference architecture (e.g. "M03"). */
  moduleId?: string;
}

/**
 * Standard placeholder used by every module route until the real screens
 * (lists, forms, detail views) are implemented.
 */
export default function PlaceholderPage({ title, description, moduleId }: PlaceholderPageProps) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Title level={3} style={{ margin: 0 }}>
          {title}
        </Title>
        {moduleId && <Tag color={colors.gold.primary} style={{ color: colors.text.onGold }}>{moduleId}</Tag>}
      </div>

      <Paragraph style={{ color: colors.text.secondary }}>{description}</Paragraph>

      <div
        style={{
          marginTop: 32,
          padding: '48px 24px',
          textAlign: 'center',
          border: `1px dashed ${colors.border}`,
          borderRadius: 8,
          background: colors.black.primary,
        }}
      >
        <ToolOutlined style={{ fontSize: 40, color: colors.gold.primary }} />
        <Title level={4} style={{ marginTop: 16 }}>
          Module screens coming soon
        </Title>
        <Text style={{ color: colors.text.placeholder }}>
          This route is scaffolded and ready. Build the list, detail and form views here.
        </Text>
      </div>
    </Card>
  );
}
