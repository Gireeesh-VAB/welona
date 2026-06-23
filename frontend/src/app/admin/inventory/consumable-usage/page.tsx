'use client';

import { useMemo, useState } from 'react';
import {
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
import { ExperimentOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useConsumableUnits } from '@/hooks/useConsumableUnits';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import type { ConsumableUnitRow } from '@shared/types/admin-service-inventory';

const { Title, Text } = Typography;

type StatusFilter = 'all' | 'active' | 'open' | 'sealed' | 'exhausted';

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  sealed:    { label: 'Sealed',    color: 'default' },
  open:      { label: 'Open',      color: 'processing' },
  exhausted: { label: 'Exhausted', color: 'success' },
  discarded: { label: 'Discarded', color: 'error' },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'open',      label: 'Open' },
  { key: 'sealed',    label: 'Sealed' },
  { key: 'exhausted', label: 'Exhausted' },
];

const columns: ColumnsType<ConsumableUnitRow> = [
  {
    title: 'Product',
    key: 'product',
    width: 220,
    render: (_, r) => (
      <div>
        <Text strong style={{ fontSize: 13, display: 'block', lineHeight: '20px' }}>{r.productName}</Text>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
          <Text style={{ color: '#aaa', fontSize: 11 }}>{r.productSku}</Text>
          <Tag style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}>{r.purchaseUom}</Tag>
          <Tag
            color={STATUS_CFG[r.status]?.color ?? 'default'}
            style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}
          >
            {STATUS_CFG[r.status]?.label ?? r.status}
          </Tag>
        </div>
      </div>
    ),
  },
  {
    title: 'Usage',
    key: 'usage',
    width: 240,
    render: (_, r) => {
      const pct = r.percentUsed;
      const remaining = r.remaining;
      const isLow = remaining < r.totalCapacity * 0.2 && remaining > 0;
      const isEmpty = remaining <= 0;
      const barColor = isEmpty ? '#52c41a' : isLow ? '#faad14' : '#1677ff';
      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <Text style={{ color: '#595959' }}>
              Used: <strong>{r.usedQuantity}</strong>
              <span style={{ color: '#bbb', marginLeft: 2 }}>{r.consumptionUom}</span>
            </Text>
            <Text style={{ color: isEmpty ? '#52c41a' : isLow ? '#faad14' : '#52c41a', fontWeight: 600 }}>
              {remaining} left
              <span style={{ color: '#bbb', fontWeight: 400, marginLeft: 2 }}>{r.consumptionUom}</span>
            </Text>
          </div>
          <Progress
            percent={pct}
            size="small"
            showInfo={false}
            strokeColor={barColor}
            trailColor="#f0f0f0"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#bbb', marginTop: 2 }}>
            <span>0</span>
            <span style={{ color: '#595959' }}>{pct}%</span>
            <span>{r.totalCapacity} {r.consumptionUom}</span>
          </div>
        </div>
      );
    },
  },
  {
    title: 'GRN #',
    dataIndex: 'grnNumber',
    width: 110,
    align: 'center' as const,
    render: (v: string | null) =>
      v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text style={{ color: '#ccc' }}>—</Text>,
  },
  {
    title: 'Received',
    dataIndex: 'grnReceivedAt',
    width: 110,
    align: 'center' as const,
    render: (v: string | null) => <Text style={{ fontSize: 12 }}>{formatDate(v)}</Text>,
  },
  {
    title: 'Opened',
    dataIndex: 'openedAt',
    width: 110,
    align: 'center' as const,
    render: (v: string | null) => <Text style={{ fontSize: 12, color: v ? '#595959' : '#ccc' }}>{formatDate(v)}</Text>,
  },
];

export default function ConsumableUsagePage() {
  const [branchId, setBranchId] = useState('');
  const [statusTab, setStatusTab] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: true });
  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    [branchesData],
  );

  const statusParam = statusTab === 'all' ? undefined : statusTab as ConsumableUnitRow['status'] | 'active';
  const { data, isLoading } = useConsumableUnits({ branchId, status: statusParam, page, limit });

  const units     = data?.items ?? [];
  const total     = data?.meta?.total ?? 0;
  const active    = units.filter((u) => u.status === 'sealed' || u.status === 'open').length;
  const totalCap  = units.reduce((s, u) => s + u.totalCapacity, 0);
  const totalUsed = units.reduce((s, u) => s + u.usedQuantity, 0);
  const totalRem  = units.reduce((s, u) => s + u.remaining, 0);

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12, marginBottom: 20,
      }}>
        <div>
          <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExperimentOutlined style={{ color: '#1677ff' }} />
            Consumable Unit Tracking
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            FIFO tracking — purchase units (bottles/strips/boxes) with consumption-unit usage
          </Text>
        </div>
        <Select
          placeholder="Select branch"
          style={{ width: 280, flexShrink: 0 }}
          options={branchOptions}
          value={branchId || undefined}
          onChange={(v) => { setBranchId(v); setPage(1); }}
          showSearch
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          allowClear
          onClear={() => setBranchId('')}
        />
      </div>

      {!branchId ? (
        <Card>
          <Empty description="Select a branch to view consumable unit tracking." />
        </Card>
      ) : (
        <>
          {/* Stat cards */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={12} lg={6}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic
                  title="Active Units"
                  value={active}
                  suffix={<span style={{ fontSize: 13, color: '#999' }}>/ {total}</span>}
                  valueStyle={{ color: '#1677ff', fontSize: 24 }}
                  loading={isLoading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic
                  title="Total Capacity"
                  value={totalCap.toFixed(1)}
                  valueStyle={{ fontSize: 24 }}
                  loading={isLoading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic
                  title="Used"
                  value={totalUsed.toFixed(1)}
                  valueStyle={{ color: '#faad14', fontSize: 24 }}
                  loading={isLoading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic
                  title="Remaining"
                  value={totalRem.toFixed(1)}
                  valueStyle={{ color: '#52c41a', fontSize: 24 }}
                  loading={isLoading}
                />
              </Card>
            </Col>
          </Row>

          {/* Table */}
          <Card bodyStyle={{ padding: 0 }}>
            <div style={{ padding: '0 16px' }}>
              <Tabs
                activeKey={statusTab}
                onChange={(k) => { setStatusTab(k as StatusFilter); setPage(1); }}
                items={TABS.map((t) => ({ key: t.key, label: t.label }))}
              />
            </div>
            <Spin spinning={isLoading}>
              {!isLoading && units.length === 0 ? (
                <div style={{ padding: '40px 24px' }}>
                  <Empty description="No consumable units found." />
                </div>
              ) : (
                <Table<ConsumableUnitRow>
                  rowKey="id"
                  dataSource={units}
                  columns={columns}
                  size="middle"
                  scroll={{ x: 800 }}
                  pagination={{
                    current: page,
                    pageSize: limit,
                    total,
                    onChange: setPage,
                    showTotal: (t) => `${t} units`,
                    style: { padding: '12px 16px' },
                  }}
                  rowClassName={(r) =>
                    r.status === 'open' ? 'row-open' :
                    r.status === 'exhausted' ? 'row-exhausted' : ''
                  }
                />
              )}
            </Spin>
          </Card>
        </>
      )}
    </div>
  );
}
