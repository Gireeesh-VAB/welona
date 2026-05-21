'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useInvoices, useInvoice, useIssueInvoice, useRecordPayment } from '@/hooks/useSales';
import SalesNav from '@/components/sales/SalesNav';
import StatusTag from '@/components/sales/StatusTag';
import { ApiClientError } from '@/lib/api-client';
import { PAYMENT_METHODS } from '@/lib/enums';
import { formatDate, formatMoney, titleCase, toMinorUnits } from '@/lib/format';
import type { Invoice, Payment } from '@/types/sales';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Detail drawer for an invoice: payments, issue and record-payment actions. */
function InvoiceDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { message } = App.useApp();
  const { data: invoice, isLoading } = useInvoice(id);
  const issueInvoice = useIssueInvoice();
  const recordPayment = useRecordPayment();
  const [payOpen, setPayOpen] = useState(false);
  const [form] = Form.useForm();

  const fail = (e: unknown) =>
    message.error(e instanceof ApiClientError ? e.message : 'Action failed');

  const balance = invoice ? invoice.total - invoice.amountPaid : 0;

  const issue = async () => {
    if (!id) return;
    try {
      await issueInvoice.mutateAsync(id);
      message.success('Invoice issued');
    } catch (e) {
      fail(e);
    }
  };

  const submitPayment = async () => {
    if (!id) return;
    const values = await form.validateFields();
    try {
      await recordPayment.mutateAsync({
        invoiceId: id,
        body: {
          amount: toMinorUnits(values.amount),
          method: values.method,
          reference: values.reference,
        },
      });
      message.success('Payment recorded');
      setPayOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e);
    }
  };

  const paymentColumns: ColumnsType<Payment> = [
    { title: 'Received', dataIndex: 'receivedAt', render: (v: string) => formatDate(v) },
    { title: 'Method', dataIndex: 'method', render: (v: string) => titleCase(v) },
    { title: 'Reference', dataIndex: 'reference', render: (v: string | null) => v || '—' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (v: number) => <strong>{formatMoney(v)}</strong>,
    },
  ];

  return (
    <Drawer
      title={invoice ? `Invoice ${invoice.number}` : 'Invoice'}
      open={!!id}
      onClose={onClose}
      width={600}
      loading={isLoading}
      extra={invoice && <StatusTag status={invoice.status} />}
    >
      {invoice && (
        <>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Customer">{invoice.customer?.name}</Descriptions.Item>
            <Descriptions.Item label="Order">{invoice.order?.number || '—'}</Descriptions.Item>
            <Descriptions.Item label="Issued">{formatDate(invoice.issuedAt)}</Descriptions.Item>
            <Descriptions.Item label="Due">{formatDate(invoice.dueAt)}</Descriptions.Item>
          </Descriptions>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <div>
              <Text type="secondary">Subtotal: </Text>
              {formatMoney(invoice.subtotal)}
            </div>
            <div>
              <Text type="secondary">Tax: </Text>
              {formatMoney(invoice.taxAmt)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Total: {formatMoney(invoice.total)}</div>
            <div style={{ color: colors.status.success }}>
              Paid: {formatMoney(invoice.amountPaid)}
            </div>
            <div style={{ color: colors.status.warning }}>Balance: {formatMoney(balance)}</div>
          </div>

          <Space style={{ marginTop: 16 }}>
            {invoice.status === 'draft' && (
              <Button type="primary" loading={issueInvoice.isPending} onClick={issue}>
                Issue Invoice
              </Button>
            )}
            {(invoice.status === 'issued' || invoice.status === 'partially_paid') && (
              <Button type="primary" onClick={() => setPayOpen(true)}>
                Record Payment
              </Button>
            )}
          </Space>

          <Title level={5} style={{ marginTop: 24 }}>
            Payments
          </Title>
          <Table<Payment>
            rowKey="id"
            size="small"
            columns={paymentColumns}
            dataSource={invoice.payments ?? []}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No payments" /> }}
          />

          <Modal
            title="Record payment"
            open={payOpen}
            onOk={submitPayment}
            confirmLoading={recordPayment.isPending}
            onCancel={() => setPayOpen(false)}
            destroyOnClose
          >
            <Form
              form={form}
              layout="vertical"
              preserve={false}
              initialValues={{ method: 'cash', amount: Math.round(balance / 100) }}
            >
              <Form.Item
                name="amount"
                label="Amount (₹)"
                rules={[{ required: true, message: 'Enter the amount' }]}
              >
                <InputNumber min={1} step={500} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="method" label="Method">
                <Select options={PAYMENT_METHODS.map((m) => ({ label: titleCase(m), value: m }))} />
              </Form.Item>
              <Form.Item name="reference" label="Reference">
                <Input placeholder="Transaction / cheque reference" />
              </Form.Item>
            </Form>
          </Modal>
        </>
      )}
    </Drawer>
  );
}

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading } = useInvoices({ page, limit: 10, status: statusFilter });
  const [detailId, setDetailId] = useState<string | null>(null);

  const columns: ColumnsType<Invoice> = [
    { title: 'Number', dataIndex: 'number', width: 130 },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Order', dataIndex: ['order', 'number'], render: (v?: string) => v || '—' },
    { title: 'Total', dataIndex: 'total', render: (v: number) => formatMoney(v) },
    {
      title: 'Paid',
      dataIndex: 'amountPaid',
      render: (v: number) => <span style={{ color: colors.status.success }}>{formatMoney(v)}</span>,
    },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    { title: 'Due', dataIndex: 'dueAt', render: (v: string | null) => formatDate(v) },
  ];

  return (
    <div>
      <SalesNav />

      <Title level={3} style={{ marginTop: 0 }}>
        Invoices
      </Title>
      <Text style={{ color: colors.text.secondary }}>
        Invoices are raised from sales orders. Open one to issue it or record a payment.
      </Text>

      <Card style={{ marginTop: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={['draft', 'issued', 'partially_paid', 'paid', 'void'].map((s) => ({
              label: titleCase(s),
              value: s,
            }))}
          />
        </Space>

        <Table<Invoice>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          onRow={(row) => ({
            onClick: () => setDetailId(row.id),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: 10,
            total: data?.meta.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>

      <InvoiceDrawer id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
