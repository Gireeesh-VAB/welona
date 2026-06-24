'use client';

import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  AlertOutlined,
  DollarOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { useProcurementStats, usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useBrandColors } from '@/hooks/useBrandColors';
import type { AdminPurchaseOrder } from '@shared/types/admin-purchase-order';
import type { PurchaseOrderStatus } from '@shared/enums';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<PurchaseOrderStatus, string> = {
  draft: 'default', sent: 'blue', partially_received: 'gold', received: 'green', cancelled: 'red',
};
const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft', sent: 'Sent', partially_received: 'Partial', received: 'Received', cancelled: 'Cancelled',
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProcurementDashboardPage() {
  const router = useRouter();
  const colors = useBrandColors();
  const { data: stats, isLoading: statsLoading } = useProcurementStats();
  const { data: sentData, isLoading: posLoading } = usePurchaseOrders({ status: 'sent', limit: 10 });
  const { data: draftData } = usePurchaseOrders({ status: 'draft', limit: 5 });
  const { data: partialData } = usePurchaseOrders({ status: 'partially_received', limit: 5 });

  const recentPOs = [
    ...(sentData?.items ?? []),
    ...(partialData?.items ?? []),
    ...(draftData?.items ?? []),
  ].slice(0, 10);

  const poColumns: ColumnsType<AdminPurchaseOrder> = [
    {
      title: 'PO #', dataIndex: 'number', width: 140,
      render: (v: string, row) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }}
          onClick={() => router.push(`/admin/procurement/purchase-orders/${row.id}`)}>
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        </Button>
      ),
    },
    { title: 'Supplier', key: 's', render: (_v, r) => r.supplier.name },
    { title: 'Branch', key: 'b', render: (_v, r) => r.branch.name },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      render: (v: PurchaseOrderStatus) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Total', dataIndex: 'total', width: 120, align: 'right',
      render: (v: number) => <Text strong>{rupees(v)}</Text>,
    },
    {
      title: 'Expected', dataIndex: 'expectedAt', width: 110,
      render: (v: string | null) => formatDate(v),
    },
  ];

  const statCards = [
    {
      label: 'Total Suppliers', value: stats?.totalSuppliers ?? 0,
      icon: <TeamOutlined />, color: colors.text.primary,
      link: '/admin/procurement/suppliers',
    },
    {
      label: 'Open Purchase Orders', value: stats?.openPOs ?? 0,
      icon: <ShoppingCartOutlined />, color: stats?.openPOs ? colors.gold.primary : colors.text.primary,
      link: '/admin/procurement/purchase-orders',
    },
    {
      label: 'Pending Deliveries', value: stats?.pendingDeliveries ?? 0,
      icon: <TruckOutlined />, color: stats?.pendingDeliveries ? '#fa8c16' : colors.text.primary,
      link: '/admin/procurement/purchase-orders',
    },
    {
      label: 'Pending Bills', value: stats?.pendingBills ?? 0,
      icon: <FileTextOutlined />, color: stats?.pendingBills ? '#fa541c' : colors.text.primary,
      link: '/admin/procurement/supplier-bills',
    },
    {
      label: 'Pending Payments', value: stats?.pendingPayments ?? 0,
      icon: <AlertOutlined />, color: stats?.pendingPayments ? '#f5222d' : colors.text.primary,
      link: '/admin/procurement/supplier-payments',
    },
    {
      label: 'Total Purchase Value', value: null,
      icon: <DollarOutlined />, color: colors.gold.primary,
      link: null,
      formatted: stats ? rupees(stats.totalPurchaseValue) : '—',
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 40px' }}>
      <Title level={3} style={{ color: colors.text.primary, marginBottom: 24 }}>Procurement</Title>

      {statsLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
          {statCards.map((card) => (
            <Col xs={12} sm={8} md={4} key={card.label}>
              <Card
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.black.secondary,
                  cursor: card.link ? 'pointer' : 'default',
                }}
                bodyStyle={{ padding: '20px 16px' }}
                onClick={() => card.link && router.push(card.link)}
              >
                <Statistic
                  title={<Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{card.label}</Text>}
                  value={card.formatted ?? card.value ?? 0}
                  prefix={card.icon}
                  valueStyle={{ color: card.color, fontSize: 20 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card
        title={<Text strong style={{ color: colors.text.primary }}>Active Purchase Orders</Text>}
        style={{ border: `1px solid ${colors.border}`, background: colors.black.secondary }}
        bodyStyle={{ padding: 0 }}
        extra={
          <Button type="link" onClick={() => router.push('/admin/procurement/purchase-orders')}>
            View All
          </Button>
        }
      >
        <Table<AdminPurchaseOrder>
          rowKey="id"
          columns={poColumns}
          dataSource={recentPOs}
          loading={posLoading}
          pagination={false}
          size="middle"
          locale={{ emptyText: 'No active purchase orders' }}
        />
      </Card>
    </div>
  );
}
