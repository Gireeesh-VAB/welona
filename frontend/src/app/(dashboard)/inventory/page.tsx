'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  DatabaseOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useBranchIndents,
  useBranchStock,
  useRaiseIndent,
  type BranchIndent,
  type BranchStockRow,
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
  fulfilled: 'green',
  rejected: 'red',
};

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('stock');

  // Request Stock modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BranchStockRow | null>(null);
  const [form] = Form.useForm();

  const queryClient = useQueryClient();
  const { data, isLoading, refetch: refetchStock } = useBranchStock({ search: search || undefined, lowStockOnly: lowOnly || undefined, page, limit: 100 });
  const { data: indentsData, isLoading: indentsLoading } = useBranchIndents();
  const raiseIndent = useRaiseIndent();

  const items = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const outOfStock = items.filter((r) => r.status === 'out_of_stock').length;
  const lowStock = items.filter((r) => r.status === 'low_stock').length;
  const indents = indentsData?.items ?? [];
  const pendingCount = indents.filter((i) => i.status === 'pending').length;

  function openRequest(row: BranchStockRow) {
    setSelectedRow(row);
    form.resetFields();
    form.setFieldValue('requestedQty', row.reorderLevel ?? 10);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!selectedRow) return;
    const values = await form.validateFields();
    raiseIndent.mutate(
      { productId: selectedRow.id, requestedQty: values.requestedQty, reason: values.reason },
      {
        onSuccess: () => {
          message.success(`Stock request raised for ${selectedRow.name}`);
          setModalOpen(false);
          queryClient.refetchQueries({ queryKey: ['branch-indents'] });
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Failed to raise request';
          message.error(msg);
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
      title: 'Product',
      key: 'product',
      render: (_, row) => (
        <div>
          <Text style={{ fontWeight: 600, display: 'block' }}>{row.product.name}</Text>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.product.sku}</Text>
        </div>
      ),
    },
    {
      title: 'UOM',
      dataIndex: ['product', 'uom'],
      align: 'center',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Requested Qty',
      dataIndex: 'requestedQty',
      align: 'right',
      render: (v: number) => <Text strong>{v}</Text>,
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
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Fulfilled', value: 'fulfilled' },
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
      render: (v: string) =>
        new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
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
          {pendingCount > 0 && (
            <Badge count={pendingCount} style={{ marginLeft: 4 }} />
          )}
        </span>
      ),
      children: (
        <Spin spinning={indentsLoading}>
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
        <Button
          icon={<SyncOutlined />}
          loading={isLoading}
          onClick={() => refetchStock()}
          style={{ borderColor: colors.border, color: colors.text.secondary }}
        >
          Refresh
        </Button>
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
    </div>
  );
}
