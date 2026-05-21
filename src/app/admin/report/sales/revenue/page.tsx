'use client';

import { useMemo, useState } from 'react';
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
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@/lib/format';
import { REVENUE_ROWS, type RevenueRow } from '@/lib/sample-data/revenue';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_paymode' | 'summary_branch' | 'summary_category';

interface SummaryRow {
  key: string;
  group: string;
  receipts: number;
  paidExclTax: number;
  taxAmount: number;
  paidInclTax: number;
}

/** Aggregate detail rows by a chosen grouping column. */
function summarise(
  rows: RevenueRow[],
  by: 'payMode' | 'branchName' | 'packageCategory',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing =
      map.get(group) ??
      ({
        key: group,
        group,
        receipts: 0,
        paidExclTax: 0,
        taxAmount: 0,
        paidInclTax: 0,
      } satisfies SummaryRow);
    existing.receipts += 1;
    existing.paidExclTax += r.paidExclTax;
    existing.taxAmount += r.taxAmount;
    existing.paidInclTax += r.paidInclTax;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.paidInclTax - a.paidInclTax);
}

/** Convert a record array to a CSV string. */
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
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminRevenueReportPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-sales-revenue')!;

  // --- Filter state ---
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // --- Reference data ---
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

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return REVENUE_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.packageCategory !== category) return false;
      if (from && dayjs(r.receiptDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.receiptDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, category, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null);
    setBranchId(undefined);
    setCategory(undefined);
    setFormat('detailed');
    setPage(1);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = [
        'S No', 'Pay Mode', 'Branch Name', 'Receipt No', 'MobileNo',
        'Receipt Date', 'Customer Name', 'Package Details', 'Details',
        'Package Category', 'Paid Amnt (Excl. Tax)', 'Paid Amnt (Incl. Tax)',
        'Tax Amount',
      ];
      const values = filteredRows.map((r, i) => [
        i + 1, r.payMode, r.branchName, r.receiptNumber, r.mobileNumber,
        r.receiptDate, r.customerName, r.packageDetails, r.details,
        r.packageCategory,
        (r.paidExclTax / 100).toFixed(2),
        (r.paidInclTax / 100).toFixed(2),
        (r.taxAmount / 100).toFixed(2),
      ]);
      downloadCsv(`revenue-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by =
      format === 'summary_paymode'
        ? 'payMode'
        : format === 'summary_branch'
          ? 'branchName'
          : 'packageCategory';
    const groupLabel =
      format === 'summary_paymode'
        ? 'Pay Mode'
        : format === 'summary_branch'
          ? 'Branch'
          : 'Category';
    const summary = summarise(filteredRows, by);
    const headers = [
      groupLabel, 'Entries',
      'Paid Amnt (Excl. Tax)', 'Tax Amount', 'Paid Amnt (Incl. Tax)',
    ];
    const values = summary.map((s) => [
      s.group, s.receipts,
      (s.paidExclTax / 100).toFixed(2),
      (s.taxAmount / 100).toFixed(2),
      (s.paidInclTax / 100).toFixed(2),
    ]);
    downloadCsv(
      `revenue-${format}-${dayjs().format('YYYY-MM-DD')}.csv`,
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

  // --- Detailed columns (the 13 fields the user listed) ---
  const detailedColumns: ColumnsType<RevenueRow> = useMemo(
    () => [
      {
        title: 'S No',
        key: 'sno',
        width: 70,
        fixed: 'left',
        render: (_: unknown, __: RevenueRow, idx: number) =>
          (page - 1) * limit + idx + 1,
      },
      {
        title: 'Pay Mode',
        dataIndex: 'payMode',
        width: 130,
        fixed: 'left',
        sorter: (a, b) => a.payMode.localeCompare(b.payMode),
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.gold.primary }}>{v}</span>
        ),
      },
      {
        title: 'Branch Name',
        dataIndex: 'branchName',
        width: 180,
        sorter: (a, b) => a.branchName.localeCompare(b.branchName),
        render: textCell,
      },
      {
        title: 'Receipt No',
        dataIndex: 'receiptNumber',
        width: 140,
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ),
      },
      {
        title: 'MobileNo',
        dataIndex: 'mobileNumber',
        width: 150,
        render: textCell,
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
        title: 'Customer Name',
        dataIndex: 'customerName',
        width: 180,
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
        ),
      },
      {
        title: 'PackageDetails',
        dataIndex: 'packageDetails',
        width: 260,
        render: textCell,
      },
      {
        title: 'Details',
        dataIndex: 'details',
        width: 220,
        render: textCell,
      },
      {
        title: 'Package Category',
        dataIndex: 'packageCategory',
        width: 160,
        render: textCell,
      },
      {
        title: 'Paid Amnt (Excl. Tax)',
        dataIndex: 'paidExclTax',
        width: 170,
        align: 'left',
        sorter: (a, b) => a.paidExclTax - b.paidExclTax,
        render: moneyCell,
      },
      {
        title: 'Paid Amnt (Incl. Tax)',
        dataIndex: 'paidInclTax',
        width: 170,
        align: 'left',
        fixed: 'right',
        sorter: (a, b) => a.paidInclTax - b.paidInclTax,
        render: (v: number) => (
          <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        ),
      },
      {
        title: 'Tax Amount',
        dataIndex: 'taxAmount',
        width: 140,
        align: 'left',
        fixed: 'right',
        render: moneyCell,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success],
  );

  // --- Summary columns (used for the "Summary by …" report formats) ---
  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel =
      format === 'summary_paymode'
        ? 'Pay Mode'
        : format === 'summary_branch'
          ? 'Branch'
          : 'Category';
    return [
      {
        title: groupLabel,
        dataIndex: 'group',
        width: 220,
        fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
        ),
      },
      { title: 'Entries', dataIndex: 'receipts', width: 110, align: 'left' },
      {
        title: 'Paid Amnt (Excl. Tax)',
        dataIndex: 'paidExclTax',
        width: 200,
        align: 'left',
        sorter: (a, b) => a.paidExclTax - b.paidExclTax,
        render: (v: number) => formatMoney(v),
      },
      {
        title: 'Tax Amount',
        dataIndex: 'taxAmount',
        width: 160,
        align: 'left',
        render: moneyCell,
      },
      {
        title: 'Paid Amnt (Incl. Tax)',
        dataIndex: 'paidInclTax',
        width: 200,
        align: 'left',
        fixed: 'right',
        sorter: (a, b) => a.paidInclTax - b.paidInclTax,
        render: (v: number) => (
          <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.text.placeholder, colors.status.success]);

  // --- Totals row ---
  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          paidExclTax: acc.paidExclTax + r.paidExclTax,
          taxAmount: acc.taxAmount + r.taxAmount,
          paidInclTax: acc.paidInclTax + r.paidInclTax,
        }),
        { paidExclTax: 0, taxAmount: 0, paidInclTax: 0 },
      ),
    [filteredRows],
  );

  const summaryRows = useMemo(() => {
    if (format === 'summary_paymode') return summarise(filteredRows, 'payMode');
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_category') return summarise(filteredRows, 'packageCategory');
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
      `${range[0]} - ${range[1]} of ${total} entr${total === 1 ? 'y' : 'ies'}`,
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
              allowClear
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
                { value: 'summary_paymode', label: 'Summary — by Pay Mode' },
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
            scroll={{ x: 900 }}
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
                    <Table.Summary.Cell index={2} align="left">
                      <strong>{formatMoney(totals.paidExclTax)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="left">
                      {formatMoney(totals.taxAmount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidInclTax)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        ) : (
          <Table<RevenueRow>
            rowKey="key"
            loading={branchesLoading || categoriesLoading}
            columns={detailedColumns}
            dataSource={filteredRows}
            pagination={pagination}
            size="middle"
            scroll={{ x: 2100 }}
            locale={{ emptyText: <Empty description="No revenue entries match the selected filters" /> }}
            summary={() =>
              filteredRows.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: colors.black.primary }}>
                    <Table.Summary.Cell index={0} colSpan={10}>
                      <strong style={{ color: colors.gold.primary }}>
                        Total — {filteredRows.length} entr{filteredRows.length === 1 ? 'y' : 'ies'}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} align="left">
                      <strong>{formatMoney(totals.paidExclTax)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={11} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidInclTax)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={12} align="left">
                      {formatMoney(totals.taxAmount)}
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
