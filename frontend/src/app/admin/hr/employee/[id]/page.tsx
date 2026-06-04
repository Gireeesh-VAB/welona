'use client';

import { useMemo } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Progress,
  Row,
  Skeleton,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  BankOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useBrandColors } from '@/hooks/useBrandColors';
import EmployeeHrActions from '@/components/hr/EmployeeHrActions';
import type { AdminAttendance } from '@shared/types/admin-attendance';
import type {
  AdminLeaveApplication,
  AdminLeaveBalanceRow,
} from '@shared/types/admin-leave';
import type { LeaveApplicationStatus } from '@shared/enums';

const { Title, Text } = Typography;

const STATUS_TAG_COLOR: Record<string, string> = {
  present: 'green',
  half_day: 'gold',
  wfh: 'blue',
  leave: 'purple',
  absent: 'red',
  holiday: 'default',
};

const LEAVE_STATUS_COLOR: Record<LeaveApplicationStatus, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
};

function formatDateDmy(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getUTCFullYear()}`;
}

function inr(paise: number): string {
  if (!paise) return '—';
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

export default function AdminHrEmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const colors = useBrandColors();
  const { data, isLoading } = useEmployeeProfile(params.id);

  const initials = useMemo(() => {
    const n = data?.employee.name ?? '';
    return n
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [data]);

  const cardStyle = {
    background: colors.black.secondary,
    border: `1px solid ${colors.border}`,
  };

  const attendanceColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      render: (v: string) => formatDateDmy(v),
      width: 130,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag color={STATUS_TAG_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Check-in',
      dataIndex: 'checkIn',
      width: 120,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    },
    {
      title: 'Check-out',
      dataIndex: 'checkOut',
      width: 120,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    },
    {
      title: 'Hours',
      dataIndex: 'hoursWorked',
      width: 80,
      align: 'right' as const,
      render: (v: number | null) => v ?? '—',
    },
    { title: 'Remarks', dataIndex: 'remarks', render: (v: string | null) => v ?? '—' },
  ];

  const leaveColumns = [
    {
      title: 'Type',
      width: 140,
      render: (_: unknown, row: AdminLeaveApplication) => (
        <Space>
          <Tag color="gold">{row.leaveType.code}</Tag>
          {row.leaveType.name}
        </Space>
      ),
    },
    {
      title: 'From → To',
      width: 200,
      render: (_: unknown, row: AdminLeaveApplication) =>
        `${formatDateDmy(row.fromDate)} → ${formatDateDmy(row.toDate)}`,
    },
    { title: 'Days', dataIndex: 'days', width: 70, align: 'right' as const },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v: LeaveApplicationStatus) => <Tag color={LEAVE_STATUS_COLOR[v]}>{v}</Tag>,
    },
    { title: 'Reason', dataIndex: 'reason', render: (v: string | null) => v ?? '—' },
  ];

  const balanceColumns = [
    {
      title: 'Type',
      render: (_: unknown, r: AdminLeaveBalanceRow) => (
        <Space>
          <Tag color="gold">{r.leaveType.code}</Tag>
          {r.leaveType.name}
        </Space>
      ),
    },
    { title: 'Allocated', dataIndex: 'allocated', align: 'right' as const, width: 90 },
    { title: 'Used', dataIndex: 'used', align: 'right' as const, width: 70 },
    {
      title: 'Pending',
      dataIndex: 'pending',
      align: 'right' as const,
      width: 80,
      render: (v: number) => (v > 0 ? <Tag color="gold">{v}</Tag> : v),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      align: 'right' as const,
      width: 80,
      render: (v: number) => (
        <Text strong style={{ color: v <= 0 ? colors.status.error : colors.status.success }}>
          {v}
        </Text>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Spin tip="Loading employee profile…">
        <Card style={cardStyle}>
          <Skeleton avatar paragraph={{ rows: 4 }} active />
        </Card>
      </Spin>
    );
  }

  if (!data) {
    return <Empty description="Employee not found" />;
  }

  const e = data.employee;
  const s = data.attendance.summary;
  const presenceTotal = s.present + s.halfDay + s.wfh;
  const presencePct =
    s.workingDays === 0 ? 0 : Math.round((presenceTotal / s.workingDays) * 100);

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/admin/hr/employee')}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Back to employees
      </Button>

      <Card style={{ ...cardStyle, marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="80px">
            <Avatar
              size={72}
              src={e.photoUrl || undefined}
              style={{
                background: colors.gold.primary,
                color: colors.text.onGold,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {initials || <UserOutlined />}
            </Avatar>
          </Col>
          <Col flex="auto">
            <Title level={3} style={{ marginBottom: 4, color: colors.text.primary }}>
              {e.name}
            </Title>
            <Space size={8} wrap>
              <Tag color="gold">{e.employeeCode}</Tag>
              {e.designation && <Tag>{e.designation.name}</Tag>}
              {e.department && <Tag color="blue">{e.department.name}</Tag>}
              {e.branch && <Tag color="purple">{e.branch.name}</Tag>}
              {!e.isActive && <Tag color="red">Inactive</Tag>}
            </Space>
            <div style={{ marginTop: 8 }}>
              <Space size={16} wrap>
                <Space size={4}>
                  <PhoneOutlined style={{ color: colors.text.placeholder }} />
                  <Text>{e.mobileNo}</Text>
                </Space>
                {e.email && (
                  <Space size={4}>
                    <MailOutlined style={{ color: colors.text.placeholder }} />
                    <Text>{e.email}</Text>
                  </Space>
                )}
                <Space size={4}>
                  <ClockCircleOutlined style={{ color: colors.text.placeholder }} />
                  <Text>Joined {formatDateDmy(e.joiningDate)}</Text>
                </Space>
              </Space>
            </div>
            <div style={{ marginTop: 12 }}>
              <EmployeeHrActions employee={e} />
            </div>
          </Col>
          <Col xs={24} md={6}>
            <Card size="small" style={{ background: colors.black.tertiary, border: 'none' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                This month presence ({s.year}-{String(s.month).padStart(2, '0')})
              </Text>
              <Progress
                percent={presencePct}
                size="small"
                strokeColor={colors.gold.primary}
                style={{ marginTop: 4 }}
              />
              <Text style={{ fontSize: 12, color: colors.text.placeholder }}>
                {presenceTotal} / {s.workingDays} marked days
              </Text>
            </Card>
          </Col>
        </Row>
      </Card>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title={<Space><IdcardOutlined /> Personal</Space>} style={cardStyle}>
                    <Descriptions column={1} size="small" colon={false}>
                      <Descriptions.Item label="Father's name">{e.fatherName ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Gender">{e.gender ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Date of birth">{formatDateDmy(e.dob)}</Descriptions.Item>
                      <Descriptions.Item label="Alternate mobile">{e.mobileAlternate ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="PAN">{e.panNo ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Pincode">{e.pincode ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Address">{e.address ?? '—'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<Space><BankOutlined /> Official</Space>} style={cardStyle}>
                    <Descriptions column={1} size="small" colon={false}>
                      <Descriptions.Item label="Biometric ID">{e.biometricId ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Designation">{e.designation?.name ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Department">{e.department?.name ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Branch">{e.branch?.name ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Zone">{e.zone?.stateName ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Salary">{inr(e.salary)}</Descriptions.Item>
                      <Descriptions.Item label="Bank">
                        {e.bankName ? `${e.bankName} — ${e.bankAccountNo ?? ''}` : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="PF / ESI">
                        {e.pf ? 'PF Yes' : 'PF No'} · {e.esi ? 'ESI Yes' : 'ESI No'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Weekly Off">{e.weeklyOff ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Relieving Date">{formatDateDmy(e.relievingDate)}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'attendance',
            label: `Attendance (${s.workingDays} this month)`,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card style={cardStyle}>
                    <Row gutter={[16, 16]}>
                      {[
                        { key: 'present', label: 'Present', value: s.present, color: '#22c55e' },
                        { key: 'half_day', label: 'Half-day', value: s.halfDay, color: '#facc15' },
                        { key: 'wfh', label: 'WFH', value: s.wfh, color: '#0ea5e9' },
                        { key: 'leave', label: 'Leave', value: s.leave, color: '#a855f7' },
                        { key: 'absent', label: 'Absent', value: s.absent, color: '#ef4444' },
                        { key: 'holiday', label: 'Holiday', value: s.holiday, color: '#64748b' },
                      ].map((b) => (
                        <Col key={b.key} xs={12} sm={8} md={4}>
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: 8,
                              background: colors.black.tertiary,
                              borderLeft: `4px solid ${b.color}`,
                            }}
                          >
                            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                              {b.label}
                            </Text>
                            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text.primary }}>
                              {b.value}
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="Last 30 entries" style={cardStyle}>
                    <Table<AdminAttendance>
                      rowKey="id"
                      dataSource={data.attendance.recent}
                      columns={attendanceColumns}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: 'No attendance entries yet' }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'leave',
            label: `Leave (${data.leave.balances.year})`,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title={`Balance — ${data.leave.balances.year}`} style={cardStyle}>
                    <Table
                      rowKey={(r) => r.leaveType.id}
                      dataSource={data.leave.balances.rows}
                      columns={balanceColumns}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: 'No leave types configured' }}
                    />
                    <div style={{ marginTop: 12 }}>
                      <Link href="/admin/hr/leaves">
                        <Button type="primary" size="small">
                          Apply leave →
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Recent applications" style={cardStyle}>
                    <Table<AdminLeaveApplication>
                      rowKey="id"
                      dataSource={data.leave.recent}
                      columns={leaveColumns}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: 'No applications yet' }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
}
