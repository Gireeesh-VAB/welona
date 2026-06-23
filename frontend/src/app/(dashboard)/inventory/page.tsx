'use client';

import { useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';
import {
  useBranchIndents,
  useBranchStock,
  useRaiseIndent,
  useBranchReceiveIndent,
  useBranchIncomingTransfers,
  useBranchOutgoingTransfers,
  useBranchTransferAction,
  type BranchIndent,
  type BranchStockRow,
  type BranchIncomingTransfer,
} from '@/hooks/useBranchPortal';
import { formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';
import { useQueryClient } from '@tanstack/react-query';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  ok: 'green',
  low_stock: 'orange',
  out_of_stock: 'red',
};
const STATUS_LABEL: Record<string, string> = {
  ok: 'OK',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

const INDENT_COLOR: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  dispatched: 'gold',
  delivered: 'cyan',
  closed: 'green',
  rejected: 'red',
};

export default function InventoryPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('stock');

  // Request Stock modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BranchStockRow | null>(null);
  const [form] = Form.useForm();

  // Bulk Order modal state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkSelected, setBulkSelected] = useState<string[]>([]); // productIds
  const [bulkQty, setBulkQty] = useState<Record<string, number>>({});
  const [bulkReason, setBulkReason] = useState('');

  // Receive indent modal state
  const [receiveTarget, setReceiveTarget] = useState<BranchIndent | null>(null);
  const [receiveForm] = Form.useForm();

  const queryClient = useQueryClient();
  const { data, isLoading, refetch: refetchStock } = useBranchStock({ search: search || undefined, lowStockOnly: lowOnly || undefined, page, limit: 100 });
  const { data: indentsData, isLoading: indentsLoading } = useBranchIndents();
  const { data: incomingData, isLoading: incomingLoading } = useBranchIncomingTransfers();
  const { data: outgoingData, isLoading: outgoingLoading } = useBranchOutgoingTransfers();
  const raiseIndent = useRaiseIndent();
  const receiveIndent = useBranchReceiveIndent();
  const transferAction = useBranchTransferAction();

  const items = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const outOfStock = items.filter((r) => r.status === 'out_of_stock').length;
  const lowStock = items.filter((r) => r.status === 'low_stock').length;
  const indents = indentsData?.items ?? [];
  const pendingCount = indents.filter((i) => i.status === 'pending').length;
  const dispatchedIndents = indents.filter((i) => i.status === 'dispatched' || i.status === 'delivered');
  const incomingTransfers = incomingData?.items ?? [];
  const outgoingTransfers = outgoingData?.items ?? [];
  const pendingIncomingCount = incomingTransfers.filter((t) => t.status === 'dispatched').length;
  const pendingOutgoingCount = outgoingTransfers.filter((t) => t.status === 'requested').length;

  function openRequest(row: BranchStockRow) {
    setSelectedRow(row);
    form.resetFields();
    form.setFieldValue('requestedQty', row.reorderLevel ?? 10);
    setModalOpen(true);
  }

  function handleTransferAction(transfer: BranchIncomingTransfer, action: 'dispatch' | 'receive') {
    transferAction.mutate({ id: transfer.id, action }, {
      onSuccess: () => {
        message.success(
          action === 'dispatch'
            ? `Transfer ${transfer.number} dispatched — stock deducted from your branch`
            : `Transfer ${transfer.number} received — stock added to your branch`,
        );
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Action failed';
        message.error(msg);
      },
    });
  }

  async function handleSubmit() {
    if (!selectedRow) return;
    const values = await form.validateFields();
    raiseIndent.mutate(
      { items: [{ productId: selectedRow.id, requestedQty: values.requestedQty }], reason: values.reason },
      {
        onSuccess: () => {
          message.success(`Stock request raised for ${selectedRow.name}`);
          setModalOpen(false);
          queryClient.refetchQueries({ queryKey: ['branch-indents'] });
          setActiveTab('requests');
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Failed to raise request';
          message.error(msg);
        },
      },
    );
  }

  function openBulkOrder() {
    setBulkSearch('');
    setBulkSelected([]);
    setBulkQty({});
    setBulkReason('');
    setBulkOpen(true);
  }

  async function handleBulkSubmit() {
    const orderItems = bulkSelected
      .map((id) => ({ productId: id, requestedQty: bulkQty[id] ?? 0 }))
      .filter((it) => it.requestedQty > 0);
    if (orderItems.length === 0) {
      message.warning('Select at least one product with quantity > 0');
      return;
    }
    raiseIndent.mutate(
      { items: orderItems, reason: bulkReason.trim() || undefined },
      {
        onSuccess: () => {
          message.success(`Bulk order raised — ${orderItems.length} product${orderItems.length > 1 ? 's' : ''} requested`);
          setBulkOpen(false);
          queryClient.refetchQueries({ queryKey: ['branch-indents'] });
          setActiveTab('requests');
        },
        onError: (e: unknown) => {
          message.error(e instanceof Error ? e.message : 'Failed to raise bulk order');
        },
      },
    );
  }

  async function handleReceive() {
    if (!receiveTarget) return;
    const values = await receiveForm.validateFields();
    receiveIndent.mutate(
      {
        id: receiveTarget.id,
        items: receiveTarget.items.map((it, idx) => ({
          itemId: it.id,
          receivedQty: values.items[idx].receivedQty,
        })),
        notes: values.notes,
      },
      {
        onSuccess: () => {
          message.success('Stock delivered — inventory updated.');
          setReceiveTarget(null);
          receiveForm.resetFields();
        },
        onError: (e: unknown) => {
          message.error(e instanceof Error ? e.message : 'Failed to confirm receipt.');
        },
      },
    );
  }

  const stockColumns: ColumnsType<BranchStockRow> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, row) => (
        <div>
          <Text style={{ fontWeight: 600, display: 'block' }}>{row.name}</Text>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.sku}</Text>
        </div>
      ),
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      align: 'center',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      defaultSortOrder: 'ascend',
      render: (v: number, row) => (
        <Text
          strong
          style={{
            color:
              row.status === 'ok'
                ? colors.text.primary
                : row.status === 'low_stock'
                  ? '#facc15'
                  : '#ef4444',
          }}
        >
          {v}
        </Text>
      ),
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorderLevel',
      align: 'center',
      render: (v: number | null) =>
        v != null ? <Text style={{ color: colors.text.placeholder }}>{v}</Text> : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      align: 'center',
      filters: [
        { text: 'OK', value: 'ok' },
        { text: 'Low Stock', value: 'low_stock' },
        { text: 'Out of Stock', value: 'out_of_stock' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, row) => (
        <Button
          size="small"
          type={row.status !== 'ok' ? 'primary' : 'default'}
          danger={row.status === 'out_of_stock'}
          icon={<PlusOutlined />}
          onClick={() => openRequest(row)}
        >
          Request Stock
        </Button>
      ),
    },
  ];

  const indentColumns: ColumnsType<BranchIndent> = [
    {
      title: 'Indent #',
      key: 'number',
      width: 110,
      render: (_: unknown, row: BranchIndent) => (
        <Text code style={{ fontSize: 12 }}>{row.number ?? row.id.slice(0, 8)}</Text>
      ),
    },
    {
      title: 'Products Requested',
      key: 'products',
      render: (_: unknown, row: BranchIndent) => (
        <Space direction="vertical" size={3}>
          {row.items.map((it) => (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>{it.product.name}</Text>
              <Tag style={{ margin: 0, fontSize: 12 }}>{it.requestedQty} {it.product.uom}</Tag>
              {it.approvedQty != null && it.approvedQty !== it.requestedQty && (
                <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>approved {it.approvedQty}</Tag>
              )}
            </div>
          ))}
        </Space>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      render: (v: string | null) => v || <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      align: 'center',
      width: 120,
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Dispatched', value: 'dispatched' },
        { text: 'Delivered', value: 'delivered' },
        { text: 'Closed', value: 'closed' },
        { text: 'Rejected', value: 'rejected' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (v: string) => (
        <Tag color={INDENT_COLOR[v]}>{v.charAt(0).toUpperCase() + v.slice(1)}</Tag>
      ),
    },
    {
      title: 'Requested On',
      dataIndex: 'createdAt',
      align: 'right',
      width: 120,
      render: (v: string) =>
        new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
  ];

  const TRANSFER_STATUS_COLOR: Record<string, string> = {
    requested: 'default',
    dispatched: 'gold',
    received: 'green',
  };
  const TRANSFER_STATUS_LABEL: Record<string, string> = {
    requested: 'Pending Dispatch',
    dispatched: 'In Transit',
    received: 'Received',
  };

  const renderItemsList = (items: BranchIncomingTransfer['items']) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13 }}>{it.product.name}</Text>
          <Tag style={{ margin: 0, fontWeight: 600 }}>{it.quantity} {it.product.uom}</Tag>
          <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{it.product.sku}</Text>
        </div>
      ))}
    </div>
  );

  const incomingColumns: ColumnsType<BranchIncomingTransfer> = [
    {
      title: 'Transfer #',
      dataIndex: 'number',
      width: 110,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'From Branch',
      key: 'from',
      width: 160,
      render: (_: unknown, t: BranchIncomingTransfer) => (
        <Space size={4}>
          <SendOutlined style={{ color: colors.text.placeholder, fontSize: 11 }} />
          <Text>{t.fromBranch.name}</Text>
        </Space>
      ),
    },
    {
      title: 'Products & Quantities',
      key: 'items',
      render: (_: unknown, t: BranchIncomingTransfer) => renderItemsList(t.items),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      align: 'center' as const,
      render: (s: string) => <Tag color={TRANSFER_STATUS_COLOR[s]}>{s === 'dispatched' ? 'Awaiting Receipt' : TRANSFER_STATUS_LABEL[s]}</Tag>,
    },
    {
      title: 'Dispatched On',
      dataIndex: 'dispatchedAt',
      width: 120,
      align: 'right' as const,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      align: 'center' as const,
      render: (_: unknown, t: BranchIncomingTransfer) =>
        t.status === 'dispatched' ? (
          <Popconfirm
            title={`Receive ${t.number}?`}
            description="This will add all items to your branch stock."
            okText="Receive"
            onConfirm={() => handleTransferAction(t, 'receive')}
          >
            <Button size="small" type="primary" icon={<CheckOutlined />} loading={transferAction.isPending}>
              Receive
            </Button>
          </Popconfirm>
        ) : (
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
            {t.receivedAt ? new Date(t.receivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Done'}
          </Text>
        ),
    },
  ];

  const outgoingColumns: ColumnsType<BranchIncomingTransfer> = [
    {
      title: 'Transfer #',
      dataIndex: 'number',
      width: 110,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'To Branch',
      key: 'to',
      width: 160,
      render: (_: unknown, t: BranchIncomingTransfer) => (
        <Space size={4}>
          <SendOutlined style={{ color: colors.gold?.primary ?? '#d4a017', fontSize: 11 }} />
          <Text>{t.toBranch?.name ?? '—'}</Text>
        </Space>
      ),
    },
    {
      title: 'Products & Quantities',
      key: 'items',
      render: (_: unknown, t: BranchIncomingTransfer) => renderItemsList(t.items),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      align: 'center' as const,
      render: (s: string) => <Tag color={TRANSFER_STATUS_COLOR[s]}>{TRANSFER_STATUS_LABEL[s]}</Tag>,
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      width: 120,
      align: 'right' as const,
      render: (v: string) =>
        new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      align: 'center' as const,
      render: (_: unknown, t: BranchIncomingTransfer) =>
        t.status === 'requested' ? (
          <Popconfirm
            title={`Dispatch ${t.number}?`}
            description="Stock will be deducted from your branch inventory."
            okText="Dispatch"
            onConfirm={() => handleTransferAction(t, 'dispatch')}
          >
            <Button size="small" type="primary" icon={<SendOutlined />} loading={transferAction.isPending}>
              Dispatch
            </Button>
          </Popconfirm>
        ) : (
          <Tag color={TRANSFER_STATUS_COLOR[t.status]}>{TRANSFER_STATUS_LABEL[t.status]}</Tag>
        ),
    },
  ];

  // Low stock / out of stock items needing attention
  const needsAttention = items.filter((r) => r.status !== 'ok');

  const tabItems = [
    {
      key: 'stock',
      label: 'All Stock',
      children: (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search products"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: 220 }}
              allowClear
            />
            <Switch
              checkedChildren="Low stock only"
              unCheckedChildren="Show all"
              checked={lowOnly}
              onChange={(v) => { setLowOnly(v); setPage(1); }}
            />
          </div>
          <Spin spinning={isLoading}>
            {!isLoading && items.length === 0 ? (
              <Empty description="No stock data for your branch." />
            ) : (
              <Table
                rowKey="id"
                dataSource={items}
                columns={stockColumns}
                size="middle"
                rowClassName={(r) => (r.status !== 'ok' ? 'ant-table-row-warning' : '')}
                pagination={{ current: page, pageSize: 100, total, onChange: setPage, showTotal: (t) => `${t} SKUs` }}
              />
            )}
          </Spin>
        </>
      ),
    },
    {
      key: 'alerts',
      label: (
        <span>
          Needs Attention{' '}
          {needsAttention.length > 0 && (
            <Badge count={needsAttention.length} color="#facc15" style={{ marginLeft: 4 }} />
          )}
        </span>
      ),
      children: (
        <Spin spinning={isLoading}>
          {!isLoading && needsAttention.length === 0 ? (
            <Empty description="All stock levels are healthy." />
          ) : (
            <Table
              rowKey="id"
              dataSource={needsAttention}
              columns={stockColumns}
              size="middle"
              pagination={false}
            />
          )}
        </Spin>
      ),
    },
    {
      key: 'requests',
      label: (
        <span>
          Stock Requests{' '}
          {(pendingCount + dispatchedIndents.length) > 0 && (
            <Badge count={pendingCount + dispatchedIndents.length} style={{ marginLeft: 4 }} />
          )}
        </span>
      ),
      children: (
        <Spin spinning={indentsLoading}>
          {/* Dispatched — needs branch receipt */}
          {dispatchedIndents.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <CarOutlined style={{ color: '#d97706' }} />
                <Text strong style={{ color: colors.text.primary }}>Awaiting Your Receipt</Text>
                <Tag color="gold">{dispatchedIndents.length}</Tag>
              </div>
              {dispatchedIndents.map((indent) => (
                <Card
                  key={indent.id}
                  size="small"
                  style={{ marginBottom: 10, background: colors.black.secondary, border: `1px solid #d97706` }}
                  styles={{ body: { padding: 14 } }}
                >
                  <Row gutter={[12, 8]} align="middle">
                    <Col flex="auto">
                      <Space direction="vertical" size={4}>
                        {/* Items */}
                        {indent.items.map((it) => (
                          <div key={it.id}>
                            <Text strong style={{ color: colors.text.primary }}>{it.product.name}</Text>
                            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}> · {it.product.sku}</Text>
                            <Tag style={{ marginLeft: 8, fontWeight: 600 }} color="gold">
                              {it.fulfilledQty ?? it.requestedQty} {it.product.uom} dispatched
                            </Tag>
                          </div>
                        ))}
                        {/* Delivery info */}
                        <Space size={12} wrap style={{ marginTop: 4 }}>
                          {indent.vehicleNumber && (
                            <Text style={{ fontSize: 12, color: colors.text.placeholder }}>
                              <CarOutlined /> {indent.vehicleNumber}
                            </Text>
                          )}
                          {indent.driverName && (
                            <Text style={{ fontSize: 12, color: colors.text.placeholder }}>
                              {indent.driverName}
                            </Text>
                          )}
                          {indent.driverMobile && (
                            <Text style={{ fontSize: 12, color: colors.text.placeholder }}>
                              <PhoneOutlined /> {indent.driverMobile}
                            </Text>
                          )}
                          {indent.dispatchedAt && (
                            <Text style={{ fontSize: 12, color: colors.text.placeholder }}>
                              Dispatched: {new Date(indent.dispatchedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </Text>
                          )}
                          {indent.expectedDeliveryAt && (
                            <Text style={{ fontSize: 12, color: '#22c55e' }}>
                              Expected: {new Date(indent.expectedDeliveryAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </Text>
                          )}
                        </Space>
                      </Space>
                    </Col>
                    <Col>
                      {indent.status === 'dispatched' && (
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          style={{ background: '#22c55e', borderColor: '#22c55e' }}
                          onClick={() => {
                            setReceiveTarget(indent);
                            receiveForm.setFieldsValue({
                              items: indent.items.map((it) => ({ receivedQty: it.fulfilledQty ?? it.requestedQty })),
                            });
                          }}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          )}

          {/* All requests table */}
          {!indentsLoading && indents.length === 0 ? (
            <Empty description="No stock requests raised yet. Use 'Request Stock' from the stock table." />
          ) : (
            <Table
              rowKey="id"
              dataSource={indents}
              columns={indentColumns}
              size="middle"
              pagination={false}
            />
          )}
        </Spin>
      ),
    },
    {
      key: 'outgoing',
      label: (
        <span>
          Outgoing Transfers{' '}
          {pendingOutgoingCount > 0 && (
            <Badge count={pendingOutgoingCount} style={{ marginLeft: 4 }} />
          )}
        </span>
      ),
      children: (
        <Spin spinning={outgoingLoading}>
          {!outgoingLoading && outgoingTransfers.length === 0 ? (
            <Empty description="No outgoing transfers from your branch." />
          ) : (
            <Table
              rowKey="id"
              dataSource={outgoingTransfers}
              columns={outgoingColumns}
              size="middle"
              pagination={false}
            />
          )}
        </Spin>
      ),
    },
    {
      key: 'incoming',
      label: (
        <span>
          Incoming Transfers{' '}
          {pendingIncomingCount > 0 && (
            <Badge count={pendingIncomingCount} style={{ marginLeft: 4 }} />
          )}
        </span>
      ),
      children: (
        <Spin spinning={incomingLoading}>
          {!incomingLoading && incomingTransfers.length === 0 ? (
            <Empty description="No incoming transfers for your branch." />
          ) : (
            <Table
              rowKey="id"
              dataSource={incomingTransfers}
              columns={incomingColumns}
              size="middle"
              pagination={false}
            />
          )}
        </Spin>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            Inventory
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Stock levels for your branch.{' '}
            <Tooltip title="Admin assigns products to branches via Master → Branches → Catalog. Stock is recorded via Admin → Inventory.">
              <InfoCircleOutlined style={{ color: colors.text.placeholder }} />
            </Tooltip>
          </Text>
        </div>
        <Space>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => router.push('/inventory/grn')}
            style={{ borderColor: colors.border, color: colors.text.secondary }}
          >
            GRN Records
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openBulkOrder}
          >
            Bulk Order
          </Button>
          <Button
            icon={<SyncOutlined />}
            loading={isLoading}
            onClick={() => refetchStock()}
            style={{ borderColor: colors.border, color: colors.text.secondary }}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Total SKUs</Text>}
              value={total}
              prefix={<DatabaseOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Low Stock</Text>}
              value={lowStock}
              prefix={<WarningOutlined style={{ color: '#facc15' }} />}
              valueStyle={{ color: '#facc15' }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Out of Stock</Text>}
              value={outOfStock}
              prefix={<WarningOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#ef4444' }}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Request Stock Modal */}
      <Modal
        open={modalOpen}
        title={`Request Stock — ${selectedRow?.name ?? ''}`}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Raise Request"
        confirmLoading={raiseIndent.isPending}
        destroyOnClose
      >
        {selectedRow && (
          <div style={{ marginBottom: 16 }}>
            <Tag>{selectedRow.sku}</Tag>
            <Tag color={STATUS_COLOR[selectedRow.status]}>{STATUS_LABEL[selectedRow.status]}</Tag>
            <Text style={{ color: colors.text.placeholder, display: 'block', marginTop: 8 }}>
              Current qty: <Text strong>{selectedRow.quantity}</Text>
              {selectedRow.reorderLevel != null && (
                <> &nbsp;·&nbsp; Reorder level: <Text strong>{selectedRow.reorderLevel}</Text></>
              )}
            </Text>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="requestedQty"
            label="Quantity to Request"
            rules={[{ required: true, message: 'Enter quantity' }, { type: 'number', min: 1, message: 'Must be at least 1' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason (optional)">
            <Input.TextArea rows={3} placeholder="e.g. Running low after weekend bookings" maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
      {/* Bulk Order Modal */}
      <Modal
        open={bulkOpen}
        title="Bulk Order — Request Multiple Products"
        onCancel={() => setBulkOpen(false)}
        onOk={handleBulkSubmit}
        okText={`Raise Order${bulkSelected.length > 0 ? ` (${bulkSelected.length})` : ''}`}
        confirmLoading={raiseIndent.isPending}
        width={700}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Text style={{ color: colors.text.placeholder, display: 'block', marginBottom: 12 }}>
          Select products and enter quantities. All selected products will be submitted as one stock request.
        </Text>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search products…"
          value={bulkSearch}
          onChange={(e) => setBulkSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 10 }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 6 }}>
          {items
            .filter((r) =>
              !bulkSearch ||
              r.name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
              r.sku.toLowerCase().includes(bulkSearch.toLowerCase()),
            )
            .map((row) => {
              const checked = bulkSelected.includes(row.id);
              return (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderBottom: `1px solid ${colors.border}`,
                    background: checked ? '#1a2a1a' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onClick={() => {
                    if (checked) {
                      setBulkSelected((s) => s.filter((id) => id !== row.id));
                    } else {
                      setBulkSelected((s) => [...s, row.id]);
                      setBulkQty((q) => ({ ...q, [row.id]: q[row.id] ?? (row.reorderLevel ?? 10) }));
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: 'block', fontSize: 13, color: colors.text.primary }}>{row.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.text.placeholder }}>{row.sku} · {row.uom}</Text>
                  </div>
                  <Text style={{ fontSize: 12, color: row.status !== 'ok' ? '#facc15' : colors.text.placeholder, minWidth: 60, textAlign: 'right' }}>
                    Qty: {row.quantity}
                  </Text>
                  <Tag color={STATUS_COLOR[row.status]} style={{ margin: 0, minWidth: 72, textAlign: 'center' }}>
                    {STATUS_LABEL[row.status]}
                  </Tag>
                  {checked && (
                    <InputNumber
                      min={1}
                      value={bulkQty[row.id] ?? 1}
                      onChange={(v) => setBulkQty((q) => ({ ...q, [row.id]: Number(v ?? 1) }))}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 90 }}
                      size="small"
                      placeholder="Qty"
                    />
                  )}
                </div>
              );
            })}
          {items.filter((r) =>
            !bulkSearch ||
            r.name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
            r.sku.toLowerCase().includes(bulkSearch.toLowerCase()),
          ).length === 0 && (
            <Empty description="No products found" style={{ padding: 24 }} />
          )}
        </div>
        {bulkSelected.length > 0 && (
          <div style={{ marginTop: 8, padding: '6px 12px', background: '#1a2a1a', borderRadius: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {bulkSelected.map((id) => {
              const p = items.find((r) => r.id === id);
              return p ? (
                <Tag key={id} closable onClose={() => setBulkSelected((s) => s.filter((x) => x !== id))}>
                  {p.name} × {bulkQty[id] ?? 1}
                </Tag>
              ) : null;
            })}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Reason (optional)</Text>
          <Input.TextArea
            rows={2}
            maxLength={300}
            value={bulkReason}
            onChange={(e) => setBulkReason(e.target.value)}
            placeholder="e.g. Monthly restocking for high-demand products"
          />
        </div>
      </Modal>

      {/* Delivered Stock Modal */}
      <Modal
        open={!!receiveTarget}
        title={`Mark Delivered${receiveTarget?.number ? ` — ${receiveTarget.number}` : ''}`}
        onCancel={() => { setReceiveTarget(null); receiveForm.resetFields(); }}
        onOk={handleReceive}
        okText="Confirm Delivery"
        okButtonProps={{ style: { background: '#22c55e', borderColor: '#22c55e' } }}
        confirmLoading={receiveIndent.isPending}
        width={520}
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 14 }}>
          Enter the quantity actually received after quality check. Inventory will be updated for accepted quantities only.
        </Text>
        <Form form={receiveForm} layout="vertical">
          {receiveTarget?.items.map((it, idx) => (
            <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ flex: 2 }}>
                <Text strong>{it.product.name}</Text>
                <div style={{ fontSize: 12, color: colors.text.placeholder }}>{it.product.sku} · {it.product.uom}</div>
                <Tag color="gold" style={{ marginTop: 4 }}>Dispatched: {it.fulfilledQty ?? it.requestedQty}</Tag>
              </div>
              <Form.Item
                name={['items', idx, 'receivedQty']}
                label={idx === 0 ? 'Accepted Qty' : undefined}
                rules={[{ required: true, type: 'number', min: 0, message: 'Enter qty' }]}
                style={{ marginBottom: 0, minWidth: 130 }}
              >
                <InputNumber
                  min={0}
                  max={it.fulfilledQty ?? undefined}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </div>
          ))}
          <Form.Item name="notes" label="Notes (optional)" style={{ marginTop: 8 }}>
            <Input.TextArea rows={2} maxLength={300} placeholder="e.g. 5 units rejected due to damage" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
