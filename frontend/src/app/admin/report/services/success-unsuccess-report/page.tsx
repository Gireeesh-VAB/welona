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
  SUCCESS_UNSUCCESS_ROWS,
  type SuccessUnsuccessRow,
  type TreatmentOutcome,
} from '@/lib/sample-data/success-unsuccess';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_outcome' | 'summary_branch' | 'summary_category';

interface SummaryRow {
  key: string;
  group: string;
  cases: number;
  success: number;
  unsuccess: number;
  ongoing: number;
  successPct: number;
}

function summarise(
  rows: SuccessUnsuccessRow[],
  by: 'branchName' | 'outcome' | 'category',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? {
      key: group, group, cases: 0, success: 0, unsuccess: 0, ongoing: 0, successPct: 0,
    };
    existing.cases += 1;
    if (r.outcome === 'Success') existing.success += 1;
    if (r.outcome === 'Unsuccess') existing.unsuccess += 1;
    if (r.outcome === 'Ongoing') existing.ongoing += 1;
    map.set(group, existing);
  }
  return Array.from(map.values()).map((s) => {
    const closed = s.success + s.unsuccess;
    return { ...s, successPct: closed === 0 ? 0 : Math.round((s.success / closed) * 100) };
  }).sort((a, b) => b.cases - a.cases);
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

export default function AdminSuccessUnsuccessPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-services-success-unsuccess')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<TreatmentOutcome | undefined>(undefined);
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
    return SUCCESS_UNSUCCESS_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (outcome && r.outcome !== outcome) return false;
      if (from && dayjs(r.receiptDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.receiptDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, category, outcome, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined); setCategory(undefined);
    setOutcome(undefined); setFormat('detailed'); setPage(1);
  };

  const outcomeColor = (o: TreatmentOutcome): string => {
    if (o === 'Success') return colors.status.success;
    if (o === 'Unsuccess') return colors.status.error;
    return colors.status.info;
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Client','Mobile','Branch','Category','Treatment','Total Sessions','Sessions Done','Outcome','Reason/Remarks'];
      const values = filteredRows.map((r, i) => [
        i + 1, r.clientName, r.mobileNumber, r.branchName, r.category, r.treatment,
        r.totalSessions, r.sessionsDone, r.outcome, r.reason,
      ]);
      downloadCsv(`success-unsuccess-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName' : format === 'summary_outcome' ? 'outcome' : 'category';
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_outcome' ? 'Outcome' : 'Category';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Cases', 'Success', 'Unsuccess', 'Ongoing', 'Success Rate %'];
    const values = summary.map((s) => [s.group, s.cases, s.success, s.unsuccess, s.ongoing, s.successPct]);
    downloadCsv(`success-unsuccess-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<SuccessUnsuccessRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: SuccessUnsuccessRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Client', dataIndex: 'clientName', width: 200, fixed: 'left',
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.mobileNumber}</Text>
        </div>
      ),
    },
    { title: 'Mobile', dataIndex: 'mobileNumber', width: 150, render: textCell },
    { title: 'Branch', dataIndex: 'branchName', width: 170, sorter: (a, b) => a.branchName.localeCompare(b.branchName), render: textCell },
    { title: 'Category', dataIndex: 'category', width: 140, render: textCell },
    { title: 'Treatment', dataIndex: 'treatment', width: 260, render: textCell },
    { title: 'Total Sessions', dataIndex: 'totalSessions', width: 130, align: 'left' },
    {
      title: 'Sessions Done', dataIndex: 'sessionsDone', width: 130, align: 'left',
      sorter: (a, b) => a.sessionsDone - b.sessionsDone,
      render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v}</strong>,
    },
    {
      title: 'Outcome', dataIndex: 'outcome', width: 130,
      sorter: (a, b) => a.outcome.localeCompare(b.outcome),
      render: (v: TreatmentOutcome) => (
        <Tag style={{ background: outcomeColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Reason / Remarks', dataIndex: 'reason', width: 360, render: textCell },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success, colors.status.error, colors.status.info]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_outcome' ? 'Outcome' : 'Category';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 220, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
      },
      { title: 'Cases', dataIndex: 'cases', width: 100, align: 'left',
        sorter: (a, b) => a.cases - b.cases },
      { title: 'Success', dataIndex: 'success', width: 110, align: 'left',
        render: (v: number) => <strong style={{ color: colors.status.success }}>{v}</strong> },
      { title: 'Unsuccess', dataIndex: 'unsuccess', width: 110, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{v}</strong> : '—' },
      { title: 'Ongoing', dataIndex: 'ongoing', width: 100, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.info }}>{v}</strong> : '—' },
      { title: 'Success Rate %', dataIndex: 'successPct', width: 150, align: 'left',
        sorter: (a, b) => a.successPct - b.successPct,
        render: (v: number) => <strong>{v}%</strong> },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.status.success, colors.status.error, colors.status.info]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    success: acc.success + (r.outcome === 'Success' ? 1 : 0),
    unsuccess: acc.unsuccess + (r.outcome === 'Unsuccess' ? 1 : 0),
    ongoing: acc.ongoing + (r.outcome === 'Ongoing' ? 1 : 0),
  }), { success: 0, unsuccess: 0, ongoing: 0 }), [filteredRows]);
  const closed = totals.success + totals.unsuccess;
  const successRate = closed === 0 ? 0 : Math.round((totals.success / closed) * 100);

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_outcome') return summarise(filteredRows, 'outcome');
    if (format === 'summary_category') return summarise(filteredRows, 'category');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} case${total === 1 ? '' : 's'}`,
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
              onChange={(v: TreatmentOutcome | undefined) => { setOutcome(v); setPage(1); }}
              options={[
                { value: 'Success', label: 'Success' },
                { value: 'Unsuccess', label: 'Unsuccess' },
                { value: 'Ongoing', label: 'Ongoing' },
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
                { value: 'summary_category', label: 'Summary — by Category' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 900 }}
            locale={{ emptyText: <Empty description="No cases match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.status.success }}>{totals.success}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left">{totals.unsuccess > 0 ? <strong style={{ color: colors.status.error }}>{totals.unsuccess}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left">{totals.ongoing > 0 ? <strong style={{ color: colors.status.info }}>{totals.ongoing}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left"><strong>{successRate}%</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<SuccessUnsuccessRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 1980 }}
            locale={{ emptyText: <Empty description="No cases match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={8}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} case{filteredRows.length === 1 ? '' : 's'}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="left">
                    <strong style={{ color: colors.status.success }}>{totals.success}</strong>
                    {' · '}
                    {totals.unsuccess > 0 && <strong style={{ color: colors.status.error }}>{totals.unsuccess}</strong>}
                    {totals.unsuccess > 0 && ' · '}
                    {totals.ongoing > 0 && <strong style={{ color: colors.status.info }}>{totals.ongoing}</strong>}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="left"><strong>Success {successRate}%</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
