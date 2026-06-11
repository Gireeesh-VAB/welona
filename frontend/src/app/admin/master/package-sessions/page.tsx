'use client';

import { useState } from 'react';
import {
  App, Button, Card, Form, Input, InputNumber, Modal,
  Popconfirm, Select, Space, Switch, Table, Tag, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useAdminPackageSessionMasters,
  useCreateAdminPackageSessionMaster,
  useUpdateAdminPackageSessionMaster,
  useDeleteAdminPackageSessionMaster,
} from '@/hooks/useAdminPackageSessionMasters';
import { useAdminServices } from '@/hooks/useAdminServices';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import type { AdminPackageSessionMaster } from '@shared/types/admin-package-session-master';

const { Title, Text } = Typography;

export default function PackageSessionMastersPage() {
  const { message } = App.useApp();
  const { data: masters = [], isLoading } = useAdminPackageSessionMasters();
  const { data: servicesData } = useAdminServices();
  const create = useCreateAdminPackageSessionMaster();
  const update = useUpdateAdminPackageSessionMaster();
  const remove = useDeleteAdminPackageSessionMaster();

  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<AdminPackageSessionMaster | null>(null);
  const [form] = Form.useForm();

  const navItem = getAdminNavItem('master-package-sessions');
  const allServices = (servicesData?.items ?? []).filter((s: any) => s.isActive);

  const filtered = masters.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (row: AdminPackageSessionMaster) => { setEditing(row); setModalOpen(true); };

  const handleModalOpen = (open: boolean) => {
    if (!open) return;
    form.resetFields();
    if (editing) {
      form.setFieldsValue({
        name:            editing.name,
        description:     editing.description ?? '',
        serviceIds:      editing.serviceIds,
        defaultSessions: editing.defaultSessions,
        priceRupees:     editing.price / 100,
        isActive:        editing.isActive,
      });
    } else {
      form.setFieldsValue({ defaultSessions: 1, priceRupees: 0, isActive: true, serviceIds: [] });
    }
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    const body = {
      name:            v.name,
      description:     v.description || undefined,
      serviceIds:      v.serviceIds ?? [],
      defaultSessions: v.defaultSessions,
      price:           Math.round((v.priceRupees ?? 0) * 100),
      isActive:        v.isActive ?? true,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Package session master updated');
      } else {
        await create.mutateAsync(body);
        message.success('Package session master created');
      }
      setModalOpen(false);
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not save');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      message.success('Deleted');
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not delete');
    }
  };

  const columns: ColumnsType<AdminPackageSessionMaster> = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (v, row) => (
        <div>
          <Text strong>{v}</Text>
          {row.description && <div style={{ fontSize: 12, color: '#888' }}>{row.description}</div>}
        </div>
      ),
    },
    {
      title: 'Services Included',
      key: 'services',
      render: (_, row) =>
        row.services.length ? (
          <Space size={4} wrap>
            {row.services.map(s => <Tag key={s.id} color="blue">{s.name}</Tag>)}
          </Space>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Sessions',
      dataIndex: 'defaultSessions',
      width: 90,
      align: 'center',
      render: v => <Tag color="purple">{v}</Tag>,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      width: 110,
      align: 'right',
      render: v => formatMoney(v),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 90,
      align: 'center',
      render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm
            title="Delete this master?"
            onConfirm={() => handleDelete(row.id)}
            okText="Delete" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          {navItem?.label ?? 'Package Session Masters'}
        </Title>
        <Text type="secondary">{navItem?.description ?? 'Define session package templates used at branches.'}</Text>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name…"
            style={{ width: 280 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Master
          </Button>
        </div>

        <Table<AdminPackageSessionMaster>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} masters` }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Package Session Master' : 'New Package Session Master'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={create.isPending || update.isPending}
        onCancel={() => setModalOpen(false)}
        okText="Save"
        destroyOnClose
        afterOpenChange={handleModalOpen}
        width={560}
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Master Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Skin Brightening Package" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>

          <Form.Item
            name="serviceIds"
            label="Services Included"
            rules={[{ required: true, message: 'Select at least one service' }]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="Select services for this package…"
              options={allServices.map((s: any) => ({
                label: `${s.name}${s.categoryName ? ` (${s.categoryName})` : ''}`,
                value: s.id,
              }))}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              name="defaultSessions"
              label="Default Sessions"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="10" />
            </Form.Item>
            <Form.Item name="priceRupees" label="Price (₹)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
          </div>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
