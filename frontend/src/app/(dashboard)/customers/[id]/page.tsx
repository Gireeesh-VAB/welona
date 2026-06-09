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
  PlusOutlined,
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
  useBookingAction,
  usePackages,
  useOffers,
  usePrescriptions,
  useCreatePrescription,
  useUpdatePrescription,
  useDeletePrescription,
  useMedicalReports,
  useFeedback,
  useCreateFeedback,
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
  const [savedBookingId, setSavedBookingId] = useState<string | null>(null);
  const [savedNetAmountPaise, setSavedNetAmountPaise] = useState<number>(0);
  const [bookingRows, setBookingRows] = useState<any[]>([{ id: 1, category: '', service: '', quantity: 1, amount: 0, complementary: false }]);
  const [bookingData, setBookingData] = useState<any>({
    bookingDate: new Date().toISOString().split('T')[0],
    bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
    consultant: '',
    discount: 0,
    roundOff: 0,
    remarks: '',
  });
  const [showAddPrescription, setShowAddPrescription] = useState(false);
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, comment: '', relatedTo: '' });
  const [editingPrescription, setEditingPrescription] = useState<any>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    doctor: '',
    medications: '',
    diagnosis: '',
    notes: '',
  });
  const [medRows, setMedRows] = useState<{ id: number; name: string; dosage: string; timing: string[]; when: string; duration: string }[]>([
    { id: 1, name: '', dosage: '', timing: [], when: '', duration: '' },
  ]);
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
      setSavedBookingId(null);
      setSavedNetAmountPaise(0);
      setBookingRows([{ id: Date.now(), category: '', service: '', quantity: 1, amount: 0, complementary: false }]);
      setBookingData({
        bookingDate: new Date().toISOString().split('T')[0],
        bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        consultant: '',
        discount: 0,
        roundOff: 0,
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
  const bookingAction = useBookingAction(id);
  const [payModalBooking, setPayModalBooking] = useState<any>(null);
  const [payInput, setPayInput] = useState<string>('');
  const [creditNoteBooking, setCreditNoteBooking] = useState<any>(null);
  const [creditNoteText, setCreditNoteText] = useState('');
  const [bSearch, setBSearch] = useState('');
  const [bPage, setBPage] = useState(1);
  const { data: packages, isLoading: packagesLoading } = usePackages(id);
  const { data: offers, isLoading: offersLoading } = useOffers(id);
  const { data: prescriptions, isLoading: prescriptionsLoading } = usePrescriptions(id);
  const { data: medicalReports, isLoading: medicalReportsLoading } = useMedicalReports(id);
  const { data: followUps, isLoading: followUpsLoading } = useCustomerFollowUps(id);
  const { data: feedback, isLoading: feedbackLoading } = useFeedback(id);
  const { data: documents, isLoading: documentsLoading } = useDocuments(id);
  const { data: history, isLoading: historyLoading } = useCustomerHistory(id);
  const createPrescription = useCreatePrescription(id);
  const createFeedback = useCreateFeedback(id);
  const updatePrescription = useUpdatePrescription(id);
  const deletePrescription = useDeletePrescription(id);

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
    setBookingRows([...bookingRows, { id: Date.now(), category: '', service: '', quantity: 1, amount: 0, complementary: false }]);
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
        amount: Math.round((Number(r.complementary ? 0 : r.amount) || 0) * 100),
      }));

      // discount is a percentage in the UI → convert to an absolute paise amount.
      const subtotalPaise = items.reduce((s, it) => s + it.amount * it.quantity, 0);
      const discountPaise = Math.round((subtotalPaise * (Number(bookingData.discount) || 0)) / 100);
      const roundOffPaise = Math.round((Number(bookingData.roundOff) || 0) * 100);
      const netPaise = subtotalPaise - discountPaise + roundOffPaise;

      // Save via the staff bookings endpoint (creates a Booking + BookingItems).
      const result = await createBooking.mutateAsync({
        customerId: id,
        consultantStaffId: bookingData.consultant || undefined,
        scheduledAt: new Date(bookingData.bookingDate).toISOString(),
        status: 'completed',
        notes: bookingData.remarks || undefined,
        discount: discountPaise,
        roundOff: roundOffPaise,
        items,
      });

      // Store the created booking ID + netAmount so Step 4 can record the payment
      setSavedBookingId((result as any).id ?? null);
      setSavedNetAmountPaise(netPaise);

      message.success('Booking saved! Showing receipt…');
      // Go to receipt step — keep booking data in state for display
      setPackageOfferStep(2);
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

  const resetPrescriptionForm = () => {
    setShowAddPrescription(false);
    setEditingPrescription(null);
    setPrescriptionForm({ doctor: '', medications: '', diagnosis: '', notes: '' });
    setMedRows([{ id: 1, name: '', dosage: '', timing: [], when: '', duration: '' }]);
  };

  const handleSavePrescription = () => {
    if (!prescriptionForm.diagnosis.trim()) {
      message.error('Please select a Diagnosis');
      return;
    }
    const validRows = medRows.filter(r => r.name.trim());
    if (!validRows.length) {
      message.error('Add at least one medication');
      return;
    }
    const medicationsStr = validRows
      .map(r => [r.name.trim(), r.dosage.trim(), r.timing.join(', '), r.when, r.duration.trim()].filter(Boolean).join(' · '))
      .join('\n');
    const payload = {
      prescribedBy: prescriptionForm.doctor || undefined,
      medications: medicationsStr,
      diagnosis: prescriptionForm.diagnosis,
      notes: prescriptionForm.notes || undefined,
    };
    const onSuccess = () => { message.success(editingPrescription ? 'Prescription updated!' : 'Prescription saved!'); resetPrescriptionForm(); };
    const onError = (err: any) => { message.error('Failed: ' + (err?.message ?? 'Unknown error')); };

    if (editingPrescription) {
      updatePrescription.mutate({ id: editingPrescription.id, body: payload }, { onSuccess, onError });
    } else {
      createPrescription.mutate({ ...payload, issuedAt: new Date().toISOString() }, { onSuccess, onError });
    }
  };

  const handleRowChange = (id: number, field: string, value: any) => {
    setBookingRows(bookingRows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === 'category') {
          updated.service = '';
          updated.amount = 0;
        }
        if (field === 'service' && value) {
          const svc = (branchServices ?? []).find((s) => s.name === value);
          if (svc) {
            if (!row.complementary) updated.amount = svc.minPrice / 100;
            updated.category = svc.categoryName ?? '';
          }
        }
        if (field === 'complementary') {
          if (value) {
            updated.amount = 0;
          } else if (row.service) {
            const svc = (branchServices ?? []).find((s) => s.name === row.service);
            if (svc) updated.amount = svc.minPrice / 100;
          }
        }
        return updated;
      }
      return row;
    }));
  };

  const handleRefreshAmounts = () => {
    setBookingRows(bookingRows.map(row => {
      if (row.service) {
        const svc = (branchServices ?? []).find((s) => s.name === row.service);
        if (svc) return { ...row, amount: svc.minPrice / 100 };
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
                      onAdd={m.key === 'bookings' ? () => setExpandedModuleView('package-offer') : undefined}
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

                  {(() => {
                    const activeBookings = (bookings ?? []).filter((b: any) => b.status !== 'cancelled');
                    const totalPaid = activeBookings.reduce((s: number, b: any) => s + (b.paidAmount ?? 0), 0);
                    const totalPending = activeBookings.reduce((s: number, b: any) => s + Math.max(0, (b.netAmount ?? 0) - (b.paidAmount ?? 0)), 0);
                    const pendingBillsCount = activeBookings.filter((b: any) => (b.netAmount ?? 0) - (b.paidAmount ?? 0) > 0).length;
                    return (
                      <>
                        <Col xs={12} sm={8} md={6}>
                          <div style={{
                            padding: '16px 12px', background: 'white', borderRadius: 6,
                            textAlign: 'center', border: `1px solid ${colors.border}`,
                            transition: 'all 0.3s ease', cursor: 'default',
                          }}
                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.08)`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                          >
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>
                              {pendingBillsCount}
                            </div>
                            <div style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>Pending Bills</div>
                          </div>
                        </Col>

                        <Col xs={12} sm={8} md={6}>
                          <div style={{
                            padding: '16px 12px', background: 'white', borderRadius: 6,
                            textAlign: 'center', border: `1px solid ${colors.border}`,
                            transition: 'all 0.3s ease', cursor: 'default',
                          }}
                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.08)`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                          >
                            <div style={{ fontSize: 18, fontWeight: 700, color: colors.status.success }}>
                              {formatMoney(totalPaid)}
                            </div>
                            <div style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>Total Paid</div>
                          </div>
                        </Col>

                        <Col xs={24} sm={24} md={6}>
                          <div style={{
                            padding: '16px 12px', background: '#fff7e6', borderRadius: 6,
                            textAlign: 'center', border: `1px solid #ffd666`, transition: 'all 0.3s ease',
                          }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#ad6800' }}>
                              {formatMoney(totalPending)}
                            </div>
                            <div style={{ fontSize: 12, color: '#ad6800', marginTop: 4 }}>Pending Amount</div>
                          </div>
                        </Col>
                      </>
                    );
                  })()}
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
                <style>{`
                  @keyframes hSlideIn {
                    from { opacity: 0; transform: translateX(18px); }
                    to   { opacity: 1; transform: translateX(0); }
                  }
                  @keyframes hPulseRing {
                    0%   { box-shadow: 0 0 0 0 rgba(218,165,32,0.55); }
                    70%  { box-shadow: 0 0 0 7px rgba(218,165,32,0); }
                    100% { box-shadow: 0 0 0 0 rgba(218,165,32,0); }
                  }
                  @keyframes hLineGrow {
                    from { transform: scaleY(0); }
                    to   { transform: scaleY(1); }
                  }
                  .h-card { transition: background 0.18s, box-shadow 0.18s, transform 0.18s; }
                `}</style>
                {history && history.length > 0 ? (() => {
                  const typeMap: Record<string, { color: string; bg: string; icon: string; label: string }> = {
                    booking:      { color: '#1677ff', bg: '#e6f4ff', icon: '📅', label: 'Booking' },
                    invoice:      { color: '#389e0d', bg: '#f6ffed', icon: '🧾', label: 'Invoice' },
                    enquiry:      { color: '#d46b08', bg: '#fff7e6', icon: '📋', label: 'Enquiry' },
                    followup:     { color: '#531dab', bg: '#f9f0ff', icon: '📞', label: 'Follow-up' },
                    prescription: { color: '#3730a3', bg: '#eef2ff', icon: '💊', label: 'Prescription' },
                    report:       { color: '#08979c', bg: '#e6fffb', icon: '🔬', label: 'Medical Report' },
                    feedback:     { color: '#d48806', bg: '#fffbe6', icon: '⭐', label: 'Feedback' },
                    document:     { color: '#595959', bg: '#f5f5f5', icon: '📄', label: 'Document' },
                    package:      { color: '#d4380d', bg: '#fff2e8', icon: '📦', label: 'Package' },
                    offer:        { color: '#5b8c00', bg: '#f9ffe6', icon: '🎁', label: 'Offer' },
                    quotation:    { color: '#1d39c4', bg: '#f0f5ff', icon: '📝', label: 'Quotation' },
                    order:        { color: '#0050b3', bg: '#e6f7ff', icon: '🛒', label: 'Order' },
                    customer:     { color: '#ad6800', bg: '#fffbe6', icon: '👤', label: 'Profile' },
                  };

                  // Group by month
                  const groups: { label: string; key: string; items: any[] }[] = [];
                  const seenKeys: Record<string, number> = {};
                  (history as any[]).forEach(item => {
                    const d = new Date(item.at);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
                    if (seenKeys[key] === undefined) {
                      seenKeys[key] = groups.length;
                      groups.push({ label, key, items: [] });
                    }
                    groups[seenKeys[key]].items.push(item);
                  });

                  let runningIdx = 0;
                  return (
                    <div>
                      {groups.map((group) => (
                        <div key={group.key} style={{ marginBottom: 28 }}>
                          {/* Month separator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, color: colors.gold.primary,
                              textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap',
                            }}>
                              {group.label}
                            </span>
                            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${colors.gold.primary}60, transparent)` }} />
                            <span style={{
                              fontSize: 10, color: colors.text.secondary,
                              background: '#f5f5f5', padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                            }}>
                              {group.items.length} event{group.items.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Timeline */}
                          <div style={{ position: 'relative', paddingLeft: 48 }}>
                            {/* Animated vertical line */}
                            <div style={{
                              position: 'absolute', left: 18, top: 10, bottom: 10, width: 2,
                              background: `linear-gradient(to bottom, ${colors.gold.primary}80, ${colors.gold.light})`,
                              transformOrigin: 'top',
                              animation: 'hLineGrow 0.5s ease forwards',
                            }} />

                            {group.items.map((item: any) => {
                              const cfg = typeMap[item.type] ?? { color: '#8c8c8c', bg: '#f5f5f5', icon: '•', label: item.type };
                              const idx = runningIdx++;
                              const isOpen = selectedDetail?.id === item.id && detailType === 'history';
                              const d = new Date(item.at);
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    marginBottom: 10, position: 'relative',
                                    animation: 'hSlideIn 0.32s ease both',
                                    animationDelay: `${idx * 0.045}s`,
                                    opacity: 0,
                                  }}
                                >
                                  {/* Dot */}
                                  <div style={{
                                    position: 'absolute', left: -36, top: 12,
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: cfg.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11,
                                    boxShadow: `0 2px 8px ${cfg.color}50`,
                                    zIndex: 2,
                                    animation: idx === 0 ? 'hPulseRing 2s ease-in-out infinite' : 'none',
                                  }}>
                                    {cfg.icon}
                                  </div>

                                  {/* Card */}
                                  <div
                                    className="h-card"
                                    onClick={() => {
                                      setSelectedDetail(isOpen ? null : item);
                                      setDetailType(isOpen ? null : 'history');
                                    }}
                                    style={{
                                      background: isOpen ? cfg.bg : '#fff',
                                      border: `1px solid ${isOpen ? cfg.color + '60' : '#efefef'}`,
                                      borderLeft: `4px solid ${cfg.color}`,
                                      borderRadius: 8,
                                      padding: '10px 14px',
                                      cursor: 'pointer',
                                      boxShadow: isOpen ? `0 4px 16px ${cfg.color}18` : '0 1px 3px rgba(0,0,0,0.05)',
                                    }}
                                    onMouseEnter={e => {
                                      if (!isOpen) {
                                        (e.currentTarget as HTMLDivElement).style.background = cfg.bg;
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 14px ${cfg.color}22`;
                                        (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)';
                                      }
                                    }}
                                    onMouseLeave={e => {
                                      if (!isOpen) {
                                        (e.currentTarget as HTMLDivElement).style.background = '#fff';
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                        (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)';
                                      }
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Type badge */}
                                        <span style={{
                                          display: 'inline-block', fontSize: 9, fontWeight: 700,
                                          color: cfg.color, background: cfg.bg,
                                          border: `1px solid ${cfg.color}30`,
                                          padding: '1px 7px', borderRadius: 10,
                                          textTransform: 'uppercase', letterSpacing: '0.08em',
                                          marginBottom: 5,
                                        }}>
                                          {cfg.label}
                                        </span>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: item.detail ? 3 : 0, lineHeight: 1.3 }}>
                                          {item.title}
                                        </div>
                                        {item.detail && (
                                          <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{item.detail}</div>
                                        )}
                                        {/* Inline expanded detail */}
                                        {isOpen && (
                                          <div style={{
                                            marginTop: 10, paddingTop: 10,
                                            borderTop: `1px dashed ${cfg.color}40`,
                                            animation: 'hSlideIn 0.2s ease both',
                                          }}>
                                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
                                              <div>
                                                <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Date</div>
                                                <div style={{ fontWeight: 600, color: '#333' }}>{formatDate(item.at)}</div>
                                              </div>
                                              <div>
                                                <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Type</div>
                                                <div style={{ fontWeight: 600, color: cfg.color }}>{cfg.label}</div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      {/* Day + weekday */}
                                      <div style={{ textAlign: 'right', marginLeft: 14, flexShrink: 0, paddingTop: 2 }}>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                                          {d.getDate()}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                          {d.toLocaleString('en-IN', { weekday: 'short' })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })() : (
                  <Empty description="No history yet" style={{ marginTop: 60 }} />
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
                  e.currentTarget.style.boxShadow = `0 0 24px rgba(218, 165, 32, 0.6), 0 6px 20px rgba(0, 0, 0, 0.15)`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
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
              {expandedModuleView === 'bookings' && (() => {
                const PAGE_SIZE = 10;
                const list: any[] = bookings ?? [];
                const filtered = list.filter(b => {
                  const q = bSearch.toLowerCase();
                  return !q || (b.number ?? '').toLowerCase().includes(q)
                    || (b.serviceName ?? '').toLowerCase().includes(q)
                    || (b.consultantName ?? '').toLowerCase().includes(q);
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
                const paged = filtered.slice((bPage - 1) * PAGE_SIZE, bPage * PAGE_SIZE);

                const handleCancel = (b: any) => {
                  if (!window.confirm(`Cancel booking ${b.number ?? b.id}?`)) return;
                  bookingAction.mutate({ bookingId: b.id, action: 'cancel' });
                };

                return (
                  <div>
                    {/* Top bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 13, color: colors.text.secondary }}>
                        <Select
                          size="small"
                          defaultValue={PAGE_SIZE}
                          style={{ width: 70, marginRight: 6 }}
                          options={[10, 25, 50, 100].map(v => ({ value: v, label: String(v) }))}
                        />
                        records per page
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: colors.text.secondary }}>Search:</span>
                        <Input
                          size="small"
                          style={{ width: 200 }}
                          value={bSearch}
                          onChange={e => { setBSearch(e.target.value); setBPage(1); }}
                          allowClear
                        />
                      </div>
                    </div>

                    {bookingsLoading ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
                    ) : (
                      <>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: '#f5f5f5', borderBottom: `2px solid #e0e0e0` }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}></th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>Package No</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>Category</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>Consultant</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>Booking Date</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>Amount</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>Paid Amount</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>Balance Amount</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>Manage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paged.length === 0 && (
                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px 0', color: '#aaa' }}>No bookings found</td></tr>
                              )}
                              {paged.map((b: any, idx: number) => {
                                const categories = [...new Set((b.items ?? []).map((it: any) => it.category).filter(Boolean))];
                                const categoryLabel = categories.length ? categories.join(', ') : b.serviceName ?? '—';
                                const netAmt = b.netAmount ?? 0;
                                const paidAmt = b.paidAmount ?? 0;
                                const balAmt = Math.max(0, netAmt - paidAmt);
                                const isCancelled = b.status === 'cancelled';
                                const isFullyPaid = balAmt === 0 && netAmt > 0;
                                return (
                                  <tr key={b.id} style={{ borderBottom: `1px solid #f0f0f0`, background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '10px 12px', color: '#aaa' }}>⊕</td>
                                    <td style={{ padding: '10px 12px' }}>
                                      <span style={{ color: '#1677ff', fontWeight: 600, cursor: 'pointer' }}>
                                        #{b.number ?? b.id.slice(0, 8)}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px 12px', color: '#1677ff' }}>{categoryLabel}</td>
                                    <td style={{ padding: '10px 12px' }}>{b.consultantName ?? '—'}</td>
                                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                      {new Date(b.scheduledAt).toLocaleDateString('en-GB').replace(/\//g, '.')}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{Math.round(netAmt / 100).toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{Math.round(paidAmt / 100).toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{Math.round(balAmt / 100).toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                      {isCancelled ? (
                                        <Tag color="red">Cancelled</Tag>
                                      ) : isFullyPaid ? (
                                        <Tag color="green">Paid</Tag>
                                      ) : (
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                          <button
                                            onClick={() => { setPayModalBooking(b); setPayInput(String(Math.round(balAmt / 100))); }}
                                            style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                          >
                                            Pay Now
                                          </button>
                                          {paidAmt > 0 ? (
                                            <button
                                              onClick={() => setCreditNoteBooking(b)}
                                              disabled={bookingAction.isPending}
                                              style={{ background: '#00bcd4', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                            >
                                              CreditNote
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => handleCancel(b)}
                                              disabled={bookingAction.isPending}
                                              style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                            >
                                              Cancel Package
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 12, color: colors.text.secondary }}>
                          <span>Showing {filtered.length === 0 ? 0 : (bPage - 1) * PAGE_SIZE + 1} to {Math.min(bPage * PAGE_SIZE, filtered.length)} of {filtered.length} entries</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              disabled={bPage === 1}
                              onClick={() => setBPage(p => p - 1)}
                              style={{ padding: '4px 12px', border: `1px solid #ddd`, borderRadius: 4, background: bPage === 1 ? '#f5f5f5' : '#fff', cursor: bPage === 1 ? 'default' : 'pointer', fontSize: 12 }}
                            >Previous</button>
                            {Array.from({ length: totalPages }, (_, i) => (
                              <button
                                key={i + 1}
                                onClick={() => setBPage(i + 1)}
                                style={{ padding: '4px 10px', border: `1px solid ${bPage === i + 1 ? colors.gold.primary : '#ddd'}`, borderRadius: 4, background: bPage === i + 1 ? colors.gold.primary : '#fff', color: bPage === i + 1 ? '#fff' : '#333', cursor: 'pointer', fontSize: 12, fontWeight: bPage === i + 1 ? 700 : 400 }}
                              >{i + 1}</button>
                            ))}
                            <button
                              disabled={bPage === totalPages}
                              onClick={() => setBPage(p => p + 1)}
                              style={{ padding: '4px 12px', border: `1px solid #ddd`, borderRadius: 4, background: bPage === totalPages ? '#f5f5f5' : '#fff', cursor: bPage === totalPages ? 'default' : 'pointer', fontSize: 12 }}
                            >Next</button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Credit Note Modal */}
                    {creditNoteBooking && (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: 28, minWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#00bcd4' }}>Credit Note</div>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Booking: #{creditNoteBooking.number ?? creditNoteBooking.id.slice(0, 8)}</div>

                          {/* Booking summary */}
                          <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ color: '#888' }}>Customer</span>
                              <span style={{ fontWeight: 600 }}>{customer.name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ color: '#888' }}>Net Amount (₹)</span>
                              <span style={{ fontWeight: 600 }}>{Math.round((creditNoteBooking.netAmount ?? 0) / 100).toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#888' }}>Paid Amount (₹)</span>
                              <span style={{ fontWeight: 600, color: '#00897b' }}>{Math.round((creditNoteBooking.paidAmount ?? 0) / 100).toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* Existing credit note if any */}
                          {creditNoteBooking.notes && (
                            <div style={{ background: '#e0f7fa', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                              <div style={{ color: '#555', marginBottom: 4, fontWeight: 600 }}>Existing Note</div>
                              <div style={{ color: '#333' }}>{creditNoteBooking.notes}</div>
                            </div>
                          )}

                          {/* Note input */}
                          <div style={{ marginBottom: 18 }}>
                            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                              Credit Note Reason / Details
                            </label>
                            <Input.TextArea
                              rows={4}
                              placeholder="e.g. Customer cancelled service — credit ₹500 against next visit"
                              value={creditNoteText}
                              onChange={e => setCreditNoteText(e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={() => { setCreditNoteBooking(null); setCreditNoteText(''); }}>Cancel</Button>
                            <Button
                              type="primary"
                              loading={bookingAction.isPending}
                              disabled={!creditNoteText.trim()}
                              style={{ background: '#00bcd4', borderColor: '#00bcd4' }}
                              onClick={() => {
                                bookingAction.mutate(
                                  { bookingId: creditNoteBooking.id, action: 'note', notes: creditNoteText.trim() },
                                  {
                                    onSuccess: () => {
                                      message.success('Credit note saved');
                                      setCreditNoteBooking(null);
                                      setCreditNoteText('');
                                    },
                                  },
                                );
                              }}
                            >
                              Save Credit Note
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pay Now Modal */}
                    {payModalBooking && (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: 28, minWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Record Payment</div>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Booking: #{payModalBooking.number ?? payModalBooking.id.slice(0, 8)}</div>
                          <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 13 }}>
                            <div>
                              <div style={{ color: '#888', marginBottom: 2 }}>Net Amount (₹)</div>
                              <div style={{ fontWeight: 700 }}>{Math.round((payModalBooking.netAmount ?? 0) / 100).toLocaleString('en-IN')}</div>
                            </div>
                            <div>
                              <div style={{ color: '#888', marginBottom: 2 }}>Already Paid (₹)</div>
                              <div style={{ fontWeight: 700 }}>{Math.round((payModalBooking.paidAmount ?? 0) / 100).toLocaleString('en-IN')}</div>
                            </div>
                            <div>
                              <div style={{ color: '#888', marginBottom: 2 }}>Balance (₹)</div>
                              <div style={{ fontWeight: 700, color: '#d32f2f' }}>{Math.round(Math.max(0, (payModalBooking.netAmount ?? 0) - (payModalBooking.paidAmount ?? 0)) / 100).toLocaleString('en-IN')}</div>
                            </div>
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Amount to Pay Now (₹)</label>
                            <Input
                              type="number"
                              min={1}
                              value={payInput}
                              onChange={e => setPayInput(e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={() => setPayModalBooking(null)}>Cancel</Button>
                            <Button
                              type="primary"
                              loading={bookingAction.isPending}
                              style={{ background: '#d32f2f', borderColor: '#d32f2f' }}
                              onClick={() => {
                                const amt = Math.round(parseFloat(payInput) * 100);
                                if (!amt || amt <= 0) return;
                                bookingAction.mutate(
                                  { bookingId: payModalBooking.id, action: 'pay', amount: amt },
                                  { onSuccess: () => setPayModalBooking(null) }
                                );
                              }}
                            >
                              Confirm Payment
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                  <style>{`
                    @keyframes rxFadeUp {
                      from { opacity: 0; transform: translateY(14px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes rxFormSlide {
                      from { opacity: 0; transform: translateY(-10px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                    .rx-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; }
                    .rx-card { transition: transform 0.2s, box-shadow 0.2s; }
                  `}</style>

                  {/* Top bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Prescriptions</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {prescriptionsLoading ? 'Loading…' : `${prescriptions?.length ?? 0} prescription${(prescriptions?.length ?? 0) !== 1 ? 's' : ''} on record`}
                      </div>
                    </div>
                    <button
                      onClick={() => { if (showAddPrescription) resetPrescriptionForm(); else setShowAddPrescription(true); }}
                      style={{
                        background: showAddPrescription ? '#f5f5f5' : '#3730a3',
                        color: showAddPrescription ? '#555' : '#fff',
                        border: 'none', borderRadius: 8, padding: '9px 20px',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s',
                      }}
                    >
                      {showAddPrescription ? '✕ Cancel' : '+ New Prescription'}
                    </button>
                  </div>

                  {/* New Prescription Form */}
                  {showAddPrescription && (
                    <div style={{
                      background: '#eef2ff',
                      border: '1.5px solid #c7d2fe',
                      borderRadius: 12,
                      padding: 24,
                      marginBottom: 28,
                      animation: 'rxFormSlide 0.25s ease both',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#3730a3', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>💊</span> {editingPrescription ? 'Edit Prescription' : 'New Prescription'} — {customer.name}
                      </div>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.06em' }}>Prescribed By</div>
                          <Select
                            placeholder={branchStaffLoading ? 'Loading doctors…' : 'Select doctor'}
                            loading={branchStaffLoading}
                            options={doctorOptions}
                            notFoundContent={branchStaffLoading ? 'Loading…' : 'No staff found'}
                            value={prescriptionForm.doctor || undefined}
                            onChange={v => setPrescriptionForm({ ...prescriptionForm, doctor: v })}
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                          />
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.06em' }}>Diagnosis <span style={{ color: '#3730a3' }}>*</span></div>
                          <Select
                            placeholder="Select or type diagnosis"
                            options={diagnosisOptions}
                            value={prescriptionForm.diagnosis || undefined}
                            onChange={v => setPrescriptionForm({ ...prescriptionForm, diagnosis: v })}
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                          />
                        </Col>
                        <Col xs={24}>
                          {(() => {
                            const TIMING_OPTIONS = [
                              { label: 'Morning',     color: '#d46b08', bg: '#fff7e6', border: '#ffd591' },
                              { label: 'Afternoon',   color: '#d4b106', bg: '#fffbe6', border: '#ffe58f' },
                              { label: 'Evening',     color: '#531dab', bg: '#f9f0ff', border: '#d3adf7' },
                              { label: 'Night',       color: '#1d39c4', bg: '#f0f5ff', border: '#adc6ff' },
                            ];
                            const WHEN_OPTIONS = [
                              { label: 'Before Food', color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f' },
                              { label: 'After Food',  color: '#0050b3', bg: '#e6f7ff', border: '#91d5ff' },
                              { label: 'With Food',   color: '#08979c', bg: '#e6fffb', border: '#87e8de' },
                            ];
                            const toggleTiming = (rowId: number, t: string) => {
                              setMedRows(rows => rows.map(r => r.id !== rowId ? r : {
                                ...r,
                                timing: r.timing.includes(t) ? r.timing.filter(x => x !== t) : [...r.timing, t],
                              }));
                            };
                            const setWhen = (rowId: number, w: string) => {
                              setMedRows(rows => rows.map(r => r.id !== rowId ? r : { ...r, when: r.when === w ? '' : w }));
                            };
                            return (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.06em' }}>
                                  Medications <span style={{ color: '#3730a3' }}>*</span>
                                </div>
                                {medRows.map((row, ri) => (
                                  <div key={row.id} style={{ background: '#fff', border: '1px solid #c7d2fe', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                                    {/* Row header */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                      <Input
                                        placeholder="Medicine name"
                                        value={row.name}
                                        onChange={e => setMedRows(rows => rows.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                                        style={{ flex: 2, borderRadius: 6, fontSize: 13 }}
                                      />
                                      <Input
                                        placeholder="Dosage e.g. 500mg"
                                        value={row.dosage}
                                        onChange={e => setMedRows(rows => rows.map(r => r.id === row.id ? { ...r, dosage: e.target.value } : r))}
                                        style={{ flex: 1, borderRadius: 6, fontSize: 13 }}
                                      />
                                      <Input
                                        placeholder="Duration e.g. 5 days"
                                        value={row.duration}
                                        onChange={e => setMedRows(rows => rows.map(r => r.id === row.id ? { ...r, duration: e.target.value } : r))}
                                        style={{ flex: 1, borderRadius: 6, fontSize: 13 }}
                                      />
                                      {medRows.length > 1 && (
                                        <button
                                          onClick={() => setMedRows(rows => rows.filter(r => r.id !== row.id))}
                                          style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, color: '#cf1322', cursor: 'pointer', padding: '0 10px', fontSize: 14, fontWeight: 700 }}
                                        >✕</button>
                                      )}
                                    </div>
                                    {/* Timing selector */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <span style={{ fontSize: 11, color: '#aaa', marginRight: 2 }}>When:</span>
                                      {TIMING_OPTIONS.map(t => {
                                        const active = row.timing.includes(t.label);
                                        return (
                                          <button
                                            key={t.label}
                                            onClick={() => toggleTiming(row.id, t.label)}
                                            style={{
                                              padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                              border: `1.5px solid ${active ? t.color : t.border}`,
                                              background: active ? t.color : t.bg,
                                              color: active ? '#fff' : t.color,
                                              transition: 'all 0.15s',
                                            }}
                                          >{t.label}</button>
                                        );
                                      })}
                                      <span style={{ fontSize: 11, color: '#aaa', margin: '0 2px' }}>·</span>
                                      {WHEN_OPTIONS.map(w => {
                                        const active = row.when === w.label;
                                        return (
                                          <button
                                            key={w.label}
                                            onClick={() => setWhen(row.id, w.label)}
                                            style={{
                                              padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                              border: `1.5px solid ${active ? w.color : w.border}`,
                                              background: active ? w.color : w.bg,
                                              color: active ? '#fff' : w.color,
                                              transition: 'all 0.15s',
                                            }}
                                          >{w.label}</button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={() => setMedRows(rows => [...rows, { id: Date.now(), name: '', dosage: '', timing: [], when: '', duration: '' }])}
                                  style={{ background: '#eef2ff', border: '1.5px dashed #c7d2fe', borderRadius: 8, color: '#3730a3', cursor: 'pointer', padding: '7px 16px', fontSize: 12, fontWeight: 600, width: '100%' }}
                                >
                                  + Add Another Medication
                                </button>
                              </div>
                            );
                          })()}
                        </Col>
                        <Col xs={24}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.06em' }}>Notes / Allergies <span style={{ fontWeight: 400, fontSize: 10, textTransform: 'none' }}>(optional)</span></div>
                          <Input.TextArea
                            placeholder="e.g. Allergic to Penicillin. Take with food."
                            rows={2}
                            value={prescriptionForm.notes}
                            onChange={e => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
                            style={{ borderRadius: 8, fontSize: 13 }}
                          />
                        </Col>
                        <Col xs={24}>
                          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                              onClick={resetPrescriptionForm}
                              style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer', color: '#555' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSavePrescription}
                              disabled={createPrescription.isPending || updatePrescription.isPending}
                              style={{
                                background: (createPrescription.isPending || updatePrescription.isPending) ? '#c7d2fe' : '#3730a3',
                                color: '#fff', border: 'none', borderRadius: 8,
                                padding: '8px 22px', fontSize: 13, fontWeight: 600,
                                cursor: createPrescription.isPending ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}
                            >
                              {(createPrescription.isPending || updatePrescription.isPending) ? '⏳ Saving…' : editingPrescription ? '✓ Update Prescription' : '✓ Save Prescription'}
                            </button>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Prescription cards */}
                  {prescriptionsLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: 14, color: '#aaa', fontSize: 13 }}>Loading prescriptions…</div>
                    </div>
                  ) : prescriptions && prescriptions.length > 0 ? (
                    <div>
                      {(prescriptions as any[]).map((rx, idx) => {
                        const meds = (rx.medications ?? '').split('|').map((m: string) => m.trim()).filter(Boolean);
                        return (
                          <div
                            key={rx.id}
                            className="rx-card"
                            style={{
                              background: '#fff',
                              borderRadius: 12,
                              border: '1px solid #e0e7ff',
                              borderTop: '4px solid #3730a3',
                              marginBottom: 16,
                              overflow: 'hidden',
                              boxShadow: '0 2px 8px rgba(196,29,127,0.06)',
                              animation: 'rxFadeUp 0.3s ease both',
                              animationDelay: `${idx * 0.06}s`,
                              opacity: 0,
                            }}
                          >
                            {/* Card header */}
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '12px 18px',
                              background: 'linear-gradient(135deg, #eef2ff 0%, #fff 100%)',
                              borderBottom: '1px solid #e0e7ff',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: '50%',
                                  background: '#3730a3', color: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 16, fontWeight: 800, flexShrink: 0,
                                }}>
                                  Rx
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
                                    {rx.prescribedBy ? `Dr. ${rx.prescribedBy}` : 'Prescription'}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#aaa' }}>
                                    {formatDate(rx.issuedAt || rx.createdAt)}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {rx.diagnosis && (
                                  <span style={{
                                    background: '#eef2ff', color: '#3730a3',
                                    border: '1px solid #c7d2fe', borderRadius: 20,
                                    padding: '3px 12px', fontSize: 11, fontWeight: 600,
                                  }}>
                                    {rx.diagnosis}
                                  </span>
                                )}
                                {/* Edit */}
                                <button
                                  title="Edit"
                                  onClick={() => {
                                    const ALL_TAGS = ['Morning','Afternoon','Evening','Night','Before Food','After Food','With Food'];
                                    const lines = (rx.medications ?? '').split('\n').filter(Boolean);
                                    const rows = lines.map((line: string, li: number) => {
                                      const parts = line.split(' · ');
                                      const timing = parts.filter((p: string) => p.split(', ').every((x: string) => ALL_TAGS.includes(x))).flatMap((p: string) => p.split(', ').map((x: string) => x.trim())).filter((x: string) => ALL_TAGS.includes(x));
                                      const whenPart = parts.find((p: string) => ['Before Food','After Food','With Food'].includes(p)) ?? '';
                                      return { id: li + 1, name: parts[0] ?? '', dosage: parts[1] ?? '', timing, when: whenPart, duration: parts.find((p: string) => !ALL_TAGS.includes(p) && p !== parts[0] && p !== parts[1] && p !== whenPart) ?? '' };
                                    });
                                    setMedRows(rows.length ? rows : [{ id: 1, name: '', dosage: '', timing: [], when: '', duration: '' }]);
                                    setPrescriptionForm({ doctor: rx.prescribedBy ?? '', medications: rx.medications ?? '', diagnosis: rx.diagnosis ?? '', notes: rx.notes ?? '' });
                                    setEditingPrescription(rx);
                                    setShowAddPrescription(true);
                                    setTimeout(() => moduleViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                                  }}
                                  style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, color: '#3730a3', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
                                >
                                  ✏️ Edit
                                </button>
                                {/* Delete */}
                                <button
                                  title="Delete"
                                  disabled={deletePrescription.isPending}
                                  onClick={() => {
                                    if (!window.confirm('Delete this prescription?')) return;
                                    deletePrescription.mutate(rx.id);
                                  }}
                                  style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, color: '#cf1322', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>

                            {/* Medications */}
                            <div style={{ padding: '14px 18px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                                Medications
                              </div>
                              {(() => {
                                const TAG_COLORS: Record<string, { color: string; bg: string; border: string }> = {
                                  'Morning':     { color: '#d46b08', bg: '#fff7e6', border: '#ffd591' },
                                  'Afternoon':   { color: '#d4b106', bg: '#fffbe6', border: '#ffe58f' },
                                  'Evening':     { color: '#531dab', bg: '#f9f0ff', border: '#d3adf7' },
                                  'Night':       { color: '#1d39c4', bg: '#f0f5ff', border: '#adc6ff' },
                                  'Before Food': { color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f' },
                                  'After Food':  { color: '#0050b3', bg: '#e6f7ff', border: '#91d5ff' },
                                  'With Food':   { color: '#08979c', bg: '#e6fffb', border: '#87e8de' },
                                };
                                const ALL_TAGS = Object.keys(TAG_COLORS);
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {meds.length > 0 ? meds.map((med: string, mi: number) => {
                                      // Parse structured format: name · dosage · timing · when · duration
                                      const parts = med.split(' · ');
                                      const nameAndDosage = parts.slice(0, 2).filter(Boolean).join(' ');
                                      const tags = parts.filter(p => ALL_TAGS.includes(p) || p.split(', ').every(x => ALL_TAGS.includes(x)));
                                      const flatTags = tags.flatMap(t => t.split(', ').map(x => x.trim())).filter(x => ALL_TAGS.includes(x));
                                      const rest = parts.filter(p => p !== parts[0] && p !== parts[1] && !tags.includes(p));
                                      return (
                                        <div key={mi} style={{
                                          padding: '10px 14px', borderRadius: 8,
                                          background: mi % 2 === 0 ? '#fafafa' : '#fff',
                                          border: '1px solid #f0f0f0',
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: flatTags.length ? 8 : 0 }}>
                                            <span style={{
                                              width: 22, height: 22, borderRadius: '50%',
                                              background: '#eef2ff', color: '#3730a3',
                                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                              fontSize: 10, fontWeight: 700, flexShrink: 0,
                                            }}>{mi + 1}</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                                              {nameAndDosage || med}
                                            </span>
                                            {rest.map((r, ri) => (
                                              <span key={ri} style={{ fontSize: 11, color: '#999' }}>{r}</span>
                                            ))}
                                          </div>
                                          {flatTags.length > 0 && (
                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingLeft: 30 }}>
                                              {flatTags.map((tag: string) => {
                                                const tc = TAG_COLORS[tag];
                                                return (
                                                  <span key={tag} style={{
                                                    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                    background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                                                  }}>{tag}</span>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }) : (
                                      <span style={{ fontSize: 12, color: '#bbb' }}>No medications listed</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Notes */}
                            {rx.notes && (
                              <div style={{
                                margin: '0 18px 14px',
                                padding: '10px 14px',
                                background: '#fffbe6',
                                border: '1px solid #ffe58f',
                                borderLeft: '3px solid #faad14',
                                borderRadius: 8,
                                fontSize: 12, color: '#614700',
                              }}>
                                <span style={{ fontWeight: 600 }}>⚠️ Note: </span>{rx.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : !showAddPrescription ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>💊</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 6 }}>No prescriptions yet</div>
                      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>Add the first prescription for {customer.name}</div>
                      <button
                        onClick={() => setShowAddPrescription(true)}
                        style={{ background: '#3730a3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                      >
                        + New Prescription
                      </button>
                    </div>
                  ) : null}
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

              {expandedModuleView === 'followups' && (() => {
                const allFeedback: any[] = feedback ?? [];
                const allFollowUps: any[] = followUps ?? [];
                const avgRating = allFeedback.length
                  ? (allFeedback.reduce((s: number, f: any) => s + (f.rating ?? 0), 0) / allFeedback.length)
                  : 0;
                const statusCfg: Record<string, { color: string; bg: string; label: string }> = {
                  completed: { color: '#389e0d', bg: '#f6ffed', label: 'Completed' },
                  pending:   { color: '#d46b08', bg: '#fff7e6', label: 'Pending' },
                  cancelled: { color: '#cf1322', bg: '#fff1f0', label: 'Cancelled' },
                };

                return (
                  <div>
                    <style>{`
                      @keyframes fbFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                      @keyframes starPop  { 0%,100% { transform:scale(1); } 50% { transform:scale(1.35); } }
                      .fb-star-btn:hover { transform: scale(1.2); }
                      .fb-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.09) !important; }
                      .fb-card { transition: transform 0.18s, box-shadow 0.18s; }
                      .fu-card:hover { background: #fafafa !important; }
                      .fu-card { transition: background 0.15s; }
                    `}</style>

                    {/* ── Summary banner ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                      {[
                        { label: 'Avg Rating', value: avgRating ? avgRating.toFixed(1) : '—', sub: `out of 5`, accent: '#fa8c16', icon: '⭐' },
                        { label: 'Total Feedback', value: allFeedback.length, sub: 'ratings collected', accent: '#3730a3', icon: '💬' },
                        { label: 'Follow-ups', value: allFollowUps.length, sub: 'interactions logged', accent: '#0050b3', icon: '📞' },
                        { label: 'Pending', value: allFollowUps.filter((f: any) => f.status === 'pending').length, sub: 'follow-ups due', accent: '#d46b08', icon: '🕐' },
                      ].map((s, i) => (
                        <div key={i} style={{
                          background: '#fff', borderRadius: 12, padding: '16px 18px',
                          border: `1px solid #f0f0f0`, borderTop: `3px solid ${s.accent}`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          animation: `fbFadeUp 0.3s ease both`, animationDelay: `${i * 0.07}s`,
                        }}>
                          <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                          <div style={{ fontSize: 26, fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#333', marginTop: 4 }}>{s.label}</div>
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{s.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* ── Feedback section ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Client Feedback</div>
                      <button
                        onClick={() => setShowAddFeedback(v => !v)}
                        style={{
                          background: showAddFeedback ? '#f5f5f5' : '#fa8c16',
                          color: showAddFeedback ? '#555' : '#fff',
                          border: 'none', borderRadius: 8, padding: '7px 16px',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        {showAddFeedback ? '✕ Cancel' : '+ Add Feedback'}
                      </button>
                    </div>

                    {/* Add feedback form */}
                    {showAddFeedback && (
                      <div style={{
                        background: '#fffbe6', border: '1.5px solid #ffe58f', borderRadius: 12,
                        padding: 20, marginBottom: 20,
                        animation: 'fbFadeUp 0.22s ease both',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#874d00', marginBottom: 16 }}>
                          New Feedback — {customer.name}
                        </div>

                        {/* Star selector */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                            Rating <span style={{ color: '#fa8c16' }}>*</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                className="fb-star-btn"
                                onClick={() => setFeedbackForm(f => ({ ...f, rating: f.rating === n ? 0 : n }))}
                                style={{
                                  fontSize: 28, background: 'none', border: 'none', cursor: 'pointer',
                                  color: n <= feedbackForm.rating ? '#fa8c16' : '#e8e8e8',
                                  transition: 'color 0.15s, transform 0.15s', padding: 0, lineHeight: 1,
                                  animation: n <= feedbackForm.rating ? 'starPop 0.25s ease' : 'none',
                                }}
                              >★</button>
                            ))}
                            {feedbackForm.rating > 0 && (
                              <span style={{ fontSize: 12, color: '#fa8c16', fontWeight: 700, alignSelf: 'center', marginLeft: 4 }}>
                                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][feedbackForm.rating]}
                              </span>
                            )}
                          </div>
                        </div>

                        <Row gutter={[12, 12]}>
                          <Col xs={24} sm={12}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Related To (optional)</div>
                            <Input
                              placeholder="e.g. Hair Treatment, Consultation"
                              value={feedbackForm.relatedTo}
                              onChange={e => setFeedbackForm(f => ({ ...f, relatedTo: e.target.value }))}
                              style={{ borderRadius: 7 }}
                            />
                          </Col>
                          <Col xs={24} sm={12}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Comment (optional)</div>
                            <Input
                              placeholder="e.g. Very satisfied with the service"
                              value={feedbackForm.comment}
                              onChange={e => setFeedbackForm(f => ({ ...f, comment: e.target.value }))}
                              style={{ borderRadius: 7 }}
                            />
                          </Col>
                        </Row>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                          <button
                            onClick={() => { setShowAddFeedback(false); setFeedbackForm({ rating: 0, comment: '', relatedTo: '' }); }}
                            style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 7, padding: '7px 16px', fontSize: 12, cursor: 'pointer', color: '#555' }}
                          >Cancel</button>
                          <button
                            disabled={!feedbackForm.rating || createFeedback.isPending}
                            onClick={() => {
                              if (!feedbackForm.rating) { message.error('Please select a rating'); return; }
                              createFeedback.mutate(
                                { rating: feedbackForm.rating, comment: feedbackForm.comment || undefined, relatedTo: feedbackForm.relatedTo || undefined },
                                {
                                  onSuccess: () => { message.success('Feedback saved!'); setShowAddFeedback(false); setFeedbackForm({ rating: 0, comment: '', relatedTo: '' }); },
                                  onError: (e: any) => message.error('Failed: ' + (e?.message ?? 'Unknown error')),
                                },
                              );
                            }}
                            style={{
                              background: !feedbackForm.rating ? '#ffd591' : '#fa8c16',
                              color: '#fff', border: 'none', borderRadius: 7, padding: '7px 18px',
                              fontSize: 12, fontWeight: 700, cursor: !feedbackForm.rating ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {createFeedback.isPending ? '⏳ Saving…' : '✓ Submit Feedback'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Feedback cards */}
                    {feedbackLoading ? (
                      <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                    ) : allFeedback.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 32 }}>
                        {allFeedback.map((fb: any, i: number) => {
                          const stars = fb.rating ?? 0;
                          const starColor = stars >= 4 ? '#fa8c16' : stars === 3 ? '#d4b106' : '#ff4d4f';
                          return (
                            <div
                              key={fb.id}
                              className="fb-card"
                              style={{
                                background: '#fff', borderRadius: 12,
                                border: '1px solid #f0f0f0',
                                borderTop: `3px solid ${starColor}`,
                                padding: '16px 18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                animation: 'fbFadeUp 0.3s ease both',
                                animationDelay: `${i * 0.05}s`,
                              }}
                            >
                              {/* Stars */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  {[1,2,3,4,5].map(n => (
                                    <span key={n} style={{ fontSize: 18, color: n <= stars ? starColor : '#e8e8e8', lineHeight: 1 }}>★</span>
                                  ))}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: starColor }}>
                                  {['','Poor','Fair','Good','Very Good','Excellent'][stars]}
                                </span>
                              </div>

                              {fb.comment && (
                                <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6, marginBottom: 10, fontStyle: 'italic' }}>
                                  "{fb.comment}"
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                {fb.relatedTo ? (
                                  <span style={{
                                    fontSize: 10, fontWeight: 600, color: '#3730a3',
                                    background: '#eef2ff', border: '1px solid #c7d2fe',
                                    padding: '2px 8px', borderRadius: 10,
                                  }}>{fb.relatedTo}</span>
                                ) : <span />}
                                <span style={{ fontSize: 10, color: '#bbb' }}>{formatDate(fb.createdAt)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : !showAddFeedback && (
                      <div style={{ textAlign: 'center', padding: '28px 0 32px', color: '#aaa', fontSize: 13 }}>
                        No feedback yet — be the first to add one.
                      </div>
                    )}

                    {/* ── Follow-ups section ── */}
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 14, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
                      Follow-up Interactions
                    </div>

                    {followUpsLoading ? (
                      <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                    ) : allFollowUps.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {allFollowUps.map((fu: any, i: number) => {
                          const cfg = statusCfg[fu.status] ?? statusCfg['pending'];
                          return (
                            <div
                              key={fu.id}
                              className="fu-card"
                              style={{
                                background: '#fff', border: `1px solid #f0f0f0`,
                                borderLeft: `4px solid ${cfg.color}`,
                                borderRadius: 10, padding: '12px 16px',
                                display: 'flex', gap: 16, alignItems: 'flex-start',
                                animation: 'fbFadeUp 0.3s ease both',
                                animationDelay: `${i * 0.04}s`,
                              }}
                            >
                              {/* Date col */}
                              <div style={{ textAlign: 'center', minWidth: 42, flexShrink: 0 }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                                  {new Date(fu.contactedAt ?? fu.createdAt).getDate()}
                                </div>
                                <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase' }}>
                                  {new Date(fu.contactedAt ?? fu.createdAt).toLocaleString('en-IN', { month: 'short' })}
                                </div>
                              </div>

                              {/* Content */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                                    {fu.outcome ? fu.outcome.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Follow-up'}
                                  </div>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10,
                                    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`,
                                    whiteSpace: 'nowrap', flexShrink: 0,
                                  }}>{cfg.label}</span>
                                </div>
                                {(fu.note || fu.remarks) && (
                                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                                    {fu.note || fu.remarks}
                                  </div>
                                )}
                                {fu.dueAt && (
                                  <div style={{ fontSize: 11, color: '#3730a3', marginTop: 4, fontWeight: 600 }}>
                                    📅 Next follow-up: {formatDate(fu.dueAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: 13 }}>
                        No follow-up interactions logged yet.
                      </div>
                    )}
                  </div>
                );
              })()}

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

                  {/* Step 1: Fresh Booking */}
                  {packageOfferStep === 1 && (() => {
                    const uniqueCategories = Array.from(
                      new Set((branchServices ?? []).map((s) => s.categoryName).filter(Boolean))
                    ) as string[];
                    const totalAmount = bookingRows.reduce((sum, r) => sum + r.quantity * r.amount, 0);
                    const netAmount = totalAmount + (bookingData.roundOff || 0);
                    return (
                    <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6 }}>
                      {/* Header */}
                      <div style={{ padding: '10px 16px', borderBottom: `1px dashed ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary }}>&#x27A1; Fresh Booking</span>
                      </div>

                      {/* Consultant row */}
                      <div style={{ padding: '12px 16px', borderBottom: `1px dashed ${colors.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <label style={{ fontSize: 13, color: colors.text.primary, minWidth: 90 }}>Consultant:</label>
                        <select
                          value={bookingData.consultant}
                          onChange={(e) => setBookingData({ ...bookingData, consultant: e.target.value })}
                          style={{ padding: '5px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 13, minWidth: 200 }}
                        >
                          <option value="">Select Consultant</option>
                          {(branchStaff ?? []).map((emp: any) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Booking Details section */}
                      <div style={{ padding: '10px 16px 0' }}>
                        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 8px', color: colors.text.primary }}>Booking Details</p>
                      </div>

                      {/* Table */}
                      <div style={{ overflowX: 'auto', padding: '0 16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: `1px solid ${colors.border}` }}>
                          <thead>
                            <tr style={{ background: '#f5f5f5' }}>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', width: 52, color: '#e53935', fontWeight: 600 }}>&#x2193; S.No.</th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#e53935', fontWeight: 600 }}>&#x1F4CB; Service</th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#e53935', fontWeight: 600 }}>Quantity</th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#e53935', fontWeight: 600 }}>&#x20B9; Amount</th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#333', fontWeight: 600 }}>&#x2295; Total</th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>
                                🎁 Complimentary
                                <div style={{ fontSize: 10, fontWeight: 400, color: '#888', marginTop: 2 }}>Mark as Free</div>
                              </th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, textAlign: 'center', color: '#333', fontWeight: 600 }}>Remove</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookingRows.length === 0 ? (
                              <tr>
                                <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: colors.text.secondary, borderTop: `1px solid ${colors.border}` }}>
                                  No rows added. Click the button below to add a service.
                                </td>
                              </tr>
                            ) : bookingRows.map((row, idx) => {
                              return (
                                <tr key={row.id} style={{ borderTop: `1px solid ${colors.border}`, background: row.complementary ? '#f1f8e9' : undefined, transition: 'background 0.2s' }}>
                                  {/* S.No */}
                                  <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}` }}>
                                    <div style={{
                                      width: 26, height: 26, borderRadius: '50%',
                                      background: '#4caf50', color: '#fff',
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      fontWeight: 700, fontSize: 12,
                                    }}>{idx + 1}</div>
                                  </td>
                                  {/* Service — shows all services directly */}
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    <select
                                      value={row.service}
                                      onChange={(e) => handleRowChange(row.id, 'service', e.target.value)}
                                      style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12 }}
                                    >
                                      <option value="">Select Service</option>
                                      {(branchServices ?? []).map((svc) => (
                                        <option key={svc.id} value={svc.name}>{svc.name}</option>
                                      ))}
                                    </select>
                                  </td>
                                  {/* Quantity */}
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    <input
                                      type="number" min="1"
                                      value={row.quantity}
                                      onChange={(e) => handleRowChange(row.id, 'quantity', parseInt(e.target.value) || 1)}
                                      style={{ width: 60, padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'center', fontSize: 12 }}
                                    />
                                  </td>
                                  {/* Amount */}
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    <input
                                      type="number" min="0"
                                      value={row.complementary ? 0 : row.amount}
                                      disabled={row.complementary}
                                      onChange={(e) => handleRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                                      style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'right', fontSize: 12, background: row.complementary ? '#f5f5f5' : undefined, color: row.complementary ? '#aaa' : undefined }}
                                    />
                                  </td>
                                  {/* Total */}
                                  <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: row.complementary ? '#2e7d32' : '#e53935', borderRight: `1px solid ${colors.border}` }}>
                                    {row.complementary
                                      ? <span style={{ fontSize: 11, background: '#2e7d32', color: '#fff', padding: '3px 8px', borderRadius: 10, fontWeight: 700, letterSpacing: 0.5 }}>₹0 — FREE</span>
                                      : (row.quantity * row.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </td>
                                  {/* Complementary toggle */}
                                  <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}` }}>
                                    <button
                                      onClick={() => handleRowChange(row.id, 'complementary', !row.complementary)}
                                      title={row.complementary ? 'Click to remove complimentary' : 'Click to mark this service as complimentary (given free of charge)'}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: 12,
                                        border: row.complementary ? '1.5px solid #2e7d32' : '1.5px dashed #aaa',
                                        background: row.complementary ? '#e8f5e9' : '#fafafa',
                                        color: row.complementary ? '#2e7d32' : '#999',
                                        fontSize: 11,
                                        fontWeight: row.complementary ? 700 : 400,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        margin: '0 auto',
                                      }}
                                    >
                                      {row.complementary ? <>✓ &nbsp;Given Free</> : <>🎁 &nbsp;Give Free</>}
                                    </button>
                                  </td>
                                  {/* Remove */}
                                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                    <div
                                      onClick={() => handleRemoveRow(row.id)}
                                      style={{
                                        width: 22, height: 22, borderRadius: '50%',
                                        background: '#f44336', color: '#fff',
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                      }}
                                    >✕</div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Add row + legend */}
                      <div style={{ padding: '8px 16px', borderBottom: `1px dashed ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          onClick={handleAddRow}
                          style={{ fontSize: 12, color: '#1890ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          + Add Row
                        </button>
                        <span style={{ fontSize: 11, color: '#888' }}>
                          🎁 <strong>Give Free</strong> = service provided complimentary (no charge to customer)
                        </span>
                      </div>

                      {/* Footer: Refresh + Totals */}
                      <div style={{ padding: '12px 16px', borderBottom: `1px dashed ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {/* Refresh */}
                        <button
                          onClick={handleRefreshAmounts}
                          style={{
                            padding: '6px 18px', background: '#8bc34a', color: '#fff',
                            border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                          }}
                        >
                          Refresh
                        </button>

                        {/* Totals block */}
                        <div style={{ textAlign: 'right', fontSize: 13, lineHeight: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                            <span style={{ color: colors.text.secondary }}>Total Amount :</span>
                            <span style={{ minWidth: 60, textAlign: 'right' }}>{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                            <span style={{ color: colors.text.secondary }}>PP Token Discount:</span>
                            <span style={{ minWidth: 60, textAlign: 'right' }}>0</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, alignItems: 'center' }}>
                            <span style={{ color: colors.text.secondary }}>Round Off :</span>
                            <input
                              type="number"
                              value={bookingData.roundOff}
                              onChange={(e) => setBookingData({ ...bookingData, roundOff: parseFloat(e.target.value) || 0 })}
                              style={{ width: 80, padding: '2px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'right', fontSize: 12 }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, borderTop: `1px dashed ${colors.border}`, paddingTop: 4 }}>
                            <span style={{ color: colors.text.secondary }}>Net Amount :</span>
                            <span style={{ minWidth: 60, textAlign: 'right', fontWeight: 700 }}>{netAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Remarks */}
                      <div style={{ padding: '10px 16px', borderBottom: `1px dashed ${colors.border}`, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        <label style={{ fontSize: 13, color: colors.text.primary, minWidth: 70, paddingTop: 6 }}>Remarks</label>
                        <textarea
                          value={bookingData.remarks}
                          onChange={(e) => setBookingData({ ...bookingData, remarks: e.target.value })}
                          placeholder="Package Suggestions"
                          rows={3}
                          style={{
                            flex: 1, padding: '6px 10px',
                            border: `1px solid ${colors.border}`, borderRadius: 4,
                            fontFamily: 'inherit', fontSize: 12, resize: 'vertical',
                          }}
                        />
                      </div>

                      {/* Save and go to Receipt */}
                      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          type="default"
                          onClick={handleSaveBooking}
                          loading={createBooking.isPending}
                          disabled={bookingRows.filter(r => r.service).length === 0}
                          style={{ fontSize: 13 }}
                        >
                          Save and go to Receipt &gt;
                        </Button>
                      </div>
                    </div>
                    );
                  })()}

                  {/* ── Step 2: Package Details ── */}
                  {packageOfferStep === 2 && (() => {
                    const consultantObj = (branchStaff ?? []).find((e: any) => e.id === bookingData.consultant);
                    const filledRows = bookingRows.filter(r => r.service);
                    const totalAmt = filledRows.reduce((s, r) => s + r.quantity * (r.complementary ? 0 : r.amount), 0);
                    return (
                      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6 }}>
                        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 14, color: colors.text.primary }}>
                          📋 Package Details
                        </div>

                        {/* Customer + Consultant info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: `1px solid ${colors.border}` }}>
                          <div style={{ padding: '14px 18px', borderRight: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Customer</div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{customer?.name}</div>
                            {customer?.phone && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>📞 {customer.phone}</div>}
                            {customer?.email && <div style={{ fontSize: 12, color: '#555' }}>✉ {customer.email}</div>}
                          </div>
                          <div style={{ padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Consulted By</div>
                            {consultantObj
                              ? <><div style={{ fontWeight: 700, fontSize: 15 }}>{consultantObj.name}</div>
                                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{consultantObj.role || consultantObj.designation || 'Consultant'}</div></>
                              : <div style={{ color: '#aaa', fontSize: 13 }}>Not assigned</div>
                            }
                          </div>
                        </div>

                        {/* Booking meta */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: `1px solid ${colors.border}` }}>
                          <div style={{ padding: '10px 18px', borderRight: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Booking ID</div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{bookingData.bookingId}</div>
                          </div>
                          <div style={{ padding: '10px 18px', borderRight: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Booking Date</div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(bookingData.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          </div>
                          <div style={{ padding: '10px 18px' }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Services</div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{filledRows.length} selected</div>
                          </div>
                        </div>

                        {/* Services selected */}
                        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: colors.text.primary }}>Services Selected</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f5f5f5' }}>
                                <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: `1px solid #ddd`, color: '#555' }}>#</th>
                                <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: `1px solid #ddd`, color: '#555' }}>Category</th>
                                <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: `1px solid #ddd`, color: '#555' }}>Service</th>
                                <th style={{ padding: '7px 10px', textAlign: 'center', borderBottom: `1px solid #ddd`, color: '#555' }}>Qty</th>
                                <th style={{ padding: '7px 10px', textAlign: 'right', borderBottom: `1px solid #ddd`, color: '#555' }}>Rate</th>
                                <th style={{ padding: '7px 10px', textAlign: 'right', borderBottom: `1px solid #ddd`, color: '#555' }}>Amount</th>
                                <th style={{ padding: '7px 10px', textAlign: 'center', borderBottom: `1px solid #ddd`, color: '#555' }}>Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filledRows.map((row, idx) => (
                                <tr key={row.id} style={{ borderBottom: `1px solid #f0f0f0`, background: row.complementary ? '#f1f8e9' : undefined }}>
                                  <td style={{ padding: '7px 10px' }}>{idx + 1}</td>
                                  <td style={{ padding: '7px 10px', color: '#666' }}>{row.category || '—'}</td>
                                  <td style={{ padding: '7px 10px', fontWeight: 500 }}>{row.service}</td>
                                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>{row.quantity}</td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>{row.complementary ? '—' : `₹${row.amount.toLocaleString('en-IN')}`}</td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>
                                    {row.complementary ? '₹0' : `₹${(row.quantity * row.amount).toLocaleString('en-IN')}`}
                                  </td>
                                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                    {row.complementary
                                      ? <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>🎁 FREE</span>
                                      : <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>PAID</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Remarks */}
                        {bookingData.remarks && (
                          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${colors.border}`, fontSize: 12 }}>
                            <span style={{ color: '#888', marginRight: 8 }}>Remarks:</span>
                            <span>{bookingData.remarks}</span>
                          </div>
                        )}

                        {/* Total summary */}
                        <div style={{ padding: '12px 18px', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${colors.border}` }}>
                          <div style={{ fontSize: 13 }}>
                            <div style={{ display: 'flex', gap: 32, justifyContent: 'space-between' }}>
                              <span style={{ color: '#666' }}>Total Amount</span>
                              <span style={{ fontWeight: 700 }}>₹{totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Navigation */}
                        <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <Button onClick={() => setPackageOfferStep(1)}>← Back to Booking</Button>
                          <Button onClick={() => setPackageOfferStep(3)} type="primary" style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}>
                            Continue to Payment Receipt →
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Step 3: Payment Receipt ── */}
                  {packageOfferStep === 3 && (() => {
                    const consultantObj = (branchStaff ?? []).find((e: any) => e.id === bookingData.consultant);
                    const filledRows = bookingRows.filter(r => r.service);
                    const totalAmt = filledRows.reduce((s, r) => s + r.quantity * (r.complementary ? 0 : r.amount), 0);
                    const netAmt = totalAmt + (bookingData.roundOff || 0);
                    return (
                      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6 }}>
                        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 14, color: colors.text.primary }}>
                          🧾 Payment Receipt
                        </div>

                        {/* Booking ID + date */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: `1px solid ${colors.border}` }}>
                          <div style={{ padding: '10px 18px', borderRight: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Booking ID</div>
                            <div style={{ fontWeight: 700 }}>{bookingData.bookingId}</div>
                          </div>
                          <div style={{ padding: '10px 18px' }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Booking Date</div>
                            <div style={{ fontWeight: 700 }}>{new Date(bookingData.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          </div>
                        </div>

                        {/* Customer + Consultant */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: `1px solid ${colors.border}` }}>
                          <div style={{ padding: '12px 18px', borderRight: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Customer</div>
                            <div style={{ fontWeight: 700 }}>{customer?.name}</div>
                            {customer?.phone && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{customer.phone}</div>}
                          </div>
                          <div style={{ padding: '12px 18px' }}>
                            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Consultant</div>
                            <div style={{ fontWeight: 700 }}>{consultantObj?.name || '—'}</div>
                          </div>
                        </div>

                        {/* Services */}
                        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f5f5f5' }}>
                                <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: `1px solid #ddd` }}>#</th>
                                <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: `1px solid #ddd` }}>Service</th>
                                <th style={{ padding: '7px 10px', textAlign: 'center', borderBottom: `1px solid #ddd` }}>Qty</th>
                                <th style={{ padding: '7px 10px', textAlign: 'right', borderBottom: `1px solid #ddd` }}>Rate</th>
                                <th style={{ padding: '7px 10px', textAlign: 'right', borderBottom: `1px solid #ddd` }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filledRows.map((row, idx) => (
                                <tr key={row.id} style={{ borderBottom: `1px solid #f0f0f0`, background: row.complementary ? '#f1f8e9' : undefined }}>
                                  <td style={{ padding: '7px 10px' }}>{idx + 1}</td>
                                  <td style={{ padding: '7px 10px', fontWeight: 500 }}>
                                    {row.service}
                                    {row.category && <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>({row.category})</span>}
                                  </td>
                                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>{row.quantity}</td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>{row.complementary ? <span style={{ color: '#2e7d32', fontSize: 11, fontWeight: 700 }}>FREE</span> : `₹${row.amount.toLocaleString('en-IN')}`}</td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>
                                    {row.complementary
                                      ? <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 6px', borderRadius: 8, fontSize: 10 }}>₹0 COMP</span>
                                      : `₹${(row.quantity * row.amount).toLocaleString('en-IN')}`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Payment breakdown */}
                        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                          <div style={{ minWidth: 280, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed #e0e0e0` }}>
                              <span style={{ color: '#666' }}>Total Amount</span>
                              <span style={{ fontWeight: 600 }}>₹{totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed #e0e0e0` }}>
                              <span style={{ color: '#666' }}>PP Token Discount</span>
                              <span>₹0</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed #e0e0e0` }}>
                              <span style={{ color: '#666' }}>Round Off</span>
                              <span>{(bookingData.roundOff || 0) >= 0 ? '+' : ''}{(bookingData.roundOff || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `2px solid #333`, marginTop: 4 }}>
                              <span style={{ fontWeight: 800, fontSize: 14 }}>Net Amount</span>
                              <span style={{ fontWeight: 800, fontSize: 15, color: colors.gold.primary }}>₹{netAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>

                        {bookingData.remarks && (
                          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${colors.border}`, fontSize: 12 }}>
                            <span style={{ color: '#888', marginRight: 6 }}>Remarks:</span>{bookingData.remarks}
                          </div>
                        )}

                        <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <Button onClick={() => setPackageOfferStep(2)}>← Back</Button>
                          <Button type="primary" onClick={() => setPackageOfferStep(4)} style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}>
                            Continue to Print →
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Step 4: Print ── */}
                  {packageOfferStep === 4 && (() => {
                    const consultantObj = (branchStaff ?? []).find((e: any) => e.id === bookingData.consultant);
                    const filledRows = bookingRows.filter(r => r.service);
                    const totalAmt = filledRows.reduce((s, r) => s + r.quantity * (r.complementary ? 0 : r.amount), 0);
                    const netAmt = totalAmt + (bookingData.roundOff || 0);
                    return (
                      <div>
                        {/* Action bar — hidden on print */}
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <Button onClick={() => setPackageOfferStep(3)}>← Back to Receipt</Button>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button type="primary" onClick={() => window.print()} style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}>
                              🖨️ Print
                            </Button>
                            <Button
                              type="primary"
                              loading={bookingAction.isPending}
                              style={{ background: '#2e7d32', borderColor: '#2e7d32' }}
                              onClick={async () => {
                                if (savedBookingId && savedNetAmountPaise > 0) {
                                  await bookingAction.mutateAsync({
                                    bookingId: savedBookingId,
                                    action: 'pay',
                                    amount: savedNetAmountPaise,
                                  });
                                }
                                setExpandedModuleView(null);
                              }}
                            >
                              ✓ Done & Save Payment
                            </Button>
                          </div>
                        </div>

                        {/* Printable receipt */}
                        <div id="print-receipt" style={{
                          background: '#fff',
                          border: `2px solid #222`,
                          borderRadius: 6,
                          padding: '32px 36px',
                          maxWidth: 680,
                          margin: '0 auto',
                          fontFamily: 'inherit',
                        }}>
                          {/* Header */}
                          <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: `2px solid #222`, marginBottom: 20 }}>
                            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, color: '#111' }}>WELONA</div>
                            <div style={{ fontSize: 11, color: '#777', letterSpacing: 2, marginTop: 2 }}>HEALTH &amp; WELLNESS</div>
                            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, letterSpacing: 3, color: '#333' }}>SERVICE BOOKING RECEIPT</div>
                          </div>

                          {/* Booking ID + Date */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16 }}>
                            <div><span style={{ color: '#888' }}>Booking ID: </span><strong>{bookingData.bookingId}</strong></div>
                            <div><span style={{ color: '#888' }}>Date: </span><strong>{new Date(bookingData.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                          </div>

                          {/* Customer + Consultant */}
                          <div style={{ display: 'flex', gap: 32, marginBottom: 20, padding: '12px 14px', background: '#f9f9f9', borderRadius: 4, fontSize: 12 }}>
                            <div>
                              <div style={{ color: '#888', marginBottom: 3, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Customer</div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{customer?.name}</div>
                              {customer?.phone && <div style={{ color: '#555' }}>📞 {customer.phone}</div>}
                            </div>
                            {consultantObj && (
                              <div>
                                <div style={{ color: '#888', marginBottom: 3, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Consulted By</div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{consultantObj.name}</div>
                                <div style={{ color: '#555' }}>{consultantObj.role || consultantObj.designation || 'Consultant'}</div>
                              </div>
                            )}
                          </div>

                          {/* Services table */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                            <thead>
                              <tr style={{ background: '#222', color: '#fff' }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>#</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Category</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Service</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate (₹)</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filledRows.map((row, idx) => (
                                <tr key={row.id} style={{ borderBottom: `1px solid #eee`, background: row.complementary ? '#f1f8e9' : idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                  <td style={{ padding: '8px 10px' }}>{idx + 1}</td>
                                  <td style={{ padding: '8px 10px', color: '#555' }}>{row.category || '—'}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{row.service}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{row.quantity}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.complementary ? '—' : `₹${row.amount.toLocaleString('en-IN')}`}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                                    {row.complementary
                                      ? <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>₹0 — COMP</span>
                                      : `₹${(row.quantity * row.amount).toLocaleString('en-IN')}`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Payment totals */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <div style={{ minWidth: 280, fontSize: 13 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed #ddd` }}>
                                <span style={{ color: '#666' }}>Total Amount</span>
                                <span style={{ fontWeight: 600 }}>₹{totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed #ddd` }}>
                                <span style={{ color: '#666' }}>PP Token Discount</span>
                                <span>₹0</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed #ddd` }}>
                                <span style={{ color: '#666' }}>Round Off</span>
                                <span>{(bookingData.roundOff || 0) >= 0 ? '+' : ''}{(bookingData.roundOff || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `2px solid #111`, marginTop: 4 }}>
                                <span style={{ fontWeight: 800, fontSize: 14 }}>Net Amount</span>
                                <span style={{ fontWeight: 800, fontSize: 16 }}>₹{netAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {bookingData.remarks && (
                            <div style={{ padding: '8px 12px', background: '#f9f9f9', borderRadius: 4, marginBottom: 14, fontSize: 12 }}>
                              <span style={{ color: '#888', marginRight: 8 }}>Remarks:</span>{bookingData.remarks}
                            </div>
                          )}

                          {filledRows.some(r => r.complementary) && (
                            <div style={{ padding: '6px 12px', background: '#e8f5e9', borderRadius: 4, marginBottom: 14, fontSize: 11, color: '#2e7d32' }}>
                              🎁 Services marked <strong>COMP</strong> are complimentary — provided free of charge.
                            </div>
                          )}

                          {/* Footer */}
                          <div style={{ textAlign: 'center', paddingTop: 14, borderTop: `1px solid #ddd`, fontSize: 11, color: '#aaa' }}>
                            Thank you for choosing Welona Health &amp; Wellness
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
