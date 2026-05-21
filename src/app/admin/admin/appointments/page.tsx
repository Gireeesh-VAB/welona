'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  FilterOutlined,
  PhoneOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@/lib/format';
import {
  APPOINTMENTS,
  APPOINTMENTS_TODAY,
  APPOINTMENT_CONSULTANTS,
  APPOINTMENT_BRANCHES,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/sample-data/appointments';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

type ViewMode = 'today' | 'calendar' | 'list';

const STATUS_OPTIONS: AppointmentStatus[] = [
  'Confirmed', 'Pending', 'Checked-In', 'In Session',
  'Completed', 'No-Show', 'Cancelled', 'Rescheduled',
];

/** Per-branch capacity used for the utilization bar. */
const BRANCH_CAPACITY = 14;

function rowsToCsv(headers: string[], values: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...values].map((row) => row.map(escape).join(',')).join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export default function AdminAppointmentsPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();
  const navItem = getAdminNavItem('admin-appointments')!;

  const [view, setView] = useState<ViewMode>('today');

  // ---- Shared filters ----
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [consultant, setConsultant] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<AppointmentStatus | undefined>(undefined);
  const [customerSearch, setCustomerSearch] = useState('');

  // ---- Calendar view state ----
  const [calendarDate, setCalendarDate] = useState<Dayjs>(dayjs(APPOINTMENTS_TODAY));
  const [dayDrawerDate, setDayDrawerDate] = useState<Dayjs | null>(null);

  // ---- List pagination ----
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // ---- Data ----
  const [appointments, setAppointments] = useState<Appointment[]>(APPOINTMENTS);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);
  const consultantOptions = useMemo(
    () => APPOINTMENT_CONSULTANTS.map((c) => ({ value: c, label: c })),
    [],
  );

  // ---- Filtered set used by every view ----
  const filtered = useMemo(() => {
    const selectedBranch = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    const needle = customerSearch.trim().toLowerCase();
    return appointments.filter((a) => {
      if (selectedBranch && a.branchName !== selectedBranch) return false;
      if (consultant && a.consultant !== consultant) return false;
      if (status && a.status !== status) return false;
      if (from && dayjs(a.startsAt).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(a.startsAt).isAfter(to.endOf('day'))) return false;
      if (needle) {
        const hay = `${a.customerName} ${a.mobileNumber}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [appointments, branchId, consultant, status, dateRange, customerSearch, branchOptions]);

  // ---- KPIs (always derived from the filtered set) ----
  const kpis = useMemo(() => {
    const todayKey = APPOINTMENTS_TODAY;
    const weekStart = dayjs(todayKey).startOf('week');
    const weekEnd = dayjs(todayKey).endOf('week');
    const counts = { today: 0, upcoming: 0, completed: 0, noShows: 0, week: 0 };
    const now = dayjs(`${todayKey}T${dayjs().format('HH:mm')}:00`);
    for (const a of filtered) {
      const at = dayjs(a.startsAt);
      const isToday = at.format('YYYY-MM-DD') === todayKey;
      if (isToday) {
        counts.today += 1;
        if (a.status === 'Completed') counts.completed += 1;
        if (a.status === 'No-Show') counts.noShows += 1;
        if (at.isAfter(now) && (a.status === 'Confirmed' || a.status === 'Pending')) counts.upcoming += 1;
      }
      if (at.isAfter(weekStart) && at.isBefore(weekEnd)) counts.week += 1;
    }
    return counts;
  }, [filtered]);

  // ---- Branch utilization (today, after filters) ----
  const branchUtilization = useMemo(() => {
    const todayKey = APPOINTMENTS_TODAY;
    const map = new Map<string, { branch: string; booked: number; completed: number; noShow: number }>();
    for (const a of filtered) {
      if (dayjs(a.startsAt).format('YYYY-MM-DD') !== todayKey) continue;
      const e = map.get(a.branchName) ?? { branch: a.branchName, booked: 0, completed: 0, noShow: 0 };
      e.booked += 1;
      if (a.status === 'Completed') e.completed += 1;
      if (a.status === 'No-Show') e.noShow += 1;
      map.set(a.branchName, e);
    }
    return Array.from(map.values()).sort((a, b) => b.booked - a.booked);
  }, [filtered]);

  // ---- Status colour ----
  const statusColor = (s: AppointmentStatus): string => {
    if (s === 'Completed') return colors.status.success;
    if (s === 'Confirmed') return colors.status.info;
    if (s === 'Checked-In' || s === 'In Session') return colors.gold.primary;
    if (s === 'Pending') return colors.status.warning;
    if (s === 'No-Show' || s === 'Cancelled') return colors.status.error;
    return colors.text.placeholder;
  };

  // ---- Reset ----
  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined); setConsultant(undefined);
    setStatus(undefined); setCustomerSearch(''); setPage(1);
  };

  // ---- Action: mark status ----
  const markStatus = (key: string, next: AppointmentStatus) => {
    setAppointments(appointments.map((a) => a.key === key ? { ...a, status: next } : a));
    message.success(`Appointment marked as ${next}`);
  };

  // ---- Export ----
  const handleExport = () => {
    const headers = ['Booking No','Date','Time','Customer','Mobile','Branch','Consultant','Service','Category','Duration (mins)','Status','Paid','Due','Remarks'];
    const values = filtered.map((a) => [
      a.bookingNo, dayjs(a.startsAt).format('DD-MM-YYYY'), dayjs(a.startsAt).format('HH:mm'),
      a.customerName, a.mobileNumber, a.branchName, a.consultant, a.service, a.category,
      a.durationMins, a.status,
      (a.amountPaid / 100).toFixed(2), (a.amountDue / 100).toFixed(2), a.remarks,
    ]);
    downloadCsv(`appointments-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  // =====================================================================
  // List view columns
  // =====================================================================
  const listColumns: ColumnsType<Appointment> = [
    {
      title: 'Booking', dataIndex: 'bookingNo', width: 130, fixed: 'left',
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Date & Time', dataIndex: 'startsAt', width: 170, fixed: 'left',
      sorter: (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      defaultSortOrder: 'ascend',
      render: (v: string) => (
        <div>
          <div style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{dayjs(v).format('hh:mm A')}</Text>
        </div>
      ),
    },
    {
      title: 'Customer', dataIndex: 'customerName', width: 200,
      sorter: (a, b) => a.customerName.localeCompare(b.customerName),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.mobileNumber}</Text>
        </div>
      ),
    },
    { title: 'Branch', dataIndex: 'branchName', width: 170,
      sorter: (a, b) => a.branchName.localeCompare(b.branchName),
      render: (v: string) => <span style={{ color: colors.text.primary }}>{v}</span> },
    {
      title: 'Consultant', dataIndex: 'consultant', width: 180,
      sorter: (a, b) => a.consultant.localeCompare(b.consultant),
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Service', dataIndex: 'service', width: 230,
      render: (v: string, row) => (
        <div>
          <div style={{ color: colors.text.primary }}>{v}</div>
          <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: '4px 0 0', fontSize: 11 }}>{row.category}</Tag>
        </div>
      ),
    },
    { title: 'Duration', dataIndex: 'durationMins', width: 100, align: 'left',
      render: (v: number) => <span>{v} mins</span> },
    {
      title: 'Status', dataIndex: 'status', width: 140,
      filters: STATUS_OPTIONS.map((s) => ({ text: s, value: s })),
      onFilter: (val, row) => row.status === val,
      render: (v: AppointmentStatus) => (
        <Tag style={{ background: statusColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    {
      title: 'Paid', dataIndex: 'amountPaid', width: 140, align: 'left',
      render: (v: number) => v > 0
        ? <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        : <span style={{ color: colors.text.placeholder }}>—</span>,
    },
    {
      title: 'Due', dataIndex: 'amountDue', width: 140, align: 'left',
      render: (v: number) => v > 0
        ? <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
        : <span style={{ color: colors.text.placeholder }}>—</span>,
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filtered.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} appointment${total === 1 ? '' : 's'}`,
  };

  // =====================================================================
  // Today's Schedule — per-branch columns of stacked appointment cards
  // =====================================================================
  const todaysAppointments = useMemo(() => {
    return filtered
      .filter((a) => dayjs(a.startsAt).format('YYYY-MM-DD') === APPOINTMENTS_TODAY)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [filtered]);

  const todayByBranch = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const branch of APPOINTMENT_BRANCHES) {
      map.set(branch, []);
    }
    for (const a of todaysAppointments) {
      const list = map.get(a.branchName) ?? [];
      list.push(a);
      map.set(a.branchName, list);
    }
    return Array.from(map.entries())
      .filter(([, list]) => list.length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [todaysAppointments]);

  const TodayCard = ({ a }: { a: Appointment }) => (
    <Card
      size="small"
      style={{
        marginBottom: 10,
        background: colors.black.tertiary,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${statusColor(a.status)}`,
      }}
      styles={{ body: { padding: 12 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ClockCircleOutlined style={{ color: colors.gold.primary, fontSize: 12 }} />
            <Text strong style={{ color: colors.gold.primary, fontSize: 13 }}>
              {dayjs(a.startsAt).format('hh:mm A')}
            </Text>
            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>· {a.durationMins} mins</Text>
          </div>
          <div style={{ fontWeight: 600, color: colors.text.primary, marginBottom: 2 }}>
            {a.customerName}
          </div>
          <div style={{ color: colors.text.primary, fontSize: 12, marginBottom: 4 }}>
            {a.service}
          </div>
          <Space size={4} wrap>
            <Tag style={{ background: statusColor(a.status), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0, fontSize: 11 }}>
              {a.status}
            </Tag>
            <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0, fontSize: 11 }}>
              {a.consultant}
            </Tag>
          </Space>
        </div>
      </div>
      {(a.status === 'Confirmed' || a.status === 'Pending') && (
        <Space size={6} style={{ marginTop: 10 }} wrap>
          <Button size="small" type="primary" onClick={() => markStatus(a.key, 'Checked-In')}>Check In</Button>
          <Popconfirm title={`Mark "${a.customerName}" as no-show?`} okText="Mark No-Show"
            okButtonProps={{ danger: true }} onConfirm={() => markStatus(a.key, 'No-Show')}>
            <Button size="small" danger ghost>No-Show</Button>
          </Popconfirm>
        </Space>
      )}
      {a.status === 'Checked-In' && (
        <Button size="small" type="primary" style={{ marginTop: 10 }}
          onClick={() => markStatus(a.key, 'In Session')}>
          Start Session
        </Button>
      )}
      {a.status === 'In Session' && (
        <Button size="small" type="primary" style={{ marginTop: 10, background: colors.status.success, borderColor: colors.status.success }}
          onClick={() => markStatus(a.key, 'Completed')}>
          Complete
        </Button>
      )}
    </Card>
  );

  const todayView = (
    <div>
      {/* Branch utilization */}
      {branchUtilization.length > 0 && (
        <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }}
          styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TeamOutlined style={{ color: colors.gold.primary }} />
            <Text strong style={{ color: colors.text.primary }}>Branch utilization — today</Text>
          </div>
          <Row gutter={[12, 12]}>
            {branchUtilization.map((b) => {
              const utilPct = Math.min(100, Math.round((b.booked / BRANCH_CAPACITY) * 100));
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={b.branch}>
                  <div style={{ padding: 12, background: colors.black.tertiary, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text strong style={{ color: colors.text.primary, fontSize: 13 }}>{b.branch}</Text>
                      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{b.booked}/{BRANCH_CAPACITY}</Text>
                    </div>
                    <Progress
                      percent={utilPct} size="small"
                      strokeColor={utilPct > 80 ? colors.status.error : utilPct > 50 ? colors.gold.primary : colors.status.success}
                      showInfo={false}
                    />
                    <Space size={6} style={{ marginTop: 4, fontSize: 11 }} wrap>
                      <Text style={{ color: colors.status.success }}>✓ {b.completed}</Text>
                      {b.noShow > 0 && <Text style={{ color: colors.status.error }}>✗ {b.noShow}</Text>}
                    </Space>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      {/* Per-branch columns */}
      {todayByBranch.length === 0 ? (
        <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
          <Empty description="No appointments today match the selected filters" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {todayByBranch.map(([branch, list]) => (
            <Col xs={24} md={12} lg={8} key={branch}>
              <Card
                size="small"
                style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
                styles={{ body: { padding: 12 } }}
                title={
                  <Space>
                    <Text strong style={{ color: colors.text.primary }}>{branch}</Text>
                    <Tag style={{ background: colors.gold.primary, color: '#FFFFFF', border: 'none', margin: 0, fontWeight: 600 }}>
                      {list.length}
                    </Tag>
                  </Space>
                }
              >
                {list.map((a) => <TodayCard key={a.key} a={a} />)}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );

  // =====================================================================
  // Calendar view
  // =====================================================================
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const k = dayjs(a.startsAt).format('YYYY-MM-DD');
      const list = map.get(k) ?? [];
      list.push(a);
      map.set(k, list);
    }
    return map;
  }, [filtered]);

  const calendarCell = (value: Dayjs) => {
    const key = value.format('YYYY-MM-DD');
    const list = appointmentsByDate.get(key) ?? [];
    if (list.length === 0) return null;
    const completed = list.filter((a) => a.status === 'Completed').length;
    const upcoming = list.filter((a) => a.status === 'Confirmed' || a.status === 'Pending').length;
    const issues = list.filter((a) => a.status === 'No-Show' || a.status === 'Cancelled').length;
    return (
      <div style={{ minHeight: 56, padding: '2px 0' }}>
        <Badge count={list.length}
          style={{ background: colors.gold.primary, color: '#FFFFFF', fontWeight: 600 }} />
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
          {completed > 0 && <span style={{ color: colors.status.success }}>✓ {completed} done</span>}
          {upcoming > 0 && <span style={{ color: colors.status.info }}>↗ {upcoming} upcoming</span>}
          {issues > 0 && <span style={{ color: colors.status.error }}>! {issues}</span>}
        </div>
      </div>
    );
  };

  const calendarView = (
    <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
      styles={{ body: { padding: 8 } }}>
      <Calendar
        value={calendarDate}
        onChange={setCalendarDate}
        onSelect={(d, info) => {
          if (info.source === 'date') setDayDrawerDate(d);
        }}
        cellRender={(date, info) => info.type === 'date' ? calendarCell(date) : null}
        fullscreen
      />
    </Card>
  );

  const dayDrawerList = useMemo(() => {
    if (!dayDrawerDate) return [];
    const key = dayDrawerDate.format('YYYY-MM-DD');
    return (appointmentsByDate.get(key) ?? []).sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [dayDrawerDate, appointmentsByDate]);

  // =====================================================================
  // Render
  // =====================================================================
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>Reset</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={filtered.length === 0}>Export CSV</Button>
        </Space>
      </div>

      {/* KPI strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={5}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Today&apos;s Total</Text>}
              value={kpis.today}
              prefix={<CalendarOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.gold.primary, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Upcoming Today</Text>}
              value={kpis.upcoming}
              prefix={<ClockCircleOutlined style={{ color: colors.status.info }} />}
              valueStyle={{ color: colors.status.info, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Completed Today</Text>}
              value={kpis.completed}
              prefix={<CheckCircleOutlined style={{ color: colors.status.success }} />}
              valueStyle={{ color: colors.status.success, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <Card style={{ background: kpis.noShows > 0 ? colors.status.error : colors.black.secondary,
            border: `1px solid ${kpis.noShows > 0 ? colors.status.error : colors.border}` }}>
            <Statistic title={<Text style={{ color: kpis.noShows > 0 ? '#FFFFFF' : colors.text.placeholder }}>No-Shows Today</Text>}
              value={kpis.noShows}
              prefix={<CloseCircleOutlined style={{ color: kpis.noShows > 0 ? '#FFFFFF' : colors.status.error }} />}
              valueStyle={{ color: kpis.noShows > 0 ? '#FFFFFF' : colors.status.error, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={24} sm={24} lg={4}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>This Week</Text>}
              value={kpis.week}
              prefix={<ScheduleOutlined style={{ color: colors.text.primary }} />}
              valueStyle={{ color: colors.text.primary, fontSize: 24 }} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <FilterOutlined style={{ color: colors.gold.primary }} />
            <Text strong style={{ color: colors.text.primary }}>Filters</Text>
          </Space>
          <Space.Compact>
            <Button type={view === 'today' ? 'primary' : 'default'} icon={<ScheduleOutlined />} onClick={() => setView('today')}>Today&apos;s Schedule</Button>
            <Button type={view === 'calendar' ? 'primary' : 'default'} icon={<CalendarOutlined />} onClick={() => setView('calendar')}>Calendar</Button>
            <Button type={view === 'list' ? 'primary' : 'default'} icon={<UnorderedListOutlined />} onClick={() => setView('list')}>List</Button>
          </Space.Compact>
        </div>
        <Row gutter={[12, 12]} justify="start">
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Customer Search</Text>
            <Input prefix={<UserOutlined style={{ color: colors.text.placeholder }} />}
              placeholder="Name or phone" value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setPage(1); }}
              allowClear style={{ marginTop: 4 }} />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Date Range</Text>
            <RangePicker style={{ width: '100%', marginTop: 4 }} value={dateRange ?? undefined}
              onChange={(r) => { setDateRange(r && r[0] && r[1] ? [r[0], r[1]] : null); setPage(1); }}
              format="DD-MM-YYYY" allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Branch</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading} value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }}
              options={branchOptions} allowClear showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Consultant</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All consultants"
              value={consultant} onChange={(v: string | undefined) => { setConsultant(v); setPage(1); }}
              options={consultantOptions} allowClear showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Status</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All statuses"
              value={status} onChange={(v: AppointmentStatus | undefined) => { setStatus(v); setPage(1); }}
              options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} allowClear />
          </Col>
        </Row>
      </Card>

      {/* View body */}
      {view === 'today' && todayView}
      {view === 'calendar' && calendarView}
      {view === 'list' && (
        <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          styles={{ body: { padding: 16 } }}>
          <Table<Appointment> rowKey="key" columns={listColumns} dataSource={filtered}
            pagination={pagination} size="middle" scroll={{ x: 1600 }}
            locale={{ emptyText: <Empty description="No appointments match the selected filters" /> }} />
        </Card>
      )}

      {/* Day drilldown modal */}
      <Modal
        title={dayDrawerDate ? `${dayDrawerDate.format('dddd, DD MMMM YYYY')} — ${dayDrawerList.length} appointment${dayDrawerList.length === 1 ? '' : 's'}` : ''}
        open={dayDrawerDate !== null}
        footer={<Button onClick={() => setDayDrawerDate(null)}>Close</Button>}
        onCancel={() => setDayDrawerDate(null)}
        width={760}
      >
        {dayDrawerList.length === 0 ? (
          <Empty description="No appointments on this day" />
        ) : (
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {dayDrawerList.map((a) => (
              <Card key={a.key} size="small"
                style={{
                  marginBottom: 10,
                  background: colors.black.tertiary,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${statusColor(a.status)}`,
                }}
                styles={{ body: { padding: 12 } }}>
                <Row gutter={12} align="middle">
                  <Col xs={24} md={6}>
                    <Text strong style={{ color: colors.gold.primary, fontSize: 16 }}>
                      {dayjs(a.startsAt).format('hh:mm A')}
                    </Text>
                    <div style={{ color: colors.text.placeholder, fontSize: 12 }}>{a.durationMins} mins</div>
                  </Col>
                  <Col xs={24} md={10}>
                    <div style={{ fontWeight: 600, color: colors.text.primary }}>{a.customerName}</div>
                    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                      <PhoneOutlined /> {a.mobileNumber}
                    </Text>
                    <div style={{ color: colors.text.primary, fontSize: 13, marginTop: 4 }}>{a.service}</div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Space size={4} wrap>
                      <Tag style={{ background: statusColor(a.status), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{a.status}</Tag>
                      <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{a.branchName}</Tag>
                      <Tag style={{ background: colors.gold.primary, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{a.consultant}</Tag>
                    </Space>
                    {a.amountDue > 0 && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <Tooltip title="Pending payment">
                          <span style={{ color: colors.status.warning, fontWeight: 600 }}>Due: {formatMoney(a.amountDue)}</span>
                        </Tooltip>
                      </div>
                    )}
                  </Col>
                </Row>
                {a.remarks && (
                  <Paragraph style={{ color: colors.text.placeholder, fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                    {a.remarks}
                  </Paragraph>
                )}
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
