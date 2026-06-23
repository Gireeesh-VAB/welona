'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  SearchOutlined,
  StarFilled,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useInventoryStock } from '@/hooks/useInventory';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminWarehouse } from '@shared/types/admin-warehouse';
import type { AdminInventoryStockRow } from '@shared/types/admin-inventory';

const { Title, Text } = Typography;
const { Search } = Input;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function StockStatusTag({ qty, isLowStock }: { qty: number; isLowStock: boolean }) {
  if (qty <= 0) return <Tag icon={<CloseCircleOutlined />} color="error">Out of Stock</Tag>;
  if (isLowStock) return <Tag icon={<ExclamationCircleOutlined />} color="warning">Low Stock</Tag>;
  return <Tag icon={<CheckCircleOutlined />} color="success">In Stock</Tag>;
}

function WarehouseCard({
  warehouse,
  selected,
  onClick,
  colors,
}: {
  warehouse: AdminWarehouse;
  selected: boolean;
  onClick: () => void;
  colors: ReturnType<typeof useBrandColors>;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 200,
        maxWidth: 220,
        flexShrink: 0,
        padding: '14px 16px',
        borderRadius: 10,
        border: `2px solid ${selected ? colors.gold.primary : colors.border}`,
        background: selected ? colors.black.secondary : colors.black.tertiary,
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        boxShadow: selected ? `0 0 0 2px ${colors.gold.light}22` : 'none',
      }}
    >
      {/* Default star */}
      {warehouse.isDefault && (
        <StarFilled
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            fontSize: 13,
            color: colors.gold.primary,
          }}
        />
      )}

      {/* Warehouse name */}
      <div style={{ fontWeight: 700, fontSize: 14, color: colors.text.primary, paddingRight: 20, lineHeight: 1.3 }}>
        {warehouse.name}
      </div>

      {/* Branch */}
      <div style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>
        {warehouse.branch.name}
      </div>

      {/* Code + product count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <Tag style={{ margin: 0, fontSize: 10 }}>{warehouse.code}</Tag>
        {warehouse.productCount > 0 && (
          <Text style={{ fontSize: 11, color: colors.text.placeholder }}>
            {warehouse.productCount} product{warehouse.productCount !== 1 ? 's' : ''}
          </Text>
        )}
      </div>

      {/* Active indicator */}
      {!warehouse.isActive && (
        <Tag color="default" style={{ marginTop: 8, fontSize: 10 }}>Inactive</Tag>
      )}
    </div>
  );
}

