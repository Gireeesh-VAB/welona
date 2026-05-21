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
import {
  DUPLICATE_RECEIPT_ROWS,
  type DuplicateReceiptRow,
} from '@/lib/sample-data/duplicate-receipt';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_category' | 'summary_branch';

interface SummaryRow {
  key: string;
  group: string;
  receipts: number;
  netBilling: number;
  paidAmount: number;
  pendingAmount: number;
  discount: number;
}

function summarise(
  rows: DuplicateReceiptRow[],
  by: 'category' | 'branchName',
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
        netBilling: 0,
        paidAmount: 0,
        pendingAmount: 0,
        discount: 0,
      } satisfies SummaryRow);
    existing.receipts += 1;
    existing.netBilling += r.netBillingAmount;
    existing.paidAmount += r.paidAmount;
    existing.pendingAmount += r.pendingAmount;
    existing.discount += r.totalDiscountAmount;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.netBilling - a.netBilling);
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
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminDuplicateReceiptPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-sales-duplicate-receipt')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

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
    return DUPLICATE_RECEIPT_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
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
        'CustomerId', 'BillingId', 'Customer Name', 'MobileNo', 'Receipt No',
        'Payment No', 'Pending Amount', 'Net Billing Amount',
        'Upto Now Paid Amount', 'Total Discount Amount', 'Category', 'Serviced By',
      ];
      const values = filteredRows.map((r) => [
        r.customerId, r.billingId, r.customerName, r.mobileNumber,
        r.receiptNumber, r.paymentNo,
        (r.pendingAmount / 100).toFixed(2),
        (r.netBillingAmount / 100).toFixed(2),
        (r.paidAmount / 100).toFixed(2),
        (r.totalDiscountAmount / 100).toFixed(2),
        r.category, r.servicedBy,
      ]);
      downloadCsv(`duplicate-receipt-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName' : 'category';
    const groupLabel = format === 'summary_branch' ? 'Branch' : 'Category';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Receipts', 'Net Billing', 'Paid', 'Pending', 'Discount'];
    const values = summary.map((s) => [
      s.group, s.receipts,
      (s.netBilling / 100).toFixed(2),
      (s.paidAmount / 100).toFixed(2),
      (s.pendingAmount / 100).toFixed(2),
      (s.discount / 100).toFixed(2),
    ]);
    downloadCsv(
      `duplicate-receipt-${format}-${dayjs().format('YYYY-MM-DD')}.csv`,
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

  const detailedColumns: ColumnsType<DuplicateReceiptRow> = useMemo(
    () => [
      {
        title: 'CustomerId',
        dataIndex: 'customerId',
        width: 170,
        fixed: 'left',
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ),
      },
      {
        title: 'BillingId',
        dataIndex: 'billingId',
        width: 150,
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ),
      },
      {
        title: 'Customer Name',
        dataIndex: 'customerName',
        width: 200,
        sorter: (a, b) => a.customerName.localeCompare(b.customerName),
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
        ),
      },
      {
        title: 'MobileNo',
        dataIndex: 'mobileNumber',
        width: 150,
        render: textCell,
      },
      {
        title: 'Receipt No',
        dataIndex: 'receiptNumber',
        width: 150,
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ),
      },
      {
        title: 'Payment No',
        dataIndex: 'paymentNo',
        width: 150,
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ),
      },
      {
        title: 'Pending Amount',
        dataIndex: 'pendingAmount',
        width: 160,
        align: 'left',
        sorter: (a, b) => a.pendingAmount - b.pendingAmount,
        render: (v: number) =>
          v > 0 ? (
            <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
          ) : (
            <span style={{ color: colors.text.placeholder }}>—</span>
          ),
      },
      {
        title: 'Net Billing Amount',
        dataIndex: 'netBillingAmount',
        width: 170,
        align: 'left',
        sorter: (a, b) => a.netBillingAmount - b.netBillingAmount,
        render: (v: number) => (
          <span style={{ color: colors.text.primary }}>{formatMoney(v)}</span>
        ),
      },
      {
        title: 'Upto Now Paid Amount',
        dataIndex: 'paidAmount',
        width: 180,
        align: 'left',
        render: (v: number) => (
          <span style={{ color: colors.status.success }}>{formatMoney(v)}</span>
        ),
      },
      {
        title: 'TotalDiscountAmount',
        dataIndex: 'totalDiscountAmount',
        width: 180,
        align: 'left',
        render: moneyCell,
      },
      {
        title: 'Category',
        dataIndex: 'category',
        width: 160,
        render: textCell,
      },
      {
        title: 'Serviced By',
        dataIndex: 'servicedBy',
        width: 180,
        fixed: 'right',
        render: textCell,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.text.primary, colors.text.placeholder, colors.status.success, colors.status.warning],
  );

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch' : 'Category';
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
      { title: 'Receipts', dataIndex: 'receipts', width: 110, align: 'left' },
      {
        title: 'Net Billing',
        dataIndex: 'netBilling',
        width: 170,
        align: 'left',
        sorter: (a, b) => a.netBilling - b.netBilling,
        render: (v: number) => formatMoney(v),
      },
      {
        title: 'Paid',
        dataIndex: 'paidAmount',
        width: 170,
        align: 'left',
        render: (v: number) => (
          <span style={{ color: colors.status.success }}>{formatMoney(v)}</span>
        ),
      },
      {
        title: 'Pending',
        dataIndex: 'pendingAmount',
        width: 170,
        align: 'left',
        sorter: (a, b) => a.pendingAmount - b.pendingAmount,
        render: (v: number) =>
          v > 0 ? (
            <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
          ) : (
            <span style={{ color: colors.text.placeholder }}>—</span>
          ),
      },
      {
        title: 'Discount',
        dataIndex: 'discount',
        width: 160,
        align: 'left',
        render: moneyCell,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.text.placeholder, colors.status.success, colors.status.warning]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          netBilling: acc.netBilling + r.netBillingAmount,
          paidAmount: acc.paidAmount + r.paidAmount,
          pendingAmount: acc.pendingAmount + r.pendingAmount,
          discount: acc.discount + r.totalDiscountAmount,
        }),
        { netBilling: 0, paidAmount: 0, pendingAmount: 0, discount: 0 },
      ),
    [filteredRows],
  );

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
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
                { value: 'summary_category', label: 'Summary — by Category' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
              ]}
            />
          </Col>
        </Row>
      </Card>

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
            scroll={{ x: 1100 }}
            locale={{ emptyText: <Empty description="No receipts match the selected filters" /> }}
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
                      <strong>{formatMoney(totals.netBilling)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="left">
                      <strong style={{ color: colors.status.warning }}>{formatMoney(totals.pendingAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="left">
                      {formatMoney(totals.discount)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        ) : (
          <Table<DuplicateReceiptRow>
            rowKey="key"
            loading={branchesLoading || categoriesLoading}
            columns={detailedColumns}
            dataSource={filteredRows}
            pagination={pagination}
            size="middle"
            scroll={{ x: 2050 }}
            locale={{ emptyText: <Empty description="No receipts match the selected filters" /> }}
            summary={() =>
              filteredRows.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: colors.black.primary }}>
                    <Table.Summary.Cell index={0} colSpan={6}>
                      <strong style={{ color: colors.gold.primary }}>
                        Total — {filteredRows.length} receipt{filteredRows.length === 1 ? '' : 's'}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="left">
                      <strong style={{ color: colors.status.warning }}>{formatMoney(totals.pendingAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="left">
                      <strong>{formatMoney(totals.netBilling)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="left">
                      {formatMoney(totals.discount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} colSpan={2} />
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
