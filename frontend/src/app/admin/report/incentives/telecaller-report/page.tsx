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
import { formatMoney } from '@shared/format';
import {
  TELECALLER_INCENTIVE_ROWS,
  TELECALLER_LIST,
  type TelecallerIncentiveRow,
} from '@/lib/sample-data/telecaller-incentive';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_telecaller' | 'summary_branch';

const INCENTIVE_OPTIONS = [1, 2, 3, 5, 7, 10];
const CONNECTED_OUTCOMES = new Set(['Booked', 'Interested', 'Call Back', 'Not Interested', 'Do Not Disturb']);
const LEAD_OUTCOMES = new Set(['Interested', 'Call Back']);

interface SummaryRow {
  key: string;
  group: string;
  calls: number;
  connected: number;
  leads: number;
  bookings: number;
  collected: number;
  incentive: number;
  connectPct: number;
  conversionPct: number;
}

function summarise(
  rows: TelecallerIncentiveRow[],
  by: 'telecaller' | 'branchName',
  incentivePct: number,
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? {
      key: group, group,
      calls: 0, connected: 0, leads: 0, bookings: 0,
      collected: 0, incentive: 0,
      connectPct: 0, conversionPct: 0,
    };
    existing.calls += 1;
    if (CONNECTED_OUTCOMES.has(r.outcome)) existing.connected += 1;
    if (LEAD_OUTCOMES.has(r.outcome)) existing.leads += 1;
    if (r.outcome === 'Booked') {
      existing.bookings += 1;
      existing.collected += r.collectedAmount;
      existing.incentive += Math.round((r.collectedAmount * incentivePct) / 100);
    }
    map.set(group, existing);
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    connectPct: s.calls === 0 ? 0 : Math.round((s.connected / s.calls) * 100),
    conversionPct: s.connected === 0 ? 0 : Math.round((s.bookings / s.connected) * 100),
  })).sort((a, b) => b.incentive - a.incentive);
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

