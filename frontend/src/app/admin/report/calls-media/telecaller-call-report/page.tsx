'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Empty, Row, Select, Space, Table, Tag, Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBranchLock } from '@/hooks/useBranchLock';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  TELECALLER_CALL_ROWS,
  type TelecallerCallRow,
  type CallType,
  type CallOutcome,
  type ConnectionStatus,
} from '@/lib/sample-data/telecaller-calls';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_telecaller' | 'summary_outcome' | 'summary_callType' | 'summary_branch';

interface SummaryRow {
  key: string;
  group: string;
  calls: number;
  connected: number;
  notConnected: number;
  booked: number;
  durationMins: number;
  connectPct: number;
  conversionPct: number;
}

const CONNECTED_STATUSES: ConnectionStatus[] = ['Connected'];

function summarise(
  rows: TelecallerCallRow[],
  by: 'telecaller' | 'outcome' | 'callType' | 'branchName',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? {
      key: group, group, calls: 0, connected: 0, notConnected: 0,
      booked: 0, durationMins: 0, connectPct: 0, conversionPct: 0,
    };
    existing.calls += 1;
    if (CONNECTED_STATUSES.includes(r.connectionStatus)) existing.connected += 1;
    else existing.notConnected += 1;
    if (r.outcome === 'Booked') existing.booked += 1;
    existing.durationMins += r.durationMins;
    map.set(group, existing);
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    connectPct: s.calls === 0 ? 0 : Math.round((s.connected / s.calls) * 100),
    conversionPct: s.connected === 0 ? 0 : Math.round((s.booked / s.connected) * 100),
  })).sort((a, b) => b.calls - a.calls);
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

