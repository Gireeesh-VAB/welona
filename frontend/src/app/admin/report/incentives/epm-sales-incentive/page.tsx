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
  SALES_INCENTIVE_ROWS,
  SALES_INCENTIVE_EMPLOYEES,
  BOOKING_TYPES,
  type SalesIncentiveRow,
  type BookingType,
} from '@/lib/sample-data/sales-incentive';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_employee' | 'summary_branch' | 'summary_bookingType';

const INCENTIVE_OPTIONS = [1, 2, 3, 5, 7, 10];

interface SummaryRow {
  key: string;
  group: string;
  bookings: number;
  collected: number;
  incentive: number;
}

function summarise(
  rows: SalesIncentiveRow[],
  by: 'employeeName' | 'branchName' | 'bookingType',
  incentivePct: number,
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? { key: group, group, bookings: 0, collected: 0, incentive: 0 };
    existing.bookings += 1;
    existing.collected += r.collectedAmount;
    existing.incentive += Math.round((r.collectedAmount * incentivePct) / 100);
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.incentive - a.incentive);
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

export default function AdminSalesIncentivePage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-inc-epm-sales')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [employee, setEmployee] = useState<string | undefined>(undefined);
  const [bookingType, setBookingType] = useState<BookingType | undefined>(undefined);
  const [incentivePct, setIncentivePct] = useState<number>(2);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);
  const employeeOptions = useMemo(
    () => SALES_INCENTIVE_EMPLOYEES.map((e) => ({ value: e, label: e })),
    [],
  );

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return SALES_INCENTIVE_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (employee && r.employeeName !== employee) return false;
      if (bookingType && r.bookingType !== bookingType) return false;
      if (from && dayjs(r.bookingDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.bookingDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, employee, bookingType, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined); setEmployee(undefined);
    setBookingType(undefined); setIncentivePct(2);
    setFormat('detailed'); setPage(1);
  };

  const bookingColor = (b: BookingType): string => {
    if (b === 'New Sale') return colors.status.success;
    if (b === 'Renewal') return colors.status.info;
    if (b === 'Upgrade') return colors.gold.primary;
    if (b === 'Walk-in') return colors.status.warning;
    return colors.text.placeholder;
  };

  const incentiveFor = (row: SalesIncentiveRow) =>
    Math.round((row.collectedAmount * incentivePct) / 100);

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Booking Type','Date','Employee Name','Client Name','Package Details','Category','Collected Amount','Package Amount',`Incentive (${incentivePct}%)`];
      const values = filteredRows.map((r, i) => [
        i + 1, r.bookingType, r.bookingDate, r.employeeName, r.clientName,
        r.packageDetails, r.category,
        (r.collectedAmount / 100).toFixed(2),
        (r.packageAmount / 100).toFixed(2),
        (incentiveFor(r) / 100).toFixed(2),
      ]);
      downloadCsv(`sales-incentive-${incentivePct}pct-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_employee' ? 'employeeName'
      : format === 'summary_branch' ? 'branchName'
      : 'bookingType';
    const groupLabel = format === 'summary_employee' ? 'Employee'
      : format === 'summary_branch' ? 'Branch'
      : 'Booking Type';
    const summary = summarise(filteredRows, by, incentivePct);
    const headers = [groupLabel, 'Bookings', 'Collected', `Incentive (${incentivePct}%)`];
    const values = summary.map((s) => [s.group, s.bookings, (s.collected / 100).toFixed(2), (s.incentive / 100).toFixed(2)]);
    downloadCsv(`sales-incentive-${format}-${incentivePct}pct-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<SalesIncentiveRow> = useMemo(() => [
    {
      title: 'S.No', key: 'sno', width: 75, fixed: 'left',
      render: (_: unknown, __: SalesIncentiveRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Booking Type', dataIndex: 'bookingType', width: 140, fixed: 'left',
      sorter: (a, b) => a.bookingType.localeCompare(b.bookingType),
      render: (v: BookingType) => (
        <Tag style={{ background: bookingColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    {
      title: 'Date', dataIndex: 'bookingDate', width: 130,
      sorter: (a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime(),
      defaultSortOrder: 'descend',
      render: (v: string) => <span style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</span>,
    },
    {
      title: 'Employee Name', dataIndex: 'employeeName', width: 180,
      sorter: (a, b) => a.employeeName.localeCompare(b.employeeName),
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Client Name', dataIndex: 'clientName', width: 200,
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
      render: (v: string) => <span style={{ color: colors.text.primary, fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Package Details', dataIndex: 'packageDetails', width: 280, render: textCell },
    { title: 'Category', dataIndex: 'category', width: 140, render: textCell },
    {
      title: 'Collected Amount', dataIndex: 'collectedAmount', width: 170, align: 'left',
      sorter: (a, b) => a.collectedAmount - b.collectedAmount,
      render: (v: number) => <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>,
    },
    {
      title: 'Package Amount', dataIndex: 'packageAmount', width: 160, align: 'left',
      render: (v: number) => <span style={{ color: colors.text.primary }}>{formatMoney(v)}</span>,
    },
    {
      title: `Incentive (${incentivePct}%)`, key: 'incentive', width: 160, align: 'left', fixed: 'right',
      sorter: (a, b) => incentiveFor(a) - incentiveFor(b),
      render: (_: unknown, row) => (
        <strong style={{ color: colors.gold.primary }}>{formatMoney(incentiveFor(row))}</strong>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, incentivePct, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success, colors.status.info, colors.status.warning]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_employee' ? 'Employee'
      : format === 'summary_branch' ? 'Branch'
      : 'Booking Type';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 240, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => format === 'summary_bookingType' ? (
          <Tag style={{ background: bookingColor(v as BookingType), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
        ) : (
          <span style={{ color: colors.text.primary, fontWeight: 600 }}>{v}</span>
        ),
      },
      { title: 'Bookings', dataIndex: 'bookings', width: 120, align: 'left',
        sorter: (a, b) => a.bookings - b.bookings,
        render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v}</strong> },
      { title: 'Collected', dataIndex: 'collected', width: 180, align: 'left',
        sorter: (a, b) => a.collected - b.collected,
        render: (v: number) => <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong> },
      { title: `Incentive (${incentivePct}%)`, dataIndex: 'incentive', width: 180, align: 'left',
        sorter: (a, b) => a.incentive - b.incentive,
        render: (v: number) => <strong style={{ color: colors.gold.primary }}>{formatMoney(v)}</strong> },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, incentivePct, colors.text.primary, colors.gold.primary, colors.status.success, colors.status.info, colors.status.warning]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => {
    const inc = Math.round((r.collectedAmount * incentivePct) / 100);
    return {
      collected: acc.collected + r.collectedAmount,
      packageAmount: acc.packageAmount + r.packageAmount,
      incentive: acc.incentive + inc,
    };
  }, { collected: 0, packageAmount: 0, incentive: 0 }), [filteredRows, incentivePct]);

  const summaryRows = useMemo(() => {
    if (format === 'summary_employee') return summarise(filteredRows, 'employeeName', incentivePct);
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName', incentivePct);
    if (format === 'summary_bookingType') return summarise(filteredRows, 'bookingType', incentivePct);
    return [];
  }, [filteredRows, format, incentivePct]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} booking${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Booking Date Range</Text>
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Employee Name</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All employees"
              value={employee} onChange={(v: string | undefined) => { setEmployee(v); setPage(1); }}
              options={employeeOptions} allowClear showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Booking Type</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All booking types"
              value={bookingType} onChange={(v: BookingType | undefined) => { setBookingType(v); setPage(1); }}
              options={BOOKING_TYPES.map((b) => ({ value: b, label: b }))}
              allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Incentive %</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={incentivePct}
              onChange={(v: number) => setIncentivePct(v)}
              options={INCENTIVE_OPTIONS.map((p) => ({ value: p, label: `${p}%` }))} />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_employee', label: 'Summary — by Employee' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
                { value: 'summary_bookingType', label: 'Summary — by Booking Type' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 740 }}
            locale={{ emptyText: <Empty description="No bookings match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong style={{ color: colors.gold.primary }}>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.status.success }}>{formatMoney(totals.collected)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left"><strong style={{ color: colors.gold.primary }}>{formatMoney(totals.incentive)}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<SalesIncentiveRow> rowKey="key" loading={branchesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 2010 }}
            locale={{ emptyText: <Empty description="No bookings match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={7}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} booking{filteredRows.length === 1 ? '' : 's'} · {incentivePct}% incentive
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="left"><strong style={{ color: colors.status.success }}>{formatMoney(totals.collected)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="left"><strong>{formatMoney(totals.packageAmount)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="left"><strong style={{ color: colors.gold.primary }}>{formatMoney(totals.incentive)}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
