'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBranchLock } from '@/hooks/useBranchLock';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import {
  SALES_REPORT_ROWS,
  type SalesReportRow,
} from '@/lib/sample-data/sales-report';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_branch' | 'summary_category';

/** A row used by the "Summary by …" report formats. */
interface SummaryRow {
  key: string;
  group: string;
  receipts: number;
  packageAmount: number;
  taxAmount: number;
  cash: number;
  creditCards: number;
  officeScan: number;
  cheque: number;
  bajaj: number;
  ezFinanz: number;
  saveIn: number;
  shopse: number;
  fibe: number;
  paidAmount: number;
  balanceAmount: number;
}

/** Aggregate detail rows by a grouping column (branch name or category). */
function summarise(rows: SalesReportRow[], by: 'branch' | 'category'): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = by === 'branch' ? r.branchName : r.category;
    const existing =
      map.get(group) ??
      ({
        key: group,
        group,
        receipts: 0,
        packageAmount: 0,
        taxAmount: 0,
        cash: 0,
        creditCards: 0,
        officeScan: 0,
        cheque: 0,
        bajaj: 0,
        ezFinanz: 0,
        saveIn: 0,
        shopse: 0,
        fibe: 0,
        paidAmount: 0,
        balanceAmount: 0,
      } satisfies SummaryRow);
    existing.receipts += 1;
    existing.packageAmount += r.packageAmount;
    existing.taxAmount += r.taxAmount;
    existing.cash += r.cash;
    existing.creditCards += r.creditCards;
    existing.officeScan += r.officeScan;
    existing.cheque += r.cheque;
    existing.bajaj += r.bajaj;
    existing.ezFinanz += r.ezFinanz;
    existing.saveIn += r.saveIn;
    existing.shopse += r.shopse;
    existing.fibe += r.fibe;
    existing.paidAmount += r.paidAmount;
    existing.balanceAmount += r.balanceAmount;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.paidAmount - a.paidAmount);
}

/** Convert any record array to a CSV string. */
function rowsToCsv(headers: string[], values: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...values].map((row) => row.map(escape).join(',')).join('\n');
}

