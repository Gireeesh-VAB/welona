'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import {
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBranchLock } from '@/hooks/useBranchLock';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import {
  CLIENT_WISE_PPT_ROWS,
  type ClientWisePptRow,
} from '@/lib/sample-data/client-wise-ppt';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_client' | 'summary_category' | 'summary_branch';

interface SummaryRow {
  key: string;
  group: string;
  packages: number;
  quantity: number;
  bookedAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

function summarise(
  rows: ClientWisePptRow[],
  by: 'clientName' | 'category' | 'branchName',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing =
      map.get(group) ??
      ({
        key: group,
        group,
        packages: 0,
        quantity: 0,
        bookedAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
      } satisfies SummaryRow);
    existing.packages += 1;
    existing.quantity += r.quantity;
    existing.bookedAmount += r.bookedAmount;
    existing.paidAmount += r.paidAmount;
    existing.balanceAmount += r.balanceAmount;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.bookedAmount - a.bookedAmount);
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

export default function AdminClientWisePptPage() {
  const colors = useBrandColors();
  const { isBranchSession, lockedBranchId } = useBranchLock();
  const navItem = getAdminNavItem('report-sales-client-wise-ppt')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isBranchSession && lockedBranchId) setBranchId(lockedBranchId);
  }, [isBranchSession, lockedBranchId]);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [customerSearch, setCustomerSearch] = useState('');
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
    const needle = customerSearch.trim().toLowerCase();
    return CLIENT_WISE_PPT_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (from && dayjs(r.receiptDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.receiptDate).isAfter(to.endOf('day'))) return false;
      if (needle) {
        const hay = `${r.clientName} ${r.phoneNumber}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [branchId, category, dateRange, customerSearch, branchOptions]);

  const resetFilters = () => {
    setDateRange(null);
    setBranchId(isBranchSession ? lockedBranchId : undefined);
    setCategory(undefined);
    setCustomerSearch('');
    setFormat('detailed');
    setPage(1);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = [
        'S No', 'Client Name', 'Joined Date', 'Ph Number', 'Package Details',
        'Quantity', 'Booked Amount', 'Paid Amount', 'Balance Amount', 'Booked By Name',
      ];
      const values = filteredRows.map((r, i) => [
        i + 1, r.clientName, r.joinedDate, r.phoneNumber, r.packageDetails,
        r.quantity,
        (r.bookedAmount / 100).toFixed(2),
        (r.paidAmount / 100).toFixed(2),
        (r.balanceAmount / 100).toFixed(2),
        r.bookedByName,
      ]);
      downloadCsv(`client-wise-ppt-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by =
      format === 'summary_client'
        ? 'clientName'
        : format === 'summary_branch'
          ? 'branchName'
          : 'category';
    const groupLabel =
      format === 'summary_client'
        ? 'Client'
        : format === 'summary_branch'
          ? 'Branch'
          : 'Category';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Packages', 'Quantity', 'Booked', 'Paid', 'Balance'];
    const values = summary.map((s) => [
      s.group, s.packages, s.quantity,
      (s.bookedAmount / 100).toFixed(2),
      (s.paidAmount / 100).toFixed(2),
      (s.balanceAmount / 100).toFixed(2),
    ]);
    downloadCsv(
      `client-wise-ppt-${format}-${dayjs().format('YYYY-MM-DD')}.csv`,
      rowsToCsv(headers, values),
    );
  };

  const textCell = (value: string | null | undefined) =>
    value ? (
      <span style={{ color: colors.text.primary }}>{value}</span>
    ) : (
      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
    );

  const detailedColumns: ColumnsType<ClientWisePptRow> = useMemo(
    () => [
      {
        title: 'S No',
        key: 'sno',
        width: 70,
        fixed: 'left',
        render: (_: unknown, __: ClientWisePptRow, idx: number) =>
          (page - 1) * limit + idx + 1,
      },
      {
        title: 'Client Name',
        dataIndex: 'clientName',
        width: 200,
        fixed: 'left',
        sorter: (a, b) => a.clientName.localeCompare(b.clientName),
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
        ),
      },
      {
        title: 'Joined Date',
        dataIndex: 'joinedDate',
        width: 130,
        sorter: (a, b) =>
          new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime(),
        render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
      },
      {
        title: 'Ph Number',
        dataIndex: 'phoneNumber',
        width: 150,
        render: textCell,
      },
      {
        title: 'PackageDetails',
        dataIndex: 'packageDetails',
        width: 280,
        render: textCell,
      },
      {
        title: 'Quantity',
        dataIndex: 'quantity',
        width: 100,
        align: 'left',
        sorter: (a, b) => a.quantity - b.quantity,
        render: (v: number) => (
          <strong style={{ color: colors.gold.primary }}>{v}</strong>
        ),
      },
      {
        title: 'Booked Amount',
        dataIndex: 'bookedAmount',
        width: 160,
        align: 'left',
        sorter: (a, b) => a.bookedAmount - b.bookedAmount,
        render: (v: number) => (
          <span style={{ color: colors.text.primary }}>{formatMoney(v)}</span>
        ),
      },
      {
        title: 'Paid Amount',
        dataIndex: 'paidAmount',
        width: 150,
        align: 'left',
        render: (v: number) => (
          <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        ),
      },
      {
        title: 'Balance Amount',
        dataIndex: 'balanceAmount',
        width: 160,
        align: 'left',
        sorter: (a, b) => a.balanceAmount - b.balanceAmount,
        render: (v: number) =>
          v > 0 ? (
            <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
          ) : (
            <span style={{ color: colors.text.placeholder }}>—</span>
          ),
      },
      {
        title: 'Booked By Name',
        dataIndex: 'bookedByName',
        width: 180,
        fixed: 'right',
        render: textCell,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success, colors.status.warning],
  );

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel =
      format === 'summary_client'
        ? 'Client'
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
      { title: 'Packages', dataIndex: 'packages', width: 110, align: 'left' },
      { title: 'Quantity', dataIndex: 'quantity', width: 110, align: 'left' },
      {
        title: 'Booked Amount',
        dataIndex: 'bookedAmount',
        width: 170,
        align: 'left',
        sorter: (a, b) => a.bookedAmount - b.bookedAmount,
        render: (v: number) => formatMoney(v),
      },
      {
        title: 'Paid Amount',
        dataIndex: 'paidAmount',
        width: 170,
        align: 'left',
        render: (v: number) => (
          <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        ),
      },
      {
        title: 'Balance Amount',
        dataIndex: 'balanceAmount',
        width: 180,
        align: 'left',
        fixed: 'right',
        sorter: (a, b) => a.balanceAmount - b.balanceAmount,
        render: (v: number) =>
          v > 0 ? (
            <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
          ) : (
            <span style={{ color: colors.text.placeholder }}>—</span>
          ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.status.success, colors.status.warning]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          quantity: acc.quantity + r.quantity,
          bookedAmount: acc.bookedAmount + r.bookedAmount,
          paidAmount: acc.paidAmount + r.paidAmount,
          balanceAmount: acc.balanceAmount + r.balanceAmount,
        }),
        { quantity: 0, bookedAmount: 0, paidAmount: 0, balanceAmount: 0 },
      ),
    [filteredRows],
  );

  const summaryRows = useMemo(() => {
    if (format === 'summary_client') return summarise(filteredRows, 'clientName');
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
      `${range[0]} - ${range[1]} of ${total} package${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Customer Name</Text>
            <Input
              prefix={<UserOutlined style={{ color: colors.text.placeholder }} />}
              placeholder="Search by name or phone"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setPage(1);
              }}
              allowClear
              style={{ marginTop: 4 }}
            />
          </Col>
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
                { value: 'summary_client', label: 'Summary — by Client' },
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
            locale={{ emptyText: <Empty description="No packages match the selected filters" /> }}
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
                      <strong>{totals.quantity}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="left">
                      <strong>{formatMoney(totals.bookedAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="left">
                      <strong style={{ color: colors.status.warning }}>{formatMoney(totals.balanceAmount)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        ) : (
          <Table<ClientWisePptRow>
            rowKey="key"
            loading={branchesLoading || categoriesLoading}
            columns={detailedColumns}
            dataSource={filteredRows}
            pagination={pagination}
            size="middle"
            scroll={{ x: 1750 }}
            locale={{ emptyText: <Empty description="No packages match the selected filters" /> }}
            summary={() =>
              filteredRows.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: colors.black.primary }}>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <strong style={{ color: colors.gold.primary }}>
                        Total — {filteredRows.length} package{filteredRows.length === 1 ? '' : 's'}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="left">
                      <strong>{totals.quantity}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="left">
                      <strong>{formatMoney(totals.bookedAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="left">
                      <strong style={{ color: colors.status.warning }}>{formatMoney(totals.balanceAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} />
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
