'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Divider,
  Badge,
  Tooltip,
  Tabs,
  Empty,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  PrinterOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity?: number;
}

interface Prescription {
  id: string;
  customerName: string;
  customerPhone: string;
  doctor: string;
  date: string;
  medicines: Medicine[];
  notes: string;
  patientInstructions: string;
  status: 'draft' | 'issued' | 'printed';
}

const mockPrescriptions: Prescription[] = [
  {
    id: '1',
    customerName: 'test4',
    customerPhone: '9876543210',
    doctor: 'Dr. Raj Kumar',
    date: '05.06.2026',
    medicines: [
      {
        id: '1',
        name: 'Aspirin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '7 days',
        instructions: 'Take after meals',
        quantity: 14,
      },
    ],
    notes: 'Patient has allergies to penicillin',
    patientInstructions: 'Take medication with food. Avoid alcohol.',
    status: 'issued',
  },
];

const medicineOptions = [
  { label: 'Aspirin', value: 'aspirin' },
  { label: 'Paracetamol', value: 'paracetamol' },
  { label: 'Ibuprofen', value: 'ibuprofen' },
  { label: 'Amoxicillin', value: 'amoxicillin' },
  { label: 'Cetirizine', value: 'cetirizine' },
];

const dosageOptions = [
  { label: '250mg', value: '250mg' },
  { label: '500mg', value: '500mg' },
  { label: '1000mg', value: '1000mg' },
  { label: '5ml', value: '5ml' },
];

const frequencyOptions = [
  { label: 'Once daily', value: 'once' },
  { label: 'Twice daily', value: 'twice' },
  { label: 'Thrice daily', value: 'thrice' },
  { label: 'Every 6 hours', value: 'every6h' },
  { label: 'Every 8 hours', value: 'every8h' },
];

