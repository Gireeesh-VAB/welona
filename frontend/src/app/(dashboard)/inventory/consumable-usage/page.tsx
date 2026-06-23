'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
  Tabs,
  Typography,
} from 'antd';
import {
  ExperimentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useConsumableUnits } from '@/hooks/useConsumableUnits';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import type { ConsumableUnitRow } from '@shared/types/admin-service-inventory';

const { Title, Text } = Typography;

type StatusFilter = 'all' | 'active' | 'open' | 'sealed' | 'exhausted';

const STATUS_TAG: Record<string, { label: string; color: string; badgeStatus?: 'default' | 'processing' | 'success' | 'error' | 'warning' }> = {
  sealed: { label: 'Sealed', color: 'default', badgeStatus: 'default' },
  open: { label: 'Open', color: 'processing', badgeStatus: 'processing' },
  exhausted: { label: 'Exhausted', color: 'success', badgeStatus: 'success' },
  discarded: { label: 'Discarded', color: 'error', badgeStatus: 'error' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_TAG[status] ?? { label: status, color: 'default', badgeStatus: 'default' };
  return <Badge status={cfg.badgeStatus ?? 'default'} text={<Tag color={cfg.color}>{cfg.label}</Tag>} />;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TAB_ITEMS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active (Sealed + Open)' },
  { key: 'open', label: 'Open' },
  { key: 'sealed', label: 'Sealed' },
  { key: 'exhausted', label: 'Exhausted' },
];

export default function ConsumableUsagePage() {
  const [branchId, setBranchId] = useState('');
  const [statusTab, setStatusTab] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: true });

  const branchOptions = useMemo(
    () =>
      (branchesData?.items ?? []).map((b) => ({
        value: b.id,
        label: `${b.branchName} (${b.branchCode})`,
      })),
    [branchesData],
  );

  const statusParam = statusTab === 'all' ? undefined : statusTab as ConsumableUnitRow['status'] | 'active';

  const { data, isLoading } = useConsumableUnits({
    branchId,
    status: statusParam,
    page,
    limit,
  });

  const units = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  // Summary stats from current data (all active units query for summary would need separate call;
  // show summary from current page data)
  const activeUnits = units.filter((u) => u.status === 'sealed' || u.status === 'open');
  const totalCapacity = units.reduce((sum: number, u: ConsumableUnitRow) => sum + u.totalCapacity, 0);
  const totalUsed = units.reduce((sum: number, u: ConsumableUnitRow) => sum + u.usedQuantity, 0);
  const totalRemaining = units.reduce((sum: number, u: ConsumableUnitRow) => sum + u.remaining, 0);

  const columns: ColumnsType<ConsumableUnitRow> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, row) => (
        <div>
          <Text strong style={{ display: 'block', fontSize: 13 }}>{row.productName}</Text>
          <Text style={{ color: '#999', fontSize: 11 }}>{row.productSku}</Text>
        </div>
      ),
    },
    {
      title: 'Purchase Unit',
      dataIndex: 'purchaseUom',
      width: 110,
      align: 'center',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      align: 'center',
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      title: 'Capacity',
      dataIndex: 'totalCapacity',
      width: 100,
      align: 'right',
      render: (v: number, row) => (
        <Text strong>{v} <Text style={{ color: '#999', fontSize: 11 }}>{row.consumptionUom}</Text></Text>
      ),
    },
    {
      title: 'Used',
      dataIndex: 'usedQuantity',
      width: 100,
      align: 'right',
      render: (v: number, row) => (
        <Text>{v} <Text style={{ color: '#999', fontSize: 11 }}>{row.consumptionUom}</Text></Text>
      ),
    },
    {
      title: 'Remaining',
      dataIndex: 'remaining',
      width: 100,
      align: 'right',
      render: (v: number, row) => (
        <Text strong style={{ color: v <= 0 ? '#ff4d4f' : v < row.totalCapacity * 0.2 ? '#faad14' : '#52c41a' }}>
          {v} <Text style={{ color: '#999', fontSize: 11 }}>{row.consumptionUom}</Text>
        </Text>
      ),
    },
    {
      title: '% Used',
      dataIndex: 'percentUsed',
      width: 140,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          status={v >= 100 ? 'success' : v >= 80 ? 'exception' : 'active'}
          strokeColor={v >= 100 ? '#52c41a' : v >= 80 ? '#ff4d4f' : '#1677ff'}
        />
      ),
    },
    {
      title: 'GRN #',
      dataIndex: 'grnNumber',
      width: 110,
      render: (v: string | null) =>
        v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text style={{ color: '#999' }}>—</Text>,
    },
    {
      title: 'Opened',
      dataIndex: 'openedAt',
      width: 110,
      render: (v: string | null) => formatDate(v),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          <ExperimentOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          Consumable Unit Tracking
        </Title>
        <Text style={{ color: '#888' }}>
          FIFO tracking of individual purchase units (bottles, strips, boxes) for consumable products.
        </Text>
      </div>

      {/* Branch selector */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="Select a branch"
          style={{ width: 300 }}
          options={branchOptions}
          value={branchId || undefined}
          onChange={(v) => { setBranchId(v); setPage(1); }}
          showSearch
          filterOption={(input, opt) =>
            (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          allowClear
          onClear={() => setBranchId('')}
        />
      </div>

      {!branchId ? (
        <Card>
          <Empty description="Select a branch to view consumable units." />
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={6}>
              <Card>
                <Statistic
                  title="Active Units"
                  value={activeUnits.length}
                  suffix={`/ ${units.length}`}
                  valueStyle={{ color: '#1677ff' }}
                  loading={isLoading}
                />
              </Card>
            </Col>
            <Col xs={6}>
              <Card>
                <Statistic
                  title="Total Capacity (page)"
                  value={totalCapacity.toFixed(1)}
                  loading={isLoading}
                />
              </Card>
            </Col>
            <Col xs={6}>
              <Card>
                <Statistic
                  title="Total Used (page)"
                  value={totalUsed.toFixed(1)}
                  valueStyle={{ color: '#faad14' }}
                  loading={isLoading}
                />
              </Card>
            </Col>
            <Col xs={6}>
              <Card>
                <Statistic
                  title="Total Remaining (page)"
                  value={totalRemaining.toFixed(1)}
                  valueStyle={{ color: '#52c41a' }}
                  loading={isLoading}
                />
              </Card>
            </Col>
          </Row>

          <Card>
            <Tabs
              activeKey={statusTab}
              onChange={(k) => { setStatusTab(k as StatusFilter); setPage(1); }}
              items={TAB_ITEMS.map((t) => ({ key: t.key, label: t.label }))}
              style={{ marginBottom: 16 }}
            />
            <Spin spinning={isLoading}>
              {!isLoading && units.length === 0 ? (
                <Empty description="No consumable units found for the selected filters." />
              ) : (
                <Table<ConsumableUnitRow>
                  rowKey="id"
                  dataSource={units}
                  columns={columns}
                  size="middle"
                  pagination={{
                    current: page,
                    pageSize: limit,
                    total,
                    onChange: setPage,
                    showTotal: (t) => `${t} units`,
                  }}
                />
              )}
            </Spin>
          </Card>
        </>
      )}
    </div>
  );
}
