'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Calendar, Card, Col, Empty, List, Row, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { BadgeProps, CalendarProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useAppointments } from '@/hooks/useAppointments';
import { formatMoney, titleCase } from '@/lib/format';
import type { Appointment } from '@/types/customer-modules';

const { Title, Text } = Typography;

/** Booking status → Ant Badge status. */
const BADGE: Record<string, BadgeProps['status']> = {
  scheduled: 'processing',
  completed: 'success',
  cancelled: 'error',
  no_show: 'warning',
};

/** Service Appointments — a calendar of bookings; pick a day and book one. */
export default function ServiceAppointmentsPage() {
  const router = useRouter();
  const [value, setValue] = useState<Dayjs>(dayjs());

  const month = value.format('YYYY-MM');
  const { data: appointments, isLoading } = useAppointments(month);

  // Appointments grouped by calendar day.
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments ?? []) {
      const key = dayjs(a.scheduledAt).format('YYYY-MM-DD');
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const selectedKey = value.format('YYYY-MM-DD');
  const dayList = byDay.get(selectedKey) ?? [];

  const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
    if (info.type !== 'date') return info.originNode;
    const list = byDay.get(current.format('YYYY-MM-DD')) ?? [];
    if (list.length === 0) return null;
    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {list.slice(0, 2).map((a) => (
          <li
            key={a.id}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            <Badge
              status={BADGE[a.status] ?? 'default'}
              text={<span style={{ fontSize: 12 }}>{a.serviceName}</span>}
            />
          </li>
        ))}
        {list.length > 2 && (
          <li>
            <Text type="secondary" style={{ fontSize: 12 }}>
              +{list.length - 2} more
            </Text>
          </li>
        )}
      </ul>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Title level={3} style={{ marginTop: 0 }}>
            Service Appointments
          </Title>
          <Text type="secondary">Pick a date to view appointments, or book a new one.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/bookings/new')}>
          New Appointment
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card styles={{ body: { padding: 8 } }}>
            <Calendar
              value={value}
              onSelect={(d) => setValue(d)}
              onPanelChange={(d) => setValue(d)}
              cellRender={cellRender}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={value.format('ddd, DD MMM YYYY')}>
            <List
              loading={isLoading}
              dataSource={dayList}
              locale={{
                emptyText: (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No appointments" />
                ),
              }}
              renderItem={(a) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/bookings/${a.id}/receipt`)}
                >
                  <List.Item.Meta
                    title={
                      <span>
                        <Badge status={BADGE[a.status] ?? 'default'} />{' '}
                        {dayjs(a.scheduledAt).format('h:mm A')} · {a.serviceName}
                      </span>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {a.customerName} · {titleCase(a.status)}
                        {a.netAmount > 0 ? ` · ${formatMoney(a.netAmount)}` : ''}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
