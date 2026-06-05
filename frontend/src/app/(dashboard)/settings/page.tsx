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
import { formatMoney, toMinorUnits } from '@shared/format';
import { ApiClientError } from '@/lib/api-client';
import type { Treatment } from '@shared/types/sales';

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

/** Doctors Master — predefined list of doctors for prescriptions */
function DoctorsMaster() {
  const [doctors, setDoctors] = useState([
    { id: '1', name: 'Dr. Raj Kumar', email: 'raj.kumar@welona.com', phone: '9876543210' },
    { id: '2', name: 'Dr. Priya Sharma', email: 'priya.sharma@welona.com', phone: '9876543211' },
    { id: '3', name: 'Dr. Amit Patel', email: 'amit.patel@welona.com', phone: '9876543212' },
    { id: '4', name: 'Dr. Neha Singh', email: 'neha.singh@welona.com', phone: '9876543213' },
    { id: '5', name: 'Dr. Vikas Gupta', email: 'vikas.gupta@welona.com', phone: '9876543214' },
    { id: '6', name: 'Dr. Ananya Verma', email: 'ananya.verma@welona.com', phone: '9876543215' },
    { id: '7', name: 'Dr. Sanjay Mishra', email: 'sanjay.mishra@welona.com', phone: '9876543216' },
    { id: '8', name: 'Dr. Rahul Verma', email: 'rahul.verma@welona.com', phone: '9876543217' },
    { id: '9', name: 'Dr. Anjali Patel', email: 'anjali.patel@welona.com', phone: '9876543218' },
    { id: '10', name: 'Dr. Deepak Gupta', email: 'deepak.gupta@welona.com', phone: '9876543219' },
  ]);

  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      const newDoctor = {
        id: Date.now().toString(),
        name: values.name,
        email: values.email,
        phone: values.phone,
      };
      setDoctors([...doctors, newDoctor]);
      message.success('Doctor added successfully!');
      setModalOpen(false);
      form.resetFields();
    } catch (e) {
      message.error('Could not add doctor');
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Doctor Name',
      dataIndex: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
    },
  ];

  return (
    <Card
      title={`Doctors (${doctors.length})`}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Add Doctor
        </Button>
      }
    >
      <Text type="secondary">Manage doctors in your system. These appear in prescription dropdowns throughout the app.</Text>
      <Table<any>
        rowKey="id"
        style={{ marginTop: 16 }}
        columns={columns}
        dataSource={doctors}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Add Doctor"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Doctor Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g., Dr. Raj Kumar" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Invalid email' },
            ]}
          >
            <Input placeholder="doctor@example.com" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[{ required: true, message: 'Phone is required' }]}
          >
            <Input placeholder="9876543210" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/** Diagnosis Master — manage diagnoses in the system. */
function DiagnosisMaster() {
  const { message } = App.useApp();
  const [diagnoses, setDiagnoses] = useState([
    { id: '1', name: 'High Fever' },
    { id: '2', name: 'Common Cold' },
    { id: '3', name: 'Cough & Sore Throat' },
    { id: '4', name: 'High Blood Pressure' },
    { id: '5', name: 'Diabetes' },
    { id: '6', name: 'Asthma' },
    { id: '7', name: 'Thyroid Disorder' },
    { id: '8', name: 'Vitamin D Deficiency' },
    { id: '9', name: 'Migraine' },
    { id: '10', name: 'Seasonal Allergies' },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      if (editingId) {
        setDiagnoses(diagnoses.map(d => d.id === editingId ? { ...d, name: values.name } : d));
        message.success('Diagnosis updated');
      } else {
        setDiagnoses([...diagnoses, { id: Date.now().toString(), name: values.name }]);
        message.success('Diagnosis added');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingId(null);
    } catch (e) {
      message.error('Could not save diagnosis');
    }
  };

  const handleDelete = (id: string) => {
    setDiagnoses(diagnoses.filter(d => d.id !== id));
    message.success('Diagnosis deleted');
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Diagnosis Name',
      dataIndex: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditingId(record.id);
              form.setFieldsValue({ name: record.name });
              setModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete"
            description="Are you sure?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Diagnoses"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingId(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          Add Diagnosis
        </Button>
      }
    >
      <Text type="secondary">Manage diagnosis types used in prescriptions.</Text>
      <Table<any>
        rowKey="id"
        style={{ marginTop: 16 }}
        columns={columns}
        dataSource={diagnoses}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingId ? 'Edit Diagnosis' : 'Add Diagnosis'}
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Diagnosis Name"
            rules={[{ required: true, message: 'Diagnosis name is required' }]}
          >
            <Input placeholder="e.g., High Fever" />
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
        Settings & Master Data
      </Title>
      <Tabs
        items={[
          {
            key: 'doctors',
            label: '👨‍⚕️ Doctors',
            children: <DoctorsMaster />,
          },
          {
            key: 'diagnosis',
            label: '📋 Diagnosis',
            children: <DiagnosisMaster />,
          },
          {
            key: 'treatments',
            label: '💆 Treatments',
            children: <TreatmentsMaster />,
          },
        ]}
      />
    </div>
  );
}
