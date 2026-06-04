'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Empty, Row, Select, Space, Table, Tag, Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBranchLock } from '@/hooks/useBranchLock';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  ENQUIRY_REPORT_ROWS,
  type EnquiryReportRow,
  type EnquiryStatus,
  type EnquiryChannel,
} from '@/lib/sample-data/enquiry-report';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_status' | 'summary_source' | 'summary_channel' | 'summary_branch';

interface SummaryRow {
  key: string;
  group: string;
  enquiries: number;
  new_: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  conversionPct: number;
}

function summarise(
  rows: EnquiryReportRow[],
  by: 'status' | 'source' | 'channel' | 'branchName',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = String(r[by]);
    const existing = map.get(group) ?? {
      key: group, group, enquiries: 0,
      new_: 0, contacted: 0, qualified: 0, converted: 0, lost: 0,
      conversionPct: 0,
    };
    existing.enquiries += 1;
    if (r.status === 'New') existing.new_ += 1;
    else if (r.status === 'Contacted') existing.contacted += 1;
    else if (r.status === 'Qualified') existing.qualified += 1;
    else if (r.status === 'Converted') existing.converted += 1;
    else if (r.status === 'Lost') existing.lost += 1;
    map.set(group, existing);
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    conversionPct: s.enquiries === 0 ? 0 : Math.round((s.converted / s.enquiries) * 100),
  })).sort((a, b) => b.enquiries - a.enquiries);
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

