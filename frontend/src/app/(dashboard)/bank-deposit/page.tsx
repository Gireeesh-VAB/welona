'use client';

import { useState } from 'react';
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Statistic, Table, Tag, Typography } from 'antd';
import { BankOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useVouchers, useCreateVoucher } from '@/hooks/useCash';
import { formatDate, formatMoney, toMinorUnits } from '@shared/format';
import { ApiClientError } from '@/lib/api-client';
import type { Voucher } from '@shared/types/cash';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

export default function BankDepositPage() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { data: vouchers, isLoading } = useVouchers();
  const create = useCreateVoucher();

  const bankReceipts = (vouchers ?? []).filter((v) => v.voucherType === 'receipt');

  const columns: ColumnsType<Voucher> = [
    { title: 'Voucher No', dataIndex: 'number', render: (v) => <Text style={{ color: colors.gold.primary }}>{v}</Text> },
    { title: 'Date', dataIndex: 'voucherDate', render: (v) => formatDate(v) },
    { title: 'Party', dataIndex: 'party' },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v) => <Text strong>{formatMoney(v)}</Text> },
    { title: 'Mode', dataIndex: 'mode', render: (v) => <Tag>{v}</Tag> },
    { title: 'Narration', dataIndex: 'narration', render: (v) => v ?? '—' },
  ];

  const onSubmit = async (values: { amount: number; party: string; narration?: string; voucherDate: ReturnType<typeof dayjs> }) => {
    try {
      await create.mutateAsync({
        voucherType: 'receipt',
        amount: toMinorUnits(values.amount),
        party: values.party,
        mode: 'bank_transfer',
        narration: values.narration || undefined,
        voucherDate: values.voucherDate ? values.voucherDate.toISOString() : undefined,
      });
      message.success('Bank deposit recorded');
      setOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Failed to record deposit');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>Bank Deposit</Title>
          <Text style={{ color: colors.text.placeholder }}>Record cash deposits to the bank account.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New Deposit</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Total Deposits</Text>}
              value={bankReceipts.reduce((s, v) => s + v.amount, 0) / 100} prefix={<BankOutlined style={{ color: colors.gold.primary }} />}
              suffix="₹" precision={2} valueStyle={{ color: colors.text.primary }} loading={isLoading} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Entries</Text>}
              value={bankReceipts.length} valueStyle={{ color: colors.text.primary }} loading={isLoading} />
          </Card>
        </Col>
      </Row>

      {open && (
        <Card title="New Bank Deposit" style={{ background: colors.black.secondary, border: `1px solid ${colors.gold.primary}`, marginBottom: 16 }}>
          <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
            <Row gutter={16}>
              <Col xs={24} sm={6}>
                <Form.Item name="voucherDate" label="Date" initialValue={dayjs()} rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Enter amount' }]}>
                  <InputNumber min={0.01} precision={2} style={{ width: '100%' }} prefix="₹" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="party" label="Bank / Party" rules={[{ required: true, message: 'Enter bank name' }]}>
                  <Input placeholder="e.g. HDFC Bank" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="narration" label="Narration">
                  <Input placeholder="Optional note" />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" htmlType="submit" loading={create.isPending}>Save Deposit</Button>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </Form>
        </Card>
      )}

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
        <Table rowKey="id" loading={isLoading} dataSource={bankReceipts} columns={columns}
          pagination={{ pageSize: 20 }} size="middle" />
      </Card>
    </div>
  );
}