/** Trigger a browser download for a CSV string. */
function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminSalesReportPage() {
  const colors = useBrandColors();
  const { isBranchSession, lockedBranchId } = useBranchLock();
  const navItem = getAdminNavItem('report-sales-sales')!;

  // --- Filter state ---
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isBranchSession && lockedBranchId) setBranchId(lockedBranchId);
  }, [isBranchSession, lockedBranchId]);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // --- Reference data for the dropdowns ---
  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({
    limit: 200,
  });
  const { data: categoriesData, isLoading: categoriesLoading } = useAdminCategories({
    limit: 200,
  });

  const branchOptions = useMemo(
    () =>
      (branchesData?.items ?? []).map((b) => ({
        value: b.id,
        label: `${b.branchName} (${b.branchCode})`,
        name: b.branchName,
      })),
    [branchesData],
  );
  const categoryOptions = useMemo(
    () =>
      (categoriesData?.items ?? []).map((c) => ({ value: c.name, label: c.name })),
    [categoriesData],
  );

  // Apply the active filters to the dummy data.
  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return SALES_REPORT_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (from && dayjs(r.receiptDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.receiptDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, category, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null);
    setBranchId(isBranchSession ? lockedBranchId : undefined);
    setCategory(undefined);
    setFormat('detailed');
    setPage(1);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = [
        'S No', 'Joined Date', 'B.No', 'Receipt Number', 'Receipt Date',
        'Client Name', 'Mobile Number', 'Package Details', 'Category',
        'Media Name', 'Call Type', 'Package Amount', 'Tax Amount', 'Cash',
        'Credit Cards', 'Office Scan', 'Cheque', 'Bajaj', 'EzFinanz',
        'SaveIn', 'Shopse', 'Fibe', 'Paid Amount', 'Balance Amount',
      ];
      const values = filteredRows.map((r, i) => [
        i + 1, r.joinedDate, r.bNo, r.receiptNumber, r.receiptDate, r.clientName,
        r.mobileNumber, r.packageDetails, r.category, r.mediaName, r.callType,
        (r.packageAmount / 100).toFixed(2), (r.taxAmount / 100).toFixed(2),
        (r.cash / 100).toFixed(2), (r.creditCards / 100).toFixed(2),
        (r.officeScan / 100).toFixed(2), (r.cheque / 100).toFixed(2),
        (r.bajaj / 100).toFixed(2), (r.ezFinanz / 100).toFixed(2),
        (r.saveIn / 100).toFixed(2), (r.shopse / 100).toFixed(2),
        (r.fibe / 100).toFixed(2), (r.paidAmount / 100).toFixed(2),
        (r.balanceAmount / 100).toFixed(2),
      ]);
      downloadCsv(`sales-report-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const summary = summarise(filteredRows, format === 'summary_branch' ? 'branch' : 'category');
    const groupLabel = format === 'summary_branch' ? 'Branch' : 'Category';
    const headers = [
      groupLabel, 'Receipts', 'Package Amount', 'Tax Amount', 'Cash',
      'Credit Cards', 'Office Scan', 'Cheque', 'Bajaj', 'EzFinanz',
      'SaveIn', 'Shopse', 'Fibe', 'Paid Amount', 'Balance Amount',
    ];
    const values = summary.map((s) => [
      s.group, s.receipts,
      (s.packageAmount / 100).toFixed(2), (s.taxAmount / 100).toFixed(2),
      (s.cash / 100).toFixed(2), (s.creditCards / 100).toFixed(2),
      (s.officeScan / 100).toFixed(2), (s.cheque / 100).toFixed(2),
      (s.bajaj / 100).toFixed(2), (s.ezFinanz / 100).toFixed(2),
      (s.saveIn / 100).toFixed(2), (s.shopse / 100).toFixed(2),
      (s.fibe / 100).toFixed(2), (s.paidAmount / 100).toFixed(2),
      (s.balanceAmount / 100).toFixed(2),
    ]);
    downloadCsv(
      `sales-report-${format}-${dayjs().format('YYYY-MM-DD')}.csv`,
      rowsToCsv(headers, values),
    );
  };

  const textCell = (value: string | null | undefined) =>
    value ? (
      <span style={{ color: colors.text.primary }}>{value}</span>
    ) : (
      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
    );

  const moneyCell = (v: number) => (
    <span style={{ color: v > 0 ? colors.text.primary : colors.text.placeholder }}>
      {v > 0 ? formatMoney(v) : '—'}
    </span>
  );

  // --- Detailed columns (the 24 fields the user listed) ---
  const detailedColumns: ColumnsType<SalesReportRow> = useMemo(
    () => [
      {
        title: 'S No',
        key: 'sno',
        width: 70,
        fixed: 'left',
        render: (_: unknown, __: SalesReportRow, idx: number) =>
          (page - 1) * limit + idx + 1,
      },
      {
        title: 'Joined Date',
        dataIndex: 'joinedDate',
        width: 120,
        render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
      },
      {
        title: 'B.No',
        dataIndex: 'bNo',
        width: 110,
        fixed: 'left',
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ),
      },
      {
        title: 'Receipt Number',
        dataIndex: 'receiptNumber',
        width: 140,
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ),
      },
      {
        title: 'Receipt Date',
        dataIndex: 'receiptDate',
        width: 130,
        sorter: (a, b) =>
          new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime(),
        render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
      },
      {
        title: 'Client Name',
        dataIndex: 'clientName',
        width: 180,
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
        ),
      },
      {
        title: 'Mobile Number',
        dataIndex: 'mobileNumber',
        width: 150,
        render: textCell,
      },
      {
        title: 'Package Details',
        dataIndex: 'packageDetails',
        width: 260,
        render: textCell,
      },
      { title: 'Category', dataIndex: 'category', width: 140, render: textCell },
      { title: 'Media Name', dataIndex: 'mediaName', width: 130, render: textCell },
      { title: 'Call Type', dataIndex: 'callType', width: 120, render: textCell },
      {
        title: 'Package Amount',
        dataIndex: 'packageAmount',
        width: 140,
        align: 'right',
        sorter: (a, b) => a.packageAmount - b.packageAmount,
        render: (v: number) => (
          <span style={{ color: colors.text.primary }}>{formatMoney(v)}</span>
        ),
      },
      {
        title: 'Tax Amount',
        dataIndex: 'taxAmount',
        width: 120,
        align: 'left',
        render: moneyCell,
      },
      { title: 'Cash', dataIndex: 'cash', width: 110, align: 'left', render: moneyCell },
      { title: 'Credit Cards', dataIndex: 'creditCards', width: 130, align: 'left', render: moneyCell },
      { title: 'Office Scan', dataIndex: 'officeScan', width: 120, align: 'left', render: moneyCell },
      { title: 'Cheque', dataIndex: 'cheque', width: 110, align: 'left', render: moneyCell },
      { title: 'Bajaj', dataIndex: 'bajaj', width: 110, align: 'left', render: moneyCell },
      { title: 'EzFinanz', dataIndex: 'ezFinanz', width: 110, align: 'left', render: moneyCell },
      { title: 'SaveIn', dataIndex: 'saveIn', width: 110, align: 'left', render: moneyCell },
      { title: 'Shopse', dataIndex: 'shopse', width: 110, align: 'left', render: moneyCell },
      { title: 'Fibe', dataIndex: 'fibe', width: 110, align: 'left', render: moneyCell },
      {
        title: 'Paid Amount',
        dataIndex: 'paidAmount',
        width: 140,
        align: 'left',
        fixed: 'right',
        sorter: (a, b) => a.paidAmount - b.paidAmount,
        render: (v: number) => (
          <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        ),
      },
      {
        title: 'Balance Amount',
        dataIndex: 'balanceAmount',
        width: 150,
        align: 'left',
        fixed: 'right',
        render: (v: number) =>
          v > 0 ? (
            <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
          ) : (
            <span style={{ color: colors.text.placeholder }}>—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, colors.text.primary, colors.text.placeholder, colors.status.success, colors.status.warning],
  );

  // --- Summary columns (used for the "Summary by …" report formats) ---
  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch' : 'Category';
    return [
      {
        title: groupLabel,
        dataIndex: 'group',
        width: 200,
        fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
        ),
      },
      { title: 'Receipts', dataIndex: 'receipts', width: 100, align: 'left' },
      {
        title: 'Package Amount',
        dataIndex: 'packageAmount',
        width: 150,
        align: 'right',
        sorter: (a, b) => a.packageAmount - b.packageAmount,
        render: (v: number) => formatMoney(v),
      },
      { title: 'Tax Amount', dataIndex: 'taxAmount', width: 130, align: 'left', render: moneyCell },
      { title: 'Cash', dataIndex: 'cash', width: 120, align: 'left', render: moneyCell },
      { title: 'Credit Cards', dataIndex: 'creditCards', width: 130, align: 'left', render: moneyCell },
      { title: 'Office Scan', dataIndex: 'officeScan', width: 120, align: 'left', render: moneyCell },
      { title: 'Cheque', dataIndex: 'cheque', width: 110, align: 'left', render: moneyCell },
      { title: 'Bajaj', dataIndex: 'bajaj', width: 110, align: 'left', render: moneyCell },
      { title: 'EzFinanz', dataIndex: 'ezFinanz', width: 110, align: 'left', render: moneyCell },
      { title: 'SaveIn', dataIndex: 'saveIn', width: 110, align: 'left', render: moneyCell },
      { title: 'Shopse', dataIndex: 'shopse', width: 110, align: 'left', render: moneyCell },
      { title: 'Fibe', dataIndex: 'fibe', width: 110, align: 'left', render: moneyCell },
      {
        title: 'Paid Amount',
        dataIndex: 'paidAmount',
        width: 150,
        align: 'left',
        fixed: 'right',
        sorter: (a, b) => a.paidAmount - b.paidAmount,
        render: (v: number) => (
          <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        ),
      },
      {
        title: 'Balance Amount',
        dataIndex: 'balanceAmount',
        width: 160,
        align: 'left',
        fixed: 'right',
        render: (v: number) =>
          v > 0 ? (
            <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
          ) : (
            <span style={{ color: colors.text.placeholder }}>—</span>
          ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.text.placeholder, colors.status.success, colors.status.warning]);

  // --- Totals (used in the table footer) ---
  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => ({
        packageAmount: acc.packageAmount + r.packageAmount,
        taxAmount: acc.taxAmount + r.taxAmount,
        cash: acc.cash + r.cash,
        creditCards: acc.creditCards + r.creditCards,
        officeScan: acc.officeScan + r.officeScan,
        cheque: acc.cheque + r.cheque,
        bajaj: acc.bajaj + r.bajaj,
        ezFinanz: acc.ezFinanz + r.ezFinanz,
        saveIn: acc.saveIn + r.saveIn,
        shopse: acc.shopse + r.shopse,
        fibe: acc.fibe + r.fibe,
        paidAmount: acc.paidAmount + r.paidAmount,
        balanceAmount: acc.balanceAmount + r.balanceAmount,
      }),
      {
        packageAmount: 0, taxAmount: 0, cash: 0, creditCards: 0, officeScan: 0,
        cheque: 0, bajaj: 0, ezFinanz: 0, saveIn: 0, shopse: 0, fibe: 0,
        paidAmount: 0, balanceAmount: 0,
      },
    );
  }, [filteredRows]);

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branch');
    if (format === 'summary_category') return summarise(filteredRows, 'category');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: filteredRows.length,
    showSizeChanger: true,
    pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => {
      setPage(next);
      if (size !== limit) setLimit(size);
    },
    showTotal: (total, range) =>
      `${range[0]} - ${range[1]} of ${total} receipt${total === 1 ? '' : 's'}`,
  };

  const isSummary = format !== 'detailed';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            {navItem.label}
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Reset
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={filteredRows.length === 0}
          >
            Export CSV
          </Button>
        </Space>
      </div>

      {/* --- Filters --- */}
      <Card
        style={{
          background: colors.black.secondary,
          border: `1px solid ${colors.border}`,
          marginBottom: 16,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FilterOutlined style={{ color: colors.gold.primary }} />
          <Text strong style={{ color: colors.text.primary }}>Filters</Text>
        </div>
        <Row gutter={[12, 12]} justify="start">
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Receipt Date Range</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 4 }}
              value={dateRange ?? undefined}
              onChange={(range) => {
                setDateRange(range && range[0] && range[1] ? [range[0], range[1]] : null);
                setPage(1);
              }}
              format="DD-MM-YYYY"
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Branch</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading}
              value={branchId}
              onChange={(v) => {
                setBranchId(v);
                setPage(1);
              }}
              options={branchOptions}
              allowClear={!isBranchSession}
              disabled={isBranchSession}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Category</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder={categoriesLoading ? 'Loading…' : 'All categories'}
              loading={categoriesLoading}
              value={category}
              onChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
              options={categoryOptions}
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={format}
              onChange={(v: ReportFormat) => {
                setFormat(v);
                setPage(1);
              }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
                { value: 'summary_category', label: 'Summary — by Category' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* --- Report table --- */}
      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        {isSummary ? (
          <Table<SummaryRow>
            rowKey="key"
            loading={branchesLoading || categoriesLoading}
            columns={summaryColumns}
            dataSource={summaryRows}
            pagination={false}
            size="middle"
            scroll={{ x: 1700 }}
            locale={{ emptyText: <Empty description="No data for the selected filters" /> }}
            summary={() =>
              summaryRows.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: colors.black.primary }}>
                    <Table.Summary.Cell index={0}>
                      <strong style={{ color: colors.gold.primary }}>Total</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="left">
                      <strong>{filteredRows.length}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right"><strong>{formatMoney(totals.packageAmount)}</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="left">{formatMoney(totals.taxAmount)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="left">{formatMoney(totals.cash)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="left">{formatMoney(totals.creditCards)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="left">{formatMoney(totals.officeScan)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="left">{formatMoney(totals.cheque)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="left">{formatMoney(totals.bajaj)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="left">{formatMoney(totals.ezFinanz)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={10} align="left">{formatMoney(totals.saveIn)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={11} align="left">{formatMoney(totals.shopse)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={12} align="left">{formatMoney(totals.fibe)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={13} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={14} align="left">
                      <strong style={{ color: colors.status.warning }}>{formatMoney(totals.balanceAmount)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        ) : (
          <Table<SalesReportRow>
            rowKey="bNo"
            loading={branchesLoading || categoriesLoading}
            columns={detailedColumns}
            dataSource={filteredRows}
            pagination={pagination}
            size="middle"
            scroll={{ x: 3400 }}
            locale={{ emptyText: <Empty description="No receipts match the selected filters" /> }}
            summary={() =>
              filteredRows.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: colors.black.primary }}>
                    <Table.Summary.Cell index={0} colSpan={11}>
                      <strong style={{ color: colors.gold.primary }}>
                        Total — {filteredRows.length} receipt{filteredRows.length === 1 ? '' : 's'}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={11} align="right">
                      <strong>{formatMoney(totals.packageAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={12} align="left">{formatMoney(totals.taxAmount)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={13} align="left">{formatMoney(totals.cash)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={14} align="left">{formatMoney(totals.creditCards)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={15} align="left">{formatMoney(totals.officeScan)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={16} align="left">{formatMoney(totals.cheque)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={17} align="left">{formatMoney(totals.bajaj)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={18} align="left">{formatMoney(totals.ezFinanz)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={19} align="left">{formatMoney(totals.saveIn)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={20} align="left">{formatMoney(totals.shopse)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={21} align="left">{formatMoney(totals.fibe)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={22} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={23} align="left">
                      <strong style={{ color: colors.status.warning }}>{formatMoney(totals.balanceAmount)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        )}
      </Card>
    </div>
  );
}
