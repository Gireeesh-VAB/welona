'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useServiceInventory } from '@/hooks/useInventory';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import type {
  AdminServiceInventoryRow,
  ServiceInventoryItemRow,
  ServiceInventoryReadiness,
} from '@shared/types/admin-service-inventory';
import { formatMoney } from '@shared/format';

const { Title, Text } = Typography;
const { Search } = Input;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const READINESS_CONFIG: Record<
  ServiceInventoryReadiness,
  { label: string; color: string; icon: React.ReactNode; tagColor: string }
> = {
  ready: {
    label: 'Ready',
    color: '#52c41a',
    tagColor: 'success',
    icon: <CheckCircleOutlined />,
  },
  low: {
    label: 'Low Stock',
    color: '#faad14',
    tagColor: 'warning',
    icon: <ExclamationCircleOutlined />,
  },
  blocked: {
    label: 'Blocked',
    color: '#ff4d4f',
    tagColor: 'error',
    icon: <CloseCircleOutlined />,
  },
  no_items: {
    label: 'No Items',
    color: '#8c8c8c',
    tagColor: 'default',
    icon: <MinusCircleOutlined />,
  },
};

function StockStatusTag({ status }: { status: string }) {
  if (status === 'ok') return <Tag color="success">In Stock</Tag>;
  if (status === 'low') return <Tag color="warning">Low</Tag>;
  return <Tag color="error">Out</Tag>;
}

// ─── Expanded row: product requirements table ─────────────────────────────────

