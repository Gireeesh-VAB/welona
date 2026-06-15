'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  InputNumber,
  Input,
  Modal,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useInventoryAlerts } from '@/hooks/useInventoryAlerts';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminRaiseIndent } from '@/hooks/useAdminIndents';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { ExpiryAlertRow, OverduePurchaseOrder, StockAlertRow } from '@shared/types/admin-inventory-alert';

const { Title, Text } = Typography;

export default function AdminInventoryAlertsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-alerts')!;
  const { message } = App.useApp();

  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: true });
  const branchOptions = useMemo(
    () => [
      { value: '', label: 'All branches' },
      ...(branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    ],
    [branchesData],
  );

  const [branchId, setBranchId] = useState('');
  const { data, isLoading } = useInventoryAlerts({ branchId: branchId || undefined });
  const raiseIndent = useAdminRaiseIndent();

  // Raise indent modal
  const [indentModal, setIndentModal] = useState(false);
  const [indentTarget, setIndentTarget] = useState<StockAlertRow | null>(null);
  const [indentForm] = Form.useForm();

  function openIndent(row: StockAlertRow) {
    setIndentTarget(row);
    indentForm.resetFields();
    indentForm.setFieldValue('requestedQty', row.reorderLevel ?? 10);
    setIndentModal(true);
  }

  async function submitIndent() {
    if (!indentTarget) return;
    const values = await indentForm.validateFields();
    raiseIndent.mutate(
      {
        branchId: indentTarget.branchId,
        productId: indentTarget.productId,
        requestedQty: values.requestedQty,
        reason: values.reason,
      },
      {
        onSuccess: () => {
          message.success(`Indent raised for ${indentTarget.name} @ ${indentTarget.branchName}`);
          setIndentModal(false);
        },
        onError: (e) => {
          message.error(e instanceof ApiClientError ? e.message : 'Failed to raise indent');
        },
      },
    );
  }

  const actionCol = (label = 'Raise Indent'): ColumnsType<StockAlertRow>[number] => ({
    title: '',
    key: 'action',
    width: 130,
    render: (_, row) => (
      <Tooltip title={`Raise a restock indent for this item at ${row.branchName}`}>
        <Button
          size="small"
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={() => openIndent(row)}
        >
          {label}
        </Button>
      </Tooltip>
    ),
  });

  const stockCols: ColumnsType<StockAlertRow> = [
    {
      title: 'Product',
      key: 'p',
      render: (_v, r) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{r.name}</div>
          <Text code style={{ fontSize: 11 }}>{r.sku}</Text>
        </div>
      ),
    },
    { title: 'Branch', dataIndex: 'branchName', width: 160 },
    { title: 'On hand', dataIndex: 'quantity', width: 90, align: 'right',
      render: (v: number) => <Text strong style={{ color: v === 0 ? colors.status.error : colors.status.warning }}>{v}</Text> },
    { title: 'Reorder level', dataIndex: 'reorderLevel', width: 120, align: 'right' },
    actionCol('Raise Indent'),
  ];

  const poCols: ColumnsType<OverduePurchaseOrder> = [
    { title: 'PO', dataIndex: 'number', width: 120, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Supplier', dataIndex: 'supplierName' },
    { title: 'Branch', dataIndex: 'branchName', width: 160 },
    { title: 'Status', dataIndex: 'status', width: 150, render: (s: string) => <Tag color="gold">{s.replace('_', ' ')}</Tag> },
    {
      title: 'Overdue',
      dataIndex: 'daysOverdue',
      width: 120,
      align: 'right',
      render: (d: number) => <Text style={{ color: colors.status.error }}>{d} day{d === 1 ? '' : 's'}</Text>,
    },
  ];

  const expiryCols: ColumnsType<ExpiryAlertRow> = [
    {
      title: 'Product',
      key: 'p',
      render: (_v, r) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{r.name}</div>
          <Text code style={{ fontSize: 11 }}>{r.sku}</Text>
        </div>
      ),
    },
    { title: 'Batch', dataIndex: 'batchNo', width: 130, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Branch', dataIndex: 'branchName', width: 150 },
    { title: 'On hand', dataIndex: 'quantity', width: 90, align: 'right' },
    {
      title: 'Expiry',
      dataIndex: 'daysToExpiry',
      width: 130,
      align: 'right',
      render: (d: number) =>
        d < 0 ? (
          <Text style={{ color: colors.status.error }}>Expired {-d}d ago</Text>
        ) : (
          <Text style={{ color: colors.status.warning }}>in {d} day{d === 1 ? '' : 's'}</Text>
        ),
    },
  ];

  const counts = data?.counts;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
        <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Select
          showSearch
          value={branchId}
          onChange={setBranchId}
          options={branchOptions}
          style={{ width: 260 }}
          filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
        />
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { label: 'OUT OF STOCK', value: counts?.outOfStock ?? 0, color: colors.status.error },
          { label: 'LOW STOCK', value: counts?.lowStock ?? 0, color: colors.status.warning },
          { label: 'EXPIRED', value: counts?.expired ?? 0, color: colors.status.error },
          { label: 'NEAR EXPIRY', value: counts?.nearExpiry ?? 0, color: colors.status.warning },
          { label: 'OVERDUE POs', value: counts?.overduePurchaseOrders ?? 0, color: colors.gold.primary },
        ].map((k) => (
          <Col key={k.label} xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: '12px 16px' } }}>
              <Statistic title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>{k.label}</span>} value={k.value} valueStyle={{ color: k.color, fontWeight: 600 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Out of stock" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.outOfStock.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing out of stock" />
        ) : (
          <Table<StockAlertRow> rowKey={(r) => r.branchId + r.productId} loading={isLoading} columns={stockCols} dataSource={data?.outOfStock ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      <Card title="Low stock" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.lowStock.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No low-stock items" />
        ) : (
          <Table<StockAlertRow> rowKey={(r) => r.branchId + r.productId} loading={isLoading} columns={stockCols} dataSource={data?.lowStock ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      <Card title="Expired batches" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.expired.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expired stock" />
        ) : (
          <Table<ExpiryAlertRow> rowKey={(r) => r.productId + r.batchNo} loading={isLoading} columns={expiryCols} dataSource={data?.expired ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      <Card title="Near expiry" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.nearExpiry.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing expiring soon" />
        ) : (
          <Table<ExpiryAlertRow> rowKey={(r) => r.productId + r.batchNo} loading={isLoading} columns={expiryCols} dataSource={data?.nearExpiry ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      <Card title="Overdue purchase orders" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ header: { color: colors.text.primary }, body: { padding: 12 } }}>
        {(data?.overduePurchaseOrders.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No overdue purchase orders" />
        ) : (
          <Table<OverduePurchaseOrder> rowKey="id" loading={isLoading} columns={poCols} dataSource={data?.overduePurchaseOrders ?? []} size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} />
        )}
      </Card>

      {/* Raise Indent Modal */}
      <Modal
        open={indentModal}
        title={`Raise Indent — ${indentTarget?.name ?? ''}`}
        onCancel={() => setIndentModal(false)}
        onOk={submitIndent}
        okText="Raise Indent"
        confirmLoading={raiseIndent.isPending}
        destroyOnClose
      >
        {indentTarget && (
          <div style={{ marginBottom: 16 }}>
            <Tag color="gold">{indentTarget.branchName}</Tag>
            <Tag>{indentTarget.sku}</Tag>
            <Text style={{ color: colors.text.placeholder, display: 'block', marginTop: 8 }}>
              Current stock: <Text strong style={{ color: indentTarget.quantity === 0 ? colors.status.error : colors.status.warning }}>{indentTarget.quantity}</Text>
              {indentTarget.reorderLevel != null && (
                <> &nbsp;·&nbsp; Reorder level: <Text strong>{indentTarget.reorderLevel}</Text></>
              )}
            </Text>
          </div>
        )}
        <Form form={indentForm} layout="vertical">
          <Form.Item
            name="requestedQty"
            label="Quantity to Request"
            rules={[{ required: true, message: 'Enter quantity' }, { type: 'number', min: 1, message: 'Must be at least 1' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason (optional)">
            <Input.TextArea rows={2} placeholder="e.g. Replenish after high demand" maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
