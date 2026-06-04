'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Empty, Row, Select, Space, Table, Tag, Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBranchLock } from '@/hooks/useBranchLock';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import {
  CASH_BALANCE_ROWS,
  type CashBalanceRow,
} from '@/lib/sample-data/cash-balance';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_reconciled';

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

export default function AdminCashBalancePage() {
  const colors = useBrandColors();
  const { isBranchSession, lockedBranchId } = useBranchLock();
  const navItem = getAdminNavItem('report-cash-balance')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [reconciledOnly, setReconciledOnly] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    if (isBranchSession && lockedBranchId) setBranchId(lockedBranchId);
  }, [isBranchSession, lockedBranchId]);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return CASH_BALANCE_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (reconciledOnly === 'reconciled' && !r.lastReconciledDate) return false;
      if (reconciledOnly === 'pending' && r.lastReconciledDate) return false;
      if (from && dayjs(r.asOfDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.asOfDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, dateRange, reconciledOnly, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(isBranchSession ? lockedBranchId : undefined);
    setReconciledOnly('all'); setFormat('detailed'); setPage(1);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Branch','As Of','Opening Balance','Cash Receipts','Cash Payments','Petty In','Petty Out','Closing Balance','Last Reconciled'];
      const values = filteredRows.map((r, i) => [
        i + 1, r.branchName, r.asOfDate,
        (r.openingBalance / 100).toFixed(2),
        (r.cashReceipts / 100).toFixed(2),
        (r.cashPayments / 100).toFixed(2),
        (r.pettyCashIn / 100).toFixed(2),
        (r.pettyCashOut / 100).toFixed(2),
        (r.closingBalance / 100).toFixed(2),
        r.lastReconciledDate ?? '',
      ]);
      downloadCsv(`cash-balance-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const reconciled = filteredRows.filter((r) => r.lastReconciledDate).length;
    const pending = filteredRows.length - reconciled;
    const headers = ['Reconciliation Status', 'Branches', 'Closing Balance Total'];
    const reconciledTotal = filteredRows
      .filter((r) => r.lastReconciledDate)
      .reduce((s, r) => s + r.closingBalance, 0);
    const pendingTotal = filteredRows
      .filter((r) => !r.lastReconciledDate)
      .reduce((s, r) => s + r.closingBalance, 0);
    const values = [
      ['Reconciled', reconciled, (reconciledTotal / 100).toFixed(2)],
      ['Pending',    pending,    (pendingTotal    / 100).toFixed(2)],
    ];
    downloadCsv(`cash-balance-summary-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const moneyCell = (v: number) => (
    <span style={{ color: v > 0 ? colors.text.primary : colors.text.placeholder }}>
      {v > 0 ? formatMoney(v) : '—'}
    </span>
  );

  const detailedColumns: ColumnsType<CashBalanceRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: CashBalanceRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Branch', dataIndex: 'branchName', width: 200, fixed: 'left',
      sorter: (a, b) => a.branchName.localeCompare(b.branchName),
      render: (v: string) => <strong style={{ color: colors.text.primary }}>{v}</strong>,
    },
    {
      title: 'As Of', dataIndex: 'asOfDate', width: 130,
      sorter: (a, b) => new Date(a.asOfDate).getTime() - new Date(b.asOfDate).getTime(),
      render: (v: string) => <span style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</span>,
    },
    {
      title: 'Opening Balance', dataIndex: 'openingBalance', width: 160, align: 'left',
      sorter: (a, b) => a.openingBalance - b.openingBalance,
      render: moneyCell,
    },
    {
      title: 'Cash Receipts', dataIndex: 'cashReceipts', width: 150, align: 'left',
      sorter: (a, b) => a.cashReceipts - b.cashReceipts,
      render: (v: number) => <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>,
    },
    {
      title: 'Cash Payments', dataIndex: 'cashPayments', width: 150, align: 'left',
      render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{formatMoney(v)}</strong> : '—',
    },
    { title: 'Petty In', dataIndex: 'pettyCashIn', width: 120, align: 'left', render: moneyCell },
    { title: 'Petty Out', dataIndex: 'pettyCashOut', width: 130, align: 'left', render: moneyCell },
    {
      title: 'Closing Balance', dataIndex: 'closingBalance', width: 170, align: 'left', fixed: 'right',
      sorter: (a, b) => a.closingBalance - b.closingBalance,
      render: (v: number) => <strong style={{ color: colors.gold.primary }}>{formatMoney(v)}</strong>,
    },
    {
      title: 'Last Reconciled', dataIndex: 'lastReconciledDate', width: 160, fixed: 'right',
      render: (v: string | null) => v ? (
        <Tag style={{ background: colors.status.success, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>
          {dayjs(v).format('DD-MM-YYYY')}
        </Tag>
      ) : (
        <Tag style={{ background: colors.status.warning, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>
          Pending
        </Tag>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success, colors.status.error, colors.status.warning]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    openingBalance: acc.openingBalance + r.openingBalance,
    cashReceipts: acc.cashReceipts + r.cashReceipts,
    cashPayments: acc.cashPayments + r.cashPayments,
    pettyCashIn: acc.pettyCashIn + r.pettyCashIn,
    pettyCashOut: acc.pettyCashOut + r.pettyCashOut,
    closingBalance: acc.closingBalance + r.closingBalance,
  }), { openingBalance: 0, cashReceipts: 0, cashPayments: 0, pettyCashIn: 0, pettyCashOut: 0, closingBalance: 0 }), [filteredRows]);

  const summaryByStatus = useMemo(() => {
    const reconciled = filteredRows.filter((r) => r.lastReconciledDate);
    const pending = filteredRows.filter((r) => !r.lastReconciledDate);
    return [
      {
        key: 'reconciled', label: 'Reconciled',
        branches: reconciled.length,
        closingBalance: reconciled.reduce((s, r) => s + r.closingBalance, 0),
        color: colors.status.success,
      },
      {
        key: 'pending', label: 'Pending',
        branches: pending.length,
        closingBalance: pending.reduce((s, r) => s + r.closingBalance, 0),
        color: colors.status.warning,
      },
    ];
  }, [filteredRows, colors.status.success, colors.status.warning]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} branch${total === 1 ? '' : 'es'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>As Of Date Range</Text>
            <RangePicker style={{ width: '100%', marginTop: 4 }} value={dateRange ?? undefined}
              onChange={(r) => { setDateRange(r && r[0] && r[1] ? [r[0], r[1]] : null); setPage(1); }}
              format="DD-MM-YYYY" allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Branch</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading} value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }}
              options={branchOptions} allowClear={!isBranchSession} disabled={isBranchSession} showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Reconciliation</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={reconciledOnly}
              onChange={(v) => { setReconciledOnly(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All branches' },
                { value: 'reconciled', label: 'Reconciled only' },
                { value: 'pending', label: 'Pending only' },
              ]} />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (per branch)' },
                { value: 'summary_reconciled', label: 'Summary — by Reconciliation Status' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table rowKey="key" loading={branchesLoading}
            columns={[
              { title: 'Reconciliation Status', dataIndex: 'label', width: 240,
                render: (v: string, row: { color: string }) => (
                  <Tag style={{ background: row.color, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
                ) },
              { title: 'Branches', dataIndex: 'branches', width: 140, align: 'left',
                render: (v: number) => <strong>{v}</strong> },
              { title: 'Closing Balance Total', dataIndex: 'closingBalance', width: 220, align: 'left',
                render: (v: number) => <strong style={{ color: colors.gold.primary }}>{formatMoney(v)}</strong> },
            ]}
            dataSource={summaryByStatus} pagination={false}
            size="middle" scroll={{ x: 600 }}
            locale={{ emptyText: <Empty description="No branches match the selected filters" /> }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left">
                    <strong style={{ color: colors.gold.primary }}>{formatMoney(totals.closingBalance)}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )} />
        ) : (
          <Table<CashBalanceRow> rowKey="key" loading={branchesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 1800 }}
            locale={{ emptyText: <Empty description="No cash positions match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} branch{filteredRows.length === 1 ? '' : 'es'}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left"><strong>{formatMoney(totals.openingBalance)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left"><strong style={{ color: colors.status.success }}>{formatMoney(totals.cashReceipts)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left"><strong style={{ color: colors.status.error }}>{formatMoney(totals.cashPayments)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="left">{formatMoney(totals.pettyCashIn)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="left">{formatMoney(totals.pettyCashOut)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="left"><strong style={{ color: colors.gold.primary }}>{formatMoney(totals.closingBalance)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
