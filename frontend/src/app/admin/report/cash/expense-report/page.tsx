'use client';

import { useMemo, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Empty, Row, Select, Space, Table, Tag, Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import {
  EXPENSE_ROWS,
  type ExpenseRow,
  type ExpenseStatus,
  type PaidVia,
} from '@/lib/sample-data/expense-report';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_type' | 'summary_branch' | 'summary_status' | 'summary_paidVia';

interface SummaryRow {
  key: string;
  group: string;
  count: number;
  amount: number;
  approved: number;
  pending: number;
  rejected: number;
}

function summarise(
  rows: ExpenseRow[],
  by: 'expenseType' | 'branchName' | 'status' | 'paidVia',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? {
      key: group, group, count: 0, amount: 0, approved: 0, pending: 0, rejected: 0,
    };
    existing.count += 1;
    existing.amount += r.amount;
    if (r.status === 'Approved') existing.approved += r.amount;
    else if (r.status === 'Pending') existing.pending += r.amount;
    else if (r.status === 'Rejected') existing.rejected += r.amount;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

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

export default function AdminExpenseReportPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-cash-expense')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [expenseType, setExpenseType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<ExpenseStatus | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);

  const expenseTypeOptions = useMemo(() => {
    const unique = Array.from(new Set(EXPENSE_ROWS.map((r) => r.expenseType))).sort();
    return unique.map((t) => ({ value: t, label: t }));
  }, []);

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return EXPENSE_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (expenseType && r.expenseType !== expenseType) return false;
      if (status && r.status !== status) return false;
      if (from && dayjs(r.expenseDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.expenseDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, expenseType, status, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined); setExpenseType(undefined);
    setStatus(undefined); setFormat('detailed'); setPage(1);
  };

  const statusColor = (s: ExpenseStatus): string => {
    if (s === 'Approved') return colors.status.success;
    if (s === 'Pending') return colors.status.warning;
    return colors.status.error;
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Date','Branch','Expense Type','Description','Voucher No','Amount','Paid Via','Recorded By','Status'];
      const values = filteredRows.map((r, i) => [
        i + 1, r.expenseDate, r.branchName, r.expenseType, r.description,
        r.voucherNo, (r.amount / 100).toFixed(2), r.paidVia, r.recordedBy, r.status,
      ]);
      downloadCsv(`expense-report-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName'
      : format === 'summary_status' ? 'status'
      : format === 'summary_paidVia' ? 'paidVia'
      : 'expenseType';
    const groupLabel = format === 'summary_branch' ? 'Branch'
      : format === 'summary_status' ? 'Status'
      : format === 'summary_paidVia' ? 'Paid Via'
      : 'Expense Type';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Count', 'Amount', 'Approved', 'Pending', 'Rejected'];
    const values = summary.map((s) => [s.group, s.count, (s.amount / 100).toFixed(2), (s.approved / 100).toFixed(2), (s.pending / 100).toFixed(2), (s.rejected / 100).toFixed(2)]);
    downloadCsv(`expense-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<ExpenseRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: ExpenseRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Date', dataIndex: 'expenseDate', width: 130, fixed: 'left',
      sorter: (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime(),
      defaultSortOrder: 'descend',
      render: (v: string) => <span style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</span>,
    },
    { title: 'Branch', dataIndex: 'branchName', width: 180,
      sorter: (a, b) => a.branchName.localeCompare(b.branchName), render: textCell },
    {
      title: 'Expense Type', dataIndex: 'expenseType', width: 160,
      sorter: (a, b) => a.expenseType.localeCompare(b.expenseType),
      render: (v: string) => <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{v}</Tag>,
    },
    { title: 'Description', dataIndex: 'description', width: 320, render: textCell },
    {
      title: 'Voucher No', dataIndex: 'voucherNo', width: 160,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Amount', dataIndex: 'amount', width: 150, align: 'left',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number) => <strong style={{ color: colors.status.error }}>{formatMoney(v)}</strong>,
    },
    {
      title: 'Paid Via', dataIndex: 'paidVia', width: 150,
      render: (v: PaidVia) => <Tag style={{ background: colors.gold.primary, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>,
    },
    {
      title: 'Recorded By', dataIndex: 'recordedBy', width: 170,
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', width: 130, fixed: 'right',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (v: ExpenseStatus) => (
        <Tag style={{ background: statusColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.gold.light, colors.status.success, colors.status.warning, colors.status.error]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch'
      : format === 'summary_status' ? 'Status'
      : format === 'summary_paidVia' ? 'Paid Via'
      : 'Expense Type';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 220, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
      },
      { title: 'Count', dataIndex: 'count', width: 100, align: 'left',
        sorter: (a, b) => a.count - b.count },
      { title: 'Amount', dataIndex: 'amount', width: 180, align: 'left',
        sorter: (a, b) => a.amount - b.amount,
        render: (v: number) => <strong style={{ color: colors.gold.primary }}>{formatMoney(v)}</strong> },
      { title: 'Approved', dataIndex: 'approved', width: 170, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong> : '—' },
      { title: 'Pending', dataIndex: 'pending', width: 170, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong> : '—' },
      { title: 'Rejected', dataIndex: 'rejected', width: 170, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{formatMoney(v)}</strong> : '—' },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.gold.primary, colors.status.success, colors.status.warning, colors.status.error]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    amount: acc.amount + r.amount,
    approved: acc.approved + (r.status === 'Approved' ? r.amount : 0),
    pending: acc.pending + (r.status === 'Pending' ? r.amount : 0),
    rejected: acc.rejected + (r.status === 'Rejected' ? r.amount : 0),
  }), { amount: 0, approved: 0, pending: 0, rejected: 0 }), [filteredRows]);

  const summaryRows = useMemo(() => {
    if (format === 'summary_type') return summarise(filteredRows, 'expenseType');
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_status') return summarise(filteredRows, 'status');
    if (format === 'summary_paidVia') return summarise(filteredRows, 'paidVia');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} expense${total === 1 ? '' : 's'}`,
  };
  const isSummary = format !== 'detailed';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>Reset</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport} disabled={filteredRows.length === 0}>Export CSV</Button>
        </Space>
      </div>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FilterOutlined style={{ color: colors.gold.primary }} />
          <Text strong style={{ color: colors.text.primary }}>Filters</Text>
        </div>
        <Row gutter={[12, 12]} justify="start">
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Expense Date Range</Text>
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Expense Type</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All types" value={expenseType}
              onChange={(v: string | undefined) => { setExpenseType(v); setPage(1); }}
              options={expenseTypeOptions} allowClear showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Status</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All statuses" value={status}
              onChange={(v: ExpenseStatus | undefined) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'Approved', label: 'Approved' },
                { value: 'Pending',  label: 'Pending' },
                { value: 'Rejected', label: 'Rejected' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_type', label: 'Summary — by Expense Type' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
                { value: 'summary_status', label: 'Summary — by Status' },
                { value: 'summary_paidVia', label: 'Summary — by Paid Via' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 1040 }}
            locale={{ emptyText: <Empty description="No expenses match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.gold.primary }}>{formatMoney(totals.amount)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left">{totals.approved > 0 ? <strong style={{ color: colors.status.success }}>{formatMoney(totals.approved)}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left">{totals.pending > 0 ? <strong style={{ color: colors.status.warning }}>{formatMoney(totals.pending)}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left">{totals.rejected > 0 ? <strong style={{ color: colors.status.error }}>{formatMoney(totals.rejected)}</strong> : '—'}</Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<ExpenseRow> rowKey="key" loading={branchesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 2030 }}
            locale={{ emptyText: <Empty description="No expenses match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={6}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} expense{filteredRows.length === 1 ? '' : 's'}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="left"><strong style={{ color: colors.status.error }}>{formatMoney(totals.amount)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} colSpan={2}>
                    <Space size={6} wrap>
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.approved)} approved</strong>
                      {totals.pending > 0 && <strong style={{ color: colors.status.warning }}>· {formatMoney(totals.pending)} pending</strong>}
                      {totals.rejected > 0 && <strong style={{ color: colors.status.error }}>· {formatMoney(totals.rejected)} rejected</strong>}
                    </Space>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
