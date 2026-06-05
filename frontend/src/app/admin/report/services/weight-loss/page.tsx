'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Empty, Row, Select, Space, Table, Tag, Typography,
} from 'antd';
import { ArrowDownOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  WEIGHT_LOSS_ROWS,
  type WeightLossRow,
  type WeightLossStatus,
} from '@/lib/sample-data/weight-loss';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_status' | 'summary_branch' | 'summary_programme';

interface SummaryRow {
  key: string;
  group: string;
  clients: number;
  totalLossKg: number;
  avgLossKg: number;
  avgLossPct: number;
}

function summarise(
  rows: WeightLossRow[],
  by: 'branchName' | 'status' | 'programme',
): SummaryRow[] {
  const map = new Map<string, SummaryRow & { _pctTotal: number }>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? {
      key: group, group, clients: 0, totalLossKg: 0, avgLossKg: 0, avgLossPct: 0, _pctTotal: 0,
    };
    existing.clients += 1;
    existing.totalLossKg = +(existing.totalLossKg + r.weightLossKg).toFixed(1);
    existing._pctTotal += r.lossPct;
    map.set(group, existing);
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    avgLossKg: s.clients === 0 ? 0 : +(s.totalLossKg / s.clients).toFixed(1),
    avgLossPct: s.clients === 0 ? 0 : +(s._pctTotal / s.clients).toFixed(1),
  })).sort((a, b) => b.totalLossKg - a.totalLossKg);
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

