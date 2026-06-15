'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  PlusCircleOutlined,
  SearchOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useProductInventory, useInventoryMovements, useCreateInventoryMovement } from '@/hooks/useInventory';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { ApiClientError } from '@/lib/api-client';
import { formatMoney } from '@shared/format';
import type { AdminProductInventoryRow } from '@shared/types/admin-service-inventory';
import type { AdminInventoryMovement } from '@shared/types/admin-inventory';

const { Title, Text } = Typography;
const { Search } = Input;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function StockCell({ qty, isLowStock }: { qty: number; isLowStock: boolean }) {
  const color = qty <= 0 ? '#ff4d4f' : isLowStock ? '#faad14' : '#52c41a';
  return (
    <span style={{ fontWeight: 700, color, fontSize: 14 }}>{qty}</span>
  );
}

// ─── Adjust Stock Drawer ─────────────────────────────────────────────────────

interface AdjustDrawerProps {
  open: boolean;
  product: AdminProductInventoryRow | null;
  branchId: string;
  warehouseOptions: { value: string; label: string }[];
  onClose: () => void;
}

function AdjustDrawer({ open, product, branchId, warehouseOptions, onClose }: AdjustDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const createMovement = useCreateInventoryMovement();

  async function handleSubmit() {
    if (!product) return;
    const values = await form.validateFields();
    createMovement.mutate(
      {
        branchId,
        warehouseId: values.warehouseId || undefined,
        productId: product.productId,
        type: values.type,
        delta: values.type === 'adjustment' && values.direction === 'out' ? -Math.abs(values.delta) : Math.abs(values.delta),
        reason: values.reason,
        ref: values.ref,
      },
      {
        onSuccess: () => {
          message.success('Stock movement recorded');
          form.resetFields();
          onClose();
        },
        onError: (e) =>
          message.error(e instanceof ApiClientError ? e.message : 'Failed to record movement'),
      },
    );
  }

  return (
    <Drawer
      open={open}
      onClose={() => { form.resetFields(); onClose(); }}
      title={
        <div>
          <div style={{ fontWeight: 700 }}>Adjust Stock</div>
          {product && (
            <div style={{ fontSize: 12, fontWeight: 400, color: '#8c8c8c', marginTop: 2 }}>
              {product.name} · Current: <strong>{product.quantity} {product.uom}</strong>
            </div>
          )}
        </div>
      }
      width={420}
      footer={
        <Space>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={createMovement.isPending}
          >
            Record Movement
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'adjustment', direction: 'in', delta: 1 }}>
        {warehouseOptions.length > 0 && (
          <Form.Item label="Warehouse" name="warehouseId">
            <Select options={[{ value: '', label: 'Branch default' }, ...warehouseOptions]} />
          </Form.Item>
        )}
        <Form.Item label="Movement Type" name="type" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'opening', label: 'Opening Stock' },
              { value: 'purchase', label: 'Purchase (Incoming)' },
              { value: 'adjustment', label: 'Manual Adjustment' },
              { value: 'sale', label: 'Sale (Outgoing)' },
            ]}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, cur) => prev.type !== cur.type}
        >
          {({ getFieldValue }) =>
            getFieldValue('type') === 'adjustment' ? (
              <Form.Item label="Direction" name="direction" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'in', label: '+ Add stock' },
                    { value: 'out', label: '− Remove stock' },
                  ]}
                />
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Form.Item
          label="Quantity"
          name="delta"
          rules={[{ required: true, message: 'Enter a quantity' }, { type: 'number', min: 1, message: 'Must be at least 1' }]}
        >
          <InputNumber style={{ width: '100%' }} min={1} addonAfter={product?.uom} />
        </Form.Item>
        <Form.Item label="Reason" name="reason">
          <Input.TextArea rows={2} placeholder="Why is this adjustment being made?" maxLength={300} />
        </Form.Item>
        <Form.Item label="Reference / PO No." name="ref">
          <Input placeholder="Optional reference number" maxLength={80} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

// ─── Movements Drawer ────────────────────────────────────────────────────────

interface MovementsDrawerProps {
  open: boolean;
  product: AdminProductInventoryRow | null;
  branchId: string;
  onClose: () => void;
}

