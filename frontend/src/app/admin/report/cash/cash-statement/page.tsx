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
  CASH_STATEMENT_ROWS,
  type CashStatementRow,
} from '@/lib/sample-data/cash-statement';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_branch' | 'summary_date';

interface SummaryRow {
  key: string;
  group: string;
  days: number;
  cashIn: number;
  cashOut: number;
  net: number;
}

function summarise(
  rows: CashStatementRow[],
  by: 'branchName' | 'date',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? { key: group, group, days: 0, cashIn: 0, cashOut: 0, net: 0 };
    existing.days += 1;
    existing.cashIn += r.cashIn;
    existing.cashOut += r.cashOut;
    existing.net += r.netMovement;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.cashIn - a.cashIn);
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

export default function AdminCashStatementPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-cash-statement')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [reconciliation, setReconciliation] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return CASH_STATEMENT_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (reconciliation === 'reconciled' && r.reconciledDifference === null) return false;
      if (reconciliation === 'pending' && r.reconciledDifference !== null) return false;
      if (from && dayjs(r.date).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.date).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, dateRange, reconciliation, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined);
    setReconciliation('all'); setFormat('detailed'); setPage(1);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Date','Branch','Opening','Cash In','Cash Out','Net','Closing','Reconciled Diff'];
      const values = filteredRows.map((r, i) => [
        i + 1, r.date, r.branchName,
        (r.openingBalance / 100).toFixed(2),
        (r.cashIn / 100).toFixed(2),
        (r.cashOut / 100).toFixed(2),
        (r.netMovement / 100).toFixed(2),
        (r.closingBalance / 100).toFixed(2),
        r.reconciledDifference === null ? 'Pending' : (r.reconciledDifference / 100).toFixed(2),
      ]);
      downloadCsv(`cash-statement-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName' : 'date';
    const groupLabel = format === 'summary_branch' ? 'Branch' : 'Date';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Days', 'Cash In', 'Cash Out', 'Net'];
    const values = summary.map((s) => [s.group, s.days, (s.cashIn / 100).toFixed(2), (s.cashOut / 100).toFixed(2), (s.net / 100).toFixed(2)]);
    downloadCsv(`cash-statement-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const moneyCell = (v: number) => (
    <span style={{ color: v > 0 ? colors.text.primary : colors.text.placeholder }}>
      {v > 0 ? formatMoney(v) : '—'}
    </span>
  );

  const diffCell = (v: number | null) => {
    if (v === null) {
      return <Tag style={{ background: colors.status.warning, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>Pending</Tag>;
    }
    if (v === 0) {
      return <Tag style={{ background: colors.status.success, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>Tallied</Tag>;
    }
    const isExcess = v > 0;
    return (
      <Tag style={{
        background: isExcess ? colors.status.info : colors.status.error,
        color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0,
      }}>
        {isExcess ? '+' : ''}{formatMoney(v)} {isExcess ? 'excess' : 'short'}
      </Tag>
    );
  };

  const detailedColumns: ColumnsType<CashStatementRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: CashStatementRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Date', dataIndex: 'date', width: 130, fixed: 'left',
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      defaultSortOrder: 'descend',
      render: (v: string) => <span style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</span>,
    },
    {
      title: 'Branch', dataIndex: 'branchName', width: 200,
      sorter: (a, b) => a.branchName.localeCompare(b.branchName),
      render: (v: string) => <span style={{ color: colors.text.primary, fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Opening', dataIndex: 'openingBalance', width: 150, align: 'left',
      render: moneyCell,
    },
    {
      title: 'Cash In', dataIndex: 'cashIn', width: 150, align: 'left',
      sorter: (a, b) => a.cashIn - b.cashIn,
      render: (v: number) => <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>,
    },
    {
      title: 'Cash Out', dataIndex: 'cashOut', width: 150, align: 'left',
      render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{formatMoney(v)}</strong> : '—',
    },
    {
      title: 'Net', dataIndex: 'netMovement', width: 150, align: 'left',
      sorter: (a, b) => a.netMovement - b.netMovement,
      render: (v: number) => (
        <strong style={{ color: v >= 0 ? colors.status.success : colors.status.error }}>
          {v >= 0 ? '+' : ''}{formatMoney(v)}
        </strong>
      ),
    },
    {
      title: 'Closing', dataIndex: 'closingBalance', width: 160, align: 'left', fixed: 'right',
      render: (v: number) => <strong style={{ color: colors.gold.primary }}>{formatMoney(v)}</strong>,
    },
    {
      title: 'Reconciled', dataIndex: 'reconciledDifference', width: 180, fixed: 'right',
      render: diffCell,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success, colors.status.error, colors.status.warning, colors.status.info]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    cashIn: acc.cashIn + r.cashIn,
    cashOut: acc.cashOut + r.cashOut,
    net: acc.net + r.netMovement,
  }), { cashIn: 0, cashOut: 0, net: 0 }), [filteredRows]);

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_date') return summarise(filteredRows, 'date');
    return [];
  }, [filteredRows, format]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => [
    {
      title: format === 'summary_branch' ? 'Branch' : 'Date', dataIndex: 'group',
      width: 220, fixed: 'left',
      sorter: (a, b) => a.group.localeCompare(b.group),
      render: (v: string) => format === 'summary_date'
        ? <span style={{ fontWeight: 600, color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</span>
        : <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
    },
    { title: 'Days', dataIndex: 'days', width: 100, align: 'left' },
    { title: 'Cash In', dataIndex: 'cashIn', width: 170, align: 'left',
      sorter: (a, b) => a.cashIn - b.cashIn,
      render: (v: number) => <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong> },
    { title: 'Cash Out', dataIndex: 'cashOut', width: 170, align: 'left',
      render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{formatMoney(v)}</strong> : '—' },
    { title: 'Net', dataIndex: 'net', width: 170, align: 'left',
      sorter: (a, b) => a.net - b.net,
      render: (v: number) => <strong style={{ color: v >= 0 ? colors.status.success : colors.status.error }}>{v >= 0 ? '+' : ''}{formatMoney(v)}</strong> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [format, colors.text.primary, colors.status.success, colors.status.error]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} day${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Reconciliation</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={reconciliation}
              onChange={(v) => { setReconciliation(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All days' },
                { value: 'reconciled', label: 'Reconciled only' },
                { value: 'pending', label: 'Pending only' },
              ]} />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (day-by-day)' },
                { value: 'summary_date', label: 'Summary — by Date' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 830 }}
            locale={{ emptyText: <Empty description="No cash movement matches the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.status.success }}>{formatMoney(totals.cashIn)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left"><strong style={{ color: colors.status.error }}>{formatMoney(totals.cashOut)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left"><strong style={{ color: totals.net >= 0 ? colors.status.success : colors.status.error }}>{totals.net >= 0 ? '+' : ''}{formatMoney(totals.net)}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<CashStatementRow> rowKey="key" loading={branchesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 1640 }}
            locale={{ emptyText: <Empty description="No cash statement entries match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} day{filteredRows.length === 1 ? '' : 's'}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left"><strong style={{ color: colors.status.success }}>{formatMoney(totals.cashIn)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left"><strong style={{ color: colors.status.error }}>{formatMoney(totals.cashOut)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="left"><strong style={{ color: totals.net >= 0 ? colors.status.success : colors.status.error }}>{totals.net >= 0 ? '+' : ''}{formatMoney(totals.net)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} />
                  <Table.Summary.Cell index={8} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