export default function AdminTelecallerIncentivePage() {
  const colors = useBrandColors();
  const { isBranchSession, lockedBranchId } = useBranchLock();
  const navItem = getAdminNavItem('report-inc-telecaller')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isBranchSession && lockedBranchId) setBranchId(lockedBranchId);
  }, [isBranchSession, lockedBranchId]);
  const [telecaller, setTelecaller] = useState<string | undefined>(undefined);
  const [incentivePct, setIncentivePct] = useState<number>(2);
  const [format, setFormat] = useState<ReportFormat>('summary_telecaller');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);
  const telecallerOptions = useMemo(
    () => TELECALLER_LIST.map((t) => ({ value: t, label: t })),
    [],
  );

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return TELECALLER_INCENTIVE_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (telecaller && r.telecaller !== telecaller) return false;
      if (from && dayjs(r.callAt).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.callAt).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, telecaller, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(isBranchSession ? lockedBranchId : undefined); setTelecaller(undefined);
    setIncentivePct(2); setFormat('summary_telecaller'); setPage(1);
  };

  const outcomeColor = (o: string): string => {
    if (o === 'Booked') return colors.status.success;
    if (o === 'Interested') return colors.status.info;
    if (o === 'Call Back') return colors.status.warning;
    if (o === 'Not Interested' || o === 'Do Not Disturb') return colors.status.error;
    return colors.text.placeholder;
  };

  const incentiveFor = (row: TelecallerIncentiveRow) =>
    row.outcome === 'Booked'
      ? Math.round((row.collectedAmount * incentivePct) / 100)
      : 0;

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Call Date','Telecaller','Branch','Customer','Mobile','Call Type','Connection','Outcome','Duration (mins)','Collected',`Incentive (${incentivePct}%)`];
      const values = filteredRows.map((r, i) => [
        i + 1, dayjs(r.callAt).format('DD-MM-YYYY HH:mm'),
        r.telecaller, r.branchName, r.customerName, r.mobileNumber,
        r.callType, r.connectionStatus, r.outcome, r.durationMins,
        (r.collectedAmount / 100).toFixed(2),
        (incentiveFor(r) / 100).toFixed(2),
      ]);
      downloadCsv(`telecaller-incentive-${incentivePct}pct-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName' : 'telecaller';
    const groupLabel = format === 'summary_branch' ? 'Branch' : 'Telecaller';
    const summary = summarise(filteredRows, by, incentivePct);
    const headers = [groupLabel, 'Calls', 'Connected', 'Leads', 'Bookings', 'Collected', `Incentive (${incentivePct}%)`, 'Connect %', 'Conv %'];
    const values = summary.map((s) => [
      s.group, s.calls, s.connected, s.leads, s.bookings,
      (s.collected / 100).toFixed(2),
      (s.incentive / 100).toFixed(2),
      s.connectPct, s.conversionPct,
    ]);
    downloadCsv(`telecaller-incentive-${format}-${incentivePct}pct-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<TelecallerIncentiveRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: TelecallerIncentiveRow, idx: number) => (page - 1) * limit + idx + 1,
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
    { title: 'Call Type', dataIndex: 'callType', width: 130,
      render: (v: string) => <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{v}</Tag> },
    {
      title: 'Outcome', dataIndex: 'outcome', width: 150,
      sorter: (a, b) => a.outcome.localeCompare(b.outcome),
      render: (v: string) => (
        <Tag style={{ background: outcomeColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Duration (mins)', dataIndex: 'durationMins', width: 140, align: 'left',
      render: (v: number) => v > 0 ? <strong>{v}</strong> : <span style={{ color: colors.text.placeholder }}>—</span> },
    {
      title: 'Collected', dataIndex: 'collectedAmount', width: 160, align: 'left',
      sorter: (a, b) => a.collectedAmount - b.collectedAmount,
      render: (v: number) => v > 0
        ? <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong>
        : <span style={{ color: colors.text.placeholder }}>—</span>,
    },
    {
      title: `Incentive (${incentivePct}%)`, key: 'incentive', width: 160, align: 'left', fixed: 'right',
      sorter: (a, b) => incentiveFor(a) - incentiveFor(b),
      render: (_: unknown, row) => {
        const inc = incentiveFor(row);
        return inc > 0
          ? <strong style={{ color: colors.gold.primary }}>{formatMoney(inc)}</strong>
          : <span style={{ color: colors.text.placeholder }}>—</span>;
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, incentivePct, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.gold.light, colors.status.success, colors.status.info, colors.status.warning, colors.status.error]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch' : 'Telecaller';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 220, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span>,
      },
      { title: 'Calls', dataIndex: 'calls', width: 100, align: 'left',
        sorter: (a, b) => a.calls - b.calls,
        render: (v: number) => <strong>{v}</strong> },
      { title: 'Connected', dataIndex: 'connected', width: 120, align: 'left',
        render: (v: number) => <strong style={{ color: colors.status.success }}>{v}</strong> },
      { title: 'Leads', dataIndex: 'leads', width: 100, align: 'left',
        render: (v: number) => v > 0 ? <strong style={{ color: colors.status.info }}>{v}</strong> : '—' },
      { title: 'Bookings', dataIndex: 'bookings', width: 110, align: 'left',
        sorter: (a, b) => a.bookings - b.bookings,
        render: (v: number) => <strong style={{ color: colors.status.success }}>{v}</strong> },
      { title: 'Collected', dataIndex: 'collected', width: 180, align: 'left',
        sorter: (a, b) => a.collected - b.collected,
        render: (v: number) => <strong style={{ color: colors.status.success }}>{formatMoney(v)}</strong> },
      { title: `Incentive (${incentivePct}%)`, dataIndex: 'incentive', width: 180, align: 'left',
        sorter: (a, b) => a.incentive - b.incentive,
        render: (v: number) => <strong style={{ color: colors.gold.primary }}>{formatMoney(v)}</strong> },
      { title: 'Connect %', dataIndex: 'connectPct', width: 130, align: 'left',
        render: (v: number) => <strong>{v}%</strong> },
      { title: 'Conv %', dataIndex: 'conversionPct', width: 120, align: 'left',
        sorter: (a, b) => a.conversionPct - b.conversionPct,
        render: (v: number) => <strong>{v}%</strong> },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, incentivePct, colors.text.primary, colors.gold.primary, colors.status.success, colors.status.info]);

  const totals = useMemo(() => {
    let calls = 0, connected = 0, leads = 0, bookings = 0, collected = 0, incentive = 0;
    for (const r of filteredRows) {
      calls += 1;
      if (CONNECTED_OUTCOMES.has(r.outcome)) connected += 1;
      if (LEAD_OUTCOMES.has(r.outcome)) leads += 1;
      if (r.outcome === 'Booked') {
        bookings += 1;
        collected += r.collectedAmount;
        incentive += Math.round((r.collectedAmount * incentivePct) / 100);
      }
    }
    return { calls, connected, leads, bookings, collected, incentive };
  }, [filteredRows, incentivePct]);

  const overallConnectPct = totals.calls === 0 ? 0 : Math.round((totals.connected / totals.calls) * 100);
  const overallConvPct = totals.connected === 0 ? 0 : Math.round((totals.bookings / totals.connected) * 100);

  const summaryRows = useMemo(() => {
    if (format === 'summary_telecaller') return summarise(filteredRows, 'telecaller', incentivePct);
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName', incentivePct);
    return [];
  }, [filteredRows, format, incentivePct]);

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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Telecaller</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All telecallers"
              value={telecaller} onChange={(v: string | undefined) => { setTelecaller(v); setPage(1); }}
              options={telecallerOptions} allowClear showSearch optionFilterProp="label" />
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
                { value: 'summary_telecaller', label: 'Summary — by Telecaller' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
                { value: 'detailed', label: 'Detailed (call-by-call)' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 1450 }}
            locale={{ emptyText: <Empty description="No telecaller activity matches the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{totals.calls}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.status.success }}>{totals.connected}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left">{totals.leads > 0 ? <strong style={{ color: colors.status.info }}>{totals.leads}</strong> : '—'}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left"><strong style={{ color: colors.status.success }}>{totals.bookings}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="left"><strong style={{ color: colors.status.success }}>{formatMoney(totals.collected)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="left"><strong style={{ color: colors.gold.primary }}>{formatMoney(totals.incentive)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="left"><strong>{overallConnectPct}%</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="left"><strong>{overallConvPct}%</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<TelecallerIncentiveRow> rowKey="key" loading={branchesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 1830 }}
            locale={{ emptyText: <Empty description="No telecaller calls match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={8}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {totals.calls} call{totals.calls === 1 ? '' : 's'} · {totals.bookings} booked · {incentivePct}% incentive
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="left"><strong>{filteredRows.reduce((s, r) => s + r.durationMins, 0)} mins</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="left"><strong style={{ color: colors.status.success }}>{formatMoney(totals.collected)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="left"><strong style={{ color: colors.gold.primary }}>{formatMoney(totals.incentive)}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
