'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Row, Select, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useInventoryAlerts } from '@/hooks/useInventoryAlerts';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import {} from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { ExpiryAlertRow, OverduePurchaseOrder, StockAlertRow } from '@shared/types/admin-inventory-alert';

const { Title, Text } = Typography;

export default function AdminInventoryAlertsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-alerts')!;


  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: true });
  const branchOptions = useMemo(
    () => [
      { value: '', label: 'All branches' },
      ...(branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    ],
    [branchesData],
  );

  const [branchId, setBranchId] = useState('');
  useEffect(() => {
  }, []);
  const { data, isLoading } = useInventoryAlerts({ branchId: branchId || undefined });

  const stockCols: ColumnsType<StockAlertRow> = [
    {
      title: 'Product',
      key: 'p',
      render: (_v, r) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{r.name}</div>
          <Text code style={{ fontSize: 11 }}>{r.sku}</Text>
        </div>
      ),
    },
    { title: 'Branch', dataIndex: 'branchName', width: 160 },
    { title: 'On hand', dataIndex: 'quantity', width: 90, align: 'right' },
    { title: 'Reorder level', dataIndex: 'reorderLevel', width: 120, align: 'right' },
  ];

  const poCols: ColumnsType<OverduePurchaseOrder> = [
    { title: 'PO', dataIndex: 'number', width: 120, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Supplier', dataIndex: 'supplierName' },
    { title: 'Branch', dataIndex: 'branchName', width: 160 },
    { title: 'Status', dataIndex: 'status', width: 150, render: (s: string) => <Tag color="gold">{s.replace('_', ' ')}</Tag> },
    {
      title: 'Overdue',
      dataIndex: 'daysOverdue',
      width: 120,
      align: 'right',
      render: (d: number) => <Text style={{ color: colors.status.error }}>{d} day{d === 1 ? '' : 's'}</Text>,
    },
  ];

  const expiryCols: ColumnsType<ExpiryAlertRow> = [
    {
      title: 'Product',
      key: 'p',
      render: (_v, r) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{r.name}</div>
          <Text code style={{ fontSize: 11 }}>{r.sku}</Text>
        </div>
      ),
    },
    { title: 'Batch', dataIndex: 'batchNo', width: 130, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Branch', dataIndex: 'branchName', width: 150 },
    { title: 'On hand', dataIndex: 'quantity', width: 90, align: 'right' },
    {
      title: 'Expiry',
      dataIndex: 'daysToExpiry',
      width: 130,
      align: 'right',
      render: (d: number) =>
        d < 0 ? (
          <Text style={{ color: colors.status.error }}>Expired {-d}d ago</Text>
        ) : (
          <Text style={{ color: colors.status.warning }}>in {d} day{d === 1 ? '' : 's'}</Text>
        ),
    },
  ];

  const counts = data?.counts;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
        <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
      </div>

        <div style={{ marginBottom: 16 }}>
          <Select
            showSearch
            value={branchId}
            onChange={setBranchId}
            options={branchOptions}
            style={{ width: 260 }}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
        </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { label: 'OUT OF STOCK', value: counts?.outOfStock ?? 0, color: colors.status.error },
          { label: 'LOW STOCK', value: counts?.lowStock ?? 0, color: colors.status.warning },
          { label: 'EXPIRED', value: counts?.expired ?? 0, color: colors.status.error },
          { label: 'NEAR EXPIRY', value: counts?.nearExpiry ?? 0, color: colors.status.warning },
          { label: 'OVERDUE POs', value: counts?.overduePurchaseOrders ?? 0, color: colors.gold.primary },
        ].map((k) => (
          <Col key={k.label} xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
              <Statistic title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>{k.label}</span>} value={k.value} valueStyle={{ color: k.color, fontWeight: 600 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Out of stock" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.outOfStock.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing out of stock" />
        ) : (
          <Table<StockAlertRow> rowKey={(r) => r.branchId + r.productId} loading={isLoading} columns={stockCols} dataSource={data?.outOfStock ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      <Card title="Low stock" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.lowStock.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No low-stock items" />
        ) : (
          <Table<StockAlertRow> rowKey={(r) => r.branchId + r.productId} loading={isLoading} columns={stockCols} dataSource={data?.lowStock ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      <Card title="Expired batches" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.expired.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expired stock" />
        ) : (
          <Table<ExpiryAlertRow> rowKey={(r) => r.productId + r.batchNo} loading={isLoading} columns={expiryCols} dataSource={data?.expired ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      <Card title="Near expiry" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.nearExpiry.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing expiring soon" />
        ) : (
          <Table<ExpiryAlertRow> rowKey={(r) => r.productId + r.batchNo} loading={isLoading} columns={expiryCols} dataSource={data?.nearExpiry ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      <Card title="Overdue purchase orders" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.overduePurchaseOrders.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No overdue purchase orders" />
        ) : (
          <Table<OverduePurchaseOrder> rowKey="id" loading={isLoading} columns={poCols} dataSource={data?.overduePurchaseOrders ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>
    </div>
  );
}
