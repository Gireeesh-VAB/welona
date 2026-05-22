'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
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
  useAdminCancellationCustomers,
  useCreateAdminCancellationCustomer,
  useDeleteAdminCancellationCustomer,
  useUpdateAdminCancellationCustomer,
} from '@/hooks/useAdminCancellationCustomers';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminCancellationCustomer } from '@shared/types/admin-cancellation-customer';

const { Title, Text } = Typography;

interface CustomerFormValues {
  name: string;
  mobileNo: string;
  gender?: 'male' | 'female' | 'other';
  email?: string;
}

export default function AdminCancellationCustomersPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useAdminCancellationCustomers({
    search: search || undefined,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCancellationCustomer | null>(null);
  const [form] = Form.useForm<CustomerFormValues>();

  const create = useCreateAdminCancellationCustomer();
  const update = useUpdateAdminCancellationCustomer();
  const remove = useDeleteAdminCancellationCustomer();

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: AdminCancellationCustomer) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      mobileNo: row.mobileNo,
      gender: (row.gender ?? undefined) as CustomerFormValues['gender'],
      email: row.email ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: CustomerFormValues) => {
    const body = {
      name: values.name.trim(),
      mobileNo: values.mobileNo.trim(),
      gender: values.gender,
      email: values.email?.trim() || undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Customer updated');
      } else {
        await create.mutateAsync(body);
        message.success('Customer added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminCancellationCustomer) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Customer deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminCancellationCustomer> = useMemo(
    () => [
      {
        title: 'Manage',
        key: 'actions',
        width: 110,
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
      {
        title: 'Name',
        dataIndex: 'name',
        width: 240,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (v: string) => (
          <span style={{ color: colors.text.primary, fontWeight: 600 }}>{v}</span>
        ),
      },
      {
        title: 'MobileNo',
        dataIndex: 'mobileNo',
        width: 180,
        render: (v: string) => <span style={{ color: colors.text.primary }}>{v}</span>,
      },
      {
        title: 'Gender',
        dataIndex: 'gender',
        width: 120,
        render: (v: string | null) =>
          v ? <span style={{ color: colors.text.primary }}>{v}</span> : emptyCell,
      },
      {
        title: 'Email',
        dataIndex: 'email',
        width: 260,
        render: (v: string | null) =>
          v ? <span style={{ color: colors.text.primary }}>{v}</span> : emptyCell,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.text.primary, colors.text.placeholder, colors.status.error],
  );

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
      `${range[0]} - ${range[1]} of ${total} item${total === 1 ? '' : 's'}`,
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
            List of Customers
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Customer master used by the cancellation workflow.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Customer
        </Button>
      </div>

      <Card
        style={{
          background: colors.black.secondary,
          border: `1px solid ${colors.border}`,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name, mobile or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 420, marginBottom: 12 }}
        />
        <Table<AdminCancellationCustomer>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 910 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Customer' : 'Add Customer'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Customer'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<CustomerFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item
            label="MobileNo"
            name="mobileNo"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item label="Gender" name="gender">
            <Select
              allowClear
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Invalid email' }]}
          >
            <Input maxLength={120} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
