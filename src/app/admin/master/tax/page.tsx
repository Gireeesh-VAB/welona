'use client';

import { useMemo, useState } from 'react';
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
  useAdminTaxes,
  useCreateAdminTax,
  useDeleteAdminTax,
  useUpdateAdminTax,
} from '@/hooks/useAdminTaxes';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminTax } from '@/types/admin-tax';
import type { AdminTaxCreateInput } from '@/lib/admin-taxes';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const TAX_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Name',    key: 'name',       required: true,  type: 'string', hint: 'e.g. GST 18' },
  { header: 'Percent', key: 'percentBps', required: true,  type: 'number',
    hint: 'Percentage value, e.g. 18 for 18%',
    transform: (v) => Math.round(Number(v) * 100), // store as basis points
    validate: (v) => {
      const n = Number(v);
      if (n < 0 || n > 100) return 'Percent must be between 0 and 100';
      return null;
    } },
  { header: 'Remarks', key: 'remarks',    required: false, type: 'string', hint: 'Optional' },
];
const TAX_BULK_SAMPLES = [
  { name: 'GST 5',  percentBps: '5',  remarks: 'GST 5% slab' },
  { name: 'GST 18', percentBps: '18', remarks: 'GST 18% slab' },
];

interface TaxFormValues {
  name: string;
  /** Decimal percentage as entered by the user (e.g. 2.5). */
  percent: number;
  remarks?: string;
  ipAddress?: string;
}

const percentToBps = (percent: number) => Math.round((percent || 0) * 100);
const bpsToPercent = (bps: number) => bps / 100;

/** Render percent — strips trailing ".00" so 18 shows as "18" but 2.5 as "2.5". */
function formatPercent(bps: number): string {
  const p = bpsToPercent(bps);
  return Number.isInteger(p) ? String(p) : p.toFixed(2).replace(/\.?0+$/, '');
}

function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getFullYear()}`;
}

export default function AdminMasterTaxPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-tax')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminTaxes({
    search: search || undefined,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTax | null>(null);
  const [form] = Form.useForm<TaxFormValues>();

  const create = useCreateAdminTax();
  const update = useUpdateAdminTax();
  const remove = useDeleteAdminTax();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ percent: 0 });
    setModalOpen(true);
  };

  const openEdit = (row: AdminTax) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      percent: bpsToPercent(row.percentBps),
      remarks: row.remarks ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: TaxFormValues) => {
    const body: AdminTaxCreateInput = {
      name: values.name.trim(),
      percentBps: percentToBps(values.percent),
      remarks: values.remarks?.trim() ? values.remarks.trim() : undefined,
      ipAddress: values.ipAddress?.trim() ? values.ipAddress.trim() : undefined,
      isActive: editing?.isActive ?? true,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Tax updated');
      } else {
        await create.mutateAsync(body);
        message.success('Tax added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminTax) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Tax deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminTax> = useMemo(
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
        title: 'Tax Name',
        dataIndex: 'name',
        width: 200,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'Tax Percentage',
        dataIndex: 'percentBps',
        width: 160,
        sorter: (a, b) => a.percentBps - b.percentBps,
        render: (value: number) => (
          <span style={{ color: colors.text.primary }}>{formatPercent(value)}</span>
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
            List Of Taxes
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <BulkUploadButton
            entityName="Taxes"
            entityPlural="tax rates"
            columns={TAX_BULK_COLUMNS}
            sampleRows={TAX_BULK_SAMPLES}
            onImport={async (row) => {
              await create.mutateAsync(row as AdminTaxCreateInput);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Tax
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
          placeholder="Search tax name, remarks or IP address"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 420, marginBottom: 12 }}
        />

        <Table<AdminTax>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1010 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Tax' : 'Add Tax'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Tax'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<TaxFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Tax Name"
            name="name"
            rules={[{ required: true, message: 'Enter a tax name' }]}
          >
            <Input placeholder="e.g. CGST, SGST, IGST, GST 18" maxLength={60} />
          </Form.Item>
          <Form.Item
            label="Tax Percentage"
            name="percent"
            rules={[{ required: true, message: 'Required' }]}
            tooltip="Decimal percent — e.g. 2.5 for 2.5%, 18 for 18%"
          >
            <InputNumber
              min={0}
              max={100}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="0"
              addonAfter="%"
            />
          </Form.Item>
          <Form.Item label="Remarks" name="remarks">
            <Input.TextArea
              placeholder="Description / notes"
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
                message: 'Enter a valid IPv4 address',
              },
            ]}
          >
            <Input placeholder="e.g. 104.238.80.211" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
