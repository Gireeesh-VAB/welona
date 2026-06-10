'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
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
  useAdminStates,
  useCreateAdminState,
  useDeleteAdminState,
  useUpdateAdminState,
} from '@/hooks/useAdminStates';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminState } from '@shared/types/admin-state';
import type { AdminStateCreateInput } from '@shared/schemas/admin-states';

const { Title, Text } = Typography;

interface StateFormValues {
  name: string;
  code: string;
  isActive: boolean;
}

function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getFullYear()}`;
}

export default function AdminMasterStatesPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-states')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminStates({
    search: search || undefined,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminState | null>(null);
  const [form] = Form.useForm<StateFormValues>();

  const create = useCreateAdminState();
  const update = useUpdateAdminState();
  const remove = useDeleteAdminState();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setModalOpen(true);
  };

  const openEdit = (row: AdminState) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      code: row.code,
      isActive: row.isActive,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: StateFormValues) => {
    const body: AdminStateCreateInput = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      isActive: values.isActive,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('State updated');
      } else {
        await create.mutateAsync(body);
        message.success('State added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminState) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('State deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const columns: ColumnsType<AdminState> = useMemo(
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
        title: 'State Name',
        dataIndex: 'name',
        width: 220,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'State Code',
        dataIndex: 'code',
        width: 130,
        sorter: (a, b) => a.code.localeCompare(b.code),
        render: (value: string) => (
          <Text code style={{ fontSize: 12 }}>{value}</Text>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'isActive',
        width: 120,
        render: (value: boolean) =>
          value ? (
            <Badge status="success" text={<span style={{ color: colors.text.primary }}>Active</span>} />
          ) : (
            <Badge status="default" text={<span style={{ color: colors.text.placeholder }}>Inactive</span>} />
          ),
      },
      {
        title: 'Created Date',
        dataIndex: 'createdAt',
        width: 140,
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{formatDateDmy(value)}</span>
        ),
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
            State Master
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add State
        </Button>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search state name or code"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 420, marginBottom: 12 }}
        />

        <Table<AdminState>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 720 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit State' : 'Add State'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add State'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<StateFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="State Name"
            name="name"
            rules={[{ required: true, message: 'Enter a state name' }]}
          >
            <Input placeholder="e.g. Maharashtra, Tamil Nadu" maxLength={100} />
          </Form.Item>
          <Form.Item
            label="State Code"
            name="code"
            rules={[
              { required: true, message: 'Enter a state code' },
              { min: 2, max: 10, message: 'Code must be 2-10 characters' },
            ]}
            tooltip="Short uppercase code, e.g. MH, TN, DL"
          >
            <Input
              placeholder="e.g. MH"
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
              onChange={(e) =>
                form.setFieldValue('code', e.target.value.toUpperCase())
              }
            />
          </Form.Item>
          <Form.Item
            label="Status"
            name="isActive"
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
