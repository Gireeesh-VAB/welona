'use client';

import { useMemo, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Empty, Row, Select, Space, Table, Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  LEAD_TRANSFER_ROWS,
  type LeadTransferRow,
} from '@/lib/sample-data/lead-transfer';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_branch';

interface SummaryRow {
  key: string;
  group: string;
  transfers: number;
}

function summarise(rows: LeadTransferRow[]): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const existing = map.get(r.fromBranch) ?? { key: r.fromBranch, group: r.fromBranch, transfers: 0 };
    existing.transfers += 1;
    map.set(r.fromBranch, existing);
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
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export default function AdminLeadTransferPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-cm-lead-transfer')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
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
    return LEAD_TRANSFER_ROWS.filter((r) => {
      if (branchName && r.fromBranch !== branchName) return false;
      if (from && dayjs(r.transferDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.transferDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null); setBranchId(undefined);
    setFormat('detailed'); setPage(1);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['S No', 'Client Name', 'MobileNo', 'From Branch', 'Remarks'];
      const values = filteredRows.map((r, i) => [
        i + 1, r.clientName, r.mobileNumber, r.fromBranch, r.remarks,
      ]);
      downloadCsv(`lead-transfer-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const summary = summarise(filteredRows);
    const headers = ['From Branch', 'Transfers'];
    const values = summary.map((s) => [s.group, s.transfers]);
    downloadCsv(`lead-transfer-summary-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
  };

  const textCell = (v: string | null | undefined) =>
    v ? <span style={{ color: colors.text.primary }}>{v}</span>
      : <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const detailedColumns: ColumnsType<LeadTransferRow> = useMemo(() => [
    {
      title: 'S.No', key: 'sno', width: 80, fixed: 'left',
      render: (_: unknown, __: LeadTransferRow, idx: number) => (page - 1) * limit + idx + 1,
    },
    {
      title: 'Client Name', dataIndex: 'clientName', width: 220, fixed: 'left',
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.mobileNumber}</Text>
        </div>
      ),
    },
    { title: 'MobileNo', dataIndex: 'mobileNumber', width: 170, render: textCell },
    {
      title: 'From Branch', dataIndex: 'fromBranch', width: 200,
      sorter: (a, b) => a.fromBranch.localeCompare(b.fromBranch),
      render: (v: string) => <span style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Remarks', dataIndex: 'remarks', width: 360, render: textCell },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [page, limit, colors.text.primary, colors.text.placeholder, colors.gold.primary]);

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => [
    {
      title: 'From Branch', dataIndex: 'group', width: 280, fixed: 'left',
      sorter: (a, b) => a.group.localeCompare(b.group),
      render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
    },
    {
      title: 'Transfers', dataIndex: 'transfers', width: 140, align: 'left',
      sorter: (a, b) => a.transfers - b.transfers,
      render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v}</strong>,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [colors.text.primary, colors.gold.primary]);

  const summaryRows = useMemo(() => format === 'summary_branch' ? summarise(filteredRows) : [], [filteredRows, format]);

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} lead${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Transfer Date Range</Text>
            <RangePicker style={{ width: '100%', marginTop: 4 }} value={dateRange ?? undefined}
              onChange={(r) => { setDateRange(r && r[0] && r[1] ? [r[0], r[1]] : null); setPage(1); }}
              format="DD-MM-YYYY" allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>From Branch</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading} value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }}
              options={branchOptions} allowClear showSearch optionFilterProp="label" />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Report Format</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed (line-by-line)' },
                { value: 'summary_branch', label: 'Summary — by From Branch' },
              ]} />
          </Col>
        </Row>
      </Card>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {isSummary ? (
          <Table<SummaryRow> rowKey="key" loading={branchesLoading}
            columns={summaryColumns} dataSource={summaryRows} pagination={false}
            size="middle" scroll={{ x: 420 }}
            locale={{ emptyText: <Empty description="No transfers match the selected filters" /> }}
            summary={() => summaryRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0}><strong style={{ color: colors.gold.primary }}>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="left"><strong>{filteredRows.length}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        ) : (
          <Table<LeadTransferRow> rowKey="key" loading={branchesLoading}
            columns={detailedColumns} dataSource={filteredRows} pagination={pagination}
            size="middle" scroll={{ x: 1030 }}
            locale={{ emptyText: <Empty description="No lead transfers match the selected filters" /> }}
            summary={() => filteredRows.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: colors.black.primary }}>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    <strong style={{ color: colors.gold.primary }}>
                      Total — {filteredRows.length} lead{filteredRows.length === 1 ? '' : 's'} transferred
                    </strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null} />
        )}
      </Card>
    </div>
  );
}
