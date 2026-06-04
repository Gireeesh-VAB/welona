'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
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
import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  SendOutlined,
  DownloadOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  useStockTransfers,
  useCreateStockTransfer,
  useStockTransferAction,
  useDeleteStockTransfer,
} from '@/hooks/useStockTransfers';
import { useProducts } from '@/hooks/useProducts';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminStockTransfer } from '@shared/types/admin-stock-transfer';
import type { AdminStockTransferCreateInput } from '@shared/schemas/admin-stock-transfers';
import { STOCK_TRANSFER_STATUSES, type StockTransferStatus } from '@shared/enums';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<StockTransferStatus, string> = {
  requested: 'default',
  dispatched: 'gold',
  received: 'green',
  cancelled: 'red',
};
const STATUS_LABEL: Record<StockTransferStatus, string> = {
  requested: 'Requested',
  dispatched: 'Dispatched',
  received: 'Received',
  cancelled: 'Cancelled',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface TransferItemForm {
  productId?: string;
  quantity?: number;
}
interface TransferForm {
  fromBranchId?: string;
  toBranchId?: string;
  notes?: string;
  items: TransferItemForm[];
}

export default function AdminStockTransfersPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-transfers')!;
  const { message } = App.useApp();

  const [status, setStatus] = useState<StockTransferStatus | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useStockTransfers({ status, page, limit });

  const { data: productsData } = useProducts({ isActive: true, limit: 200 });
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const productOptions = useMemo(
    () => (productsData?.items ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })),
    [productsData],
  );
  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    [branchesData],
  );

  const createTransfer = useCreateStockTransfer();
  const actOnTransfer = useStockTransferAction();
  const deleteTransfer = useDeleteStockTransfer();

  const fail = (err: unknown, fb: string) =>
    message.error(err instanceof ApiClientError ? err.message : fb);

  // ---- Create modal ----
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<TransferForm>();
  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ items: [{}] });
    setCreateOpen(true);
  };
  const onCreate = async (values: TransferForm) => {
    const items = (values.items ?? [])
      .filter((it) => it.productId && it.quantity)
      .map((it) => ({ productId: it.productId as string, quantity: Number(it.quantity) }));
    if (items.length === 0) {
      message.error('Add at least one product line with a quantity');
      return;
    }
    const body: AdminStockTransferCreateInput = {
      fromBranchId: values.fromBranchId as string,
      toBranchId: values.toBranchId as string,
      notes: values.notes?.trim() || undefined,
      items,
    };
    try {
      await createTransfer.mutateAsync(body);
      message.success('Transfer created');
      setCreateOpen(false);
    } catch (err) {
      fail(err, 'Could not create transfer');
    }
  };

  // ---- Detail drawer ----
  const [active, setActive] = useState<AdminStockTransfer | null>(null);

  const doAction = async (action: 'dispatch' | 'receive' | 'cancel') => {
    if (!active) return;
    try {
      const updated = await actOnTransfer.mutateAsync({ id: active.id, action });
      message.success(
        action === 'dispatch' ? 'Dispatched — source stock reduced'
          : action === 'receive' ? 'Received — destination stock increased'
          : 'Transfer cancelled',
      );
      setActive(updated);
    } catch (err) {
      fail(err, 'Action failed');
    }
  };

  const onDelete = async (t: AdminStockTransfer) => {
    try {
      await deleteTransfer.mutateAsync(t.id);
      message.success('Transfer deleted');
    } catch (err) {
      fail(err, 'Delete failed');
    }
  };

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: data?.meta.total ?? 0,
      inTransit: items.filter((t) => t.status === 'dispatched').length,
      received: items.filter((t) => t.status === 'received').length,
    };
  }, [data]);

  const columns: ColumnsType<AdminStockTransfer> = [
    { title: 'Transfer', dataIndex: 'number', width: 120, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    {
      title: 'Route',
      key: 'route',
      width: 260,
      render: (_v, t) => (
        <Space size={6}>
          <Text style={{ color: colors.text.primary }}>{t.fromBranch.name}</Text>
          <SendOutlined style={{ color: colors.text.placeholder, fontSize: 11 }} />
          <Text style={{ color: colors.text.primary }}>{t.toBranch.name}</Text>
        </Space>
      ),
    },
    { title: 'Status', dataIndex: 'status', width: 130, render: (s: StockTransferStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag> },
    { title: 'Items', key: 'items', width: 70, align: 'center', render: (_v, t) => t.items.length },
    { title: 'Units', key: 'units', width: 80, align: 'center', render: (_v, t) => t.items.reduce((s, it) => s + it.quantity, 0) },
    { title: 'Created', dataIndex: 'createdAt', width: 120, render: (v: string) => formatDate(v) },
    {
      title: '',
      key: 'actions',
      width: 90,
      align: 'right',
      fixed: 'right',
      render: (_v, t) => (
        <Space size={4}>
          <Tooltip title="View"><Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setActive(t)} /></Tooltip>
          {(t.status === 'requested' || t.status === 'cancelled') && (
            <Popconfirm title={`Delete ${t.number}?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(t)}>
              <Tooltip title="Delete"><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip>
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
    showTotal: (t) => `${t} transfer${t === 1 ? '' : 's'}`,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Transfer</Button>
      </div>

      <Space size={12} style={{ display: 'flex', marginBottom: 16 }} wrap>
        {[
          { label: 'TOTAL', value: stats.total, color: colors.gold.primary },
          { label: 'IN TRANSIT', value: stats.inTransit, color: colors.text.primary },
          { label: 'RECEIVED (view)', value: stats.received, color: colors.text.primary },
        ].map((s) => (
          <Card key={s.label} size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, minWidth: 160 }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>{s.label}</span>} value={s.value} valueStyle={{ color: s.color, fontWeight: 600 }} />
          </Card>
        ))}
      </Space>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <div style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="All statuses"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            style={{ width: 200 }}
            options={STOCK_TRANSFER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          />
        </div>
        <Table<AdminStockTransfer>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 900 }}
        />
      </Card>

      {/* ---- Create modal ---- */}
      <Modal
        title="New Stock Transfer"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        okText="Create"
        confirmLoading={createTransfer.isPending}
        width={640}
        destroyOnClose
      >
        <Form<TransferForm> form={form} layout="vertical" onFinish={onCreate} requiredMark={false}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="From branch" name="fromBranchId" rules={[{ required: true, message: 'Source branch' }]}>
                <Select showSearch placeholder="Source" options={branchOptions} filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="To branch" name="toBranchId" rules={[{ required: true, message: 'Destination branch' }]}>
                <Select showSearch placeholder="Destination" options={branchOptions} filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ color: colors.text.primary }}>Products</Text>
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>Add line</Button>
                </div>
                {fields.map(({ key, name, ...rest }) => (
                  <Row gutter={8} key={key} align="middle" style={{ marginBottom: 4 }}>
                    <Col span={16}>
                      <Form.Item {...rest} name={[name, 'productId']} rules={[{ required: true, message: 'Product' }]} style={{ marginBottom: 8 }}>
                        <Select showSearch placeholder="Product" options={productOptions} filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true, message: 'Qty' }]} style={{ marginBottom: 8 }}>
                        <InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} />
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

      {/* ---- Detail drawer ---- */}
      <Drawer
        title={active ? `${active.number}` : 'Transfer'}
        open={Boolean(active)}
        onClose={() => setActive(null)}
        width={620}
        extra={
          active ? (
            <Space>
              {active.status === 'requested' && (
                <>
                  <Popconfirm title="Dispatch this transfer? Source stock will be reduced." okText="Dispatch" onConfirm={() => doAction('dispatch')}>
                    <Button type="primary" icon={<SendOutlined />} loading={actOnTransfer.isPending}>Dispatch</Button>
                  </Popconfirm>
                  <Button icon={<CloseOutlined />} danger onClick={() => doAction('cancel')} loading={actOnTransfer.isPending}>Cancel</Button>
                </>
              )}
              {active.status === 'dispatched' && (
                <Popconfirm title="Receive this transfer? Destination stock will increase." okText="Receive" onConfirm={() => doAction('receive')}>
                  <Button type="primary" icon={<DownloadOutlined />} loading={actOnTransfer.isPending}>Receive</Button>
                </Popconfirm>
              )}
            </Space>
          ) : null
        }
      >
        {active && (
          <>
            <Space size={16} style={{ marginBottom: 16 }} wrap>
              <Tag color={STATUS_COLOR[active.status]}>{STATUS_LABEL[active.status]}</Tag>
              <Text style={{ color: colors.text.placeholder }}>{active.fromBranch.name} → {active.toBranch.name}</Text>
            </Space>
            <Table
              rowKey={(r) => r.id}
              size="small"
              pagination={false}
              dataSource={active.items}
              columns={[
                { title: 'Product', key: 'p', render: (_v, it) => <div><div>{it.product.name}</div><Text code style={{ fontSize: 11 }}>{it.product.sku}</Text></div> },
                { title: 'Quantity', dataIndex: 'quantity', width: 110, align: 'right' },
              ]}
            />
            {active.notes && <div style={{ marginTop: 12 }}><Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Notes: {active.notes}</Text></div>}
            <div style={{ marginTop: 12, color: colors.text.placeholder, fontSize: 12 }}>
              {active.dispatchedAt && <div>Dispatched: {new Date(active.dispatchedAt).toLocaleString('en-IN')}</div>}
              {active.receivedAt && <div>Received: {new Date(active.receivedAt).toLocaleString('en-IN')}</div>}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