function MovementsDrawer({ open, product, branchId, onClose }: MovementsDrawerProps) {
  const { data, isLoading } = useInventoryMovements({
    branchId: branchId || undefined,
    productId: product?.productId,
    page: 1,
    limit: 30,
  });

  const MOVE_TYPE_COLOR: Record<string, string> = {
    opening: 'blue',
    purchase: 'green',
    sale: 'red',
    adjustment: 'orange',
    transfer_in: 'cyan',
    transfer_out: 'volcano',
    service_consumption: 'purple',
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div>
          <div style={{ fontWeight: 700 }}>Movement History</div>
          {product && (
            <div style={{ fontSize: 12, fontWeight: 400, color: '#8c8c8c', marginTop: 2 }}>
              {product.sku} · {product.name}
            </div>
          )}
        </div>
      }
      width={500}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : !data?.items.length ? (
        <Empty description="No movements recorded" style={{ marginTop: 48 }} />
      ) : (
        <div>
          {data.items.map((m: AdminInventoryMovement) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '10px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div style={{ flex: 1 }}>
                <Tag color={MOVE_TYPE_COLOR[m.type] ?? 'default'} style={{ marginBottom: 4, fontSize: 10 }}>
                  {m.type.replace(/_/g, ' ').toUpperCase()}
                </Tag>
                {m.reason && (
                  <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>{m.reason}</div>
                )}
                {m.ref && (
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Ref: {m.ref}</div>
                )}
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                  {new Date(m.createdAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {m.createdBy && ` · ${m.createdBy.name}`}
                </div>
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: m.delta > 0 ? '#52c41a' : '#ff4d4f',
                  marginLeft: 16,
                  flexShrink: 0,
                }}
              >
                {m.delta > 0 ? '+' : ''}{m.delta}
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminProductInventoryPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-product-inventory');

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
  const [stockStatus, setStockStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [adjustTarget, setAdjustTarget] = useState<AdminProductInventoryRow | null>(null);
  const [movementsTarget, setMovementsTarget] = useState<AdminProductInventoryRow | null>(null);

  const { data: warehousesData } = useWarehouses({ branchId: branchId || undefined, enabled: Boolean(branchId) });
  const warehouseOptions = useMemo(
    () =>
      (warehousesData?.items ?? []).map((w) => ({
        value: w.id,
        label: `${w.name}${w.isDefault ? ' (default)' : ''}`,
      })),
    [warehousesData],
  );

  const { data, isLoading } = useProductInventory({
    branchId: branchId || null,
    search: search || undefined,
    categoryId: categoryId || undefined,
    stockStatus: stockStatus || 'all',
    page,
    limit,
  });

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;

  const stats = useMemo(() => {
    if (!data) return { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
    const all = data.items;
    return {
      total: data.meta.total,
      inStock: all.filter((r) => r.quantity > 0 && !r.isLowStock).length,
      lowStock: all.filter((r) => r.isLowStock).length,
      outOfStock: all.filter((r) => r.quantity <= 0).length,
    };
  }, [data]);

  const columns: ColumnsType<AdminProductInventoryRow> = [
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
          {row.trackBatches && (
            <Tag color="geekblue" style={{ fontSize: 10, marginTop: 2 }}>Batched</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      width: 140,
      render: (v: string | null) =>
        v ? <Tag color="blue">{v}</Tag> : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      width: 70,
      align: 'center',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      width: 110,
      align: 'right',
      render: (v: number) => (
        <Text style={{ fontWeight: 600, color: '#1677ff' }}>{formatMoney(v)}</Text>
      ),
    },
    {
      title: 'MRP',
      dataIndex: 'mrp',
      width: 100,
      align: 'right',
      render: (v: number) => (
        <Text style={{ color: colors.text.secondary, textDecoration: 'line-through', fontSize: 12 }}>
          {v > 0 ? formatMoney(v) : '—'}
        </Text>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'quantity',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (v: number, row) => <StockCell qty={v} isLowStock={row.isLowStock} />,
    },
    {
      title: 'Reorder',
      dataIndex: 'reorderLevel',
      width: 90,
      align: 'right',
      render: (v: number) =>
        v > 0 ? (
          <Text style={{ color: '#faad14' }}>{v}</Text>
        ) : (
          <Text style={{ color: '#d9d9d9' }}>—</Text>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_v, row) => {
        if (row.quantity <= 0)
          return <Tag icon={<CloseCircleOutlined />} color="error">Out of Stock</Tag>;
        if (row.isLowStock)
          return <Tag icon={<ExclamationCircleOutlined />} color="warning">Low Stock</Tag>;
        return <Tag icon={<CheckCircleOutlined />} color="success">In Stock</Tag>;
      },
    },
    {
      title: 'Last Movement',
      dataIndex: 'lastMovementAt',
      width: 120,
      render: (v: string | null) => (
        <Text style={{ fontSize: 11, color: colors.text.secondary }}>{formatDate(v)}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_v, row) => (
        <Space size={4}>
          <Tooltip title="Adjust Stock">
            <Button
              size="small"
              icon={<PlusCircleOutlined />}
              onClick={() => setAdjustTarget(row)}
              disabled={!branchId}
            />
          </Tooltip>
          <Tooltip title="View Movements">
            <Button
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => setMovementsTarget(row)}
              disabled={!branchId}
            />
          </Tooltip>
        </Space>
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
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: colors.text.primary }}>
          Product Inventory
        </Title>
        <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
          {navItem?.description ?? 'Combined product master and live stock levels per branch.'}
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
              onChange={(v) => { setBranchId(v ?? ''); setPage(1); }}
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
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Status</div>
            <Select
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'in_stock', label: '✅ In Stock' },
                { value: 'low_stock', label: '⚠️ Low Stock' },
                { value: 'out_of_stock', label: '🚫 Out of Stock' },
              ]}
              value={stockStatus}
              onChange={(v) => { setStockStatus(v); setPage(1); }}
            />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</div>
            <Search
              placeholder="SKU, product name, brand…"
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
          {[
            { label: 'Total Products', value: stats.total, color: '#1677ff', bg: '#e6f4ff', border: '#91caff' },
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
                  Select a branch to view product inventory
                </span>
              }
            />
          </div>
        ) : (
          <Table<AdminProductInventoryRow>
            columns={columns}
            dataSource={rows}
            rowKey="productId"
            loading={isLoading}
            size="middle"
            pagination={pagination}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

      {/* Adjust Stock Drawer */}
      <AdjustDrawer
        open={Boolean(adjustTarget)}
        product={adjustTarget}
        branchId={branchId}
        warehouseOptions={warehouseOptions}
        onClose={() => setAdjustTarget(null)}
      />

      {/* Movement History Drawer */}
      <MovementsDrawer
        open={Boolean(movementsTarget)}
        product={movementsTarget}
        branchId={branchId}
        onClose={() => setMovementsTarget(null)}
      />
    </div>
  );
}
