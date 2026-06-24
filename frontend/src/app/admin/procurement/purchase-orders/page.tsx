'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
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
import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  SplitCellsOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
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
  supplierId?: string;
  quantity?: number;
  unitPriceRupees?: number;
  taxPercent?: number;
}
interface POForm {
  notes?: string;
  items: POItemForm[];
}

export default function AdminPurchaseOrdersPage() {
  const colors = useBrandColors();
  const router = useRouter();
  const navItem = getAdminNavItem('procurement-purchase-orders')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PurchaseOrderStatus | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<POForm>();

  const { data, isLoading } = usePurchaseOrders({ search: search || undefined, status, page, limit });
  const { data: suppliersData } = useSuppliers({ active: 'active', limit: 200 });
  const { data: productsData } = useProducts({ isActive: true, limit: 200 });
  const { data: branchesData } = useAdminBranches({ limit: 200 });

  // Watch form items to compute split summary
  const formItems = Form.useWatch('items', form) as POItemForm[] | undefined;

  const allProductOptions = useMemo(
    () => (productsData?.items ?? []).map((p) => ({
      value: p.id,
      label: `${p.name} (${p.sku})`,
      purchasePrice: p.purchasePrice,
      taxPercent: p.taxPercent,
    })),
    [productsData],
  );

  // Given a productId, returns only the suppliers who carry it (with match label)
  const getSuppliersForProduct = (productId: string | undefined) => {
    if (!productId) return (suppliersData?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
    return (suppliersData?.items ?? [])
      .filter((s) => s.productIds?.includes(productId))
      .map((s) => ({ value: s.id, label: s.name }));
  };

  // How many POs will be created and which supplier covers which items
  const splitSummary = useMemo(() => {
    const items = (formItems ?? []).filter((i) => i.productId);
    const bySupplier = new Map<string, { name: string; count: number }>();
    let unassigned = 0;
    for (const item of items) {
      if (!item.supplierId) { unassigned++; continue; }
      const supplier = suppliersData?.items.find((s) => s.id === item.supplierId);
      const existing = bySupplier.get(item.supplierId);
      if (existing) { existing.count++; }
      else { bySupplier.set(item.supplierId, { name: supplier?.name ?? '?', count: 1 }); }
    }
    return { groups: [...bySupplier.entries()], unassigned, total: items.length };
  }, [formItems, suppliersData]);

  const createPO = useCreatePurchaseOrder();
  const deletePO = useDeletePurchaseOrder();

  const fail = (err: unknown, fb: string) =>
    message.error(err instanceof ApiClientError ? err.message : fb);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ items: [{}] });
    setCreateOpen(true);
  };

  const onProductChange = (val: string, name: number) => {
    const opt = allProductOptions.find((o) => o.value === val);
    if (!opt) return;
    const cur = form.getFieldValue(['items', name]) ?? {};
    form.setFields([{
      name: ['items', name],
      value: {
        ...cur,
        productId: val,
        supplierId: undefined,  // clear supplier — product changed
        unitPriceRupees: opt.purchasePrice / 100,
        taxPercent: cur.taxPercent ?? opt.taxPercent / 100,
      },
    }]);
  };

  const onLineSupplierChange = (supplierId: string, name: number) => {
    const item = form.getFieldValue(['items', name]) as POItemForm;
    if (!item.productId) return;
    const supplier = suppliersData?.items.find((s) => s.id === supplierId);
    const priceEntry = supplier?.productPrices?.find((p) => p.productId === item.productId);
    if (priceEntry?.unitPrice != null) {
      form.setFieldValue(['items', name, 'unitPriceRupees'], priceEntry.unitPrice / 100);
    }
  };

  const onCreate = async (values: POForm) => {
    const validItems = (values.items ?? []).filter((it) => it.productId && it.quantity && it.supplierId);
    if (validItems.length === 0) {
      message.error('Add at least one line item with product, quantity and supplier');
      return;
    }
    const defaultBranchId = branchesData?.items?.[0]?.id;
    if (!defaultBranchId) {
      message.error('No branch found. Please configure a branch first.');
      return;
    }
    // Group by supplier — one PO per supplier
    const bySupplier = new Map<string, typeof validItems>();
    for (const item of validItems) {
      const group = bySupplier.get(item.supplierId!) ?? [];
      group.push(item);
      bySupplier.set(item.supplierId!, group);
    }
    try {
      for (const [supplierId, supplierItems] of bySupplier) {
        const body: AdminPurchaseOrderCreateInput = {
          branchId: defaultBranchId,
          supplierId,
          notes: values.notes?.trim() || undefined,
          items: supplierItems.map((it) => ({
            productId: it.productId as string,
            quantity: Number(it.quantity),
            unitPrice: Math.round(Number(it.unitPriceRupees ?? 0) * 100),
            taxRate: Math.round(Number(it.taxPercent ?? 0) * 100),
          })),
        };
        await createPO.mutateAsync(body);
      }
      const n = bySupplier.size;
      message.success(`Created ${n} purchase order${n > 1 ? 's' : ''}`);
      setCreateOpen(false);
    } catch (err) {
      fail(err, 'Could not create purchase orders');
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
            <Button size="small" type="text" icon={<EyeOutlined />}
              onClick={() => router.push(`/admin/procurement/purchase-orders/${po.id}`)} />
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
    onChange: (p, sz) => { setPage(p); if (sz !== limit) setLimit(sz); },
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

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Input allowClear prefix={<SearchOutlined />}
            placeholder="Search PO number, supplier or notes"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 380, width: '100%' }}
          />
          <Select allowClear placeholder="All statuses" value={status}
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
        okText={splitSummary.groups.length > 1
          ? `Create ${splitSummary.groups.length} Purchase Orders`
          : 'Create Purchase Order'}
        confirmLoading={createPO.isPending}
        width={900}
        destroyOnClose
      >
        <Form<POForm> form={form} layout="vertical" onFinish={onCreate} requiredMark={false}>

          {/* Step 1 — Line Items */}
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ color: colors.text.primary }}>Line Items</Text>
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>
                    Add line
                  </Button>
                </div>

                {/* Column headers */}
                <Row gutter={6} style={{ marginBottom: 4 }}>
                  <Col span={8}><Text style={{ fontSize: 11, color: colors.text.placeholder }}>Product</Text></Col>
                  <Col span={3}><Text style={{ fontSize: 11, color: colors.text.placeholder }}>Qty</Text></Col>
                  <Col span={6}><Text style={{ fontSize: 11, color: colors.text.placeholder }}>Supplier</Text></Col>
                  <Col span={4}><Text style={{ fontSize: 11, color: colors.text.placeholder }}>Unit Price (₹)</Text></Col>
                  <Col span={2}><Text style={{ fontSize: 11, color: colors.text.placeholder }}>Tax %</Text></Col>
                </Row>

                {fields.map(({ key, name, ...rest }) => {
                  const lineProductId = formItems?.[name]?.productId;
                  const supplierOpts = getSuppliersForProduct(lineProductId);
                  return (
                    <Row gutter={6} key={key} align="middle" style={{ marginBottom: 4 }}>
                      <Col span={8}>
                        <Form.Item {...rest} name={[name, 'productId']}
                          rules={[{ required: true, message: 'Product' }]}
                          style={{ marginBottom: 8 }}>
                          <Select
                            showSearch
                            placeholder="Search product…"
                            options={allProductOptions.map((o) => ({ value: o.value, label: o.label }))}
                            filterOption={(i, o) =>
                              (o?.label?.toString() ?? '').toLowerCase().includes(i.toLowerCase())
                            }
                            onChange={(val) => onProductChange(val, name)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item {...rest} name={[name, 'quantity']}
                          rules={[{ required: true, message: 'Qty' }]}
                          style={{ marginBottom: 8 }}>
                          <InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...rest} name={[name, 'supplierId']}
                          rules={[{ required: true, message: 'Supplier' }]}
                          style={{ marginBottom: 8 }}>
                          <Select
                            showSearch
                            placeholder={lineProductId
                              ? supplierOpts.length > 0 ? 'Choose supplier…' : 'No supplier mapped'
                              : 'Pick product first'}
                            disabled={!lineProductId}
                            options={supplierOpts}
                            filterOption={(i, o) =>
                              (o?.label?.toString() ?? '').toLowerCase().includes(i.toLowerCase())
                            }
                            onChange={(val) => onLineSupplierChange(val, name)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...rest} name={[name, 'unitPriceRupees']} style={{ marginBottom: 8 }}>
                          <InputNumber min={0} prefix="₹" placeholder="Price" style={{ width: '100%' }} precision={2} />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Form.Item {...rest} name={[name, 'taxPercent']} style={{ marginBottom: 8 }}>
                          <InputNumber min={0} max={100} suffix="%" placeholder="%" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={1}>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </Col>
                    </Row>
                  );
                })}
              </>
            )}
          </Form.List>

          {/* Split summary — shown when at least one line has a supplier */}
          {splitSummary.groups.length > 0 && (
            <Alert
              type="info"
              showIcon
              icon={<SplitCellsOutlined />}
              style={{ marginTop: 8, marginBottom: 8, padding: '6px 12px' }}
              message={
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text style={{ fontSize: 13 }}>
                    Will create <strong>{splitSummary.groups.length} Purchase Order{splitSummary.groups.length > 1 ? 's' : ''}</strong>:
                  </Text>
                  {splitSummary.groups.map(([supplierId, info]) => (
                    <Text key={supplierId} style={{ fontSize: 12 }}>
                      • <strong>{info.name}</strong> — {info.count} item{info.count > 1 ? 's' : ''}
                    </Text>
                  ))}
                  {splitSummary.unassigned > 0 && (
                    <Text style={{ fontSize: 12, color: '#faad14' }}>
                      <WarningOutlined /> {splitSummary.unassigned} item{splitSummary.unassigned > 1 ? 's' : ''} still need a supplier
                    </Text>
                  )}
                </Space>
              }
            />
          )}

          <Form.Item label="Notes" name="notes" style={{ marginTop: 4 }}>
            <Input.TextArea rows={2} maxLength={500} placeholder="Optional — applies to all POs created" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
