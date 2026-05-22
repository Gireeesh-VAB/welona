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
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePettyCash, useCreatePettyCash } from '@/hooks/useCash';
import { ApiClientError } from '@/lib/api-client';
import { formatDate, formatMoney, toMinorUnits } from '@shared/format';
import type { PettyCashEntry } from '@shared/types/cash';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Petty Cash Entry — log small cash received and spent. */
export default function PettyCashPage() {
  const { message } = App.useApp();
  const { data, isLoading } = usePettyCash();
  const createEntry = useCreatePettyCash();

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = async () => {
    const v = await form.validateFields();
    try {
      await createEntry.mutateAsync({
        direction: v.direction,
        entryDate: v.entryDate ? v.entryDate.toISOString() : undefined,
        category: v.category || undefined,
        description: v.description,
        amount: toMinorUnits(v.amount),
        paidTo: v.paidTo || undefined,
        reference: v.reference || undefined,
      });
      message.success('Entry recorded');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not save entry');
    }
  };

  const columns: ColumnsType<PettyCashEntry> = [
    { title: 'Date', dataIndex: 'entryDate', render: (v: string) => formatDate(v) },
    {
      title: 'Type',
      dataIndex: 'direction',
      render: (d: string) => (
        <Tag color={d === 'in' ? 'green' : 'red'}>{d === 'in' ? 'Cash In' : 'Cash Out'}</Tag>
      ),
    },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Category', dataIndex: 'category', render: (v: string | null) => v || '—' },
    { title: 'Paid To / From', dataIndex: 'paidTo', render: (v: string | null) => v || '—' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (v: number, row) => (
        <Text strong style={{ color: row.direction === 'in' ? colors.status.success : colors.status.error }}>
          {row.direction === 'in' ? '+' : '−'} {formatMoney(v)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Title level={3} style={{ marginTop: 0 }}>
            Petty Cash Entry
          </Title>
          <Text type="secondary">Track small cash received into and spent from petty cash.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Entry
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total In"
              value={formatMoney(data?.summary.totalIn ?? 0)}
              valueStyle={{ color: colors.status.success }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Out"
              value={formatMoney(data?.summary.totalOut ?? 0)}
              valueStyle={{ color: colors.status.error }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Balance in Hand"
              value={formatMoney(data?.summary.balance ?? 0)}
              valueStyle={{ color: colors.gold.primary }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table<PettyCashEntry>
          rowKey="id"
          columns={columns}
          dataSource={data?.entries ?? []}
          loading={isLoading}
          pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty description="No petty cash entries yet" /> }}
        />
      </Card>

      <Modal
        title="Add Petty Cash Entry"
        open={open}
        onOk={handleAdd}
        confirmLoading={createEntry.isPending}
        onCancel={() => setOpen(false)}
        okText="Save Entry"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={{ direction: 'out' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="direction" label="Type" style={{ flex: 1 }}>
              <Select
                options={[
                  { label: 'Cash Out (spent)', value: 'out' },
                  { label: 'Cash In (received)', value: 'in' },
                ]}
              />
            </Form.Item>
            <Form.Item name="entryDate" label="Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <Input placeholder="e.g. Office stationery, Tea & snacks" />
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
            <Form.Item name="category" label="Category" style={{ flex: 1 }}>
              <Input placeholder="e.g. Supplies, Travel" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="paidTo" label="Paid To / From" style={{ flex: 1 }}>
              <Input placeholder="Person or vendor" />
            </Form.Item>
            <Form.Item name="reference" label="Reference" style={{ flex: 1, marginBottom: 0 }}>
              <Input placeholder="Bill / voucher no." />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
