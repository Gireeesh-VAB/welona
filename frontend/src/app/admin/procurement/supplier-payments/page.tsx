'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { BankOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePurchaseOrders, useUpdatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminPurchaseOrder } from '@shared/types/admin-purchase-order';
import type { PurchaseOrderStatus } from '@shared/enums';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const PO_STATUS_COLOR: Record<PurchaseOrderStatus, string> = {
  draft: 'default', sent: 'blue', partially_received: 'gold', received: 'green', cancelled: 'red',
};
const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft', sent: 'Sent', partially_received: 'Partial', received: 'Received', cancelled: 'Cancelled',
};
const PAY_COLOR: Record<string, string> = { unpaid: 'red', partial: 'orange', paid: 'green' };
const PAY_LABEL: Record<string, string> = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };
const METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Bank Transfer', cheque: 'Cheque', upi: 'UPI', cash: 'Cash', other: 'Other',
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SupplierPaymentsPage() {
  const router = useRouter();
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [paymentPO, setPaymentPO] = useState<AdminPurchaseOrder | null>(null);
  const [form] = Form.useForm();

  // Show POs that have been at least partially received
  const { data: receivedData, isLoading: loadingReceived } = usePurchaseOrders({
    status: 'received', page, limit: 20,
  });
  const { data: partialData, isLoading: loadingPartial } = usePurchaseOrders({
    status: 'partially_received', page: 1, limit: 20,
  });

  const updatePO = useUpdatePurchaseOrder();

  const openPaymentModal = (po: AdminPurchaseOrder) => {
    setPaymentPO(po);
    form.setFieldsValue({
      paymentStatus: po.paymentStatus ?? 'paid',
      paymentMethod: po.paymentMethod ?? 'bank_transfer',
      amountPaid: po.amountPaid ? po.amountPaid / 100 : null,
      paymentDate: po.paymentDate ? dayjs(po.paymentDate) : dayjs(),
      paymentReference: po.paymentReference ?? '',
    });
  };

  const onSavePayment = async () => {
    if (!paymentPO) return;
    try {
      const vals = await form.validateFields();
      await updatePO.mutateAsync({
        id: paymentPO.id,
        body: {
          paymentStatus: vals.paymentStatus,
          paymentMethod: vals.paymentMethod,
          amountPaid: vals.amountPaid ? Math.round(vals.amountPaid * 100) : null,
          paymentDate: vals.paymentDate ? vals.paymentDate.toISOString() : null,
          paymentReference: vals.paymentReference || null,
        },
      });
      setPaymentPO(null);
      message.success('Payment recorded');
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof ApiClientError ? err.message : 'Could not save payment');
    }
  };

  const allPOs = [
    ...(partialData?.items ?? []),
    ...(receivedData?.items ?? []),
  ];
  const meta = receivedData?.meta;
  const isLoading = loadingReceived || loadingPartial;

  const columns: ColumnsType<AdminPurchaseOrder> = [
    {
      title: 'PO #', dataIndex: 'number', width: 140,
      render: (v: string, row) => (
        <Button type="link" size="small" style={{ padding: 0, height: 'auto' }}
          icon={<LinkOutlined />}
          onClick={() => router.push(`/admin/procurement/purchase-orders/${row.id}`)}>
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        </Button>
      ),
    },
    { title: 'Supplier', key: 's', render: (_v, r) => r.supplier.name },
    { title: 'Branch', key: 'b', render: (_v, r) => r.branch.name },
    {
      title: 'PO Status', dataIndex: 'status', width: 120,
      render: (v: PurchaseOrderStatus) => <Tag color={PO_STATUS_COLOR[v]}>{PO_STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Total Amount', dataIndex: 'total', width: 130, align: 'right',
      render: (v: number) => <Text strong>{rupees(v)}</Text>,
    },
    {
      title: 'Payment Status', dataIndex: 'paymentStatus', width: 140,
      render: (v: string | null) =>
        v ? (
          <Tag color={PAY_COLOR[v] ?? 'default'}>{PAY_LABEL[v] ?? v}</Tag>
        ) : (
          <Tag color="red">Unpaid</Tag>
        ),
    },
    {
      title: 'Amount Paid', dataIndex: 'amountPaid', width: 120, align: 'right',
      render: (v: number | null) =>
        v != null ? rupees(v) : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Payment Date', dataIndex: 'paymentDate', width: 120,
      render: (v: string | null) => formatDate(v),
    },
    {
      title: 'Method', dataIndex: 'paymentMethod', width: 120,
      render: (v: string | null) =>
        v ? (METHOD_LABEL[v] ?? v) : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Reference', dataIndex: 'paymentReference', width: 150,
      render: (v: string | null) =>
        v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Action', key: 'action', width: 140, fixed: 'right',
      render: (_v, r) => (
        <Space>
          <Button
            size="small"
            type={!r.paymentStatus || r.paymentStatus === 'unpaid' ? 'primary' : 'default'}
            icon={<BankOutlined />}
            onClick={() => openPaymentModal(r)}
          >
            {r.paymentStatus === 'paid' ? 'Edit' : 'Record Payment'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: colors.text.primary }}>Supplier Payments</Title>
        <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
          Track payments made to suppliers against received purchase orders
        </Text>
      </div>

      <Card
        style={{ border: `1px solid ${colors.border}`, background: colors.black.secondary }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<AdminPurchaseOrder>
          rowKey="id"
          columns={columns}
          dataSource={allPOs}
          loading={isLoading}
          size="middle"
          scroll={{ x: 1400 }}
          pagination={
            meta
              ? {
                  current: page,
                  pageSize: 20,
                  total: meta.total,
                  onChange: (p) => setPage(p),
                  showTotal: (t) => `${t} order${t !== 1 ? 's' : ''}`,
                }
              : false
          }
        />
      </Card>

      {/* Record Payment Modal */}
      <Modal
        title="Record Payment"
        open={!!paymentPO}
        onCancel={() => setPaymentPO(null)}
        onOk={onSavePayment}
        okText="Save Payment"
        confirmLoading={updatePO.isPending}
        width={480}
      >
        {paymentPO && (
          <div style={{ marginBottom: 12, color: colors.text.secondary, fontSize: 13 }}>
            PO: <Text code>{paymentPO.number}</Text>
            {' · '}
            {paymentPO.supplier.name}
            {' · '}
            Total: <Text strong>{rupees(paymentPO.total)}</Text>
          </div>
        )}
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
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
                <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="₹" placeholder="0.00" />
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
