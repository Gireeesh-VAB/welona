'use client';

import { Card, Col, Empty, Row, Table, Typography } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDashboard, type DashboardData } from '@/hooks/useDashboard';
import StatCard from '@/components/dashboard/StatCard';
import CollectionPanel from '@/components/dashboard/CollectionPanel';
import { formatDate, formatMoney, titleCase } from '@/lib/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Friendly label for a payment method code. */
function methodLabel(method: string): string {
  return method === 'upi' ? 'UPI' : titleCase(method);
}

/** Format an ISO timestamp as a short time, e.g. "02:30 PM". */
function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

type FollowUpDue = DashboardData['followupsDue'][number];
type TreatmentRow = DashboardData['treatmentBreakdown'][number];

/** Operations dashboard — today's activity, collections and follow-ups. */
export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  const kpis = data?.kpis;

  const treatments = data?.treatmentBreakdown ?? [];
  const treatmentTotal = treatments.reduce((s, t) => s + t.enquiries, 0);

  const treatmentColumns: ColumnsType<TreatmentRow> = [
    { title: 'Treatment', dataIndex: 'name' },
    {
      title: 'Enquiries',
      dataIndex: 'enquiries',
      align: 'right',
      width: 110,
    },
  ];

  const followupColumns: ColumnsType<FollowUpDue> = [
    { title: 'Customer', dataIndex: 'contactName' },
    {
      title: 'Discussion / Note',
      dataIndex: 'note',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Due',
      dataIndex: 'dueAt',
      width: 120,
      render: (v: string | null) => formatTime(v),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Dashboard
      </Title>
      <Text style={{ color: colors.text.secondary }}>
        Today&apos;s activity and collections at a glance.
      </Text>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<TeamOutlined />}
            label="Today's Enquiries"
            value={kpis?.todayEnquiries ?? 0}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<CalendarOutlined />}
            label="Today's Walk-ins"
            value={kpis?.todayWalkIns ?? 0}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<WalletOutlined />}
            label="This Month's Collection"
            value={formatMoney(kpis?.monthCollection ?? 0)}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<ClockCircleOutlined />}
            label="Follow-ups Due Today"
            value={kpis?.todayFollowupsDue ?? 0}
            loading={isLoading}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <CollectionPanel
            title="Today's Collection"
            loading={isLoading}
            rows={(data?.todayCollection.items ?? []).map((i) => ({
              label: methodLabel(i.method),
              amount: i.amount,
            }))}
            total={data?.todayCollection.total ?? 0}
            emptyText="No collections today"
          />
        </Col>
        <Col xs={24} lg={8}>
          <CollectionPanel
            title="This Month's Collection"
            subtitle={data ? `from ${formatDate(data.monthCollection.fromDate)}` : undefined}
            loading={isLoading}
            rows={(data?.monthCollection.items ?? []).map((i) => ({
              label: methodLabel(i.method),
              amount: i.amount,
            }))}
            total={data?.monthCollection.total ?? 0}
            emptyText="No collections this month"
          />
        </Col>
        <Col xs={24} lg={8}>
          <CollectionPanel
            title="Employee Collection (Today)"
            loading={isLoading}
            rows={(data?.employeeCollection ?? []).map((e) => ({
              label: e.name,
              amount: e.amount,
            }))}
            total={(data?.employeeCollection ?? []).reduce((s, e) => s + e.amount, 0)}
            emptyText="No collections today"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={9}>
          <Card title="Enquiries by Treatment" extra={<Text type="secondary">This month</Text>}>
            <Table<TreatmentRow>
              rowKey="name"
              size="small"
              loading={isLoading}
              columns={treatmentColumns}
              dataSource={treatments}
              pagination={false}
              locale={{ emptyText: <Empty description="No enquiries this month" /> }}
              summary={() =>
                treatments.length > 0 ? (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: colors.gold.primary }}>
                        {treatmentTotal}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                ) : null
              }
            />
          </Card>
        </Col>
        <Col xs={24} xl={15}>
          <Card title="Follow-ups Due Today">
            <Table<FollowUpDue>
              rowKey="id"
              size="small"
              loading={isLoading}
              columns={followupColumns}
              dataSource={data?.followupsDue ?? []}
              pagination={false}
              locale={{ emptyText: <Empty description="No pending follow-ups today" /> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
