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
  useZones,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
} from '@/hooks/useZones';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { Zone } from '@/types/zone';
import type { ZoneCreateInput } from '@/lib/zones';

const { Title, Text } = Typography;

interface ZoneFormValues {
  country: string;
  stateName: string;
  remarks?: string;
}

/** Format an ISO date as "21 May 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminMasterZonePage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-zone')!;
  const { message } = App.useApp();

  // --- Table state ---
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useZones({ search: search || undefined, page, limit });

  // --- Modal state ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form] = Form.useForm<ZoneFormValues>();

  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const deleteZone = useDeleteZone();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (zone: Zone) => {
    setEditing(zone);
    form.setFieldsValue({
      country: zone.country,
      stateName: zone.stateName,
      remarks: zone.remarks ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: ZoneFormValues) => {
    const body: ZoneCreateInput = {
      country: values.country.trim(),
      stateName: values.stateName.trim(),
      remarks: values.remarks?.trim() ? values.remarks.trim() : undefined,
    };
    try {
      if (editing) {
        await updateZone.mutateAsync({ id: editing.id, body });
        message.success('Zone updated');
      } else {
        await createZone.mutateAsync(body);
        message.success('Zone added');
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      fail(err, 'Save failed. Please try again.');
    }
  };

  const onDelete = async (zone: Zone) => {
    try {
      await deleteZone.mutateAsync(zone.id);
      message.success('Zone deleted');
    } catch (err) {
      fail(err, 'Delete failed. Please try again.');
    }
  };

  const columns: ColumnsType<Zone> = useMemo(
    () => [
      {
        title: 'Country',
        dataIndex: 'country',
        sorter: (a, b) => a.country.localeCompare(b.country),
        width: 180,
      },
      {
        title: 'State Name',
        dataIndex: 'stateName',
        sorter: (a, b) => a.stateName.localeCompare(b.stateName),
      },
      {
        title: 'Remarks',
        dataIndex: 'remarks',
        render: (value: string | null) =>
          value ? (
            <Text>{value}</Text>
          ) : (
            <Text style={{ color: colors.text.placeholder }}>—</Text>
          ),
      },
      {
        title: 'Created Date',
        dataIndex: 'createdAt',
        width: 160,
        render: (value: string) => formatDate(value),
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 160,
        align: 'right',
        render: (_, zone) => (
          <Space size="small">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(zone)}
            >
              Edit
            </Button>
            <Popconfirm
              title={`Delete ${zone.country} / ${zone.stateName}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => onDelete(zone)}
            >
              <Button size="small" type="text" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // openEdit / onDelete are stable enough; colors recolour when palette changes
    // and React Query handles its own invalidation, so the memo deps are minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.text.placeholder],
  );

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    onChange: (nextPage, nextSize) => {
      setPage(nextPage);
      if (nextSize !== limit) setLimit(nextSize);
    },
    showTotal: (total) => `${total} zone${total === 1 ? '' : 's'}`,
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
            {navItem.label}
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Zone
        </Button>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search country, state or remarks"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 360, marginBottom: 12 }}
        />

        <Table<Zone>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
        />
      </Card>

      <Modal
        title={editing ? 'Edit Zone' : 'Add Zone'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Zone'}
        confirmLoading={createZone.isPending || updateZone.isPending}
        destroyOnClose
      >
        <Form<ZoneFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Country"
            name="country"
            rules={[{ required: true, message: 'Enter the country' }]}
          >
            <Input placeholder="e.g. India" maxLength={80} />
          </Form.Item>
          <Form.Item
            label="State Name"
            name="stateName"
            rules={[{ required: true, message: 'Enter the state name' }]}
          >
            <Input placeholder="e.g. Puducherry" maxLength={120} />
          </Form.Item>
          <Form.Item label="Remarks" name="remarks">
            <Input.TextArea
              placeholder="Optional notes about this zone"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
