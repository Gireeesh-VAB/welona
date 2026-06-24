'use client';

import { useParams, useRouter } from 'next/navigation';
import {

  App,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlusOutlined,
  StarOutlined,
  TagOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useCustomers, useCustomer, useCustomerSales, useCustomerFollowUps, useCreateCustomer, useUpdateCustomer, useBranchPaymentModes } from '@/hooks/useSales';
import { useStates } from '@/hooks/useStates';
import { useBranchServices, useBranchEmployees, useBranchComplimentaryConfig, useLookupCoupon, useBranchCurrentInfo, type BranchInventoryItem } from '@/hooks/useBranchPortal';
import { useRaiseIndent } from '@/hooks/useIndents';
import { usePackageSessionMasters } from '@/hooks/usePackageSessionMasters';
import { useSessionProducts as usePkgSessionProducts, type SessionProduct, type ConsumableUnitInfo, type ServiceProductGroup } from '@/hooks/useSessions';
import type { CouponLookupResult } from '@/hooks/useBranchPortal';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { ApiClientError } from '@/lib/api-client';
import {
  useBookings,
  useBookingAction,
  useBookingSessions,
  useAddBookingSession,
  useUpdateBookingSession,
  useStartBookingSession,
  useCompleteBookingSession,
  useSessionEmployees,
  useSessionProducts,
  usePackages,
  useAddPackageSession,
  useServiceDefaultProducts,
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
import { useAuthStore } from '@/store/authStore';
import StatusTag from '@/components/sales/StatusTag';
import ServiceAllocationTable from '@/components/sales/ServiceAllocationTable';
import ModuleCard from '@/components/customers/ModuleCard';
import AvatarUpload from '@/components/customers/AvatarUpload';
import PackagesTab from '@/components/customers/PackagesTab';
import CountryStateFields from '@/components/customers/CountryStateFields';
import { PHONE_CODE_OPTIONS, COUNTRY_PHONE_CODE_MAP, buildPhone } from '@/components/customers/countryData';
import { formatDate, formatMoney, titleCase } from '@shared/format';
import { PAYMENT_METHODS } from '@shared/enums';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

// ─── History Timeline ────────────────────────────────────────────────────────

const HISTORY_TYPE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: JSX.Element }> = {
  booking: {
    color: '#1677ff', bg: '#e6f4ff', label: 'Booking',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  invoice: {
    color: '#389e0d', bg: '#f6ffed', label: 'Invoice',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  enquiry: {
    color: '#d46b08', bg: '#fff7e6', label: 'Enquiry',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  followup: {
    color: '#531dab', bg: '#f9f0ff', label: 'Follow-up',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
  },
  prescription: {
    color: '#3730a3', bg: '#eef2ff', label: 'Prescription',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
      </svg>
    ),
  },
  report: {
    color: '#08979c', bg: '#e6fffb', label: 'Medical Report',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  feedback: {
    color: '#d48806', bg: '#fffbe6', label: 'Feedback',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  document: {
    color: '#595959', bg: '#f5f5f5', label: 'Document',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  package: {
    color: '#d4380d', bg: '#fff2e8', label: 'Package',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  offer: {
    color: '#5b8c00', bg: '#f9ffe6', label: 'Offer',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  order: {
    color: '#0050b3', bg: '#e6f7ff', label: 'Order',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
    ),
  },
  customer: {
    color: '#ad6800', bg: '#fffbe6', label: 'Profile',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  quotation: {
    color: '#006d75', bg: '#e6fffb', label: 'Quotation',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="12" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
};

function getHistoryDateLabel(isoStr: string): string {
  const d = new Date(isoStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function getHistoryDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getHistoryTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

interface HistoryTimelineProps {
  history: any[];
  selectedDetail: any;
  detailType: string | null;
  setSelectedDetail: (v: any) => void;
  setDetailType: (v: any) => void;
  formatDate: (s: string) => string;
}

function HistoryTimeline({ history, selectedDetail, detailType, setSelectedDetail, setDetailType, formatDate }: HistoryTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  if (!history || history.length === 0) {
    return <Empty description="No activity recorded yet" style={{ marginTop: 60 }} />;
  }

  const uniqueTypes = Array.from(new Set((history as any[]).map((h: any) => h.type))).filter(Boolean);
  const filtered = activeFilter === 'all' ? history : (history as any[]).filter((h: any) => h.type === activeFilter);

  // Group by calendar day
  const groups: { label: string; key: string; items: any[] }[] = [];
  const seenKeys: Record<string, number> = {};
  filtered.forEach((item: any) => {
    const key = getHistoryDateKey(item.at);
    const label = getHistoryDateLabel(item.at);
    if (seenKeys[key] === undefined) {
      seenKeys[key] = groups.length;
      groups.push({ label, key, items: [] });
    }
    groups[seenKeys[key]].items.push(item);
  });

  const accentColor = '#c8a84b';

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: '#8c8c8c' }}>
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}{activeFilter !== 'all' ? ` · filtered` : ''}
        </span>
      </div>

      {/* Type filter chips */}
      {uniqueTypes.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {(['all', ...uniqueTypes] as string[]).map((t) => {
            const cfg = HISTORY_TYPE_CONFIG[t] ?? null;
            const isActive = activeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setActiveFilter(t)}
                style={{
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  padding: '3px 10px', borderRadius: 20,
                  border: isActive
                    ? `1.5px solid ${t === 'all' ? accentColor : (cfg?.color ?? '#8c8c8c')}`
                    : '1.5px solid #e8e8e8',
                  background: isActive
                    ? (t === 'all' ? '#fdf5e0' : (cfg?.bg ?? '#f5f5f5'))
                    : '#fff',
                  color: isActive
                    ? (t === 'all' ? accentColor : (cfg?.color ?? '#595959'))
                    : '#8c8c8c',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'all' ? 'All' : (cfg?.label ?? t)}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty description="No events of this type" style={{ marginTop: 40 }} />
      ) : (
        <div>
          {groups.map((group) => (
            <div key={group.key} style={{ marginBottom: 28 }}>
              {/* Day header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#595959',
                  letterSpacing: '0.03em', whiteSpace: 'nowrap',
                }}>
                  {group.label}
                </span>
                <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
                <span style={{
                  fontSize: 10, color: '#bbb', background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  padding: '1px 7px', borderRadius: 10, flexShrink: 0,
                }}>
                  {group.items.length}
                </span>
              </div>

              {/* Timeline rows */}
              <div style={{ position: 'relative', paddingLeft: 40 }}>
                {/* Vertical line */}
                {group.items.length > 1 && (
                  <div style={{
                    position: 'absolute', left: 14, top: 14, bottom: 14, width: 1,
                    background: 'linear-gradient(to bottom, #e8e8e8 0%, transparent 100%)',
                  }} />
                )}

                {group.items.map((item: any) => {
                  const cfg: { color: string; bg: string; label: string; icon: JSX.Element } = HISTORY_TYPE_CONFIG[item.type] ?? {
                    color: '#8c8c8c', bg: '#f5f5f5', label: item.type,
                    icon: <span style={{ fontSize: 10 }}>•</span>,
                  };
                  const isOpen = selectedDetail?.id === item.id && detailType === 'history';

                  return (
                    <div
                      key={item.id}
                      style={{ position: 'relative', marginBottom: 8 }}
                    >
                      {/* Icon dot on timeline */}
                      <div style={{
                        position: 'absolute', left: -40, top: 10,
                        width: 28, height: 28, borderRadius: '50%',
                        background: cfg.bg,
                        border: `1.5px solid ${cfg.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: cfg.color,
                        zIndex: 2,
                        boxShadow: isOpen ? `0 0 0 3px ${cfg.color}15` : 'none',
                        transition: 'box-shadow 0.15s',
                      }}>
                        {cfg.icon}
                      </div>

                      {/* Event card */}
                      <div
                        onClick={() => {
                          setSelectedDetail(isOpen ? null : item);
                          setDetailType(isOpen ? null : 'history');
                        }}
                        style={{
                          background: isOpen ? cfg.bg : '#fafafa',
                          border: `1px solid ${isOpen ? cfg.color + '40' : '#efefef'}`,
                          borderLeft: `3px solid ${isOpen ? cfg.color : '#e8e8e8'}`,
                          borderRadius: 6,
                          padding: '9px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.background = cfg.bg;
                          el.style.borderLeftColor = cfg.color;
                          el.style.borderColor = `${cfg.color}30`;
                        }}
                        onMouseLeave={e => {
                          if (!isOpen) {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.background = '#fafafa';
                            el.style.borderLeftColor = '#e8e8e8';
                            el.style.borderColor = '#efefef';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Type badge */}
                            <div style={{ marginBottom: 4 }}>
                              <span style={{
                                display: 'inline-block', fontSize: 9, fontWeight: 700,
                                color: cfg.color, background: '#fff',
                                border: `1px solid ${cfg.color}30`,
                                padding: '1px 7px', borderRadius: 10,
                                textTransform: 'uppercase', letterSpacing: '0.07em',
                              }}>
                                {cfg.label}
                              </span>
                            </div>
                            {/* Title */}
                            <div style={{
                              fontSize: 13, fontWeight: 600, color: '#1a1a1a',
                              lineHeight: 1.35, marginBottom: item.detail ? 3 : 0,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.title}
                            </div>
                            {/* Detail */}
                            {item.detail && !isOpen && (
                              <div style={{
                                fontSize: 12, color: '#8c8c8c', marginTop: 2,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {item.detail}
                              </div>
                            )}
                            {/* Expanded detail */}
                            {isOpen && (
                              <div style={{
                                marginTop: 10, paddingTop: 10,
                                borderTop: `1px solid ${cfg.color}20`,
                              }}>
                                {item.detail && (
                                  <p style={{ fontSize: 12, color: '#595959', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                                    {item.detail}
                                  </p>
                                )}
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                  <div>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Date</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{formatDate(item.at)}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Time</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{getHistoryTime(item.at)}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Category</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Time */}
                          <div style={{ flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>
                            <div style={{ fontSize: 11, color: '#aaa', fontVariantNumeric: 'tabular-nums' }}>
                              {getHistoryTime(item.at)}
                            </div>
                            <div style={{ fontSize: 10, color: '#ccc', marginTop: 1 }}>
                              {isOpen ? '▲' : '▼'}
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
      )}
    </div>
  );
}

// ─── End History Timeline ─────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<'history' | 'feedback' | 'documents' | 'payments'>('history');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [expandedModuleView, setExpandedModuleView] = useState<string | null>(null);
  const [packageOfferStep, setPackageOfferStep] = useState<1 | 2 | 3 | 4>(1);
  const [savedBookingId, setSavedBookingId] = useState<string | null>(null);
  const [savedBookingNumber, setSavedBookingNumber] = useState<string | null>(null);
  const [savedNetAmountPaise, setSavedNetAmountPaise] = useState<number>(0);
  const [packagePaymentAmount, setPackagePaymentAmount] = useState<number>(0);
  const [printMode, setPrintMode] = useState<'normal' | 'pos'>('normal');
  const [pkgServiceAllocations, setPkgServiceAllocations] = useState<Record<string, number>>({});
  const [savedBookingItems, setSavedBookingItems] = useState<any[]>([]);
  const [showAllocationPanel, setShowAllocationPanel] = useState(false);
  const [bookingRows, setBookingRows] = useState<any[]>([{ id: 1, category: '', service: '', quantity: 1, amount: 0, taxPercent: 0, taxType: 'exclusive', serviceBy: '', discPct: 0 }]);
  const [complimentaryRows, setComplimentaryRows] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<(CouponLookupResult & { discountPaise: number }) | null>(null);
  const [bookingData, setBookingData] = useState<any>({
    bookingDate: new Date().toISOString().split('T')[0],
    bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
    consultant: '',
    doctor: '',
    teleCaller: '',
    source: '',
    tokenRef: '',
    validityDate: '',
    sessions: 1,
    rating: 0,
    paymentMode: '',
    shareIncentive: '',
    targetWeight: '',
    measurements: '',
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
  const authUser = useAuthStore(s => s.user);
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
      setSavedBookingNumber(null);
      setSavedNetAmountPaise(0);
      setPackagePaymentAmount(0);
      setBookingRows([{ id: Date.now(), category: '', service: '', quantity: 1, amount: 0, taxPercent: 0, taxType: 'exclusive', serviceBy: '', discPct: 0 }]);
      setComplimentaryRows([]);
      setCouponInput('');
      setAppliedCoupon(null);
      setBookingData({
        bookingDate: new Date().toISOString().split('T')[0],
        bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        consultant: '', doctor: '', teleCaller: '', source: '', tokenRef: '',
        validityDate: '', sessions: 1, rating: 0, paymentMode: '', shareIncentive: '',
        targetWeight: '', measurements: '', discount: 0, roundOff: 0, remarks: '',
      });
    }
  }, [expandedModuleView]);

  const { data: branchPaymentModes = [] } = useBranchPaymentModes();

  const { data: allCustomers, isLoading: customersLoading, error: customersError } = useCustomers({
    limit: 9999,
  });

  const { data: customer, isLoading } = useCustomer(id);
  const { data: sales, isLoading: salesLoading } = useCustomerSales(id);

  // Edit profile modal
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileForm] = Form.useForm();
  const updateCustomer = useUpdateCustomer(id);
  const { data: statesData } = useStates({ limit: 100 });
  const stateOptions = (statesData?.items ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }));

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
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payAllocations, setPayAllocations] = useState<Record<string, string>>({});

  // Auto-distribute proportionally across items whenever the modal opens or the payment amount changes
  useEffect(() => {
    if (!payModalBooking || (payModalBooking.items?.length ?? 0) <= 1) return;
    const paise = Math.round(parseFloat(payInput) * 100) || 0;
    if (paise <= 0) { setPayAllocations({}); return; }
    const items: any[] = payModalBooking.items ?? [];
    const remaining = items.map((it: any) => Math.max(0, it.lineTotal - it.paidAmount));
    const totalRemaining = remaining.reduce((s: number, r: number) => s + r, 0);
    const newAllocs: Record<string, string> = {};
    let distributed = 0;
    items.forEach((it: any, idx: number) => {
      if (idx === items.length - 1) {
        newAllocs[it.id] = String(Math.max(0, paise - distributed) / 100);
      } else {
        const share = totalRemaining > 0 ? Math.round((remaining[idx] / totalRemaining) * paise) : 0;
        newAllocs[it.id] = String(share / 100);
        distributed += share;
      }
    });
    setPayAllocations(newAllocs);
  }, [payModalBooking, payInput]);
  const [creditNoteBooking, setCreditNoteBooking] = useState<any>(null);
  const [creditNoteText, setCreditNoteText] = useState('');
  const [bSearch, setBSearch] = useState('');
  const [bPage, setBPage] = useState(1);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [bkSessionModal, setBkSessionModal] = useState<{ bookingId: string; itemId?: string; serviceName?: string; totalSessions?: number; taken?: number; session?: any; branchId?: string; masterId?: string; masterInventoryItems?: any[] } | null>(null);
  const [bkSessDate, setBkSessDate] = useState(new Date().toISOString().split('T')[0]);
  const [bkSessStaffId, setBkSessStaffId] = useState('');
  const [bkSessStatus, setBkSessStatus] = useState<'completed' | 'no_show' | 'cancelled' | 'rescheduled'>('completed');
  const [bkSessRemarks, setBkSessRemarks] = useState('');
  const [bkSessProducts, setBkSessProducts] = useState<Array<{ productId: string; productName: string; quantity: number; uom?: string }>>([]);
  const [bkProdSearch, setBkProdSearch] = useState('');
  const [bkSessSaving, setBkSessSaving] = useState(false);
  const { data: sessionEmployees } = useSessionEmployees();
  const { data: sessionProductsData } = useSessionProducts();
  const { data: serviceDefaultProducts } = useServiceDefaultProducts(bkSessionModal?.serviceName ?? null, bkSessionModal?.branchId);

  // Auto-populate service-mapped products into bkSessProducts when session modal opens.
  // Package-level products (masterInventoryItems) are shown read-only in their own section
  // and are NOT added here to avoid duplicate display.
  useEffect(() => {
    if (!bkSessionModal || bkSessionModal.session) return;
    const svcProds = (serviceDefaultProducts ?? []).map((p) => ({
      productId:   p.productId,
      productName: p.productName,
      quantity:    p.quantityPerSession,
      uom:         p.uom ?? undefined,
    }));
    setBkSessProducts(svcProds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceDefaultProducts, bkSessionModal?.itemId]);
  const { data: expandedSessions, isLoading: expandedSessionsLoading } = useBookingSessions(id, expandedBookingId ?? '');
  const addBookingSession      = useAddBookingSession(id, bkSessionModal?.bookingId ?? '');
  const updateBookingSession   = useUpdateBookingSession(id, bkSessionModal?.bookingId ?? '');
  const startBookingSession    = useStartBookingSession(id);
  const completeBookingSession = useCompleteBookingSession(id);
  const { data: packages, isLoading: packagesLoading } = usePackages(id);
  const [sessionModalPkg, setSessionModalPkg] = useState<any>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionStaff, setSessionStaff] = useState('');
  const [sessionRemarks, setSessionRemarks] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'completed' | 'no_show' | 'cancelled' | 'rescheduled'>('completed');
  const [sessionSaving, setSessionSaving] = useState(false);
  const addSession = useAddPackageSession(id, sessionModalPkg?.id ?? '');
  const { data: pkgProducts = [], isLoading: pkgProductsLoading } = usePkgSessionProducts(sessionModalPkg?.id);
  const pkgProductGroups = pkgProducts as ServiceProductGroup[];
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
  const { data: packageMasters = [] } = usePackageSessionMasters();
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const { data: branchCurrentInfo } = useBranchCurrentInfo();
  const branchStateId = branchCurrentInfo?.stateId ?? null;
  const { data: complimentaryConfig } = useBranchComplimentaryConfig();
  const branchPercentage = complimentaryConfig?.branchPercentage ?? null;
  const limitIsActive = complimentaryConfig?.limitIsActive ?? false;
  const lookupCoupon = useLookupCoupon();
  const createBooking = useCreateAppointment();
  const raiseIndent = useRaiseIndent();

  // Stock warning modal state
  interface StockShortfall {
    productId: string;
    productName: string;
    productUom: string;
    required: number;
    available: number;
  }
  const [stockShortfalls, setStockShortfalls] = useState<StockShortfall[]>([]);
  // Branch employees — used to populate the prescription "Doctor" dropdown.
  const { data: branchStaff, isLoading: branchStaffLoading } = useBranchEmployees();

  // Must be before any early return — Rules of Hooks.
  // OR logic: a field appears only if at least one selected service's category has the flag ON.
  // When no service is selected yet, all optional fields are hidden (ALL_FALSE).
  // isAmountEditable is the exception — defaults true when nothing is selected so the input stays usable.
  const effectiveFlags = useMemo(() => {
    const ALL_FALSE = {
      hasConsultant: false, hasQuantity: false, isAmountEditable: true,
      hasDoctor: false, hasTeleCaller: false, hasMedia: false, hasTokenReference: false,
      hasServiceBy: false, hasIndividualDiscount: false, hasTotalDiscount: false,
      hasValidity: false, hasSession: false, sessionBased: false, hasDND: false,
      hasRating: false, hasDirectPayment: false, hasShareIncentive: false,
      isCombo: false, servicesInCombo: false, hasAllSessionsLink: false,
      hasBreakPackage: false, targetWeightBased: false, hasMeasurement: false,
    };
    const selectedSvcs = bookingRows
      .filter(r => r.service)
      .map(r => (branchServices ?? []).find(s => s.name === r.service))
      .filter(Boolean);
    if (selectedSvcs.length === 0) return ALL_FALSE;
    const flag = (key: string) => selectedSvcs.some(s => s!.categoryFlags?.[key] ?? false);
    return {
      hasConsultant: flag('hasConsultant'), hasQuantity: flag('hasQuantity'),
      isAmountEditable: flag('isAmountEditable'), hasDoctor: flag('hasDoctor'),
      hasTeleCaller: flag('hasTeleCaller'), hasMedia: flag('hasMedia'),
      hasTokenReference: flag('hasTokenReference'), hasServiceBy: flag('hasServiceBy'),
      hasIndividualDiscount: flag('hasIndividualDiscount'), hasTotalDiscount: flag('hasTotalDiscount'),
      hasValidity: flag('hasValidity'), hasSession: flag('hasSession'),
      sessionBased: flag('sessionBased'), hasDND: flag('hasDND'),
      hasRating: flag('hasRating'), hasDirectPayment: flag('hasDirectPayment'),
      hasShareIncentive: flag('hasShareIncentive'), isCombo: flag('isCombo'),
      servicesInCombo: flag('servicesInCombo'), hasAllSessionsLink: flag('hasAllSessionsLink'),
      hasBreakPackage: flag('hasBreakPackage'), targetWeightBased: flag('targetWeightBased'),
      hasMeasurement: flag('hasMeasurement'),
    };
  }, [bookingRows, branchServices]);

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
      // Match only on phone — names are not unique; phone number uniquely identifies a customer
      const existingCustomer = phoneInput.trim()
        ? allCustomers?.items?.find((c) => c.phone === phoneInput.trim())
        : null;

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
    setBookingRows([...bookingRows, { id: Date.now(), category: '', service: '', quantity: 1, amount: 0, taxPercent: 0, taxType: 'exclusive', serviceBy: '', discPct: 0 }]);
  };

  const handleAddComplementaryRow = () => {
    setComplimentaryRows([...complimentaryRows, { id: Date.now(), service: '', quantity: 1, amount: 0 }]);
  };

  const handleRemoveComplementaryRow = (id: number) => {
    setComplimentaryRows(complimentaryRows.filter(r => r.id !== id));
  };

  const handleComplementaryRowChange = (id: number, field: string, value: any) => {
    const fmt = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const paidTotal = bookingRows.filter(r => r.service).reduce((s, r) => s + r.quantity * r.amount, 0);
    const maxAllowed = paidTotal * 0.20;

    if (field === 'service' && value) {
      const svc = (branchServices ?? []).find(s => s.name === value);
      const newAmount = svc ? svc.minPrice / 100 : 0;
      const currentComp = complimentaryRows.filter(r => r.id !== id).reduce((s, r) => s + r.quantity * r.amount, 0);
      if (currentComp + newAmount > maxAllowed) {
        message.error(`Exceeds complimentary limit. Max allowed: ₹${fmt(maxAllowed)} (20% of ₹${fmt(paidTotal)}).`);
        return;
      }
      setComplimentaryRows(complimentaryRows.map(r =>
        r.id === id ? { ...r, service: value, amount: newAmount } : r
      ));
      return;
    }
    if (field === 'quantity') {
      const row = complimentaryRows.find(r => r.id === id);
      const newQty = Number(value) || 1;
      const currentComp = complimentaryRows.filter(r => r.id !== id).reduce((s, r) => s + r.quantity * r.amount, 0);
      const thisAmt = (row?.amount ?? 0) * newQty;
      if (currentComp + thisAmt > maxAllowed) {
        message.error(`Exceeds complimentary limit. Max allowed: ₹${fmt(maxAllowed)} (20% of ₹${fmt(paidTotal)}).`);
        return;
      }
    }
    setComplimentaryRows(complimentaryRows.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const handleApplyCoupon = async () => {
    try {
      const result = await lookupCoupon.mutateAsync(couponInput.trim());
      const paidSubtotalPaise = bookingRows
        .filter((r) => r.service)
        .reduce((s, r) => s + Math.round(r.quantity * r.amount * 100), 0);
      const discountPaise =
        result.couponType === 'percentage'
          ? Math.round(paidSubtotalPaise * result.couponValue / 100)
          : result.couponValue;
      setAppliedCoupon({ ...result, discountPaise });
      message.success(`Coupon "${result.couponName}" applied`);
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Invalid or Expired Coupon');
    }
  };

  const handleRemoveRow = (id: number) => {
    setBookingRows(bookingRows.filter(row => row.id !== id));
  };

  const buildBookingPayload = (force = false): Record<string, unknown> => {
    const validRows = bookingRows.filter((r) => r.service && r.service.trim());
    const items = [
      ...validRows.map((r) => {
        const svc = (branchServices ?? []).find((s: any) => s.name === r.service);
        const flags = svc?.categoryFlags ?? {};
        return {
          category: r.category || undefined,
          service: r.service,
          quantity: Math.max(1, Number(r.quantity) || 1),
          amount: Math.round((Number(r.amount) || 0) * 100),
          isSessionBased: !!(r.isSessionBased || flags.sessionBased || flags.hasSession),
          // Pass item-level tax for package rows (taxPercent > 0 means it was set explicitly)
          ...(r.taxPercent ? { taxPercent: r.taxPercent, taxType: r.taxType ?? 'exclusive' } : {}),
          // Link to Package Session Master if this row came from handleAddPackage
          ...(r._masterId ? { packageSessionMasterId: r._masterId } : {}),
        };
      }),
      ...complimentaryRows.filter(r => r.service?.trim()).map((r) => ({
        category: undefined,
        service: r.service,
        quantity: Math.max(1, Number(r.quantity) || 1),
        amount: 0,
        isSessionBased: false,
      })),
    ];
    const subtotalPaise = items.reduce((s, it) => s + (it.amount as number) * (it.quantity as number), 0);
    const couponDiscountPaise = appliedCoupon?.discountPaise ?? 0;
    const discountPaise = Math.round((subtotalPaise * (Number(bookingData.discount) || 0)) / 100) + couponDiscountPaise;
    const roundOffPaise = Math.round((Number(bookingData.roundOff) || 0) * 100);
    return {
      customerId: id,
      consultantStaffId: bookingData.consultant || undefined,
      scheduledAt: new Date(bookingData.bookingDate + 'T12:00:00').toISOString(),
      status: 'completed',
      notes: bookingData.remarks || undefined,
      discount: discountPaise,
      roundOff: roundOffPaise,
      items,
      forceCreate: force,
      _netPaise: subtotalPaise - discountPaise + roundOffPaise,
    };
  };

  // Returns the saved booking ID, or null if it failed.
  const handleSaveBooking = async (force = false): Promise<{ id: string; items: any[] } | null> => {
    try {
      const payload = buildBookingPayload(force);
      const netPaise = payload._netPaise as number;
      const { _netPaise: _, ...apiPayload } = payload;

      const result = await createBooking.mutateAsync(apiPayload);
      const bookingId = (result as any).id ?? null;
      const bookingNumber = (result as any).number ?? null;
      const retItems = (result as any).items ?? [];

      setSavedBookingId(bookingId);
      setSavedBookingNumber(bookingNumber);
      setSavedNetAmountPaise(netPaise);
      setSavedBookingItems(retItems);
      return { id: bookingId, items: retItems };
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'STOCK_INSUFFICIENT') {
        // Auto-proceed with forceCreate — stock shortage is a warning, not a blocker.
        const shortfalls: StockShortfall[] = (error.details ?? [])
          .filter((d) => d.field === 'shortfall')
          .map((d) => { try { return JSON.parse(d.message); } catch { return null; } })
          .filter(Boolean);
        setStockShortfalls(shortfalls);
        try {
          const forcePayload = buildBookingPayload(true);
          const forceNetPaise = forcePayload._netPaise as number;
          const { _netPaise: __, ...forceApiPayload } = forcePayload;
          const result = await createBooking.mutateAsync(forceApiPayload);
          const bookingId = (result as any).id ?? null;
          const bookingNumber = (result as any).number ?? null;
          const retItems = (result as any).items ?? [];
          setSavedBookingId(bookingId);
          setSavedBookingNumber(bookingNumber);
          setSavedNetAmountPaise(forceNetPaise);
          setSavedBookingItems(retItems);
          const names = shortfalls.map((s) => s.productName).join(', ');
          message.warning(`Booking saved. Low stock warning: ${names}. Please raise a stock request after booking.`, 6);
          return { id: bookingId, items: retItems };
        } catch (forceErr) {
          message.error('Could not save booking: ' + (forceErr instanceof Error ? forceErr.message : 'Unknown error'));
          return null;
        }
      }
      message.error(
        'Error saving booking: ' +
          (error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unknown error'),
      );
      return null;
    }
  };

  const handleReviewBooking = () => {
    const validRows = bookingRows.filter((r) => r.service && r.service.trim());
    if (!validRows.length) {
      message.error('Add at least one service to continue');
      return;
    }
    setPackageOfferStep(2);
  };

  const resetPrescriptionForm = () => {
    setShowAddPrescription(false);
    setEditingPrescription(null);
    setPrescriptionForm({ doctor: '', medications: '', diagnosis: '', notes: '' });
    setMedRows([{ id: 1, name: '', dosage: '', timing: [], when: '', duration: '' }]);
  };

  const buildRxText = (rx: any) => {
    const lines: string[] = [];
    lines.push(`*Prescription — ${customer?.name ?? ''}*`);
    if (customer?.phone) lines.push(`Patient: ${customer.phone}`);
    lines.push(`Date: ${new Date(rx.issuedAt || rx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
    if (rx.prescribedBy) lines.push(`Doctor: Dr. ${rx.prescribedBy}`);
    if (rx.diagnosis) lines.push(`Diagnosis: ${rx.diagnosis}`);
    lines.push('');
    const meds = (rx.medications ?? '').split('\n').map((m: string) => m.trim()).filter(Boolean);
    if (meds.length) {
      lines.push('Medications:');
      meds.forEach((med: string, i: number) => { lines.push(`${i + 1}. ${med}`); });
    }
    if (rx.notes) { lines.push(''); lines.push(`Note: ${rx.notes}`); }
    if (authUser?.branchName) lines.push(`\n${authUser.branchName}`);
    return lines.join('\n');
  };

  const printPrescription = (rx: any) => {
    const clinicName = authUser?.branchName ?? 'Welona Clinic';
    const meds = (rx.medications ?? '').split('\n').map((m: string) => m.trim()).filter(Boolean);
    const medsHtml = meds.map((med: string, i: number) => {
      const parts = med.split(' · ');
      const name = parts[0] ?? '';
      const dosage = parts[1] ?? '';
      const rest = parts.slice(2).join(' &nbsp;·&nbsp; ');
      return `<tr>
        <td style="padding:6px 8px;border:1px solid #e0e7ff;font-weight:600">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e0e7ff">${name}</td>
        <td style="padding:6px 8px;border:1px solid #e0e7ff;color:#555">${dosage}</td>
        <td style="padding:6px 8px;border:1px solid #e0e7ff;color:#555">${rest}</td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><title>Prescription</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px; color: #111; }
      h1 { font-size: 22px; color: #3730a3; margin: 0; }
      .subtitle { color: #888; font-size: 12px; margin-top: 2px; }
      .header { border-bottom: 2px solid #3730a3; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
      .patient { background: #eef2ff; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
      .label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: .06em; margin-bottom: 2px; }
      .value { font-size: 13px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
      th { background: #eef2ff; color: #3730a3; text-align: left; padding: 6px 8px; border: 1px solid #e0e7ff; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
      .notes { background: #fffbe6; border: 1px solid #ffe58f; border-left: 3px solid #faad14; border-radius: 6px; padding: 10px 14px; margin-top: 16px; font-size: 13px; color: #614700; }
      .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 12px; font-size: 11px; color: #aaa; display: flex; justify-content: space-between; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <div class="header">
      <div><h1>${clinicName}</h1><div class="subtitle">Medical Prescription</div></div>
      <div style="font-size:12px;color:#555;text-align:right">
        Date: <strong>${new Date(rx.issuedAt || rx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
      </div>
    </div>
    <div class="patient">
      <div style="display:flex;gap:32px">
        <div><div class="label">Patient</div><div class="value">${customer?.name ?? ''}</div></div>
        ${customer?.phone ? `<div><div class="label">Mobile</div><div class="value">${customer.phone}</div></div>` : ''}
        ${rx.prescribedBy ? `<div><div class="label">Doctor</div><div class="value">Dr. ${rx.prescribedBy}</div></div>` : ''}
        ${rx.diagnosis ? `<div><div class="label">Diagnosis</div><div class="value">${rx.diagnosis}</div></div>` : ''}
      </div>
    </div>
    ${meds.length ? `
    <div class="label" style="margin-bottom:6px">Medications</div>
    <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Instructions</th></tr></thead>
    <tbody>${medsHtml}</tbody></table>` : ''}
    ${rx.notes ? `<div class="notes"><strong>⚠️ Note:</strong> ${rx.notes}</div>` : ''}
    <div class="footer">
      <span>Rx — ${clinicName}</span>
      <span>Generated on ${new Date().toLocaleDateString('en-IN')}</span>
    </div>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
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
          const svc = (branchServices ?? []).find((s) => s.name === row.service);
          if (svc && value && svc.categoryName !== value) {
            updated.service = '';
            updated.amount = 0;
          }
        }
        if (field === 'service' && value) {
          const svc = (branchServices ?? []).find((s) => s.name === value);
          if (svc) {
            updated.amount = svc.minPrice / 100;
            updated.category = svc.categoryName ?? '';
            updated.taxPercent = (svc as any).taxPercent ?? 0;
            updated.taxType = (svc as any).taxType ?? 'exclusive';
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

  const handleAddPackage = () => {
    if (!selectedPackageId) return;
    const pkg = packageMasters.find(p => p.id === selectedPackageId);
    if (!pkg) return;
    // Package appears as a single line item — full price, package name as service label
    const newRow = {
      id: Date.now(),
      category: 'Packages',
      service: pkg.name,
      quantity: 1,
      amount: pkg.price / 100,   // paise → rupees for the form; qty=1 so total = full package price
      taxPercent: 0,             // package selling price is all-inclusive — never add tax on top
      taxType: 'exclusive',
      serviceBy: '',
      discPct: 0,
      isSessionBased: true,
      _isPackage: true,
      _masterId: pkg.id, // link to Package Session Master for extra products
    };
    const hasRealRows = bookingRows.some(r => r.service?.trim());
    setBookingRows(hasRealRows ? [...bookingRows, newRow] : [newRow]);
    setSelectedPackageId('');
    message.success(`Package "${pkg.name}" added to booking`);
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
                      onAdd={m.key === 'bookings' ? () => setExpandedModuleView('new-booking') : undefined}
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
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" icon={<EditOutlined />} onClick={openEditProfile}>
                      Edit Profile
                    </Button>
                  </div>
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
                {['history', 'payments', 'feedback', 'documents'].map((tab) => (
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
                    {tab === 'payments' && '💳 Payment History'}
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
              <HistoryTimeline
                history={history as any[]}
                selectedDetail={selectedDetail}
                detailType={detailType}
                setSelectedDetail={setSelectedDetail}
                setDetailType={setDetailType}
                formatDate={formatDate}
              />
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: colors.text.primary }}>Feedback</div>
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

              {/* Payment History Tab */}
              {activeTab === 'payments' && (
                <div>
                  {salesLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                  ) : (
                    <>
                      {/* Summary row */}
                      {sales && (
                        <Row gutter={16} style={{ marginBottom: 20 }}>
                          <Col xs={8}>
                            <div style={{ textAlign: 'center', padding: '12px 8px', background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#2e7d32' }}>{formatMoney(sales.summary.totalBilled)}</div>
                              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Total Billed</div>
                            </div>
                          </Col>
                          <Col xs={8}>
                            <div style={{ textAlign: 'center', padding: '12px 8px', background: '#e6f4ff', borderRadius: 6, border: '1px solid #91caff' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#1565c0' }}>{formatMoney(sales.summary.totalSpent)}</div>
                              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Total Paid</div>
                            </div>
                          </Col>
                          <Col xs={8}>
                            <div style={{ textAlign: 'center', padding: '12px 8px', background: sales.summary.outstanding > 0 ? '#fff7e6' : '#f6ffed', borderRadius: 6, border: `1px solid ${sales.summary.outstanding > 0 ? '#ffd666' : '#b7eb8f'}` }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: sales.summary.outstanding > 0 ? '#ad6800' : '#2e7d32' }}>{formatMoney(sales.summary.outstanding)}</div>
                              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Outstanding</div>
                            </div>
                          </Col>
                        </Row>
                      )}

                      {/* Booking payments section */}
                      {bookings && bookings.filter((b: any) => (b.netAmount ?? 0) > 0).length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Service Bookings</Typography.Text>
                          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' }}>
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#fafafa', color: colors.text.secondary, borderBottom: `1px solid ${colors.border}` }}>
                                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>Booking</th>
                                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>Date</th>
                                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>Mode</th>
                                  <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500 }}>Total</th>
                                  <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500 }}>Paid</th>
                                  <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500 }}>Balance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bookings.filter((b: any) => (b.netAmount ?? 0) > 0).map((b: any) => {
                                  const bal = Math.max(0, b.netAmount - b.paidAmount);
                                  const hasAllocations = b.items?.some((it: any) => it.paidAmount > 0);
                                  const isExpanded = expandedBookingId === b.id;
                                  return (
                                    <>
                                      <tr
                                        key={b.id}
                                        style={{ borderBottom: `1px solid ${colors.border}`, cursor: hasAllocations ? 'pointer' : 'default', background: isExpanded ? '#fafafa' : undefined }}
                                        onClick={() => hasAllocations && setExpandedBookingId(isExpanded ? null : b.id)}
                                      >
                                        <td style={{ padding: '8px 12px' }}>
                                          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {b.serviceName}
                                            {hasAllocations && <span style={{ fontSize: 10, color: colors.text.secondary }}>{isExpanded ? '▲' : '▼'}</span>}
                                          </div>
                                          {b.number && <div style={{ fontSize: 11, color: colors.text.secondary }}>#{b.number}</div>}
                                        </td>
                                        <td style={{ padding: '8px 12px', color: colors.text.secondary }}>{formatDate(b.scheduledAt)}</td>
                                        <td style={{ padding: '8px 12px', textTransform: 'capitalize', color: colors.text.secondary }}>{b.paymentMode || '—'}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatMoney(b.netAmount)}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#2e7d32', fontWeight: 600 }}>{formatMoney(b.paidAmount)}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: bal > 0 ? '#c62828' : '#2e7d32', fontWeight: 600 }}>{formatMoney(bal)}</td>
                                      </tr>
                                      {isExpanded && hasAllocations && (
                                        <tr key={`${b.id}-detail`} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                          <td colSpan={6} style={{ padding: '0 12px 10px 28px', background: '#fafafa' }}>
                                            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginTop: 6 }}>
                                              <thead>
                                                <tr style={{ color: colors.text.secondary }}>
                                                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Service</th>
                                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>Total (₹)</th>
                                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>Collected (₹)</th>
                                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>Balance (₹)</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {b.items.filter((it: any) => it.paidAmount > 0).map((it: any) => {
                                                  const itBal = Math.max(0, it.lineTotal - it.paidAmount);
                                                  return (
                                                    <tr key={it.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                                                      <td style={{ padding: '4px 8px' }}>{it.service}</td>
                                                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{formatMoney(it.lineTotal)}</td>
                                                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#2e7d32' }}>{formatMoney(it.paidAmount)}</td>
                                                      <td style={{ padding: '4px 8px', textAlign: 'right', color: itBal > 0 ? '#c62828' : '#2e7d32' }}>{formatMoney(itBal)}</td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Invoice list */}
                      {!sales?.invoices?.length ? (
                        <Empty description="No invoices yet" style={{ marginTop: 40 }} />
                      ) : (
                        <div>
                          {sales.invoices.map((inv: any) => {
                            const isExpanded = expandedInvoiceId === inv.id;
                            const balance = inv.total - inv.amountPaid;
                            return (
                              <div key={inv.id} style={{ marginBottom: 8, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: 'hidden' }}>
                                {/* Invoice header row */}
                                <div
                                  onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                  style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', background: isExpanded ? '#fafafa' : 'white', gap: 12 }}
                                >
                                  <Typography.Text strong style={{ fontSize: 13, minWidth: 90 }}>{inv.number}</Typography.Text>
                                  <Typography.Text style={{ fontSize: 12, color: colors.text.secondary, flex: 1 }}>
                                    {formatDate(inv.createdAt)}
                                    {inv.order?.number ? ` · ${inv.order.number}` : ''}
                                  </Typography.Text>
                                  <Typography.Text style={{ fontSize: 12, minWidth: 80, textAlign: 'right' }}>{formatMoney(inv.total)}</Typography.Text>
                                  <Typography.Text style={{ fontSize: 12, color: '#2e7d32', minWidth: 70, textAlign: 'right' }}>{formatMoney(inv.amountPaid)}</Typography.Text>
                                  <Typography.Text style={{ fontSize: 12, color: balance > 0 ? '#c62828' : '#2e7d32', minWidth: 70, textAlign: 'right' }}>{formatMoney(balance)}</Typography.Text>
                                  <StatusTag status={inv.status} />
                                  <Typography.Text style={{ fontSize: 12, color: colors.text.secondary }}>{isExpanded ? '▲' : '▼'}</Typography.Text>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                  <div style={{ padding: '12px 14px', borderTop: `1px solid ${colors.border}`, background: '#fafafa' }}>
                                    {/* Services breakdown */}
                                    {inv.order?.items?.length > 0 ? (
                                      <>
                                        <Typography.Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: colors.text.secondary }}>SERVICES BREAKDOWN</Typography.Text>
                                        <ServiceAllocationTable
                                          items={inv.order.items}
                                          invoiceTotal={inv.total}
                                          amountPaid={inv.amountPaid}
                                        />
                                      </>
                                    ) : (
                                      <Typography.Text style={{ fontSize: 12, color: colors.text.secondary }}>No line item breakdown available.</Typography.Text>
                                    )}

                                    {/* Payment ledger */}
                                    {inv.payments?.length > 0 && (
                                      <>
                                        <Typography.Text strong style={{ fontSize: 12, display: 'block', marginTop: 16, marginBottom: 8, color: colors.text.secondary }}>PAYMENTS RECEIVED</Typography.Text>
                                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                          <thead>
                                            <tr style={{ color: colors.text.secondary, borderBottom: `1px solid ${colors.border}` }}>
                                              <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Date</th>
                                              <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Method</th>
                                              <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Reference</th>
                                              <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {inv.payments.map((p: any) => (
                                              <tr key={p.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                                <td style={{ padding: '6px 8px' }}>{formatDate(p.receivedAt)}</td>
                                                <td style={{ padding: '6px 8px', textTransform: 'capitalize' }}>{p.method}</td>
                                                <td style={{ padding: '6px 8px', color: colors.text.secondary }}>{p.reference || '—'}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#2e7d32' }}>{formatMoney(p.amount)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </>
                                    )}
                                    {!inv.payments?.length && (
                                      <Typography.Text style={{ fontSize: 12, color: colors.text.secondary, display: 'block', marginTop: 12 }}>No payments recorded yet.</Typography.Text>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
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
                    {expandedModuleView === 'new-booking' ? 'New Booking' : modules.find(m => m.key === expandedModuleView)?.title || 'Module Details'}
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
                                const isExpanded = expandedBookingId === b.id;
                                // Build service list from data already in memory — no waiting for API
                                const localItems: any[] = b.items && b.items.length > 0
                                  ? b.items
                                  : [{ id: b.id, service: b.serviceName ?? 'Service', category: b.categoryName ?? null, quantity: 1 }];
                                const sessData = (expandedSessions as any);
                                const allSessions: any[] = sessData?.sessions ?? [];
                                // Use API items (have isSessionBased) once loaded, else fall back to localItems
                                const displayItems: any[] = sessData?.items ?? localItems;
                                // Summary lines are already excluded by the backend; filter defensively on frontend too
                                const sessionItems = displayItems.filter((item: any) => item.isSessionBased && !item.isPackageSummaryLine);
                                const singleItems = displayItems.filter((item: any) => !item.isSessionBased && !item.isPackageSummaryLine);
                                return (
                                  <>
                                  <tr key={b.id} style={{ borderBottom: isExpanded ? 'none' : `1px solid #f0f0f0`, background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '10px 12px', color: isExpanded ? '#1677ff' : '#aaa', cursor: 'pointer', fontSize: 16, userSelect: 'none' }}
                                      onClick={() => { setExpandedBookingId(isExpanded ? null : b.id); setExpandedItemId(null); }}>
                                      {isExpanded ? '⊖' : '⊕'}
                                    </td>
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
                                            onClick={() => { setPayModalBooking(b); setPayInput(String(Math.round(balAmt / 100))); setPayMethod('cash'); }}
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
                                  {isExpanded && (
                                      <tr key={b.id + '-sessions'} style={{ background: '#f7faff', borderBottom: `2px solid #d0e4ff` }}>
                                        <td colSpan={10} style={{ padding: '0 0 0 32px' }}>

                                            {/* Single / one-off services */}
                                            {singleItems.length > 0 && (
                                              <div style={{ padding: '10px 14px 6px', borderBottom: sessionItems.length > 0 ? '1px solid #dde8fb' : 'none' }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Services</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                  {singleItems.map((item: any) => (
                                                    <div key={item.id} style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 6, padding: '5px 12px', fontSize: 13, color: '#333' }}>
                                                      <span style={{ fontWeight: 600 }}>{item.service}</span>
                                                      {item.quantity > 1 && <span style={{ marginLeft: 6, color: '#888', fontSize: 12 }}>× {item.quantity}</span>}
                                                      {item.category && <span style={{ marginLeft: 6, fontSize: 11, color: '#aaa' }}>({item.category})</span>}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Session-based services */}
                                            {sessionItems.length > 0 && (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                              <thead>
                                                <tr style={{ background: '#e8f0fe', borderBottom: '2px solid #c5d8fb' }}>
                                                  <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: '#1a3a6b' }}>Session Service</th>
                                                  <th style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: '#1a3a6b' }}>Total Sessions</th>
                                                  <th style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: '#1a3a6b' }}>Sessions Taken</th>
                                                  <th style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: '#1a3a6b' }}>Balance Sessions</th>
                                                  <th style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: '#1a3a6b' }}>Action</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {sessionItems.map((item: any) => {
                                                  const itemSessions = allSessions.filter((s: any) => s.bookingItemId === item.id);
                                                  const taken = itemSessions.filter((s: any) => s.status === 'completed' || s.status === 'in_progress').length;
                                                  const total = item.quantity;
                                                  const balance = Math.max(0, total - taken);
                                                  const itemExpanded = expandedItemId === item.id;
                                                  const toggleItem = () => setExpandedItemId(itemExpanded ? null : item.id);
                                                  return (
                                                    <>
                                                      <tr
                                                        key={item.id}
                                                        style={{ borderBottom: itemExpanded ? 'none' : '1px solid #dde8fb', background: itemExpanded ? '#edf3ff' : '#fff', cursor: 'pointer' }}
                                                        onClick={() => toggleItem()}
                                                      >
                                                        <td style={{ padding: '10px 14px', color: '#1677ff', fontWeight: 500 }}>
                                                          <span style={{ marginRight: 8, fontSize: 12, color: '#888' }}>{itemExpanded ? '▼' : '▶'}</span>
                                                          {item.service}
                                                          {item.packageName
                                                            ? <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>({item.packageName})</span>
                                                            : item.category && item.category !== 'Packages' ? <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>({item.category})</span> : null}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{total}</td>
                                                        <td style={{ padding: '10px 14px', textAlign: 'center', color: taken > 0 ? '#1677ff' : '#aaa', fontWeight: 600 }}>{taken}</td>
                                                        <td style={{ padding: '10px 14px', textAlign: 'center', color: balance > 0 ? '#f57c00' : '#2e7d32', fontWeight: 700 }}>{balance}</td>
                                                        <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                          <button
                                                            disabled={balance === 0}
                                                            onClick={() => {
                                                              if (balance === 0) return;
                                                              // Look up inventory items from the live packageMasters list (always fresh).
                                                              // Fall back to booking item data in case the master was deleted.
                                                              const itemMasterId = (item as any).packageSessionMasterId ?? undefined;
                                                              const liveMaster = packageMasters.find((m: any) => m.id === itemMasterId || m.name === item.service);
                                                              const resolvedItems = liveMaster?.inventoryItems ?? (item as any).masterInventoryItems ?? [];
                                                              setBkSessionModal({ bookingId: b.id, itemId: item.id, serviceName: item.service, totalSessions: total, taken, branchId: b.branchId ?? undefined, masterId: itemMasterId, masterInventoryItems: resolvedItems });
                                                              setBkSessDate(new Date().toISOString().split('T')[0]);
                                                              setBkSessStaffId('');
                                                              setBkSessStatus('completed');
                                                              setBkSessRemarks('');
                                                              setBkSessProducts([]);
                                                              setBkSessProducts([]);
                                                              setBkProdSearch('');
                                                            }}
                                                            style={{ background: balance === 0 ? '#ccc' : '#2e7d32', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: balance === 0 ? 'not-allowed' : 'pointer' }}
                                                          >
                                                            {balance === 0 ? 'Sessions Full' : 'Take Session'}
                                                          </button>
                                                        </td>
                                                      </tr>
                                                      {itemExpanded && (
                                                        <tr key={item.id + '-detail'} style={{ background: '#f0f5ff' }}>
                                                          <td colSpan={5} style={{ padding: '0 0 0 28px' }}>
                                                            {itemSessions.length === 0 ? (
                                                              <div style={{ padding: '10px 0', color: '#aaa', fontSize: 12 }}>No sessions logged for this service yet.</div>
                                                            ) : (
                                                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                                <thead>
                                                                  <tr style={{ background: '#dde8fb' }}>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>#</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Doctor / Therapist</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Start</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>End</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Duration</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Products Used</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Remarks</th>
                                                                    <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody>
                                                                  {itemSessions.map((s: any) => (
                                                                    <tr key={s.id} style={{ borderBottom: '1px solid #c8d8f8' }}>
                                                                      <td style={{ padding: '6px 10px' }}>{s.sessionNumber}</td>
                                                                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                                                                        {new Date(s.sessionDate).toLocaleDateString('en-GB').replace(/\//g, '.')}
                                                                      </td>
                                                                      <td style={{ padding: '6px 10px' }}>{s.staffName || '—'}</td>
                                                                      <td style={{ padding: '6px 10px' }}>
                                                                        <span style={{
                                                                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                                                                          background: s.status === 'completed' ? '#e8f5e9' : s.status === 'in_progress' ? '#e3f2fd' : s.status === 'no_show' ? '#fff3e0' : s.status === 'pending' ? '#f5f5f5' : '#fce4ec',
                                                                          color: s.status === 'completed' ? '#2e7d32' : s.status === 'in_progress' ? '#1565c0' : s.status === 'no_show' ? '#e65100' : s.status === 'pending' ? '#888' : '#c62828',
                                                                        }}>
                                                                          {s.status === 'no_show' ? 'No Show' : s.status === 'in_progress' ? 'In Progress' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                                                        </span>
                                                                      </td>
                                                                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 11, color: '#555' }}>
                                                                        {s.startTime ? new Date(s.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                      </td>
                                                                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 11, color: '#555' }}>
                                                                        {s.endTime ? new Date(s.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                      </td>
                                                                      <td style={{ padding: '6px 10px', fontSize: 11, color: '#555' }}>
                                                                        {s.durationMinutes != null ? `${s.durationMinutes}m` : '—'}
                                                                      </td>
                                                                      <td style={{ padding: '6px 10px' }}>
                                                                        {(s.products ?? []).length > 0 ? (
                                                                          <Tooltip
                                                                            title={
                                                                              <div>
                                                                                {(s.products as any[]).map((p: any) => (
                                                                                  <div key={p.id} style={{ padding: '2px 0' }}>
                                                                                    {p.productName} × {p.quantity}{p.uom ? ` ${p.uom}` : ''}
                                                                                  </div>
                                                                                ))}
                                                                              </div>
                                                                            }
                                                                          >
                                                                            <span style={{ cursor: 'pointer', background: '#f0f4ff', color: '#1565c0', borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                              {(s.products as any[]).length} product{(s.products as any[]).length > 1 ? 's' : ''}
                                                                            </span>
                                                                          </Tooltip>
                                                                        ) : (
                                                                          <span style={{ color: '#bbb' }}>—</span>
                                                                        )}
                                                                      </td>
                                                                      <td style={{ padding: '6px 10px', color: '#555' }}>{s.remarks || '—'}</td>
                                                                      <td style={{ padding: '6px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                        {s.status === 'in_progress' && (() => {
                                                                          const startedAt = s.startTime ? new Date(s.startTime) : new Date(s.sessionDate);
                                                                          const elapsedMs = Date.now() - startedAt.getTime();
                                                                          const mins = Math.floor(elapsedMs / 60000);
                                                                          const secs = Math.floor((elapsedMs % 60000) / 1000);
                                                                          const elapsed = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                                                                          return (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                                                              <span style={{ fontSize: 10, color: '#1565c0', fontWeight: 600, background: '#e3f2fd', borderRadius: 10, padding: '1px 7px' }}>
                                                                                ⏱ {elapsed}
                                                                              </span>
                                                                              <button
                                                                                onClick={async () => {
                                                                                  try {
                                                                                    await completeBookingSession.mutateAsync({ sessionId: s.id, bookingId: b.id, body: { action: 'complete' } });
                                                                                    message.success('Session completed!');
                                                                                  } catch (err: any) {
                                                                                    message.error(err?.message ?? 'Failed to complete');
                                                                                  }
                                                                                }}
                                                                                style={{ background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}
                                                                              >
                                                                                ✓ Complete
                                                                              </button>
                                                                            </div>
                                                                          );
                                                                        })()}
                                                                        <button
                                                                          onClick={() => {
                                                                            setBkSessionModal({ bookingId: b.id, itemId: item.id, serviceName: item.service, totalSessions: total, taken, branchId: b.branchId ?? undefined, session: s });
                                                                            setBkSessDate(s.sessionDate.split('T')[0]);
                                                                            setBkSessStaffId(s.staffId ?? '');
                                                                            setBkSessStatus(s.status);
                                                                            setBkSessRemarks(s.remarks ?? '');
                                                                            setBkSessProducts(s.products ?? []);
                                                                            setBkProdSearch('');
                                                                          }}
                                                                          style={{ background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                                                                        >
                                                                          Edit
                                                                        </button>
                                                                      </td>
                                                                    </tr>
                                                                  ))}
                                                                </tbody>
                                                              </table>
                                                            )}
                                                          </td>
                                                        </tr>
                                                      )}
                                                    </>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                            )}

                                            {sessionItems.length === 0 && singleItems.length === 0 && (
                                              <div style={{ padding: '12px 14px', color: '#aaa', fontSize: 13 }}>No items on this booking.</div>
                                            )}
                                        </td>
                                      </tr>
                                  )}
                                  </>
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

                    {/* Booking Session Modal */}
                    {bkSessionModal && (() => {
                      const employees: any[] = sessionEmployees ?? [];
                      const productItems: any[] = (sessionProductsData as any)?.items ?? (Array.isArray(sessionProductsData) ? sessionProductsData : []);
                      const totalSess = bkSessionModal.totalSessions ?? 0;
                      const takenSess = bkSessionModal.taken ?? 0;
                      const balanceSess = Math.max(0, totalSess - takenSess);
                      const isEdit = !!bkSessionModal.session;

                      const handleSave = async () => {
                        setBkSessSaving(true);
                        try {
                          const now = new Date();
                          // Combine service products + manually added extras + package-level products
                          const pkgProductsForSave = (bkSessionModal.masterInventoryItems ?? []).map((m: any) => ({
                            productId:   m.productId,
                            productName: m.productName,
                            quantity:    m.quantityPerSession ?? 1,
                            uom:         m.uom ?? undefined,
                          }));
                          const allProducts = [...bkSessProducts, ...pkgProductsForSave.filter((m: any) => !bkSessProducts.find((r: any) => r.productId === m.productId))];
                          const payload: any = {
                            bookingItemId: bkSessionModal.itemId,
                            serviceName:   bkSessionModal.serviceName,
                            sessionDate:   now.toISOString(),
                            staffId:       bkSessStaffId || undefined,
                            status:        'in_progress',
                            startTime:     now.toISOString(),
                            remarks:       bkSessRemarks || undefined,
                            products:      allProducts,
                          };
                          if (isEdit) {
                            await updateBookingSession.mutateAsync({ sessionId: bkSessionModal.session.id, ...payload });
                            message.success('Session updated');
                          } else {
                            await addBookingSession.mutateAsync(payload);
                            message.success('Session started!');
                            // Auto-expand the item row so the history is immediately visible
                            if (bkSessionModal.itemId) setExpandedItemId(bkSessionModal.itemId);
                          }
                          setBkSessionModal(null);
                        } catch (err: any) {
                          message.error('Failed: ' + (err?.message ?? 'Unknown error'));
                        } finally {
                          setBkSessSaving(false);
                        }
                      };

                      const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                      const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                      // Build stock lookup from serviceDefaultProducts
                      const stockByProductId = new Map<string, number | null>(
                        (serviceDefaultProducts ?? []).map((p: any) => [p.productId, p.availableStock ?? null])
                      );

                      // Separate service-mapped products from manually added extras
                      const serviceProductIds = new Set((serviceDefaultProducts ?? []).map((p: any) => p.productId));
                      const svcProducts  = bkSessProducts.filter(r => serviceProductIds.has(r.productId));
                      const extraProducts = bkSessProducts.filter(r => !serviceProductIds.has(r.productId));

                      // Package products (set at package creation, given to customer)
                      const pkgProducts = bkSessionModal.masterInventoryItems ?? [];

                      return (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '92vh', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                            {/* Gradient accent bar */}
                            <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)', flexShrink: 0 }} />

                            {/* Header */}
                            <div style={{ padding: '18px 28px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                  {isEdit ? `Edit Session #${bkSessionModal.session.sessionNumber}` : 'Take Session'}
                                </div>
                                {bkSessionModal.serviceName && (
                                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, letterSpacing: '0.01em' }}>{bkSessionModal.serviceName}</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <span style={{ fontSize: 12, color: '#cbd5e1', background: '#f8fafc', padding: '4px 10px', borderRadius: 6, border: '1px solid #f1f5f9' }}>{todayStr} · {nowStr}</span>
                                <button onClick={() => setBkSessionModal(null)} style={{ background: 'none', border: '1px solid #e8e8e8', color: '#94a3b8', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 15, lineHeight: '30px', textAlign: 'center', flexShrink: 0 }}>✕</button>
                              </div>
                            </div>

                            {/* Body: 2 columns */}
                            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                              {/* LEFT — session info */}
                              <div style={{ width: 256, flexShrink: 0, borderRight: '1px solid #f0f0f0', padding: '24px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24, background: '#fafbfc' }}>

                                {/* Session counter */}
                                {totalSess > 0 && (
                                  <div>
                                    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>Session Progress</div>
                                    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e8ecf0' }}>
                                      {[
                                        { label: 'Total', value: totalSess, bg: '#f8fafc', color: '#334155' },
                                        { label: 'Used', value: takenSess, bg: '#fff', color: '#64748b' },
                                        { label: 'Remaining', value: balanceSess, bg: balanceSess > 0 ? '#f0fdf4' : '#fff5f5', color: balanceSess > 0 ? '#15803d' : '#dc2626' },
                                      ].map((c, ci) => (
                                        <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderTop: ci > 0 ? '1px solid #f1f5f9' : 'none', background: c.bg }}>
                                          <span style={{ fontSize: 12, color: '#64748b' }}>{c.label}</span>
                                          <span style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Staff */}
                                <div>
                                  <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, display: 'block', marginBottom: 8 }}>Doctor / Therapist</label>
                                  <select value={bkSessStaffId} onChange={e => setBkSessStaffId(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, background: '#fff', color: '#334155', outline: 'none' }}>
                                    <option value="">Select staff</option>
                                    {employees.map((emp: any) => (
                                      <option key={emp.id} value={emp.id}>{emp.name}{emp.designation ? ` (${emp.designation})` : ''}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Remarks */}
                                <div>
                                  <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, display: 'block', marginBottom: 8 }}>Remarks</label>
                                  <textarea value={bkSessRemarks} onChange={e => setBkSessRemarks(e.target.value)} rows={5}
                                    placeholder="Notes about this session…"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, resize: 'none', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', color: '#334155', lineHeight: 1.6 }} />
                                </div>
                              </div>

                              {/* RIGHT — products */}
                              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 26 }}>

                                {/* Section A: Service Products */}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <div style={{ width: 3, height: 16, borderRadius: 2, background: '#6366f1', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Service Products</span>
                                    <span style={{ fontSize: 11, color: '#cbd5e1', marginLeft: 2 }}>consumed during session</span>
                                  </div>
                                  <div style={{ border: '1px solid #e8ecf0', borderRadius: 12, overflow: 'hidden' }}>
                                    {svcProducts.length > 0 ? svcProducts.map((row, i) => {
                                      const avail = stockByProductId.get(row.productId) ?? null;
                                      const isLow = avail !== null && avail < row.quantity;
                                      return (
                                        <div key={row.productId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i > 0 ? '1px solid #f8fafc' : 'none', background: isLow ? '#fffcfc' : '#fff' }}>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.productName}</div>
                                            <div style={{ fontSize: 11, color: isLow ? '#ef4444' : '#94a3b8', marginTop: 3 }}>
                                              {avail !== null ? (isLow ? `⚠ Low — ${avail} ${row.uom ?? ''} left` : `${avail} ${row.uom ?? ''} in stock`) : 'Stock not tracked'}
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            {row.uom && <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '3px 8px', borderRadius: 5 }}>{row.uom}</span>}
                                            <input type="number" min={0.01} step={0.01} value={row.quantity}
                                              onChange={e => { const v = parseFloat(e.target.value) || 1; setBkSessProducts(prev => prev.map(r => r.productId === row.productId ? { ...r, quantity: v } : r)); }}
                                              style={{ width: 60, padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, textAlign: 'center', outline: 'none', color: '#334155' }} />
                                          </div>
                                        </div>
                                      );
                                    }) : (
                                      <div style={{ padding: '18px 20px', fontSize: 13, color: '#cbd5e1', fontStyle: 'italic' }}>No service products configured</div>
                                    )}
                                  </div>
                                </div>

                                {/* Section B: Package Products */}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <div style={{ width: 3, height: 16, borderRadius: 2, background: '#10b981', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Included in Package</span>
                                    <span style={{ fontSize: 11, color: '#cbd5e1', marginLeft: 2 }}>give to customer</span>
                                  </div>
                                  <div style={{ border: '1px solid #e8ecf0', borderRadius: 12, overflow: 'hidden' }}>
                                    {pkgProducts.length > 0 ? pkgProducts.map((m: any, i: number) => (
                                      <div key={m.productId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i > 0 ? '1px solid #f8fafc' : 'none', background: '#fff' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.productName}</div>
                                          {m.uom && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{m.uom}</div>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                          {m.uom && <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '3px 8px', borderRadius: 5 }}>{m.uom}</span>}
                                          <div style={{ width: 60, padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>
                                            {m.quantityPerSession ?? 1}
                                          </div>
                                        </div>
                                      </div>
                                    )) : (
                                      <div style={{ padding: '18px 20px', fontSize: 13, color: '#cbd5e1', fontStyle: 'italic' }}>No products included in this package</div>
                                    )}
                                  </div>
                                </div>

                                {/* Section C: Additional Products */}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <div style={{ width: 3, height: 16, borderRadius: 2, background: '#f59e0b', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Additional Products</span>
                                    <span style={{ fontSize: 11, color: '#cbd5e1', marginLeft: 2 }}>added for this session</span>
                                  </div>
                                  <div style={{ border: '1px solid #e8ecf0', borderRadius: 12, overflow: 'hidden' }}>
                                    {extraProducts.length > 0 && extraProducts.map((row, i) => {
                                      const avail = stockByProductId.get(row.productId) ?? null;
                                      const isLow = avail !== null && avail < row.quantity;
                                      return (
                                        <div key={row.productId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i > 0 ? '1px solid #f8fafc' : 'none', background: '#fff' }}>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.productName}</div>
                                            {avail !== null && (
                                              <div style={{ fontSize: 11, color: isLow ? '#ef4444' : '#94a3b8', marginTop: 3 }}>
                                                {isLow ? `⚠ Low — ${avail} ${row.uom ?? ''} left` : `${avail} ${row.uom ?? ''} in stock`}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            {row.uom && <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '3px 8px', borderRadius: 5 }}>{row.uom}</span>}
                                            <input type="number" min={0.01} step={0.01} value={row.quantity}
                                              onChange={e => { const v = parseFloat(e.target.value) || 1; setBkSessProducts(prev => prev.map(r => r.productId === row.productId ? { ...r, quantity: v } : r)); }}
                                              style={{ width: 60, padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, textAlign: 'center', outline: 'none', color: '#334155' }} />
                                            <button onClick={() => setBkSessProducts(prev => prev.filter(r => r.productId !== row.productId))}
                                              style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>✕</button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <div style={{ padding: '10px 14px', borderTop: extraProducts.length > 0 ? '1px solid #f8fafc' : 'none', background: '#fafbfc' }}>
                                      <select value="" onChange={e => {
                                        const prod = productItems.find((p: any) => p.id === e.target.value);
                                        if (!prod || bkSessProducts.find(r => r.productId === prod.id)) return;
                                        setBkSessProducts(prev => [...prev, { productId: prod.id, productName: prod.name, quantity: 1, uom: prod.uom }]);
                                      }}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px dashed #e2e8f0', borderRadius: 8, fontSize: 13, color: '#94a3b8', background: 'transparent', outline: 'none' }}>
                                        <option value="">+ Add product</option>
                                        {productItems.filter((p: any) => !bkSessProducts.find(r => r.productId === p.id)).map((p: any) => (
                                          <option key={p.id} value={p.id}>{p.name}{p.uom ? ` (${p.uom})` : ''}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '16px 28px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 12, flexShrink: 0, background: '#fafbfc' }}>
                              <button onClick={() => setBkSessionModal(null)}
                                style={{ padding: '11px 28px', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                                Cancel
                              </button>
                              <button disabled={bkSessSaving} onClick={handleSave}
                                style={{ flex: 1, padding: '11px 24px', background: bkSessSaving ? '#94a3b8' : 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)', color: '#fff', border: 'none', borderRadius: 9, cursor: bkSessSaving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
                                {bkSessSaving ? 'Saving…' : isEdit ? 'Update Session' : 'Start Session'}
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })()}

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
                    {payModalBooking && (() => {
                      const isMultiItem = (payModalBooking.items?.length ?? 0) > 1;
                      const payAmtPaise = Math.round(parseFloat(payInput) * 100) || 0;
                      const allocTotal = Object.values(payAllocations).reduce((s, v) => s + (Math.round(parseFloat(v) * 100) || 0), 0);
                      const allocMismatch = isMultiItem && payAmtPaise > 0 && allocTotal !== payAmtPaise;
                      const closePayModal = () => { setPayModalBooking(null); setPayInput(''); setPayMethod('cash'); setPayAllocations({}); };
                      return (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ background: '#fff', borderRadius: 8, padding: 28, minWidth: 380, maxWidth: 560, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
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
                            <div style={{ marginBottom: 12 }}>
                              {(() => {
                                const balanceRupees = Math.max(0, (payModalBooking.netAmount ?? 0) - (payModalBooking.paidAmount ?? 0)) / 100;
                                const enteredAmt = parseFloat(payInput) || 0;
                                const isOverLimit = enteredAmt > balanceRupees && balanceRupees > 0;
                                return (
                                  <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                      <label style={{ fontSize: 12, color: '#555' }}>Amount to Pay Now (₹)</label>
                                      <button
                                        type="button"
                                        onClick={() => setPayInput(String(balanceRupees))}
                                        style={{ fontSize: 11, color: '#1677ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                                      >
                                        Full Amount
                                      </button>
                                    </div>
                                    <InputNumber
                                      style={{ width: '100%' }}
                                      status={isOverLimit ? 'error' : undefined}
                                      min={0.01}
                                      max={balanceRupees}
                                      precision={2}
                                      value={payInput ? parseFloat(payInput) || undefined : undefined}
                                      onChange={v => {
                                        if (v == null) { setPayInput(''); return; }
                                        if (v > balanceRupees) { setPayInput(String(balanceRupees)); return; }
                                        setPayInput(String(v));
                                      }}
                                      formatter={v => v !== undefined && v !== '' ? Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : ''}
                                      parser={v => (v?.replace(/[^0-9.]/g, '') ?? '') as unknown as number}
                                    />
                                    {isOverLimit && (
                                      <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 3 }}>
                                        Cannot exceed balance of ₹{balanceRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <div style={{ marginBottom: 14 }}>
                              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Payment Mode</label>
                              <Select
                                value={payMethod}
                                onChange={setPayMethod}
                                style={{ width: '100%' }}
                                options={PAYMENT_METHODS.map(m => ({ label: titleCase(m), value: m }))}
                              />
                            </div>
                            {isMultiItem && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, color: '#555', fontWeight: 500, marginBottom: 8 }}>Service-wise Allocation</div>
                                <div style={{ border: '1px solid #e8e8e8', borderRadius: 4, overflow: 'hidden' }}>
                                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                                        <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: '#555' }}>Service</th>
                                        <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 500, color: '#555' }}>Total (₹)</th>
                                        <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 500, color: '#555' }}>Collected (₹)</th>
                                        <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 500, color: '#555' }}>Balance (₹)</th>
                                        <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 500, color: '#555' }}>Allocate Now</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(payModalBooking.items ?? []).map((it: any) => {
                                        const bal = Math.max(0, it.lineTotal - it.paidAmount);
                                        return (
                                          <tr key={it.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '6px 10px' }}>{it.service}</td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>{(it.lineTotal / 100).toLocaleString('en-IN')}</td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: '#2e7d32' }}>{(it.paidAmount / 100).toLocaleString('en-IN')}</td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: bal > 0 ? '#c62828' : '#2e7d32' }}>{(bal / 100).toLocaleString('en-IN')}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                                              <InputNumber
                                                size="small"
                                                min={0}
                                                max={bal / 100}
                                                precision={2}
                                                value={payAllocations[it.id] !== undefined ? parseFloat(payAllocations[it.id]) || 0 : 0}
                                                onChange={v => setPayAllocations(prev => ({ ...prev, [it.id]: String(v ?? 0) }))}
                                                style={{ width: 80 }}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{ background: '#fafafa', borderTop: '1px solid #e8e8e8' }}>
                                        <td colSpan={4} style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 500, color: '#555' }}>Total allocated:</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: allocMismatch ? '#c62828' : '#2e7d32' }}>
                                          ₹{(allocTotal / 100).toLocaleString('en-IN')}
                                          {allocMismatch && <div style={{ fontSize: 11, fontWeight: 400, color: '#c62828' }}>must equal ₹{(payAmtPaise / 100).toLocaleString('en-IN')}</div>}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <Button onClick={closePayModal}>Cancel</Button>
                              <Button
                                type="primary"
                                loading={bookingAction.isPending}
                                style={{ background: '#d32f2f', borderColor: '#d32f2f' }}
                                onClick={() => {
                                  const amt = Math.round(parseFloat(payInput) * 100);
                                  if (!amt || amt <= 0) return;
                                  const maxAmt = Math.max(0, (payModalBooking.netAmount ?? 0) - (payModalBooking.paidAmount ?? 0));
                                  if (amt > maxAmt) { message.error('Amount cannot exceed the balance due.'); return; }
                                  if (allocMismatch) {
                                    message.error('Allocation total must equal the payment amount');
                                    return;
                                  }
                                  const serviceAllocations = isMultiItem
                                    ? Object.entries(payAllocations)
                                        .map(([bookingItemId, v]) => ({ bookingItemId, amount: Math.round(parseFloat(v) * 100) || 0 }))
                                        .filter(a => a.amount > 0)
                                    : (payModalBooking.items?.length === 1
                                        ? [{ bookingItemId: payModalBooking.items[0].id, amount: amt }]
                                        : undefined);
                                  bookingAction.mutate(
                                    { bookingId: payModalBooking.id, action: 'pay', amount: amt, paymentMode: payMethod, serviceAllocations },
                                    {
                                      onSuccess: () => {
                                        message.success('Payment recorded successfully');
                                        closePayModal();
                                      },
                                      onError: (e: unknown) => {
                                        message.error(e instanceof ApiClientError ? e.message : 'Failed to record payment');
                                      },
                                    }
                                  );
                                }}
                              >
                                Confirm Payment
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {expandedModuleView === 'packages' && (
                <div>
                  {/* Add Session Modal — wide rectangle layout */}
                  <Modal
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{sessionModalPkg?.name ?? 'Use Session'}</div>
                          <div style={{ fontSize: 12, color: '#888', fontWeight: 400, marginTop: 2 }}>Record a session for this package</div>
                        </div>
                        {sessionModalPkg && (() => {
                          const total = sessionModalPkg.totalSessions ?? 0;
                          const used  = sessionModalPkg.usedSessions ?? 0;
                          const rem   = Math.max(0, total - used);
                          return (
                            <div style={{ display: 'flex', gap: 0, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
                              {[
                                { label: 'Total', value: total, color: '#1677ff' },
                                { label: 'Used', value: used, color: '#595959' },
                                { label: 'Remaining', value: rem, color: rem === 0 ? '#ff4d4f' : '#52c41a' },
                              ].map(({ label, value, color }, i) => (
                                <div key={label} style={{ textAlign: 'center', borderLeft: i > 0 ? '1px solid #f0f0f0' : 'none', padding: '4px 16px' }}>
                                  <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                                  <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>{label}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    }
                    open={!!sessionModalPkg}
                    onCancel={() => {
                      setSessionModalPkg(null);
                      setSessionDate(new Date().toISOString().split('T')[0]);
                      setSessionStaff('');
                      setSessionRemarks('');
                      setSessionStatus('completed');
                    }}
                    confirmLoading={sessionSaving}
                    okText="Save Session"
                    width={920}
                    styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', padding: '16px 24px' } }}
                    onOk={async () => {
                      if (!sessionDate) { message.error('Select a session date'); return; }
                      setSessionSaving(true);
                      try {
                        await addSession.mutateAsync({
                          sessionDate: new Date(sessionDate).toISOString(),
                          staffName: sessionStaff || undefined,
                          status: sessionStatus,
                          remarks: sessionRemarks || undefined,
                        });
                        const successMsg = sessionStatus === 'completed'
                          ? 'Session completed — token deducted'
                          : sessionStatus === 'no_show'
                          ? 'No-show recorded'
                          : sessionStatus === 'cancelled'
                          ? 'Session cancelled'
                          : 'Session rescheduled';
                        message.success(successMsg);
                        setSessionModalPkg(null);
                        setSessionDate(new Date().toISOString().split('T')[0]);
                        setSessionStaff('');
                        setSessionRemarks('');
                        setSessionStatus('completed');
                      } catch (e) {
                        message.error(e instanceof ApiClientError ? e.message : 'Could not save session');
                      } finally {
                        setSessionSaving(false);
                      }
                    }}
                  >
                    {/* Wide 3-column layout: form fields | service products | package extras */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

                      {/* Column 1: Form inputs (fixed 220px) */}
                      <div style={{ width: 220, flexShrink: 0 }}>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#555' }}>Status <span style={{ color: 'red' }}>*</span></label>
                          <select value={sessionStatus} onChange={e => setSessionStatus(e.target.value as typeof sessionStatus)}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13, background: '#fff' }}>
                            <option value="completed">Completed</option>
                            <option value="no_show">No Show</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rescheduled">Rescheduled</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#555' }}>Date <span style={{ color: 'red' }}>*</span></label>
                          <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#555' }}>Staff / Therapist</label>
                          <input type="text" value={sessionStaff} onChange={e => setSessionStaff(e.target.value)} placeholder="Name"
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#555' }}>Remarks</label>
                          <textarea value={sessionRemarks} onChange={e => setSessionRemarks(e.target.value)} rows={3}
                            placeholder="Optional notes"
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>

                        {/* Deduction note */}
                        {sessionModalPkg && (
                          <div style={{
                            background: sessionStatus === 'completed' ? '#f6ffed' : '#fff7e6',
                            border: `1px solid ${sessionStatus === 'completed' ? '#b7eb8f' : '#ffd591'}`,
                            borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#555',
                          }}>
                            {sessionStatus === 'completed' ? (
                              <>
                                <strong style={{ color: '#52c41a' }}>1 session deducted</strong>
                                <div style={{ marginTop: 2 }}><strong>{Math.max(0, (sessionModalPkg.totalSessions ?? 0) - (sessionModalPkg.usedSessions ?? 0) - 1)}</strong> remaining after save</div>
                              </>
                            ) : (
                              <><strong style={{ color: '#fa8c16' }}>No deduction</strong> for &quot;{sessionStatus.replace('_', ' ')}&quot;</>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Column 2: Service Products (auto-consumed) */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1677ff', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1677ff', textTransform: 'uppercase', letterSpacing: 0.4 }}>Service Products</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Consumed from inventory automatically each session</div>

                        {pkgProductsLoading ? (
                          <div style={{ textAlign: 'center', padding: '16px 0' }}><Spin size="small" /></div>
                        ) : pkgProductGroups.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#bfbfbf', fontStyle: 'italic', padding: '10px 12px', border: '1px solid #d6e4ff', borderRadius: 8, background: '#f0f5ff' }}>
                            No products mapped to services in this package.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {pkgProductGroups.map((group: ServiceProductGroup) => (
                              <div key={group.serviceId} style={{ border: '1px solid #d6e4ff', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ background: '#d6e4ff', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, fontSize: 12, color: '#003eb3' }}>{group.serviceName}</span>
                                  <span style={{ fontSize: 10, color: '#4096ff', background: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                                    {group.effectiveSessions} session{group.effectiveSessions !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {group.products.map((r: SessionProduct, ri: number) => {
                                  const needed = r.quantityPerSession;
                                  const uom = r.consumptionUom ?? r.uom ?? '';
                                  const cu = r.consumableUnit;
                                  const isLow = cu ? cu.remaining < needed : r.isLowStock;
                                  const stockLabel = cu
                                    ? (cu.remaining < needed
                                        ? `⚠ Only ${cu.remaining.toFixed(1)} ${uom} left`
                                        : `✓ ${cu.remaining.toFixed(1)} ${uom} available`)
                                    : (r.availableStock !== null
                                        ? (isLow ? `⚠ Low: ${r.availableStock} ${uom}` : `✓ Stock: ${r.availableStock} ${uom}`)
                                        : null);
                                  return (
                                    <div key={r.productId} style={{
                                      padding: '7px 10px', borderTop: ri > 0 ? '1px solid #d6e4ff' : 'none',
                                      background: isLow ? '#fff2f0' : '#f0f5ff',
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                                    }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 12, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.productName}</div>
                                        {stockLabel && <div style={{ fontSize: 11, marginTop: 1, color: isLow ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>{stockLabel}</div>}
                                      </div>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1677ff', background: '#e6f0ff', padding: '2px 8px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {needed} {uom}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Column 3: Package Extra Products (given to customer) */}
                      <div style={{ width: 220, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#52c41a', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#389e0d', textTransform: 'uppercase', letterSpacing: 0.4 }}>Given to Customer</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Additional products from this package</div>

                        {(() => {
                          const extras: any[] = sessionModalPkg?.master?.inventoryItems ?? [];
                          if (extras.length === 0) {
                            return (
                              <div style={{ fontSize: 12, color: '#bfbfbf', fontStyle: 'italic', padding: '10px 12px', border: '1px solid #d9f7be', borderRadius: 8, background: '#f6ffed', textAlign: 'center' }}>
                                No extra products added to this package.
                              </div>
                            );
                          }
                          return (
                            <div style={{ border: '1px solid #d9f7be', borderRadius: 8, overflow: 'hidden', background: '#f6ffed' }}>
                              {extras.map((item: any, ei: number) => (
                                <div key={item.productId ?? ei} style={{ padding: '8px 10px', borderTop: ei > 0 ? '1px solid #d9f7be' : 'none' }}>
                                  <div style={{ fontWeight: 600, fontSize: 12, color: '#111' }}>{item.productName ?? item.name}</div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#389e0d', marginTop: 2 }}>
                                    {item.quantityPerSession ?? item.qty ?? 1} {item.uom ?? ''}
                                    <span style={{ fontWeight: 400, color: '#888', fontSize: 11, marginLeft: 4 }}>per session</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  </Modal>

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
                      {packages.map((pkg: any) => {
                        const inv = (pkg.invoices ?? [])[0];
                        const total    = inv ? inv.total    : (pkg.price ?? 0);
                        const paid     = inv ? inv.amountPaid : 0;
                        const balance  = Math.max(0, total - paid);
                        const remaining = (pkg.totalSessions ?? 0) - (pkg.usedSessions ?? 0);
                        const statusColors: Record<string, { bg: string; color: string; border: string }> = {
                          active:    { bg: '#f6ffed', color: '#52c41a', border: '#b7eb8f' },
                          completed: { bg: '#e6f7ff', color: '#1677ff', border: '#91caff' },
                          expired:   { bg: '#fff1f0', color: '#f5222d', border: '#ffa39e' },
                          cancelled: { bg: '#fff2e8', color: '#fa8c16', border: '#ffbb96' },
                        };
                        const sc = statusColors[pkg.status] ?? statusColors.active;
                        return (
                          <Card key={pkg.id} style={{ marginBottom: 12 }} styles={{ body: { padding: '14px 16px' } }}>
                            {/* Header row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <div>
                                <p style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>{pkg.name || 'Package'}</p>
                                {pkg.notes && <p style={{ fontSize: 12, color: colors.text.secondary, margin: '2px 0 0' }}>{pkg.notes}</p>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                  {pkg.status ? pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1) : '—'}
                                </span>
                                {remaining > 0 && pkg.status === 'active' && (
                                  <Button size="small" type="primary"
                                    style={{ fontSize: 11, height: 24, padding: '0 10px', background: colors.gold.primary, borderColor: colors.gold.primary }}
                                    onClick={() => { setSessionModalPkg(pkg); setSessionDate(new Date().toISOString().split('T')[0]); setSessionStaff(''); setSessionRemarks(''); }}>
                                    + Use Session
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Sessions progress bar */}
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: colors.text.secondary }}>Sessions Used</span>
                                <span style={{ fontWeight: 700 }}>{pkg.usedSessions ?? 0} / {pkg.totalSessions ?? 0}</span>
                              </div>
                              <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: 3,
                                  width: `${pkg.totalSessions ? Math.min(100, ((pkg.usedSessions ?? 0) / pkg.totalSessions) * 100) : 0}%`,
                                  background: remaining === 0 ? '#52c41a' : colors.gold.primary,
                                  transition: 'width 0.3s',
                                }} />
                              </div>
                              <div style={{ fontSize: 11, color: remaining > 0 ? colors.gold.primary : '#52c41a', marginTop: 3, fontWeight: 600 }}>
                                {remaining > 0 ? `${remaining} session${remaining !== 1 ? 's' : ''} remaining` : 'All sessions completed'}
                              </div>
                            </div>

                            {/* Amount details */}
                            <div style={{ display: 'flex', gap: 16, fontSize: 13, padding: '10px 0', borderTop: '1px dashed #e8e8e8', borderBottom: '1px dashed #e8e8e8', marginBottom: 10 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: colors.text.secondary }}>Package Total</div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>₹{Math.round(total / 100).toLocaleString('en-IN')}</div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: colors.text.secondary }}>Amount Paid</div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a6b3c' }}>₹{Math.round(paid / 100).toLocaleString('en-IN')}</div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: colors.text.secondary }}>Balance Due</div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: balance > 0 ? '#e53935' : '#1a6b3c' }}>
                                  ₹{Math.round(balance / 100).toLocaleString('en-IN')}
                                </div>
                              </div>
                              {pkg.expiresAt && (
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 11, color: colors.text.secondary }}>Expires</div>
                                  <div style={{ fontWeight: 600 }}>{new Date(pkg.expiresAt).toLocaleDateString('en-GB')}</div>
                                </div>
                              )}
                            </div>

                            {/* Session history */}
                            {pkg.sessionEntries && pkg.sessionEntries.length > 0 && (
                              <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, margin: '0 0 6px' }}>Session History</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {pkg.sessionEntries.map((se: any) => (
                                    <div key={se.id} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '4px 8px', background: '#fafafa', borderRadius: 4 }}>
                                      <span style={{ color: colors.text.secondary, minWidth: 20 }}>#{se.sessionNumber}</span>
                                      <span style={{ fontWeight: 500 }}>{new Date(se.sessionDate).toLocaleDateString('en-GB')}</span>
                                      {se.staffName && <span style={{ color: colors.text.secondary }}>{se.staffName}</span>}
                                      <span style={{
                                        marginLeft: 'auto', fontSize: 11, padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                                        background: se.status === 'completed' ? '#f6ffed' : '#fff7e6',
                                        color: se.status === 'completed' ? '#52c41a' : '#fa8c16',
                                      }}>{se.status}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
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
                                {/* Print */}
                                <button
                                  title="Print / Save PDF"
                                  onClick={() => printPrescription(rx)}
                                  style={{ background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 6, color: '#1d39c4', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
                                >
                                  🖨️ Print
                                </button>
                                {/* WhatsApp */}
                                <button
                                  title="Share on WhatsApp"
                                  onClick={() => {
                                    const text = buildRxText(rx);
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, color: '#389e0d', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
                                >
                                  💬 WhatsApp
                                </button>
                                {/* Copy */}
                                <button
                                  title="Copy text"
                                  onClick={() => {
                                    navigator.clipboard.writeText(buildRxText(rx));
                                    message.success('Prescription text copied');
                                  }}
                                  style={{ background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 6, color: '#555', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
                                >
                                  📋 Copy
                                </button>
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
                  ) : (
                    <HistoryTimeline
                      history={history as any[]}
                      selectedDetail={selectedDetail}
                      detailType={detailType}
                      setSelectedDetail={setSelectedDetail}
                      setDetailType={setDetailType}
                      formatDate={formatDate}
                    />
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
                <PackagesTab customerId={id} customerName={customer?.name ?? ''} />
              )}

              {expandedModuleView === 'new-booking' && (
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

                      {/* ── Header fields — each controlled by a category flag ── */}
                      {(effectiveFlags.hasConsultant || effectiveFlags.hasDoctor || effectiveFlags.hasTeleCaller || effectiveFlags.hasMedia || effectiveFlags.hasTokenReference || effectiveFlags.hasDND) && (
                      <div style={{ padding: '10px 16px', borderBottom: `1px dashed ${colors.border}`, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                        {effectiveFlags.hasConsultant && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 80 }}>Consultant:</label>
                            <select value={bookingData.consultant} onChange={(e) => setBookingData({ ...bookingData, consultant: e.target.value })}
                              style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, minWidth: 160 }}>
                              <option value="">Select</option>
                              {(branchStaff ?? []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                          </div>
                        )}
                        {effectiveFlags.hasDoctor && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 50 }}>Doctor:</label>
                            <select value={bookingData.doctor} onChange={(e) => setBookingData({ ...bookingData, doctor: e.target.value })}
                              style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, minWidth: 160 }}>
                              <option value="">Select</option>
                              {(branchStaff ?? []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                          </div>
                        )}
                        {effectiveFlags.hasTeleCaller && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 80 }}>Tele-Caller:</label>
                            <select value={bookingData.teleCaller} onChange={(e) => setBookingData({ ...bookingData, teleCaller: e.target.value })}
                              style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, minWidth: 160 }}>
                              <option value="">Select</option>
                              {(branchStaff ?? []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                          </div>
                        )}
                        {effectiveFlags.hasMedia && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 55 }}>Source:</label>
                            <select value={bookingData.source} onChange={(e) => setBookingData({ ...bookingData, source: e.target.value })}
                              style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, minWidth: 140 }}>
                              <option value="">Select</option>
                              {['Walk-in','Phone Call','WhatsApp','Online','Referral','Social Media','Email'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        )}
                        {effectiveFlags.hasTokenReference && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 65 }}>Token No.:</label>
                            <input value={bookingData.tokenRef} onChange={(e) => setBookingData({ ...bookingData, tokenRef: e.target.value })}
                              placeholder="Token / Reference" style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, width: 130 }} />
                          </div>
                        )}
                        {effectiveFlags.hasDND && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 4, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: '#e65100', fontWeight: 700 }}>DND</span>
                            <span style={{ fontSize: 11, color: '#e65100' }}>Do Not Disturb</span>
                          </div>
                        )}
                      </div>
                      )}

                      {/* ── Package Quick-Add ── */}
                      {packageMasters.length > 0 && (() => {
                        // Group packages by their primary service category
                        const grouped: Record<string, typeof packageMasters> = {};
                        packageMasters.forEach(pkg => {
                          // Derive category from the first service found in branchServices
                          const firstSvc = (branchServices ?? []).find(s =>
                            pkg.services.some(ps => ps.name === s.name)
                          );
                          const cat = firstSvc?.categoryName ?? 'Packages';
                          if (!grouped[cat]) grouped[cat] = [];
                          grouped[cat].push(pkg);
                        });
                        const groupEntries = Object.entries(grouped).sort(([a], [b]) =>
                          a === 'Packages' ? 1 : b === 'Packages' ? -1 : a.localeCompare(b)
                        );
                        return (
                          <div style={{ padding: '10px 16px', borderBottom: `1px dashed ${colors.border}`, background: '#f0f7ff', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', whiteSpace: 'nowrap' }}>📦 Add Package:</span>
                            <select
                              value={selectedPackageId}
                              onChange={e => setSelectedPackageId(e.target.value)}
                              style={{ flex: 1, minWidth: 200, padding: '5px 8px', border: `1px solid #90caf9`, borderRadius: 4, fontSize: 12, background: '#fff' }}
                            >
                              <option value="">— Select a package —</option>
                              {groupEntries.map(([cat, pkgs]) => (
                                <optgroup key={cat} label={cat}>
                                  {pkgs.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} — {p.services.length} service(s), {p.defaultSessions} session(s) · ₹{(p.price / 100).toLocaleString('en-IN')}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <button
                              onClick={handleAddPackage}
                              disabled={!selectedPackageId}
                              style={{
                                padding: '5px 14px', fontSize: 12, fontWeight: 600,
                                background: selectedPackageId ? '#1565c0' : '#ccc',
                                color: '#fff', border: 'none', borderRadius: 4,
                                cursor: selectedPackageId ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                              }}
                            >
                              + Add to Booking
                            </button>
                            {selectedPackageId && (() => {
                              const pkg = packageMasters.find(p => p.id === selectedPackageId);
                              if (!pkg) return null;
                              return (
                                <div style={{ fontSize: 11, color: '#1565c0', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 4, padding: '4px 10px', lineHeight: 1.6 }}>
                                  <strong>{pkg.name}</strong>: {pkg.services.map(s => s.name).join(', ')}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}

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
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#e53935', fontWeight: 600 }}>&#x1F4C2; Category</th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#e53935', fontWeight: 600 }}>&#x1F4CB; Service</th>
                              {effectiveFlags.hasQuantity && <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#e53935', fontWeight: 600 }}>Quantity</th>}
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#e53935', fontWeight: 600 }}>&#x20B9; Amount</th>
                              {effectiveFlags.hasIndividualDiscount && <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#e53935', fontWeight: 600 }}>Disc%</th>}
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#333', fontWeight: 600 }}>&#x2295; Total</th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#7b1fa2', fontWeight: 600 }}>
                                GST %
                                <div style={{ fontSize: 10, fontWeight: 400, color: '#888', marginTop: 2 }}>from service</div>
                              </th>
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#7b1fa2', fontWeight: 600 }}>
                                Tax Amt
                                <div style={{ fontSize: 10, fontWeight: 400, color: '#888', marginTop: 2 }}>₹ per row</div>
                              </th>
                              {effectiveFlags.hasServiceBy && <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, textAlign: 'center', color: '#1565c0', fontWeight: 600 }}>Service By</th>}
                              <th style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, textAlign: 'center', color: '#333', fontWeight: 600 }}>Remove</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookingRows.length === 0 ? (
                              <tr>
                                <td colSpan={8 + (effectiveFlags.hasQuantity ? 1 : 0) + (effectiveFlags.hasIndividualDiscount ? 1 : 0) + (effectiveFlags.hasServiceBy ? 1 : 0)} style={{ padding: 20, textAlign: 'center', color: colors.text.secondary, borderTop: `1px solid ${colors.border}` }}>
                                  No rows added. Click the button below to add a service.
                                </td>
                              </tr>
                            ) : bookingRows.map((row, idx) => {
                              const isPackageRow = !!row._isPackage;
                              const pkgMaster = isPackageRow ? packageMasters.find(p => p.name === row.service) : null;

                              if (isPackageRow) {
                                /* ── Package row: static display, no service dropdowns ── */
                                const taxPct = 0; // package price is all-inclusive, never tax on top
                                const linePaise = Math.round(row.quantity * row.amount * 100);
                                const taxAmt = taxPct
                                  ? (row.taxType === 'inclusive'
                                      ? linePaise - Math.round((linePaise * 100) / (100 + taxPct))
                                      : Math.round((linePaise * taxPct) / 100))
                                  : 0;
                                return (
                                  <tr key={row.id} style={{ borderTop: `1px solid ${colors.border}`, background: '#f0f7ff' }}>
                                    {/* S.No */}
                                    <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}` }}>
                                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1565c0', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{idx + 1}</div>
                                    </td>
                                    {/* Category — static "Package" badge */}
                                    <td style={{ padding: '6px 10px', borderRight: `1px solid ${colors.border}`, textAlign: 'center' }}>
                                      <span style={{ display: 'inline-block', background: '#1565c0', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>📦 Package</span>
                                    </td>
                                    {/* Service — package name + included services */}
                                    <td style={{ padding: '6px 10px', borderRight: `1px solid ${colors.border}` }}>
                                      <div style={{ fontWeight: 700, fontSize: 12, color: '#1565c0' }}>{row.service}</div>
                                      {pkgMaster && pkgMaster.services.length > 0 && (
                                        <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                          {pkgMaster.services.map((s: { id: string; name: string }) => (
                                            <span key={s.id} style={{ fontSize: 10, background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', borderRadius: 3, padding: '1px 5px' }}>{s.name}</span>
                                          ))}
                                        </div>
                                      )}
                                      {pkgMaster && (
                                        <div style={{ marginTop: 3, fontSize: 10, color: '#666' }}>
                                          {pkgMaster.defaultSessions} session(s)
                                        </div>
                                      )}
                                    </td>
                                    {/* Quantity — always 1 for package, not editable */}
                                    {effectiveFlags.hasQuantity && (
                                      <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}`, color: '#555', fontSize: 12 }}>1</td>
                                    )}
                                    {/* Amount — read-only */}
                                    <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                      <input
                                        type="text"
                                        readOnly
                                        value={row.amount}
                                        style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'right', fontSize: 12, background: '#f5f5f5', color: '#555', cursor: 'not-allowed' }}
                                      />
                                    </td>
                                    {/* Disc% */}
                                    {effectiveFlags.hasIndividualDiscount && (
                                      <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                        <input type="number" min="0" max="100" value={row.discPct} onChange={(e) => handleRowChange(row.id, 'discPct', parseFloat(e.target.value) || 0)} style={{ width: 56, padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'center', fontSize: 12 }} />
                                      </td>
                                    )}
                                    {/* Total */}
                                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#1565c0', borderRight: `1px solid ${colors.border}` }}>
                                      {(row.quantity * row.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </td>
                                    {/* GST % — from package config */}
                                    <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}` }}>
                                      {taxPct ? (
                                        <span style={{ display: 'inline-block', background: row.taxType === 'inclusive' ? '#f3e5f5' : '#e8eaf6', color: row.taxType === 'inclusive' ? '#7b1fa2' : '#3949ab', border: `1px solid ${row.taxType === 'inclusive' ? '#ce93d8' : '#9fa8da'}`, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                          {taxPct}%&nbsp;<span style={{ fontWeight: 400, fontSize: 10 }}>{row.taxType === 'inclusive' ? 'Incl.' : 'Excl.'}</span>
                                        </span>
                                      ) : <span style={{ fontSize: 11, color: '#ccc' }}>—</span>}
                                    </td>
                                    {/* Tax Amt — package row */}
                                    <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}`, color: '#7b1fa2', fontWeight: 600, fontSize: 11 }}>
                                      {taxAmt ? `₹${(taxAmt / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : <span style={{ color: '#ccc' }}>—</span>}
                                    </td>
                                    {/* Service By */}
                                    {effectiveFlags.hasServiceBy && (
                                      <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                        <select value={row.serviceBy} onChange={(e) => handleRowChange(row.id, 'serviceBy', e.target.value)} style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12 }}>
                                          <option value="">Select</option>
                                          {(branchStaff ?? []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                        </select>
                                      </td>
                                    )}
                                    {/* Remove */}
                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                      <div onClick={() => handleRemoveRow(row.id)} style={{ width: 22, height: 22, borderRadius: '50%', background: '#f44336', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✕</div>
                                    </td>
                                  </tr>
                                );
                              }

                              /* ── Regular service row ── */
                              return (
                                <tr key={row.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                                  {/* S.No */}
                                  <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}` }}>
                                    <div style={{
                                      width: 26, height: 26, borderRadius: '50%',
                                      background: '#4caf50', color: '#fff',
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      fontWeight: 700, fontSize: 12,
                                    }}>{idx + 1}</div>
                                  </td>
                                  {/* Category */}
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    {(() => {
                                      const cats = [...new Map((branchServices ?? []).filter(s => s.categoryName).map(s => [s.categoryId, s.categoryName])).entries()];
                                      return (
                                        <select
                                          value={row.category}
                                          onChange={(e) => handleRowChange(row.id, 'category', e.target.value)}
                                          style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12 }}
                                        >
                                          <option value="">All Categories</option>
                                          {cats.map(([catId, catName]) => (
                                            <option key={catId} value={catName ?? ''}>{catName}</option>
                                          ))}
                                        </select>
                                      );
                                    })()}
                                  </td>
                                  {/* Service — filtered by selected category */}
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    <select
                                      value={row.service}
                                      onChange={(e) => handleRowChange(row.id, 'service', e.target.value)}
                                      style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12 }}
                                    >
                                      <option value="">Select Service</option>
                                      {(branchServices ?? [])
                                        .filter(svc => !row.category || svc.categoryName === row.category)
                                        .map((svc) => (
                                          <option key={svc.id} value={svc.name}>
                                            {svc.hasLowStock ? `⚠ ${svc.name}` : svc.name}
                                          </option>
                                        ))}
                                    </select>
                                    {/* F2: Inventory consumption info panel */}
                                    {(() => {
                                      const svc = (branchServices ?? []).find((s) => s.name === row.service);
                                      if (!svc || !svc.inventoryItems?.length) return null;
                                      return (
                                        <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.6 }}>
                                          {svc.inventoryItems.map((item: BranchInventoryItem) => (
                                            <div key={item.productId} style={{ color: item.isLowStock ? '#e67e22' : '#27ae60' }}>
                                              {item.isLowStock ? '⚠' : '✓'} {item.productName} — {item.quantityPerSession} {item.productUom}/session
                                              <span style={{ color: '#888', marginLeft: 4 }}>
                                                (in stock: {item.onHandQty} {item.productUom})
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  {/* Quantity */}
                                  {effectiveFlags.hasQuantity && (
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={row.quantity}
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/[^0-9]/g, '');
                                        handleRowChange(row.id, 'quantity', v === '' ? '' : parseInt(v));
                                      }}
                                      onBlur={() => {
                                        if (!row.quantity || Number(row.quantity) < 1) handleRowChange(row.id, 'quantity', 1);
                                      }}
                                      style={{ width: 60, padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'center', fontSize: 12 }}
                                    />
                                  </td>
                                  )}
                                  {/* Amount */}
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={row.amount}
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/[^0-9.]/g, '');
                                        handleRowChange(row.id, 'amount', v);
                                      }}
                                      onBlur={(e) => handleRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                                      disabled={!effectiveFlags.isAmountEditable}
                                      style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'right', fontSize: 12, background: effectiveFlags.isAmountEditable ? undefined : '#f5f5f5', cursor: effectiveFlags.isAmountEditable ? undefined : 'not-allowed' }}
                                    />
                                  </td>
                                  {/* Disc% — per-row discount */}
                                  {effectiveFlags.hasIndividualDiscount && (
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    <input
                                      type="number" min="0" max="100"
                                      value={row.discPct}
                                      onChange={(e) => handleRowChange(row.id, 'discPct', parseFloat(e.target.value) || 0)}
                                      style={{ width: 56, padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'center', fontSize: 12 }}
                                    />
                                  </td>
                                  )}
                                  {/* Total (with individual discount applied) */}
                                  <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: '#e53935', borderRight: `1px solid ${colors.border}` }}>
                                    {(() => {
                                      const base = row.quantity * row.amount;
                                      const disc = effectiveFlags.hasIndividualDiscount ? (row.discPct ?? 0) : 0;
                                      return (base * (1 - disc / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 });
                                    })()}
                                  </td>
                                  {/* GST % — read-only from service config */}
                                  <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}` }}>
                                    {row.service && row.taxPercent ? (
                                      <span style={{
                                        display: 'inline-block',
                                        background: row.taxType === 'inclusive' ? '#f3e5f5' : '#e8eaf6',
                                        color: row.taxType === 'inclusive' ? '#7b1fa2' : '#3949ab',
                                        border: `1px solid ${row.taxType === 'inclusive' ? '#ce93d8' : '#9fa8da'}`,
                                        borderRadius: 10,
                                        padding: '2px 8px',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                      }}>
                                        {row.taxPercent}%&nbsp;
                                        <span style={{ fontWeight: 400, fontSize: 10 }}>
                                          {row.taxType === 'inclusive' ? 'Incl.' : 'Excl.'}
                                        </span>
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: 11, color: '#ccc' }}>—</span>
                                    )}
                                  </td>
                                  {/* Tax Amt per row */}
                                  <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid ${colors.border}`, color: '#7b1fa2', fontWeight: 600, fontSize: 11 }}>
                                    {(() => {
                                      const pct = row.taxPercent ?? 0;
                                      if (!row.service || !pct) return <span style={{ fontSize: 11, color: '#ccc' }}>—</span>;
                                      const disc = effectiveFlags.hasIndividualDiscount ? (row.discPct ?? 0) : 0;
                                      const linePaise = Math.round(row.quantity * row.amount * (1 - disc / 100) * 100);
                                      const isInclusive = row.taxType === 'inclusive';
                                      const taxAmt = isInclusive
                                        ? linePaise - Math.round((linePaise * 100) / (100 + pct))
                                        : Math.round((linePaise * pct) / 100);
                                      return `₹${(taxAmt / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                                    })()}
                                  </td>
                                  {/* Service By — staff member performing the service */}
                                  {effectiveFlags.hasServiceBy && (
                                  <td style={{ padding: '6px 8px', borderRight: `1px solid ${colors.border}` }}>
                                    <select
                                      value={row.serviceBy}
                                      onChange={(e) => handleRowChange(row.id, 'serviceBy', e.target.value)}
                                      style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12 }}
                                    >
                                      <option value="">Select</option>
                                      {(branchStaff ?? []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                    </select>
                                  </td>
                                  )}
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

                      {/* Add row */}
                      <div style={{ padding: '8px 16px', borderBottom: `1px dashed ${colors.border}` }}>
                        <button
                          onClick={handleAddRow}
                          style={{ fontSize: 12, color: '#1890ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          + Add Row
                        </button>
                      </div>

                      {/* ── Complimentary Section ── */}
                      {(() => {
                        const COMP_PCT = 20;
                        const allCompServices = (branchServices ?? []).filter(s => s.hasComplementary && s.isActive);
                        const paidTotal = bookingRows.filter(r => r.service).reduce((s, r) => s + r.quantity * r.amount, 0);
                        const usedComp = complimentaryRows.reduce((s, r) => s + r.quantity * r.amount, 0);
                        const maxAllowed = paidTotal * (COMP_PCT / 100);
                        const remaining = Math.max(0, maxAllowed - usedComp);
                        const pct = maxAllowed > 0 ? Math.min(100, (usedComp / maxAllowed) * 100) : 0;
                        const limitReached = paidTotal > 0 && usedComp >= maxAllowed;
                        // Only show services whose per-unit price fits within the remaining limit
                        const eligibleServices = allCompServices.filter(s => (s.minPrice / 100) <= remaining && s.minPrice > 0);
                        const fmt = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 2 });

                        // Determine status
                        const noBillYet = paidTotal === 0;
                        const noCompConfigured = allCompServices.length === 0;
                        const noneEligible = !noBillYet && !noCompConfigured && eligibleServices.length === 0 && complimentaryRows.length === 0;
                        const canAdd = !noBillYet && !limitReached && eligibleServices.length > 0;

                        return (
                          <div style={{ borderBottom: `1px dashed ${colors.border}`, background: '#f9fbe7' }}>
                            {/* Header */}
                            <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid #dcedc8` }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#33691e' }}>🎁 Complimentary Items</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                {/* Limit progress bar — only when bill has items */}
                                {paidTotal > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 280 }}>
                                    <div style={{ flex: 1, background: '#c5e1a5', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#e53935' : '#558b2f', transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ fontSize: 11, color: pct >= 100 ? '#e53935' : '#33691e', whiteSpace: 'nowrap' }}>
                                      ₹{fmt(usedComp)} / ₹{fmt(maxAllowed)} ({COMP_PCT}% of bill)
                                    </span>
                                  </div>
                                )}
                                {canAdd && (
                                  <button
                                    onClick={handleAddComplementaryRow}
                                    style={{ fontSize: 12, color: '#33691e', background: 'none', border: '1px dashed #aed581', borderRadius: 4, cursor: 'pointer', padding: '3px 10px', fontWeight: 600 }}
                                  >
                                    + Add Complimentary Item
                                  </button>
                                )}
                                {limitReached && (
                                  <span style={{ fontSize: 11, background: '#e53935', color: '#fff', padding: '3px 10px', borderRadius: 4, fontWeight: 600 }}>
                                    Limit Reached
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status messages */}
                            {noBillYet && (
                              <div style={{ padding: '10px 16px', fontSize: 12, color: '#888', fontStyle: 'italic' }}>
                                Add billing services above to calculate complimentary eligibility.
                              </div>
                            )}
                            {!noBillYet && noCompConfigured && (
                              <div style={{ padding: '10px 16px', fontSize: 12, color: '#888' }}>
                                No complimentary-enabled services configured. Ask admin to enable Complimentary on services.
                              </div>
                            )}
                            {noneEligible && (
                              <div style={{ padding: '10px 14px', margin: '8px 16px', fontSize: 12, borderRadius: 6, background: '#fff3e0', border: '1px solid #ffcc80', color: '#e65100' }}>
                                ⚠️ No eligible complimentary items available for this billing amount.<br />
                                <span style={{ fontSize: 11, color: '#888', marginTop: 2, display: 'block' }}>
                                  Eligible limit: ₹{fmt(maxAllowed)} ({COMP_PCT}% of ₹{fmt(paidTotal)}). No configured service fits within this amount.
                                </span>
                              </div>
                            )}
                            {!noBillYet && !noCompConfigured && complimentaryRows.length === 0 && !noneEligible && !limitReached && (
                              <div style={{ padding: '10px 16px', fontSize: 12, color: '#888' }}>
                                Click &quot;+ Add Complimentary Item&quot; to apply (up to ₹{fmt(maxAllowed)}).
                              </div>
                            )}

                            {/* Rows table */}
                            {complimentaryRows.length > 0 && (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: '#f1f8e9' }}>
                                    <th style={{ padding: '6px 10px', borderBottom: `1px solid #dcedc8`, borderRight: `1px solid #dcedc8`, textAlign: 'center', width: 40, color: '#558b2f' }}>#</th>
                                    <th style={{ padding: '6px 10px', borderBottom: `1px solid #dcedc8`, borderRight: `1px solid #dcedc8`, color: '#558b2f' }}>Service</th>
                                    <th style={{ padding: '6px 10px', borderBottom: `1px solid #dcedc8`, borderRight: `1px solid #dcedc8`, textAlign: 'center', width: 80, color: '#558b2f' }}>Qty</th>
                                    <th style={{ padding: '6px 10px', borderBottom: `1px solid #dcedc8`, borderRight: `1px solid #dcedc8`, textAlign: 'right', width: 110, color: '#558b2f' }}>Value (₹)</th>
                                    <th style={{ padding: '6px 10px', borderBottom: `1px solid #dcedc8`, borderRight: `1px solid #dcedc8`, textAlign: 'center', width: 90, color: '#558b2f' }}>Bill Amount</th>
                                    <th style={{ padding: '6px 10px', borderBottom: `1px solid #dcedc8`, textAlign: 'center', width: 50, color: '#558b2f' }}>✕</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {complimentaryRows.map((cr, idx) => {
                                    // For an already-selected row, allow switching within eligibility
                                    const rowRemaining = maxAllowed - usedComp + (cr.quantity * cr.amount);
                                    const rowOptions = allCompServices.filter(s => s.minPrice > 0 && (s.name === cr.service || (s.minPrice / 100) <= rowRemaining));
                                    return (
                                      <tr key={cr.id} style={{ borderTop: `1px solid #dcedc8`, background: '#fff' }}>
                                        <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid #dcedc8`, color: '#558b2f', fontWeight: 700 }}>{idx + 1}</td>
                                        <td style={{ padding: '6px 8px', borderRight: `1px solid #dcedc8` }}>
                                          <select
                                            value={cr.service}
                                            onChange={(e) => handleComplementaryRowChange(cr.id, 'service', e.target.value)}
                                            style={{ width: '100%', padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, fontSize: 12, background: '#fff' }}
                                          >
                                            <option value="">— Select service —</option>
                                            {rowOptions.map(s => (
                                              <option key={s.id} value={s.name}>{s.name} (₹{fmt(s.minPrice / 100)})</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td style={{ padding: '6px 8px', borderRight: `1px solid #dcedc8` }}>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={cr.quantity}
                                            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); handleComplementaryRowChange(cr.id, 'quantity', v === '' ? 1 : parseInt(v)); }}
                                            style={{ width: 55, padding: '5px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'center', fontSize: 12 }}
                                          />
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: `1px solid #dcedc8`, color: '#555' }}>
                                          {cr.amount > 0 ? `₹${fmt(cr.quantity * cr.amount)}` : '—'}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: `1px solid #dcedc8` }}>
                                          <span style={{ fontSize: 11, background: '#2e7d32', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>FREE</span>
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                          <div onClick={() => handleRemoveComplementaryRow(cr.id)} style={{ width: 20, height: 20, borderRadius: '50%', background: '#f44336', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕</div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })()}

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

                        {/* Totals block with auto GST */}
                        {(() => {
                          const filledRows = bookingRows.filter(r => r.service);
                          let aggTaxable = 0, aggTax = 0;
                          for (const row of filledRows) {
                            const linePaise = Math.round(row.quantity * row.amount * 100);
                            const pct = row.taxPercent ?? 0;
                            if (!pct) { aggTaxable += linePaise; continue; }
                            const isInclusive = row.taxType === 'inclusive';
                            const taxableAmt = isInclusive ? Math.round((linePaise * 100) / (100 + pct)) : linePaise;
                            const taxAmt = isInclusive ? linePaise - taxableAmt : Math.round((linePaise * pct) / 100);
                            aggTaxable += taxableAmt;
                            aggTax += taxAmt;
                          }
                          const hasGst = aggTax > 0;
                          const grossTotal = (aggTaxable + aggTax) / 100;
                          const fmt = (p: number) => (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
                          return (
                            <div style={{ textAlign: 'right', fontSize: 13, lineHeight: 2 }}>
                              {hasGst ? (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                                    <span style={{ color: colors.text.secondary }}>Taxable Amount :</span>
                                    <span style={{ minWidth: 60, textAlign: 'right' }}>{fmt(aggTaxable)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                                    <span style={{ color: '#7b1fa2', fontWeight: 500 }}>GST :</span>
                                    <span style={{ minWidth: 60, textAlign: 'right', color: '#7b1fa2' }}>+{fmt(aggTax)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, borderTop: `1px dashed ${colors.border}`, paddingTop: 2 }}>
                                    <span style={{ color: colors.text.secondary, fontWeight: 600 }}>Total Amount :</span>
                                    <span style={{ minWidth: 60, textAlign: 'right', fontWeight: 600 }}>{grossTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                </>
                              ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                                  <span style={{ color: colors.text.secondary }}>Total Amount :</span>
                                  <span style={{ minWidth: 60, textAlign: 'right' }}>{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {/* Coupon Code Input */}
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '4px 0' }}>
                                <input
                                  placeholder="Coupon code"
                                  value={couponInput}
                                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setAppliedCoupon(null); }}
                                  style={{ flex: 1, padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12 }}
                                />
                                <button
                                  onClick={handleApplyCoupon}
                                  disabled={!couponInput.trim() || lookupCoupon.isPending}
                                  style={{ padding: '4px 12px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: !couponInput.trim() || lookupCoupon.isPending ? 'not-allowed' : 'pointer', fontSize: 12, opacity: !couponInput.trim() ? 0.6 : 1 }}
                                >
                                  {lookupCoupon.isPending ? '…' : 'Apply'}
                                </button>
                                {appliedCoupon && (
                                  <button
                                    onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}
                                    style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                                  >✕</button>
                                )}
                              </div>
                              {appliedCoupon && (
                                <div style={{ fontSize: 11, color: '#2e7d32', marginBottom: 2 }}>
                                  ✓ {appliedCoupon.couponName} applied
                                </div>
                              )}
                              {/* Coupon discount row */}
                              {appliedCoupon && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, color: '#2e7d32', fontWeight: 600 }}>
                                  <span>Coupon ({appliedCoupon.couponCode}) :</span>
                                  <span style={{ minWidth: 60, textAlign: 'right' }}>
                                    -{(appliedCoupon.discountPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                                <span style={{ color: colors.text.secondary }}>PP Token Discount:</span>
                                <span style={{ minWidth: 60, textAlign: 'right' }}>0</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, alignItems: 'center' }}>
                                <span style={{ color: colors.text.secondary }}>Round Off :</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={bookingData.roundOff === 0 ? '' : bookingData.roundOff}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/[^0-9.]/g, '');
                                    const v = parseFloat(digits) || 0;
                                    setBookingData({ ...bookingData, roundOff: v === 0 ? 0 : -v });
                                  }}
                                  style={{ width: 80, padding: '2px 6px', border: `1px solid ${colors.border}`, borderRadius: 3, textAlign: 'right', fontSize: 12 }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, borderTop: `2px solid #7b1fa2`, paddingTop: 4 }}>
                                <span style={{ color: '#7b1fa2', fontWeight: 700 }}>Final Bill Amount :</span>
                                <span style={{ minWidth: 60, textAlign: 'right', fontWeight: 700, color: '#7b1fa2' }}>
                                  {(grossTotal - (appliedCoupon?.discountPaise ?? 0) / 100 + (bookingData.roundOff || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ── Additional booking fields controlled by flags ── */}
                      {(effectiveFlags.hasTotalDiscount || effectiveFlags.hasValidity || effectiveFlags.hasSession || effectiveFlags.sessionBased || effectiveFlags.hasRating || effectiveFlags.hasDirectPayment || effectiveFlags.hasShareIncentive || effectiveFlags.targetWeightBased || effectiveFlags.hasMeasurement || effectiveFlags.isCombo || effectiveFlags.hasAllSessionsLink || effectiveFlags.hasBreakPackage) && (
                      <div style={{ padding: '10px 16px', borderBottom: `1px dashed ${colors.border}`, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
                        {effectiveFlags.hasTotalDiscount && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 100 }}>Total Disc (₹):</label>
                            <input type="number" min="0" value={bookingData.discount}
                              onChange={(e) => setBookingData({ ...bookingData, discount: parseFloat(e.target.value) || 0 })}
                              style={{ width: 80, padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, textAlign: 'right' }} />
                          </div>
                        )}
                        {(effectiveFlags.hasSession || effectiveFlags.sessionBased) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 70 }}>Sessions:</label>
                            <input type="number" min="1" value={bookingData.sessions}
                              onChange={(e) => setBookingData({ ...bookingData, sessions: parseInt(e.target.value) || 1 })}
                              style={{ width: 70, padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, textAlign: 'center' }} />
                          </div>
                        )}
                        {effectiveFlags.hasValidity && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 85 }}>Valid Until:</label>
                            <input type="date" value={bookingData.validityDate}
                              onChange={(e) => setBookingData({ ...bookingData, validityDate: e.target.value })}
                              style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12 }} />
                          </div>
                        )}
                        {effectiveFlags.hasDirectPayment && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 100 }}>Payment Mode:</label>
                            <select value={bookingData.paymentMode} onChange={(e) => setBookingData({ ...bookingData, paymentMode: e.target.value })}
                              style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, minWidth: 130 }}>
                              <option value="">Select</option>
                              {branchPaymentModes.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                            </select>
                          </div>
                        )}
                        {effectiveFlags.hasRating && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 55 }}>Rating:</label>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {[1,2,3,4,5].map(star => (
                                <span key={star} onClick={() => setBookingData({ ...bookingData, rating: star })}
                                  style={{ fontSize: 18, cursor: 'pointer', color: (bookingData.rating ?? 0) >= star ? '#f59e0b' : '#d1d5db' }}>★</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {effectiveFlags.hasShareIncentive && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 100 }}>Share Incentive:</label>
                            <input value={bookingData.shareIncentive} onChange={(e) => setBookingData({ ...bookingData, shareIncentive: e.target.value })}
                              placeholder="Referrer name / code" style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, width: 160 }} />
                          </div>
                        )}
                        {effectiveFlags.targetWeightBased && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 100 }}>Target Weight:</label>
                            <input value={bookingData.targetWeight} onChange={(e) => setBookingData({ ...bookingData, targetWeight: e.target.value })}
                              placeholder="e.g. 70 kg" style={{ padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, width: 100 }} />
                          </div>
                        )}
                        {effectiveFlags.hasMeasurement && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                            <label style={{ fontSize: 12, color: colors.text.secondary, minWidth: 100 }}>Measurements:</label>
                            <input value={bookingData.measurements} onChange={(e) => setBookingData({ ...bookingData, measurements: e.target.value })}
                              placeholder="e.g. Waist: 32, Hip: 38" style={{ flex: 1, padding: '4px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12 }} />
                          </div>
                        )}
                        {effectiveFlags.isCombo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 4, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: '#1565c0', fontWeight: 700 }}>COMBO</span>
                            <span style={{ fontSize: 11, color: '#1565c0' }}>This is a combo package</span>
                          </div>
                        )}
                        {effectiveFlags.hasAllSessionsLink && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3e5f5', border: '1px solid #ce93d8', borderRadius: 4, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: '#7b1fa2', fontWeight: 700 }}>ALL SESSIONS</span>
                            <span style={{ fontSize: 11, color: '#7b1fa2' }}>All sessions are linked</span>
                          </div>
                        )}
                        {effectiveFlags.hasBreakPackage && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 4, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: '#f57f17', fontWeight: 700 }}>BREAK</span>
                            <span style={{ fontSize: 11, color: '#f57f17' }}>Package can be broken</span>
                          </div>
                        )}
                      </div>
                      )}

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


                      {/* Review — no API call yet */}
                      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          type="default"
                          onClick={handleReviewBooking}
                          disabled={bookingRows.filter(r => r.service).length === 0}
                          style={{ fontSize: 13 }}
                        >
                          Review Booking →
                        </Button>
                      </div>
                    </div>
                    );
                  })()}

                  {/* ── Step 2: Package Details ── */}
                  {packageOfferStep === 2 && (() => {
                    const consultantObj = (branchStaff ?? []).find((e: any) => e.id === bookingData.consultant);
                    const filledRows = [
                      ...bookingRows.filter(r => r.service),
                      ...complimentaryRows.filter(r => r.service).map(r => ({ ...r, complementary: true, amount: 0, taxPercent: 0 })),
                    ];
                    let aggTaxable2 = 0, aggTax2 = 0;
                    for (const row of filledRows) {
                      const lp = Math.round(row.quantity * row.amount * 100);
                      const pct = row.taxPercent ?? 0;
                      if (!pct) { aggTaxable2 += lp; continue; }
                      const incl = row.taxType === 'inclusive';
                      const base = incl ? Math.round((lp * 100) / (100 + pct)) : lp;
                      aggTaxable2 += base;
                      aggTax2 += incl ? lp - base : Math.round((lp * pct) / 100);
                    }
                    const hasGst2 = aggTax2 > 0;
                    const grossTotal2 = (aggTaxable2 + aggTax2) / 100;
                    const couponDiscount2 = (appliedCoupon?.discountPaise ?? 0) / 100;
                    const manualDiscPct2 = Number(bookingData.discount) || 0;
                    const manualDiscount2 = manualDiscPct2 > 0 ? (grossTotal2 * manualDiscPct2) / 100 : 0;
                    const netTotal2 = grossTotal2 - couponDiscount2 - manualDiscount2 + (bookingData.roundOff || 0);
                    return (
                      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6 }}>
                        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 14, color: colors.text.primary }}>
                          📋 Package Details
                        </div>

                        {/* Stock shortfall warning banner */}
                        {stockShortfalls.length > 0 && (
                          <div style={{ margin: '12px 18px 0', padding: '10px 14px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <WarningOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>Low Stock Warning</span>
                              <span style={{ fontSize: 12, color: '#92400e' }}>— booking was saved but the following items need restocking:</span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                              <thead>
                                <tr style={{ background: '#fef3c7' }}>
                                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#78350f' }}>Product</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'center', color: '#78350f' }}>Needed</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'center', color: '#78350f' }}>In Stock</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'center', color: '#e53935' }}>Short</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'center', color: '#78350f' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {stockShortfalls.map((s) => (
                                  <tr key={s.productId} style={{ borderBottom: '1px solid #fde68a' }}>
                                    <td style={{ padding: '5px 8px', fontWeight: 500 }}>{s.productName}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>{s.required} {s.productUom}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#e53935' }}>{s.available} {s.productUom}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, color: '#e53935' }}>{s.required - s.available} {s.productUom}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                      <Button size="small" style={{ fontSize: 11, height: 22 }}
                                        loading={raiseIndent.isPending}
                                        onClick={async () => {
                                          try {
                                            await raiseIndent.mutateAsync({ items: [{ productId: s.productId, requestedQty: Math.max(1, s.required - s.available) }], reason: 'Low stock — booking raised' });
                                            message.success(`Stock request raised for ${s.productName}`);
                                            setStockShortfalls(prev => prev.filter(x => x.productId !== s.productId));
                                          } catch { message.error('Could not raise request'); }
                                        }}>
                                        Raise Request
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

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
                                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{consultantObj.designation || 'Consultant'}</div></>
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
                                <th style={{ padding: '7px 10px', textAlign: 'center', borderBottom: `1px solid #ddd`, color: '#555' }}>GST</th>
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
                                  <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 11 }}>
                                    {row.taxPercent ? (
                                      <span style={{ background: row.taxType === 'inclusive' ? '#f3e5f5' : '#e8eaf6', color: row.taxType === 'inclusive' ? '#7b1fa2' : '#3949ab', padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>
                                        {row.taxPercent}%
                                      </span>
                                    ) : <span style={{ color: '#ccc' }}>—</span>}
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
                          <div style={{ minWidth: 260, fontSize: 13 }}>
                            {hasGst2 && (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                  <span style={{ color: '#666' }}>Taxable Amount</span>
                                  <span>₹{(aggTaxable2 / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                  <span style={{ color: '#7b1fa2' }}>GST</span>
                                  <span style={{ color: '#7b1fa2' }}>+ ₹{(aggTax2 / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                              </>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e0e0e0' }}>
                              <span style={{ color: '#666' }}>Total Amount</span>
                              <span style={{ fontWeight: 600 }}>₹{grossTotal2.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            {manualDiscount2 > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e0e0e0' }}>
                                <span style={{ color: '#e53935' }}>Discount ({manualDiscPct2}%)</span>
                                <span style={{ color: '#e53935', fontWeight: 600 }}>- ₹{manualDiscount2.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {couponDiscount2 > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e0e0e0' }}>
                                <span style={{ color: '#e53935' }}>Coupon ({appliedCoupon?.couponCode})</span>
                                <span style={{ color: '#e53935', fontWeight: 600 }}>- ₹{couponDiscount2.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {(bookingData.roundOff || 0) !== 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e0e0e0' }}>
                                <span style={{ color: '#666' }}>Round Off</span>
                                <span style={{ color: '#e53935', fontWeight: 600 }}>- ₹{Math.abs(bookingData.roundOff || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `2px solid #333`, marginTop: 4 }}>
                              <span style={{ fontWeight: 700 }}>Net Amount</span>
                              <span style={{ fontWeight: 700, color: colors.gold.primary }}>₹{netTotal2.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Navigation */}
                        <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <Button onClick={() => setPackageOfferStep(1)}>← Back to Booking</Button>
                          <Button
                            onClick={() => {
                              // Pre-fill advance payment amount from package master config
                              const pkgRow = bookingRows.find((r: any) => r._isPackage);
                              if (pkgRow) {
                                const master = packageMasters.find(p => p.id === (pkgRow as any)._masterId);
                                if (master?.collectAdvance && master.advancePercent > 0) {
                                  const advAmt = Math.round((pkgRow.amount * pkgRow.quantity) * (master.advancePercent / 100) * 100) / 100;
                                  setPackagePaymentAmount(advAmt);
                                }
                              }
                              setPackageOfferStep(3);
                            }}
                            type="primary"
                            style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}
                          >
                            Continue to Payment Receipt →
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Step 3: Payment Receipt ── */}
                  {packageOfferStep === 3 && (() => {
                    const consultantObj = (branchStaff ?? []).find((e: any) => e.id === bookingData.consultant);
                    const filledRows = [
                      ...bookingRows.filter(r => r.service),
                      ...complimentaryRows.filter(r => r.service).map(r => ({ ...r, complementary: true, amount: 0, taxPercent: 0 })),
                    ];
                    let aggTaxable3 = 0, aggTax3 = 0;
                    for (const row of filledRows) {
                      const lp = Math.round(row.quantity * row.amount * 100);
                      const pct = row.taxPercent ?? 0;
                      if (!pct) { aggTaxable3 += lp; continue; }
                      const incl = row.taxType === 'inclusive';
                      const base = incl ? Math.round((lp * 100) / (100 + pct)) : lp;
                      aggTaxable3 += base;
                      aggTax3 += incl ? lp - base : Math.round((lp * pct) / 100);
                    }
                    const hasGst3 = aggTax3 > 0;
                    const grossTotal3 = (aggTaxable3 + aggTax3) / 100;
                    const couponDiscount3 = (appliedCoupon?.discountPaise ?? 0) / 100;
                    const manualDiscPct3 = Number(bookingData.discount) || 0;
                    const manualDiscount3 = manualDiscPct3 > 0 ? (grossTotal3 * manualDiscPct3) / 100 : 0;
                    const netAmt = grossTotal3 - couponDiscount3 - manualDiscount3 + (bookingData.roundOff || 0);
                    // GST type: intra-state → CGST+SGST, inter-state → IGST
                    const isIntraState3 = !!branchStateId && !!(customer as any)?.stateId && branchStateId === (customer as any)?.stateId;
                    const cgstAmt3 = isIntraState3 ? Math.floor(aggTax3 / 2) : 0;
                    const sgstAmt3 = isIntraState3 ? aggTax3 - cgstAmt3 : 0;
                    const igstAmt3 = !isIntraState3 ? aggTax3 : 0;
                    const taxRates3 = [...new Set(filledRows.filter(r => (r.taxPercent ?? 0) > 0).map(r => r.taxPercent as number))];
                    const uniformRate3 = taxRates3.length === 1 ? taxRates3[0] : null;
                    // site palette
                    const C = { sage: '#4F6F52', sageDark: '#3A5C3F', sageLight: '#C8D6BC', ivory: '#F8F4ED', white: '#FFFFFF', border: '#E5DDC9', textPrimary: '#1F2622', textSecondary: '#4A5550', textMuted: '#8B948E', warning: '#B8842E', error: '#A8473D', success: '#4A7C4A' };
                    return (
                      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(31,38,34,0.10)', background: C.white, display: 'flex', flexDirection: 'column' as const }}>

                        {/* HEADER */}
                        <div style={{ background: C.sage, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>Payment Receipt</span>
                            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>{savedBookingNumber ?? bookingData.bookingId}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 24 }}>
                            <div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 1 }}>Customer</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{customer?.name}{customer?.phone ? <span style={{ fontWeight: 400, opacity: 0.8 }}> · {customer.phone}</span> : ''}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 1 }}>Date</div>
                              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{new Date(bookingData.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                            {consultantObj && (
                              <div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 1 }}>Consultant</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{consultantObj.name}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── POS two-column layout ── */}
                        {(() => {
                          const pkgRows3 = filledRows.filter((r: any) => r._isPackage);
                          const nonPkgRows3 = filledRows.filter((r: any) => !r._isPackage && !r.complementary);
                          const hasPkg3 = pkgRows3.length > 0;
                          const pkgGross3 = pkgRows3.reduce((s: number, r: any) => s + r.quantity * r.amount, 0);
                          const pkgNetAmt3 = pkgGross3; // package price is fixed; never absorbs GST from other services
                          const nonPkgNetAmt3 = netAmt - pkgNetAmt3;
                          const clampedPkgPay3 = Math.min(Math.max(0, packagePaymentAmount), pkgNetAmt3);
                          const collectNow3 = hasPkg3 ? nonPkgNetAmt3 + clampedPkgPay3 : netAmt;
                          const pkgBalance3 = pkgNetAmt3 - clampedPkgPay3;
                          const fmt3 = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                          const sel = bookingData.paymentMode;
                          const pkgMaster3 = hasPkg3 ? packageMasters.find((p: any) => p.id === (pkgRows3[0] as any)._masterId) : null;
                          const minAdvancePay3 = (pkgMaster3 as any)?.collectAdvance ? Math.round(pkgNetAmt3 * ((pkgMaster3 as any).advancePercent / 100) * 100) / 100 : 0;
                          const advanceShortfall = minAdvancePay3 > 0 && clampedPkgPay3 < minAdvancePay3;

                          // Build unified service list for allocation (packages expand to sub-services)
                          const displayServices: { serviceName: string; weightPaise: number }[] = [];
                          for (const r of filledRows.filter((row: any) => !row.complementary)) {
                            if ((r as any)._isPackage) {
                              const snaps: any[] = (pkgMaster3 as any)?.serviceSnapshots ?? [];
                              if (snaps.length > 0) {
                                const rawW = snaps.map((s: any) => { const up = s.customPricePerSession ?? s.maxPrice; const q = s.customSessions ?? s.sessions ?? 1; return up * q; });
                                const rawWTotal = rawW.reduce((a: number, b: number) => a + b, 0);
                                const pkgLinePaise = Math.round(r.amount * r.quantity * 100);
                                snaps.forEach((s: any, i: number) => {
                                  const w = rawWTotal > 0 ? Math.round(pkgLinePaise * rawW[i] / rawWTotal) : Math.round(pkgLinePaise / snaps.length);
                                  displayServices.push({ serviceName: s.serviceName, weightPaise: w });
                                });
                              } else {
                                displayServices.push({ serviceName: r.service, weightPaise: Math.round(r.amount * r.quantity * 100) });
                              }
                            } else {
                              displayServices.push({ serviceName: r.service, weightPaise: Math.round(r.amount * r.quantity * 100) });
                            }
                          }
                          const dsWeightTotal = displayServices.reduce((s, d) => s + d.weightPaise, 0);
                          const collectNowPaiseAlloc = Math.round(collectNow3 * 100);
                          const dsAutoAllocs = displayServices.map((d) =>
                            dsWeightTotal > 0 ? Math.round(collectNowPaiseAlloc * d.weightPaise / dsWeightTotal) : Math.round(collectNowPaiseAlloc / Math.max(1, displayServices.length))
                          );
                          const dsAssigned = displayServices.reduce((sum, d, i) =>
                            sum + (pkgServiceAllocations[d.serviceName] ?? dsAutoAllocs[i]), 0);
                          const allocationExceeds = showAllocationPanel && displayServices.length >= 2 && collectNowPaiseAlloc > 0 && dsAssigned > collectNowPaiseAlloc + 1;

                          return (
                            <>
                              {/* BODY */}
                              <div style={{ display: 'flex', minHeight: 400 }}>

                                {/* LEFT — services table */}
                                <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' as const }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                      <tr style={{ background: C.ivory, borderBottom: `1px solid ${C.border}` }}>
                                        <th style={{ padding: '10px 16px', width: 36, textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>#</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Service</th>
                                        <th style={{ padding: '10px 12px', width: 50, textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Qty</th>
                                        <th style={{ padding: '10px 12px', width: 100, textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Rate</th>
                                        <th style={{ padding: '10px 16px 10px 12px', width: 110, textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filledRows.map((row, idx) => (
                                        <tr key={row.id} style={{ borderBottom: `1px solid ${C.ivory}`, background: C.white }}>
                                          <td style={{ padding: '13px 16px', textAlign: 'center', color: C.textMuted, fontSize: 12 }}>{idx + 1}</td>
                                          <td style={{ padding: '13px 12px' }}>
                                            <div style={{ fontWeight: 600, color: C.textPrimary }}>{row.service}</div>
                                            {row.category && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{row.category}</div>}
                                            {row.complementary && <span style={{ fontSize: 10, background: '#dcfce7', color: C.success, padding: '1px 7px', borderRadius: 4, fontWeight: 700, marginTop: 3, display: 'inline-block' }}>COMPLIMENTARY</span>}
                                          </td>
                                          <td style={{ padding: '13px 12px', textAlign: 'center', color: C.textSecondary }}>{row.quantity}</td>
                                          <td style={{ padding: '13px 12px', textAlign: 'right', color: C.textSecondary }}>{row.complementary ? '—' : `₹${row.amount.toLocaleString('en-IN')}`}</td>
                                          <td style={{ padding: '13px 16px 13px 12px', textAlign: 'right', fontWeight: 700, color: row.complementary ? C.success : C.textPrimary }}>{row.complementary ? '₹0' : `₹${(row.quantity * row.amount).toLocaleString('en-IN')}`}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* RIGHT — payment panel */}
                                <div style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${C.border}`, background: C.ivory, display: 'flex', flexDirection: 'column' as const, overflowY: 'auto' as const }}>

                                  {/* Bill Summary */}
                                  <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 12 }}>Bill Summary</div>
                                    {hasGst3 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.textSecondary, marginBottom: 6 }}><span>Taxable Amount</span><span>₹{fmt3(aggTaxable3 / 100)}</span></div>}
                                    {hasGst3 && isIntraState3 && <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.textSecondary, marginBottom: 5 }}><span>CGST{uniformRate3 ? ` (${uniformRate3 / 2}%)` : ''}</span><span>+₹{fmt3(cgstAmt3 / 100)}</span></div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.textSecondary, marginBottom: 6 }}><span>SGST{uniformRate3 ? ` (${uniformRate3 / 2}%)` : ''}</span><span>+₹{fmt3(sgstAmt3 / 100)}</span></div>
                                    </>}
                                    {hasGst3 && !isIntraState3 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.textSecondary, marginBottom: 6 }}><span>IGST{uniformRate3 ? ` (${uniformRate3}%)` : ''}</span><span>+₹{fmt3(igstAmt3 / 100)}</span></div>}
                                    {!hasGst3 && grossTotal3 !== netAmt && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.textSecondary, marginBottom: 6 }}><span>Subtotal</span><span>₹{fmt3(grossTotal3)}</span></div>}
                                    {(manualDiscount3 > 0 || couponDiscount3 > 0) && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: C.textSecondary }}>Discount</span><span style={{ color: C.error }}>−₹{fmt3(manualDiscount3 + couponDiscount3)}</span></div>}
                                    {(bookingData.roundOff || 0) !== 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: C.textSecondary }}>Round Off</span><span style={{ color: C.error }}>−₹{Math.abs(bookingData.roundOff || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}`, marginTop: 6 }}>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>Net Total</span>
                                      <span style={{ fontSize: 20, fontWeight: 800, color: C.sage, letterSpacing: '-0.02em' }}>₹{fmt3(netAmt)}</span>
                                    </div>
                                  </div>

                                  {/* Package payment */}
                                  {hasPkg3 && (
                                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 10 }}>Package Payment</div>
                                      {nonPkgNetAmt3 > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textSecondary, marginBottom: 5 }}><span>Services</span><span>₹{fmt3(nonPkgNetAmt3)}</span></div>}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textSecondary, marginBottom: 10 }}><span>Package total</span><span>₹{fmt3(pkgNetAmt3)}</span></div>
                                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 7 }}>Pay now for package</div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                                        {[{ label: 'Skip', val: 0 }, { label: 'Half', val: Math.round(pkgNetAmt3 / 2 * 100) / 100 }, { label: 'Full', val: pkgNetAmt3 }].map(opt => {
                                          const active = clampedPkgPay3 === opt.val;
                                          return (
                                            <button key={opt.label} onClick={() => setPackagePaymentAmount(opt.val)} style={{ padding: '8px 0', fontSize: 12, cursor: 'pointer', borderRadius: 7, border: `1.5px solid ${active ? C.sage : C.border}`, background: active ? C.sage : C.white, color: active ? '#fff' : C.textSecondary, fontWeight: active ? 700 : 500 }}>{opt.label}</button>
                                          );
                                        })}
                                      </div>
                                      <input type="text" inputMode="decimal" value={packagePaymentAmount === 0 ? '' : packagePaymentAmount} placeholder="Custom amount ₹"
                                        onChange={(e) => { const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0; setPackagePaymentAmount(Math.min(v, pkgNetAmt3)); }}
                                        style={{ width: '100%', padding: '8px 11px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, outline: 'none', background: C.white, color: C.textPrimary, boxSizing: 'border-box' as const }} />
                                      {pkgBalance3 > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.warning, marginTop: 8, padding: '6px 10px', background: '#fff7ed', borderRadius: 6, border: '1px solid #fed7aa' }}><span>Deferred to later sessions</span><span>₹{fmt3(pkgBalance3)}</span></div>}
                                      {minAdvancePay3 > 0 && (
                                        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 7, background: advanceShortfall ? '#fef2f2' : '#f0fdf4', border: `1px solid ${advanceShortfall ? '#fca5a5' : '#86efac'}` }}>
                                          <div style={{ fontSize: 11, fontWeight: 700, color: advanceShortfall ? C.error : C.success, marginBottom: 3 }}>{advanceShortfall ? '⚠ Advance required' : '✓ Advance collected'}</div>
                                          <div style={{ fontSize: 11, color: advanceShortfall ? C.error : C.success }}>Min {(pkgMaster3 as any)?.advancePercent}% — at least ₹{fmt3(minAdvancePay3)}</div>
                                          {advanceShortfall && <button onClick={() => setPackagePaymentAmount(minAdvancePay3)} style={{ marginTop: 7, width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 6, border: 'none', background: C.error, color: '#fff' }}>Set ₹{fmt3(minAdvancePay3)} ({(pkgMaster3 as any)?.advancePercent}%)</button>}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Service allocation */}
                                  {displayServices.length >= 2 && collectNow3 > 0 && (
                                    <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}` }}>
                                      <button onClick={() => setShowAllocationPanel(!showAllocationPanel)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: C.sage, fontSize: 11, fontWeight: 600, padding: 0 }}>
                                        <span>{showAllocationPanel ? '▾' : '▸'}</span>
                                        <span>Allocate payment to services (optional)</span>
                                      </button>
                                      {showAllocationPanel && (() => {
                                        const dsMismatch = Math.abs(dsAssigned - collectNowPaiseAlloc) > 1;
                                        return (
                                          <div style={{ marginTop: 8 }}>
                                            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                                              <thead><tr style={{ color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
                                                <th style={{ textAlign: 'left', padding: '3px 0', fontWeight: 600 }}>Service</th>
                                                <th style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600 }}>Auto</th>
                                                <th style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600 }}>Assign</th>
                                              </tr></thead>
                                              <tbody>
                                                {displayServices.map((d, i) => {
                                                  const autoAmt = dsAutoAllocs[i];
                                                  const assigned = pkgServiceAllocations[d.serviceName];
                                                  return (
                                                    <tr key={d.serviceName} style={{ borderBottom: `1px dashed ${C.border}` }}>
                                                      <td style={{ padding: '4px 0', color: C.textSecondary }}>{d.serviceName}</td>
                                                      <td style={{ padding: '4px 0', textAlign: 'right', color: C.textMuted }}>₹{fmt3(autoAmt / 100)}</td>
                                                      <td style={{ padding: '4px 0', textAlign: 'right' }}>
                                                        <input type="text" inputMode="numeric"
                                                          value={(() => { const n = assigned !== undefined ? Math.round(assigned / 100) : Math.round(autoAmt / 100); return n === 0 ? '' : String(n); })()}
                                                          placeholder="0" onFocus={(e) => e.target.select()}
                                                          onChange={(e) => {
                                                            const v = Math.round((parseInt(e.target.value.replace(/\D/g, ''), 10) || 0) * 100);
                                                            const remaining = Math.max(0, collectNowPaiseAlloc - v);
                                                            const othersWeight = displayServices.reduce((s, ds2, j) => j !== i ? s + ds2.weightPaise : s, 0);
                                                            const newAllocs: Record<string, number> = { [d.serviceName]: v };
                                                            let distributed = 0;
                                                            displayServices.forEach((ds2, j) => { if (j === i) return; const amt = othersWeight > 0 ? Math.round(remaining * ds2.weightPaise / othersWeight) : 0; newAllocs[ds2.serviceName] = amt; distributed += amt; });
                                                            const residual = remaining - distributed;
                                                            if (residual !== 0) { const lastOtherIdx = displayServices.map((_, j) => j).filter(j => j !== i).pop(); if (lastOtherIdx !== undefined) newAllocs[displayServices[lastOtherIdx].serviceName] = Math.max(0, (newAllocs[displayServices[lastOtherIdx].serviceName] ?? 0) + residual); }
                                                            setPkgServiceAllocations(newAllocs);
                                                          }}
                                                          style={{ width: 68, padding: '2px 6px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, textAlign: 'right' as const, background: C.white, color: C.textPrimary }} />
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                                <tr style={{ borderTop: `1px solid ${C.border}`, fontWeight: 700 }}>
                                                  <td style={{ padding: '4px 0', color: C.textSecondary }}>Total</td>
                                                  <td style={{ padding: '4px 0', textAlign: 'right', color: C.textMuted }}>₹{fmt3(collectNow3)}</td>
                                                  <td style={{ padding: '4px 0', textAlign: 'right', color: dsMismatch ? C.error : C.success }}>₹{fmt3(dsAssigned / 100)} {dsMismatch ? '✗' : '✓'}</td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <button onClick={() => setPkgServiceAllocations({})} style={{ marginTop: 5, fontSize: 10, color: C.sage, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>↺ Reset to Auto</button>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Payment Method */}
                                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Payment Method</label>
                                    <select
                                      value={sel ?? ''}
                                      onChange={(e) => setBookingData({ ...bookingData, paymentMode: e.target.value || undefined })}
                                      style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${sel ? C.sage : C.border}`, borderRadius: 8, fontSize: 13, color: sel ? C.textPrimary : C.textMuted, background: C.white, outline: 'none', cursor: 'pointer', appearance: 'auto' as const }}
                                    >
                                      <option value="">— Select payment method —</option>
                                      {branchPaymentModes.map(({ id, name }) => (
                                        <option key={id} value={name}>{name}</option>
                                      ))}
                                    </select>
                                    {branchPaymentModes.length === 0 && (
                                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>No payment modes configured for this branch.</div>
                                    )}
                                  </div>

                                  {/* Collect Now */}
                                  <div style={{ padding: '16px 18px', background: C.sage, marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 3 }}>Collect Now</div>
                                        {hasPkg3 && pkgBalance3 > 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>+₹{fmt3(pkgBalance3)} deferred</div>}
                                        {sel && <div style={{ fontSize: 11, color: C.sageLight, marginTop: 2 }}>via {sel}</div>}
                                      </div>
                                      <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>₹{fmt3(collectNow3)}</div>
                                    </div>
                                  </div>

                                </div>
                              </div>

                              {/* FOOTER */}
                              <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, background: C.white, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Button onClick={() => setPackageOfferStep(2)}>← Back</Button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {allocationExceeds && <div style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 11, color: C.error, fontWeight: 600 }}>⚠ Allocation exceeds collect amount</div>}
                                  {(() => {
                                    const needsPayment = (collectNow3 > 0 && !sel) || advanceShortfall || allocationExceeds;
                                    const collectNowPaise3 = Math.round(collectNow3 * 100);
                                    return (
                                      <>
                                        <Button disabled={needsPayment} loading={createBooking.isPending || bookingAction.isPending}
                                          onClick={async () => {
                                            if (needsPayment) return;
                                            const saved = await handleSaveBooking();
                                            if (!saved) return;
                                            const { id: bookingId, items: bkgItems } = saved;
                                            if (collectNowPaise3 > 0 && sel) {
                                              const payableItems = bkgItems.filter((it: any) => !it.isPackageSummaryLine);
                                              const serviceAllocations = payableItems.map((it: any) => { const dsIdx = displayServices.findIndex(d => d.serviceName === it.service); const autoAmt = dsIdx >= 0 ? dsAutoAllocs[dsIdx] : 0; return { bookingItemId: it.id, amount: pkgServiceAllocations[it.service] !== undefined ? pkgServiceAllocations[it.service] : autoAmt }; });
                                              await bookingAction.mutateAsync({ bookingId, action: 'pay', amount: collectNowPaise3, ...(sel ? { paymentMode: sel } : {}), ...(serviceAllocations.length ? { serviceAllocations } : {}) });
                                            }
                                            message.success('Booking saved!');
                                            setExpandedModuleView(null);
                                          }}>Save</Button>
                                        <Button type="primary" disabled={needsPayment} loading={createBooking.isPending}
                                          style={{ background: needsPayment ? undefined : C.sage, borderColor: needsPayment ? undefined : C.sageDark, fontWeight: 600, minWidth: 130 }}
                                          onClick={async () => {
                                            if (needsPayment) return;
                                            const saved = await handleSaveBooking();
                                            if (!saved) return;
                                            setPackageOfferStep(4);
                                          }}>Save &amp; Print →</Button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* ── Step 4: Print ── */}
                  {packageOfferStep === 4 && (() => {
                    const consultantObj = (branchStaff ?? []).find((e: any) => e.id === bookingData.consultant);
                    const filledRows = [
                      ...bookingRows.filter(r => r.service),
                      ...complimentaryRows.filter(r => r.service).map(r => ({ ...r, complementary: true, amount: 0, taxPercent: 0 })),
                    ];
                    let aggTaxable4 = 0, aggTax4 = 0;
                    for (const row of filledRows) {
                      const lp = Math.round(row.quantity * row.amount * 100);
                      const pct = row.taxPercent ?? 0;
                      if (!pct) { aggTaxable4 += lp; continue; }
                      const incl = row.taxType === 'inclusive';
                      const base = incl ? Math.round((lp * 100) / (100 + pct)) : lp;
                      aggTaxable4 += base;
                      aggTax4 += incl ? lp - base : Math.round((lp * pct) / 100);
                    }
                    const hasGst4 = aggTax4 > 0;
                    const grossTotal4 = (aggTaxable4 + aggTax4) / 100;
                    const couponDiscount4 = (appliedCoupon?.discountPaise ?? 0) / 100;
                    const manualDiscPct4 = Number(bookingData.discount) || 0;
                    const manualDiscount4 = manualDiscPct4 > 0 ? (grossTotal4 * manualDiscPct4) / 100 : 0;
                    const netAmt = grossTotal4 - couponDiscount4 - manualDiscount4 + (bookingData.roundOff || 0);
                    const isIntraState4 = !!branchStateId && !!(customer as any)?.stateId && branchStateId === (customer as any)?.stateId;
                    const cgstAmt4 = isIntraState4 ? Math.floor(aggTax4 / 2) : 0;
                    const sgstAmt4 = isIntraState4 ? aggTax4 - cgstAmt4 : 0;
                    const igstAmt4 = !isIntraState4 ? aggTax4 : 0;
                    const taxRates4 = [...new Set(filledRows.filter(r => (r.taxPercent ?? 0) > 0).map(r => r.taxPercent as number))];
                    const uniformRate4 = taxRates4.length === 1 ? taxRates4[0] : null;
                    // Compute collect-now amount (same logic as Step 3)
                    const filledRows4 = [...bookingRows.filter((r: any) => r.service), ...complimentaryRows.filter((r: any) => r.service).map((r: any) => ({ ...r, complementary: true, amount: 0 }))];
                    const pkgRows4 = filledRows4.filter((r: any) => r._isPackage);
                    const nonPkgRows4 = filledRows4.filter((r: any) => !r._isPackage && !r.complementary);
                    const hasPkg4 = pkgRows4.length > 0;
                    const pkgGross4 = pkgRows4.reduce((s: number, r: any) => s + r.quantity * r.amount, 0);
                    const pkgNet4 = pkgGross4; // package price is fixed; never absorbs GST from other services
                    const nonPkgNet4 = netAmt - pkgNet4;
                    const clampedPkgPay4 = Math.min(Math.max(0, packagePaymentAmount), pkgNet4);
                    const collectNow4 = hasPkg4 ? nonPkgNet4 + clampedPkgPay4 : netAmt;
                    const collectNowPaise4 = Math.round(collectNow4 * 100);
                    const fmt4 = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                    const dateStr4 = new Date(bookingData.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    return (
                      <div>
                        {/* POS page-size style injected only when in POS mode */}
                        {printMode === 'pos' && (
                          <style>{`@media print { @page { size: 80mm auto; margin: 3mm; } }`}</style>
                        )}

                        {/* Action bar — hidden on print */}
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                          <Button onClick={() => setPackageOfferStep(3)}>← Back to Receipt</Button>

                          {/* Print format toggle */}
                          <div style={{ display: 'flex', gap: 0, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                            {(['normal', 'pos'] as const).map(mode => (
                              <button key={mode} onClick={() => setPrintMode(mode)} style={{
                                padding: '7px 18px', fontSize: 13, cursor: 'pointer', border: 'none', outline: 'none',
                                background: printMode === mode ? '#6366f1' : '#fff',
                                color: printMode === mode ? '#fff' : '#64748b',
                                fontWeight: printMode === mode ? 600 : 400,
                                borderRight: mode === 'normal' ? '1px solid #e2e8f0' : 'none',
                              }}>
                                {mode === 'normal' ? '🖨 Normal (A4)' : '🧾 POS (80mm)'}
                              </button>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button type="primary" onClick={() => window.print()} style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}>
                              Print
                            </Button>
                            <Button
                              type="primary"
                              loading={bookingAction.isPending}
                              style={{ background: '#2e7d32', borderColor: '#2e7d32' }}
                              onClick={async () => {
                                if (savedBookingId && collectNowPaise4 > 0) {
                                  await bookingAction.mutateAsync({
                                    bookingId: savedBookingId,
                                    action: 'pay',
                                    amount: collectNowPaise4,
                                    ...(bookingData.paymentMode ? { paymentMode: bookingData.paymentMode } : {}),
                                  });
                                }
                                setExpandedModuleView(null);
                              }}
                            >
                              ✓ Done &amp; Save Payment
                            </Button>
                          </div>
                        </div>

                        {/* ── NORMAL (A4) Receipt ── */}
                        {printMode === 'normal' && (
                          <div className="print-area" style={{ background: '#fff', border: '2px solid #222', borderRadius: 6, padding: '32px 36px', maxWidth: 680, margin: '0 auto', fontFamily: 'inherit' }}>
                            <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '2px solid #222', marginBottom: 20 }}>
                              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, color: '#111' }}>WELONA</div>
                              <div style={{ fontSize: 11, color: '#777', letterSpacing: 2, marginTop: 2 }}>HEALTH &amp; WELLNESS</div>
                              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, letterSpacing: 3, color: '#333' }}>SERVICE BOOKING RECEIPT</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16 }}>
                              <div><span style={{ color: '#888' }}>Booking ID: </span><strong>{savedBookingNumber ?? bookingData.bookingId}</strong></div>
                              <div><span style={{ color: '#888' }}>Date: </span><strong>{dateStr4}</strong></div>
                            </div>
                            <div style={{ display: 'flex', gap: 32, marginBottom: 20, padding: '12px 14px', background: '#f9f9f9', borderRadius: 4, fontSize: 12 }}>
                              <div>
                                <div style={{ color: '#888', marginBottom: 3, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Customer</div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{customer?.name}</div>
                                {customer?.phone && <div style={{ color: '#555' }}>📞 {customer.phone}</div>}
                              </div>
                              {consultantObj && (
                                <div>
                                  <div style={{ color: '#888', marginBottom: 3, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Consulted By</div>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>{consultantObj.name}</div>
                                  <div style={{ color: '#555' }}>{consultantObj.designation || 'Consultant'}</div>
                                </div>
                              )}
                            </div>
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
                                  <tr key={row.id} style={{ borderBottom: '1px solid #eee', background: row.complementary ? '#f1f8e9' : idx % 2 === 0 ? '#fff' : '#fafafa' }}>
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
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                              <div style={{ minWidth: 280, fontSize: 13 }}>
                                {hasGst4 && (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                      <span style={{ color: '#666' }}>Taxable Amount</span>
                                      <span style={{ fontWeight: 600 }}>₹{fmt4(aggTaxable4 / 100)}</span>
                                    </div>
                                    {isIntraState4 ? (
                                      <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                          <span style={{ color: '#555' }}>CGST{uniformRate4 ? ` (${uniformRate4 / 2}%)` : ''}</span>
                                          <span style={{ fontWeight: 600 }}>+ ₹{fmt4(cgstAmt4 / 100)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                          <span style={{ color: '#555' }}>SGST{uniformRate4 ? ` (${uniformRate4 / 2}%)` : ''}</span>
                                          <span style={{ fontWeight: 600 }}>+ ₹{fmt4(sgstAmt4 / 100)}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                        <span style={{ color: '#555' }}>IGST{uniformRate4 ? ` (${uniformRate4}%)` : ''}</span>
                                        <span style={{ fontWeight: 600 }}>+ ₹{fmt4(igstAmt4 / 100)}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                  <span style={{ color: '#666' }}>Total Amount</span>
                                  <span style={{ fontWeight: 600 }}>₹{fmt4(grossTotal4)}</span>
                                </div>
                                {manualDiscount4 > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                    <span style={{ color: '#e53935' }}>Discount ({manualDiscPct4}%)</span>
                                    <span style={{ color: '#e53935', fontWeight: 600 }}>- ₹{fmt4(manualDiscount4)}</span>
                                  </div>
                                )}
                                {couponDiscount4 > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                    <span style={{ color: '#e53935' }}>Coupon ({appliedCoupon?.couponCode})</span>
                                    <span style={{ color: '#e53935', fontWeight: 600 }}>- ₹{fmt4(couponDiscount4)}</span>
                                  </div>
                                )}
                                {(bookingData.roundOff || 0) !== 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                    <span style={{ color: '#666' }}>Round Off</span>
                                    <span>- ₹{Math.abs(bookingData.roundOff || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #111', marginTop: 4 }}>
                                  <span style={{ fontWeight: 800, fontSize: 14 }}>Net Amount</span>
                                  <span style={{ fontWeight: 800, fontSize: 16 }}>₹{fmt4(netAmt)}</span>
                                </div>
                                {hasPkg4 && (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #ddd' }}>
                                      <span style={{ color: '#2e7d32' }}>Paid Now</span>
                                      <span style={{ fontWeight: 700, color: '#2e7d32' }}>₹{fmt4(collectNow4)}</span>
                                    </div>
                                    {(pkgNet4 - clampedPkgPay4) > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                                        <span style={{ color: '#e53935' }}>Package Balance Due</span>
                                        <span style={{ fontWeight: 700, color: '#e53935' }}>₹{fmt4(pkgNet4 - clampedPkgPay4)}</span>
                                      </div>
                                    )}
                                  </>
                                )}
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
                            <div style={{ textAlign: 'center', paddingTop: 14, borderTop: '1px solid #ddd', fontSize: 11, color: '#aaa' }}>
                              Thank you for choosing Welona Health &amp; Wellness
                            </div>
                          </div>
                        )}

                        {/* ── POS (80mm thermal) Receipt ── */}
                        {printMode === 'pos' && (
                          <div className="print-area" style={{ background: '#fff', width: 302, margin: '0 auto', fontFamily: "'Courier New', Courier, monospace", fontSize: 12, padding: '10px 8px' }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                              <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3 }}>WELONA</div>
                              <div style={{ fontSize: 10, letterSpacing: 1, color: '#555' }}>HEALTH &amp; WELLNESS</div>
                              <div style={{ fontSize: 9, marginTop: 4, color: '#777' }}>SERVICE BOOKING RECEIPT</div>
                            </div>
                            <div style={{ borderTop: '1px dashed #333', borderBottom: '1px dashed #333', padding: '5px 0', margin: '6px 0', fontSize: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ID:</span><span>{savedBookingNumber ?? bookingData.bookingId}</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date:</span><span>{dateStr4}</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Customer:</span><span style={{ maxWidth: 170, textAlign: 'right' }}>{customer?.name}</span></div>
                              {customer?.phone && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Phone:</span><span>{customer.phone}</span></div>}
                              {consultantObj && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Consultant:</span><span>{consultantObj.name}</span></div>}
                            </div>
                            {/* Items */}
                            <div style={{ borderBottom: '1px dashed #333', paddingBottom: 6, marginBottom: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' as const }}>
                                <span style={{ flex: 1 }}>Item</span>
                                <span style={{ width: 30, textAlign: 'center' }}>Qty</span>
                                <span style={{ width: 60, textAlign: 'right' }}>Amt</span>
                              </div>
                              {filledRows.map(row => (
                                <div key={row.id} style={{ marginBottom: 4 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                    <span style={{ flex: 1, paddingRight: 4, wordBreak: 'break-word' as const }}>{row.service}</span>
                                    <span style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>{row.quantity}</span>
                                    <span style={{ width: 60, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>
                                      {row.complementary ? 'FREE' : `₹${(row.quantity * row.amount).toLocaleString('en-IN')}`}
                                    </span>
                                  </div>
                                  {row.category && <div style={{ fontSize: 9, color: '#666', paddingLeft: 2 }}>{row.category}</div>}
                                </div>
                              ))}
                            </div>
                            {/* Totals */}
                            <div style={{ fontSize: 11 }}>
                              {hasGst4 && (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Taxable</span><span>₹{fmt4(aggTaxable4 / 100)}</span></div>
                                  {isIntraState4 ? (
                                    <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>CGST{uniformRate4 ? ` ${uniformRate4 / 2}%` : ''}</span><span>₹{fmt4(cgstAmt4 / 100)}</span></div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>SGST{uniformRate4 ? ` ${uniformRate4 / 2}%` : ''}</span><span>₹{fmt4(sgstAmt4 / 100)}</span></div>
                                    </>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>IGST{uniformRate4 ? ` ${uniformRate4}%` : ''}</span><span>₹{fmt4(igstAmt4 / 100)}</span></div>
                                  )}
                                </>
                              )}
                              {(manualDiscount4 > 0 || couponDiscount4 > 0) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Discount</span><span>-₹{fmt4(manualDiscount4 + couponDiscount4)}</span></div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #333', borderBottom: '1px dashed #333', padding: '4px 0', margin: '4px 0', fontWeight: 800, fontSize: 13 }}>
                                <span>NET TOTAL</span><span>₹{fmt4(netAmt)}</span>
                              </div>
                              {hasPkg4 && (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Paid Now</span><span style={{ fontWeight: 700 }}>₹{fmt4(collectNow4)}</span></div>
                                  {(pkgNet4 - clampedPkgPay4) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Balance Due</span><span style={{ fontWeight: 700 }}>₹{fmt4(pkgNet4 - clampedPkgPay4)}</span></div>
                                  )}
                                </>
                              )}
                              {bookingData.paymentMode && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 10, color: '#555' }}><span>Payment</span><span>{bookingData.paymentMode}</span></div>
                              )}
                            </div>
                            {bookingData.remarks && (
                              <div style={{ borderTop: '1px dashed #333', marginTop: 6, paddingTop: 6, fontSize: 10, color: '#555' }}>
                                Remarks: {bookingData.remarks}
                              </div>
                            )}
                            <div style={{ textAlign: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px dashed #333', fontSize: 10, color: '#777' }}>
                              Thank you for visiting Welona!
                            </div>
                          </div>
                        )}
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


      {/* Stock shortfall banner — shown inline on step 2 when booking proceeded with low stock */}

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
