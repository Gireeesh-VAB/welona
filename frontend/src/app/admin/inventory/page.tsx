'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  HistoryOutlined,
  MinusOutlined,
  PlusOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import {
  useCreateInventoryMovement,
  useInventoryMovements,
  useInventoryStock,
  useSetOpeningStock,
} from '@/hooks/useInventory';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useProducts } from '@/hooks/useProducts';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError, getSessionKind } from '@/lib/api-client';
import { useBranchAuthStore } from '@/store/branchAuthStore';
import { getAdminNavItem } from '@/config/adminNavigation';
import type {
  AdminInventoryMovement,
  AdminInventoryStockRow,
} from '@shared/types/admin-inventory';
import {
  INVENTORY_MOVEMENT_TYPES,
  type InventoryMovementType,
} from '@shared/enums';

const { Title, Text } = Typography;

const MOVEMENT_TAG_COLOR: Record<InventoryMovementType, string> = {
  opening: 'gold',
  purchase: 'green',
  sale: 'blue',
  adjustment: 'purple',
  transfer_in: 'cyan',
  transfer_out: 'volcano',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface MovementFormValues {
  type: InventoryMovementType;
  direction: 'in' | 'out';
  quantity: number;
  reason?: string;
  ref?: string;
}

export default function AdminInventoryPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory')!;
  const { message } = App.useApp();

  // Branch sessions are locked to their own branch; admins pick any branch.
  // Guard against a stale `welona-session-kind` in localStorage: only treat
  // this as a branch session if a branch user is actually loaded, otherwise an
  // admin could be misclassified and the branch list would never load.
  const branchSession = useBranchAuthStore((s) => s.branch);
  const isBranchSession = getSessionKind() === 'branch' && Boolean(branchSession);

  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: !isBranchSession });
  const branchOptions = useMemo(
    () =>
      isBranchSession && branchSession
        ? [
            {
              value: branchSession.branchId,
              label: branchSession.branchName ?? branchSession.userName,
            },
          ]
        : (branchesData?.items ?? []).map((b) => ({
            value: b.id,
            label: `${b.branchName} (${b.branchCode})`,
          })),
    [isBranchSession, branchSession, branchesData],
  );

  const [branchId, setBranchId] = useState<string | undefined>();
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  // Warehouses for the selected branch — drill stock into one, or leave blank
  // for a branch-wide rollup across all warehouses.
  const { data: warehousesData } = useWarehouses({
    branchId,
    active: 'active',
    limit: 200,
    enabled: Boolean(branchId),
  });
  const warehouseOptions = useMemo(
    () => (warehousesData?.items ?? []).map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
    [warehousesData],
  );

  // Product picker options for the search dropdown (independent of the current
  // filter, so the full list is always available to choose from).
  const { data: productsData } = useProducts({ isActive: true, limit: 500 });
  const productSearchOptions = useMemo(
    () =>
      (productsData?.items ?? []).map((p) => ({
        value: p.sku,
        label: `${p.name} (${p.sku})${p.brand ? ` · ${p.brand}` : ''}`,
      })),
    [productsData],
  );

  // Auto-pick the branch: the session's own branch for branch users, else the
  // first branch in the list so the page doesn't feel empty.
  useEffect(() => {
    if (isBranchSession) {
      if (branchSession?.branchId) setBranchId(branchSession.branchId);
    } else if (!branchId && branchesData?.items[0]) {
      setBranchId(branchesData.items[0].id);
    }
  }, [isBranchSession, branchSession, branchId, branchesData]);

  const { data: stockData, isLoading: stockLoading } = useInventoryStock({
    branchId: branchId ?? null,
    warehouseId,
    search: search || undefined,
    lowStockOnly: lowOnly || undefined,
    limit: 500,
  });

  const { data: movementsData, isLoading: movementsLoading } = useInventoryMovements({
    branchId,
    limit: 30,
  });

  const createMovement = useCreateInventoryMovement();
  const setOpening = useSetOpeningStock();

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  // ---- Movement modal ----
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveProduct, setMoveProduct] = useState<AdminInventoryStockRow | null>(null);
  const [moveForm] = Form.useForm<MovementFormValues>();

  const openMove = (product: AdminInventoryStockRow, defaultType: InventoryMovementType) => {
    setMoveProduct(product);
    moveForm.resetFields();
    moveForm.setFieldsValue({
      type: defaultType,
      direction: defaultType === 'sale' ? 'out' : 'in',
      quantity: 1,
    });
    setMoveOpen(true);
  };

  const onMoveSubmit = async (values: MovementFormValues) => {
    if (!branchId || !moveProduct) return;
    const signedDelta =
      values.direction === 'in' ? Math.abs(values.quantity) : -Math.abs(values.quantity);
    try {
      await createMovement.mutateAsync({
        branchId,
        warehouseId,
        productId: moveProduct.productId,
        type: values.type,
        delta: signedDelta,
        reason: values.reason?.trim() || undefined,
        ref: values.ref?.trim() || undefined,
      });
      message.success(`${values.type} recorded`);
      setMoveOpen(false);
    } catch (err) {
      fail(err, 'Could not record movement');
    }
  };

  // ---- Opening-stock drawer ----
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingEdits, setOpeningEdits] = useState<Record<string, number>>({});

  const openOpening = () => {
    const seed: Record<string, number> = {};
    (stockData?.items ?? []).forEach((r) => {
      seed[r.productId] = r.quantity;
    });
    setOpeningEdits(seed);
    setOpeningOpen(true);
  };

  const onOpeningSave = async () => {
    if (!branchId) return;
    const entries = Object.entries(openingEdits)
      .filter(([, v]) => Number.isFinite(v))
      .map(([productId, quantity]) => ({ productId, quantity }));
    if (entries.length === 0) {
      message.warning('Nothing to save');
      return;
    }
    try {
      await setOpening.mutateAsync({ branchId, warehouseId, entries });
      message.success(`Opening stock saved for ${entries.length} product(s)`);
      setOpeningOpen(false);
    } catch (err) {
      fail(err, 'Could not save opening stock');
    }
  };

  // ---- Summary stats ----
  const summary = useMemo(() => {
    const rows = stockData?.items ?? [];
    return {
      products: rows.length,
      totalUnits: rows.reduce((sum, r) => sum + r.quantity, 0),
      low: rows.filter((r) => r.isLowStock).length,
      outOfStock: rows.filter((r) => r.quantity === 0).length,
    };
  }, [stockData]);

  const columns: ColumnsType<AdminInventoryStockRow> = [
    {
      title: 'Product',
      dataIndex: 'name',
      width: 280,
      fixed: 'left',
      render: (_, row) => (
        <div>
          <Text strong style={{ color: colors.text.primary }}>
            {row.name}
          </Text>
          <div>
            <Text code style={{ fontSize: 11 }}>{row.sku}</Text>
            {row.brand && (
              <Text style={{ color: colors.text.placeholder, fontSize: 12, marginLeft: 8 }}>
                {row.brand}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'On hand',
      dataIndex: 'quantity',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (v: number, row) => (
        <Space>
          <Text
            strong
            style={{
              color:
                v === 0
                  ? colors.status.error
                  : row.isLowStock
                    ? colors.status.warning
                    : colors.text.primary,
              fontSize: 16,
            }}
          >
            {v}
          </Text>
          {row.isLowStock && (
            <Tooltip title={`Reorder level: ${row.reorderLevel}`}>
              <WarningOutlined style={{ color: colors.status.warning }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Reorder level',
      dataIndex: 'reorderLevel',
      width: 110,
      align: 'right',
      render: (v: number) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Last movement',
      dataIndex: 'lastMovementAt',
      width: 180,
      render: (v: string | null) =>
        v ? formatDate(v) : <Text type="secondary">never</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="Receive stock (purchase / opening)">
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openMove(row, 'purchase')}
              style={{ background: '#16a34a', borderColor: '#16a34a' }}
            >
              In
            </Button>
          </Tooltip>
          <Tooltip title="Issue stock (sale / consumption)">
            <Button
              size="small"
              icon={<MinusOutlined />}
              onClick={() => openMove(row, 'sale')}
              disabled={row.quantity === 0}
              style={{
                background: row.quantity === 0 ? undefined : colors.status.error,
                borderColor: row.quantity === 0 ? undefined : colors.status.error,
                color: row.quantity === 0 ? undefined : '#FFFFFF',
              }}
            >
              Out
            </Button>
          </Tooltip>
          <Tooltip title="Adjust">
            <Button
              size="small"
              onClick={() => openMove(row, 'adjustment')}
            >
              Adjust
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            {navItem.label}
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={openOpening}>
            Set opening stock
          </Button>
        </Space>
      </div>

      {/* ---- Filter strip ---- */}
      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 12 }}
        styles={{ body: { padding: 12 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8}>
            <Space.Compact style={{ width: '100%' }}>
              <Select
                showSearch
                placeholder="Pick a branch"
                value={branchId}
                onChange={(v) => { setBranchId(v); setWarehouseId(undefined); }}
                options={branchOptions}
                disabled={isBranchSession}
                style={{ width: '60%' }}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
              <Select
                allowClear
                placeholder="All warehouses"
                value={warehouseId}
                onChange={setWarehouseId}
                options={warehouseOptions}
                style={{ width: '40%' }}
              />
            </Space.Compact>
          </Col>
          <Col xs={24} sm={8}>
            <Select
              showSearch
              allowClear
              placeholder="Search / pick a product"
              value={search || undefined}
              onChange={(v) => setSearch(v ?? '')}
              options={productSearchOptions}
              style={{ width: '100%' }}
              suffixIcon={<SearchOutlined />}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent="No matching product"
            />
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
            <Space>
              <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                Low stock only
              </Text>
              <Switch
                checked={lowOnly}
                onChange={setLowOnly}
                checkedChildren="Yes"
                unCheckedChildren="No"
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ---- KPIs ---- */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            loading={stockLoading || !branchId}
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          >
            <Statistic
              title={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>PRODUCTS IN VIEW</Text>}
              value={summary.products}
              valueStyle={{ color: colors.text.primary }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            loading={stockLoading || !branchId}
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          >
            <Statistic
              title={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>TOTAL UNITS ON HAND</Text>}
              value={summary.totalUnits}
              valueStyle={{ color: colors.gold.primary }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            loading={stockLoading || !branchId}
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          >
            <Statistic
              title={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>LOW STOCK</Text>}
              value={summary.low}
              valueStyle={{ color: colors.status.warning }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            loading={stockLoading || !branchId}
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          >
            <Statistic
              title={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>OUT OF STOCK</Text>}
              value={summary.outOfStock}
              valueStyle={{ color: colors.status.error }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col span={24}>
          <Spin spinning={stockLoading} tip="Loading stock…">
            <Card
              title="Stock on hand"
              style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
              styles={{ body: { padding: 0 } }}
              extra={
                branchId && summary.low > 0 ? (
                  <Badge count={summary.low} style={{ background: colors.status.warning }} />
                ) : null
              }
            >
              {!branchId ? (
                <Empty description="Pick a branch to see its stock" />
              ) : (
                <Table<AdminInventoryStockRow>
                  rowKey="productId"
                  columns={columns}
                  dataSource={stockData?.items ?? []}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  size="middle"
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: 'No products yet — add some under Master → Products' }}
                />
              )}
            </Card>
          </Spin>
        </Col>

        <Col span={24}>
          <Card
            title={
              <Space>
                <HistoryOutlined />
                <span>Recent movements</span>
              </Space>
            }
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          >
            {movementsLoading ? (
              <Spin />
            ) : (movementsData?.items.length ?? 0) === 0 ? (
              <Empty description="No movements logged yet" />
            ) : (
              <List<AdminInventoryMovement>
                dataSource={movementsData?.items ?? []}
                size="small"
                renderItem={(m) => (
                  <List.Item
                    style={{ padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={6} wrap>
                          <Tag color={MOVEMENT_TAG_COLOR[m.type]}>{m.type}</Tag>
                          <Text strong style={{ color: colors.text.primary }}>
                            {m.product.name}
                          </Text>
                          <Text
                            style={{
                              color: m.delta > 0 ? colors.status.success : colors.status.error,
                              fontWeight: 600,
                            }}
                          >
                            {m.delta > 0 ? `+${m.delta}` : m.delta} {m.product.uom}
                          </Text>
                        </Space>
                      }
                      description={
                        <span style={{ color: colors.text.placeholder, fontSize: 12 }}>
                          {formatDate(m.createdAt)}
                          {m.reason ? ` · ${m.reason}` : ''}
                          {m.ref ? ` · ${m.ref}` : ''}
                          {m.createdBy ? ` · by ${m.createdBy.name}` : ''}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ---- Movement modal ---- */}
      <Modal
        title={
          moveProduct
            ? `Move stock — ${moveProduct.name}`
            : 'Move stock'
        }
        open={moveOpen}
        onCancel={() => setMoveOpen(false)}
        onOk={() => moveForm.submit()}
        okText="Record movement"
        confirmLoading={createMovement.isPending}
        destroyOnClose
      >
        {moveProduct && (
          <div style={{ marginBottom: 12 }}>
            <Space size={12} wrap>
              <Text code>{moveProduct.sku}</Text>
              <Text type="secondary">Current on-hand:</Text>
              <Text strong>
                {moveProduct.quantity} {moveProduct.uom}
              </Text>
            </Space>
          </div>
        )}
        <Form<MovementFormValues>
          form={moveForm}
          layout="vertical"
          onFinish={onMoveSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item label="Type" name="type" rules={[{ required: true }]}>
            <Segmented
              // Transfer movements are created via the Stock Transfers flow, not
              // the manual movement form.
              options={INVENTORY_MOVEMENT_TYPES.filter(
                (t) => t !== 'transfer_in' && t !== 'transfer_out',
              ).map((t) => ({ value: t, label: t }))}
            />
          </Form.Item>
          <Form.Item label="Direction" name="direction" rules={[{ required: true }]}>
            <Segmented
              options={[
                { value: 'in', label: 'Stock in (+)' },
                { value: 'out', label: 'Stock out (−)' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Quantity"
            name="quantity"
            rules={[{ required: true, message: 'Quantity is required' }]}
          >
            <InputNumber min={1} max={1000000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Reference" name="ref" tooltip="Invoice / PO / GRN number">
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item label="Reason / note" name="reason">
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* ---- Opening-stock drawer ---- */}
      <Drawer
        title="Set opening stock"
        open={openingOpen}
        onClose={() => setOpeningOpen(false)}
        width={520}
        extra={
          <Button type="primary" loading={setOpening.isPending} onClick={onOpeningSave}>
            Save opening stock
          </Button>
        }
      >
        <Text type="secondary">
          Enter the starting quantity for each product at this branch. Re-saving adjusts the
          opening row so the recorded quantity matches what you enter.
        </Text>
        <div style={{ marginTop: 12 }}>
          {(stockData?.items ?? []).map((row) => (
            <Row key={row.productId} gutter={8} style={{ marginBottom: 8 }} align="middle">
              <Col flex="auto">
                <Text strong>{row.name}</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {row.sku} · {row.uom}
                  </Text>
                </div>
              </Col>
              <Col>
                <InputNumber
                  min={0}
                  value={openingEdits[row.productId] ?? row.quantity}
                  onChange={(v) =>
                    setOpeningEdits((prev) => ({
                      ...prev,
                      [row.productId]: typeof v === 'number' ? v : 0,
                    }))
                  }
                />
              </Col>
            </Row>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
