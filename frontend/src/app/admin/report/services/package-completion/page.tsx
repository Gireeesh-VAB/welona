'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Progress,
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
import { useBranchLock } from '@/hooks/useBranchLock';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  PACKAGE_COMPLETION_ROWS,
  type PackageCompletionRow,
  type CompletionStatus,
} from '@/lib/sample-data/package-completion';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_branch' | 'summary_status' | 'summary_category';

interface SummaryRow {
  key: string;
  group: string;
  packages: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  avgCompletion: number;
}

function summarise(
  rows: PackageCompletionRow[],
  by: 'branchName' | 'status' | 'category',
): SummaryRow[] {
  const map = new Map<string, SummaryRow & { _pctTotal: number }>();
  for (const r of rows) {
    const group = r[by];
    const existing =
      map.get(group) ??
      ({
        key: group,
        group,
        packages: 0,
        sessionsUsed: 0,
        sessionsRemaining: 0,
        avgCompletion: 0,
        _pctTotal: 0,
      });
    existing.packages += 1;
    existing.sessionsUsed += r.sessionsUsed;
    existing.sessionsRemaining += r.sessionsRemaining;
    existing._pctTotal += r.completionPct;
    map.set(group, existing);
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    avgCompletion: s.packages === 0 ? 0 : Math.round(s._pctTotal / s.packages),
  })).sort((a, b) => b.packages - a.packages);
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

