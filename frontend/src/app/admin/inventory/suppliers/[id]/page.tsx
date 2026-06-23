'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSupplier } from '@/hooks/useSuppliers';
import { useBrandColors } from '@/hooks/useBrandColors';
import type { AdminPurchaseOrder } from '@shared/types/admin-purchase-order';
import type { PurchaseOrderStatus } from '@shared/enums';

const { Title, Text } = Typography;

const PO_STATUS_COLOR: Record<PurchaseOrderStatus, string> = {
  draft: 'default',
  sent: 'blue',
  partially_received: 'gold',
  received: 'green',
  cancelled: 'red',
};

const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_received: 'Partial',
  received: 'Received',
  cancelled: 'Cancelled',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const colors = useBrandColors();

  const { data: supplier, isLoading } = useSupplier(id ?? null);
  const pos: AdminPurchaseOrder[] = (supplier as any)?.purchaseOrders ?? [];

  const poStats = {
    total: pos.length,
    open: pos.filter((p) => p.status === 'draft' || p.status === 'sent' || p.status === 'partially_received').length,
    totalValue: pos.reduce((sum, p) => sum + p.total, 0),
  };

  const poColumns: ColumnsType<AdminPurchaseOrder> = [
    {
      title: 'PO Number',
      dataIndex: 'number',
      width: 130,
      render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Branch',
      dataIndex: ['branch', 'name'],
      width: 160,
      render: (v: string) => <Tag color={colors.gold.primary} style={{ color: colors.text.onGold, border: 'none', fontSize: 12 }}>{v}</Tag>,
    },
    {
      title: 'Ordered On',
      dataIndex: 'orderedAt',
      width: 130,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Expected',
      dataIndex: 'expectedAt',
      width: 130,
      render: (v: string | null) => formatDate(v),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 130,
      align: 'right',
      render: (v: number) => <Text strong>{formatMoney(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      render: (v: PurchaseOrderStatus) => (
        <Tag color={PO_STATUS_COLOR[v]}>{PO_STATUS_LABEL[v]}</Tag>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Text style={{ color: colors.text.placeholder }}>Loading supplier…</Text>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Text style={{ color: colors.text.placeholder }}>Supplier not found.</Text>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/admin/inventory/suppliers')}
          style={{ color: colors.text.placeholder }}
        />
        <div>
          <Title level={3} style={{ color: colors.text.primary, margin: 0 }}>
            {supplier.name}
          </Title>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
            Code: <Text code style={{ fontSize: 12 }}>{supplier.code}</Text>
            {' · '}
            <Badge
              status={supplier.isActive ? 'success' : 'default'}
              text={<Text style={{ fontSize: 12, color: colors.text.placeholder }}>{supplier.isActive ? 'Active' : 'Inactive'}</Text>}
            />
          </Text>
        </div>
      </div>

      {/* Profile card */}
      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 20 }}
        styles={{ body: { padding: 20 } }}
      >
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" labelStyle={{ color: colors.text.placeholder }}>
          <Descriptions.Item label="Contact Person">{supplier.contactPerson ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{supplier.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{supplier.email ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="GSTIN">{supplier.gstin ? <Text code>{supplier.gstin}</Text> : '—'}</Descriptions.Item>
          <Descriptions.Item label="Payment Terms">{supplier.paymentTerms ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Added On">{formatDate(supplier.createdAt)}</Descriptions.Item>
          {supplier.address && (
            <Descriptions.Item label="Address" span={3}>{supplier.address}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={8}>
          <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>TOTAL POs</span>}
              value={poStats.total}
              valueStyle={{ color: colors.gold.primary, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>OPEN POs</span>}
              value={poStats.open}
              valueStyle={{ color: poStats.open > 0 ? '#faad14' : colors.text.primary, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>TOTAL ORDERED</span>}
              value={poStats.totalValue / 100}
              prefix="₹"
              precision={2}
              valueStyle={{ color: colors.text.primary, fontWeight: 700, fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* PO History */}
      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Title level={5} style={{ color: colors.text.primary, marginTop: 0, marginBottom: 12 }}>
          Purchase Order History
        </Title>
        <Table<AdminPurchaseOrder>
          rowKey="id"
          columns={poColumns}
          dataSource={pos}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          size="middle"
          scroll={{ x: 800 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No purchase orders yet" /> }}
        />
      </Card>
    </div>
  );
}
