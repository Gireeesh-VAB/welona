'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  DownOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import Link from 'next/link';
import { useAdminEmployees } from '@/hooks/useAdminEmployees';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminDepartments } from '@/hooks/useAdminDepartments';
import {
  useAttendance,
  useBulkAttendance,
  useUpsertAttendance,
} from '@/hooks/useAttendance';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError, getSessionKind } from '@/lib/api-client';
import { useBranchAuthStore } from '@/store/branchAuthStore';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from '@shared/enums';

const { Title, Text } = Typography;

const STATUS_META: Record<AttendanceStatus, { label: string; color: string }> = {
  present: { label: 'Present', color: '#22c55e' },
  half_day: { label: 'Half-day', color: '#facc15' },
  wfh: { label: 'WFH', color: '#0ea5e9' },
  leave: { label: 'Leave', color: '#a855f7' },
  absent: { label: 'Absent', color: '#ef4444' },
  holiday: { label: 'Holiday', color: '#64748b' },
};

interface RowState {
  status: AttendanceStatus | null;
  remarks: string;
  attendanceId: string | null;
  dirty: boolean;
  saving: boolean;
}

export default function AdminHrAttendancePage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  // Branch (SystemUser) sessions get a read-only, branch-locked view: the data
  // is auto-scoped server-side, the branch filter is pinned, and attendance
  // marking stays admin-only on the backend.
  const isBranchSession = getSessionKind() === 'branch';
  const branchSession = useBranchAuthStore((s) => s.branch);

  const [date, setDate] = useState<Dayjs>(dayjs());
  const [branchId, setBranchId] = useState<string | undefined>(
    isBranchSession ? branchSession?.branchId : undefined,
  );
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('present');

  const dateIso = useMemo(() => date.startOf('day').toISOString(), [date]);

  // Keep the branch filter pinned to the session branch once it loads.
  useEffect(() => {
    if (isBranchSession && branchSession?.branchId) setBranchId(branchSession.branchId);
  }, [isBranchSession, branchSession?.branchId]);

  const { data: employeesPage, isLoading: employeesLoading } = useAdminEmployees({
    limit: 500,
  });
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const { data: departmentsData } = useAdminDepartments({ limit: 200 });

  const { data: attendanceForDay, isLoading: attendanceLoading } = useAttendance({
    from: dateIso,
    to: dateIso,
    limit: 1000,
  });

  const upsert = useUpsertAttendance();
  const bulk = useBulkAttendance();

  // ---- State per employee row, hydrated when day / data changes ----
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  useEffect(() => {
    if (!employeesPage) return;
    const next: Record<string, RowState> = {};
    const byEmp = new Map<string, { id: string; status: AttendanceStatus; remarks: string | null }>();
    (attendanceForDay?.items ?? []).forEach((a) => {
      byEmp.set(a.employee.id, {
        id: a.id,
        status: a.status,
        remarks: a.remarks ?? '',
      });
    });
    employeesPage.items.forEach((e) => {
      const existing = byEmp.get(e.id);
      next[e.id] = {
        attendanceId: existing?.id ?? null,
        status: existing?.status ?? null,
        remarks: existing?.remarks ?? '',
        dirty: false,
        saving: false,
      };
    });
    setRowState(next);
  }, [employeesPage, attendanceForDay]);

  const employees = useMemo(() => {
    const all = employeesPage?.items ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((e) => {
      if (branchId && e.branch?.id !== branchId) return false;
      if (departmentId && e.department?.id !== departmentId) return false;
      if (!q) return true;
      return [e.name, e.employeeCode, e.mobileNo, e.email ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [employeesPage, branchId, departmentId, search]);

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      half_day: 0,
      wfh: 0,
      leave: 0,
      holiday: 0,
    };
    employees.forEach((e) => {
      const s = rowState[e.id]?.status;
      if (s) c[s] += 1;
    });
    return c;
  }, [employees, rowState]);

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  const saveRow = async (employeeId: string) => {
    const cur = rowState[employeeId];
    if (!cur?.status) {
      message.warning('Pick a status first');
      return;
    }
    setRowState((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], saving: true },
    }));
    try {
      await upsert.mutateAsync({
        employeeId,
        date: dateIso,
        status: cur.status,
        remarks: cur.remarks.trim() || undefined,
      });
      message.success('Saved');
      setRowState((prev) => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], saving: false, dirty: false },
      }));
    } catch (err) {
      setRowState((prev) => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], saving: false },
      }));
      fail(err, 'Save failed');
    }
  };

  const runBulk = async () => {
    const entries = employees
      .filter((e) => {
        const cur = rowState[e.id];
        // Only push rows that don't already match the chosen status —
        // saves a round trip when most are already marked.
        return cur?.status !== bulkStatus;
      })
      .map((e) => ({ employeeId: e.id, status: bulkStatus }));
    if (entries.length === 0) {
      message.info('Everyone in the current view already has that status.');
      setBulkOpen(false);
      return;
    }
    try {
      await bulk.mutateAsync({ date: dateIso, entries });
      message.success(`Marked ${entries.length} employee(s) as ${STATUS_META[bulkStatus].label}`);
      setBulkOpen(false);
    } catch (err) {
      fail(err, 'Bulk mark failed');
    }
  };

  const columns: ColumnsType<(typeof employees)[number]> = [
    {
      title: 'Employee',
      dataIndex: 'name',
      fixed: 'left',
      width: 260,
      render: (_, row) => (
        <div>
          <Link
            href={`/admin/hr/employee/${row.id}`}
            style={{ color: colors.text.primary, fontWeight: 600 }}
          >
            {row.name}
          </Link>
          <div style={{ fontSize: 12, color: colors.text.placeholder }}>
            {row.employeeCode}
            {row.designation?.name ? ` · ${row.designation.name}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Branch',
      width: 140,
      render: (_, row) => row.branch?.name ?? '—',
    },
    {
      title: 'Department',
      width: 140,
      render: (_, row) => row.department?.name ?? '—',
    },
    {
      title: 'Status',
      width: 480,
      render: (_, row) => {
        const cur = rowState[row.id];
        return (
          <Segmented
            disabled={isBranchSession}
            value={cur?.status ?? undefined}
            onChange={(v) =>
              setRowState((prev) => ({
                ...prev,
                [row.id]: {
                  ...prev[row.id],
                  status: v as AttendanceStatus,
                  dirty: true,
                },
              }))
            }
            options={ATTENDANCE_STATUSES.filter((s) => s !== 'holiday').map((s) => ({
              label: STATUS_META[s].label,
              value: s,
            }))}
          />
        );
      },
    },
    {
      title: 'Remarks',
      width: 220,
      render: (_, row) => {
        const cur = rowState[row.id];
        return (
          <Input
            size="small"
            disabled={isBranchSession}
            placeholder="Optional"
            value={cur?.remarks ?? ''}
            maxLength={300}
            onChange={(e) =>
              setRowState((prev) => ({
                ...prev,
                [row.id]: {
                  ...prev[row.id],
                  remarks: e.target.value,
                  dirty: true,
                },
              }))
            }
          />
        );
      },
    },
    {
      title: '',
      width: 120,
      fixed: 'right',
      render: (_, row) => {
        if (isBranchSession) return null;
        const cur = rowState[row.id];
        return (
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            disabled={!cur?.dirty || !cur?.status}
            loading={cur?.saving}
            onClick={() => saveRow(row.id)}
          >
            Save
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            Attendance
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Mark daily attendance. Approved leaves are painted automatically.
          </Text>
        </div>
        {!isBranchSession && (
        <Space>
          <Dropdown
            menu={{
              items: ATTENDANCE_STATUSES.filter((s) => s !== 'holiday').map((s) => ({
                key: s,
                label: STATUS_META[s].label,
                onClick: () => {
                  setBulkStatus(s);
                  setBulkOpen(true);
                },
              })),
            }}
          >
            <Button icon={<CheckOutlined />}>
              Mark all as <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
        )}
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 12 }}
        styles={{ body: { padding: 12 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={6}>
            <DatePicker
              value={date}
              onChange={(v) => v && setDate(v)}
              allowClear={false}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              disabledDate={(d) => d.isAfter(dayjs().endOf('day'))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              allowClear={!isBranchSession}
              showSearch
              disabled={isBranchSession}
              placeholder="All branches"
              value={branchId}
              onChange={setBranchId}
              style={{ width: '100%' }}
              options={
                isBranchSession && branchSession
                  ? [{ value: branchSession.branchId, label: branchSession.branchName ?? 'My branch' }]
                  : (branchesData?.items ?? []).map((b) => ({
                      value: b.id,
                      label: `${b.branchName} (${b.branchCode})`,
                    }))
              }
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              allowClear
              showSearch
              placeholder="All departments"
              value={departmentId}
              onChange={setDepartmentId}
              style={{ width: '100%' }}
              options={(departmentsData?.items ?? []).map((d) => ({
                value: d.id,
                label: d.name,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
          <Col xs={24} sm={6}>
            <Input.Search
              placeholder="Search name, code, mobile…"
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
        </Row>
        <Row gutter={8} style={{ marginTop: 12 }}>
          {(['present', 'half_day', 'wfh', 'leave', 'absent'] as const).map((s) => (
            <Col key={s}>
              <Badge
                color={STATUS_META[s].color}
                text={
                  <span style={{ color: colors.text.primary }}>
                    {STATUS_META[s].label}: <strong>{counts[s]}</strong>
                  </span>
                }
              />
            </Col>
          ))}
          <Col>
            <Tag>
              Unmarked: {employees.filter((e) => !rowState[e.id]?.status).length}
            </Tag>
          </Col>
          <Col flex="auto" />
          <Col>
            <Tag icon={<ReloadOutlined />}>{date.format('dddd, DD MMM YYYY')}</Tag>
          </Col>
        </Row>
      </Card>

      <Spin spinning={attendanceLoading} tip="Loading attendance for the selected day…">
        <Card
          style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            rowKey="id"
            loading={employeesLoading}
            columns={columns}
            dataSource={employees}
            pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [10, 25, 50, 100] }}
            size="middle"
            scroll={{ x: 1260 }}
          />
        </Card>
      </Spin>

      <Modal
        open={bulkOpen}
        title={`Mark every employee in view as ${STATUS_META[bulkStatus].label}`}
        onOk={runBulk}
        confirmLoading={bulk.isPending}
        onCancel={() => setBulkOpen(false)}
        okText="Confirm bulk mark"
      >
        <Text>
          This will write {employees.length} attendance row(s) for{' '}
          <strong>{date.format('DD MMM YYYY')}</strong>. Existing entries for the same day
          will be overwritten. Use the branch / department filters first to narrow the
          batch.
        </Text>
        <div style={{ marginTop: 12 }}>
          <Form layout="vertical">
            <Form.Item label="Status">
              <Select
                value={bulkStatus}
                onChange={(v: AttendanceStatus) => setBulkStatus(v)}
                options={ATTENDANCE_STATUSES.filter((s) => s !== 'holiday').map((s) => ({
                  value: s,
                  label: STATUS_META[s].label,
                }))}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
