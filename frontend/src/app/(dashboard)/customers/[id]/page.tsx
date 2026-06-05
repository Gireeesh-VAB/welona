'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
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
import { useMemo, useState, useEffect, useRef } from 'react';
import { useCustomers, useCustomer, useCustomerSales, useCustomerFollowUps, useCreateCustomer } from '@/hooks/useSales';
import { useBranchServices, useBranchEmployees } from '@/hooks/useBranchPortal';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { ApiClientError } from '@/lib/api-client';
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
import { formatDate, formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [detailType, setDetailType] = useState<'history' | 'feedback' | 'document' | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'feedback' | 'documents'>('history');
  const [expandedModuleView, setExpandedModuleView] = useState<string | null>(null);
  const [packageOfferStep, setPackageOfferStep] = useState<1 | 2 | 3 | 4>(1);
  const [bookingRows, setBookingRows] = useState<any[]>([]);
  const [bookingData, setBookingData] = useState<any>({
    bookingDate: new Date().toISOString().split('T')[0],
    bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
    discount: 0,
    remarks: '',
  });
  const [showAddPrescription, setShowAddPrescription] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    doctor: '',
    medications: '',
    diagnosis: '',
    notes: '',
  });
  const moduleViewRef = useRef<HTMLDivElement>(null);
  const { message } = App.useApp();
  const createCustomer = useCreateCustomer();

  // Scroll to module view when it's opened
  useEffect(() => {
    if (expandedModuleView && moduleViewRef.current) {
      // Scroll immediately with slight delay to ensure DOM is ready
      requestAnimationFrame(() => {
        moduleViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    // Reset package offer flow when closing
    if (!expandedModuleView) {
      setPackageOfferStep(1);
      setBookingRows([]);
      setBookingData({
        bookingDate: new Date().toISOString().split('T')[0],
        bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        discount: 0,
        remarks: '',
      });
    }
  }, [expandedModuleView]);

  const { data: allCustomers, isLoading: customersLoading, error: customersError } = useCustomers({
    limit: 9999,
  });

  const { data: customer, isLoading } = useCustomer(id);
  const { data: sales, isLoading: salesLoading } = useCustomerSales(id);

  // Auto-fill fields when customer data loads
  useEffect(() => {
    if (customer) {
      setNameInput(customer.name);
      setPhoneInput(customer.phone || '');
    }
  }, [customer?.id]);

  const filteredCustomers = useMemo(() => {
    if (!allCustomers?.items) return [];
    const nameQuery = nameInput.trim().toLowerCase();
    const phoneQuery = phoneInput.trim();

    if (!nameQuery && !phoneQuery) return allCustomers.items;

    return allCustomers.items.filter((c) => {
      const nameMatch = !nameQuery || c.name.toLowerCase().includes(nameQuery);
      const phoneMatch = !phoneQuery || (c.phone?.includes(phoneQuery) ?? false);
      return nameMatch && phoneMatch;
    });
  }, [allCustomers?.items, nameInput, phoneInput]);

  const { data: bookings, isLoading: bookingsLoading } = useBookings(id);
  const { data: packages, isLoading: packagesLoading } = usePackages(id);
  const { data: offers, isLoading: offersLoading } = useOffers(id);
  const { data: prescriptions, isLoading: prescriptionsLoading } = usePrescriptions(id);
  const { data: medicalReports, isLoading: medicalReportsLoading } = useMedicalReports(id);
  const { data: followUps, isLoading: followUpsLoading } = useCustomerFollowUps(id);
  const { data: feedback, isLoading: feedbackLoading } = useFeedback(id);
  const { data: documents, isLoading: documentsLoading } = useDocuments(id);
  const { data: history, isLoading: historyLoading } = useCustomerHistory(id);

  // Branch-assigned services (admin-assigned) drive the booking service picker.
  const { data: branchServices, isLoading: branchServicesLoading } = useBranchServices();
  const createBooking = useCreateAppointment();
  // Branch employees — used to populate the prescription "Doctor" dropdown.
  const { data: branchStaff, isLoading: branchStaffLoading } = useBranchEmployees();

  if (isLoading || !customer) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Doctors = the branch's employees (fetched live, branch-scoped).
  const doctorOptions = (branchStaff ?? []).map((s) => ({
    label: s.designation ? `${s.name} · ${s.designation}` : s.name,
    value: s.name,
  }));

  // Common diagnoses options
  const diagnosisOptions = [
    { label: 'High Fever', value: 'High Fever' },
    { label: 'Common Cold', value: 'Common Cold' },
    { label: 'Cough & Sore Throat', value: 'Cough & Sore Throat' },
    { label: 'High Blood Pressure', value: 'High Blood Pressure' },
    { label: 'Diabetes', value: 'Diabetes' },
    { label: 'Asthma', value: 'Asthma' },
    { label: 'Thyroid Disorder', value: 'Thyroid Disorder' },
    { label: 'Vitamin D Deficiency', value: 'Vitamin D Deficiency' },
    { label: 'Migraine', value: 'Migraine' },
    { label: 'Seasonal Allergies', value: 'Seasonal Allergies' },
    { label: 'Joint Pain', value: 'Joint Pain' },
    { label: 'Acidity', value: 'Acidity' },
    { label: 'Skin Infection', value: 'Skin Infection' },
    { label: 'Urinary Tract Infection', value: 'Urinary Tract Infection' },
    { label: 'Cholesterol Management', value: 'Cholesterol Management' },
    { label: 'Heart Palpitations', value: 'Heart Palpitations' },
    { label: 'Sleep Disorder', value: 'Sleep Disorder' },
    { label: 'Anxiety Disorder', value: 'Anxiety Disorder' },
    { label: 'Lower Back Pain', value: 'Lower Back Pain' },
    { label: 'Cervical Spondylosis', value: 'Cervical Spondylosis' },
  ];

  const modules = [
    {
      key: 'bookings',
      title: 'Bookings',
      icon: <CalendarOutlined />,
      count: bookings?.length ?? 0,
      loading: bookingsLoading,
    },
    {
      key: 'package-offer',
      title: 'Package Offers',
      icon: <AppstoreOutlined />,
      count: 0,
      loading: false,
    },
    {
      key: 'prescriptions',
      title: 'Prescription',
      icon: <MedicineBoxOutlined />,
      count: prescriptions?.length ?? 0,
      loading: prescriptionsLoading,
    },
    {
      key: 'followups',
      title: 'Client Feed Back',
      icon: <PhoneOutlined />,
      count: followUps?.length ?? 0,
      loading: followUpsLoading,
    },
    {
      key: 'medical-reports',
      title: 'Medical Records',
      icon: <FileTextOutlined />,
      count: medicalReports?.length ?? 0,
      loading: medicalReportsLoading,
    },
  ];

  const handleShowConfirmation = () => {
    if (!nameInput.trim()) {
      message.error('Please enter a customer name');
      return;
    }
    setShowConfirmation(true);
  };

  const handleSaveCustomer = async () => {
    if (!nameInput.trim()) {
      message.error('Please enter a customer name');
      return;
    }

    try {
      // Check if customer with same name and phone already exists
      const existingCustomer = allCustomers?.items?.find((c) => {
        const nameMatch = c.name.toLowerCase() === nameInput.trim().toLowerCase();
        const phoneMatch = phoneInput.trim() ? c.phone === phoneInput.trim() : false;
        return nameMatch || (phoneMatch && phoneInput.trim());
      });

      if (existingCustomer) {
        message.info('Customer already exists');
        router.push(`/customers/${existingCustomer.id}`);
        setNameInput('');
        setPhoneInput('');
        setShowConfirmation(false);
        return;
      }

      // Create new customer
      const newCustomer = await createCustomer.mutateAsync({
        name: nameInput.trim(),
        phone: phoneInput.trim() || undefined,
        type: 'individual',
      });

      message.success('Customer created successfully!');
      setNameInput('');
      setPhoneInput('');
      setShowConfirmation(false);
      router.push(`/customers/${newCustomer.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        message.error(err.message);
      } else if (err instanceof Error) {
        message.error(err.message || 'Failed to create customer');
      } else {
        message.error('Failed to create customer');
      }
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setNameInput('');
    setPhoneInput('');
  };

  // Booking calculations
  const calculateSubtotal = () => {
    return bookingRows.reduce((sum, row) => sum + ((row.quantity || 0) * (row.amount || 0)), 0);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = (subtotal * (bookingData.discount || 0)) / 100;
  const netTotal = subtotal - discountAmount;

  const handleAddRow = () => {
    setBookingRows([...bookingRows, { id: Date.now(), service: '', quantity: 1, amount: 0 }]);
  };

  const handleRemoveRow = (id: number) => {
    setBookingRows(bookingRows.filter(row => row.id !== id));
  };

  const handleSaveBooking = async () => {
    const validRows = bookingRows.filter((r) => r.service && r.service.trim());
    if (!validRows.length) {
      message.error('Add at least one service to save booking');
      return;
    }

    try {
      // Build the booking line items. Amounts are entered in rupees → paise.
      const items = validRows.map((r) => ({
        category: r.category || undefined,
        service: r.service,
        quantity: Math.max(1, Number(r.quantity) || 1),
        amount: Math.round((Number(r.amount) || 0) * 100),
      }));

      // discount is a percentage in the UI → convert to an absolute paise amount.
      const subtotalPaise = items.reduce((s, it) => s + it.amount * it.quantity, 0);
      const discountPaise = Math.round((subtotalPaise * (Number(bookingData.discount) || 0)) / 100);

      // Save via the staff bookings endpoint (creates a Booking + BookingItems).
      await createBooking.mutateAsync({
        customerId: id,
        scheduledAt: new Date(bookingData.bookingDate).toISOString(),
        status: 'completed',
        notes: bookingData.remarks || undefined,
        discount: discountPaise,
        roundOff: 0,
        items,
      });

      message.success('Booking saved successfully!');
      setExpandedModuleView(null);
      setPackageOfferStep(1);
      setBookingRows([]);
      setBookingData({
        bookingDate: new Date().toISOString().split('T')[0],
        bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        discount: 0,
        remarks: '',
      });
    } catch (error) {
      message.error(
        'Error saving booking: ' +
          (error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unknown error'),
      );
    }
  };

  const handleSavePrescription = async () => {
    if (!prescriptionForm.doctor.trim() || !prescriptionForm.medications.trim() || !prescriptionForm.diagnosis.trim()) {
      message.error('Please fill in Doctor, Medications, and Diagnosis');
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/customers/${id}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescribedBy: prescriptionForm.doctor,
          medications: prescriptionForm.medications,
          diagnosis: prescriptionForm.diagnosis,
          notes: prescriptionForm.notes || undefined,
          issuedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to save prescription');
      }

      message.success('Prescription saved successfully!');
      setShowAddPrescription(false);
      setPrescriptionForm({
        doctor: '',
        medications: '',
        diagnosis: '',
        notes: '',
      });

      // Refresh prescription list
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      message.error('Error saving prescription: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleRowChange = (id: number, field: string, value: any) => {
    setBookingRows(bookingRows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        // When a service is picked, auto-fill the amount + category from the
        // branch-assigned services list (value is the service name).
        if (field === 'service' && value) {
          const svc = (branchServices ?? []).find((s) => s.name === value);
          if (svc) {
            updated.amount = svc.minPrice / 100;
            updated.category = svc.categoryName ?? undefined;
          }
        }
        return updated;
      }
      return row;
    }));
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* TOP ROW: Select Customer (Left) | Modules (Right) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* LEFT: Customer Selector */}
        <Col xs={24} md={8}>
          <Card
            title="Select Customer"
            extra={
              !showConfirmation && (
                <Button type="primary" size="small" onClick={handleShowConfirmation}>
                  + Add Customer
                </Button>
              )
            }
            bodyStyle={{ padding: 12 }}
            style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}
          >
            {/* Customer Name Field */}
            <Input
              placeholder="Enter or search customer name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              style={{ marginBottom: 12 }}
              allowClear
              disabled={showConfirmation}
            />

            {/* Phone Number Field */}
            <Input
              placeholder="Enter or search phone number"
              value={phoneInput}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setPhoneInput(value);
              }}
              style={{ marginBottom: 12 }}
              allowClear
              disabled={showConfirmation}
              type="tel"
            />

            {/* Confirmation Section */}
            {showConfirmation && (
              <div style={{
                padding: 12,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                marginBottom: 12,
                backgroundColor: '#fafafa'
              }}>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Confirm customer details:</p>
                  <p style={{ fontSize: 12, color: colors.text.secondary, margin: '8px 0 0 0' }}>
                    Name: <strong>{nameInput}</strong>
                  </p>
                  {phoneInput && (
                    <p style={{ fontSize: 12, color: colors.text.secondary, margin: '4px 0 0 0' }}>
                      Phone: <strong>{phoneInput}</strong>
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleSaveCustomer}
                    loading={createCustomer.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={handleCancelConfirmation}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Customer List */}
            {!showConfirmation && (
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                {customersLoading ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <Spin size="small" />
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <Empty description="No customers found" style={{ marginTop: 20 }} />
                ) : (
                  <div>
                    {filteredCustomers.map((cust) => (
                      <Card
                        key={cust.id}
                        hoverable
                        style={{
                          cursor: 'pointer',
                          marginBottom: 8,
                          border: cust.id === id ? `2px solid ${colors.gold.primary}` : '1px solid #d9d9d9',
                          backgroundColor: cust.id === id ? colors.gold.light : 'white',
                        }}
                        onClick={() => {
                          // Populate fields with selected customer
                          setNameInput(cust.name);
                          setPhoneInput(cust.phone || '');
                          // Navigate to customer
                          if (cust.id !== id) {
                            router.push(`/customers/${cust.id}`);
                          }
                        }}
                        bodyStyle={{ padding: 12 }}
                      >
                        <div style={{ fontWeight: cust.id === id ? 700 : 600, fontSize: 14, marginBottom: 4 }}>
                          {cust.name}
                        </div>
                        <div style={{ fontSize: 12, color: colors.text.secondary }}>
                          {cust.phone || cust.email || '—'}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>

        {/* RIGHT: Modules */}
        <Col xs={24} md={16}>
          {!customer || isLoading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <Spin size="large" />
            </div>
          ) : (
            <Card title="Modules" style={{ minHeight: '400px' }}>
              <Row gutter={[16, 16]}>
                {modules.map((m) => (
                  <Col xs={24} sm={12} lg={modules.length <= 5 ? 8 : 6} key={m.key}>
                    <ModuleCard
                      icon={m.icon}
                      title={m.title}
                      count={m.count}
                      loading={m.loading}
                      onClick={() => setExpandedModuleView(expandedModuleView === m.key ? null : m.key)}
                    />
                  </Col>
                ))}
              </Row>
            </Card>
          )}
        </Col>
      </Row>

      {/* CUSTOMER DETAILS SECTION - REDESIGNED */}
      {!customer || isLoading ? null : (
        <>
          {/* Customer Header Card */}
          <Card
            style={{
              marginBottom: 24,
              background: `linear-gradient(135deg, ${colors.gold.light} 0%, white 100%)`,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
            }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} md={5}>
                <div style={{ textAlign: 'center' }}>
                  <AvatarUpload customerId={id} name={customer.name} avatarUrl={customer.avatarUrl} />
                  <Title level={4} style={{ margin: '12px 0 4px 0 ', fontWeight: 600 }}>
                    {customer.name}
                  </Title>
                  <Tag color={customer.type === 'business' ? 'gold' : 'default'}>
                    {customer.type === 'business' ? 'Business' : 'Individual'}
                  </Tag>
                </div>
              </Col>

              <Col xs={24} md={19}>
                {/* Stats Grid */}
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={8} md={6}>
                    <div style={{
                      padding: '16px 12px',
                      background: 'white',
                      borderRadius: 6,
                      textAlign: 'center',
                      border: `1px solid ${colors.border}`,
                      transition: 'all 0.3s ease',
                      cursor: 'default',
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.08)`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ fontSize: 24, fontWeight: 700, color: colors.gold.primary }}>
                        {bookings?.length ?? 0}
                      </div>
                      <div style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>
                        Bookings
                      </div>
                    </div>
                  </Col>

                  <Col xs={12} sm={8} md={6}>
                    <div style={{
                      padding: '16px 12px',
                      background: 'white',
                      borderRadius: 6,
                      textAlign: 'center',
                      border: `1px solid ${colors.border}`,
                      transition: 'all 0.3s ease',
                      cursor: 'default',
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.08)`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>
                        0
                      </div>
                      <div style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>
                        Pending Bills
                      </div>
                    </div>
                  </Col>

                  <Col xs={12} sm={8} md={6}>
                    <div style={{
                      padding: '16px 12px',
                      background: 'white',
                      borderRadius: 6,
                      textAlign: 'center',
                      border: `1px solid ${colors.border}`,
                      transition: 'all 0.3s ease',
                      cursor: 'default',
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.08)`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.status.success }}>
                        {formatMoney(sales?.summary.totalSpent ?? 0)}
                      </div>
                      <div style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>
                        Total Paid
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} sm={24} md={6}>
                    <div style={{
                      padding: '16px 12px',
                      background: '#fff7e6',
                      borderRadius: 6,
                      textAlign: 'center',
                      border: `1px solid #ffd666`,
                      transition: 'all 0.3s ease',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#ad6800' }}>
                        {formatMoney(sales?.summary.outstanding ?? 0)}
                      </div>
                      <div style={{ fontSize: 12, color: '#ad6800', marginTop: 4 }}>
                        Pending Amount
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          {/* Tabs or Module View */}
          {!expandedModuleView ? (
            <>
              {/* Tab Navigation */}
              <div style={{ marginBottom: 16, display: 'flex', gap: 8, borderBottom: `2px solid ${colors.border}` }}>
                {['history', 'feedback', 'documents'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab as any); setSelectedDetail(null); setDetailType(null); }}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      background: activeTab === tab ? colors.gold.primary : 'transparent',
                      color: activeTab === tab ? 'white' : colors.text.secondary,
                      fontSize: 14,
                      fontWeight: activeTab === tab ? 600 : 500,
                      cursor: 'pointer',
                      borderRadius: '6px 6px 0 0',
                      transition: 'all 0.3s ease',
                      textTransform: 'capitalize',
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab) {
                        e.currentTarget.style.color = colors.text.primary;
                        e.currentTarget.style.background = colors.gold.light;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab) {
                        e.currentTarget.style.color = colors.text.secondary;
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {tab === 'history' && '📋 History'}
                    {tab === 'feedback' && '⭐ Client Feedback'}
                    {tab === 'documents' && '📄 Client Documents'}
                  </button>
                ))}
              </div>

              {/* Tab Content - Full Width */}
              <Card
                style={{
                  marginBottom: 16,
                  minHeight: 500,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  opacity: 1,
                  transition: 'opacity 0.3s ease',
                }}
                bodyStyle={{ padding: 24 }}
              >
            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                {history && history.length > 0 ? (
                  <div>
                    {selectedDetail && detailType === 'history' ? (
                        <div>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => { setSelectedDetail(null); setDetailType(null); }}
                            style={{ marginBottom: 12, color: colors.gold.primary, fontSize: 12 }}
                          >
                            ← Back
                          </Button>
                          <div style={{ padding: 12, background: colors.gold.light, borderRadius: 6 }}>
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: colors.text.secondary, marginBottom: 3, textTransform: 'uppercase' }}>Title</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: colors.text.primary }}>
                                {selectedDetail.title || '—'}
                              </div>
                            </div>

                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: colors.text.secondary, marginBottom: 3, textTransform: 'uppercase' }}>Date</div>
                              <div style={{ fontSize: 11, color: colors.text.primary }}>
                                {formatDate(selectedDetail.createdAt)}
                              </div>
                            </div>

                            {selectedDetail.description && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: colors.text.secondary, marginBottom: 3, textTransform: 'uppercase' }}>Description</div>
                                <div style={{ fontSize: 11, color: colors.text.primary, lineHeight: 1.5 }}>
                                  {selectedDetail.description}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', paddingLeft: 16 }}>
                          {/* Timeline Line */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 5,
                              top: 0,
                              bottom: 0,
                              width: 2,
                              background: `linear-gradient(to bottom, ${colors.gold.primary}, ${colors.gold.light})`,
                            }}
                          />

                          {/* Timeline Items */}
                          {history.map((item: any, index: number) => (
                            <div
                              key={index}
                              onClick={() => { setSelectedDetail(item); setDetailType('history'); }}
                              style={{
                                marginBottom: 14,
                                paddingLeft: 16,
                                position: 'relative',
                                cursor: 'pointer',
                              }}
                            >
                              {/* Timeline Dot */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: -9,
                                  top: 2,
                                  width: 12,
                                  height: 12,
                                  background: 'white',
                                  border: `2px solid ${colors.gold.primary}`,
                                  borderRadius: '50%',
                                  transition: 'all 0.2s ease',
                                }}
                              />

                              {/* Timeline Content */}
                              <div
                                style={{
                                  padding: 10,
                                  background: '#f9f9f9',
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: 4,
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.06)`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#f9f9f9';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <div style={{ fontWeight: 600, fontSize: 12, color: colors.text.primary, marginBottom: 4 }}>
                                  {item.title || 'Event'}
                                </div>
                                <div style={{ fontSize: 10, color: colors.text.secondary }}>
                                  {formatDate(item.createdAt)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Empty description="No history" style={{ marginTop: 40 }} />
                  )}
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === 'feedback' && (
                <div>
                  {feedback && feedback.length > 0 ? (
                    <div>
                      {selectedDetail?.id && detailType === 'feedback' && feedback.find((f: any) => f.id === selectedDetail.id) ? (
                        <div>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => { setSelectedDetail(null); setDetailType(null); }}
                            style={{ marginBottom: 12 }}
                          >
                            ← Back to List
                          </Button>
                          <div style={{ padding: 16, background: '#fffbe6', borderRadius: 6 }}>
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>Rating</div>
                              <div style={{ fontSize: 24, color: '#fadb14' }}>
                                {'★'.repeat(selectedDetail.rating || 0)}
                                <span style={{ fontSize: 12, marginLeft: 8, color: colors.text.secondary }}>
                                  {selectedDetail.rating || 0}/5
                                </span>
                              </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>Date</div>
                              <div style={{ fontSize: 12, color: colors.text.primary }}>
                                {formatDate(selectedDetail.createdAt)}
                              </div>
                            </div>

                            {selectedDetail.relatedTo && (
                              <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>Related To</div>
                                <div style={{ fontSize: 12, color: colors.text.primary }}>
                                  {selectedDetail.relatedTo}
                                </div>
                              </div>
                            )}

                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>Feedback</div>
                              <div style={{ fontSize: 13, color: colors.text.primary, lineHeight: 1.6 }}>
                                {selectedDetail.comment || '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        feedback.map((item: any) => (
                          <div
                            key={item.id}
                            onClick={() => { setSelectedDetail(item); setDetailType('feedback'); }}
                            style={{
                              marginBottom: 12,
                              padding: 12,
                              background: '#f5f5f5',
                              borderRadius: 6,
                              borderLeft: `3px solid #fadb14`,
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#fafafa';
                              e.currentTarget.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.06)`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#f5f5f5';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: colors.text.primary }}>
                                {item.comment ? item.comment.substring(0, 30) + '...' : 'Feedback'}
                              </div>
                              <div style={{ color: '#fadb14', fontSize: 14 }}>
                                {'★'.repeat(item.rating || 0)}
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: colors.text.secondary }}>
                              {formatDate(item.createdAt)}
                            </div>
                            {item.comment && (
                              <div style={{ fontSize: 12, marginTop: 6, color: colors.text.secondary }}>
                                {item.comment}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <Empty description="No feedback" style={{ marginTop: 40 }} />
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div>
                  {documents && documents.length > 0 ? (
                    <div>
                      {selectedDetail?.id && detailType === 'document' && documents.find((d: any) => d.id === selectedDetail.id) ? (
                        <div>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => { setSelectedDetail(null); setDetailType(null); }}
                            style={{ marginBottom: 12 }}
                          >
                            ← Back to List
                          </Button>
                          <div style={{ padding: 16, background: '#f6ffed', borderRadius: 6 }}>
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>Title</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary }}>
                                {selectedDetail.title || '—'}
                              </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>Document Type</div>
                              <div style={{ fontSize: 12, color: colors.text.primary }}>
                                {selectedDetail.docType || '—'}
                              </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>Date Uploaded</div>
                              <div style={{ fontSize: 12, color: colors.text.primary }}>
                                {formatDate(selectedDetail.createdAt || selectedDetail.uploadedAt)}
                              </div>
                            </div>

                            {selectedDetail.notes && (
                              <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>Notes</div>
                                <div style={{ fontSize: 13, color: colors.text.primary, lineHeight: 1.6 }}>
                                  {selectedDetail.notes}
                                </div>
                              </div>
                            )}

                            {selectedDetail.fileUrl && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, marginBottom: 4, textTransform: 'uppercase' }}>File URL</div>
                                <a href={selectedDetail.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#52c41a', fontWeight: 500 }}>
                                  📥 Download File
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        documents.map((item: any) => (
                          <div
                            key={item.id}
                            onClick={() => { setSelectedDetail(item); setDetailType('document'); }}
                            style={{
                              marginBottom: 12,
                              padding: 12,
                              background: '#f5f5f5',
                              borderRadius: 6,
                              borderLeft: `3px solid #52c41a`,
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#fafafa';
                              e.currentTarget.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.06)`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#f5f5f5';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13, color: colors.text.primary, marginBottom: 4 }}>
                              {item.title || 'Document'}
                            </div>
                            <div style={{ fontSize: 11, color: colors.text.secondary, marginBottom: 6 }}>
                              {item.docType || 'File'}
                            </div>
                            <div style={{ fontSize: 11, color: colors.text.secondary }}>
                              {formatDate(item.createdAt)}
                            </div>
                            {item.notes && (
                              <div style={{ fontSize: 12, marginTop: 6, color: colors.text.secondary }}>
                                {item.notes}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <Empty description="No documents" style={{ marginTop: 40 }} />
                  )}
                </div>
              )}
              </Card>
            </>
          ) : (
            /* Module Details View - Replaces Customer Info */
            <div
              ref={moduleViewRef}
              style={{
                marginBottom: 16,
                opacity: 1,
                transition: 'all 0.3s ease',
              }}
            >
              {/* Header Rectangle */}
              <div
                style={{
                  padding: 16,
                  background: colors.gold.primary,
                  borderRadius: 8,
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: `0 0 20px rgba(218, 165, 32, 0.4), 0 4px 16px rgba(0, 0, 0, 0.1)`,
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setExpandedModuleView(null)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.gold.light;
                  e.currentTarget.style.boxShadow = `0 0 24px rgba(218, 165, 32, 0.6), 0 6px 20px rgba(0, 0, 0, 0.15)`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.gold.primary;
                  e.currentTarget.style.boxShadow = `0 0 20px rgba(218, 165, 32, 0.4), 0 4px 16px rgba(0, 0, 0, 0.1)`;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                    Currently Viewing
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
                    {modules.find(m => m.key === expandedModuleView)?.title || 'Module Details'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                    Customer
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>
                    {customer?.name || '—'}
                  </div>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setExpandedModuleView(null)}
                    style={{ color: 'white', marginTop: 4 }}
                  >
                    ← Back to {customer?.name}
                  </Button>
                </div>
              </div>

              {/* Content Card */}
              <Card
                style={{
                  minHeight: 500,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                }}
                bodyStyle={{ padding: 24 }}
              >
              {expandedModuleView === 'bookings' && (
                <div>
                  {bookingsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, color: colors.text.secondary }}>Loading bookings...</p>
                    </div>
                  ) : bookings && bookings.length > 0 ? (
                    <div>
                      <p style={{ marginBottom: 16, color: colors.text.secondary }}>
                        Total Bookings: <strong>{bookings.length}</strong>
                      </p>
                      {bookings.map((booking: any) => (
                        <Card key={booking.id} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <p style={{ fontWeight: 600, margin: 0 }}>{booking.serviceName || 'Service'}</p>
                              <p style={{ fontSize: 12, color: colors.text.secondary, margin: '4px 0 0 0' }}>
                                {formatDate(booking.scheduledAt || booking.createdAt)}
                              </p>
                              {booking.notes && (
                                <p style={{ fontSize: 12, color: colors.text.secondary, margin: '6px 0 0 0' }}>
                                  {booking.notes}
                                </p>
                              )}
                            </div>
                            <Tag color={booking.status === 'completed' ? 'green' : booking.status === 'confirmed' ? 'blue' : 'orange'}>
                              {booking.status || 'pending'}
                            </Tag>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty description="No bookings yet" />
                  )}
                </div>
              )}

              {expandedModuleView === 'packages' && (
                <div>
                  {packagesLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, color: colors.text.secondary }}>Loading packages...</p>
                    </div>
                  ) : packages && packages.length > 0 ? (
                    <div>
                      <p style={{ marginBottom: 16, color: colors.text.secondary }}>
                        Total Packages: <strong>{packages.length}</strong>
                      </p>
                      {packages.map((pkg: any) => (
                        <Card key={pkg.id} style={{ marginBottom: 12 }}>
                          <p style={{ fontWeight: 600, margin: 0 }}>{pkg.name || 'Package'}</p>
                          <p style={{ fontSize: 12, color: colors.text.secondary, margin: '4px 0 0 0' }}>
                            {pkg.description || '—'}
                          </p>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty description="No packages" />
                  )}
                </div>
              )}

              {expandedModuleView === 'offers' && (
                <div>
                  {offersLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, color: colors.text.secondary }}>Loading offers...</p>
                    </div>
                  ) : offers && offers.length > 0 ? (
                    <div>
                      <p style={{ marginBottom: 16, color: colors.text.secondary }}>
                        Total Offers: <strong>{offers.length}</strong>
                      </p>
                      {offers.map((offer: any) => (
                        <Card key={offer.id} style={{ marginBottom: 12 }}>
                          <p style={{ fontWeight: 600, margin: 0 }}>{offer.title || 'Offer'}</p>
                          <p style={{ fontSize: 12, color: colors.text.secondary, margin: '4px 0 0 0' }}>
                            {offer.description || '—'}
                          </p>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty description="No offers" />
                  )}
                </div>
              )}

              {expandedModuleView === 'prescriptions' && (
                <div>
                  {/* Add Prescription Form */}
                  {showAddPrescription && (
                    <Card
                      style={{
                        marginBottom: 20,
                        background: '#fafafa',
                        borderLeft: `4px solid ${colors.gold.primary}`,
                      }}
                      title="➕ Add New Prescription"
                      extra={
                        <Button
                          type="text"
                          onClick={() => setShowAddPrescription(false)}
                        >
                          ✕
                        </Button>
                      }
                    >
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <div style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                              Doctor Name
                            </Text>
                            <Select
                              placeholder={branchStaffLoading ? 'Loading doctors…' : 'Select doctor'}
                              loading={branchStaffLoading}
                              options={doctorOptions}
                              notFoundContent={
                                branchStaffLoading ? 'Loading…' : 'No staff in this branch'
                              }
                              value={prescriptionForm.doctor || undefined}
                              onChange={(value) =>
                                setPrescriptionForm({ ...prescriptionForm, doctor: value })
                              }
                              style={{ width: '100%' }}
                              showSearch
                              filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                              }
                            />
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                              Diagnosis
                            </Text>
                            <Select
                              placeholder="Select diagnosis"
                              options={diagnosisOptions}
                              value={prescriptionForm.diagnosis || undefined}
                              onChange={(value) =>
                                setPrescriptionForm({ ...prescriptionForm, diagnosis: value })
                              }
                              style={{ width: '100%' }}
                              showSearch
                              filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                              }
                              allowClear
                            />
                          </div>
                        </Col>
                        <Col xs={24}>
                          <div style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                              Medications (separate multiple with |)
                            </Text>
                            <Input.TextArea
                              placeholder="e.g., Aspirin 500mg - Twice daily for 5 days | Cough syrup 10ml - Thrice daily"
                              rows={4}
                              value={prescriptionForm.medications}
                              onChange={(e) =>
                                setPrescriptionForm({ ...prescriptionForm, medications: e.target.value })
                              }
                            />
                          </div>
                        </Col>
                        <Col xs={24}>
                          <div style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                              Special Notes/Allergies (Optional)
                            </Text>
                            <Input.TextArea
                              placeholder="e.g., Patient is allergic to Penicillin. Take medicine after meals."
                              rows={3}
                              value={prescriptionForm.notes}
                              onChange={(e) =>
                                setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })
                              }
                            />
                          </div>
                        </Col>
                        <Col xs={24}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              type="primary"
                              onClick={handleSavePrescription}
                              style={{
                                background: colors.gold.primary,
                                borderColor: colors.gold.primary,
                              }}
                            >
                              ✓ Save Prescription
                            </Button>
                            <Button onClick={() => setShowAddPrescription(false)}>
                              Cancel
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  )}

                  {prescriptionsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, color: colors.text.secondary }}>Loading prescriptions...</p>
                    </div>
                  ) : prescriptions && prescriptions.length > 0 ? (
                    <div>
                      <div style={{ background: 'white', padding: 16, borderRadius: 6, marginBottom: 20 }}>
                        <Row gutter={16} align="middle" justify="space-between">
                          <Col xs={24} sm={8}>
                            <div>
                              <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 8 }}>
                                Total Prescriptions
                              </Text>
                              <Title level={3} style={{ margin: 0, color: colors.gold.primary }}>
                                {prescriptions.length}
                              </Title>
                            </div>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                              📋 All prescriptions issued by doctors are listed below with medications and instructions.
                            </Text>
                          </Col>
                          <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                            <Button
                              type="primary"
                              onClick={() => setShowAddPrescription(true)}
                              style={{
                                background: colors.gold.primary,
                                borderColor: colors.gold.primary,
                              }}
                            >
                              + Add Prescription
                            </Button>
                          </Col>
                        </Row>
                      </div>

                      {prescriptions.map((prescription: any, idx: number) => (
                        <Card
                          key={prescription.id}
                          style={{
                            marginBottom: 16,
                            background: 'white',
                            borderLeft: `4px solid ${colors.gold.primary}`,
                          }}
                          bodyStyle={{ padding: 16 }}
                        >
                          <Row gutter={[16, 12]}>
                            <Col xs={24} sm={12}>
                              <div>
                                <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>
                                  Prescription #{idx + 1}
                                </Text>
                                <Text
                                  strong
                                  style={{
                                    display: 'block',
                                    fontSize: 14,
                                    color: colors.text.primary,
                                    marginBottom: 8,
                                  }}
                                >
                                  💊 Medications
                                </Text>
                                <Text
                                  style={{
                                    display: 'block',
                                    fontSize: 13,
                                    color: colors.text.primary,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.6',
                                  }}
                                >
                                  {prescription.medications || 'No medications listed'}
                                </Text>
                              </div>
                            </Col>
                            <Col xs={24} sm={12}>
                              <div style={{ marginBottom: 12 }}>
                                <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>
                                  Diagnosis
                                </Text>
                                <Tag color="blue" style={{ fontSize: 12 }}>
                                  {prescription.diagnosis || '—'}
                                </Tag>
                              </div>
                              <div>
                                <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>
                                  Date Issued
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: 500 }}>
                                  {formatDate(prescription.issuedAt || prescription.createdAt)}
                                </Text>
                              </div>
                            </Col>
                          </Row>

                          {prescription.notes && (
                            <>
                              <Divider style={{ margin: '12px 0' }} />
                              <div>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: '#ff7a45',
                                    display: 'block',
                                    marginBottom: 4,
                                  }}
                                >
                                  ⚠️ Important Notes:
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    color: colors.text.primary,
                                    whiteSpace: 'pre-wrap',
                                    display: 'block',
                                  }}
                                >
                                  {prescription.notes}
                                </Text>
                              </div>
                            </>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: 'white', padding: 40, borderRadius: 6, textAlign: 'center' }}>
                      <Empty description="No prescriptions yet" />
                      <Button
                        type="primary"
                        onClick={() => setShowAddPrescription(true)}
                        style={{
                          background: colors.gold.primary,
                          borderColor: colors.gold.primary,
                          marginTop: 20,
                        }}
                      >
                        + Create First Prescription
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {expandedModuleView === 'medical-reports' && (
                <div>
                  <Card>
                    <Tabs
                      defaultActiveKey="medical-screening"
                      items={[
                        {
                          key: 'medical-screening',
                          label: 'Medical Screening',
                          children: (
                            <div>
                              <Title level={5} style={{ marginTop: 0 }}>Dietary</Title>
                              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      CARBS
                                    </Text>
                                    <Input placeholder="Carbs intake" />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      SUGAR
                                    </Text>
                                    <Input placeholder="Sugar intake" />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      WATER CONSUMPTION
                                    </Text>
                                    <Input placeholder="Liters per day" />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      VEG / NON VEG
                                    </Text>
                                    <Select placeholder="Select" options={[
                                      { label: 'Vegetarian', value: 'veg' },
                                      { label: 'Non-Vegetarian', value: 'non-veg' },
                                      { label: 'Vegan', value: 'vegan' },
                                    ]} />
                                  </div>
                                </Col>
                              </Row>

                              <Divider />

                              <Title level={5}>Life Style</Title>
                              <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      SLEEP PATTERN
                                    </Text>
                                    <Input placeholder="e.g., 7-8 hours" />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      WORKING HOURS/SHIFT
                                    </Text>
                                    <Input placeholder="e.g., 9 AM - 6 PM" />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      TRAVEL
                                    </Text>
                                    <Input placeholder="Frequency/Distance" />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      CHANGE OF PLACE
                                    </Text>
                                    <Select placeholder="Select" options={[
                                      { label: 'Yes', value: 'yes' },
                                      { label: 'No', value: 'no' },
                                    ]} />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      SMOKING/ALCOHOL
                                    </Text>
                                    <Input placeholder="Frequency" />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <div>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      FOOD ALLERGY / DRUG ALLERGY
                                    </Text>
                                    <Input.TextArea placeholder="List any allergies" rows={2} />
                                  </div>
                                </Col>
                              </Row>

                              <div style={{ marginTop: 24 }}>
                                <Button type="primary" style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}>
                                  Save Medical Screening
                                </Button>
                              </div>
                            </div>
                          ),
                        },
                        {
                          key: 'hair',
                          label: 'Hair',
                          children: (
                            <div style={{ padding: '20px 0' }}>
                              <Title level={5} style={{ marginBottom: 20 }}>Medical History - Objective Assessment</Title>

                              {/* Hair Assessment Table */}
                              <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                                <table style={{
                                  width: '100%',
                                  borderCollapse: 'collapse',
                                  background: 'white',
                                }}>
                                  <tbody>
                                    {[
                                      { sno: '1', test: 'HAIR PULL TEST', placeholder: 'Hair Test' },
                                      { sno: '2', test: 'TRICHOMETRIC ANALYSIS', placeholder: 'Trichometric' },
                                      { sno: '3', test: 'FUNGAL CULTURE-EXAMINATION', placeholder: 'Fungal' },
                                      { sno: '4', test: 'BACTERIAL CULTURE-EXAMINATION', placeholder: 'Bacterial' },
                                      { sno: '5', test: 'DERMOSCOPY FINDINGS', placeholder: 'Dermoscopy' },
                                      { sno: '6', test: 'HAIR DENSITY ANALYSIS', placeholder: 'Density' },
                                      { sno: '7', test: 'SCALP CONDITION', placeholder: 'Scalp Condition' },
                                      { sno: '8', test: 'GRADES', placeholder: 'Grades', subRows: true },
                                      { sno: '9', test: 'BLOOD INVESTIGATION IF ANY', placeholder: 'Blood Investigation' },
                                      { sno: '10', test: 'THYROID PROFILE', placeholder: 'Thyroid Profile' },
                                      { sno: '11', test: 'IRON LEVELS', placeholder: 'Iron Levels' },
                                      { sno: '12', test: 'VITAMIN DEFICIENCY', placeholder: 'Vitamin Status' },
                                      { sno: '13', test: 'ALLERGIES/SENSITIVITIES', placeholder: 'Allergies' },
                                      { sno: '14', test: 'TREATMENT HISTORY', placeholder: 'Previous Treatments' },
                                      { sno: '15', test: 'Medical Summary', placeholder: 'Medical Summary' },
                                    ].map((row, idx) => (
                                      <div key={idx}>
                                        <tr>
                                          <td style={{
                                            padding: '12px',
                                            border: `1px solid ${colors.border}`,
                                            background: colors.gold.light,
                                            fontWeight: 600,
                                            width: '50px',
                                          }}>
                                            {row.sno}
                                          </td>
                                          <td style={{
                                            padding: '12px',
                                            border: `1px solid ${colors.border}`,
                                            background: colors.gold.light,
                                            fontWeight: 600,
                                            width: '250px',
                                          }}>
                                            {row.test}
                                          </td>
                                          <td style={{
                                            padding: '12px',
                                            border: `1px solid ${colors.border}`,
                                          }}>
                                            {row.subRows ? null : (
                                              <Input placeholder={row.placeholder} size="small" />
                                            )}
                                          </td>
                                        </tr>
                                        {row.subRows && (
                                          <>
                                            <tr>
                                              <td colSpan={2} style={{
                                                padding: '12px',
                                                border: `1px solid ${colors.border}`,
                                                background: '#f5f5f5',
                                                fontWeight: 500,
                                              }}>
                                                MALE PATTERN THINNING
                                              </td>
                                              <td style={{
                                                padding: '12px',
                                                border: `1px solid ${colors.border}`,
                                              }}>
                                                <Input placeholder="Grades" size="small" />
                                              </td>
                                            </tr>
                                            <tr>
                                              <td colSpan={2} style={{
                                                padding: '12px',
                                                border: `1px solid ${colors.border}`,
                                                background: '#f5f5f5',
                                                fontWeight: 500,
                                              }}>
                                                FEMALE PATTERN THINNING
                                              </td>
                                              <td style={{
                                                padding: '12px',
                                                border: `1px solid ${colors.border}`,
                                              }}>
                                                <Input placeholder="Grades" size="small" />
                                              </td>
                                            </tr>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <Button type="primary" style={{
                                background: colors.gold.primary,
                                borderColor: colors.gold.primary,
                                marginBottom: 20,
                              }}>
                                Update Assessment
                              </Button>
                            </div>
                          ),
                        },
                        {
                          key: 'before-after',
                          label: 'Before After Images',
                          children: (
                            <div style={{ padding: '20px 0' }}>
                              <Row gutter={24}>
                                <Col xs={24} sm={12}>
                                  <Title level={5}>Before Images</Title>
                                  <Card style={{ borderRadius: 8, border: `2px dashed ${colors.border}`, padding: 40, textAlign: 'center' }}>
                                    <div style={{ marginBottom: 16 }}>
                                      <Input type="file" />
                                    </div>
                                    <Button type="primary" style={{ background: '#1890ff' }}>
                                      📷 Open Camera
                                    </Button>
                                    <div style={{ marginTop: 20 }}>
                                      <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a', width: '100%' }}>
                                        Upload Image Before
                                      </Button>
                                    </div>
                                  </Card>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <Title level={5}>After Images</Title>
                                  <Card style={{ borderRadius: 8, border: `2px dashed ${colors.border}`, padding: 40, textAlign: 'center' }}>
                                    <div style={{ marginBottom: 16 }}>
                                      <Input type="file" />
                                    </div>
                                    <Button type="primary" style={{ background: '#1890ff' }}>
                                      📷 Open Camera
                                    </Button>
                                    <div style={{ marginTop: 20 }}>
                                      <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a', width: '100%' }}>
                                        Upload Image After
                                      </Button>
                                    </div>
                                  </Card>
                                </Col>
                              </Row>
                            </div>
                          ),
                        },
                        {
                          key: 'client-docs',
                          label: 'Client Supporting Docs',
                          children: (
                            <div style={{ padding: '20px 0' }}>
                              <Title level={5}>Documents Upload</Title>
                              <Card>
                                <Row gutter={[16, 16]}>
                                  <Col xs={24}>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      Documents Name
                                    </Text>
                                    <Input placeholder="Enter document name" />
                                  </Col>
                                  <Col xs={24}>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      File Upload
                                    </Text>
                                    <Input type="file" />
                                    <Text style={{ fontSize: 11, color: '#ff7a45', marginTop: 8, display: 'block' }}>
                                      ⚠️ Note: File should be below 500KB
                                    </Text>
                                  </Col>
                                  <Col xs={24}>
                                    <Space>
                                      <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                                        Upload
                                      </Button>
                                      <Button danger>Cancel</Button>
                                    </Space>
                                  </Col>
                                </Row>
                              </Card>
                            </div>
                          ),
                        },
                        {
                          key: 'medical-history',
                          label: 'Medical History',
                          children: (
                            <div style={{ padding: '20px 0' }}>
                              <Title level={5}>Objective Assessment</Title>
                              <Card>
                                <Row gutter={[16, 16]}>
                                  <Col xs={24} sm={12}>
                                    <div>
                                      <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                        Blood Pressure
                                      </Text>
                                      <Input placeholder="e.g., 120/80" />
                                    </div>
                                  </Col>
                                  <Col xs={24} sm={12}>
                                    <div>
                                      <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                        Heart Rate
                                      </Text>
                                      <Input placeholder="BPM" />
                                    </div>
                                  </Col>
                                  <Col xs={24} sm={12}>
                                    <div>
                                      <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                        BMI
                                      </Text>
                                      <Input placeholder="e.g., 23.5" />
                                    </div>
                                  </Col>
                                  <Col xs={24} sm={12}>
                                    <div>
                                      <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                        Weight (kg)
                                      </Text>
                                      <Input placeholder="e.g., 75" />
                                    </div>
                                  </Col>
                                  <Col xs={24}>
                                    <div>
                                      <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                        Clinical Notes
                                      </Text>
                                      <Input.TextArea placeholder="Medical observations and notes" rows={4} />
                                    </div>
                                  </Col>
                                  <Col xs={24}>
                                    <Button type="primary" style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}>
                                      Save Medical History
                                    </Button>
                                  </Col>
                                </Row>
                              </Card>
                            </div>
                          ),
                        },
                        {
                          key: 'image-forms',
                          label: '📷 Image Forms',
                          children: (
                            <div style={{ padding: '20px 0' }}>
                              {/* Hair Images */}
                              <Title level={5} style={{ marginBottom: 20 }}>Hair Images</Title>
                              <Row gutter={[24, 24]} style={{ marginBottom: 36 }}>
                                <Col xs={24} sm={12} lg={6}>
                                  <Card style={{ borderRadius: 8, border: `2px dashed ${colors.border}`, textAlign: 'center', height: '100%' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>👨</div>
                                    <Title level={5} style={{ margin: '0 0 12px 0' }}>Front View</Title>
                                    <Input type="file" accept="image/*" style={{ marginBottom: 12 }} />
                                    <Button type="primary" style={{ background: '#1890ff', borderColor: '#1890ff', width: '100%', marginBottom: 8 }}>
                                      📷 Capture
                                    </Button>
                                  </Card>
                                </Col>

                                <Col xs={24} sm={12} lg={6}>
                                  <Card style={{ borderRadius: 8, border: `2px dashed ${colors.border}`, textAlign: 'center', height: '100%' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>↩️</div>
                                    <Title level={5} style={{ margin: '0 0 12px 0' }}>Side View</Title>
                                    <Input type="file" accept="image/*" style={{ marginBottom: 12 }} />
                                    <Button type="primary" style={{ background: '#1890ff', borderColor: '#1890ff', width: '100%', marginBottom: 8 }}>
                                      📷 Capture
                                    </Button>
                                  </Card>
                                </Col>

                                <Col xs={24} sm={12} lg={6}>
                                  <Card style={{ borderRadius: 8, border: `2px dashed ${colors.border}`, textAlign: 'center', height: '100%' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔝</div>
                                    <Title level={5} style={{ margin: '0 0 12px 0' }}>Top View</Title>
                                    <Input type="file" accept="image/*" style={{ marginBottom: 12 }} />
                                    <Button type="primary" style={{ background: '#1890ff', borderColor: '#1890ff', width: '100%', marginBottom: 8 }}>
                                      📷 Capture
                                    </Button>
                                  </Card>
                                </Col>

                                <Col xs={24} sm={12} lg={6}>
                                  <Card style={{ borderRadius: 8, border: `2px dashed ${colors.border}`, textAlign: 'center', height: '100%' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔬</div>
                                    <Title level={5} style={{ margin: '0 0 12px 0' }}>Scalp Close-up</Title>
                                    <Input type="file" accept="image/*" style={{ marginBottom: 12 }} />
                                    <Button type="primary" style={{ background: '#1890ff', borderColor: '#1890ff', width: '100%', marginBottom: 8 }}>
                                      📷 Capture
                                    </Button>
                                  </Card>
                                </Col>
                              </Row>

                              <Button type="primary" style={{
                                background: '#52c41a',
                                borderColor: '#52c41a',
                                marginBottom: 36,
                                width: '100%',
                              }}>
                                📤 Upload Hair Images
                              </Button>

                              <Divider style={{ margin: '24px 0' }} />

                              {/* Before After Images */}
                              <Title level={5} style={{ marginBottom: 20 }}>Before & After Images</Title>
                              <Row gutter={24} style={{ marginBottom: 36 }}>
                                <Col xs={24} sm={12}>
                                  <Card style={{ borderRadius: 8, border: `2px dashed ${colors.border}`, textAlign: 'center' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
                                    <Title level={5} style={{ margin: '0 0 12px 0' }}>Before Image</Title>
                                    <Input type="file" accept="image/*" style={{ marginBottom: 12 }} />
                                    <Button type="primary" style={{ background: '#1890ff', borderColor: '#1890ff', width: '100%', marginBottom: 8 }}>
                                      📷 Capture
                                    </Button>
                                    <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a', width: '100%' }}>
                                      ✅ Upload Before
                                    </Button>
                                  </Card>
                                </Col>

                                <Col xs={24} sm={12}>
                                  <Card style={{ borderRadius: 8, border: `2px dashed ${colors.border}`, textAlign: 'center' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
                                    <Title level={5} style={{ margin: '0 0 12px 0' }}>After Image</Title>
                                    <Input type="file" accept="image/*" style={{ marginBottom: 12 }} />
                                    <Button type="primary" style={{ background: '#1890ff', borderColor: '#1890ff', width: '100%', marginBottom: 8 }}>
                                      📷 Capture
                                    </Button>
                                    <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a', width: '100%' }}>
                                      ✅ Upload After
                                    </Button>
                                  </Card>
                                </Col>
                              </Row>

                              <Divider style={{ margin: '24px 0' }} />

                              {/* Supporting Documents */}
                              <Title level={5} style={{ marginBottom: 20 }}>Supporting Documents</Title>
                              <Card>
                                <Row gutter={[16, 16]}>
                                  <Col xs={24}>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      Document Name
                                    </Text>
                                    <Input placeholder="e.g., Lab Report, Medical Certificate" />
                                  </Col>
                                  <Col xs={24}>
                                    <Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginBottom: 6 }}>
                                      File Upload
                                    </Text>
                                    <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" />
                                    <Text style={{ fontSize: 11, color: '#ff7a45', marginTop: 8, display: 'block' }}>
                                      ⚠️ File should be below 500KB (PDF, DOC, JPG, PNG)
                                    </Text>
                                  </Col>
                                  <Col xs={24}>
                                    <Space>
                                      <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                                        📤 Upload Document
                                      </Button>
                                      <Button danger>❌ Cancel</Button>
                                    </Space>
                                  </Col>
                                </Row>
                              </Card>

                              <Divider style={{ margin: '24px 0' }} />

                              {/* Hair Classification Scales */}
                              <Title level={5} style={{ marginBottom: 20 }}>Hair Classification Scales</Title>
                              <Tabs
                                defaultActiveKey="male"
                                items={[
                                  {
                                    key: 'male',
                                    label: 'Norwood Classification - Male',
                                    children: (
                                      <div style={{ padding: '20px 0' }}>
                                        <Row gutter={[16, 16]}>
                                          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                            <Col xs={24} sm={12} lg={8} key={i}>
                                              <Card
                                                hoverable
                                                style={{
                                                  border: `2px solid ${colors.border}`,
                                                  cursor: 'pointer',
                                                  textAlign: 'center',
                                                }}
                                              >
                                                <div style={{
                                                  height: 180,
                                                  background: colors.gold.light,
                                                  borderRadius: 8,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  marginBottom: 12,
                                                }}>
                                                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.gold.primary }}>
                                                    {i}
                                                  </Text>
                                                </div>
                                                <Text>Stage {i}</Text>
                                              </Card>
                                            </Col>
                                          ))}
                                        </Row>
                                      </div>
                                    ),
                                  },
                                  {
                                    key: 'female',
                                    label: 'Ludwig Classification - Female',
                                    children: (
                                      <div style={{ padding: '20px 0' }}>
                                        <Row gutter={[16, 16]}>
                                          {[1, 2, 3].map((i) => (
                                            <Col xs={24} sm={12} lg={8} key={i}>
                                              <Card
                                                hoverable
                                                style={{
                                                  border: `2px solid ${colors.border}`,
                                                  cursor: 'pointer',
                                                  textAlign: 'center',
                                                }}
                                              >
                                                <div style={{
                                                  height: 180,
                                                  background: colors.gold.light,
                                                  borderRadius: 8,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  marginBottom: 12,
                                                }}>
                                                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.gold.primary }}>
                                                    {i}
                                                  </Text>
                                                </div>
                                                <Text>Stage {i}</Text>
                                              </Card>
                                            </Col>
                                          ))}
                                        </Row>
                                      </div>
                                    ),
                                  },
                                ]}
                              />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Card>
                </div>
              )}

              {expandedModuleView === 'followups' && (
                <div>
                  {followUpsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, color: colors.text.secondary }}>Loading follow-ups...</p>
                    </div>
                  ) : followUps && followUps.length > 0 ? (
                    <div>
                      <p style={{ marginBottom: 16, color: colors.text.secondary }}>
                        Total Follow-ups: <strong>{followUps.length}</strong>
                      </p>
                      {followUps.map((followUp: any) => (
                        <Card key={followUp.id} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <p style={{ fontWeight: 600, margin: 0 }}>{followUp.title || 'Follow-up'}</p>
                              <p style={{ fontSize: 12, color: colors.text.secondary, margin: '4px 0 0 0' }}>
                                {formatDate(followUp.followUpDate || followUp.createdAt)}
                              </p>
                              {followUp.description && (
                                <p style={{ fontSize: 12, color: colors.text.secondary, margin: '6px 0 0 0' }}>
                                  {followUp.description}
                                </p>
                              )}
                            </div>
                            <Tag color={followUp.status === 'completed' ? 'green' : followUp.status === 'pending' ? 'orange' : 'blue'}>
                              {followUp.status || 'pending'}
                            </Tag>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty description="No follow-ups" />
                  )}
                </div>
              )}

              {expandedModuleView === 'history' && (
                <div>
                  {historyLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, color: colors.text.secondary }}>Loading history...</p>
                    </div>
                  ) : history && history.length > 0 ? (
                    <div>
                      <p style={{ marginBottom: 16, color: colors.text.secondary }}>
                        Total History: <strong>{history.length}</strong>
                      </p>
                      {history.map((item: any) => (
                        <Card key={item.id} style={{ marginBottom: 12 }}>
                          <p style={{ fontWeight: 600, margin: 0 }}>{item.title || 'History Item'}</p>
                          <p style={{ fontSize: 12, color: colors.text.secondary, margin: '4px 0 0 0' }}>
                            {formatDate(item.createdAt)}
                          </p>
                          {item.description && (
                            <p style={{ fontSize: 12, color: colors.text.secondary, margin: '6px 0 0 0' }}>
                              {item.description}
                            </p>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty description="No history" />
                  )}
                </div>
              )}

              {expandedModuleView === 'feedback' && (
                <div>
                  {feedbackLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, color: colors.text.secondary }}>Loading feedback...</p>
                    </div>
                  ) : feedback && feedback.length > 0 ? (
                    <div>
                      <p style={{ marginBottom: 16, color: colors.text.secondary }}>
                        Total Feedback: <strong>{feedback.length}</strong>
                      </p>
                      {feedback.map((item: any) => (
                        <Card key={item.id} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 600, margin: 0, marginBottom: 4 }}>
                                {item.comment?.substring(0, 50) || 'Feedback'}
                              </p>
                              <p style={{ fontSize: 12, color: '#fadb14', margin: '0 0 4px 0' }}>
                                {'★'.repeat(item.rating || 0)}
                              </p>
                              <p style={{ fontSize: 12, color: colors.text.secondary, margin: 0 }}>
                                {formatDate(item.createdAt)}
                              </p>
                            </div>
                          </div>
                          {item.comment && (
                            <p style={{ fontSize: 12, color: colors.text.secondary, margin: '8px 0 0 0' }}>
                              {item.comment}
                            </p>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty description="No feedback" />
                  )}
                </div>
              )}

              {expandedModuleView === 'documents' && (
                <div>
                  {documentsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, color: colors.text.secondary }}>Loading documents...</p>
                    </div>
                  ) : documents && documents.length > 0 ? (
                    <div>
                      <p style={{ marginBottom: 16, color: colors.text.secondary }}>
                        Total Documents: <strong>{documents.length}</strong>
                      </p>
                      {documents.map((item: any) => (
                        <Card key={item.id} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <p style={{ fontWeight: 600, margin: 0 }}>{item.title || 'Document'}</p>
                              <p style={{ fontSize: 12, color: colors.text.secondary, margin: '4px 0 0 0' }}>
                                {item.docType || 'File'}
                              </p>
                              <p style={{ fontSize: 12, color: colors.text.secondary, margin: '4px 0 0 0' }}>
                                {formatDate(item.createdAt)}
                              </p>
                              {item.notes && (
                                <p style={{ fontSize: 12, color: colors.text.secondary, margin: '6px 0 0 0' }}>
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty description="No documents" />
                  )}
                </div>
              )}

              {expandedModuleView === 'package-offer' && (
                <div>
                  {/* Step Indicator */}
                  <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: step < packageOfferStep ? colors.gold.primary : step === packageOfferStep ? colors.gold.primary : '#f0f0f0',
                            color: step < packageOfferStep || step === packageOfferStep ? 'white' : colors.text.secondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                          onClick={() => step < packageOfferStep && setPackageOfferStep(step as any)}
                        >
                          {step < packageOfferStep ? '✓' : step}
                        </div>
                        <span style={{ fontSize: 12, color: step === packageOfferStep ? colors.gold.primary : colors.text.secondary, fontWeight: step === packageOfferStep ? 600 : 400 }}>
                          {step === 1 && 'Booking'}
                          {step === 2 && 'Package Details'}
                          {step === 3 && 'Receipt'}
                          {step === 4 && 'Print'}
                        </span>
                        {step < 4 && (
                          <div
                            style={{
                              flex: 1,
                              height: 2,
                              background: step < packageOfferStep ? colors.gold.primary : '#f0f0f0',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step 1: Booking Details */}
                  {packageOfferStep === 1 && (
                    <div style={{ padding: 24, background: '#fafafa', borderRadius: 8 }}>
                      <h3 style={{ marginTop: 0, color: colors.text.primary }}>Step 1: Booking Details</h3>

                      {/* Customer & Booking Info */}
                      <div style={{ background: 'white', padding: 16, borderRadius: 6, marginBottom: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Customer Name</label>
                            <input type="text" value={customer?.name || ''} disabled style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: 4, background: '#f5f5f5' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Phone</label>
                            <input type="text" value={customer?.phone || ''} disabled style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: 4, background: '#f5f5f5' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Booking ID</label>
                            <input type="text" value={bookingData.bookingId} disabled style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: 4, background: '#f5f5f5' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Booking Date</label>
                            <input type="date" value={bookingData.bookingDate} onChange={(e) => setBookingData({ ...bookingData, bookingDate: e.target.value })} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: 4 }} />
                          </div>
                        </div>
                      </div>

                      {/* Services Loading State */}
                      {packagesLoading && (
                        <div style={{ background: 'white', padding: 24, borderRadius: 6, marginBottom: 20, textAlign: 'center' }}>
                          <Spin size="large" />
                          <p style={{ marginTop: 12, color: colors.text.secondary }}>Loading services...</p>
                        </div>
                      )}

                      {/* No Services Message */}
                      {!packagesLoading && (!packages || packages?.length === 0) && (
                        <div style={{ background: 'white', padding: 24, borderRadius: 6, marginBottom: 20, textAlign: 'center', border: `2px dashed ${colors.border}` }}>
                          <p style={{ margin: 0, color: '#ff4d4f', fontSize: 14, fontWeight: 600 }}>⚠️ No Services Assigned</p>
                          <p style={{ margin: '8px 0 0 0', color: colors.text.secondary, fontSize: 12 }}>
                            Please contact Admin to assign services to your account.
                          </p>
                        </div>
                      )}

                      {/* Booking Grid */}
                      {!packagesLoading && packages && packages?.length > 0 && (
                        <div style={{ background: 'white', padding: 16, borderRadius: 6, marginBottom: 20, overflowX: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h4 style={{ margin: 0, color: colors.text.primary }}>Services ({packages?.length})</h4>
                            <Button type="dashed" onClick={handleAddRow}>+ Add Service</Button>
                          </div>

                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: colors.gold.light, borderBottom: `2px solid ${colors.border}` }}>
                                <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>S.No</th>
                                <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Service</th>
                                <th style={{ padding: 8, textAlign: 'center', fontWeight: 600 }}>Qty</th>
                                <th style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>Amount (₹)</th>
                                <th style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>Total (₹)</th>
                                <th style={{ padding: 8, textAlign: 'center', fontWeight: 600 }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bookingRows.length === 0 ? (
                                <tr>
                                  <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: colors.text.secondary }}>
                                    No services added. Click "Add Service" to begin.
                                  </td>
                                </tr>
                              ) : (
                                bookingRows.map((row, idx) => (
                                <tr key={row.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                  <td style={{ padding: 8 }}>{idx + 1}</td>
                                  <td style={{ padding: 8 }}>
                                    <select
                                      value={row.service}
                                      onChange={(e) => handleRowChange(row.id, 'service', e.target.value)}
                                      style={{ width: '100%', padding: '6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12 }}
                                    >
                                      <option value="">
                                        {branchServicesLoading
                                          ? 'Loading services…'
                                          : !branchServices || branchServices.length === 0
                                            ? 'No services assigned to this branch'
                                            : 'Select service...'}
                                      </option>
                                      {(branchServices ?? []).map((service) => (
                                        <option key={service.id} value={service.name}>
                                          {service.name}
                                          {service.minPrice
                                            ? ` (₹${(service.minPrice / 100).toLocaleString('en-IN')})`
                                            : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td style={{ padding: 8 }}>
                                    <input
                                      type="number"
                                      value={row.quantity}
                                      min="1"
                                      onChange={(e) => handleRowChange(row.id, 'quantity', parseInt(e.target.value) || 1)}
                                      style={{ width: '100%', padding: '6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'center' }}
                                    />
                                  </td>
                                  <td style={{ padding: 8, textAlign: 'right' }}>
                                    <input
                                      type="number"
                                      value={row.amount}
                                      onChange={(e) => handleRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                                      style={{ width: '100%', padding: '6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'right' }}
                                    />
                                  </td>
                                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                                    {(row.quantity * row.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </td>
                                  <td style={{ padding: 8, textAlign: 'center' }}>
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      onClick={() => handleRemoveRow(row.id)}
                                      style={{ color: '#ff4d4f' }}
                                    >
                                      ✕
                                    </Button>
                                  </td>
                                </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Summary Section */}
                      {!packagesLoading && packages && packages?.length > 0 && (
                        <div style={{ background: 'white', padding: 16, borderRadius: 6, marginBottom: 20 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Subtotal (₹)</label>
                            <div style={{ fontSize: 18, fontWeight: 600, color: colors.text.primary }}>
                              {subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Discount (%)</label>
                            <input
                              type="number"
                              value={bookingData.discount}
                              onChange={(e) => setBookingData({ ...bookingData, discount: parseFloat(e.target.value) || 0 })}
                              style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 14 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Discount Amount (₹)</label>
                            <div style={{ fontSize: 16, fontWeight: 600, color: '#ff4d4f' }}>
                              -{discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div style={{ background: colors.gold.light, padding: 12, borderRadius: 4 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 4 }}>Net Amount (₹)</label>
                            <div style={{ fontSize: 20, fontWeight: 700, color: colors.gold.primary }}>
                              {netTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        </div>
                      )}

                      {/* Remarks Section */}
                      <div style={{ background: 'white', padding: 16, borderRadius: 6, marginBottom: 20 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: 'block', marginBottom: 8 }}>Remarks</label>
                        <textarea
                          value={bookingData.remarks}
                          onChange={(e) => setBookingData({ ...bookingData, remarks: e.target.value })}
                          placeholder="Add any special notes or instructions for this booking..."
                          style={{
                            width: '100%',
                            minHeight: 100,
                            padding: '12px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: 4,
                            fontFamily: 'inherit',
                            fontSize: 12,
                          }}
                        />
                      </div>

                      {/* Navigation */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          type="primary"
                          onClick={() => setPackageOfferStep(2)}
                          disabled={bookingRows.length === 0}
                        >
                          Save & Go to Package Details →
                        </Button>
                        <Button onClick={() => setExpandedModuleView(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Booking Summary */}
                  {packageOfferStep === 2 && (
                    <div style={{ padding: 24, background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
                      <h3 style={{ marginTop: 0, color: colors.text.primary }}>Step 2: Booking Summary</h3>
                      <Card style={{ marginBottom: 16, background: 'white' }}>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Booking ID</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 600, color: colors.text.primary }}>{bookingData.bookingId}</p>
                        </div>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Customer</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 600, color: colors.text.primary }}>{customer?.name}</p>
                        </div>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Total Services</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: colors.text.primary }}>{bookingRows.length} service(s) selected</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Total Amount</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 18, fontWeight: 700, color: colors.gold.primary }}>₹ {netTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                        </div>
                      </Card>
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <Button onClick={() => setPackageOfferStep(1)}>
                          ← Back to Booking
                        </Button>
                        <Button type="primary" onClick={() => setPackageOfferStep(3)}>
                          Continue to Receipt →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Receipt */}
                  {packageOfferStep === 3 && (
                    <div style={{ padding: 24, background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
                      <h3 style={{ marginTop: 0, color: colors.text.primary }}>Step 3: Receipt</h3>
                      <Card style={{ marginBottom: 16, background: 'white' }}>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Customer</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 600, color: colors.text.primary }}>{customer?.name}</p>
                        </div>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Booking Date</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: colors.text.primary }}>{new Date(bookingData.bookingDate).toLocaleDateString()}</p>
                        </div>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Total Amount</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 600, color: colors.gold.primary }}>₹ {netTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                        </div>
                      </Card>
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <Button onClick={() => setPackageOfferStep(2)}>
                          ← Back to Details
                        </Button>
                        <Button
                          type="primary"
                          onClick={() => setPackageOfferStep(4)}
                        >
                          Continue to Print →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Print */}
                  {packageOfferStep === 4 && (
                    <div style={{ padding: 24, background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
                      <h3 style={{ marginTop: 0, color: colors.text.primary }}>Step 4: Print & Complete</h3>
                      <Card style={{ marginBottom: 16, background: 'white', border: `2px solid ${colors.gold.primary}` }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                          <p style={{ fontSize: 12, color: colors.text.secondary, margin: 0 }}>SERVICE BOOKING RECEIPT</p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary, margin: '8px 0 0 0' }}>Booking ID: {bookingData.bookingId}</p>
                        </div>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Customer Name</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 600, color: colors.text.primary }}>{customer?.name}</p>
                        </div>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Services Booked</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: colors.text.primary }}>{bookingRows.length} service(s)</p>
                        </div>
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                          <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Total Amount</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: 18, fontWeight: 700, color: colors.gold.primary }}>₹ {netTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                        </div>
                        {bookingData.remarks && (
                          <div style={{ marginBottom: 16 }}>
                            <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary }}>Remarks</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: colors.text.primary }}>{bookingData.remarks}</p>
                          </div>
                        )}
                        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${colors.border}`, color: colors.text.secondary, fontSize: 12 }}>
                          <p style={{ margin: 0 }}>Date: {new Date(bookingData.bookingDate).toLocaleDateString()}</p>
                        </div>
                      </Card>
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <Button onClick={() => setPackageOfferStep(3)}>
                          ← Back to Receipt
                        </Button>
                        <Button
                          type="primary"
                          onClick={handleSaveBooking}
                          style={{
                            background: colors.gold.primary,
                            borderColor: colors.gold.primary,
                          }}
                        >
                          ✓ Complete & Save Booking
                        </Button>
                        <Button
                          onClick={() => window.print()}
                          type="dashed"
                        >
                          🖨️ Print
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </Card>
            </div>
          )}
        </>
      )}


    </div>
  );
}
