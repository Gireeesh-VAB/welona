'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  StarOutlined,
  TagOutlined,
} from '@ant-design/icons';
import {
  useAdminCustomer,
  useAdminCustomerSales,
  useAdminOffers,
  useAdminPackages,
  useAdminPrescriptions,
  useAdminMedicalReports,
  useAdminFeedback,
  useAdminDocuments,
  useAdminCustomerFollowUps,
  useAdminCustomerHistory,
  useUpdateAdminCustomer,
} from '@/hooks/useAdminCustomers';
import { useAdminStates } from '@/hooks/useAdminStates';
import { ApiClientError } from '@/lib/api-client';
import StatusTag from '@/components/sales/StatusTag';
import ModuleCard from '@/components/customers/ModuleCard';
import CountryStateFields from '@/components/customers/CountryStateFields';
import { PHONE_CODE_OPTIONS, COUNTRY_PHONE_CODE_MAP, buildPhone } from '@/components/customers/countryData';
import { formatDate, formatMoney } from '@shared/format';
import type { Invoice, Lead, Quotation, SalesOrder } from '@shared/types/sales';
import { colors } from '@/theme/colors';

const { Title } = Typography;

/**
 * Admin/branch customer profile — details, relationship modules and sales
 * history. Mirrors the employee 360° profile but fetches via /admin/customers
 * (branch-scoped). Module tabs that depend on the Sales/treatments
 * infrastructure (bookings, packages, follow-ups) are intentionally not shown
 * here yet — they arrive with the admin Sales module.
 */
