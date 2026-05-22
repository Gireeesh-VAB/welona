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
  useAdminDepartments,
  useCreateAdminDepartment,
  useDeleteAdminDepartment,
  useUpdateAdminDepartment,
} from '@/hooks/useAdminDepartments';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminDepartment } from '@shared/types/admin-department';
import type { AdminDepartmentCreateInput } from '@shared/schemas/admin-departments';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const DEPARTMENT_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Name',    key: 'name',    required: true,  type: 'string', hint: 'e.g. Front Desk' },
  { header: 'Remarks', key: 'remarks', required: false, type: 'string', hint: 'Optional description' },
];
const DEPARTMENT_BULK_SAMPLES = [
  { name: 'Front Desk', remarks: 'Reception & customer-facing roles' },
  { name: 'Clinical',   remarks: 'Doctors, therapists, nurses' },
];

interface DepartmentFormValues {
  name: string;
  remarks?: string;
}

function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getFullYear()}`;
}

export default function AdminHrDepartmentsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('hr-departments')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useAdminDepartments({
    search: search || undefined,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDepartment | null>(null);
  const [form] = Form.useForm<DepartmentFormValues>();

  const create = useCreateAdminDepartment();
  const update = useUpdateAdminDepartment();
  const remove = useDeleteAdminDepartment();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: AdminDepartment) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, remarks: row.remarks ?? undefined });
    setModalOpen(true);
  };

  const onSubmit = async (values: DepartmentFormValues) => {
    const body: AdminDepartmentCreateInput = {
      name: values.name.trim(),
      remarks: values.remarks?.trim() ? values.remarks.trim() : undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Department updated');
      } else {
        await create.mutateAsync(body);
        message.success('Department added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminDepartment) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Department deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminDepartment> = useMemo(
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
        title: 'Department Name',
        dataIndex: 'name',
        width: 240,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'Remarks',
        dataIndex: 'remarks',
        width: 240,
        render: (value: string | null) =>
          value ? (
            <span style={{ color: colors.text.primary }}>{value}</span>
          ) : (
            emptyCell
          ),
      },
      {
        title: 'IP Address',
        dataIndex: 'ipAddress',
        width: 160,
        render: (value: string | null) =>
          value ? (
            <Text code style={{ fontSize: 12 }}>{value}</Text>
          ) : (
            emptyCell
          ),
      },
      {
        title: 'Created By',
        dataIndex: ['createdBy', 'name'],
        key: 'createdBy',
        width: 160,
        render: (_: unknown, row) =>
          row.createdBy ? (
            <span style={{ color: colors.text.primary }}>{row.createdBy.name}</span>
          ) : (
            emptyCell
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
            List of Departments
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <BulkUploadButton
            entityName="Departments"
            entityPlural="departments"
            columns={DEPARTMENT_BULK_COLUMNS}
            sampleRows={DEPARTMENT_BULK_SAMPLES}
            onImport={async (row) => {
              await create.mutateAsync(row as AdminDepartmentCreateInput);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Department
          </Button>
        </Space>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search department name or remarks"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 420, marginBottom: 12 }}
        />

        <Table<AdminDepartment>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1050 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Department' : 'Add Department'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Department'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<DepartmentFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Department Name"
            name="name"
            rules={[{ required: true, message: 'Enter a department name' }]}
          >
            <Input placeholder="e.g. Front Desk, Clinical, Finance" maxLength={80} />
          </Form.Item>
          <Form.Item label="Remarks" name="remarks">
            <Input.TextArea
              placeholder="Optional notes about this department"
              rows={3}
              maxLength={300}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
