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
  useAdminDesignations,
  useCreateAdminDesignation,
  useDeleteAdminDesignation,
  useUpdateAdminDesignation,
} from '@/hooks/useAdminDesignations';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminDesignation } from '@shared/types/admin-designation';
import type { AdminDesignationCreateInput } from '@shared/schemas/admin-designations';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const DESIGNATION_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Name',    key: 'name',    required: true,  type: 'string', hint: 'e.g. Doctor' },
  { header: 'Remarks', key: 'remarks', required: false, type: 'string', hint: 'Optional notes' },
];
const DESIGNATION_BULK_SAMPLES = [
  { name: 'Doctor',    remarks: 'Treats clients' },
  { name: 'Therapist', remarks: 'Performs sessions' },
];

interface DesignationFormValues {
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

export default function AdminHrDesignationsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('hr-designations')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useAdminDesignations({
    search: search || undefined,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDesignation | null>(null);
  const [form] = Form.useForm<DesignationFormValues>();

  const create = useCreateAdminDesignation();
  const update = useUpdateAdminDesignation();
  const remove = useDeleteAdminDesignation();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: AdminDesignation) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      remarks: row.remarks ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: DesignationFormValues) => {
    const body: AdminDesignationCreateInput = {
      name: values.name.trim(),
      remarks: values.remarks?.trim() ? values.remarks.trim() : undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Designation updated');
      } else {
        await create.mutateAsync(body);
        message.success('Designation added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminDesignation) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Designation deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminDesignation> = useMemo(
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
        title: 'Designation Name',
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
            List of Designations
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <BulkUploadButton
            entityName="Designations"
            entityPlural="designations"
            columns={DESIGNATION_BULK_COLUMNS}
            sampleRows={DESIGNATION_BULK_SAMPLES}
            onImport={async (row) => {
              await create.mutateAsync(row as AdminDesignationCreateInput);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Designation
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
          placeholder="Search designation name or remarks"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 420, marginBottom: 12 }}
        />

        <Table<AdminDesignation>
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
        title={editing ? 'Edit Designation' : 'Add Designation'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Designation'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<DesignationFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Designation Name"
            name="name"
            rules={[{ required: true, message: 'Enter a designation name' }]}
          >
            <Input placeholder="e.g. Doctor, Therapist, Receptionist" maxLength={80} />
          </Form.Item>
          <Form.Item label="Remarks" name="remarks">
            <Input.TextArea
              placeholder="Optional notes about this designation"
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
