'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Col, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { ArrowRightOutlined, DollarOutlined, FileTextOutlined, WalletOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useInvoices } from '@/hooks/useSales';
import { usePendingPayments } from '@/hooks/useSales';
import { formatDate, formatMoney } from '@shared/format';
import type { PendingPayment } from '@shared/types/sales';
import StatusTag from '@/components/sales/StatusTag';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

export default function FinancePage() {
  const router = useRouter();
  const { data: invoiceData, isLoading: invLoading } = useInvoices({ page: 1, limit: 10, status: 'issued' });
  const { data: pendingData, isLoading: pendingLoading } = usePendingPayments();

  const invoices = invoiceData?.items ?? [];
  const pending = pendingData?.invoices ?? [];
  const summary = pendingData?.summary;

  const pendingColumns: ColumnsType<PendingPayment> = [
    { title: 'Invoice', dataIndex: 'number', render: (v) => <Text style={{ color: colors.gold.primary }}>{v}</Text> },
    { title: 'Customer', dataIndex: 'customerName' },
    { title: 'Total', dataIndex: 'total', align: 'right', render: (v) => formatMoney(v) },
    { title: 'Outstanding', dataIndex: 'outstanding', align: 'right', render: (v) => <Text strong style={{ color: '#ef4444' }}>{formatMoney(v)}</Text> },
    { title: 'Due', dataIndex: 'dueAt', render: (v) => v ? formatDate(v) : '—' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>Finance</Title>
          <Text style={{ color: colors.text.placeholder }}>Invoices, outstanding balances and payment overview.</Text>
        </div>
        <Space>
          <Button onClick={() => router.push('/pending-payments')} icon={<ArrowRightOutlined />}>View All Pending</Button>
          <Button type="primary" onClick={() => router.push('/sales/invoices')} icon={<FileTextOutlined />}>All Invoices</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Total Outstanding</Text>}
              value={formatMoney(summary?.totalOutstanding ?? 0)}
              valueStyle={{ color: '#ef4444' }}
              prefix={<WalletOutlined style={{ color: '#ef4444' }} />}
              loading={pendingLoading} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Pending Invoices</Text>}
              value={summary?.count ?? 0}
              prefix={<FileTextOutlined style={{ color: colors.status?.warning ?? '#facc15' }} />}
              valueStyle={{ color: colors.text.primary }}
              loading={pendingLoading} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Total Invoices (Page)</Text>}
              value={invoiceData?.meta.total ?? 0}
              prefix={<DollarOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary }}
              loading={invLoading} />
          </Card>
        </Col>
      </Row>

      <Card title={<Text strong style={{ color: colors.text.primary }}>Pending Payments</Text>}
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }}
        extra={<Button size="small" type="link" onClick={() => router.push('/pending-payments')}>View all</Button>}>
        <Spin spinning={pendingLoading}>
          <Table rowKey="id" dataSource={pending.slice(0, 8)} columns={pendingColumns} size="small" pagination={false} />
        </Spin>
      </Card>
    </div>
  );
}