export default function AdminWeightLossPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-services-weight-loss')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  const [status, setStatus] = useState<WeightLossStatus | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);

  const filteredRows = useMemo(() => {
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return WEIGHT_LOSS_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (status && r.status !== status) return false;
      if (from && dayjs(r.startDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.startDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, status, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined);
    setStatus(undefined); setFormat('detailed'); setPage(1);
  };

  const statusColor = (s: WeightLossStatus): string => {
    if (s === 'Achieved') return colors.status.success;
    if (s === 'On Track') return colors.status.info;
    if (s === 'Dropped') return colors.status.error;
    return colors.status.warning;
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No','Client','Mobile','Branch','Programme','Start Date','Start (kg)','Current (kg)','Loss (kg)','Loss %','Target (kg)','Status'];
      const values = filteredRows.map((r, i) => [
        i + 1, r.clientName, r.mobileNumber, r.branchName, r.programme, r.startDate,
        r.startWeightKg, r.currentWeightKg, r.weightLossKg, r.lossPct, r.targetWeightKg, r.status,
      ]);
      downloadCsv(`weight-loss-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by = format === 'summary_branch' ? 'branchName' : format === 'summary_status' ? 'status' : 'programme';
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_status' ? 'Status' : 'Programme';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Clients', 'Total Loss (kg)', 'Avg Loss (kg)', 'Avg Loss %'];
    const values = summary.map((s) => [s.group, s.clients, s.totalLossKg, s.avgLossKg, s.avgLossPct]);
    downloadCsv(`weight-loss-${format}-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<WeightLossRow> = useMemo(() => [
    {
      title: 'S No', key: 'sno', width: 70, fixed: 'left',
      render: (_: unknown, __: WeightLossRow, idx: number) => (page - 1) * limit + idx + 1,
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
    { title: 'Programme', dataIndex: 'programme', width: 240,
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span> },
    {
      title: 'Start Date', dataIndex: 'startDate', width: 130,
      sorter: (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      render: (v: string) => textCell(dayjs(v).format('DD-MM-YYYY')),
    },
    { title: 'Start (kg)', dataIndex: 'startWeightKg', width: 120, align: 'left',
      render: (v: number) => <span style={{ color: colors.text.primary }}>{v.toFixed(1)}</span> },
    { title: 'Current (kg)', dataIndex: 'currentWeightKg', width: 130, align: 'left',
      sorter: (a, b) => a.currentWeightKg - b.currentWeightKg,
      render: (v: number) => <strong style={{ color: colors.text.primary }}>{v.toFixed(1)}</strong> },
    {
      title: 'Loss (kg)', dataIndex: 'weightLossKg', width: 130, align: 'left',
      sorter: (a, b) => a.weightLossKg - b.weightLossKg,
      render: (v: number) => v > 0 ? (
        <Space size={4}>
          <ArrowDownOutlined style={{ color: colors.status.success }} />
          <strong style={{ color: colors.status.success }}>{v.toFixed(1)} kg</strong>
        </Space>
      ) : <span style={{ color: colors.text.placeholder }}>—</span>,
    },
    {
      title: 'Loss %', dataIndex: 'lossPct', width: 110, align: 'left',
      sorter: (a, b) => a.lossPct - b.lossPct,
      render: (v: number) => v > 0 ? <strong style={{ color: colors.status.success }}>{v.toFixed(1)}%</strong> : '—',
    },
    { title: 'Target (kg)', dataIndex: 'targetWeightKg', width: 130, align: 'left',
      render: (v: number) => <span style={{ color: colors.text.placeholder }}>{v.toFixed(1)}</span> },
    {
      title: 'Status', dataIndex: 'status', width: 130, fixed: 'right',
      render: (v: WeightLossStatus) => (
        <Tag style={{ background: statusColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.status.success, colors.status.warning, colors.status.error, colors.status.info]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel = format === 'summary_branch' ? 'Branch' : format === 'summary_status' ? 'Status' : 'Programme';
    return [
      {
        title: groupLabel, dataIndex: 'group', width: 240, fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
      },
      { title: 'Clients', dataIndex: 'clients', width: 110, align: 'left' },
      { title: 'Total Loss (kg)', dataIndex: 'totalLossKg', width: 150, align: 'left',
        sorter: (a, b) => a.totalLossKg - b.totalLossKg,
        render: (v: number) => <strong style={{ color: colors.status.success }}>{v.toFixed(1)}</strong> },
      { title: 'Avg Loss (kg)', dataIndex: 'avgLossKg', width: 140, align: 'left',
        render: (v: number) => <strong>{v.toFixed(1)}</strong> },
      { title: 'Avg Loss %', dataIndex: 'avgLossPct', width: 140, align: 'left',
        render: (v: number) => <strong>{v.toFixed(1)}%</strong> },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.status.success]);

  const totals = useMemo(() => {
    const totalLoss = filteredRows.reduce((s, r) => s + r.weightLossKg, 0);
    const avgPct = filteredRows.length === 0 ? 0
      : filteredRows.reduce((s, r) => s + r.lossPct, 0) / filteredRows.length;
    return { totalLoss, avgPct };
  }, [filteredRows]);

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_status') return summarise(filteredRows, 'status');
    if (format === 'summary_programme') return summarise(filteredRows, 'programme');
    return [];
  }, [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} client${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Programme Start Date</Text>
            <RangePicker style={{ width: '100%', marginTop: 4 }} value={dateRange ?? undefined}
              onChange={(r) => { setDateRange(r && r[0] && r[1] ? [r[0], r[1]] : null); setPage(1); }}
              format="DD-MM-YYYY" allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Branch</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading} value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }}
              options={branchOptions} showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Status</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All statuses" value={status}
              onChange={(v: WeightLossStatus | undefined) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'On Track', label: 'On Track' },
                { value: 'Lagging', label: 'Lagging' },
                { value: 'Achieved', label: 'Achieved' },
                { value: 'Dropped', label: 'Dropped' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_status', label: 'Summary — by Status' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
                { value: 'summary_programme', label: 'Summary — by Programme' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 880 }}
            locale={{ emptyText: <Empty description="No programmes match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{filteredRows.length}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="left"><strong style={{ color: colors.status.success }}>{totals.totalLoss.toFixed(1)} kg</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="left">—</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="left"><strong>Avg {totals.avgPct.toFixed(1)}%</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<WeightLossRow> rowKey="key" loading={branchesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 2050 }}
            locale={{ emptyText: <Empty description="No weight-loss programmes match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={8}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} client{filteredRows.length === 1 ? '' : 's'}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="left"><strong style={{ color: colors.status.success }}>{totals.totalLoss.toFixed(1)} kg</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="left"><strong>Avg {totals.avgPct.toFixed(1)}%</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={10} colSpan={2} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
