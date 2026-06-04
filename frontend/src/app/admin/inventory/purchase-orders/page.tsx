'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  usePurchaseOrders,
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
  useCreateGoodsReceipt,
} from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminPurchaseOrder } from '@shared/types/admin-purchase-order';
import type { AdminPurchaseOrderCreateInput } from '@shared/schemas/admin-purchase-orders';
import { PURCHASE_ORDER_STATUSES, type PurchaseOrderStatus } from '@shared/enums';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<PurchaseOrderStatus, string> = {
  draft: 'default',
  sent: 'blue',
  partially_received: 'gold',
  received: 'green',
  cancelled: 'red',
};
const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_received: 'Partially received',
  received: 'Received',
  cancelled: 'Cancelled',
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface POItemForm {
  productId?: string;
  quantity?: number;
  unitPriceRupees?: number;
  taxPercent?: number;
}
interface POForm {
  branchId?: string;
  supplierId?: string;
  notes?: string;
  items: POItemForm[];
}

export default function AdminPurchaseOrdersPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-purchase-orders')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PurchaseOrderStatus | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = usePurchaseOrders({
    search: search || undefined,
    status,
    page,
    limit,
  });

  const { data: suppliersData } = useSuppliers({ active: 'active', limit: 200 });
  const { data: productsData } = useProducts({ isActive: true, limit: 200 });
  const { data: branchesData } = useAdminBranches({ limit: 200 });

  const supplierOptions = useMemo(
    () => (suppliersData?.items ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
    [suppliersData],
  );
  const productOptions = useMemo(
    () => (productsData?.items ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.sku})`, purchasePrice: p.purchasePrice, taxPercent: p.taxPercent })),
    [productsData],
  );
  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    [branchesData],
  );

  const createPO = useCreatePurchaseOrder();
  const deletePO = useDeletePurchaseOrder();
  const createGRN = useCreateGoodsReceipt();

  const fail = (err: unknown, fb: string) =>
    message.error(err instanceof ApiClientError ? err.message : fb);

  // ---- Create modal ----
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<POForm>();

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ items: [{}] });
    setCreateOpen(true);
  };

  const onCreate = async (values: POForm) => {
    const items = (values.items ?? [])
      .filter((it) => it.productId && it.quantity)
      .map((it) => ({
        productId: it.productId as string,
        quantity: Number(it.quantity),
        unitPrice: Math.round(Number(it.unitPriceRupees ?? 0) * 100),
        taxRate: Math.round(Number(it.taxPercent ?? 0) * 100),
      }));
    if (items.length === 0) {
      message.error('Add at least one line item with a product and quantity');
      return;
    }
    const body: AdminPurchaseOrderCreateInput = {
      branchId: values.branchId as string,
      supplierId: values.supplierId as string,
      notes: values.notes?.trim() || undefined,
      items,
    };
    try {
      await createPO.mutateAsync(body);
      message.success('Purchase order created');
      setCreateOpen(false);
    } catch (err) {
      fail(err, 'Could not create purchase order');
    }
  };

  // ---- Detail / receive drawer ----
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: activePO } = usePurchaseOrder(activeId);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  // Batch number + expiry per product, for batch-tracked lines.
  const [receiveBatch, setReceiveBatch] = useState<Record<string, { batchNo?: string; expiryDate?: string }>>({});

  const openDetail = (id: string) => {
    setReceiveQty({});
    setReceiveBatch({});
    setActiveId(id);
  };

  const onReceive = async () => {
    if (!activePO) return;
    const trackedByProduct = new Map(activePO.items.map((it) => [it.product.id, it.product.trackBatches]));
    const items = Object.entries(receiveQty)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity,
        batchNo: receiveBatch[productId]?.batchNo,
        expiryDate: receiveBatch[productId]?.expiryDate,
      }));
    if (items.length === 0) {
      message.warning('Enter a quantity to receive');
      return;
    }
    // Require a batch number for batch-tracked products being received.
    const missing = items.find((i) => trackedByProduct.get(i.productId) && !i.batchNo?.trim());
    if (missing) {
      message.error('Enter a batch number for batch-tracked products.');
      return;
    }
    try {
      await createGRN.mutateAsync({ poId: activePO.id, items });
      message.success('Goods received — stock updated');
      setReceiveQty({});
      setReceiveBatch({});
      setActiveId(null);
    } catch (err) {
      fail(err, 'Could not receive goods');
    }
  };

  const onDelete = async (po: AdminPurchaseOrder) => {
    try {
      await deletePO.mutateAsync(po.id);
      message.success('Purchase order deleted');
    } catch (err) {
      fail(err, 'Delete failed');
    }
  };

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: data?.meta.total ?? 0,
      open: items.filter((p) => ['draft', 'sent', 'partially_received'].includes(p.status)).length,
      received: items.filter((p) => p.status === 'received').length,
    };
  }, [data]);

  const columns: ColumnsType<AdminPurchaseOrder> = [
    {
      title: 'PO',
      dataIndex: 'number',
      width: 130,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Supplier',
      key: 'supplier',
      width: 200,
      render: (_v, po) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{po.supplier.name}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{po.branch.name}</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (s: PurchaseOrderStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: 'Items',
      key: 'items',
      width: 80,
      align: 'center',
      render: (_v, po) => po.items.length,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 130,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 600 }}>{rupees(v)}</span>,
    },
    {
      title: 'Ordered',
      dataIndex: 'orderedAt',
      width: 120,
      render: (v: string) => formatDate(v),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      align: 'right',
      fixed: 'right',
      render: (_v, po) => (
        <Space size={4}>
          <Tooltip title="View / receive">
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => openDetail(po.id)} />
          </Tooltip>
          {(po.status === 'draft' || po.status === 'cancelled') && (
            <Popconfirm
              title={`Delete ${po.number}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(po)}
            >
              <Tooltip title="Delete">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50],
    onChange: (p, sz) => {
      setPage(p);
      if (sz !== limit) setLimit(sz);
    },
    showTotal: (t) => `${t} purchase order${t === 1 ? '' : 's'}`,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Purchase Order</Button>
      </div>

      <Space size={12} style={{ display: 'flex', marginBottom: 16 }} wrap>
        {[
          { label: 'TOTAL POs', value: stats.total, color: colors.gold.primary },
          { label: 'OPEN', value: stats.open, color: colors.text.primary },
          { label: 'RECEIVED (view)', value: stats.received, color: colors.text.primary },
        ].map((s) => (
          <Card key={s.label} size="small"
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, minWidth: 170 }}
            styles={{ body: { padding: '12px 16px' } }}>
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>{s.label}</span>}
              value={s.value}
              valueStyle={{ color: s.color, fontWeight: 600 }}
            />
          </Card>
        ))}
      </Space>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search PO number, supplier or notes"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 380, width: '100%' }}
          />
          <Select
            allowClear
            placeholder="All statuses"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            style={{ width: 200 }}
            options={PURCHASE_ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          />
        </div>

        <Table<AdminPurchaseOrder>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 900 }}
        />
      </Card>

      {/* ---- Create PO modal ---- */}
      <Modal
        title="New Purchase Order"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        okText="Create"
        confirmLoading={createPO.isPending}
        width={760}
        destroyOnClose
      >
        <Form<POForm> form={form} layout="vertical" onFinish={onCreate} requiredMark={false}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Branch" name="branchId" rules={[{ required: true, message: 'Select a branch' }]}>
                <Select showSearch placeholder="Pick a branch" options={branchOptions}
                  filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Supplier" name="supplierId" rules={[{ required: true, message: 'Select a supplier' }]}>
                <Select showSearch placeholder="Pick a supplier" options={supplierOptions}
                  filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ color: colors.text.primary }}>Line items</Text>
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>Add line</Button>
                </div>
                {fields.map(({ key, name, ...rest }) => (
                  <Row gutter={8} key={key} align="middle" style={{ marginBottom: 4 }}>
                    <Col span={9}>
                      <Form.Item {...rest} name={[name, 'productId']} rules={[{ required: true, message: 'Product' }]} style={{ marginBottom: 8 }}>
                        <Select
                          showSearch placeholder="Product" options={productOptions}
                          filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
                          onChange={(val) => {
                            const opt = productOptions.find((o) => o.value === val);
                            if (opt) {
                              const cur = form.getFieldValue(['items', name]) ?? {};
                              form.setFields([{ name: ['items', name], value: {
                                ...cur,
                                productId: val,
                                unitPriceRupees: cur.unitPriceRupees ?? opt.purchasePrice / 100,
                                taxPercent: cur.taxPercent ?? opt.taxPercent / 100,
                              } }]);
                            }
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true, message: 'Qty' }]} style={{ marginBottom: 8 }}>
                        <InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item {...rest} name={[name, 'unitPriceRupees']} style={{ marginBottom: 8 }}>
                        <InputNumber min={0} prefix="₹" placeholder="Unit price" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item {...rest} name={[name, 'taxPercent']} style={{ marginBottom: 8 }}>
                        <InputNumber min={0} max={100} suffix="%" placeholder="Tax" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </Form.List>

          <Form.Item label="Notes" name="notes" style={{ marginTop: 8 }}>
            <Input.TextArea rows={2} maxLength={500} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ---- Detail / receive drawer ---- */}
      <Drawer
        title={activePO ? `${activePO.number} — ${activePO.supplier.name}` : 'Purchase Order'}
        open={Boolean(activeId)}
        onClose={() => setActiveId(null)}
        width={680}
        extra={
          activePO && activePO.status !== 'received' && activePO.status !== 'cancelled' ? (
            <Button type="primary" icon={<DownloadOutlined />} loading={createGRN.isPending} onClick={onReceive}>
              Receive entered qty
            </Button>
          ) : null
        }
      >
        {activePO && (
          <>
            <Space size={16} style={{ marginBottom: 16 }} wrap>
              <Tag color={STATUS_COLOR[activePO.status]}>{STATUS_LABEL[activePO.status]}</Tag>
              <Text style={{ color: colors.text.placeholder }}>Branch: {activePO.branch.name}</Text>
              <Text style={{ color: colors.text.placeholder }}>Total: {rupees(activePO.total)}</Text>
            </Space>
            <Table
              rowKey={(r) => r.id}
              size="small"
              pagination={false}
              dataSource={activePO.items}
              columns={[
                { title: 'Product', key: 'p', render: (_v, it) => (
                  <div><div>{it.product.name}</div><Text code style={{ fontSize: 11 }}>{it.product.sku}</Text></div>
                ) },
                { title: 'Ordered', dataIndex: 'quantity', width: 80, align: 'center' },
                { title: 'Received', dataIndex: 'quantityReceived', width: 90, align: 'center',
                  render: (v: number, it) => (
                    <Text style={{ color: v >= it.quantity ? colors.status.success : colors.text.primary }}>{v}</Text>
                  ) },
                {
                  title: 'Receive now',
                  key: 'recv',
                  width: 110,
                  render: (_v, it) => {
                    const remaining = it.quantity - it.quantityReceived;
                    const disabled = remaining <= 0 || activePO.status === 'received' || activePO.status === 'cancelled';
                    return (
                      <InputNumber
                        min={0}
                        max={remaining}
                        disabled={disabled}
                        value={receiveQty[it.product.id] ?? 0}
                        onChange={(v) => setReceiveQty((m) => ({ ...m, [it.product.id]: Number(v ?? 0) }))}
                        style={{ width: '100%' }}
                      />
                    );
                  },
                },
                {
                  title: 'Batch / expiry',
                  key: 'batch',
                  width: 220,
                  render: (_v, it) =>
                    it.product.trackBatches ? (
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          placeholder="Batch no."
                          value={receiveBatch[it.product.id]?.batchNo ?? ''}
                          onChange={(e) =>
                            setReceiveBatch((m) => ({ ...m, [it.product.id]: { ...m[it.product.id], batchNo: e.target.value } }))
                          }
                          style={{ width: '55%' }}
                        />
                        <DatePicker
                          placeholder="Expiry"
                          value={receiveBatch[it.product.id]?.expiryDate ? dayjs(receiveBatch[it.product.id]!.expiryDate) : null}
                          onChange={(d) =>
                            setReceiveBatch((m) => ({ ...m, [it.product.id]: { ...m[it.product.id], expiryDate: d ? d.toISOString() : undefined } }))
                          }
                          style={{ width: '45%' }}
                        />
                      </Space.Compact>
                    ) : (
                      <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>—</Text>
                    ),
                },
              ]}
            />
            {activePO.notes && (
              <div style={{ marginTop: 12 }}>
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Notes: {activePO.notes}</Text>
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
