'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  useUpdateHoliday,
} from '@/hooks/useHolidays';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminHoliday } from '@shared/types/admin-holiday';
import { HOLIDAY_TYPES, type HolidayType } from '@shared/enums';

const { Title, Text } = Typography;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TYPE_COLOR: Record<HolidayType, string> = {
  public: 'red',
  regional: 'blue',
  optional: 'gold',
};

interface FormValues {
  date: Dayjs;
  name: string;
  type: HolidayType;
  region?: string;
}

function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getUTCFullYear()}`;
}

export default function AdminHrHolidaysPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [year, setYear] = useState<number>(dayjs().year());
  const [typeFilter, setTypeFilter] = useState<HolidayType | undefined>();

  const { data, isLoading } = useHolidays({
    year,
    type: typeFilter,
    limit: 500,
  });

  const create = useCreateHoliday();
  const update = useUpdateHoliday();
  const remove = useDeleteHoliday();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHoliday | null>(null);
  const [form] = Form.useForm<FormValues>();

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'public', date: dayjs() });
    setModalOpen(true);
  };

  const openEdit = (row: AdminHoliday) => {
    setEditing(row);
    form.setFieldsValue({
      date: dayjs(row.date),
      name: row.name,
      type: row.type,
      region: row.region ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const body = {
      date: values.date.startOf('day').toISOString(),
      name: values.name.trim(),
      type: values.type,
      region: values.region?.trim() || undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Holiday updated');
      } else {
        await create.mutateAsync(body);
        message.success('Holiday added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed');
    }
  };

  const onDelete = async (row: AdminHoliday) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Holiday deleted');
    } catch (err) {
      fail(err, 'Delete failed');
    }
  };

  /** Bucketed by month for the calendar-style grouping below. */
  const byMonth = useMemo(() => {
    const buckets: AdminHoliday[][] = Array.from({ length: 12 }, () => []);
    (data?.items ?? []).forEach((h) => {
      const m = new Date(h.date).getUTCMonth();
      buckets[m].push(h);
    });
    return buckets;
  }, [data]);

  const columns: ColumnsType<AdminHoliday> = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 130,
      render: (v: string) => formatDateDmy(v),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Day',
      width: 100,
      render: (_, r) => dayjs(r.date).format('dddd'),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 110,
      render: (v: HolidayType) => <Tag color={TYPE_COLOR[v]}>{v}</Tag>,
    },
    {
      title: 'Region',
      dataIndex: 'region',
      width: 140,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
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
  ];

  const yearOptions = useMemo(() => {
    const current = dayjs().year();
    const years = [];
    for (let y = current + 1; y >= current - 4; y--) years.push(y);
    return years.map((y) => ({ value: y, label: String(y) }));
  }, []);

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
            Holidays Calendar
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Public, regional and optional holidays observed by the organisation.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Holiday
        </Button>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 12 }}
        styles={{ body: { padding: 12 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              value={year}
              onChange={setYear}
              options={yearOptions}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              allowClear
              placeholder="All types"
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={HOLIDAY_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card
            title="All holidays"
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
            styles={{ body: { padding: 0 } }}
          >
            <Table<AdminHoliday>
              rowKey="id"
              loading={isLoading}
              columns={columns}
              dataSource={data?.items ?? []}
              pagination={false}
              size="middle"
              scroll={{ y: 520 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={`Calendar (${year})`}
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          >
            {(data?.items.length ?? 0) === 0 && !isLoading ? (
              <Empty description={`No holidays added for ${year}`} />
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {byMonth.map((items, m) =>
                  items.length === 0 ? null : (
                    <div key={m}>
                      <Text strong style={{ color: colors.gold.primary }}>
                        {MONTHS[m]}
                      </Text>
                      <div style={{ marginTop: 4, display: 'grid', gap: 4 }}>
                        {items.map((h) => (
                          <div
                            key={h.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 8,
                              padding: '4px 8px',
                              borderRadius: 4,
                              background: colors.black.tertiary,
                            }}
                          >
                            <span style={{ color: colors.text.primary }}>
                              <strong>{String(new Date(h.date).getUTCDate()).padStart(2, '0')}</strong>
                              {' — '}
                              {h.name}
                            </span>
                            <Tag color={TYPE_COLOR[h.type]} style={{ marginRight: 0 }}>
                              {h.type}
                            </Tag>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Holiday' : 'Add Holiday'}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Save Changes' : 'Add'}
        confirmLoading={create.isPending || update.isPending}
        destroyOnClose
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Date"
            name="date"
            rules={[{ required: true, message: 'Pick a date' }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Holiday Name"
            name="name"
            rules={[{ required: true, message: 'Enter a name' }]}
          >
            <Input maxLength={120} placeholder="e.g. Diwali" />
          </Form.Item>
          <Form.Item
            label="Type"
            name="type"
            rules={[{ required: true, message: 'Pick a type' }]}
          >
            <Select options={HOLIDAY_TYPES.map((t) => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item label="Region" name="region" tooltip="Optional — state, branch or country">
            <Input maxLength={80} placeholder="e.g. Telangana" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
