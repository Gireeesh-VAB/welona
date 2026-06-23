'use client';

import { useMemo, useState } from 'react';
import {
  App, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Table, Tag, Tooltip, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useAdminTreatments,
  useCreateAdminTreatment,
  useUpdateAdminTreatment,
  useDeleteAdminTreatment,
} from '@/hooks/useAdminSales';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { Treatment } from '@shared/types/sales';

const { Title } = Typography;

interface FormValues {
  name: string;
  category?: string;
  description?: string;
  durationMinutes?: number;
  priceRupees?: number;
}

export default function TreatmentsPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const { data: treatments = [], isLoading } = useAdminTreatments();
  const create = useCreateAdminTreatment();
  const update = useUpdateAdminTreatment();
  const remove = useDeleteAdminTreatment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);
  const [form] = Form.useForm<FormValues>();

  const filtered = useMemo(() =>
    treatments.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.category ?? '').toLowerCase().includes(search.toLowerCase()),
    ),
    [treatments, search],
  );

  const fail = (err: unknown) =>
    message.error(err instanceof ApiClientError ? err.message : 'Action failed');

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (row: Treatment) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      category: row.category ?? undefined,
      description: row.description ?? undefined,
      durationMinutes: row.durationMinutes ?? undefined,
      priceRupees: row.price != null ? row.price / 100 : undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const body = {
      name: values.name.trim(),
      category: values.category?.trim() || undefined,
      description: values.description?.trim() || undefined,
      durationMinutes: values.durationMinutes ?? undefined,
      price: values.priceRupees != null ? Math.round(values.priceRupees * 100) : undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Treatment updated');
      } else {
        await create.mutateAsync(body);
        message.success('Treatment added');
      }
      setModalOpen(false);
    } catch (err) { fail(err); }
  };

  const toggleActive = async (row: Treatment) => {
    try {
      await update.mutateAsync({ id: row.id, body: { isActive: !row.isActive } });
      message.success(row.isActive ? 'Deactivated' : 'Activated');
    } catch (err) { fail(err); }
  };

  const onDelete = async (row: Treatment) => {
    try { await remove.mutateAsync(row.id); message.success('Deleted'); }
    catch (err) { fail(err); }
  };

  const columns: ColumnsType<Treatment> = useMemo(() => [
    {
      title: 'Actions', key: 'actions', width: 130, fixed: 'left',
      render: (_, row) => (
        <Space size={6}>
          <Tooltip title="Edit">
            <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          </Tooltip>
          <Tooltip title={row.isActive ? 'Deactivate' : 'Activate'}>
            <Button size="small" onClick={() => toggleActive(row)}
              style={{ background: row.isActive ? colors.status.warning : colors.status.success, borderColor: 'transparent', color: '#fff' }}>
              {row.isActive ? 'OFF' : 'ON'}
            </Button>
          </Tooltip>
          <Popconfirm title={`Delete "${row.name}"?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(row)}>
            <Tooltip title="Delete">
              <Button size="small" icon={<DeleteOutlined />}
                style={{ background: colors.status.error, borderColor: colors.status.error, color: '#fff' }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Category', dataIndex: 'category', width: 160, render: (v: string | null) => v || '—' },
    { title: 'Duration (min)', dataIndex: 'durationMinutes', width: 130, render: (v: number | null) => v ?? '—' },
    {
      title: 'Price (₹)', dataIndex: 'price', width: 110,
      render: (v: number | null) => v != null ? `₹${(v / 100).toFixed(2)}` : '—',
    },
    {
      title: 'Status', dataIndex: 'isActive', width: 100,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Created', dataIndex: 'createdAt', width: 130,
      render: (v: string) => new Date(v).toLocaleDateString('en-IN'),
    },
  ], [colors]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0, color: colors.text.primary }}>Treatments</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Treatment</Button>
      </div>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col flex="auto">
            <Input placeholder="Search name or category…" value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
          </Col>
        </Row>
        <Table rowKey="id" loading={isLoading} columns={columns} dataSource={filtered} size="middle"
          pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />
      </Card>

      <Modal title={editing ? 'Edit Treatment' : 'Add Treatment'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={() => form.submit()}
        okText={editing ? 'Save' : 'Add'} confirmLoading={create.isPending || update.isPending} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="name" label="Treatment Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Deep Tissue Massage" maxLength={120} />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input placeholder="e.g. Massage, Facial, Therapy" maxLength={80} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Brief description" maxLength={300} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="durationMinutes" label="Duration (minutes)">
                <InputNumber min={1} max={999} style={{ width: '100%' }} placeholder="60" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priceRupees" label="Price (₹)">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" prefix="₹" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