export default function AdminEnquiryReportPage() {
  const colors = useBrandColors();
  const { isBranchSession, lockedBranchId } = useBranchLock();
  const navItem = getAdminNavItem('report-cm-enquiry')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [channel, setChannel] = useState<EnquiryChannel | undefined>(undefined);
  const [status, setStatus] = useState<EnquiryStatus | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    if (isBranchSession && lockedBranchId) setBranchId(lockedBranchId);
  }, [isBranchSession, lockedBranchId]);

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
    return ENQUIRY_REPORT_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (channel && r.channel !== channel) return false;
      if (status && r.status !== status) return false;
      if (from && dayjs(r.enquiryDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.enquiryDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, category, channel, status, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(isBranchSession ? lockedBranchId : undefined); setCategory(undefined);
    setChannel(undefined); setStatus(undefined);
    setFormat('detailed'); setPage(1);
  };

  const statusColor = (s: EnquiryStatus): string => {
    if (s === 'Converted') return colors.status.success;
    if (s === 'Qualified') return colors.status.info;
    if (s === 'Contacted') return colors.status.warning;
    if (s === 'Lost') return colors.status.error;
    return colors.text.placeholder;
  };

  const channelColor = (c: EnquiryChannel): string => {
    if (c === 'Phone') return colors.status.info;
    if (c === 'Walk-in') return colors.status.success;
    return colors.gold.primary;
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Enquiry Date','Branch','Customer','Mobile','Source','Channel','Treatment Interest','Category','Status','Owner','Last Activity'];
      const values = filteredRows.map((r, i) => [
        i + 1, r.enquiryDate, r.branchName, r.customerName, r.mobileNumber,
        r.source, r.channel, r.treatmentInterest, r.category,
        r.status, r.owner, r.lastActivityDate,
      ]);
      downloadCsv(`enquiries-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_status' ? 'status'
      : format === 'summary_source' ? 'source'
      : format === 'summary_channel' ? 'channel'
      : 'branchName';
    const groupLabel = format === 'summary_status' ? 'Status'
      : format === 'summary_source' ? 'Source'
      : format === 'summary_channel' ? 'Channel'
      : 'Branch';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Enquiries', 'New', 'Contacted', 'Qualified', 'Converted', 'Lost', 'Conversion %'];
    const values = summary.map((s) => [s.group, s.enquiries, s.new_, s.contacted, s.qualified, s.converted, s.lost, s.conversionPct]);
    downloadCsv(`enquiries-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<EnquiryReportRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: EnquiryReportRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Enquiry Date', dataIndex: 'enquiryDate', width: 130, fixed: 'left',
      sorter: (a, b) => new Date(a.enquiryDate).getTime() - new Date(b.enquiryDate).getTime(),
      defaultSortOrder: 'descend',
      render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
    },
    { title: 'Branch', dataIndex: 'branchName', width: 170,
      sorter: (a, b) => a.branchName.localeCompare(b.branchName), render: textCell },
    {
      title: 'Customer', dataIndex: 'customerName', width: 200,
      sorter: (a, b) => a.customerName.localeCompare(b.customerName),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.mobileNumber}</Text>
        </div>
      ),
    },
    { title: 'Mobile', dataIndex: 'mobileNumber', width: 150, render: textCell },
    { title: 'Source', dataIndex: 'source', width: 150,
      render: (v: string) => <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{v}</Tag> },
    {
      title: 'Channel', dataIndex: 'channel', width: 110,
      render: (v: EnquiryChannel) => (
        <Tag style={{ background: channelColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Treatment Interest', dataIndex: 'treatmentInterest', width: 230, render: textCell },
    { title: 'Category', dataIndex: 'category', width: 140, render: textCell },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (v: EnquiryStatus) => (
        <Tag style={{ background: statusColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Owner', dataIndex: 'owner', width: 170,
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span> },
    {
      title: 'Last Activity', dataIndex: 'lastActivityDate', width: 140,
      sorter: (a, b) => new Date(a.lastActivityDate).getTime() - new Date(b.lastActivityDate).getTime(),
      render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.gold.light, colors.status.success, colors.status.info, colors.status.warning, colors.status.error]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_status' ? 'Status'
      : format === 'summary_source' ? 'Source'
      : format === 'summary_channel' ? 'Channel'
      : 'Branch';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 220, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
      },
      { title: 'Enquiries', dataIndex: 'enquiries', width: 110, align: 'left',
        sorter: (a, b) => a.enquiries - b.enquiries,
        render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v}</strong> },
      { title: 'New', dataIndex: 'new_', width: 90, align: 'left',
        render: (v: number) => v > 0 ? <strong>{v}</strong> : '—' },
      { title: 'Contacted', dataIndex: 'contacted', width: 120, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.warning }}>{v}</strong> : '—' },
      { title: 'Qualified', dataIndex: 'qualified', width: 110, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.info }}>{v}</strong> : '—' },
      { title: 'Converted', dataIndex: 'converted', width: 120, align: 'left',
        render: (v: number) => <strong style={{ color: colors.status.success }}>{v}</strong> },
      { title: 'Lost', dataIndex: 'lost', width: 100, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{v}</strong> : '—' },
      { title: 'Conversion %', dataIndex: 'conversionPct', width: 140, align: 'left',
        sorter: (a, b) => a.conversionPct - b.conversionPct,
        render: (v: number) => <strong>{v}%</strong> },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.gold.primary, colors.status.success, colors.status.info, colors.status.warning, colors.status.error]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    new_: acc.new_ + (r.status === 'New' ? 1 : 0),
    contacted: acc.contacted + (r.status === 'Contacted' ? 1 : 0),
    qualified: acc.qualified + (r.status === 'Qualified' ? 1 : 0),
    converted: acc.converted + (r.status === 'Converted' ? 1 : 0),
    lost: acc.lost + (r.status === 'Lost' ? 1 : 0),
  }), { new_: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 }), [filteredRows]);
  const conversionRate = filteredRows.length === 0 ? 0 : Math.round((totals.converted / filteredRows.length) * 100);

  const summaryRows = useMemo(() => {
    if (format === 'summary_status') return summarise(filteredRows, 'status');
    if (format === 'summary_source') return summarise(filteredRows, 'source');
    if (format === 'summary_channel') return summarise(filteredRows, 'channel');
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} enquir${total === 1 ? 'y' : 'ies'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Enquiry Date Range</Text>
            <RangePicker style={{ width: '100%', marginTop: 4 }} value={dateRange ?? undefined}
              onChange={(r) => { setDateRange(r && r[0] && r[1] ? [r[0], r[1]] : null); setPage(1); }}
              format="DD-MM-YYYY" allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Branch</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading} value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }}
              options={branchOptions} allowClear={!isBranchSession} disabled={isBranchSession} showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Category</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder={categoriesLoading ? 'Loading…' : 'All categories'}
              loading={categoriesLoading} value={category} onChange={(v) => { setCategory(v); setPage(1); }}
              options={categoryOptions} allowClear showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Channel</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All channels" value={channel}
              onChange={(v: EnquiryChannel | undefined) => { setChannel(v); setPage(1); }}
              options={[
                { value: 'Phone', label: 'Phone' },
                { value: 'Walk-in', label: 'Walk-in' },
                { value: 'Digital', label: 'Digital' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Status</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All statuses" value={status}
              onChange={(v: EnquiryStatus | undefined) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'New', label: 'New' },
                { value: 'Contacted', label: 'Contacted' },
                { value: 'Qualified', label: 'Qualified' },
                { value: 'Converted', label: 'Converted' },
                { value: 'Lost', label: 'Lost' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_status', label: 'Summary — by Status' },
                { value: 'summary_source', label: 'Summary — by Source' },
                { value: 'summary_channel', label: 'Summary — by Channel' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 1200 }}
            locale={{ emptyText: <Empty description="No enquiries match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong style={{ color: colors.gold.primary }}>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left">{totals.new_ > 0 ? <strong>{totals.new_}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left">{totals.contacted > 0 ? <strong style={{ color: colors.status.warning }}>{totals.contacted}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left">{totals.qualified > 0 ? <strong style={{ color: colors.status.info }}>{totals.qualified}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left"><strong style={{ color: colors.status.success }}>{totals.converted}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="left">{totals.lost > 0 ? <strong style={{ color: colors.status.error }}>{totals.lost}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="left"><strong>{conversionRate}%</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<EnquiryReportRow> rowKey="key" loading={branchesLoading || categoriesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 2120 }}
            locale={{ emptyText: <Empty description="No enquiries match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={9}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} enquir{filteredRows.length === 1 ? 'y' : 'ies'}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9}>
                    <Space size={6} wrap>
                      <strong style={{ color: colors.status.success }}>{totals.converted} converted</strong>
                      {totals.lost > 0 && <strong style={{ color: colors.status.error }}>· {totals.lost} lost</strong>}
                      <strong>· {conversionRate}% conv.</strong>
                    </Space>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10} />
                  <Table.Summary.Cell index={11} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
