'use client';

import { useMemo, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Empty, Row, Select, Space, Table, Tag, Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  SESSION_ENTRY_ROWS,
  type SessionEntryRow,
  type SessionOutcome,
} from '@/lib/sample-data/session-entries';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_outcome' | 'summary_therapist' | 'summary_branch';

interface SummaryRow {
  key: string;
  group: string;
  sessions: number;
  completed: number;
  cancelled: number;
  noShow: number;
  durationMins: number;
}

function summarise(
  rows: SessionEntryRow[],
  by: 'outcome' | 'therapist' | 'branchName',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? {
      key: group, group, sessions: 0, completed: 0, cancelled: 0, noShow: 0, durationMins: 0,
    };
    existing.sessions += 1;
    if (r.outcome === 'Completed') existing.completed += 1;
    if (r.outcome === 'Cancelled') existing.cancelled += 1;
    if (r.outcome === 'No-Show') existing.noShow += 1;
    existing.durationMins += r.durationMins;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions);
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

export default function AdminSessionEntriesPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-services-session-entries')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<SessionOutcome | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const { data: categoriesData, isLoading: categoriesLoading } = useAdminCategories({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);
  const categoryOptions = useMemo(() => (categoriesData?.items ?? []).map((c) => ({
    value: c.name, label: c.name,
  })), [categoriesData]);

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return SESSION_ENTRY_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (outcome && r.outcome !== outcome) return false;
      if (from && dayjs(r.sessionDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.sessionDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, category, outcome, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined); setCategory(undefined);
    setOutcome(undefined); setFormat('detailed'); setPage(1);
  };

  const outcomeColor = (o: SessionOutcome): string => {
    if (o === 'Completed') return colors.status.success;
    if (o === 'No-Show') return colors.status.error;
    return colors.status.warning;
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Session Date','Branch','Client','Mobile','Service','Therapist','Duration (mins)','Notes','Outcome'];
      const values = filteredRows.map((r, i) => [
        i + 1, r.sessionDate, r.branchName, r.clientName, r.mobileNumber,
        r.service, r.therapist, r.durationMins, r.notes, r.outcome,
      ]);
      downloadCsv(`session-entries-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName' : format === 'summary_therapist' ? 'therapist' : 'outcome';
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_therapist' ? 'Therapist' : 'Outcome';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Sessions', 'Completed', 'Cancelled', 'No-Show', 'Duration (mins)'];
    const values = summary.map((s) => [s.group, s.sessions, s.completed, s.cancelled, s.noShow, s.durationMins]);
    downloadCsv(`session-entries-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<SessionEntryRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: SessionEntryRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Session Date', dataIndex: 'sessionDate', width: 140, fixed: 'left',
      sorter: (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime(),
      render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
    },
    { title: 'Branch', dataIndex: 'branchName', width: 170, sorter: (a, b) => a.branchName.localeCompare(b.branchName), render: textCell },
    {
      title: 'Client', dataIndex: 'clientName', width: 200,
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.mobileNumber}</Text>
        </div>
      ),
    },
    { title: 'Mobile', dataIndex: 'mobileNumber', width: 150, render: textCell },
    { title: 'Service', dataIndex: 'service', width: 240, render: textCell },
    {
      title: 'Therapist', dataIndex: 'therapist', width: 180,
      sorter: (a, b) => a.therapist.localeCompare(b.therapist),
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Duration (mins)', dataIndex: 'durationMins', width: 140, align: 'left' },
    { title: 'Notes', dataIndex: 'notes', width: 320, render: textCell },
    {
      title: 'Outcome', dataIndex: 'outcome', width: 140, fixed: 'right',
      render: (v: SessionOutcome) => (
        <Tag style={{ background: outcomeColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success, colors.status.warning, colors.status.error]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_therapist' ? 'Therapist' : 'Outcome';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 220, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
      },
      { title: 'Sessions', dataIndex: 'sessions', width: 110, align: 'left',
        sorter: (a, b) => a.sessions - b.sessions },
      { title: 'Completed', dataIndex: 'completed', width: 120, align: 'left',
        render: (v: number) => <strong style={{ color: colors.status.success }}>{v}</strong> },
      { title: 'Cancelled', dataIndex: 'cancelled', width: 120, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.warning }}>{v}</strong> : '—' },
      { title: 'No-Show', dataIndex: 'noShow', width: 110, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{v}</strong> : '—' },
      { title: 'Duration (mins)', dataIndex: 'durationMins', width: 150, align: 'left' },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.status.success, colors.status.warning, colors.status.error]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    completed: acc.completed + (r.outcome === 'Completed' ? 1 : 0),
    cancelled: acc.cancelled + (r.outcome === 'Cancelled' ? 1 : 0),
    noShow: acc.noShow + (r.outcome === 'No-Show' ? 1 : 0),
    duration: acc.duration + r.durationMins,
  }), { completed: 0, cancelled: 0, noShow: 0, duration: 0 }), [filteredRows]);

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_therapist') return summarise(filteredRows, 'therapist');
    if (format === 'summary_outcome') return summarise(filteredRows, 'outcome');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} session${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Session Date Range</Text>
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Category</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder={categoriesLoading ? 'Loading…' : 'All categories'}
              loading={categoriesLoading} value={category} onChange={(v) => { setCategory(v); setPage(1); }}
              options={categoryOptions} allowClear showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Outcome</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All outcomes" value={outcome}
              onChange={(v: SessionOutcome | undefined) => { setOutcome(v); setPage(1); }}
              options={[
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' },
                { value: 'No-Show', label: 'No-Show' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_outcome', label: 'Summary — by Outcome' },
                { value: 'summary_therapist', label: 'Summary — by Therapist' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 940 }}
            locale={{ emptyText: <Empty description="No sessions match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.status.success }}>{totals.completed}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left">{totals.cancelled > 0 ? <strong style={{ color: colors.status.warning }}>{totals.cancelled}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left">{totals.noShow > 0 ? <strong style={{ color: colors.status.error }}>{totals.noShow}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left"><strong>{totals.duration}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<SessionEntryRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 2050 }}
            locale={{ emptyText: <Empty description="No sessions match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={7}><strong style={{ color: colors.gold.primary }}>Total — {filteredRows.length} session{filteredRows.length === 1 ? '' : 's'}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="left"><strong>{totals.duration} mins</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} />
                  <Table.Summary.Cell index={9} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