function ExpandedRow({ items }: { items: ServiceInventoryItemRow[] }) {
  if (items.length === 0) {
    return (
      <div style={{ padding: '16px 24px', color: '#8c8c8c', fontSize: 13 }}>
        No product dependencies configured for this service.
      </div>
    );
  }

  const cols: ColumnsType<ServiceInventoryItemRow> = [
    {
      title: 'SKU',
      dataIndex: 'productSku',
      width: 110,
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Product',
      dataIndex: 'productName',
      render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'UOM',
      dataIndex: 'productUom',
      width: 80,
      align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Qty / Session',
      dataIndex: 'quantityPerSession',
      width: 110,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: '#1677ff' }}>{v}</Text>
      ),
    },
    {
      title: 'Low-Stock Threshold',
      dataIndex: 'lowStockThreshold',
      width: 160,
      align: 'right' as const,
      render: (v: number | null) =>
        v != null ? (
          <Text style={{ color: '#faad14' }}>{v}</Text>
        ) : (
          <Text style={{ color: '#bbb' }}>—</Text>
        ),
    },
    {
      title: 'Current Stock',
      dataIndex: 'currentStock',
      width: 130,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ fontSize: 14 }}>{v}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'stockStatus',
      width: 100,
      align: 'center' as const,
      render: (v: string) => <StockStatusTag status={v} />,
    },
  ];

  return (
    <div style={{ padding: '8px 24px 16px', background: '#fafafa' }}>
      <Table<ServiceInventoryItemRow>
        columns={cols}
        dataSource={items}
        rowKey="id"
        size="small"
        pagination={false}
        style={{ border: '1px solid #f0f0f0', borderRadius: 6 }}
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminServiceInventoryPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-service-inventory');

  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: true });
  const { data: categoriesData } = useAdminCategories({ active: 'active', limit: 200 });

  const branchOptions = useMemo(
    () =>
      (branchesData?.items ?? []).map((b) => ({
        value: b.id,
        label: `${b.branchName} (${b.branchCode})`,
      })),
    [branchesData],
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...(categoriesData?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categoriesData],
  );

  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [readiness, setReadiness] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const { data, isLoading } = useServiceInventory({
    branchId: branchId || null,
    search: search || undefined,
    categoryId: categoryId || undefined,
    readiness: readiness || undefined,
    page,
    limit,
  });

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;

  // Summary counts from current page data
  const summary = useMemo(() => {
    if (!data) return { ready: 0, low: 0, blocked: 0, no_items: 0 };
    const all = data.items;
    return {
      ready: all.filter((r) => r.readiness === 'ready').length,
      low: all.filter((r) => r.readiness === 'low').length,
      blocked: all.filter((r) => r.readiness === 'blocked').length,
      no_items: all.filter((r) => r.readiness === 'no_items').length,
    };
  }, [data]);

  const columns: ColumnsType<AdminServiceInventoryRow> = [
    {
      title: 'Service',
      dataIndex: 'name',
      render: (v: string, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{v}</Text>
          {!row.isActive && (
            <Tag style={{ marginLeft: 8, fontSize: 10 }} color="default">Inactive</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      width: 160,
      render: (v: string | null) =>
        v ? <Tag color="blue">{v}</Tag> : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Products Linked',
      key: 'linked',
      width: 130,
      align: 'center',
      render: (_v, row) => (
        <Badge
          count={row.inventoryItems.length}
          style={{
            backgroundColor: row.inventoryItems.length > 0 ? '#1677ff' : '#d9d9d9',
          }}
          showZero
        />
      ),
    },
    {
      title: 'Readiness',
      dataIndex: 'readiness',
      width: 140,
      render: (v: ServiceInventoryReadiness) => {
        const cfg = READINESS_CONFIG[v];
        return (
          <Tag icon={cfg.icon} color={cfg.tagColor} style={{ fontWeight: 600 }}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: 'Stock Detail',
      key: 'stock',
      width: 220,
      render: (_v, row) => {
        if (row.inventoryItems.length === 0) {
          return <Text style={{ color: '#bbb', fontSize: 12 }}>No dependencies</Text>;
        }
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {row.inventoryItems.map((item) => (
              <Tooltip
                key={item.id}
                title={`${item.productName} — ${item.currentStock} ${item.productUom} in stock`}
              >
                <Tag
                  color={
                    item.stockStatus === 'ok'
                      ? 'success'
                      : item.stockStatus === 'low'
                      ? 'warning'
                      : 'error'
                  }
                  style={{ fontSize: 11, cursor: 'default' }}
                >
                  {item.productName.substring(0, 14)}{item.productName.length > 14 ? '…' : ''}: {item.currentStock}
                </Tag>
              </Tooltip>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: colors.text.primary }}>
          Service Inventory
        </Title>
        <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
          {navItem?.description ?? 'View product stock requirements per service and branch readiness.'}
        </Text>
      </div>

      {/* Filters */}
      <Card
        style={{ marginBottom: 20, borderRadius: 8, border: `1px solid ${colors.border}` }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch *</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select branch"
              options={branchOptions}
              value={branchId || undefined}
              onChange={(v) => { setBranchId(v); setPage(1); }}
              allowClear
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</div>
            <Select
              style={{ width: '100%' }}
              options={categoryOptions}
              value={categoryId || ''}
              onChange={(v) => { setCategoryId(v); setPage(1); }}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Readiness</div>
            <Select
              style={{ width: '100%' }}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'ready', label: '✅ Ready' },
                { value: 'low', label: '⚠️ Low Stock' },
                { value: 'blocked', label: '🚫 Blocked' },
                { value: 'no_items', label: '— No Items' },
              ]}
              value={readiness}
              onChange={(v) => { setReadiness(v); setPage(1); }}
            />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</div>
            <Search
              placeholder="Search by service name…"
              prefix={<SearchOutlined />}
              allowClear
              onSearch={(v) => { setSearch(v); setPage(1); }}
              onChange={(e) => { if (!e.target.value) { setSearch(''); setPage(1); } }}
            />
          </Col>
        </Row>
      </Card>

      {/* Stats row */}
      {branchId && data && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {(
            [
              { key: 'ready', label: 'Ready', color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
              { key: 'low', label: 'Low Stock', color: '#faad14', bg: '#fffbe6', border: '#ffe58f' },
              { key: 'blocked', label: 'Blocked', color: '#ff4d4f', bg: '#fff2f0', border: '#ffccc7' },
              { key: 'no_items', label: 'No Dependencies', color: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' },
            ] as const
          ).map((s) => (
            <Col key={s.key} xs={12} sm={6}>
              <Card
                size="small"
                style={{
                  borderRadius: 8,
                  border: `1px solid ${s.border}`,
                  background: s.bg,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                bodyStyle={{ padding: '12px 16px' }}
                onClick={() => { setReadiness(readiness === s.key ? '' : s.key); setPage(1); }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {READINESS_CONFIG[s.key].icon} {s.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                  {summary[s.key]}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Main table */}
      <Card
        style={{ borderRadius: 8, border: `1px solid ${colors.border}` }}
        bodyStyle={{ padding: 0 }}
      >
        {!branchId ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Empty
              description={
                <span style={{ color: colors.text.secondary }}>
                  Select a branch to see service readiness
                </span>
              }
            />
          </div>
        ) : (
          <Table<AdminServiceInventoryRow>
            columns={columns}
            dataSource={rows}
            rowKey="id"
            loading={isLoading}
            size="middle"
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpand: (expanded, record) => {
                setExpandedKeys(
                  expanded
                    ? [...expandedKeys, record.id]
                    : expandedKeys.filter((k) => k !== record.id),
                );
              },
              expandedRowRender: (record) => <ExpandedRow items={record.inventoryItems} />,
              rowExpandable: () => true,
            }}
            pagination={{
              current: page,
              pageSize: limit,
              total,
              showSizeChanger: true,
              pageSizeOptions: [20, 50, 100],
              onChange: (p, sz) => { setPage(p); if (sz !== limit) setLimit(sz); },
              showTotal: (t) => `${t} service${t === 1 ? '' : 's'}`,
            }}
            rowClassName={(row) =>
              !row.isActive ? 'ant-table-row-disabled' : ''
            }
          />
        )}
      </Card>
    </div>
  );
}
