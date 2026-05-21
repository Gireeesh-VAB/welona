'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
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
  useAdminSystemUsers,
  useCreateAdminSystemUser,
  useDeleteAdminSystemUser,
  useUpdateAdminSystemUser,
} from '@/hooks/useAdminSystemUsers';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminEmployees } from '@/hooks/useAdminEmployees';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminSystemUser } from '@/types/admin-system-user';
import type { AdminSystemUserCreateInput } from '@/lib/admin-system-users';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const USER_BULK_COLUMNS: BulkColumn[] = [
  { header: 'User Name',     key: 'userName', required: true,  type: 'string',
    hint: 'Letters/digits/._- only, e.g. priya.kapoor',
    validate: (v) => /^[A-Za-z0-9._-]+$/.test(v) ? null : 'Letters, digits, dot, dash or underscore only',
  },
  { header: 'Password',      key: 'password', required: true,  type: 'string',
    hint: 'Min 6 chars',
    validate: (v) => v.length >= 6 ? null : 'Password must be at least 6 characters' },
  { header: 'Email',         key: 'email',    required: false, type: 'email' },
  { header: 'Employee Code', key: '_empCode', required: false, type: 'string', hint: 'Existing Employee Code, e.g. EMP-0001' },
  { header: 'Branch Code',   key: '_branchCode', required: false, type: 'string', hint: 'Existing Branch Code, e.g. JH001' },
];
const USER_BULK_SAMPLES = [
  { userName: 'priya.kapoor', password: 'Welona@123', email: 'priya.kapoor@welona.com', _empCode: 'EMP-0002', _branchCode: 'BH002' },
];

interface UserFormValues {
  userName: string;
  password?: string;
  email?: string;
  branchId?: string;
  employeeId?: string;
}

export default function AdminHrUserPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useAdminSystemUsers({
    search: search || undefined,
    page,
    limit,
  });

  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const { data: employeesData } = useAdminEmployees({ limit: 200 });
  const branchOptions = useMemo(
    () =>
      (branchesData?.items ?? []).map((b) => ({
        value: b.id,
        label: `${b.branchName} (${b.branchCode})`,
      })),
    [branchesData],
  );
  const employeeOptions = useMemo(
    () =>
      (employeesData?.items ?? []).map((e) => ({
        value: e.id,
        label: `${e.name} (${e.employeeCode})`,
      })),
    [employeesData],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSystemUser | null>(null);
  const [form] = Form.useForm<UserFormValues>();

  const create = useCreateAdminSystemUser();
  const update = useUpdateAdminSystemUser();
  const remove = useDeleteAdminSystemUser();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: AdminSystemUser) => {
    setEditing(row);
    form.setFieldsValue({
      userName: row.userName,
      email: row.email ?? undefined,
      branchId: row.branch?.id,
      employeeId: row.employee?.id,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: UserFormValues) => {
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          body: {
            userName: values.userName.trim(),
            password: values.password?.trim() || undefined,
            email: values.email?.trim() || undefined,
            branchId: values.branchId,
            employeeId: values.employeeId,
          },
        });
        message.success('User updated');
      } else {
        if (!values.password) {
          message.error('Password is required when creating a user.');
          return;
        }
        const body: AdminSystemUserCreateInput = {
          userName: values.userName.trim(),
          password: values.password,
          email: values.email?.trim() || undefined,
          branchId: values.branchId,
          employeeId: values.employeeId,
        };
        await create.mutateAsync(body);
        message.success('User added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminSystemUser) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('User deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>null</Text>
  );

  const columns: ColumnsType<AdminSystemUser> = useMemo(
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
              title={`Delete ${row.userName}?`}
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
        title: 'User Name',
        dataIndex: 'userName',
        width: 200,
        sorter: (a, b) => a.userName.localeCompare(b.userName),
        render: (v: string) => <span style={{ color: colors.text.primary }}>{v}</span>,
      },
      {
        title: 'Email',
        dataIndex: 'email',
        width: 240,
        render: (v: string | null) =>
          v ? <span style={{ color: colors.text.primary }}>{v}</span> : emptyCell,
      },
      {
        title: 'Branch Name',
        dataIndex: ['branch', 'name'],
        key: 'branch',
        width: 200,
        render: (_: unknown, row) =>
          row.branch ? (
            <span style={{ color: colors.text.primary }}>{row.branch.name}</span>
          ) : (
            emptyCell
          ),
      },
      {
        title: 'Employee Name',
        dataIndex: ['employee', 'name'],
        key: 'employee',
        width: 220,
        render: (_: unknown, row) =>
          row.employee ? (
            <span style={{ color: colors.text.primary }}>{row.employee.name}</span>
          ) : (
            emptyCell
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
            List of Users
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            System login users linked to an employee and branch.
          </Text>
        </div>
        <Space>
          <BulkUploadButton
            entityName="System Users"
            entityPlural="system users"
            columns={USER_BULK_COLUMNS}
            sampleRows={USER_BULK_SAMPLES}
            onImport={async (row) => {
              const empCode = String(row._empCode ?? '').toLowerCase();
              const branchCode = String(row._branchCode ?? '').toLowerCase();
              const employee = empCode
                ? (employeesData?.items ?? []).find((e) => e.employeeCode.toLowerCase() === empCode)
                : undefined;
              const branch = branchCode
                ? (branchesData?.items ?? []).find((b) => b.branchCode.toLowerCase() === branchCode)
                : undefined;
              if (row._empCode && !employee) throw new Error(`Employee code "${row._empCode}" not found`);
              if (row._branchCode && !branch) throw new Error(`Branch code "${row._branchCode}" not found`);
              const body: AdminSystemUserCreateInput = {
                userName: String(row.userName),
                password: String(row.password),
                email: row.email ? String(row.email) : undefined,
                employeeId: employee?.id,
                branchId: branch?.id,
              };
              await create.mutateAsync(body);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add User
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
          placeholder="Search by user name, email, branch or employee"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 460, marginBottom: 12 }}
        />

        <Table<AdminSystemUser>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 970 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit User' : 'Add User'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add User'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<UserFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="User Name"
                name="userName"
                rules={[
                  { required: true, message: 'Required' },
                  {
                    pattern: /^[A-Za-z0-9._-]+$/,
                    message: 'Letters, digits, dot, dash or underscore',
                  },
                ]}
              >
                <Input maxLength={80} placeholder="e.g. priya.kapoor" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={editing ? 'New Password (leave blank to keep)' : 'Password'}
                name="password"
                rules={
                  editing
                    ? [{ min: 6, message: 'Minimum 6 characters' }]
                    : [
                        { required: true, message: 'Required' },
                        { min: 6, message: 'Minimum 6 characters' },
                      ]
                }
              >
                <Input.Password maxLength={80} placeholder="••••••" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Invalid email' }]}
          >
            <Input maxLength={120} placeholder="optional" />
          </Form.Item>
          <Form.Item label="Branch" name="branchId">
            <Select
              showSearch
              allowClear
              placeholder="Pick from master"
              options={branchOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item label="Employee" name="employeeId">
            <Select
              showSearch
              allowClear
              placeholder="Pick from master"
              options={employeeOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