export default function AdminPackageCompletionPage() {
  const colors = useBrandColors();
  const { isBranchSession, lockedBranchId } = useBranchLock();
  const navItem = getAdminNavItem('report-services-package-completion')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isBranchSession && lockedBranchId) setBranchId(lockedBranchId);
  }, [isBranchSession, lockedBranchId]);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<CompletionStatus | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const { data: categoriesData, isLoading: categoriesLoading } = useAdminCategories({ limit: 200 });
  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({
      value: b.id,
      label: `${b.branchName} (${b.branchCode})`,
      name: b.branchName,
    })),
    [branchesData],
  );
  const categoryOptions = useMemo(
    () => (categoriesData?.items ?? []).map((c) => ({ value: c.name, label: c.name })),
    [categoriesData],
  );

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return PACKAGE_COMPLETION_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (status && r.status !== status) return false;
      if (from && dayjs(r.receiptDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.receiptDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, category, status, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(isBranchSession ? lockedBranchId : undefined); setCategory(undefined);
    setStatus(undefined); setFormat('detailed'); setPage(1);
  };

  const statusColor = (s: CompletionStatus): string => {
    if (s === 'Completed') return colors.status.success;
    if (s === 'Stalled') return colors.status.warning;
    return colors.status.info;
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = [
        'S No', 'Client Name', 'Mobile', 'Branch', 'Package', 'Category',
        'Total Sessions', 'Sessions Used', 'Sessions Remaining',
        'Completion %', 'Last Session Date', 'Status',
      ];
      const values = filteredRows.map((r, i) => [
        i + 1, r.clientName, r.mobileNumber, r.branchName, r.packageDetails, r.category,
        r.totalSessions, r.sessionsUsed, r.sessionsRemaining,
        r.completionPct, r.lastSessionDate, r.status,
      ]);
      downloadCsv(`package-completion-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName' : format === 'summary_status' ? 'status' : 'category';
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_status' ? 'Status' : 'Category';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Packages', 'Used', 'Remaining', 'Avg Completion %'];
    const values = summary.map((s) => [s.group, s.packages, s.sessionsUsed, s.sessionsRemaining, s.avgCompletion]);
    downloadCsv(`package-completion-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (value: string | null | undefined) =>
    value ? <span style={{ color: colors.text.primary }}>{value}</span>
          : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<PackageCompletionRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: PackageCompletionRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Client Name', dataIndex: 'clientName', width: 200, fixed: 'left',
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.mobileNumber}</Text>
        </div>
      ),
    },
    { title: 'Mobile', dataIndex: 'mobileNumber', width: 150, render: textCell },
    {
      title: 'Branch', dataIndex: 'branchName', width: 170,
      sorter: (a, b) => a.branchName.localeCompare(b.branchName), render: textCell,
    },
    { title: 'Package', dataIndex: 'packageDetails', width: 260, render: textCell },
    { title: 'Category', dataIndex: 'category', width: 140, render: textCell },
    {
      title: 'Total Sessions', dataIndex: 'totalSessions', width: 130, align: 'left',
      sorter: (a, b) => a.totalSessions - b.totalSessions,
    },
    { title: 'Sessions Used', dataIndex: 'sessionsUsed', width: 130, align: 'left' },
    {
      title: 'Sessions Remaining', dataIndex: 'sessionsRemaining', width: 160, align: 'left',
      render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v}</strong>,
    },
    {
      title: 'Completion %', dataIndex: 'completionPct', width: 180, align: 'left',
      sorter: (a, b) => a.completionPct - b.completionPct,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={colors.gold.primary}
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: 'Last Session', dataIndex: 'lastSessionDate', width: 140,
      sorter: (a, b) => new Date(a.lastSessionDate).getTime() - new Date(b.lastSessionDate).getTime(),
      render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
    },
    {
      title: 'Status', dataIndex: 'status', width: 140, fixed: 'right',
      render: (v: CompletionStatus) => (
        <Tag style={{ background: statusColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>
          {v}
        </Tag>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success, colors.status.warning, colors.status.info]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_status' ? 'Status' : 'Category';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 220, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
      },
      { title: 'Packages', dataIndex: 'packages', width: 110, align: 'left' },
      { title: 'Used', dataIndex: 'sessionsUsed', width: 110, align: 'left' },
      { title: 'Remaining', dataIndex: 'sessionsRemaining', width: 130, align: 'left' },
      {
        title: 'Avg Completion %', dataIndex: 'avgCompletion', width: 200, align: 'left',
        sorter: (a, b) => a.avgCompletion - b.avgCompletion,
        render: (v: number) => <Progress percent={v} size="small" strokeColor={colors.gold.primary} />,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.gold.primary]);

  const totals = useMemo(() => filteredRows.reduce(
    (acc, r) => ({
      sessionsUsed: acc.sessionsUsed + r.sessionsUsed,
      sessionsRemaining: acc.sessionsRemaining + r.sessionsRemaining,
      pct: acc.pct + r.completionPct,
    }), { sessionsUsed: 0, sessionsRemaining: 0, pct: 0 }), [filteredRows]);
  const avgPct = filteredRows.length === 0 ? 0 : Math.round(totals.pct / filteredRows.length);

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_status') return summarise(filteredRows, 'status');
    if (format === 'summary_category') return summarise(filteredRows, 'category');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} package${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Enrolment Date Range</Text>
            <RangePicker style={{ width: '100%', marginTop: 4 }}
              value={dateRange ?? undefined}
              onChange={(range) => { setDateRange(range && range[0] && range[1] ? [range[0], range[1]] : null); setPage(1); }}
              format="DD-MM-YYYY" allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Branch</Text>
            <Select style={{ width: '100%', marginTop: 4 }}
              placeholder={branchesLoading ? 'Loading…' : 'All branches'} loading={branchesLoading}
              value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }}
              options={branchOptions} allowClear={!isBranchSession} disabled={isBranchSession} showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Category</Text>
            <Select style={{ width: '100%', marginTop: 4 }}
              placeholder={categoriesLoading ? 'Loading…' : 'All categories'} loading={categoriesLoading}
              value={category} onChange={(v) => { setCategory(v); setPage(1); }}
              options={categoryOptions} allowClear showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Status</Text>
            <Select style={{ width: '100%', marginTop: 4 }}
              placeholder="All statuses" value={status}
              onChange={(v: CompletionStatus | undefined) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Stalled', label: 'Stalled' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }}
              value={format} onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_status', label: 'Summary — by Status' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
                { value: 'summary_category', label: 'Summary — by Category' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 880 }}
            locale={{ emptyText: <Empty description="No packages match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong>{totals.sessionsUsed}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left"><strong style={{ color: colors.gold.primary }}>{totals.sessionsRemaining}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left"><strong>{avgPct}%</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<PackageCompletionRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 2150 }}
            locale={{ emptyText: <Empty description="No packages match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={7}><strong style={{ color: colors.gold.primary }}>Total — {filteredRows.length} package{filteredRows.length === 1 ? '' : 's'}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="left"><strong>{totals.sessionsUsed}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="left"><strong style={{ color: colors.gold.primary }}>{totals.sessionsRemaining}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="left"><strong>Avg {avgPct}%</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={10} colSpan={2} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
