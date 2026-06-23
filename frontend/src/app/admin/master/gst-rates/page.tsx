'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
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
  useAdminGstRates,
  useCreateAdminGstRate,
  useDeleteAdminGstRate,
  useUpdateAdminGstRate,
} from '@/hooks/useAdminGstRates';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminGstRate, GstTaxType } from '@shared/types/admin-gst-rate';
import type { AdminGstRateCreateInput } from '@shared/schemas/admin-gst-rates';

const { Title, Text } = Typography;

interface GstRateFormValues {
  name: string;
  percentage: number;
  taxType: GstTaxType;
  isActive: boolean;
}

function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

export default function AdminMasterGstRatesPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-gst-rates')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminGstRates({
    search: search || undefined,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGstRate | null>(null);
  const [form] = Form.useForm<GstRateFormValues>();

  const create = useCreateAdminGstRate();
  const update = useUpdateAdminGstRate();
  const remove = useDeleteAdminGstRate();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ percentage: 0, taxType: 'exclusive', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (row: AdminGstRate) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      percentage: row.percentage,
      taxType: row.taxType,
      isActive: row.isActive,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: GstRateFormValues) => {
    const body: AdminGstRateCreateInput = {
      name: values.name.trim(),
      percentage: values.percentage,
      taxType: values.taxType,
      isActive: values.isActive,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('GST Rate updated');
      } else {
        await create.mutateAsync(body);
        message.success('GST Rate added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminGstRate) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('GST Rate deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminGstRate> = useMemo(
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
              title={`Delete "${row.name}"?`}
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
        width: 200,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'Percentage',
        dataIndex: 'percentage',
        width: 130,
        sorter: (a, b) => a.percentage - b.percentage,
        render: (value: number) => (
          <span style={{ color: colors.text.primary, fontWeight: 500 }}>{value}%</span>
        ),
      },
      {
        title: 'Tax Type',
        dataIndex: 'taxType',
        width: 140,
        render: (value: GstTaxType) =>
          value === 'inclusive' ? (
            <Badge color="blue" text={<span style={{ color: colors.text.primary }}>Inclusive</span>} />
          ) : (
            <Badge color="green" text={<span style={{ color: colors.text.primary }}>Exclusive</span>} />
          ),
      },
      {
        title: 'Status',
        dataIndex: 'isActive',
        width: 100,
        render: (value: boolean) =>
          value ? (
            <Badge status="success" text={<span style={{ color: colors.text.primary }}>Active</span>} />
          ) : (
            <Badge status="default" text={<span style={{ color: colors.text.placeholder }}>Inactive</span>} />
          ),
      },
      {
        title: 'Created',
        dataIndex: 'createdAt',
        width: 140,
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (value: string) =>
          value ? (
            <span style={{ color: colors.text.primary }}>{formatDateDmy(value)}</span>
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
            GST Rate Master
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            {navItem?.description ?? 'GST rate slabs with tax type used on invoices.'}
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add GST Rate
        </Button>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search GST rate name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 380, marginBottom: 12 }}
        />

        <Table<AdminGstRate>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 820 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit GST Rate' : 'Add GST Rate'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add GST Rate'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<GstRateFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
         
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Enter a GST rate name' }]}
          >
            <Input placeholder="e.g. GST 18%" maxLength={60} />
          </Form.Item>

          <Form.Item
            label="Percentage"
            name="percentage"
            rules={[{ required: true, message: 'Enter the percentage value' }]}
            tooltip="Whole number between 0 and 100, e.g. 18 for 18%"
          >
            <InputNumber
              min={0}
              max={100}
              step={1}
              precision={0}
              style={{ width: '100%' }}
              placeholder="0"
              addonAfter="%"
            />
          </Form.Item>

          <Form.Item
            label="Tax Type"
            name="taxType"
            rules={[{ required: true, message: 'Select a tax type' }]}
          >
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="exclusive">Exclusive</Radio.Button>
              <Radio.Button value="inclusive">Inclusive</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
