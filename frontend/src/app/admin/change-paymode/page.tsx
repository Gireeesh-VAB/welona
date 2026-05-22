'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EditOutlined,
  FileSearchOutlined,
  FilterOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SearchOutlined,
  SwapOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import {
  PAY_MODES,
  PAYMODE_CHANGE_LOG,
  PAYMODE_RECEIPTS,
  type PayMode,
  type PaymodeChangeLogEntry,
  type PaymodeReceipt,
} from '@/lib/sample-data/change-paymode';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

interface ChangeForm {
  newPayMode: PayMode;
  reason: string;
}

const TREATMENT_OPTIONS = [
  'Skin Services', 'LASER', 'Hair Services', 'Hair Transplantation', 'Wellness',
];

export default function AdminChangePaymodePage() {
  const colors = useBrandColors();
  const { message } = App.useApp();
  const navItem = getAdminNavItem('change-paymode')!;

  // ---- Data state ----
  const [receipts, setReceipts] = useState<PaymodeReceipt[]>(PAYMODE_RECEIPTS);
  const [log, setLog] = useState<PaymodeChangeLogEntry[]>(PAYMODE_CHANGE_LOG);

  // ---- Filters ----
  const [customerSearch, setCustomerSearch] = useState('');
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [currentPayMode, setCurrentPayMode] = useState<PayMode | undefined>(undefined);
  const [treatment, setTreatment] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // ---- Modal state ----
  const [active, setActive] = useState<PaymodeReceipt | null>(null);
  const [form] = Form.useForm<ChangeForm>();
  const [newPayMode, setNewPayMode] = useState<PayMode | undefined>(undefined);

  // ---- Pagination ----
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);

  // ---- Filtered receipts ----
  const filtered = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const needle = customerSearch.trim().toLowerCase();
    const [from, to] = dateRange ?? [];
    return receipts.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (currentPayMode && r.currentPayMode !== currentPayMode) return false;
      if (treatment && r.treatment !== treatment) return false;
      if (from && dayjs(r.receiptDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.receiptDate).isAfter(to.endOf('day'))) return false;
      if (needle) {
        const hay = `${r.customerName} ${r.mobileNumber} ${r.receiptNo} ${r.packageNo}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [receipts, branchId, currentPayMode, treatment, dateRange, customerSearch, branchOptions]);

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const pendingReview = filtered.length;
    const totalAmount = filtered.reduce((s, r) => s + r.paidAmount, 0);
    // "Cash entries" is a common audit signal — clerks often enter Cash when they mean UPI.
    const cashEntries = filtered.filter((r) => r.currentPayMode === 'Cash').length;
    const todayChanges = log.filter((l) => dayjs(l.changedAt).format('YYYY-MM-DD') === '2026-05-21').length;
    return { pendingReview, totalAmount, cashEntries, todayChanges };
  }, [filtered, log]);

  // ---- Treatment colour ----
  const treatmentColor = (t: string): string => {
    if (t === 'Skin Services') return colors.gold.primary;
    if (t === 'LASER') return colors.status.info;
    if (t === 'Hair Services') return colors.status.success;
    if (t === 'Hair Transplantation') return colors.status.warning;
    if (t === 'Wellness') return colors.gold.dark ?? colors.gold.primary;
    return colors.text.placeholder;
  };

  // ---- Pay-mode colour (used in the chip) ----
  const payModeColor = (p: PayMode): string => {
    if (p === 'Cash') return colors.status.warning;
    if (p === 'UPI') return colors.status.success;
    if (p === 'Credit Cards' || p === 'Debit Cards') return colors.status.info;
    if (p === 'Office Scan' || p === 'Cheque' || p === 'Net Banking') return colors.gold.primary;
    return colors.text.primary;
  };

  // ---- Open / close modal ----
  const openChange = (row: PaymodeReceipt) => {
    setActive(row);
    setNewPayMode(undefined);
    form.resetFields();
  };
  const closeChange = () => {
    setActive(null);
    setNewPayMode(undefined);
    form.resetFields();
  };

  const onConfirmChange = async () => {
    if (!active) return;
    const values = await form.validateFields();
    if (values.newPayMode === active.currentPayMode) {
      message.warning('New pay mode is the same as the current one.');
      return;
    }
    // Apply the change in-memory.
    setReceipts(receipts.map((r) => r.key === active.key
      ? { ...r, currentPayMode: values.newPayMode } : r));
    // Append audit entry.
    setLog([
      {
        key: `PML-${(log.length + 1).toString().padStart(4, '0')}`,
        changedAt: new Date().toISOString(),
        receiptNo: active.receiptNo,
        customerName: active.customerName,
        fromPayMode: active.currentPayMode,
        toPayMode: values.newPayMode,
        reason: values.reason.trim(),
        changedBy: 'Welona Super Admin',
      },
      ...log,
    ]);
    message.success(`${active.customerName}: ${active.currentPayMode} → ${values.newPayMode}`);
    closeChange();
  };

  // ---- Reset filters ----
  const resetFilters = () => {
    setCustomerSearch(''); setBranchId(undefined);
    setCurrentPayMode(undefined); setTreatment(undefined);
    setDateRange(null); setPage(1);
  };

  // ---- Table ----
  const columns: ColumnsType<PaymodeReceipt> = [
    {
      title: 'Customer', dataIndex: 'customerName', width: 230, fixed: 'left',
      sorter: (a, b) => a.customerName.localeCompare(b.customerName),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.mobileNumber}</Text>
        </div>
      ),
    },
    {
      title: 'Package No', dataIndex: 'packageNo', width: 230,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Receipt', dataIndex: 'receiptNo', width: 170,
      render: (v: string, row) => (
        <div>
          <Text code style={{ fontSize: 12 }}>{v}</Text>
          <div style={{ color: colors.text.placeholder, fontSize: 11, marginTop: 2 }}>
            {dayjs(row.receiptDate).format('DD-MM-YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Treatment', dataIndex: 'treatment', width: 200,
      render: (v: string) => (
        <Tag style={{ background: treatmentColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Branch', dataIndex: 'branchName', width: 170,
      sorter: (a, b) => a.branchName.localeCompare(b.branchName),
      render: (v: string) => <span style={{ color: colors.text.primary }}>{v}</span> },
    {
      title: 'Paid Amount', dataIndex: 'paidAmount', width: 150, align: 'left',
      sorter: (a, b) => a.paidAmount - b.paidAmount,
      render: (v: number) => <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>,
    },
    {
      title: 'Current Pay Mode', dataIndex: 'currentPayMode', width: 180,
      render: (v: PayMode) => (
        <Tag style={{ background: payModeColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0, fontSize: 12, padding: '2px 10px' }}>
          {v}
        </Tag>
      ),
    },
    { title: 'Recorded By', dataIndex: 'recordedBy', width: 170,
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span> },
    {
      title: 'Action', key: 'action', width: 130, fixed: 'right', align: 'center',
      render: (_, row) => (
        <Button type="primary" size="middle" icon={<SwapOutlined />}
          onClick={() => openChange(row)}>
          Change
        </Button>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filtered.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} receipt${total === 1 ? '' : 's'}`,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>
            Correct mis-keyed pay modes on issued receipts. Every change is captured in the audit log.
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={resetFilters}>Reset Filters</Button>
      </div>

      {/* KPI strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Receipts in Scope</Text>}
              value={kpis.pendingReview}
              prefix={<FileSearchOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.gold.primary, fontSize: 24 }}
            />
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>matching the current filters</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Total Value</Text>}
              value={formatMoney(kpis.totalAmount)}
              prefix={<DollarOutlined style={{ color: colors.status.success }} />}
              valueStyle={{ color: colors.status.success, fontSize: 22 }}
            />
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>across visible receipts</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Cash Entries</Text>}
              value={kpis.cashEntries}
              prefix={<UserOutlined style={{ color: colors.status.warning }} />}
              valueStyle={{ color: colors.status.warning, fontSize: 24 }}
            />
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>often mis-keyed — review first</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Changes Today</Text>}
              value={kpis.todayChanges}
              prefix={<CheckCircleOutlined style={{ color: colors.status.info }} />}
              valueStyle={{ color: colors.status.info, fontSize: 24 }}
            />
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>logged in the audit trail</Text>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FilterOutlined style={{ color: colors.gold.primary }} />
          <Text strong style={{ color: colors.text.primary }}>Find a receipt</Text>
        </div>
        <Row gutter={[12, 12]} justify="start">
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Name, mobile, receipt or package</Text>
            <Input
              prefix={<SearchOutlined style={{ color: colors.gold.primary }} />}
              placeholder="Search…"
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setPage(1); }}
              allowClear style={{ marginTop: 4 }}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Receipt Date Range</Text>
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Current Pay Mode</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All pay modes"
              value={currentPayMode} onChange={(v: PayMode | undefined) => { setCurrentPayMode(v); setPage(1); }}
              options={PAY_MODES.map((p) => ({ value: p, label: p }))} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Treatment</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All treatments"
              value={treatment} onChange={(v: string | undefined) => { setTreatment(v); setPage(1); }}
              options={TREATMENT_OPTIONS.map((t) => ({ value: t, label: t }))} allowClear />
          </Col>
        </Row>
      </Card>

      {/* Main + Audit log */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
            <Table<PaymodeReceipt> rowKey="key" columns={columns} dataSource={filtered}
              pagination={pagination} size="middle" scroll={{ x: 1700 }}
              locale={{ emptyText: <Empty description="No receipts match the current filters" /> }} />
          </Card>
        </Col>
        <Col xs={24} xl={7}>
          <Card
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 16 } }}
            title={
              <Space>
                <HistoryOutlined style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>Recent Changes</Text>
              </Space>
            }
          >
            {log.length === 0 ? (
              <Empty description="No changes yet" />
            ) : (
              <Timeline
                style={{ marginTop: 8 }}
                items={log.slice(0, 8).map((e) => ({
                  color: colors.gold.primary,
                  children: (
                    <div>
                      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                        {dayjs(e.changedAt).format('DD-MMM-YYYY · hh:mm A')}
                      </Text>
                      <div style={{ fontWeight: 600, color: colors.text.primary, marginTop: 2 }}>
                        {e.customerName} <Text code style={{ fontSize: 11 }}>{e.receiptNo}</Text>
                      </div>
                      <Space size={4} style={{ marginTop: 4 }} wrap>
                        <Tag style={{ background: payModeColor(e.fromPayMode), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0, fontSize: 11 }}>
                          {e.fromPayMode}
                        </Tag>
                        <ArrowRightOutlined style={{ color: colors.gold.primary, fontSize: 11 }} />
                        <Tag style={{ background: payModeColor(e.toPayMode), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0, fontSize: 11 }}>
                          {e.toPayMode}
                        </Tag>
                      </Space>
                      <Paragraph
                        style={{ color: colors.text.placeholder, fontSize: 12, margin: '6px 0 0' }}
                        ellipsis={{ rows: 2, tooltip: e.reason }}
                      >
                        {e.reason}
                      </Paragraph>
                      <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                        by {e.changedBy}
                      </Text>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Change modal */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: colors.gold.primary }} />
            <span>Change Pay Mode</span>
          </Space>
        }
        open={active !== null}
        onOk={onConfirmChange}
        onCancel={closeChange}
        okText="Confirm Change"
        okButtonProps={{ disabled: !newPayMode || newPayMode === active?.currentPayMode }}
        width={620}
        destroyOnClose
      >
        {active && (
          <div>
            <Card size="small" style={{ background: colors.black.tertiary, border: `1px solid ${colors.border}`, marginBottom: 16 }}
              styles={{ body: { padding: 12 } }}>
              <Descriptions size="small" column={2} colon={false}>
                <Descriptions.Item label={<Text style={{ color: colors.text.placeholder }}>Customer</Text>}>
                  <Text strong style={{ color: colors.text.primary }}>{active.customerName}</Text>
                  <div style={{ color: colors.text.placeholder, fontSize: 12 }}>{active.mobileNumber}</div>
                </Descriptions.Item>
                <Descriptions.Item label={<Text style={{ color: colors.text.placeholder }}>Receipt</Text>}>
                  <Text code style={{ fontSize: 12 }}>{active.receiptNo}</Text>
                  <div style={{ color: colors.text.placeholder, fontSize: 12 }}>{dayjs(active.receiptDate).format('DD-MM-YYYY')}</div>
                </Descriptions.Item>
                <Descriptions.Item label={<Text style={{ color: colors.text.placeholder }}>Branch</Text>}>
                  {active.branchName}
                </Descriptions.Item>
                <Descriptions.Item label={<Text style={{ color: colors.text.placeholder }}>Treatment</Text>}>
                  <Tag style={{ background: treatmentColor(active.treatment), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{active.treatment}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<Text style={{ color: colors.text.placeholder }}>Package</Text>}>
                  <Text code style={{ fontSize: 12 }}>{active.packageNo}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text style={{ color: colors.text.placeholder }}>Paid Amount</Text>}>
                  <Text strong style={{ color: colors.status.success }}>{formatMoney(active.paidAmount)}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Old → New strip */}
            <div style={{
              background: colors.black.primary, border: `1px solid ${colors.border}`,
              borderRadius: 8, padding: 16, marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
            }}>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block', marginBottom: 6 }}>
                  Current pay mode
                </Text>
                <Tag style={{
                  background: payModeColor(active.currentPayMode),
                  color: '#FFFFFF', border: 'none', fontWeight: 700, margin: 0,
                  padding: '6px 16px', fontSize: 14,
                }}>
                  {active.currentPayMode}
                </Tag>
              </div>
              <ArrowRightOutlined style={{ color: colors.gold.primary, fontSize: 22 }} />
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block', marginBottom: 6 }}>
                  New pay mode
                </Text>
                {newPayMode ? (
                  <Tag style={{
                    background: payModeColor(newPayMode),
                    color: '#FFFFFF', border: 'none', fontWeight: 700, margin: 0,
                    padding: '6px 16px', fontSize: 14,
                  }}>
                    {newPayMode}
                  </Tag>
                ) : (
                  <Tag style={{
                    background: 'transparent', color: colors.text.placeholder,
                    border: `1px dashed ${colors.border}`, fontWeight: 600, margin: 0,
                    padding: '6px 16px', fontSize: 14,
                  }}>
                    Not selected
                  </Tag>
                )}
              </div>
            </div>

            <Form<ChangeForm> form={form} layout="vertical" preserve={false}>
              <Form.Item
                name="newPayMode"
                label="Pick the correct pay mode"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Select
                  placeholder="Select pay mode"
                  options={PAY_MODES.map((p) => ({
                    value: p,
                    label: p,
                    disabled: p === active.currentPayMode,
                  }))}
                  onChange={(v: PayMode) => setNewPayMode(v)}
                />
              </Form.Item>
              <Form.Item
                name="reason"
                label="Reason for change"
                rules={[
                  { required: true, message: 'Audit log requires a reason' },
                  { min: 6, message: 'A bit more detail, please' },
                ]}
                extra="This note is permanent and visible to anyone auditing the receipt."
              >
                <Input.TextArea rows={3} placeholder="e.g. Customer paid via UPI; clerk entered Cash by mistake." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
