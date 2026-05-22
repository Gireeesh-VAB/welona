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
  useAdminPaymentModes,
  useCreateAdminPaymentMode,
  useDeleteAdminPaymentMode,
  useUpdateAdminPaymentMode,
} from '@/hooks/useAdminPaymentModes';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminPaymentMode } from '@shared/types/admin-payment-mode';
import type { AdminPaymentModeCreateInput } from '@shared/schemas/admin-payment-modes';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const PAYMENT_MODE_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Name',    key: 'name',    required: true,  type: 'string', hint: 'e.g. UPI' },
  { header: 'Remarks', key: 'remarks', required: false, type: 'string', hint: 'Optional notes' },
];
const PAYMENT_MODE_BULK_SAMPLES = [
  { name: 'UPI',         remarks: 'GPay / PhonePe / Paytm' },
  { name: 'Credit Card', remarks: 'POS terminal' },
];

const { Title, Text } = Typography;

interface PaymentModeFormValues {
  name: string;
  remarks?: string;
  ipAddress?: string;
}

/** Format an ISO timestamp as "dd-MM-yyyy" to match the source design. */
function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function AdminMasterPaymentModePage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-payment-mode')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminPaymentModes({
    search: search || undefined,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPaymentMode | null>(null);
  const [form] = Form.useForm<PaymentModeFormValues>();

  const create = useCreateAdminPaymentMode();
  const update = useUpdateAdminPaymentMode();
  const remove = useDeleteAdminPaymentMode();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: AdminPaymentMode) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      remarks: row.remarks ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: PaymentModeFormValues) => {
    const body: AdminPaymentModeCreateInput = {
      name: values.name.trim(),
      remarks: values.remarks?.trim() ? values.remarks.trim() : undefined,
      ipAddress: values.ipAddress?.trim() ? values.ipAddress.trim() : undefined,
      isActive: editing?.isActive ?? true,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Payment mode updated');
      } else {
        await create.mutateAsync(body);
        message.success('Payment mode added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminPaymentMode) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Payment mode deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminPaymentMode> = useMemo(
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
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
      {
        title: 'Category',
        dataIndex: 'name',
        width: 200,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'Remarks',
        dataIndex: 'remarks',
        width: 260,
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
        title: 'CreatedBy',
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
    [colors.text.primary, colors.text.placeholder],
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
            List of Paymodes
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <BulkUploadButton
            entityName="Payment Modes"
            entityPlural="payment modes"
            columns={PAYMENT_MODE_BULK_COLUMNS}
            sampleRows={PAYMENT_MODE_BULK_SAMPLES}
            onImport={async (row) => {
              await create.mutateAsync(row as AdminPaymentModeCreateInput);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Paymode
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
          placeholder="Search by name, remarks or IP address"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 420, marginBottom: 12 }}
        />

        <Table<AdminPaymentMode>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1120 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Payment Mode' : 'Add Payment Mode'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Paymode'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<PaymentModeFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Category (Name)"
            name="name"
            rules={[{ required: true, message: 'Enter a payment mode name' }]}
          >
            <Input placeholder="e.g. Cash, Cheque, Bajaj, Medscred" maxLength={80} />
          </Form.Item>
          <Form.Item label="Remarks" name="remarks">
            <Input.TextArea
              placeholder="Description shown next to the name"
              rows={2}
              maxLength={300}
              showCount
            />
          </Form.Item>
          <Form.Item
            label="IP Address"
            name="ipAddress"
            rules={[
              {
                pattern:
                  /^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/,
                message: 'Enter a valid IPv4 address (e.g. 192.168.1.10)',
              },
            ]}
          >
            <Input placeholder="e.g. 64.235.61.97" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