export default function AdminCustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { message } = App.useApp();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileForm] = Form.useForm();
  const updateCustomer = useUpdateAdminCustomer(id);
  const { data: statesData } = useAdminStates({ limit: 200 });
  const stateOptions = (statesData?.items ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }));

  const { data: customer, isLoading } = useAdminCustomer(id);
  const { data: sales, isLoading: salesLoading } = useAdminCustomerSales(id);

  // Record counts shown on the module cards.
  const { data: offers, isLoading: offersLoading } = useAdminOffers(id);
  const { data: packages, isLoading: packagesLoading } = useAdminPackages(id);
  const { data: followUps, isLoading: followUpsLoading } = useAdminCustomerFollowUps(id);
  const { data: prescriptions, isLoading: prescriptionsLoading } = useAdminPrescriptions(id);
  const { data: medicalReports, isLoading: medicalReportsLoading } = useAdminMedicalReports(id);
  const { data: feedback, isLoading: feedbackLoading } = useAdminFeedback(id);
  const { data: documents, isLoading: documentsLoading } = useAdminDocuments(id);
  const { data: history, isLoading: historyLoading } = useAdminCustomerHistory(id);

  const openEditProfile = () => {
    if (!customer) return;
    const country = (customer as any).country || 'India';
    editProfileForm.setFieldsValue({
      name: customer.name,
      phoneCode: COUNTRY_PHONE_CODE_MAP[country] || '+91',
      phone: customer.phone || '',
      email: customer.email || '',
      companyName: customer.companyName || '',
      gstin: customer.gstin || '',
      address: customer.address || '',
      city: customer.city || '',
      stateId: customer.stateId || undefined,
      country,
      notes: customer.notes || '',
    });
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    const values = await editProfileForm.validateFields();
    const phone = buildPhone(values.phoneCode, values.phone);
    delete values.phoneCode;
    try {
      await updateCustomer.mutateAsync({ ...values, phone });
      message.success('Customer profile updated');
      setEditProfileOpen(false);
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Could not update customer');
    }
  };

  if (isLoading || !customer) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const modules = [
    { key: 'packages', title: 'Packages', icon: <AppstoreOutlined />, count: packages?.length ?? 0, loading: packagesLoading },
    { key: 'offers', title: 'Offers', icon: <TagOutlined />, count: offers?.length ?? 0, loading: offersLoading },
    { key: 'followups', title: 'Follow-Ups', icon: <PhoneOutlined />, count: followUps?.length ?? 0, loading: followUpsLoading },
    { key: 'prescriptions', title: 'Prescriptions', icon: <MedicineBoxOutlined />, count: prescriptions?.length ?? 0, loading: prescriptionsLoading },
    { key: 'medical-reports', title: 'Medical Reports', icon: <FileTextOutlined />, count: medicalReports?.length ?? 0, loading: medicalReportsLoading },
    { key: 'history', title: 'History', icon: <HistoryOutlined />, count: history?.length ?? 0, loading: historyLoading },
    { key: 'feedback', title: 'Client Feedback', icon: <StarOutlined />, count: feedback?.length ?? 0, loading: feedbackLoading },
    { key: 'documents', title: 'Client Documents', icon: <FolderOpenOutlined />, count: documents?.length ?? 0, loading: documentsLoading },
  ];

  const leadColumns = [
    { title: 'Contact', dataIndex: 'contactName' },
    { title: 'Interest', dataIndex: 'interest', render: (v: string | null) => v || '—' },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => formatDate(v) },
  ];
  const quotationColumns = [
    { title: 'Number', dataIndex: 'number' },
    { title: 'Total', dataIndex: 'total', render: (v: number) => formatMoney(v) },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => formatDate(v) },
  ];
  const orderColumns = [
    { title: 'Number', dataIndex: 'number' },
    { title: 'Total', dataIndex: 'total', render: (v: number) => formatMoney(v) },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    { title: 'Payment', dataIndex: 'paymentStatus', render: (s: string) => <StatusTag status={s} /> },
  ];
  const invoiceColumns = [
    { title: 'Number', dataIndex: 'number' },
    { title: 'Total', dataIndex: 'total', render: (v: number) => formatMoney(v) },
    { title: 'Paid', dataIndex: 'amountPaid', render: (v: number) => formatMoney(v) },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/admin/customers')}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Back to customers
      </Button>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar size={72} src={customer.avatarUrl || undefined} style={{ background: colors.gold.primary }}>
            {customer.name.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {customer.name}
                </Title>
                <Tag color={customer.type === 'business' ? 'gold' : 'default'}>
                  {customer.type === 'business' ? 'Business' : 'Individual'}
                </Tag>
                {!customer.isActive && <Tag color="red">Inactive</Tag>}
              </div>
              <Button size="small" icon={<EditOutlined />} onClick={openEditProfile}>
                Edit Profile
              </Button>
            </div>

            <Descriptions column={3} style={{ marginTop: 16 }} size="small">
              <Descriptions.Item label="Phone">{customer.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{customer.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="City">{customer.city || '—'}</Descriptions.Item>
              <Descriptions.Item label="Company">{customer.companyName || '—'}</Descriptions.Item>
              <Descriptions.Item label="GSTIN">{customer.gstin || '—'}</Descriptions.Item>
              <Descriptions.Item label="Branch">{customer.branch?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="State">{customer.stateName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Country">{(customer as any).country || '—'}</Descriptions.Item>
              <Descriptions.Item label="Address" span={3}>
                {customer.address || '—'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: 'Enquiries', value: sales?.summary.leadCount ?? 0 },
          { title: 'Orders', value: sales?.summary.orderCount ?? 0 },
          {
            title: 'Amount Paid',
            value: formatMoney(sales?.summary.totalSpent ?? 0),
            color: colors.status.success,
          },
          {
            title: 'Pending',
            value: formatMoney(sales?.summary.outstanding ?? 0),
            color: colors.status.warning,
          },
        ].map((stat) => (
          <Col xs={12} md={8} xl={6} key={stat.title}>
            <Card>
              <Statistic title={stat.title} value={stat.value} valueStyle={{ color: stat.color, fontSize: 20 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={5} style={{ marginBottom: 12 }}>
        Modules
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {modules.map((m) => (
          <Col xs={24} sm={12} lg={8} key={m.key}>
            <ModuleCard
              icon={m.icon}
              title={m.title}
              count={m.count}
              loading={m.loading}
              onClick={() => router.push(`/admin/customers/${id}/${m.key}`)}
            />
          </Col>
        ))}
      </Row>

      <Card title="Sales History">
        <Tabs
          items={[
            {
              key: 'leads',
              label: `Leads (${sales?.leads.length ?? 0})`,
              children: (
                <Table<Lead>
                  rowKey="id"
                  size="small"
                  loading={salesLoading}
                  columns={leadColumns}
                  dataSource={sales?.leads ?? []}
                  pagination={false}
                  locale={{ emptyText: <Empty description="No leads" /> }}
                />
              ),
            },
            {
              key: 'quotations',
              label: `Quotations (${sales?.quotations.length ?? 0})`,
              children: (
                <Table<Quotation>
                  rowKey="id"
                  size="small"
                  loading={salesLoading}
                  columns={quotationColumns}
                  dataSource={sales?.quotations ?? []}
                  pagination={false}
                  locale={{ emptyText: <Empty description="No quotations" /> }}
                />
              ),
            },
            {
              key: 'orders',
              label: `Orders (${sales?.orders.length ?? 0})`,
              children: (
                <Table<SalesOrder>
                  rowKey="id"
                  size="small"
                  loading={salesLoading}
                  columns={orderColumns}
                  dataSource={sales?.orders ?? []}
                  pagination={false}
                  locale={{ emptyText: <Empty description="No orders" /> }}
                />
              ),
            },
            {
              key: 'invoices',
              label: `Invoices (${sales?.invoices.length ?? 0})`,
              children: (
                <Table<Invoice>
                  rowKey="id"
                  size="small"
                  loading={salesLoading}
                  columns={invoiceColumns}
                  dataSource={sales?.invoices ?? []}
                  pagination={false}
                  locale={{ emptyText: <Empty description="No invoices" /> }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Edit Customer Profile Modal */}
      <Modal
        title="Edit Customer Profile"
        open={editProfileOpen}
        onOk={handleSaveProfile}
        confirmLoading={updateCustomer.isPending}
        onCancel={() => setEditProfileOpen(false)}
        width={560}
        destroyOnClose
      >
        <Form form={editProfileForm} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <CountryStateFields form={editProfileForm} stateOptions={stateOptions} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="phone" label="Phone" style={{ flex: 1 }}>
              <Input
                addonBefore={
                  <Form.Item name="phoneCode" noStyle>
                    <Select showSearch style={{ width: 80 }} options={PHONE_CODE_OPTIONS} />
                  </Form.Item>
                }
                placeholder="Mobile number"
              />
            </Form.Item>
            <Form.Item name="email" label="Email" style={{ flex: 1 }}>
              <Input placeholder="name@example.com" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="companyName" label="Company name" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="gstin" label="GSTIN" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="city" label="City" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Address" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