export default function AdminTelecallerCallReportPage() {
  const colors = useBrandColors();
  const { isBranchSession, lockedBranchId } = useBranchLock();
  const navItem = getAdminNavItem('report-cm-telecaller-call')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [callType, setCallType] = useState<CallType | undefined>(undefined);
  const [outcome, setOutcome] = useState<CallOutcome | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    if (isBranchSession && lockedBranchId) setBranchId(lockedBranchId);
  }, [isBranchSession, lockedBranchId]);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return TELECALLER_CALL_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (callType && r.callType !== callType) return false;
      if (outcome && r.outcome !== outcome) return false;
      if (from && dayjs(r.callAt).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.callAt).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, callType, outcome, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(isBranchSession ? lockedBranchId : undefined); setCallType(undefined);
    setOutcome(undefined); setFormat('detailed'); setPage(1);
  };

  const connColor = (s: ConnectionStatus): string => {
    if (s === 'Connected') return colors.status.success;
    if (s === 'Busy' || s === 'Not Reachable') return colors.status.warning;
    return colors.status.error;
  };

  const outcomeColor = (o: CallOutcome): string => {
    if (o === 'Booked') return colors.status.success;
    if (o === 'Interested') return colors.status.info;
    if (o === 'Call Back') return colors.status.warning;
    if (o === 'Not Interested' || o === 'Do Not Disturb') return colors.status.error;
    return colors.text.placeholder;
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Call Date','Call Time','Telecaller','Branch','Customer','Mobile','Call Type','Attempts','Connection Status','Duration (mins)','Outcome','Remarks'];
      const values = filteredRows.map((r, i) => [
        i + 1, dayjs(r.callAt).format('DD-MM-YYYY'), dayjs(r.callAt).format('HH:mm'),
        r.telecaller, r.branchName, r.customerName, r.mobileNumber,
        r.callType, r.attempts, r.connectionStatus, r.durationMins, r.outcome, r.remarks,
      ]);
      downloadCsv(`telecaller-calls-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_telecaller' ? 'telecaller'
      : format === 'summary_branch' ? 'branchName'
      : format === 'summary_callType' ? 'callType'
      : 'outcome';
    const groupLabel = format === 'summary_telecaller' ? 'Telecaller'
      : format === 'summary_branch' ? 'Branch'
      : format === 'summary_callType' ? 'Call Type'
      : 'Outcome';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Calls', 'Connected', 'Not Connected', 'Booked', 'Duration (mins)', 'Connect %', 'Conversion %'];
    const values = summary.map((s) => [s.group, s.calls, s.connected, s.notConnected, s.booked, s.durationMins, s.connectPct, s.conversionPct]);
    downloadCsv(`telecaller-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<TelecallerCallRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: TelecallerCallRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Call Date & Time', dataIndex: 'callAt', width: 170, fixed: 'left',
      sorter: (a, b) => new Date(a.callAt).getTime() - new Date(b.callAt).getTime(),
      defaultSortOrder: 'descend',
      render: (v: string) => (
        <div>
          <div style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{dayjs(v).format('hh:mm A')}</Text>
        </div>
      ),
    },
    {
      title: 'Telecaller', dataIndex: 'telecaller', width: 180,
      sorter: (a, b) => a.telecaller.localeCompare(b.telecaller),
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span>,
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
    {
      title: 'Call Type', dataIndex: 'callType', width: 130,
      sorter: (a, b) => a.callType.localeCompare(b.callType),
      render: (v: string) => <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{v}</Tag>,
    },
    { title: 'Attempts', dataIndex: 'attempts', width: 100, align: 'left',
      sorter: (a, b) => a.attempts - b.attempts,
      render: (v: number) => v > 1 ? <strong style={{ color: colors.status.warning }}>{v}</strong> : v },
    {
      title: 'Connection Status', dataIndex: 'connectionStatus', width: 170,
      render: (v: ConnectionStatus) => (
        <Tag style={{ background: connColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Duration (mins)', dataIndex: 'durationMins', width: 140, align: 'left',
      sorter: (a, b) => a.durationMins - b.durationMins,
      render: (v: number) => v > 0 ? <strong>{v}</strong> : <span style={{ color: colors.text.placeholder }}>—</span> },
    {
      title: 'Outcome', dataIndex: 'outcome', width: 160,
      sorter: (a, b) => a.outcome.localeCompare(b.outcome),
      render: (v: CallOutcome) => (
        <Tag style={{ background: outcomeColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Remarks', dataIndex: 'remarks', width: 320, render: textCell },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.gold.light, colors.status.success, colors.status.info, colors.status.warning, colors.status.error]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_telecaller' ? 'Telecaller'
      : format === 'summary_branch' ? 'Branch'
      : format === 'summary_callType' ? 'Call Type'
      : 'Outcome';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 220, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
      },
      { title: 'Calls', dataIndex: 'calls', width: 100, align: 'left',
        sorter: (a, b) => a.calls - b.calls,
        render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v}</strong> },
      { title: 'Connected', dataIndex: 'connected', width: 120, align: 'left',
        render: (v: number) => <strong style={{ color: colors.status.success }}>{v}</strong> },
      { title: 'Not Connected', dataIndex: 'notConnected', width: 140, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.warning }}>{v}</strong> : '—' },
      { title: 'Booked', dataIndex: 'booked', width: 100, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.success }}>{v}</strong> : '—' },
      { title: 'Duration (mins)', dataIndex: 'durationMins', width: 150, align: 'left' },
      { title: 'Connect %', dataIndex: 'connectPct', width: 130, align: 'left',
        sorter: (a, b) => a.connectPct - b.connectPct,
        render: (v: number) => <strong>{v}%</strong> },
      { title: 'Conv. %', dataIndex: 'conversionPct', width: 120, align: 'left',
        sorter: (a, b) => a.conversionPct - b.conversionPct,
        render: (v: number) => <strong>{v}%</strong> },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.gold.primary, colors.status.success, colors.status.warning]);

  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    connected: acc.connected + (CONNECTED_STATUSES.includes(r.connectionStatus) ? 1 : 0),
    booked: acc.booked + (r.outcome === 'Booked' ? 1 : 0),
    duration: acc.duration + r.durationMins,
  }), { connected: 0, booked: 0, duration: 0 }), [filteredRows]);
  const connectRate = filteredRows.length === 0 ? 0 : Math.round((totals.connected / filteredRows.length) * 100);
  const convRate = totals.connected === 0 ? 0 : Math.round((totals.booked / totals.connected) * 100);

  const summaryRows = useMemo(() => {
    if (format === 'summary_telecaller') return summarise(filteredRows, 'telecaller');
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_callType') return summarise(filteredRows, 'callType');
    if (format === 'summary_outcome') return summarise(filteredRows, 'outcome');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} call${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Call Date Range</Text>
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Call Type</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All call types" value={callType}
              onChange={(v: CallType | undefined) => { setCallType(v); setPage(1); }}
              options={[
                { value: 'Cold', label: 'Cold' },
                { value: 'Follow-Up', label: 'Follow-Up' },
                { value: 'Reminder', label: 'Reminder' },
                { value: 'Reactivation', label: 'Reactivation' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Outcome</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All outcomes" value={outcome}
              onChange={(v: CallOutcome | undefined) => { setOutcome(v); setPage(1); }}
              options={[
                { value: 'Booked', label: 'Booked' },
                { value: 'Interested', label: 'Interested' },
                { value: 'Call Back', label: 'Call Back' },
                { value: 'Not Interested', label: 'Not Interested' },
                { value: 'Do Not Disturb', label: 'Do Not Disturb' },
                { value: 'No Response', label: 'No Response' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_telecaller', label: 'Summary — by Telecaller' },
                { value: 'summary_outcome', label: 'Summary — by Outcome' },
                { value: 'summary_callType', label: 'Summary — by Call Type' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 1180 }}
            locale={{ emptyText: <Empty description="No calls match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong style={{ color: colors.gold.primary }}>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.status.success }}>{totals.connected}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left">{filteredRows.length - totals.connected > 0 ? <strong style={{ color: colors.status.warning }}>{filteredRows.length - totals.connected}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left"><strong style={{ color: colors.status.success }}>{totals.booked}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left"><strong>{totals.duration} mins</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="left"><strong>{connectRate}%</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="left"><strong>{convRate}%</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<TelecallerCallRow> rowKey="key" loading={branchesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 2360 }}
            locale={{ emptyText: <Empty description="No calls match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={9}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} call{filteredRows.length === 1 ? '' : 's'}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="left"><strong>{totals.duration} mins</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="left">
                    <Space size={6} wrap>
                      <strong style={{ color: colors.status.success }}>{totals.connected} connected</strong>
                      <strong style={{ color: colors.status.success }}>· {totals.booked} booked</strong>
                      <strong>· {convRate}% conv.</strong>
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
