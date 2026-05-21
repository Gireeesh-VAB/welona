'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useVouchers, useCreateVoucher } from '@/hooks/useCash';
import { ApiClientError } from '@/lib/api-client';
import { VOUCHER_MODES, VOUCHER_TYPES } from '@/lib/enums';
import { formatDate, formatMoney, titleCase, toMinorUnits } from '@/lib/format';
import type { Voucher } from '@/types/cash';

const { Title, Text } = Typography;

/** Voucher type → tag colour. */
const TYPE_COLOR: Record<string, string> = {
  payment: 'red',
  receipt: 'green',
  journal: 'blue',
  contra: 'gold',
};

/** Voucher Entry — record payment, receipt, journal and contra vouchers. */
export default function VoucherEntryPage() {
  const { message } = App.useApp();
  const { data, isLoading } = useVouchers();
  const createVoucher = useCreateVoucher();

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = async () => {
    const v = await form.validateFields();
    try {
      await createVoucher.mutateAsync({
        voucherType: v.voucherType,
        voucherDate: v.voucherDate ? v.voucherDate.toISOString() : undefined,
        party: v.party,
        amount: toMinorUnits(v.amount),
        mode: v.mode,
        narration: v.narration || undefined,
      });
      message.success('Voucher created');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not create voucher');
    }
  };

  const columns: ColumnsType<Voucher> = [
    { title: 'Voucher No.', dataIndex: 'number' },
    { title: 'Date', dataIndex: 'voucherDate', render: (v: string) => formatDate(v) },
    {
      title: 'Type',
      dataIndex: 'voucherType',
      render: (t: string) => <Tag color={TYPE_COLOR[t] ?? 'default'}>{titleCase(t)}</Tag>,
    },
    { title: 'Party', dataIndex: 'party' },
    { title: 'Mode', dataIndex: 'mode', render: (m: string) => titleCase(m) },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (v: number) => <Text strong>{formatMoney(v)}</Text>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Title level={3} style={{ marginTop: 0 }}>
            Voucher Entry
          </Title>
          <Text type="secondary">Record payment, receipt, journal and contra vouchers.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New Voucher
        </Button>
      </div>

      <Card style={{ marginTop: 16 }}>
        <Table<Voucher>
          rowKey="id"
          columns={columns}
          dataSource={data ?? []}
          loading={isLoading}
          pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty description="No vouchers yet" /> }}
        />
      </Card>

      <Modal
        title="New Voucher"
        open={open}
        onOk={handleAdd}
        confirmLoading={createVoucher.isPending}
        onCancel={() => setOpen(false)}
        okText="Save Voucher"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={{ voucherType: 'payment', mode: 'cash' }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="voucherType" label="Voucher Type" style={{ flex: 1 }}>
              <Select
                options={VOUCHER_TYPES.map((t) => ({ label: titleCase(t), value: t }))}
              />
            </Form.Item>
            <Form.Item name="voucherDate" label="Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item
            name="party"
            label="Party"
            rules={[{ required: true, message: 'Party is required' }]}
          >
            <Input placeholder="Person or account the voucher is for" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              name="amount"
              label="Amount (₹)"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Enter an amount' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="mode" label="Mode" style={{ flex: 1 }}>
              <Select options={VOUCHER_MODES.map((m) => ({ label: titleCase(m), value: m }))} />
            </Form.Item>
          </div>
          <Form.Item name="narration" label="Narration" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Notes / purpose of the voucher" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
