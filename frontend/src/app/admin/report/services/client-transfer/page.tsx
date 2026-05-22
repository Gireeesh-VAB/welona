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
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import {
  CLIENT_TRANSFER_ROWS,
  type ClientTransferRow,
} from '@/lib/sample-data/client-transfer';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat =
  | 'detailed'
  | 'summary_from_branch'
  | 'summary_to_branch'
  | 'summary_category';

interface SummaryRow {
  key: string;
  group: string;
  transfers: number;
  sessionsCarried: number;
  pendingAmount: number;
}

function summarise(
  rows: ClientTransferRow[],
  by: 'fromBranch' | 'toBranch' | 'category',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing =
      map.get(group) ??
      ({
        key: group,
        group,
        transfers: 0,
        sessionsCarried: 0,
        pendingAmount: 0,
      } satisfies SummaryRow);
    existing.transfers += 1;
    existing.sessionsCarried += r.sessionsRemaining;
    existing.pendingAmount += r.pendingAmount;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.transfers - a.transfers);
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

export default function AdminClientTransferPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-services-client-transfer')!;

  // --- Filter state ---
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [fromBranchId, setFromBranchId] = useState<string | undefined>(undefined);
  const [toBranchId, setToBranchId] = useState<string | undefined>(undefined);
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
    const fromName = branchOptions.find((b) => b.value === fromBranchId)?.name;
    const toName = branchOptions.find((b) => b.value === toBranchId)?.name;
    const [from, to] = dateRange ?? [];
    return CLIENT_TRANSFER_ROWS.filter((r) => {
      if (fromName && r.fromBranch !== fromName) return false;
      if (toName && r.toBranch !== toName) return false;
      if (category && r.category !== category) return false;
      if (from && dayjs(r.transferDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.transferDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [fromBranchId, toBranchId, category, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null);
    setFromBranchId(undefined);
    setToBranchId(undefined);
    setCategory(undefined);
    setFormat('detailed');
    setPage(1);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = [
        'S No', 'Transfer Date', 'Client Name', 'Mobile Number',
        'From Branch', 'To Branch', 'Package Details', 'Category',
        'Sessions Used', 'Sessions Remaining', 'Pending Amount',
        'Transferred By', 'Reason',
      ];
      const values = filteredRows.map((r, i) => [
        i + 1, r.transferDate, r.clientName, r.mobileNumber,
        r.fromBranch, r.toBranch, r.packageDetails, r.category,
        r.sessionsUsed, r.sessionsRemaining,
        (r.pendingAmount / 100).toFixed(2),
        r.transferredBy, r.reason,
      ]);
      downloadCsv(`client-transfer-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by =
      format === 'summary_from_branch'
        ? 'fromBranch'
        : format === 'summary_to_branch'
          ? 'toBranch'
          : 'category';
    const groupLabel =
      format === 'summary_from_branch'
        ? 'From Branch'
        : format === 'summary_to_branch'
          ? 'To Branch'
          : 'Category';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Transfers', 'Sessions Carried', 'Pending Amount'];
    const values = summary.map((s) => [
      s.group, s.transfers, s.sessionsCarried,
      (s.pendingAmount / 100).toFixed(2),
    ]);
    downloadCsv(
      `client-transfer-${format}-${dayjs().format('YYYY-MM-DD')}.csv`,
      rowsToCsv(headers, values),
    );
  };

  const textCell = (value: string | null | undefined) =>
    value ? (
      <span style={{ color: colors.text.primary }}>{value}</span>
    ) : (
      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
    );

  const detailedColumns: ColumnsType<ClientTransferRow> = useMemo(
    () => [
      {
        title: 'S No',
        key: 'sno',
        width: 70,
        fixed: 'left',
        render: (_: unknown, __: ClientTransferRow, idx: number) =>
          (page - 1) * limit + idx + 1,
      },
      {
        title: 'Transfer Date',
        dataIndex: 'transferDate',
        width: 130,
        sorter: (a, b) =>
          new Date(a.transferDate).getTime() - new Date(b.transferDate).getTime(),
        render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
      },
      {
        title: 'Client Name',
        dataIndex: 'clientName',
        width: 200,
        fixed: 'left',
        sorter: (a, b) => a.clientName.localeCompare(b.clientName),
        render: (v: string, row) => (
          <div>
            <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
              {row.mobileNumber}
            </Text>
          </div>
        ),
      },
      {
        title: 'Mobile Number',
        dataIndex: 'mobileNumber',
        width: 150,
        render: textCell,
      },
      {
        title: 'Transfer',
        key: 'transfer',
        width: 320,
        render: (_: unknown, row) => (
          <Space size={8} wrap>
            <Tag color="red" style={{ margin: 0 }}>
              {row.fromBranch}
            </Tag>
            <ArrowRightOutlined style={{ color: colors.gold.primary }} />
            <Tag color="green" style={{ margin: 0 }}>
              {row.toBranch}
            </Tag>
          </Space>
        ),
      },
      {
        title: 'From Branch',
        dataIndex: 'fromBranch',
        width: 160,
        sorter: (a, b) => a.fromBranch.localeCompare(b.fromBranch),
        render: textCell,
      },
      {
        title: 'To Branch',
        dataIndex: 'toBranch',
        width: 160,
        sorter: (a, b) => a.toBranch.localeCompare(b.toBranch),
        render: textCell,
      },
      {
        title: 'Package Details',
        dataIndex: 'packageDetails',
        width: 260,
        render: textCell,
      },
      {
        title: 'Category',
        dataIndex: 'category',
        width: 140,
        render: textCell,
      },
      {
        title: 'Sessions Used',
        dataIndex: 'sessionsUsed',
        width: 130,
        align: 'left',
        render: (v: number) => (
          <span style={{ color: colors.text.placeholder }}>{v}</span>
        ),
      },
      {
        title: 'Sessions Remaining',
        dataIndex: 'sessionsRemaining',
        width: 160,
        align: 'left',
        sorter: (a, b) => a.sessionsRemaining - b.sessionsRemaining,
        render: (v: number) => (
          <strong style={{ color: colors.gold.primary }}>{v}</strong>
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
        title: 'Transferred By',
        dataIndex: 'transferredBy',
        width: 170,
        render: textCell,
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        width: 240,
        fixed: 'right',
        render: textCell,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.warning],
  );

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel =
      format === 'summary_from_branch'
        ? 'From Branch'
        : format === 'summary_to_branch'
          ? 'To Branch'
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
      { title: 'Transfers', dataIndex: 'transfers', width: 130, align: 'left' },
      {
        title: 'Sessions Carried',
        dataIndex: 'sessionsCarried',
        width: 170,
        align: 'left',
        sorter: (a, b) => a.sessionsCarried - b.sessionsCarried,
      },
      {
        title: 'Pending Amount',
        dataIndex: 'pendingAmount',
        width: 180,
        align: 'left',
        fixed: 'right',
        sorter: (a, b) => a.pendingAmount - b.pendingAmount,
        render: (v: number) =>
          v > 0 ? (
            <strong style={{ color: colors.status.warning }}>{formatMoney(v)}</strong>
          ) : (
            <span style={{ color: colors.text.placeholder }}>—</span>
          ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.text.placeholder, colors.status.warning]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          sessionsUsed: acc.sessionsUsed + r.sessionsUsed,
          sessionsRemaining: acc.sessionsRemaining + r.sessionsRemaining,
          pendingAmount: acc.pendingAmount + r.pendingAmount,
        }),
        { sessionsUsed: 0, sessionsRemaining: 0, pendingAmount: 0 },
      ),
    [filteredRows],
  );

  const summaryRows = useMemo(() => {
    if (format === 'summary_from_branch') return summarise(filteredRows, 'fromBranch');
    if (format === 'summary_to_branch') return summarise(filteredRows, 'toBranch');
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
      `${range[0]} - ${range[1]} of ${total} transfer${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Transfer Date Range</Text>
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>From Branch</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading}
              value={fromBranchId}
              onChange={(v) => {
                setFromBranchId(v);
                setPage(1);
              }}
              options={branchOptions}
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>To Branch</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading}
              value={toBranchId}
              onChange={(v) => {
                setToBranchId(v);
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
                { value: 'summary_from_branch', label: 'Summary — by From Branch' },
                { value: 'summary_to_branch', label: 'Summary — by To Branch' },
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
            scroll={{ x: 800 }}
            locale={{ emptyText: <Empty description="No transfers match the selected filters" /> }}
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
                      <strong>{totals.sessionsRemaining}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="left">
                      <strong style={{ color: colors.status.warning }}>{formatMoney(totals.pendingAmount)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        ) : (
          <Table<ClientTransferRow>
            rowKey="key"
            loading={branchesLoading || categoriesLoading}
            columns={detailedColumns}
            dataSource={filteredRows}
            pagination={pagination}
            size="middle"
            scroll={{ x: 2400 }}
            locale={{ emptyText: <Empty description="No transfers match the selected filters" /> }}
            summary={() =>
              filteredRows.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: colors.black.primary }}>
                    <Table.Summary.Cell index={0} colSpan={9}>
                      <strong style={{ color: colors.gold.primary }}>
                        Total — {filteredRows.length} transfer{filteredRows.length === 1 ? '' : 's'}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="left">
                      <strong>{totals.sessionsUsed}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} align="left">
                      <strong style={{ color: colors.gold.primary }}>{totals.sessionsRemaining}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={11} align="left">
                      <strong style={{ color: colors.status.warning }}>{formatMoney(totals.pendingAmount)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={12} colSpan={2} />
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