export default function PrescriptionsPage() {
  const { message } = App.useApp();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(mockPrescriptions);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [form] = Form.useForm();
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);

  const filteredPrescriptions = prescriptions.filter(
    (p) =>
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerPhone.includes(search) ||
      p.doctor.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddMedicine = () => {
    setMedicines([
      ...medicines,
      {
        id: Date.now().toString(),
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      },
    ]);
  };

  const handleRemoveMedicine = (id: string) => {
    setMedicines(medicines.filter((m) => m.id !== id));
  };

  const handleSavePrescription = () => {
    if (!medicines.length) {
      message.error('Add at least one medicine');
      return;
    }

    const formData = form.getFieldsValue();
    const newPrescription: Prescription = {
      id: Date.now().toString(),
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      doctor: formData.doctor,
      date: new Date().toLocaleDateString('en-GB'),
      medicines,
      notes: formData.notes,
      patientInstructions: formData.patientInstructions,
      status: 'draft',
    };

    setPrescriptions([...prescriptions, newPrescription]);
    message.success('Prescription created successfully!');
    setDrawerOpen(false);
    setMedicines([]);
    form.resetFields();
  };

  const columns: ColumnsType<Prescription> = [
    {
      title: 'Customer',
      key: 'customer',
      width: 180,
      render: (_, record) => (
        <div>
          <Text strong style={{ color: colors.text.primary }}>
            {record.customerName}
          </Text>
          <br />
          <Text style={{ fontSize: 12, color: colors.text.secondary }}>
            {record.customerPhone}
          </Text>
        </div>
      ),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor',
      width: 150,
      render: (doctor) => <Text>{doctor}</Text>,
    },
    {
      title: 'Medicines',
      key: 'medicines',
      width: 200,
      render: (_, record) => (
        <Space wrap size="small">
          {record.medicines.map((med) => (
            <Tag key={med.id} color="blue" style={{ fontSize: 11 }}>
              {med.name} {med.dosage}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      width: 120,
      render: (date) => <Text>{date}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        const statusConfig = {
          draft: { color: 'default', label: 'Draft' },
          issued: { color: 'processing', label: 'Issued' },
          printed: { color: 'success', label: 'Printed' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View / Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setSelectedPrescription(record);
                setPreviewDrawerOpen(true);
              }}
              style={{ color: colors.gold.primary }}
            />
          </Tooltip>
          <Tooltip title="Print">
            <Button
              type="text"
              icon={<PrinterOutlined />}
              size="small"
              onClick={() => window.print()}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="Copy">
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header with Stats */}
      <div style={{ marginBottom: 32 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col>
            <div>
              <Title level={2} style={{ color: colors.text.primary, margin: 0 }}>
                Prescriptions
              </Title>
              <Text style={{ color: colors.text.secondary }}>
                Manage patient prescriptions with medicines and dosages
              </Text>
            </div>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setDrawerOpen(true)}
              style={{
                background: colors.gold.primary,
                borderColor: colors.gold.primary,
              }}
            >
              Create Prescription
            </Button>
          </Col>
        </Row>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card
            style={{
              background: 'white',
              borderLeft: `4px solid ${colors.gold.primary}`,
            }}
          >
            <div>
              <Text style={{ color: colors.text.secondary }}>Total</Text>
              <Title level={3} style={{ margin: '8px 0 0 0', color: colors.gold.primary }}>
                {prescriptions.length}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card
            style={{
              background: 'white',
              borderLeft: `4px solid #52c41a`,
            }}
          >
            <div>
              <Text style={{ color: colors.text.secondary }}>Issued</Text>
              <Title level={3} style={{ margin: '8px 0 0 0', color: '#52c41a' }}>
                {prescriptions.filter((p) => p.status === 'issued').length}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card
            style={{
              background: 'white',
              borderLeft: `4px solid #1890ff`,
            }}
          >
            <div>
              <Text style={{ color: colors.text.secondary }}>Draft</Text>
              <Title level={3} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>
                {prescriptions.filter((p) => p.status === 'draft').length}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card
            style={{
              background: 'white',
              borderLeft: `4px solid #ff7a45`,
            }}
          >
            <div>
              <Text style={{ color: colors.text.secondary }}>Printed</Text>
              <Title level={3} style={{ margin: '8px 0 0 0', color: '#ff7a45' }}>
                {prescriptions.filter((p) => p.status === 'printed').length}
              </Title>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Search & Filter */}
      <Card style={{ marginBottom: 24 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by customer name, phone, or doctor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="large"
          allowClear
        />
      </Card>

      {/* Prescriptions Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredPrescriptions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                description="No prescriptions found"
                style={{ padding: '40px 0' }}
              />
            ),
          }}
        />
      </Card>

      {/* Create/Edit Prescription Drawer */}
      <Drawer
        title="Create New Prescription"
        placement="right"
        onClose={() => {
          setDrawerOpen(false);
          setMedicines([]);
          form.resetFields();
        }}
        open={drawerOpen}
        width={700}
        bodyStyle={{ paddingBottom: 80 }}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSavePrescription}
              style={{
                background: colors.gold.primary,
                borderColor: colors.gold.primary,
              }}
            >
              Save Prescription
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Customer Name"
                name="customerName"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="Patient name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Phone Number"
                name="customerPhone"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Doctor"
            name="doctor"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Select placeholder="Select doctor" />
          </Form.Item>

          <Divider>Medicines</Divider>

          {medicines.length === 0 ? (
            <Empty
              description="No medicines added"
              style={{
                padding: '40px 0',
                background: '#f9f9f9',
                borderRadius: 4,
                marginBottom: 16,
              }}
            />
          ) : (
            <div style={{ marginBottom: 16 }}>
              {medicines.map((medicine, idx) => (
                <Card
                  key={medicine.id}
                  style={{
                    marginBottom: 12,
                    background: '#fafafa',
                    border: `1px solid ${colors.border}`,
                  }}
                  bodyStyle={{ padding: 12 }}
                >
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12}>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        Medicine
                      </Text>
                      <Select
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder="Select medicine"
                        options={medicineOptions}
                        value={medicine.name || undefined}
                        onChange={(value) => {
                          const updated = [...medicines];
                          updated[idx].name = value;
                          setMedicines(updated);
                        }}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        Dosage
                      </Text>
                      <Select
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder="Select dosage"
                        options={dosageOptions}
                        value={medicine.dosage || undefined}
                        onChange={(value) => {
                          const updated = [...medicines];
                          updated[idx].dosage = value;
                          setMedicines(updated);
                        }}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        Frequency
                      </Text>
                      <Select
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder="Select frequency"
                        options={frequencyOptions}
                        value={medicine.frequency || undefined}
                        onChange={(value) => {
                          const updated = [...medicines];
                          updated[idx].frequency = value;
                          setMedicines(updated);
                        }}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        Duration
                      </Text>
                      <Input
                        style={{ marginTop: 4 }}
                        placeholder="e.g., 7 days"
                        value={medicine.duration}
                        onChange={(e) => {
                          const updated = [...medicines];
                          updated[idx].duration = e.target.value;
                          setMedicines(updated);
                        }}
                      />
                    </Col>
                    <Col xs={24}>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        Special Instructions
                      </Text>
                      <Input.TextArea
                        style={{ marginTop: 4 }}
                        placeholder="e.g., Take after meals, with water"
                        rows={2}
                        value={medicine.instructions}
                        onChange={(e) => {
                          const updated = [...medicines];
                          updated[idx].instructions = e.target.value;
                          setMedicines(updated);
                        }}
                      />
                    </Col>
                    <Col xs={24}>
                      <Button
                        type="text"
                        danger
                        onClick={() => handleRemoveMedicine(medicine.id)}
                      >
                        Remove Medicine
                      </Button>
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          )}

          <Button
            type="dashed"
            block
            onClick={handleAddMedicine}
            style={{ marginBottom: 16 }}
          >
            + Add Medicine
          </Button>

          <Divider>Additional Information</Divider>

          <Form.Item label="Notes (Medical Conditions/Allergies)" name="notes">
            <Input.TextArea
              placeholder="Any important medical notes or allergies..."
              rows={3}
            />
          </Form.Item>

          <Form.Item label="Patient Instructions" name="patientInstructions">
            <Input.TextArea
              placeholder="Instructions for the patient (e.g., precautions, side effects, when to contact doctor)..."
              rows={3}
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Preview Drawer */}
      {selectedPrescription && (
        <Drawer
          title="Prescription Details"
          placement="right"
          onClose={() => setPreviewDrawerOpen(false)}
          open={previewDrawerOpen}
          width={700}
          footer={
            <Space style={{ float: 'right' }}>
              <Button onClick={() => setPreviewDrawerOpen(false)}>Close</Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => window.print()}
                style={{
                  background: colors.gold.primary,
                  borderColor: colors.gold.primary,
                }}
              >
                Print
              </Button>
            </Space>
          }
        >
          {/* Professional Prescription Preview */}
          <div
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={3} style={{ margin: 0, color: colors.text.primary }}>
                PRESCRIPTION
              </Title>
              <Text style={{ color: colors.text.secondary }}>
                Medical Prescription Form
              </Text>
            </div>

            <Divider />

            <Row gutter={24} style={{ marginBottom: 20 }}>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Patient Name
                  </Text>
                  <Text>{selectedPrescription.customerName}</Text>
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Phone
                  </Text>
                  <Text>{selectedPrescription.customerPhone}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Doctor
                  </Text>
                  <Text>{selectedPrescription.doctor}</Text>
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Date
                  </Text>
                  <Text>{selectedPrescription.date}</Text>
                </div>
              </Col>
            </Row>

            <Divider />

            <Title level={5} style={{ color: colors.text.primary }}>
              MEDICINES
            </Title>
            <div
              style={{
                background: '#f9f9f9',
                padding: 12,
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              {selectedPrescription.medicines.map((medicine, idx) => (
                <div
                  key={medicine.id}
                  style={{
                    marginBottom: idx < selectedPrescription.medicines.length - 1 ? 12 : 0,
                    paddingBottom:
                      idx < selectedPrescription.medicines.length - 1 ? 12 : 0,
                    borderBottom:
                      idx < selectedPrescription.medicines.length - 1
                        ? `1px solid ${colors.border}`
                        : 'none',
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={8}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>
                        {medicine.name} - {medicine.dosage}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        Dosage
                      </Text>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text style={{ display: 'block', marginBottom: 4 }}>
                        {medicine.frequency}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        Frequency
                      </Text>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text style={{ display: 'block', marginBottom: 4 }}>
                        {medicine.duration}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        Duration
                      </Text>
                    </Col>
                  </Row>
                  {medicine.instructions && (
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: '#ff7a45' }}>
                        ℹ️ {medicine.instructions}
                      </Text>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedPrescription.notes && (
              <div style={{ marginBottom: 20 }}>
                <Title level={5} style={{ color: colors.text.primary }}>
                  NOTES
                </Title>
                <Text style={{ color: '#ff7a45' }}>⚠️ {selectedPrescription.notes}</Text>
              </div>
            )}

            {selectedPrescription.patientInstructions && (
              <div>
                <Title level={5} style={{ color: colors.text.primary }}>
                  PATIENT INSTRUCTIONS
                </Title>
                <Text style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedPrescription.patientInstructions}
                </Text>
              </div>
            )}

            <Divider style={{ marginTop: 24 }} />

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                Follow the doctor&apos;s advice strictly. Consult doctor if any adverse effects.
              </Text>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
