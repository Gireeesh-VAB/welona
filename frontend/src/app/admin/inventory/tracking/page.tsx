'use client';

import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  ShopOutlined,
  SyncOutlined,
  TruckOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useAdminIndents } from '@/hooks/useAdminIndents';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { StockIndent, StockIndentItem } from '@shared/types/stock-indent';

const { Title, Text } = Typography;

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

export default function TrackingPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-tracking');
  const { message } = App.useApp();

  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  const { data: dispatchedData, isLoading: dispLoading, refetch } = useAdminIndents({
    status: 'dispatched', branchId, page: 1, limit: 200,
  });
  const { data: recentReceivedData, isLoading: recLoading } = useAdminIndents({
    status: 'received', branchId, page: 1, limit: 50,
  });
  const { data: branchesData } = useAdminBranches({ limit: 200 });

  const inTransit = dispatchedData?.items ?? [];
  const recentReceived = recentReceivedData?.items ?? [];
  const branchOptions = (branchesData?.items ?? []).map((b) => ({ value: b.id, label: b.branchName }));
  const overdueCount = inTransit.filter((i) => isOverdue(i.expectedDeliveryAt)).length;

  const itemCols: ColumnsType<StockIndentItem> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontWeight: 600, color: colors.text.primary }}>{r.product.name}</Text>
          <Text style={{ fontSize: 11, color: colors.text.placeholder }}>{r.product.sku} · {r.product.uom}</Text>
        </Space>
      ),
    },
    {
      title: 'Dispatched Qty',
      dataIndex: 'fulfilledQty',
      align: 'center',
      width: 140,
      render: (v: number | null, r) => (
        <Tag color="gold" style={{ fontWeight: 600 }}>{v ?? r.requestedQty} {r.product.uom}</Tag>
      ),
    },
    {
      title: 'Approved Qty',
      dataIndex: 'approvedQty',
      align: 'center',
      width: 120,
      render: (v: number | null) => v ?? <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
  ];

  const inTransitCols: ColumnsType<StockIndent> = [
    {
      title: 'Indent #',
      dataIndex: 'number',
      width: 120,
      render: (v: string | null) => (
        <Text style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: colors.text.primary }}>{v ?? '—'}</Text>
      ),
    },
    {
      title: 'Destination',
      dataIndex: 'branchName',
      width: 180,
      render: (v: string) => (
        <Tag icon={<ShopOutlined />} color={colors.gold.primary} style={{ color: colors.text.onGold, border: 'none' }}>{v}</Tag>
      ),
    },
    {
      title: 'Vehicle No.',
      key: 'vehicle',
      width: 150,
      render: (_, row) => row.vehicleNumber ? (
        <Space size={6}>
          <CarOutlined style={{ color: colors.gold.primary }} />
          <Text strong style={{ color: colors.text.primary }}>{row.vehicleNumber}</Text>
        </Space>
      ) : <Text style={{ color: colors.text.placeholder }}>Not specified</Text>,
    },
    {
      title: 'Driver',
      key: 'driver',
      width: 200,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          {row.driverName && (
            <Space size={4}>
              <UserOutlined style={{ color: colors.text.placeholder, fontSize: 11 }} />
              <Text style={{ color: colors.text.primary }}>{row.driverName}</Text>
            </Space>
          )}
          {row.driverMobile && (
            <Space size={4}>
              <PhoneOutlined style={{ color: colors.text.placeholder, fontSize: 11 }} />
              <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.driverMobile}</Text>
            </Space>
          )}
          {!row.driverName && !row.driverMobile && <Text style={{ color: colors.text.placeholder }}>—</Text>}
        </Space>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      width: 70,
      align: 'center',
      render: (_, row) => <Badge count={row.items.length} color={colors.gold.primary} style={{ color: colors.text.onGold }} />,
    },
    {
      title: 'Dispatched On',
      dataIndex: 'dispatchedAt',
      width: 150,
      render: (v: string | null) => <Text style={{ fontSize: 12, color: colors.text.placeholder }}>{fmt(v)}</Text>,
    },
    {
      title: 'Expected Delivery',
      dataIndex: 'expectedDeliveryAt',
      width: 160,
      render: (v: string | null) => {
        if (!v) return <Text style={{ color: colors.text.placeholder }}>—</Text>;
        const overdue = isOverdue(v);
        return (
          <Space size={4}>
            <ClockCircleOutlined style={{ color: overdue ? '#ef4444' : '#22c55e', fontSize: 12 }} />
            <Text style={{ color: overdue ? '#ef4444' : '#22c55e', fontWeight: overdue ? 600 : 400 }}>
              {fmtDate(v)}{overdue ? ' (Overdue)' : ''}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      ellipsis: true,
      render: (v: string | null) => v
        ? <Text style={{ fontSize: 12, color: colors.text.placeholder }}>{v}</Text>
        : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
  ];

  const receivedCols: ColumnsType<StockIndent> = [
    {
      title: 'Indent #',
      dataIndex: 'number',
      width: 120,
      render: (v: string | null) => (
        <Text style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{v ?? '—'}</Text>
      ),
    },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      width: 180,
      render: (v: string) => <Tag icon={<ShopOutlined />}>{v}</Tag>,
    },
    {
      title: 'Vehicle',
      dataIndex: 'vehicleNumber',
      width: 130,
      render: (v: string | null) => v
        ? <Space size={4}><CarOutlined style={{ fontSize: 11 }} /><Text>{v}</Text></Space>
        : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Driver',
      dataIndex: 'driverName',
      width: 150,
      render: (v: string | null) => v ?? <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Dispatched',
      dataIndex: 'dispatchedAt',
      width: 130,
      render: (v: string | null) => <Text style={{ fontSize: 12, color: colors.text.placeholder }}>{fmtDate(v)}</Text>,
    },
    {
      title: 'Received',
      dataIndex: 'receivedAt',
      width: 140,
      render: (v: string | null) => (
        <Space size={4}>
          <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 12 }} />
          <Text style={{ fontSize: 12, color: '#22c55e' }}>{fmtDate(v)}</Text>
        </Space>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      width: 60,
      align: 'center',
      render: (_, row) => <Badge count={row.items.length} color="green" />,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            {navItem?.label ?? 'Dispatch Tracking'}
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Live view of all dispatched stock — vehicle, driver, destination and delivery status.
          </Text>
        </div>
        <Button icon={<SyncOutlined />} onClick={() => { refetch(); message.info('Refreshed'); }} style={{ borderColor: colors.border, color: colors.text.secondary }}>
          Refresh
        </Button>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>IN TRANSIT</span>}
              value={inTransit.length}
              prefix={<TruckOutlined style={{ color: '#d97706' }} />}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>OVERDUE</span>}
              value={overdueCount}
              prefix={<ClockCircleOutlined style={{ color: overdueCount > 0 ? '#ef4444' : colors.text.placeholder }} />}
              valueStyle={{ color: overdueCount > 0 ? '#ef4444' : colors.text.placeholder, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>RECEIVED (RECENT 50)</span>}
              value={recentReceived.length}
              prefix={<CheckCircleOutlined style={{ color: '#22c55e' }} />}
              valueStyle={{ color: '#22c55e', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Select
          allowClear showSearch placeholder="All branches" style={{ width: 260 }}
          options={branchOptions} value={branchId} onChange={(v) => setBranchId(v)}
          filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
        />
      </div>

      {/* In-Transit */}
      <Card
        title={<Space><TruckOutlined style={{ color: '#d97706' }} /><span style={{ color: colors.text.primary }}>In Transit</span>{inTransit.length > 0 && <Tag color="gold">{inTransit.length}</Tag>}</Space>}
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }}
        styles={{ header: { borderBottom: `1px solid ${colors.border}` }, body: { padding: 0 } }}
      >
        <Spin spinning={dispLoading}>
          {!dispLoading && inTransit.length === 0 ? (
            <Empty description="No shipments in transit" style={{ padding: 32 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table<StockIndent>
              rowKey="id"
              columns={inTransitCols}
              dataSource={inTransit}
              pagination={false}
              size="middle"
              scroll={{ x: 1200 }}
              expandable={{
                expandedRowRender: (record) => (
                  <div style={{ margin: '0 48px 12px' }}>
                    <Descriptions
                      size="small"
                      bordered
                      column={{ xs: 1, sm: 2, md: 3 }}
                      style={{ marginBottom: 14 }}
                    >
                      <Descriptions.Item label="Indent #">{record.number ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Destination">{record.branchName}</Descriptions.Item>
                      <Descriptions.Item label="Vehicle No.">{record.vehicleNumber ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Driver Name">{record.driverName ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Driver Mobile">{record.driverMobile ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Dispatched At">{fmt(record.dispatchedAt)}</Descriptions.Item>
                      <Descriptions.Item label="Expected Delivery">
                        {record.expectedDeliveryAt ? (
                          <Text style={{ color: isOverdue(record.expectedDeliveryAt) ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                            {fmt(record.expectedDeliveryAt)}
                            {isOverdue(record.expectedDeliveryAt) && ' — OVERDUE'}
                          </Text>
                        ) : '—'}
                      </Descriptions.Item>
                      {record.deliveryNotes && (
                        <Descriptions.Item label="Delivery Notes" span={2}>{record.deliveryNotes}</Descriptions.Item>
                      )}
                      {record.reason && (
                        <Descriptions.Item label="Request Reason" span={2}>{record.reason}</Descriptions.Item>
                      )}
                    </Descriptions>
                    <Text strong style={{ color: colors.text.primary, display: 'block', marginBottom: 8 }}>
                      Products on this shipment
                    </Text>
                    <Table<StockIndentItem>
                      rowKey="id"
                      columns={itemCols}
                      dataSource={record.items}
                      pagination={false}
                      size="small"
                    />
                  </div>
                ),
                rowExpandable: () => true,
              }}
            />
          )}
        </Spin>
      </Card>

      {/* Recently Received */}
      <Card
        title={<Space><CheckCircleOutlined style={{ color: '#22c55e' }} /><span style={{ color: colors.text.primary }}>Recently Received</span>{recentReceived.length > 0 && <Tag color="green">{recentReceived.length}</Tag>}</Space>}
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ header: { borderBottom: `1px solid ${colors.border}` }, body: { padding: 0 } }}
      >
        <Spin spinning={recLoading}>
          {!recLoading && recentReceived.length === 0 ? (
            <Empty description="No received shipments yet" style={{ padding: 32 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table<StockIndent>
              rowKey="id"
              columns={receivedCols}
              dataSource={recentReceived}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
              size="middle"
              scroll={{ x: 900 }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
