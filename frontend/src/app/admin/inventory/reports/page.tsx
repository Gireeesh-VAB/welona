'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Input, Row, Segmented, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useInventoryReports } from '@/hooks/useInventoryReports';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import {} from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminInventoryProductReportRow, MovementClass } from '@shared/types/admin-inventory-report';

const { Title, Text } = Typography;

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CLASS_COLOR: Record<MovementClass, string> = { fast: 'green', slow: 'gold', dead: 'red' };
const CLASS_LABEL: Record<MovementClass, string> = { fast: 'Fast', slow: 'Slow', dead: 'Dead' };

export default function AdminInventoryReportsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-reports')!;


  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: true });
  const branchOptions = useMemo(
    () => [
      { value: '', label: 'All branches' },
      ...(branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    ],
    [branchesData],
  );

  const [branchId, setBranchId] = useState<string>('');
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<MovementClass | 'all'>('all');

  useEffect(() => {
  }, []);
  const { data, isLoading } = useInventoryReports({ branchId: branchId || undefined, days });
  const summary = data?.summary;

  const rows = useMemo(() => {
    let list = data?.products ?? [];
    if (classFilter !== 'all') list = list.filter((r) => r.movementClass === classFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q));
    }
    return list;
  }, [data, classFilter, search]);

  const columns: ColumnsType<AdminInventoryProductReportRow> = [
    {
      title: 'Product',
      key: 'product',
      render: (_v, r) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{r.name}</div>
          <Text code style={{ fontSize: 11 }}>{r.sku}</Text>
          {r.brand && <Text style={{ color: colors.text.placeholder, fontSize: 11, marginLeft: 8 }}>{r.brand}</Text>}
        </div>
      ),
    },
    {
      title: 'On hand',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (v: number, r) => (
        <Text style={{ color: v === 0 ? colors.status.error : r.isLowStock ? colors.status.warning : colors.text.primary }}>{v}</Text>
      ),
    },
    { title: 'Valuation', dataIndex: 'valuation', width: 120, align: 'right', sorter: (a, b) => a.valuation - b.valuation, render: (v: number) => rupees(v) },
    { title: `Sold (${days}d)`, dataIndex: 'soldUnits', width: 110, align: 'right', sorter: (a, b) => a.soldUnits - b.soldUnits },
    { title: `Purchased (${days}d)`, dataIndex: 'purchasedUnits', width: 130, align: 'right' },
    {
      title: 'Movement',
      dataIndex: 'movementClass',
      width: 110,
      align: 'center',
      filters: (['fast', 'slow', 'dead'] as MovementClass[]).map((c) => ({ text: CLASS_LABEL[c], value: c })),
      onFilter: (val, r) => r.movementClass === val,
      render: (c: MovementClass) => <Tag color={CLASS_COLOR[c]}>{CLASS_LABEL[c]}</Tag>,
    },
  ];

  const kpis = [
    { label: 'STOCK VALUATION', value: summary ? rupees(summary.valuation) : '—', color: colors.gold.primary },
    { label: 'TOTAL UNITS', value: summary?.totalUnits ?? 0, color: colors.text.primary },
    { label: 'LOW STOCK', value: summary?.lowStock ?? 0, color: colors.status.warning },
    { label: 'OUT OF STOCK', value: summary?.outOfStock ?? 0, color: colors.status.error },
    { label: `SOLD (${days}d)`, value: summary?.soldUnits ?? 0, color: colors.text.primary },
    { label: `PURCHASED (${days}d)`, value: summary?.purchasedUnits ?? 0, color: colors.text.primary },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
        <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Select
            showSearch
            value={branchId}
            onChange={setBranchId}
            options={branchOptions}
            style={{ width: 260 }}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
        <Segmented
          value={days}
          onChange={(v) => setDays(v as number)}
          options={[
            { value: 7, label: '7 days' },
            { value: 30, label: '30 days' },
            { value: 90, label: '90 days' },
            { value: 365, label: '1 year' },
          ]}
        />
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {kpis.map((k) => (
          <Col key={k.label} xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<span style={{ color: colors.text.placeholder, fontSize: 11 }}>{k.label}</span>}
                value={k.value as number | string}
                valueStyle={{ color: k.color, fontWeight: 600, fontSize: 20 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search product or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320, width: '100%' }}
          />
          <Segmented
            value={classFilter}
            onChange={(v) => setClassFilter(v as MovementClass | 'all')}
            options={[
              { value: 'all', label: 'All' },
              { value: 'fast', label: 'Fast' },
              { value: 'slow', label: 'Slow' },
              { value: 'dead', label: 'Dead' },
            ]}
          />
        </div>
        <Table<AdminInventoryProductReportRow>
          rowKey="productId"
          loading={isLoading}
          columns={columns}
          dataSource={rows}
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: (t) => `${t} products` }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}
