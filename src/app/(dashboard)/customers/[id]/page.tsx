'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
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
  CalendarOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  StarOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useCustomer, useCustomerSales, useCustomerFollowUps } from '@/hooks/useSales';
import {
  useBookings,
  usePackages,
  useOffers,
  usePrescriptions,
  useMedicalReports,
  useFeedback,
  useDocuments,
  useCustomerHistory,
} from '@/hooks/useCustomerModules';
import StatusTag from '@/components/sales/StatusTag';
import ModuleCard from '@/components/customers/ModuleCard';
import AvatarUpload from '@/components/customers/AvatarUpload';
import { formatDate, formatMoney } from '@/lib/format';
import type { Invoice, Lead, Quotation, SalesOrder } from '@/types/sales';
import { colors } from '@/theme/colors';

const { Title } = Typography;

/** Customer 360° profile — details, relationship modules and sales history. */
export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: customer, isLoading } = useCustomer(id);
  const { data: sales, isLoading: salesLoading } = useCustomerSales(id);

  // Record counts shown on the module cards.
  const { data: bookings, isLoading: bookingsLoading } = useBookings(id);
  const { data: packages, isLoading: packagesLoading } = usePackages(id);
  const { data: offers, isLoading: offersLoading } = useOffers(id);
  const { data: prescriptions, isLoading: prescriptionsLoading } = usePrescriptions(id);
  const { data: medicalReports, isLoading: medicalReportsLoading } = useMedicalReports(id);
  const { data: followUps, isLoading: followUpsLoading } = useCustomerFollowUps(id);
  const { data: feedback, isLoading: feedbackLoading } = useFeedback(id);
  const { data: documents, isLoading: documentsLoading } = useDocuments(id);
  const { data: history, isLoading: historyLoading } = useCustomerHistory(id);

  if (isLoading || !customer) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const modules = [
    {
      key: 'bookings',
      title: 'Bookings',
      icon: <CalendarOutlined />,
      count: bookings?.length ?? 0,
      loading: bookingsLoading,
    },
    {
      key: 'packages',
      title: 'Packages',
      icon: <AppstoreOutlined />,
      count: packages?.length ?? 0,
      loading: packagesLoading,
    },
    {
      key: 'offers',
      title: 'Offers',
      icon: <TagOutlined />,
      count: offers?.length ?? 0,
      loading: offersLoading,
    },
    {
      key: 'prescriptions',
      title: 'Prescriptions',
      icon: <MedicineBoxOutlined />,
      count: prescriptions?.length ?? 0,
      loading: prescriptionsLoading,
    },
    {
      key: 'followups',
      title: 'Follow-Ups',
      icon: <PhoneOutlined />,
      count: followUps?.length ?? 0,
      loading: followUpsLoading,
    },
    {
      key: 'medical-reports',
      title: 'Medical Reports',
      icon: <FileTextOutlined />,
      count: medicalReports?.length ?? 0,
      loading: medicalReportsLoading,
    },
    {
      key: 'history',
      title: 'History',
      icon: <HistoryOutlined />,
      count: history?.length ?? 0,
      loading: historyLoading,
    },
    {
      key: 'feedback',
      title: 'Client Feedback',
      icon: <StarOutlined />,
      count: feedback?.length ?? 0,
      loading: feedbackLoading,
    },
    {
      key: 'documents',
      title: 'Client Documents',
      icon: <FolderOpenOutlined />,
      count: documents?.length ?? 0,
      loading: documentsLoading,
    },
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
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      render: (s: string) => <StatusTag status={s} />,
    },
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
        onClick={() => router.push('/customers')}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Back to customers
      </Button>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <AvatarUpload customerId={id} name={customer.name} avatarUrl={customer.avatarUrl} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <Title level={3} style={{ margin: 0 }}>
              {customer.name}
            </Title>
            <Tag color={customer.type === 'business' ? 'gold' : 'default'}>
              {customer.type === 'business' ? 'Business' : 'Individual'}
            </Tag>
            {!customer.isActive && <Tag color="red">Inactive</Tag>}

            <Descriptions column={3} style={{ marginTop: 16 }} size="small">
              <Descriptions.Item label="Phone">{customer.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{customer.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="City">{customer.city || '—'}</Descriptions.Item>
              <Descriptions.Item label="Company">{customer.companyName || '—'}</Descriptions.Item>
              <Descriptions.Item label="GSTIN">{customer.gstin || '—'}</Descriptions.Item>
              <Descriptions.Item label="Branch">{customer.branch?.name || '—'}</Descriptions.Item>
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
          { title: 'Bookings', value: bookings?.length ?? 0 },
          { title: 'Orders', value: sales?.summary.orderCount ?? 0 },
          { title: 'Packages', value: packages?.length ?? 0 },
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
          <Col xs={12} md={8} xl={4} key={stat.title}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                valueStyle={{ color: stat.color, fontSize: 20 }}
              />
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
              onClick={() => router.push(`/customers/${id}/${m.key}`)}
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
    </div>
  );
}
