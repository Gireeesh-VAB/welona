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
  Tag,
  Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import {
  CLIENT_ENROLMENT_ROWS,
  type ClientEnrolmentRow,
} from '@/lib/sample-data/client-enrolments';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_branch' | 'summary_category' | 'summary_gender';

interface SummaryRow {
  key: string;
  group: string;
  enrolments: number;
  packageExclTax: number;
  taxAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

function summarise(
  rows: ClientEnrolmentRow[],
  by: 'branchName' | 'category' | 'gender',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing =
      map.get(group) ??
      ({
        key: group,
        group,
        enrolments: 0,
        packageExclTax: 0,
        taxAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
      } satisfies SummaryRow);
    existing.enrolments += 1;
    existing.packageExclTax += r.packageExclTax;
    existing.taxAmount += r.taxAmount;
    existing.paidAmount += r.paidAmount;
    existing.balanceAmount += r.balanceAmount;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.paidAmount - a.paidAmount);
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

export default function AdminClientEnrolmentsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-services-client-enrolments')!;

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
    return CLIENT_ENROLMENT_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (from && dayjs(r.enrolmentDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.enrolmentDate).isAfter(to.endOf('day'))) return false;
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
        'S No', 'Client ID', 'Branch Name', 'Client Name', 'Gender',
        'Mobile No', 'Package', 'Booked By',
        'Package Amount (Excl. Tax)', 'Tax Amount', 'Paid Amount', 'Balance Amount',
      ];
      const values = filteredRows.map((r, i) => [
        i + 1, r.clientId, r.branchName, r.clientName, r.gender,
        r.mobileNumber, r.packageDetails, r.bookedBy,
        (r.packageExclTax / 100).toFixed(2),
        (r.taxAmount / 100).toFixed(2),
        (r.paidAmount / 100).toFixed(2),
        (r.balanceAmount / 100).toFixed(2),
      ]);
      downloadCsv(
        `client-enrolments-${dayjs().format('YYYY-MM-DD')}.csv`,
        rowsToCsv(headers, values),
      );
      return;
    }
    const by =
      format === 'summary_branch'
        ? 'branchName'
        : format === 'summary_gender'
          ? 'gender'
          : 'category';
    const groupLabel =
      format === 'summary_branch'
        ? 'Branch'
        : format === 'summary_gender'
          ? 'Gender'
          : 'Category';
    const summary = summarise(filteredRows, by);
    const headers = [
      groupLabel, 'Enrolments', 'Package (Excl. Tax)', 'Tax', 'Paid', 'Balance',
    ];
    const values = summary.map((s) => [
      s.group, s.enrolments,
      (s.packageExclTax / 100).toFixed(2),
      (s.taxAmount / 100).toFixed(2),
      (s.paidAmount / 100).toFixed(2),
      (s.balanceAmount / 100).toFixed(2),
    ]);
    downloadCsv(
      `client-enrolments-${format}-${dayjs().format('YYYY-MM-DD')}.csv`,
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

  const detailedColumns: ColumnsType<ClientEnrolmentRow> = useMemo(
    () => [
      {
        title: 'S No',
        key: 'sno',
        width: 70,
        fixed: 'left',
        render: (_: unknown, __: ClientEnrolmentRow, idx: number) =>
          (page - 1) * limit + idx + 1,
      },
      {
        title: 'Client ID',
        dataIndex: 'clientId',
        width: 170,
        fixed: 'left',
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
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
        title: 'Client Name',
        dataIndex: 'clientName',
        width: 200,
        sorter: (a, b) => a.clientName.localeCompare(b.clientName),
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
        ),
      },
      {
        title: 'Gender',
        dataIndex: 'gender',
        width: 100,
        sorter: (a, b) => a.gender.localeCompare(b.gender),
        render: (v: 'Male' | 'Female') => (
          <Tag
            style={{
              background: v === 'Female' ? colors.status.error : colors.status.info,
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {v}
          </Tag>
        ),
      },
      {
        title: 'Mobile No',
        dataIndex: 'mobileNumber',
        width: 150,
        render: textCell,
      },
      {
        title: 'Package',
        dataIndex: 'packageDetails',
        width: 280,
        render: textCell,
      },
      {
        title: 'Booked By',
        dataIndex: 'bookedBy',
        width: 170,
        render: textCell,
      },
      {
        title: 'Package Amount (Excl. Tax)',
        dataIndex: 'packageExclTax',
        width: 200,
        align: 'left',
        sorter: (a, b) => a.packageExclTax - b.packageExclTax,
        render: (v: number) => (
          <span style={{ color: colors.text.primary }}>{formatMoney(v)}</span>
        ),
      },
      {
        title: 'Tax Amount',
        dataIndex: 'taxAmount',
        width: 130,
        align: 'left',
        render: moneyCell,
      },
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
        sorter: (a, b) => a.balanceAmount - b.balanceAmount,
        render: (v: number) =>
          v > 0 ? (
            <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
          ) : (
            <span style={{ color: colors.text.placeholder }}>—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, colors.text.primary, colors.text.placeholder, colors.status.success, colors.status.warning, colors.status.info, colors.status.error],
  );

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel =
      format === 'summary_branch'
        ? 'Branch'
        : format === 'summary_gender'
          ? 'Gender'
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
      { title: 'Enrolments', dataIndex: 'enrolments', width: 130, align: 'left' },
      {
        title: 'Package (Excl. Tax)',
        dataIndex: 'packageExclTax',
        width: 200,
        align: 'left',
        sorter: (a, b) => a.packageExclTax - b.packageExclTax,
        render: (v: number) => formatMoney(v),
      },
      {
        title: 'Tax',
        dataIndex: 'taxAmount',
        width: 140,
        align: 'left',
        render: moneyCell,
      },
      {
        title: 'Paid',
        dataIndex: 'paidAmount',
        width: 170,
        align: 'left',
        render: (v: number) => (
          <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        ),
      },
      {
        title: 'Balance',
        dataIndex: 'balanceAmount',
        width: 170,
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
  }, [format, colors.text.primary, colors.text.placeholder, colors.status.success, colors.status.warning]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          packageExclTax: acc.packageExclTax + r.packageExclTax,
          taxAmount: acc.taxAmount + r.taxAmount,
          paidAmount: acc.paidAmount + r.paidAmount,
          balanceAmount: acc.balanceAmount + r.balanceAmount,
        }),
        { packageExclTax: 0, taxAmount: 0, paidAmount: 0, balanceAmount: 0 },
      ),
    [filteredRows],
  );

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_gender') return summarise(filteredRows, 'gender');
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
      `${range[0]} - ${range[1]} of ${total} enrolment${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Enrolment Date Range</Text>
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
                { value: 'summary_gender', label: 'Summary — by Gender' },
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
            scroll={{ x: 1040 }}
            locale={{ emptyText: <Empty description="No enrolments match the selected filters" /> }}
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
                      <strong>{formatMoney(totals.packageExclTax)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="left">
                      {formatMoney(totals.taxAmount)}
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
          <Table<ClientEnrolmentRow>
            rowKey="key"
            loading={branchesLoading || categoriesLoading}
            columns={detailedColumns}
            dataSource={filteredRows}
            pagination={pagination}
            size="middle"
            scroll={{ x: 2050 }}
            locale={{ emptyText: <Empty description="No enrolments match the selected filters" /> }}
            summary={() =>
              filteredRows.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: colors.black.primary }}>
                    <Table.Summary.Cell index={0} colSpan={8}>
                      <strong style={{ color: colors.gold.primary }}>
                        Total — {filteredRows.length} enrolment{filteredRows.length === 1 ? '' : 's'}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="left">
                      <strong>{formatMoney(totals.packageExclTax)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="left">
                      {formatMoney(totals.taxAmount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} align="left">
                      <strong style={{ color: colors.status.success }}>{formatMoney(totals.paidAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={11} align="left">
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
