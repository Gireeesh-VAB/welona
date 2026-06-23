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
  useAdminMedias,
  useCreateAdminMedia,
  useDeleteAdminMedia,
  useUpdateAdminMedia,
} from '@/hooks/useAdminMedias';
import { useZones } from '@/hooks/useZones';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminMedia } from '@shared/types/admin-media';
import type { AdminMediaCreateInput } from '@shared/schemas/admin-medias';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const MEDIA_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Name',    key: 'name',    required: true,  type: 'string', hint: 'e.g. Instagram' },
  { header: 'State',   key: '_state',  required: true,  type: 'string', hint: 'Zone state, e.g. Telangana' },
  { header: 'Remarks', key: 'remarks', required: false, type: 'string' },
];
const MEDIA_BULK_SAMPLES = [
  { name: 'Instagram', _state: 'Telangana', remarks: 'Instagram ads' },
  { name: 'Whatsapp',  _state: 'Telangana', remarks: 'Whatsapp broadcasts' },
];

interface MediaFormValues {
  zoneId: string;
  name: string;
  remarks?: string;
  ipAddress?: string;
}

function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getFullYear()}`;
}

export default function AdminMasterMediaPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-media')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminMedias({
    search: search || undefined,
    zoneId: zoneFilter,
    page,
    limit,
  });

  const { data: zonesData } = useZones({ limit: 100 });
  const zoneOptions = useMemo(
    () =>
      (zonesData?.items ?? []).map((z) => ({
        value: z.id,
        label: `${z.country} — ${z.stateName}`,
      })),
    [zonesData],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMedia | null>(null);
  const [form] = Form.useForm<MediaFormValues>();

  const create = useCreateAdminMedia();
  const update = useUpdateAdminMedia();
  const remove = useDeleteAdminMedia();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: AdminMedia) => {
    setEditing(row);
    form.setFieldsValue({
      zoneId: row.zoneId,
      name: row.name,
      remarks: row.remarks ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: MediaFormValues) => {
    const body: AdminMediaCreateInput = {
      zoneId: values.zoneId,
      name: values.name.trim(),
      remarks: values.remarks?.trim() ? values.remarks.trim() : undefined,
      ipAddress: values.ipAddress?.trim() ? values.ipAddress.trim() : undefined,
      isActive: editing?.isActive ?? true,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Media updated');
      } else {
        await create.mutateAsync(body);
        message.success('Media added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminMedia) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Media deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminMedia> = useMemo(
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
        title: 'Zone',
        dataIndex: ['zone', 'stateName'],
        key: 'zone',
        width: 160,
        sorter: (a, b) => a.zone.stateName.localeCompare(b.zone.stateName),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'Media Name',
        dataIndex: 'name',
        width: 220,
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
            List of Media
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <BulkUploadButton
            entityName="Media"
            entityPlural="media channels"
            columns={MEDIA_BULK_COLUMNS}
            sampleRows={MEDIA_BULK_SAMPLES}
            onImport={async (row) => {
              const state = String(row._state ?? '').toLowerCase();
              const zone = (zonesData?.items ?? []).find(
                (z) => z.stateName.toLowerCase() === state,
              );
              if (!zone) throw new Error(`Zone "${row._state}" not found — add it first under Master → Zone`);
              const body: AdminMediaCreateInput = {
                zoneId: zone.id,
                name: String(row.name),
                remarks: row.remarks ? String(row.remarks) : undefined,
                isActive: true,
              };
              await create.mutateAsync(body);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Media
          </Button>
        </Space>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={12} style={{ marginBottom: 12 }} wrap>
          <Col flex="auto" style={{ minWidth: 240 }}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search media name, remarks, IP or zone"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="All zones"
              style={{ minWidth: 220 }}
              options={zoneOptions}
              value={zoneFilter}
              onChange={(v) => {
                setZoneFilter(v);
                setPage(1);
              }}
            />
          </Col>
        </Row>

        <Table<AdminMedia>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1190 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Media' : 'Add Media'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Media'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<MediaFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
         
        >
          <Form.Item
            label="Zone"
            name="zoneId"
            rules={[{ required: true, message: 'Select a zone' }]}
          >
            <Select
              showSearch
              placeholder="Pick a zone"
              options={zoneOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent="No zones — add one under Master / Zone first."
            />
          </Form.Item>
          <Form.Item
            label="Media Name"
            name="name"
            rules={[{ required: true, message: 'Enter a media name' }]}
          >
            <Input placeholder="e.g. Youtube, Website, SMS, Referral" maxLength={80} />
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
            <Input placeholder="e.g. 64.235.61.97" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
