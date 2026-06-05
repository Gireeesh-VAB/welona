'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import Link from 'next/link';
import {
  useApplyLeave,
  useApproveLeave,
  useCancelLeave,
  useLeaveBalance,
  useLeaves,
  useRejectLeave,
} from '@/hooks/useLeaves';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useAdminEmployees } from '@/hooks/useAdminEmployees';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type {
  AdminLeaveApplication,
} from '@shared/types/admin-leave';
import type { LeaveApplicationStatus } from '@shared/enums';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<LeaveApplicationStatus, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
};

function inclusiveDays(from: Dayjs, to: Dayjs): number {
  return to.startOf('day').diff(from.startOf('day'), 'day') + 1;
}

function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getUTCFullYear()}`;
}

interface ApplyValues {
  employeeId: string;
  leaveTypeId: string;
  range: [Dayjs, Dayjs];
  days: number;
  reason?: string;
}

interface DecisionValues {
  approverNote?: string;
}

export default function AdminHrLeavesPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [statusFilter, setStatusFilter] = useState<LeaveApplicationStatus | 'all'>(
    'pending',
  );
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useLeaves({
    status: statusFilter === 'all' ? undefined : statusFilter,
    employeeId: employeeFilter,
    page,
    limit,
  });

  const { data: leaveTypesData } = useLeaveTypes({ limit: 200 });
  const { data: employeesData } = useAdminEmployees({ limit: 500 });

  // Branch (SystemUser) sessions get a read-only, branch-scoped view: the list
  // is auto-scoped server-side and leave writes stay admin-only on the backend.

  const apply = useApplyLeave();
  const approve = useApproveLeave();
  const reject = useRejectLeave();
  const cancel = useCancelLeave();

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm] = Form.useForm<ApplyValues>();

  const [decisionOpen, setDecisionOpen] = useState<{
    row: AdminLeaveApplication;
    kind: 'approve' | 'reject';
  } | null>(null);
  const [decisionForm] = Form.useForm<DecisionValues>();

  const [balanceFor, setBalanceFor] = useState<{ id: string; name: string } | null>(null);
  const { data: balance, isLoading: balanceLoading } = useLeaveBalance(
    balanceFor?.id ?? null,
  );

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  const openApply = () => {
    applyForm.resetFields();
    applyForm.setFieldsValue({ days: 1 });
    setApplyOpen(true);
  };

  const onApply = async () => {
    let values: ApplyValues;
    try {
      values = await applyForm.validateFields();
    } catch {
      return;
    }
    try {
      await apply.mutateAsync({
        employeeId: values.employeeId,
        leaveTypeId: values.leaveTypeId,
        fromDate: values.range[0].startOf('day').toISOString(),
        toDate: values.range[1].startOf('day').toISOString(),
        days: values.days,
        reason: values.reason?.trim() || undefined,
      });
      message.success('Leave application submitted');
      setApplyOpen(false);
    } catch (err) {
      fail(err, 'Apply failed');
    }
  };

  const onDecision = async () => {
    if (!decisionOpen) return;
    const note = decisionForm.getFieldValue('approverNote') as string | undefined;
    try {
      if (decisionOpen.kind === 'approve') {
        await approve.mutateAsync({
          id: decisionOpen.row.id,
          body: { approverNote: note?.trim() || undefined },
        });
        message.success('Leave approved');
      } else {
        await reject.mutateAsync({
          id: decisionOpen.row.id,
          body: { approverNote: note?.trim() || undefined },
        });
        message.success('Leave rejected');
      }
      setDecisionOpen(null);
    } catch (err) {
      fail(err, decisionOpen.kind === 'approve' ? 'Approve failed' : 'Reject failed');
    }
  };

  const onCancel = async (row: AdminLeaveApplication) => {
    try {
      await cancel.mutateAsync(row.id);
      message.success('Leave cancelled');
    } catch (err) {
      fail(err, 'Cancel failed');
    }
  };

  // Live preview of inclusive day range to help HR set `days` correctly
  const applyRange: [Dayjs, Dayjs] | undefined = Form.useWatch('range', applyForm);
  const applyDayPreview = useMemo(
    () => (applyRange?.[0] && applyRange?.[1] ? inclusiveDays(applyRange[0], applyRange[1]) : 0),
    [applyRange],
  );

  const columns: ColumnsType<AdminLeaveApplication> = [
    {
      title: 'Employee',
      width: 220,
      fixed: 'left',
      render: (_, row) => (
        <div>
          <Link
            href={`/admin/hr/employee/${row.employee.id}`}
            style={{ color: colors.text.primary, fontWeight: 600 }}
          >
            {row.employee.name}
          </Link>
          <div style={{ fontSize: 12, color: colors.text.placeholder }}>
            {row.employee.employeeCode}
            {row.employee.branchName ? ` · ${row.employee.branchName}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      width: 140,
      render: (_, row) => (
        <Space size={4}>
          <Tag color="gold">{row.leaveType.code}</Tag>
          <span style={{ color: colors.text.primary }}>{row.leaveType.name}</span>
        </Space>
      ),
    },
    {
      title: 'From → To',
      width: 200,
      render: (_, row) => (
        <span>
          {formatDateDmy(row.fromDate)} <Text type="secondary">→</Text>{' '}
          {formatDateDmy(row.toDate)}
        </span>
      ),
    },
    {
      title: 'Days',
      dataIndex: 'days',
      width: 80,
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (v: LeaveApplicationStatus) => (
        <Tag color={STATUS_COLOR[v]}>{v}</Tag>
      ),
    },
    {
      title: 'Reason / Note',
      width: 260,
      render: (_, row) => (
        <div>
          {row.reason ? (
            <div style={{ color: colors.text.primary }}>{row.reason}</div>
          ) : (
            <Text type="secondary">—</Text>
          )}
          {row.approverNote && (
            <div style={{ fontSize: 12, color: colors.text.placeholder }}>
              ↳ {row.approverNote}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Approver',
      width: 160,
      render: (_, row) =>
        row.approvedBy ? (
          <div>
            <div style={{ color: colors.text.primary }}>{row.approvedBy.name}</div>
            <div style={{ fontSize: 12, color: colors.text.placeholder }}>
              {row.approvedAt ? formatDateDmy(row.approvedAt) : ''}
            </div>
          </div>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4} wrap>
          <Tooltip title="View balance">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setBalanceFor({ id: row.employee.id, name: row.employee.name })}
            />
          </Tooltip>
          {row.status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    decisionForm.resetFields();
                    setDecisionOpen({ row, kind: 'approve' });
                  }}
                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    decisionForm.resetFields();
                    setDecisionOpen({ row, kind: 'reject' });
                  }}
                  style={{
                    background: colors.status.error,
                    borderColor: colors.status.error,
                    color: '#FFFFFF',
                  }}
                />
              </Tooltip>
            </>
          )}
          {(row.status === 'pending' || row.status === 'approved') && (
            <Popconfirm
              title={`Cancel ${row.employee.name}'s leave?`}
              okText="Cancel leave"
              okButtonProps={{ danger: true }}
              cancelText="Back"
              onConfirm={() => onCancel(row)}
            >
              <Tooltip title="Cancel">
                <Button size="small" icon={<StopOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
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
            Leave Applications
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Apply on behalf of an employee, approve / reject pending requests, view
            current balance.
          </Text>
        </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openApply}>
            Apply Leave
          </Button>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 12 }}
        styles={{ body: { padding: 12 } }}
      >
        <Row gutter={12} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Segmented
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v as typeof statusFilter);
                setPage(1);
              }}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'All', value: 'all' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              allowClear
              showSearch
              placeholder="Filter by employee"
              style={{ width: '100%' }}
              value={employeeFilter}
              onChange={(v) => {
                setEmployeeFilter(v);
                setPage(1);
              }}
              options={(employeesData?.items ?? []).map((e) => ({
                value: e.id,
                label: `${e.name} (${e.employeeCode})`,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
        </Row>
      </Card>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 0 } }}
      >
        <Table<AdminLeaveApplication>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={{
            current: page,
            pageSize: limit,
            total: data?.meta.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (next, size) => {
              setPage(next);
              if (size !== limit) setLimit(size);
            },
            showTotal: (total, range) =>
              `${range[0]} - ${range[1]} of ${total} request${total === 1 ? '' : 's'}`,
          }}
          size="middle"
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* ---- Apply Leave modal ---- */}
      <Modal
        open={applyOpen}
        title="Apply Leave"
        onOk={onApply}
        onCancel={() => setApplyOpen(false)}
        confirmLoading={apply.isPending}
        okText="Submit"
        destroyOnClose
      >
        <Form<ApplyValues>
          form={applyForm}
          layout="vertical"
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Employee"
            name="employeeId"
            rules={[{ required: true, message: 'Pick an employee' }]}
          >
            <Select
              showSearch
              placeholder="Pick employee"
              options={(employeesData?.items ?? []).map((e) => ({
                value: e.id,
                label: `${e.name} (${e.employeeCode})`,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            label="Leave Type"
            name="leaveTypeId"
            rules={[{ required: true, message: 'Pick a leave type' }]}
          >
            <Select
              showSearch
              placeholder="Pick leave type"
              options={(leaveTypesData?.items ?? []).map((t) => ({
                value: t.id,
                label: `${t.code} — ${t.name}`,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            label="Date range"
            name="range"
            rules={[{ required: true, message: 'Pick from / to dates' }]}
          >
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              onChange={(v) => {
                if (v?.[0] && v?.[1]) {
                  applyForm.setFieldValue('days', inclusiveDays(v[0], v[1]));
                }
              }}
            />
          </Form.Item>
          <Form.Item
            label={`Number of days (range covers ${applyDayPreview} day${applyDayPreview === 1 ? '' : 's'})`}
            name="days"
            rules={[{ required: true, message: 'Required' }]}
            tooltip="Use 0.5 for half-day leaves; cannot exceed the date range above."
          >
            <Input type="number" min={0.5} step={0.5} />
          </Form.Item>
          <Form.Item label="Reason" name="reason">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* ---- Approve / Reject decision modal ---- */}
      <Modal
        open={Boolean(decisionOpen)}
        title={
          decisionOpen
            ? `${decisionOpen.kind === 'approve' ? 'Approve' : 'Reject'} ${decisionOpen.row.employee.name}'s leave`
            : ''
        }
        onOk={onDecision}
        onCancel={() => setDecisionOpen(null)}
        confirmLoading={approve.isPending || reject.isPending}
        okText={decisionOpen?.kind === 'approve' ? 'Approve' : 'Reject'}
        okButtonProps={
          decisionOpen?.kind === 'reject'
            ? { danger: true }
            : { style: { background: '#16a34a', borderColor: '#16a34a' } }
        }
        destroyOnClose
      >
        {decisionOpen && (
          <div style={{ marginBottom: 12 }}>
            <Tag color="gold">{decisionOpen.row.leaveType.code}</Tag>{' '}
            <Text strong>{decisionOpen.row.days} day(s)</Text> from{' '}
            {formatDateDmy(decisionOpen.row.fromDate)} to{' '}
            {formatDateDmy(decisionOpen.row.toDate)}
            {decisionOpen.row.reason && (
              <div style={{ marginTop: 8, color: colors.text.placeholder }}>
                Reason: {decisionOpen.row.reason}
              </div>
            )}
          </div>
        )}
        <Form<DecisionValues> form={decisionForm} layout="vertical" preserve={false}>
          <Form.Item label="Approver note (optional)" name="approverNote">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* ---- Balance drawer ---- */}
      <Drawer
        title={balanceFor ? `Leave balance — ${balanceFor.name}` : 'Leave balance'}
        open={Boolean(balanceFor)}
        onClose={() => setBalanceFor(null)}
        width={520}
      >
        <Spin spinning={balanceLoading}>
          {balance && (
            <>
              <Text type="secondary">Year {balance.year}</Text>
              <Table
                style={{ marginTop: 12 }}
                rowKey={(r) => r.leaveType.id}
                dataSource={balance.rows}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Type',
                    render: (_, r) => (
                      <Space>
                        <Tag color="gold">{r.leaveType.code}</Tag>
                        {r.leaveType.name}
                      </Space>
                    ),
                  },
                  { title: 'Allocated', dataIndex: 'allocated', align: 'right', width: 100 },
                  { title: 'Used', dataIndex: 'used', align: 'right', width: 80 },
                  {
                    title: 'Pending',
                    dataIndex: 'pending',
                    align: 'right',
                    width: 90,
                    render: (v: number) =>
                      v > 0 ? <Tag color="gold">{v}</Tag> : v,
                  },
                  {
                    title: 'Balance',
                    dataIndex: 'balance',
                    align: 'right',
                    width: 100,
                    render: (v: number) => (
                      <Text strong style={{ color: v <= 0 ? colors.status.error : colors.status.success }}>
                        {v}
                      </Text>
                    ),
                  },
                ]}
              />
            </>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}

