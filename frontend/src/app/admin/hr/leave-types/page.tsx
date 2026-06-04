'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  useCreateLeaveType,
  useDeleteLeaveType,
  useLeaveTypes,
  useUpdateLeaveType,
} from '@/hooks/useLeaveTypes';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminLeaveType } from '@shared/types/admin-leave-type';
import type { AdminLeaveTypeCreateInput } from '@shared/schemas/admin-leave-types';

const { Title, Text } = Typography;

interface FormValues {
  name: string;
  code: string;
  daysPerYear: number;
  paid: boolean;
  description?: string;
}

export default function AdminHrLeaveTypesPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useLeaveTypes({
    search: search || undefined,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLeaveType | null>(null);
  const [form] = Form.useForm<FormValues>();

  const create = useCreateLeaveType();
  const update = useUpdateLeaveType();
  const remove = useDeleteLeaveType();

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ paid: true, daysPerYear: 12 });
    setModalOpen(true);
  };

  const openEdit = (row: AdminLeaveType) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      code: row.code,
      daysPerYear: row.daysPerYear,
      paid: row.paid,
      description: row.description ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const body: AdminLeaveTypeCreateInput = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      daysPerYear: values.daysPerYear,
      paid: values.paid,
      description: values.description?.trim() || undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Leave type updated');
      } else {
        await create.mutateAsync(body);
        message.success('Leave type added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed');
    }
  };

  const onDelete = async (row: AdminLeaveType) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Leave type deleted');
    } catch (err) {
      fail(err, 'Delete failed');
    }
  };

  const columns: ColumnsType<AdminLeaveType> = [
    {
      title: 'Manage',
      key: 'actions',
      width: 100,
      fixed: 'left',
      render: (_, row) => (
        <Space size={6}>
          <Tooltip title="Edit">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(row)}
              style={{ background: '#5B2C8B', borderColor: '#5B2C8B' }}
            />
          </Tooltip>
          <Popconfirm
            title={`Delete ${row.name}?`}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => onDelete(row)}
          >
            <Tooltip title="Delete">
              <Button
                size="small"
                icon={<DeleteOutlined />}
                style={{
                  background: colors.status.error,
                  borderColor: colors.status.error,
                  color: '#FFFFFF',
                }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
    { title: 'Code', dataIndex: 'code', width: 80, render: (v) => <Tag color="gold">{v}</Tag> },
    {
      title: 'Name',
      dataIndex: 'name',
      width: 220,
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
      ),
    },
    {
      title: 'Days / Year',
      dataIndex: 'daysPerYear',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.daysPerYear - b.daysPerYear,
    },
    {
      title: 'Paid?',
      dataIndex: 'paid',
      width: 90,
      align: 'center',
      render: (v: boolean) =>
        v ? <Tag color="green">Paid</Tag> : <Tag color="default">Unpaid</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    onChange: (next, size) => {
      setPage(next);
      if (size !== limit) setLimit(size);
    },
    showTotal: (total, range) =>
      `${range[0]} - ${range[1]} of ${total} type${total === 1 ? '' : 's'}`,
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            Leave Types
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Categories of leave (Casual, Sick, Earned…) and their annual default
            allocation.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Leave Type
        </Button>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name, code or description"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 420, marginBottom: 12 }}
        />

        <Table<AdminLeaveType>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 920 }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Leave Type' : 'Add Leave Type'}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Save Changes' : 'Add'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Enter a name' }]}
          >
            <Input maxLength={80} placeholder="e.g. Casual Leave" />
          </Form.Item>
          <Form.Item
            label="Short Code"
            name="code"
            rules={[
              { required: true, message: 'Enter a short code' },
              { pattern: /^[A-Za-z0-9_-]+$/, message: 'Letters, digits, _ or - only' },
            ]}
            tooltip="Short, uppercase mnemonic (e.g. CL, SL, EL)"
          >
            <Input maxLength={8} placeholder="CL" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item
            label="Default days per year"
            name="daysPerYear"
            rules={[{ required: true, message: 'Required' }]}
          >
            <InputNumber min={0} max={365} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Paid leave?" name="paid" valuePropName="checked">
            <Switch checkedChildren="Paid" unCheckedChildren="Unpaid" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
