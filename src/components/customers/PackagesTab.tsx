'use client';

import { useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePackages, useCreatePackage, useUpdatePackage } from '@/hooks/useCustomerModules';
import { useTreatments } from '@/hooks/useSales';
import { ApiClientError } from '@/lib/api-client';
import { PACKAGE_STATUSES } from '@/lib/enums';
import { formatDate, formatMoney, titleCase, toMinorUnits } from '@/lib/format';
import type { Package } from '@/types/customer-modules';

const { Text } = Typography;
const statusOptions = PACKAGE_STATUSES.map((s) => ({ label: titleCase(s), value: s }));

/** Packages module — session-based treatment packages for a customer. */
export default function PackagesTab({ customerId }: { customerId: string }) {
  const { message } = App.useApp();
  const { data, isLoading } = usePackages(customerId);
  const { data: treatments } = useTreatments();
  const createPackage = useCreatePackage(customerId);
  const updatePackage = useUpdatePackage(customerId);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const handleCreate = async () => {
    const v = await form.validateFields();
    try {
      await createPackage.mutateAsync({
        name: v.name,
        treatmentId: v.treatmentId || undefined,
        totalSessions: v.totalSessions,
        price: toMinorUnits(v.price),
        expiresAt: v.expiresAt ? v.expiresAt.toISOString() : undefined,
        notes: v.notes || undefined,
      });
      message.success('Package added');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e, 'Could not add package');
    }
  };

  const patch = async (id: string, body: Record<string, unknown>, ok: string) => {
    try {
      await updatePackage.mutateAsync({ id, body });
      message.success(ok);
    } catch (e) {
      fail(e, 'Could not update package');
    }
  };

  const columns: ColumnsType<Package> = [
    { title: 'Package', dataIndex: 'name' },
    {
      title: 'Sessions',
      key: 'sessions',
      width: 200,
      render: (_, row) => (
        <Space direction="vertical" size={0} style={{ width: 160 }}>
          <Text style={{ fontSize: 12 }}>
            {row.usedSessions} / {row.totalSessions} used
          </Text>
          <Progress
            percent={Math.round((row.usedSessions / row.totalSessions) * 100)}
            size="small"
            showInfo={false}
          />
        </Space>
      ),
    },
    { title: 'Price', dataIndex: 'price', render: (v: number) => formatMoney(v) },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      render: (v: string | null) => (v ? formatDate(v) : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (s: string, row) => (
        <Select
          size="small"
          value={s}
          style={{ width: 130 }}
          options={statusOptions}
          onChange={(value) => patch(row.id, { status: value }, 'Status updated')}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, row) => (
        <Button
          size="small"
          type="link"
          disabled={row.usedSessions >= row.totalSessions}
          onClick={() =>
            patch(row.id, { usedSessions: row.usedSessions + 1 }, 'Session recorded')
          }
        >
          Use session
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Package
        </Button>
      </div>

      <Table<Package>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
        locale={{ emptyText: <Empty description="No packages yet" /> }}
      />

      <Modal
        title="Add Package"
        open={open}
        onOk={handleCreate}
        confirmLoading={createPackage.isPending}
        onCancel={() => setOpen(false)}
        okText="Save Package"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Package Name"
            rules={[{ required: true, message: 'Package name is required' }]}
          >
            <Input placeholder="e.g. Slimming Package — 10 Sessions" />
          </Form.Item>
          <Form.Item name="treatmentId" label="Treatment (optional)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Link to a treatment"
              options={(treatments ?? [])
                .filter((t) => t.isActive)
                .map((t) => ({ label: t.name, value: t.id }))}
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              name="totalSessions"
              label="Total Sessions"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="10" />
            </Form.Item>
            <Form.Item name="price" label="Price (₹)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
          </div>
          <Form.Item name="expiresAt" label="Expiry Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>

      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        {data?.length ?? 0} package(s)
      </Text>
    </div>
  );
}
