'use client';

import { useState } from 'react';
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
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useTreatments,
  useCreateTreatment,
  useUpdateTreatment,
  useDeactivateTreatment,
} from '@/hooks/useSales';
import OptionMaster from '@/components/settings/OptionMaster';
import { ApiClientError } from '@/lib/api-client';
import { formatMoney, toMinorUnits } from '@/lib/format';
import type { Treatment } from '@/types/sales';

const { Title, Text } = Typography;

/** Treatments master — the catalogue selected when recording an enquiry. */
function TreatmentsMaster() {
  const { message } = App.useApp();
  const { data: treatments, isLoading } = useTreatments();
  const createTreatment = useCreateTreatment();
  const updateTreatment = useUpdateTreatment();
  const deactivateTreatment = useDeactivateTreatment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);
  const [form] = Form.useForm();

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (treatment: Treatment) => {
    setEditing(treatment);
    form.setFieldsValue({
      name: treatment.name,
      category: treatment.category ?? undefined,
      description: treatment.description ?? undefined,
      durationMinutes: treatment.durationMinutes ?? undefined,
      price: treatment.price != null ? treatment.price / 100 : undefined,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const body = {
      name: values.name,
      category: values.category,
      description: values.description,
      durationMinutes: values.durationMinutes ?? undefined,
      price: values.price != null ? toMinorUnits(values.price) : undefined,
    };
    try {
      if (editing) {
        await updateTreatment.mutateAsync({ id: editing.id, body });
        message.success('Treatment updated');
      } else {
        await createTreatment.mutateAsync(body);
        message.success('Treatment added');
      }
      setModalOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e, 'Could not save treatment');
    }
  };

  const toggleActive = async (treatment: Treatment) => {
    try {
      if (treatment.isActive) {
        await deactivateTreatment.mutateAsync(treatment.id);
        message.success('Treatment deactivated');
      } else {
        await updateTreatment.mutateAsync({ id: treatment.id, body: { isActive: true } });
        message.success('Treatment reactivated');
      }
    } catch (e) {
      fail(e, 'Could not update treatment');
    }
  };

  const columns: ColumnsType<Treatment> = [
    {
      title: 'Treatment',
      dataIndex: 'name',
      render: (name: string, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {row.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.description}
            </Text>
          )}
        </div>
      ),
    },
    { title: 'Category', dataIndex: 'category', render: (v: string | null) => v || '—' },
    {
      title: 'Duration',
      dataIndex: 'durationMinutes',
      render: (v: number | null) => (v ? `${v} min` : '—'),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      render: (v: number | null) => (v != null ? formatMoney(v) : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            Edit
          </Button>
          {row.isActive ? (
            <Popconfirm
              title="Deactivate this treatment?"
              description="It will no longer appear in the enquiry selector."
              onConfirm={() => toggleActive(row)}
              okText="Deactivate"
            >
              <Button size="small" danger>
                Deactivate
              </Button>
            </Popconfirm>
          ) : (
            <Button size="small" onClick={() => toggleActive(row)}>
              Activate
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Treatments"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New Treatment
        </Button>
      }
    >
      <Text type="secondary">
        Master list of treatments offered. These appear in the treatment selector when recording an
        enquiry.
      </Text>

      <Table<Treatment>
        rowKey="id"
        style={{ marginTop: 16 }}
        columns={columns}
        dataSource={treatments ?? []}
        loading={isLoading}
        pagination={false}
      />

      <Modal
        title={editing ? 'Edit treatment' : 'New treatment'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={createTreatment.isPending || updateTreatment.isPending}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Treatment name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Deep Tissue Massage" />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input placeholder="e.g. Therapy, Skincare, Wellness" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="durationMinutes" label="Duration (minutes)" style={{ flex: 1 }}>
              <InputNumber min={1} step={15} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="price" label="Price (₹)" style={{ flex: 1 }}>
              <InputNumber min={0} step={100} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/** Settings — organisation configuration and master data. */
export default function SettingsPage() {
  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Settings
      </Title>
      <Tabs
        items={[
          {
            key: 'treatments',
            label: 'Treatments',
            children: <TreatmentsMaster />,
          },
          {
            key: 'enquiry_type',
            label: 'Enquiry Types',
            children: (
              <OptionMaster kind="enquiry_type" title="Enquiry Types" noun="enquiry type" />
            ),
          },
          {
            key: 'media',
            label: 'Media',
            children: <OptionMaster kind="media" title="Media" noun="media option" />,
          },
          {
            key: 'call_type',
            label: 'Call Types',
            children: <OptionMaster kind="call_type" title="Call Types" noun="call type" />,
          },
        ]}
      />
    </div>
  );
}
