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
  WALK_IN_ROWS,
  type WalkInRow,
  type WalkInOutcome,
} from '@/lib/sample-data/walk-in-details';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_outcome' | 'summary_branch' | 'summary_source';

interface SummaryRow {
  key: string;
  group: string;
  walkIns: number;
  booked: number;
  consultation: number;
  followUp: number;
  lost: number;
  pending: number;
  conversionPct: number;
}

function summarise(
  rows: WalkInRow[],
  by: 'outcome' | 'branchName' | 'source',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? {
      key: group, group, walkIns: 0, booked: 0, consultation: 0,
      followUp: 0, lost: 0, pending: 0, conversionPct: 0,
    };
    existing.walkIns += 1;
    if (r.outcome === 'Booked') existing.booked += 1;
    else if (r.outcome === 'Consultation') existing.consultation += 1;
    else if (r.outcome === 'Follow-Up') existing.followUp += 1;
    else if (r.outcome === 'Lost') existing.lost += 1;
    else if (r.outcome === 'Pending') existing.pending += 1;
    map.set(group, existing);
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    conversionPct: s.walkIns === 0 ? 0 : Math.round((s.booked / s.walkIns) * 100),
  })).sort((a, b) => b.walkIns - a.walkIns);
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

export default function AdminWalkInDetailsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-cm-walk-in')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<WalkInOutcome | undefined>(undefined);
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
    return WALK_IN_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (outcome && r.outcome !== outcome) return false;
      if (from && dayjs(r.walkInAt).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.walkInAt).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, category, outcome, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined); setCategory(undefined);
    setOutcome(undefined); setFormat('detailed'); setPage(1);
  };

  const outcomeColor = (o: WalkInOutcome): string => {
    if (o === 'Booked') return colors.status.success;
    if (o === 'Consultation') return colors.status.info;
    if (o === 'Follow-Up') return colors.status.warning;
    if (o === 'Lost') return colors.status.error;
    return colors.text.placeholder;
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = [
        'S No', 'Walk-in Date', 'Walk-in Time', 'Branch', 'Customer Name',
        'Mobile', 'Gender', 'Treatment Interest', 'Category', 'Source',
        'Attended By', 'Outcome', 'Remarks',
      ];
      const values = filteredRows.map((r, i) => [
        i + 1,
        dayjs(r.walkInAt).format('DD-MM-YYYY'),
        dayjs(r.walkInAt).format('HH:mm'),
        r.branchName, r.customerName, r.mobileNumber, r.gender,
        r.treatmentInterest, r.category, r.source, r.attendedBy, r.outcome, r.remarks,
      ]);
      downloadCsv(`walk-in-details-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName' : format === 'summary_source' ? 'source' : 'outcome';
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_source' ? 'Source' : 'Outcome';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Walk-ins', 'Booked', 'Consultation', 'Follow-Up', 'Lost', 'Pending', 'Conversion %'];
    const values = summary.map((s) => [s.group, s.walkIns, s.booked, s.consultation, s.followUp, s.lost, s.pending, s.conversionPct]);
    downloadCsv(`walk-in-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<WalkInRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: WalkInRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Walk-in Date & Time', dataIndex: 'walkInAt', width: 180, fixed: 'left',
      sorter: (a, b) => new Date(a.walkInAt).getTime() - new Date(b.walkInAt).getTime(),
      defaultSortOrder: 'descend',
      render: (v: string) => (
        <div>
          <div style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{dayjs(v).format('hh:mm A')}</Text>
        </div>
      ),
    },
    { title: 'Branch', dataIndex: 'branchName', width: 170,
      sorter: (a, b) => a.branchName.localeCompare(b.branchName), render: textCell },
    {
      title: 'Customer Name', dataIndex: 'customerName', width: 200,
      sorter: (a, b) => a.customerName.localeCompare(b.customerName),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.mobileNumber}</Text>
        </div>
      ),
    },
    { title: 'Mobile', dataIndex: 'mobileNumber', width: 150, render: textCell },
    {
      title: 'Gender', dataIndex: 'gender', width: 100,
      render: (v: 'Male' | 'Female') => (
        <Tag style={{
          background: v === 'Female' ? colors.status.error : colors.status.info,
          color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0,
        }}>{v}</Tag>
      ),
    },
    { title: 'Treatment Interest', dataIndex: 'treatmentInterest', width: 230, render: textCell },
    { title: 'Category', dataIndex: 'category', width: 140, render: textCell },
    { title: 'Source', dataIndex: 'source', width: 150,
      render: (v: string) => <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{v}</Tag> },
    { title: 'Attended By', dataIndex: 'attendedBy', width: 170,
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span> },
    {
      title: 'Outcome', dataIndex: 'outcome', width: 140,
      sorter: (a, b) => a.outcome.localeCompare(b.outcome),
      render: (v: WalkInOutcome) => (
        <Tag style={{ background: outcomeColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Remarks', dataIndex: 'remarks', width: 320, render: textCell },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.gold.light, colors.status.success, colors.status.info, colors.status.warning, colors.status.error]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_source' ? 'Source' : 'Outcome';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 220, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
      },
      { title: 'Walk-ins', dataIndex: 'walkIns', width: 110, align: 'left',
        sorter: (a, b) => a.walkIns - b.walkIns,
        render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v}</strong> },
      { title: 'Booked', dataIndex: 'booked', width: 110, align: 'left',
        render: (v: number) => <strong style={{ color: colors.status.success }}>{v}</strong> },
      { title: 'Consultation', dataIndex: 'consultation', width: 130, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.info }}>{v}</strong> : '—' },
      { title: 'Follow-Up', dataIndex: 'followUp', width: 120, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.warning }}>{v}</strong> : '—' },
      { title: 'Lost', dataIndex: 'lost', width: 100, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{v}</strong> : '—' },
      { title: 'Pending', dataIndex: 'pending', width: 110, align: 'left',
        render: (v: number) => v > 0 ? <strong>{v}</strong> : '—' },
      { title: 'Conversion %', dataIndex: 'conversionPct', width: 140, align: 'left',
        sorter: (a, b) => a.conversionPct - b.conversionPct,
        render: (v: number) => <strong>{v}%</strong> },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.gold.primary, colors.status.success, colors.status.info, colors.status.warning, colors.status.error]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    booked: acc.booked + (r.outcome === 'Booked' ? 1 : 0),
    consultation: acc.consultation + (r.outcome === 'Consultation' ? 1 : 0),
    followUp: acc.followUp + (r.outcome === 'Follow-Up' ? 1 : 0),
    lost: acc.lost + (r.outcome === 'Lost' ? 1 : 0),
    pending: acc.pending + (r.outcome === 'Pending' ? 1 : 0),
  }), { booked: 0, consultation: 0, followUp: 0, lost: 0, pending: 0 }), [filteredRows]);
  const conversionRate = filteredRows.length === 0 ? 0 : Math.round((totals.booked / filteredRows.length) * 100);

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_source') return summarise(filteredRows, 'source');
    if (format === 'summary_outcome') return summarise(filteredRows, 'outcome');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} walk-in${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Walk-in Date Range</Text>
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
              onChange={(v: WalkInOutcome | undefined) => { setOutcome(v); setPage(1); }}
              options={[
                { value: 'Booked', label: 'Booked' },
                { value: 'Consultation', label: 'Consultation' },
                { value: 'Follow-Up', label: 'Follow-Up' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Lost', label: 'Lost' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_outcome', label: 'Summary — by Outcome' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
                { value: 'summary_source', label: 'Summary — by Source' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 1140 }}
            locale={{ emptyText: <Empty description="No walk-ins match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong style={{ color: colors.gold.primary }}>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.status.success }}>{totals.booked}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left">{totals.consultation > 0 ? <strong style={{ color: colors.status.info }}>{totals.consultation}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left">{totals.followUp > 0 ? <strong style={{ color: colors.status.warning }}>{totals.followUp}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left">{totals.lost > 0 ? <strong style={{ color: colors.status.error }}>{totals.lost}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="left">{totals.pending > 0 ? <strong>{totals.pending}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="left"><strong>{conversionRate}%</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<WalkInRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 2200 }}
            locale={{ emptyText: <Empty description="No walk-ins match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={10}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} walk-in{filteredRows.length === 1 ? '' : 's'}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10}>
                    <Space size={6} wrap>
                      <strong style={{ color: colors.status.success }}>{totals.booked} booked</strong>
                      {totals.lost > 0 && <strong style={{ color: colors.status.error }}>{totals.lost} lost</strong>}
                      <strong>· {conversionRate}% conv.</strong>
                    </Space>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={11} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
