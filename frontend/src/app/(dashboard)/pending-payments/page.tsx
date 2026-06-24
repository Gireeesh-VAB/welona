'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  BankOutlined,
  CreditCardOutlined,
  MobileOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { usePendingPayments, useRecordPayment, useBranchPaymentModes } from '@/hooks/useSales';
import StatusTag from '@/components/sales/StatusTag';
import { ApiClientError } from '@/lib/api-client';
import { formatDate, formatMoney, toMinorUnits } from '@shared/format';
import type { PendingPayment } from '@shared/types/sales';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Fallback icon heuristic based on payment mode name */
function modeIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('cash') || n.includes('wallet')) return <WalletOutlined />;
  if (n.includes('card') || n.includes('credit') || n.includes('debit')) return <CreditCardOutlined />;
  if (n.includes('upi') || n.includes('phone') || n.includes('gpay') || n.includes('paytm') || n.includes('mobile'))
    return <MobileOutlined />;
  return <BankOutlined />;
}

/** Is a due date in the past? */
function isOverdue(dueAt: string | null): boolean {
  if (!dueAt) return false;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return new Date(dueAt).getTime() < startToday;
}

/** Premium card-style payment method selector */
function PaymentMethodGrid({
  modes,
  value,
  onChange,
}: {
  modes: { id: string; name: string; remarks: string | null }[];
  value?: string;
  onChange?: (id: string) => void;
}) {
  if (!modes.length) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        No payment modes configured for this branch.
      </Text>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: 10,
      }}
    >
      {modes.map((m) => {
        const selected = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange?.(m.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 8px',
              border: selected
                ? `2px solid ${colors.gold.primary}`
                : `1.5px solid ${colors.border}`,
              borderRadius: 10,
              background: selected ? `${colors.gold.primary}18` : colors.black.secondary,
              cursor: 'pointer',
              transition: 'all 0.18s',
              outline: 'none',
              minHeight: 76,
            }}
          >
            <span
              style={{
                fontSize: 22,
                color: selected ? colors.gold.primary : colors.text.secondary,
                transition: 'color 0.18s',
              }}
            >
              {modeIcon(m.name)}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: selected ? 700 : 500,
                color: selected ? colors.gold.primary : colors.text.primary,
                textAlign: 'center',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {m.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Pending Payments — every invoice with an outstanding balance to collect. */
export default function PendingPaymentsPage() {
  const { message } = App.useApp();
  const { data, isLoading } = usePendingPayments();
  const recordPayment = useRecordPayment();
  const { data: paymentModes = [] } = useBranchPaymentModes();

  const [payTarget, setPayTarget] = useState<PendingPayment | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | undefined>();
  const [form] = Form.useForm();

  const openPay = (row: PendingPayment) => {
    setPayTarget(row);
    setSelectedMode(paymentModes[0]?.id);
    form.setFieldsValue({
      amount: row.outstanding / 100,
      receivedAt: dayjs(),
      reference: undefined,
    });
  };

  const handlePay = async () => {
    if (!payTarget) return;
    const v = await form.validateFields();
    if (!selectedMode) {
      message.warning('Please select a payment method');
      return;
    }
    const modeName = paymentModes.find((m) => m.id === selectedMode)?.name ?? selectedMode;
    try {
      await recordPayment.mutateAsync({
        invoiceId: payTarget.id,
        body: {
          amount: toMinorUnits(v.amount),
          method: modeName,
          reference: v.reference || undefined,
          receivedAt: v.receivedAt ? v.receivedAt.toISOString() : undefined,
        },
      });
      message.success('Payment recorded');
      setPayTarget(null);
      setSelectedMode(undefined);
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
          Collect Payment
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
        title={null}
        open={!!payTarget}
        onOk={handlePay}
        confirmLoading={recordPayment.isPending}
        onCancel={() => { setPayTarget(null); setSelectedMode(undefined); }}
        okText="Confirm Payment"
        okButtonProps={{ style: { background: colors.gold.primary, borderColor: colors.gold.primary } }}
        width={480}
        destroyOnClose
      >
        {payTarget && (
          <>
            {/* Header */}
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.gold.primary}22 0%, ${colors.black.secondary} 100%)`,
                border: `1px solid ${colors.gold.primary}44`,
                borderRadius: 10,
                padding: '16px 20px',
                marginBottom: 20,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                Invoice · {payTarget.number}
              </Text>
              <Title level={4} style={{ margin: 0, color: colors.text.primary }}>
                {payTarget.customerName}
              </Title>
              <div style={{ marginTop: 10, display: 'flex', gap: 24 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Total</Text>
                  <Text strong style={{ fontSize: 15 }}>{formatMoney(payTarget.total)}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Paid</Text>
                  <Text strong style={{ fontSize: 15, color: colors.status.success }}>{formatMoney(payTarget.amountPaid)}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Outstanding</Text>
                  <Text strong style={{ fontSize: 15, color: colors.status.warning }}>{formatMoney(payTarget.outstanding)}</Text>
                </div>
              </div>
            </div>

            <Form form={form} layout="vertical" preserve={false}>
              <Form.Item
                name="amount"
                label="Amount to Collect (₹)"
                rules={[{ required: true, message: 'Enter an amount' }]}
              >
                <InputNumber
                  min={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  size="large"
                  prefix="₹"
                />
              </Form.Item>

              <Divider style={{ margin: '8px 0 14px' }} />

              <div style={{ marginBottom: 14 }}>
                <Text strong style={{ fontSize: 13 }}>Payment Method</Text>
                <div style={{ marginTop: 10 }}>
                  <PaymentMethodGrid
                    modes={paymentModes}
                    value={selectedMode}
                    onChange={setSelectedMode}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item name="receivedAt" label="Received On" style={{ flex: 1 }}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="reference" label="Reference / TXN ID" style={{ flex: 1, marginBottom: 0 }}>
                  <Input placeholder="Optional" />
                </Form.Item>
              </div>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
