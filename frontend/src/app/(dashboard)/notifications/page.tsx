'use client';

import { Card, Empty, List, Tag, Typography } from 'antd';
import { BellOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDashboard } from '@/hooks/useDashboard';
import { formatDate } from '@shared/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

export default function NotificationsPage() {
  const { data } = useDashboard();
  const followups = data?.followupsDue ?? [];

  return (
    <div>
      <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>Notifications</Title>
      <Text style={{ color: colors.text.placeholder, display: 'block', marginBottom: 16 }}>
        Today&apos;s follow-ups due and important reminders.
      </Text>

      <Card title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BellOutlined style={{ color: colors.gold.primary }} />
          <Text strong style={{ color: colors.text.primary }}>Follow-ups Due Today</Text>
          <Tag color="gold">{followups.length}</Tag>
        </div>
      } style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
        {followups.length === 0 ? (
          <Empty description={<Text style={{ color: colors.text.placeholder }}>No follow-ups due today</Text>}
            image={<CheckCircleOutlined style={{ fontSize: 40, color: '#22c55e' }} />} />
        ) : (
          <List
            dataSource={followups}
            renderItem={(f) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<CalendarOutlined style={{ fontSize: 18, color: colors.gold.primary, marginTop: 3 }} />}
                  title={<Text style={{ color: colors.text.primary }}>{f.contactName}</Text>}
                  description={
                    <div>
                      {f.note && <Text style={{ color: colors.text.placeholder, display: 'block', fontSize: 12 }}>{f.note}</Text>}
                      <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                        Due: {f.dueAt ? formatDate(f.dueAt) : 'Today'}
                        {f.assignedTo && ` · Assigned to ${f.assignedTo}`}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
