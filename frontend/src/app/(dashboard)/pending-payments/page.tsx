'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { usePendingPayments, useRecordPayment } from '@/hooks/useSales';
import StatusTag from '@/components/sales/StatusTag';
import { ApiClientError } from '@/lib/api-client';
import { PAYMENT_METHODS } from '@shared/enums';
import { formatDate, formatMoney, titleCase, toMinorUnits } from '@shared/format';
import type { PendingPayment } from '@shared/types/sales';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Is a due date in the past? */
function isOverdue(dueAt: string | null): boolean {
  if (!dueAt) return false;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return new Date(dueAt).getTime() < startToday;
}

/** Pending Payments — every invoice with an outstanding balance to collect. */
export default function PendingPaymentsPage() {
  const { message } = App.useApp();
  const { data, isLoading } = usePendingPayments();
  const recordPayment = useRecordPayment();

  const [payTarget, setPayTarget] = useState<PendingPayment | null>(null);
  const [form] = Form.useForm();

  const openPay = (row: PendingPayment) => {
    setPayTarget(row);
    form.setFieldsValue({
      amount: row.outstanding / 100,
      method: 'cash',
      receivedAt: dayjs(),
      reference: undefined,
    });
  };

  const handlePay = async () => {
    if (!payTarget) return;
    const v = await form.validateFields();
    try {
      await recordPayment.mutateAsync({
        invoiceId: payTarget.id,
        body: {
          amount: toMinorUnits(v.amount),
          method: v.method,
          reference: v.reference || undefined,
          receivedAt: v.receivedAt ? v.receivedAt.toISOString() : undefined,
        },
      });
      message.success('Payment recorded');
      setPayTarget(null);
      form.resetFields();
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not record payment');
    }
  };

  const columns: ColumnsType<PendingPayment> = [
    { title: 'Invoice', dataIndex: 'number' },
    { title: 'Customer', dataIndex: 'customerName' },
    {
      title: 'Due',
      dataIndex: 'dueAt',
      render: (v: string | null) =>
        v ? (
          <span style={{ color: isOverdue(v) ? colors.status.error : undefined }}>
            {formatDate(v)}
            {isOverdue(v) && (
              <Tag color="red" style={{ marginLeft: 6 }}>
                Overdue
              </Tag>
            )}
          </span>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    { title: 'Total', dataIndex: 'total', render: (v: number) => formatMoney(v) },
    { title: 'Paid', dataIndex: 'amountPaid', render: (v: number) => formatMoney(v) },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding',
      render: (v: number) => (
        <Text strong style={{ color: colors.status.warning }}>
          {formatMoney(v)}
        </Text>
      ),
    },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Action',
      key: 'action',
      render: (_, row) => (
        <Button type="link" size="small" onClick={() => openPay(row)}>
          Record Payment
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Pending Payments
      </Title>
      <Text type="secondary">Invoices that still have an outstanding balance to collect.</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col xs={12} md={8}>
          <Card>
            <Statistic
              title="Total Outstanding"
              value={formatMoney(data?.summary.totalOutstanding ?? 0)}
              valueStyle={{ color: colors.status.warning }}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card>
            <Statistic title="Pending Invoices" value={data?.summary.count ?? 0} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table<PendingPayment>
          rowKey="id"
          columns={columns}
          dataSource={data?.invoices ?? []}
          loading={isLoading}
          pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty description="No pending payments — all invoices are settled" /> }}
        />
      </Card>

      <Modal
        title={payTarget ? `Record Payment — ${payTarget.number}` : 'Record Payment'}
        open={!!payTarget}
        onOk={handlePay}
        confirmLoading={recordPayment.isPending}
        onCancel={() => setPayTarget(null)}
        okText="Record Payment"
        destroyOnClose
      >
        {payTarget && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Outstanding balance: <strong>{formatMoney(payTarget.outstanding)}</strong>
          </Text>
        )}
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="amount"
            label="Amount (₹)"
            rules={[{ required: true, message: 'Enter an amount' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="method" label="Method" style={{ flex: 1 }}>
              <Select
                options={PAYMENT_METHODS.map((m) => ({
                  label: m === 'upi' ? 'UPI' : titleCase(m),
                  value: m,
                }))}
              />
            </Form.Item>
            <Form.Item name="receivedAt" label="Received On" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="reference" label="Reference" style={{ marginBottom: 0 }}>
            <Input placeholder="Transaction / cheque reference (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
