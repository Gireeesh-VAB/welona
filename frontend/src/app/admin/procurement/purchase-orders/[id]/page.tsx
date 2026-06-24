'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  usePurchaseOrder,
  useGoodsReceipts,
  useCreateGoodsReceipt,
  useUpdatePurchaseOrder,
} from '@/hooks/usePurchaseOrders';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminPurchaseOrderItem, AdminGoodsReceipt } from '@shared/types/admin-purchase-order';
import type { PurchaseOrderStatus } from '@shared/enums';
import type { ColumnsType } from 'antd/es/table';

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
  sent: 'Sent to Supplier',
  partially_received: 'Partially Received',
  received: 'Fully Received',
  cancelled: 'Cancelled',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  unpaid: 'red',
  partial: 'orange',
  paid: 'green',
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: 'Unpaid',
  partial: 'Partially Paid',
  paid: 'Paid',
};
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  upi: 'UPI',
  cash: 'Cash',
  other: 'Other',
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const colors = useBrandColors();
  const { message } = App.useApp();

  const { data: po, isLoading } = usePurchaseOrder(id);
  const { data: grnsData } = useGoodsReceipts({ poId: id, limit: 50 });
  const createGRN = useCreateGoodsReceipt();
  const updatePO = useUpdatePurchaseOrder();

  // Receive state
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [receiveDamaged, setReceiveDamaged] = useState<Record<string, number>>({});
  const [receiveBatch, setReceiveBatch] = useState<Record<string, { batchNo?: string; expiryDate?: string }>>({});

  // Invoice fields for GRN
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<string | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState<number | null>(null);

  // Payment modal
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm] = Form.useForm();

  const canReceive = po && po.status !== 'received' && po.status !== 'cancelled';

  const onMarkSent = async () => {
    try {
      await updatePO.mutateAsync({ id, body: { status: 'sent' } });
      message.success('Purchase order marked as sent to supplier');
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Could not update purchase order');
    }
  };

  const onCancelPO = async () => {
    try {
      await updatePO.mutateAsync({ id, body: { status: 'cancelled' } });
      message.success('Purchase order cancelled');
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Could not cancel purchase order');
    }
  };

  const onRecordPayment = async () => {
    try {
      const vals = await paymentForm.validateFields();
      await updatePO.mutateAsync({
        id,
        body: {
          paymentStatus: vals.paymentStatus,
          paymentMethod: vals.paymentMethod,
          amountPaid: vals.amountPaid ? Math.round(vals.amountPaid * 100) : null,
          paymentDate: vals.paymentDate ? vals.paymentDate.toISOString() : null,
          paymentReference: vals.paymentReference || null,
        },
      });
      setPaymentOpen(false);
      message.success('Payment details recorded');
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof ApiClientError ? err.message : 'Could not record payment');
    }
  };

  const onReceive = async () => {
    if (!po) return;
    const trackedByProduct = new Map(po.items.map((it) => [it.product.id, it.product.trackBatches]));
    const items = Object.entries(receiveQty)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity,
        damagedQty: receiveDamaged[productId] ?? 0,
        batchNo: receiveBatch[productId]?.batchNo,
        expiryDate: receiveBatch[productId]?.expiryDate,
      }));
    if (items.length === 0) {
      message.warning('Enter a quantity to receive for at least one product');
      return;
    }
    const missing = items.find((i) => trackedByProduct.get(i.productId) && !i.batchNo?.trim());
    if (missing) {
      message.error('Enter a batch number for batch-tracked products');
      return;
    }
    try {
      await createGRN.mutateAsync({
        poId: po.id,
        items,
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceDate: invoiceDate || undefined,
        invoiceAmount: invoiceAmount ? Math.round(invoiceAmount * 100) : undefined,
      });
      message.success('Goods received — stock updated');
      setReceiveQty({});
      setReceiveDamaged({});
      setReceiveBatch({});
      setInvoiceNumber('');
      setInvoiceDate(null);
      setInvoiceAmount(null);
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Could not receive goods');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!po) {
    return (
      <Empty description="Purchase order not found" style={{ marginTop: 80 }}>
        <Button onClick={() => router.back()}>Go Back</Button>
      </Empty>
    );
  }

  const lineColumns: ColumnsType<AdminPurchaseOrderItem> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, it) => (
        <div>
          <Text strong>{it.product.name}</Text>
          <Text code style={{ fontSize: 11, marginLeft: 6 }}>{it.product.sku}</Text>
        </div>
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      width: 120,
      align: 'right',
      render: (v: number) => rupees(v),
    },
    {
      title: 'Tax',
      dataIndex: 'taxRate',
      width: 80,
      align: 'center',
      render: (v: number) => `${(v / 100).toFixed(0)}%`,
    },
    {
      title: 'Ordered',
      dataIndex: 'quantity',
      width: 90,
      align: 'center',
      render: (v: number) => <Text strong>{v}</Text>,
    },
    {
      title: 'Received',
      dataIndex: 'quantityReceived',
      width: 90,
      align: 'center',
      render: (v: number, it) => (
        <Text style={{ color: v >= it.quantity ? '#52c41a' : v > 0 ? '#faad14' : colors.text.secondary }}>
          {v}
        </Text>
      ),
    },
    {
      title: 'Remaining',
      key: 'remaining',
      width: 90,
      align: 'center',
      render: (_, it) => {
        const rem = it.quantity - it.quantityReceived;
        return rem > 0
          ? <Tag color="orange">{rem}</Tag>
          : <Tag color="success">Done</Tag>;
      },
    },
    {
      title: 'Line Total',
      dataIndex: 'lineTotal',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong>{rupees(v)}</Text>,
    },
    ...(canReceive ? [
      {
        title: 'Receive Now',
        key: 'recv',
        width: 100,
        render: (_: unknown, it: AdminPurchaseOrderItem) => {
          const remaining = it.quantity - it.quantityReceived;
          return (
            <InputNumber
              min={0}
              max={remaining}
              disabled={remaining <= 0}
              value={receiveQty[it.product.id] ?? 0}
              onChange={(v) => setReceiveQty((m) => ({ ...m, [it.product.id]: Number(v ?? 0) }))}
              style={{ width: '100%' }}
              size="small"
            />
          );
        },
      },
      {
        title: 'Damaged',
        key: 'damaged',
        width: 90,
        render: (_: unknown, it: AdminPurchaseOrderItem) => {
          const maxDamaged = receiveQty[it.product.id] ?? 0;
          return (
            <InputNumber
              min={0}
              max={maxDamaged}
              disabled={maxDamaged <= 0}
              value={receiveDamaged[it.product.id] ?? 0}
              onChange={(v) => setReceiveDamaged((m) => ({ ...m, [it.product.id]: Number(v ?? 0) }))}
              style={{ width: '100%' }}
              size="small"
            />
          );
        },
      },
      {
        title: 'Batch / Expiry',
        key: 'batch',
        width: 220,
        render: (_: unknown, it: AdminPurchaseOrderItem) =>
          it.product.trackBatches ? (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                size="small"
                placeholder="Batch no."
                value={receiveBatch[it.product.id]?.batchNo ?? ''}
                onChange={(e) =>
                  setReceiveBatch((m) => ({ ...m, [it.product.id]: { ...m[it.product.id], batchNo: e.target.value } }))
                }
                style={{ width: '55%' }}
              />
              <DatePicker
                size="small"
                placeholder="Expiry"
                value={receiveBatch[it.product.id]?.expiryDate ? dayjs(receiveBatch[it.product.id]!.expiryDate) : null}
                onChange={(d) =>
                  setReceiveBatch((m) => ({ ...m, [it.product.id]: { ...m[it.product.id], expiryDate: d?.toISOString() } }))
                }
                style={{ width: '45%' }}
              />
            </Space.Compact>
          ) : (
            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>—</Text>
          ),
      },
    ] as ColumnsType<AdminPurchaseOrderItem> : []),
  ];

  const grnColumns: ColumnsType<AdminGoodsReceipt> = [
    {
      title: 'GRN',
      dataIndex: 'number',
      width: 130,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Received At',
      dataIndex: 'receivedAt',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      width: 140,
      render: (v: string | null) => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Invoice Amt',
      dataIndex: 'invoiceAmount',
      width: 120,
      align: 'right',
      render: (v: number | null) => v != null ? <Text strong>{rupees(v)}</Text> : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Lines',
      key: 'lines',
      width: 70,
      align: 'center',
      render: (_v: unknown, g: AdminGoodsReceipt) => g.items.length,
    },
    {
      title: 'Units',
      key: 'units',
      width: 70,
      align: 'center',
      render: (_v: unknown, g: AdminGoodsReceipt) => g.items.reduce((s, i) => s + i.quantity, 0),
    },
    {
      title: 'Received By',
      key: 'by',
      render: (_v: unknown, g: AdminGoodsReceipt) => g.createdBy?.name ?? '—',
    },
  ];

  const grns = grnsData?.items ?? [];

  const canSend = po.status === 'draft';
  const canCancel = po.status === 'draft' || po.status === 'sent';
  const canPay = po.status === 'partially_received' || po.status === 'received';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Title level={3} style={{ margin: 0, color: colors.text.primary }}>{po.number}</Title>
            <Tag color={STATUS_COLOR[po.status]} style={{ fontSize: 13, padding: '2px 10px' }}>
              {STATUS_LABEL[po.status]}
            </Tag>
            {po.paymentStatus && (
              <Tag color={PAYMENT_STATUS_COLOR[po.paymentStatus]} style={{ fontSize: 12, padding: '2px 8px' }}>
                {PAYMENT_STATUS_LABEL[po.paymentStatus] ?? po.paymentStatus}
              </Tag>
            )}
          </div>
          <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
            {po.supplier.name} · {po.branch.name}
          </Text>
        </div>
        <Space wrap>
          {canSend && (
            <Button
              icon={<SendOutlined />}
              loading={updatePO.isPending}
              onClick={onMarkSent}
            >
              Mark as Sent
            </Button>
          )}
          {canPay && (
            <Button
              type={!po.paymentStatus || po.paymentStatus === 'unpaid' ? 'primary' : 'default'}
              icon={<BankOutlined />}
              onClick={() => {
                paymentForm.setFieldsValue({
                  paymentStatus: po.paymentStatus ?? 'paid',
                  paymentMethod: po.paymentMethod ?? 'bank_transfer',
                  amountPaid: po.amountPaid ? po.amountPaid / 100 : null,
                  paymentDate: po.paymentDate ? dayjs(po.paymentDate) : dayjs(),
                  paymentReference: po.paymentReference ?? '',
                });
                setPaymentOpen(true);
              }}
            >
              {po.paymentStatus === 'paid' ? 'Edit Payment' : 'Record Payment'}
            </Button>
          )}
          {canReceive && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={createGRN.isPending}
              onClick={onReceive}
              size="large"
            >
              Receive Entered Qty
            </Button>
          )}
          {po.status === 'received' && !canPay && (
            <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 13, padding: '4px 12px' }}>
              Fully Received
            </Tag>
          )}
          {canCancel && (
            <Popconfirm
              title="Cancel this purchase order?"
              description="This action cannot be undone."
              okText="Cancel PO"
              okButtonProps={{ danger: true }}
              onConfirm={onCancelPO}
            >
              <Button danger icon={<CloseCircleOutlined />} loading={updatePO.isPending}>
                Cancel PO
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* PO Details */}
      <Card
        style={{ marginBottom: 20, border: `1px solid ${colors.border}`, background: colors.black.secondary }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[24, 8]}>
          <Col xs={24} sm={12} md={6}>
            <Descriptions column={1} size="small" labelStyle={{ color: colors.text.placeholder }}>
              <Descriptions.Item label="Supplier">{po.supplier.name}</Descriptions.Item>
              <Descriptions.Item label="Branch">{po.branch.name}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Descriptions column={1} size="small" labelStyle={{ color: colors.text.placeholder }}>
              <Descriptions.Item label="Ordered On">{formatDate(po.orderedAt)}</Descriptions.Item>
              <Descriptions.Item label="Expected">{formatDate(po.expectedAt)}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Descriptions column={1} size="small" labelStyle={{ color: colors.text.placeholder }}>
              <Descriptions.Item label="Subtotal">{rupees(po.subtotal)}</Descriptions.Item>
              <Descriptions.Item label="Tax">{rupees(po.taxAmt)}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: colors.text.placeholder, marginBottom: 4 }}>TOTAL</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: colors.gold.primary }}>{rupees(po.total)}</div>
            </div>
          </Col>
        </Row>
        {po.notes && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
            <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Notes: {po.notes}</Text>
          </div>
        )}
        {po.paymentStatus && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
            <Row gutter={[24, 4]}>
              <Col xs={12} sm={6}>
                <Text style={{ fontSize: 11, color: colors.text.placeholder }}>Payment Status</Text>
                <div>
                  <Tag color={PAYMENT_STATUS_COLOR[po.paymentStatus]} style={{ marginTop: 2 }}>
                    {PAYMENT_STATUS_LABEL[po.paymentStatus] ?? po.paymentStatus}
                  </Tag>
                </div>
              </Col>
              {po.paymentMethod && (
                <Col xs={12} sm={6}>
                  <Text style={{ fontSize: 11, color: colors.text.placeholder }}>Method</Text>
                  <div><Text style={{ fontSize: 13 }}>{PAYMENT_METHOD_LABEL[po.paymentMethod] ?? po.paymentMethod}</Text></div>
                </Col>
              )}
              {po.amountPaid != null && (
                <Col xs={12} sm={6}>
                  <Text style={{ fontSize: 11, color: colors.text.placeholder }}>Amount Paid</Text>
                  <div><Text strong style={{ fontSize: 13 }}>{rupees(po.amountPaid)}</Text></div>
                </Col>
              )}
              {po.paymentDate && (
                <Col xs={12} sm={6}>
                  <Text style={{ fontSize: 11, color: colors.text.placeholder }}>Payment Date</Text>
                  <div><Text style={{ fontSize: 13 }}>{formatDate(po.paymentDate)}</Text></div>
                </Col>
              )}
              {po.paymentReference && (
                <Col xs={24}>
                  <Text style={{ fontSize: 11, color: colors.text.placeholder }}>Reference: </Text>
                  <Text code style={{ fontSize: 12 }}>{po.paymentReference}</Text>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Card>

      {/* Line Items */}
      <Card
        title={<Text strong style={{ color: colors.text.primary }}>Line Items</Text>}
        style={{ marginBottom: 20, border: `1px solid ${colors.border}`, background: colors.black.secondary }}
        bodyStyle={{ padding: 0 }}
        extra={
          canReceive && (
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
              Enter quantities in the &quot;Receive Now&quot; column then click Receive
            </Text>
          )
        }
      >
        <Table<AdminPurchaseOrderItem>
          rowKey="id"
          columns={lineColumns}
          dataSource={po.items}
          pagination={false}
          size="middle"
          scroll={{ x: canReceive ? 1200 : 800 }}
        />
      </Card>

      {/* Invoice Details — shown only when receiving */}
      {canReceive && (
        <Card
          title={<Text strong style={{ color: colors.text.primary }}>Supplier Invoice Details <Text style={{ fontWeight: 400, fontSize: 12, color: colors.text.secondary }}>(optional)</Text></Text>}
          style={{ marginBottom: 20, border: `1px solid ${colors.border}`, background: colors.black.secondary }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8}>
              <Text style={{ fontSize: 12, color: colors.text.placeholder, display: 'block', marginBottom: 4 }}>Invoice Number</Text>
              <Input
                placeholder="e.g. INV-2025-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text style={{ fontSize: 12, color: colors.text.placeholder, display: 'block', marginBottom: 4 }}>Invoice Date</Text>
              <DatePicker
                style={{ width: '100%' }}
                value={invoiceDate ? dayjs(invoiceDate) : null}
                onChange={(d) => setInvoiceDate(d?.toISOString() ?? null)}
                placeholder="Select date"
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text style={{ fontSize: 12, color: colors.text.placeholder, display: 'block', marginBottom: 4 }}>Invoice Amount (₹)</Text>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                placeholder="0.00"
                prefix="₹"
                value={invoiceAmount}
                onChange={(v) => setInvoiceAmount(v)}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* GRN History */}
      <Card
        title={<Text strong style={{ color: colors.text.primary }}>Goods Receipt History</Text>}
        style={{ border: `1px solid ${colors.border}`, background: colors.black.secondary }}
        bodyStyle={{ padding: 0 }}
      >
        {grns.length === 0 ? (
          <Empty
            description={<Text style={{ color: colors.text.secondary }}>No goods received yet</Text>}
            style={{ padding: 32 }}
          />
        ) : (
          <Table<AdminGoodsReceipt>
            rowKey="id"
            columns={grnColumns}
            dataSource={grns}
            pagination={false}
            size="middle"
            scroll={{ x: 900 }}
            expandable={{
              expandedRowRender: (g) => (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={g.items}
                  style={{ margin: '0 48px' }}
                  columns={[
                    { title: 'Product', key: 'p', render: (_v, it) => `${it.product.name} (${it.product.sku})` },
                    { title: 'Qty Received', dataIndex: 'quantity', width: 130, align: 'right' },
                    { title: 'Damaged', dataIndex: 'damagedQty', width: 100, align: 'right' as const, render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : <Text style={{ color: '#999' }}>—</Text> },
                    { title: 'Good Units to Stock', key: 'good', width: 160, align: 'right' as const, render: (_v: unknown, it: import('@shared/types/admin-purchase-order').AdminGoodsReceiptItem) => <Text strong>{it.quantity - it.damagedQty}</Text> },
                  ]}
                />
              ),
            }}
          />
        )}
      </Card>

      {/* Record Payment Modal */}
      <Modal
        title="Record Payment"
        open={paymentOpen}
        onCancel={() => setPaymentOpen(false)}
        onOk={onRecordPayment}
        okText="Save Payment"
        confirmLoading={updatePO.isPending}
        width={480}
      >
        <Form form={paymentForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="paymentStatus" label="Payment Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'partial', label: 'Partially Paid' },
                { value: 'paid', label: 'Paid in Full' },
              ]}
            />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer / NEFT / RTGS' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'upi', label: 'UPI' },
                { value: 'cash', label: 'Cash' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amountPaid" label="Amount Paid (₹)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="₹"
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentDate" label="Payment Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="paymentReference" label="Reference (UTR / Cheque No. / Transaction ID)">
            <Input placeholder="Optional reference number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
