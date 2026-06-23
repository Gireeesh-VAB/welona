'use client';

import { useMemo, useState } from 'react';
import {
  App, Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Space, Table, Tag, Tooltip, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useAdminMasterOptions,
  useCreateAdminMasterOption,
  useUpdateAdminMasterOption,
  useDeleteAdminMasterOption,
} from '@/hooks/useAdminSales';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { MasterOption } from '@shared/types/sales';

const { Title } = Typography;

interface FormValues { label: string; sortOrder?: number }

export default function CallTypePage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const { data: options = [], isLoading } = useAdminMasterOptions('call_type');
  const create = useCreateAdminMasterOption();
  const update = useUpdateAdminMasterOption();
  const remove = useDeleteAdminMasterOption();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterOption | null>(null);
  const [form] = Form.useForm<FormValues>();

  const filtered = useMemo(() =>
    options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );

  const fail = (err: unknown) =>
    message.error(err instanceof ApiClientError ? err.message : 'Action failed');

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (row: MasterOption) => {
    setEditing(row);
    form.setFieldsValue({ label: row.label, sortOrder: row.sortOrder });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: { label: values.label.trim(), sortOrder: values.sortOrder ?? 0 } });
        message.success('Updated');
      } else {
        await create.mutateAsync({ kind: 'call_type', label: values.label.trim(), sortOrder: values.sortOrder ?? 0 });
        message.success('Added');
      }
      setModalOpen(false);
    } catch (err) { fail(err); }
  };

  const toggleActive = async (row: MasterOption) => {
    try {
      await update.mutateAsync({ id: row.id, body: { isActive: !row.isActive } });
      message.success(row.isActive ? 'Deactivated' : 'Activated');
    } catch (err) { fail(err); }
  };

  const onDelete = async (row: MasterOption) => {
    try { await remove.mutateAsync(row.id); message.success('Deleted'); }
    catch (err) { fail(err); }
  };

  const columns: ColumnsType<MasterOption> = useMemo(() => [
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
          <Popconfirm title={`Delete "${row.label}"?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(row)}>
            <Tooltip title="Delete">
              <Button size="small" icon={<DeleteOutlined />}
                style={{ background: colors.status.error, borderColor: colors.status.error, color: '#fff' }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
    { title: 'Label', dataIndex: 'label', sorter: (a, b) => a.label.localeCompare(b.label) },
    { title: 'Sort', dataIndex: 'sortOrder', width: 80 },
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
        <Title level={3} style={{ margin: 0, color: colors.text.primary }}>Call Types</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Call Type</Button>
      </div>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col flex="auto">
            <Input placeholder="Search label…" value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
          </Col>
        </Row>
        <Table rowKey="id" loading={isLoading} columns={columns} dataSource={filtered} size="middle" pagination={{ pageSize: 20 }} />
      </Card>

      <Modal title={editing ? 'Edit Call Type' : 'Add Call Type'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={() => form.submit()}
        okText={editing ? 'Save' : 'Add'} confirmLoading={create.isPending || update.isPending} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Label is required' }]}>
            <Input placeholder="e.g. Inbound, Outbound, Follow-up" maxLength={80} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort Order">
            <Input type="number" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
