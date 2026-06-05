'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Input, Segmented, Select, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useBatches } from '@/hooks/useBatches';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import {} from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminBatchRow } from '@shared/types/admin-batch';

const { Title, Text } = Typography;

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export default function AdminBatchesPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-batches')!;


  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: true });
  const branchOptions = useMemo(
    () => [
      { value: '', label: 'All branches' },
      ...(branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    ],
    [branchesData],
  );

  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
  }, []);
  const { data, isLoading } = useBatches({
    branchId: branchId || undefined,
    search: search || undefined,
    inStockOnly,
    page,
    limit,
  });

  const expiryTag = (d: number | null) => {
    if (d === null) return <Text style={{ color: colors.text.placeholder }}>—</Text>;
    if (d < 0) return <Tag color="red">Expired {-d}d</Tag>;
    if (d <= 60) return <Tag color="gold">{d}d left</Tag>;
    return <Tag>{d}d left</Tag>;
  };

  const columns: ColumnsType<AdminBatchRow> = [
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
    { title: 'Batch', dataIndex: 'batchNo', width: 140, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Mfg', dataIndex: 'mfgDate', width: 120, render: (v: string | null) => formatDate(v) },
    { title: 'Expiry', dataIndex: 'expiryDate', width: 120, render: (v: string | null) => formatDate(v) },
    { title: 'Status', dataIndex: 'daysToExpiry', width: 130, render: (d: number | null) => expiryTag(d) },
    { title: 'On hand', dataIndex: 'quantity', width: 100, align: 'right', sorter: (a, b) => a.quantity - b.quantity },
  ];

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [20, 50, 100],
    onChange: (p, sz) => { setPage(p); if (sz !== limit) setLimit(sz); },
    showTotal: (t) => `${t} batches`,
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
        <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
      </div>
      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <Space style={{ marginBottom: 12 }} wrap>
            <Select showSearch value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }} options={branchOptions} style={{ width: 240 }}
              filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
          <Input allowClear prefix={<SearchOutlined />} placeholder="Search batch, product or SKU" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 300 }} />
          <Segmented
            value={inStockOnly ? 'instock' : 'all'}
            onChange={(v) => { setInStockOnly(v === 'instock'); setPage(1); }}
            options={[{ value: 'instock', label: 'In stock' }, { value: 'all', label: 'All batches' }]}
          />
        </Space>
        <Table<AdminBatchRow>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}
