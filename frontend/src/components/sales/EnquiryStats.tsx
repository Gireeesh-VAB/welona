'use client';

import { Card, Col, Row, Statistic, Spin, Tag } from 'antd';
import {
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useSalesDashboard } from '@/hooks/useSales';
import { colors } from '@/theme/colors';

export type EnquiryFilter = 'all' | 'today' | 'due-today' | 'done-today';

interface Props {
  activeFilter?: EnquiryFilter;
  onFilter?: (filter: EnquiryFilter) => void;
}

export default function EnquiryStats({ activeFilter, onFilter }: Props) {
  const { data, isLoading } = useSalesDashboard();

  if (isLoading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Spin />
      </div>
    );
  }

  const stats: Array<{ title: string; value: number; icon: React.ReactNode; color: string; filterKey: EnquiryFilter }> = [
    {
      title: 'Total Enquiries',
      value: data.kpis.totalLeads,
      icon: <TeamOutlined />,
      color: colors.status.info,
      filterKey: 'all',
    },
    {
      title: 'Today Enquiries',
      value: data.today.enquiries,
      icon: <PlusCircleOutlined />,
      color: colors.gold.primary,
      filterKey: 'today',
    },
    {
      title: 'Today Follow-ups Due',
      value: data.today.followupsDue,
      icon: <CalendarOutlined />,
      color: colors.status.warning,
      filterKey: 'due-today',
    },
    {
      title: 'Follow-ups Done Today',
      value: data.today.followupsDone,
      icon: <CheckCircleOutlined />,
      color: colors.status.success,
      filterKey: 'done-today',
    },
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {stats.map((s) => {
        const isActive = activeFilter === s.filterKey;
        const clickable = !!onFilter;
        return (
          <Col key={s.filterKey} xs={12} sm={12} md={6}>
            <Card
              size="small"
              onClick={() => onFilter?.(s.filterKey)}
              style={{
                borderTop: `3px solid ${s.color}`,
                cursor: clickable ? 'pointer' : 'default',
                background: isActive ? s.color + '18' : undefined,
                outline: isActive ? `2px solid ${s.color}` : undefined,
                outlineOffset: -2,
                transition: 'box-shadow 0.2s, background 0.2s',
                boxShadow: isActive ? `0 2px 8px ${s.color}44` : undefined,
                userSelect: 'none',
              }}
              styles={{ body: { padding: '12px 16px 10px' } }}
            >
              <Statistic
                title={
                  <span style={{ color: isActive ? s.color : undefined, fontWeight: isActive ? 600 : undefined }}>
                    {s.title}
                  </span>
                }
                value={s.value}
                prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                valueStyle={{ fontSize: 26, fontWeight: 700, color: isActive ? s.color : colors.text.primary }}
              />
              {clickable && (
                <div style={{ marginTop: 6 }}>
                  <Tag
                    icon={<UnorderedListOutlined />}
                    color={isActive ? s.color : undefined}
                    style={{
                      fontSize: 11,
                      cursor: 'pointer',
                      borderColor: s.color,
                      color: isActive ? '#fff' : s.color,
                      background: isActive ? s.color : 'transparent',
                    }}
                  >
                    {isActive ? 'Showing list' : 'View list'}
                  </Tag>
                </div>
              )}
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
