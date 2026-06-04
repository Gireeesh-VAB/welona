'use client';

import { useState } from 'react';
import { Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminAuditLog } from '@shared/types/admin-audit-log';

const { Title, Text } = Typography;

const ACTION_COLOR: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  dispatch: 'gold',
  receive: 'green',
  cancel: 'red',
};
const ACTOR_LABEL: Record<string, string> = { admin: 'Admin', branch: 'Branch', staff: 'Staff', system: 'System' };
const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'supplier', label: 'Suppliers' },
  { value: 'purchase_order', label: 'Purchase orders' },
  { value: 'goods_receipt', label: 'Goods receipts' },
  { value: 'stock_transfer', label: 'Stock transfers' },
  { value: 'warehouse', label: 'Warehouses' },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminAuditLogPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-audit')!;

  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data, isLoading } = useAuditLogs({
    entity: entity || undefined,
    search: search || undefined,
    page,
    limit,
  });

  const columns: ColumnsType<AdminAuditLog> = [
    { title: 'When', dataIndex: 'createdAt', width: 170, render: (v: string) => formatDateTime(v) },
    {
      title: 'Actor',
      key: 'actor',
      width: 160,
      render: (_v, r) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{r.actorName ?? '—'}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{ACTOR_LABEL[r.actorType] ?? r.actorType}</Text>
        </div>
      ),
    },
    { title: 'Action', dataIndex: 'action', width: 110, render: (a: string) => <Tag color={ACTION_COLOR[a] ?? 'default'}>{a}</Tag> },
    { title: 'Entity', dataIndex: 'entity', width: 140, render: (e: string) => <Text code style={{ fontSize: 11 }}>{e}</Text> },
    { title: 'Details', dataIndex: 'summary', render: (s: string | null) => s ?? <Text type="secondary">—</Text> },
  ];

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [50, 100, 200],
    onChange: (p, sz) => { setPage(p); if (sz !== limit) setLimit(sz); },
    showTotal: (t) => `${t} entries`,
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
        <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
      </div>
      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Select value={entity} onChange={(v) => { setEntity(v); setPage(1); }} options={ENTITY_OPTIONS} style={{ width: 200 }} />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search details, actor or id"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 320 }}
          />
        </Space>
        <Table<AdminAuditLog>
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