export default function WarehouseStockPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-warehouse-stock');

  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const [selectedWarehouse, setSelectedWarehouse] = useState<AdminWarehouse | null>(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Load all warehouses (optionally filtered by branch)
  const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses({
    branchId: branchFilter,
    limit: 200,
  });
  const warehouses = warehousesData?.items ?? [];

  // Branch filter options
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    [branchesData],
  );

  // Stock for the selected warehouse
  const { data: stockData, isLoading: stockLoading } = useInventoryStock({
    branchId: selectedWarehouse?.branch.id ?? null,
    warehouseId: selectedWarehouse?.id,
    search: search || undefined,
    lowStockOnly,
    page,
    limit,
  });

  const rows = stockData?.items ?? [];
  const total = stockData?.meta.total ?? 0;

  const stats = useMemo(() => ({
    inStock: rows.filter((r) => r.quantity > 0 && !r.isLowStock).length,
    lowStock: rows.filter((r) => r.isLowStock).length,
    outOfStock: rows.filter((r) => r.quantity <= 0).length,
  }), [rows]);

  const columns: ColumnsType<AdminInventoryStockRow> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 110,
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Product',
      key: 'product',
      render: (_v, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{row.name}</Text>
          {row.brand && (
            <Text style={{ display: 'block', fontSize: 11, color: colors.text.secondary }}>{row.brand}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      width: 80,
      align: 'center',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Qty on Hand',
      dataIndex: 'quantity',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (v: number, row) => {
        const color = v <= 0 ? '#ff4d4f' : row.isLowStock ? '#faad14' : '#52c41a';
        return (
          <span style={{ fontWeight: 700, color, fontSize: 15 }}>
            {v} <span style={{ fontSize: 12, fontWeight: 400 }}>{row.uom}</span>
          </span>
        );
      },
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorderLevel',
      width: 110,
      align: 'right',
      render: (v: number) =>
        v > 0 ? <Text style={{ color: '#faad14' }}>{v}</Text> : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_v, row) => <StockStatusTag qty={row.quantity} isLowStock={row.isLowStock} />,
    },
    {
      title: 'Last Movement',
      dataIndex: 'lastMovementAt',
      width: 130,
      render: (v: string | null) => (
        <Text style={{ fontSize: 11, color: colors.text.secondary }}>{formatDate(v)}</Text>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total,
    showSizeChanger: true,
    pageSizeOptions: [20, 50, 100],
    onChange: (p, sz) => { setPage(p); if (sz !== limit) setLimit(sz); },
    showTotal: (t) => `${t} product${t === 1 ? '' : 's'}`,
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: colors.text.primary }}>
          Warehouse Stock
        </Title>
        <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
          {navItem?.description ?? 'Tap a warehouse to see its current stock levels.'}
        </Text>
      </div>

      {/* Warehouse picker */}
      <Card
        style={{ marginBottom: 20, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.black.secondary }}
        bodyStyle={{ padding: 16 }}
      >
        {/* Optional branch filter to narrow the warehouse list */}
        <div style={{ marginBottom: 14 }}>
          <Select
            allowClear
            showSearch
            placeholder="Filter by branch (optional)"
            style={{ width: 280 }}
            options={branchOptions}
            value={branchFilter}
            onChange={(v) => {
              setBranchFilter(v);
              setSelectedWarehouse(null);
              setSearch('');
              setPage(1);
            }}
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        {/* Scrollable warehouse cards */}
        {warehousesLoading ? (
          <Text style={{ color: colors.text.placeholder }}>Loading warehouses…</Text>
        ) : warehouses.length === 0 ? (
          <Text style={{ color: colors.text.placeholder }}>No warehouses found.</Text>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 6,
            }}
          >
            {warehouses.map((wh) => (
              <WarehouseCard
                key={wh.id}
                warehouse={wh}
                selected={selectedWarehouse?.id === wh.id}
                onClick={() => {
                  setSelectedWarehouse(wh);
                  setSearch('');
                  setLowStockOnly(false);
                  setPage(1);
                }}
                colors={colors}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Stock section — only shown after selecting a warehouse */}
      {selectedWarehouse && (
        <>
          {/* Selected warehouse info + search/filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <Text style={{ fontSize: 16, fontWeight: 700, color: colors.text.primary }}>
                {selectedWarehouse.name}
                {selectedWarehouse.isDefault && (
                  <StarFilled style={{ color: colors.gold.primary, marginLeft: 8, fontSize: 14 }} />
                )}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginLeft: 10 }}>
                {selectedWarehouse.branch.name} · <Text code style={{ fontSize: 11 }}>{selectedWarehouse.code}</Text>
              </Text>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Search
                placeholder="SKU, product name, brand…"
                prefix={<SearchOutlined />}
                allowClear
                style={{ width: 260 }}
                onSearch={(v) => { setSearch(v); setPage(1); }}
                onChange={(e) => { if (!e.target.value) { setSearch(''); setPage(1); } }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>Low Stock Only</Text>
                <Switch
                  size="small"
                  checked={lowStockOnly}
                  onChange={(v) => { setLowStockOnly(v); setPage(1); }}
                  checkedChildren="On"
                  unCheckedChildren="Off"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          {stockData && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {[
                { label: 'Total Products', value: total, color: '#1677ff', bg: '#e6f4ff', border: '#91caff' },
                { label: 'In Stock', value: stats.inStock, color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
                { label: 'Low Stock', value: stats.lowStock, color: '#faad14', bg: '#fffbe6', border: '#ffe58f' },
                { label: 'Out of Stock', value: stats.outOfStock, color: '#ff4d4f', bg: '#fff2f0', border: '#ffccc7' },
              ].map((s) => (
                <Col key={s.label} xs={12} sm={6}>
                  <Card
                    size="small"
                    style={{ borderRadius: 8, border: `1px solid ${s.border}`, background: s.bg }}
                    bodyStyle={{ padding: '12px 16px' }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                      {s.value}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {/* Stock table */}
          <Card
            style={{ borderRadius: 8, border: `1px solid ${colors.border}` }}
            bodyStyle={{ padding: 0 }}
          >
            <Table<AdminInventoryStockRow>
              columns={columns}
              dataSource={rows}
              rowKey="productId"
              loading={stockLoading}
              size="middle"
              pagination={pagination}
              scroll={{ x: 900 }}
              locale={{ emptyText: <Empty description="No products found in this warehouse" style={{ padding: 40 }} /> }}
            />
          </Card>
        </>
      )}

      {/* Prompt when no warehouse selected yet */}
      {!selectedWarehouse && !warehousesLoading && warehouses.length > 0 && (
        <Card
          style={{ borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.black.secondary }}
          bodyStyle={{ padding: 0 }}
        >
          <Empty
            image={<InboxOutlined style={{ fontSize: 48, color: colors.text.placeholder }} />}
            description={
              <Text style={{ color: colors.text.secondary }}>
                Select a warehouse above to view its stock
              </Text>
            }
            style={{ padding: 48 }}
          />
        </Card>
      )}
    </div>
  );
}
