'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  CLIENT_MEDICAL_ROWS,
  type ClientMedicalRow,
} from '@/lib/sample-data/client-medical';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_branch' | 'summary_disease' | 'summary_category';

interface SummaryRow {
  key: string;
  group: string;
  patients: number;
}

function summarise(
  rows: ClientMedicalRow[],
  by: 'branchName' | 'disease' | 'category',
): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const r of rows) {
    const group = r[by];
    const existing = map.get(group) ?? { key: group, group, patients: 0 };
    existing.patients += 1;
    map.set(group, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.patients - a.patients);
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

export default function AdminClientMedicalPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-services-client-medical')!;

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  const [category, setCategory] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

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
    const branchName = branchOptions.find((b) => b.value === branchId)?.name;
    const [from, to] = dateRange ?? [];
    return CLIENT_MEDICAL_ROWS.filter((r) => {
      if (branchName && r.branchName !== branchName) return false;
      if (category && r.category !== category) return false;
      if (from && dayjs(r.receiptDate).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.receiptDate).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [branchId, category, dateRange, branchOptions]);

  const resetFilters = () => {
    setDateRange(null);
    setBranchId(undefined);
    setCategory(undefined);
    setFormat('detailed');
    setPage(1);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = [
        'S No', 'Branch Name', 'Client Name', 'Mobile No', 'Disease', 'Reason', 'C.FromNo',
      ];
      const values = filteredRows.map((r, i) => [
        i + 1, r.branchName, r.clientName, r.mobileNumber, r.disease, r.reason, r.caseFromNo,
      ]);
      downloadCsv(`client-medical-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
      return;
    }
    const by =
      format === 'summary_branch'
        ? 'branchName'
        : format === 'summary_disease'
          ? 'disease'
          : 'category';
    const groupLabel =
      format === 'summary_branch'
        ? 'Branch'
        : format === 'summary_disease'
          ? 'Disease'
          : 'Category';
    const summary = summarise(filteredRows, by);
    const headers = [groupLabel, 'Patients'];
    const values = summary.map((s) => [s.group, s.patients]);
    downloadCsv(
      `client-medical-${format}-${dayjs().format('YYYY-MM-DD')}.csv`,
      rowsToCsv(headers, values),
    );
  };

  const textCell = (value: string | null | undefined) =>
    value ? (
      <span style={{ color: colors.text.primary }}>{value}</span>
    ) : (
      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
    );

  const detailedColumns: ColumnsType<ClientMedicalRow> = useMemo(
    () => [
      {
        title: 'S No',
        key: 'sno',
        width: 70,
        fixed: 'left',
        render: (_: unknown, __: ClientMedicalRow, idx: number) =>
          (page - 1) * limit + idx + 1,
      },
      {
        title: 'BranchName',
        dataIndex: 'branchName',
        width: 180,
        sorter: (a, b) => a.branchName.localeCompare(b.branchName),
        render: textCell,
      },
      {
        title: 'Client Name',
        dataIndex: 'clientName',
        width: 220,
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
        title: 'Mobile No',
        dataIndex: 'mobileNumber',
        width: 150,
        render: textCell,
      },
      {
        title: 'Disease',
        dataIndex: 'disease',
        width: 220,
        sorter: (a, b) => a.disease.localeCompare(b.disease),
        render: (v: string) => (
          <Tag
            style={{
              background: colors.gold.primary,
              color: colors.text.onGold,
              border: 'none',
              fontWeight: 600,
              padding: '2px 10px',
              margin: 0,
            }}
          >
            {v}
          </Tag>
        ),
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        width: 400,
        render: textCell,
      },
      {
        title: 'C.FromNo',
        dataIndex: 'caseFromNo',
        width: 150,
        fixed: 'right',
        render: (v: string) => (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, colors.text.primary, colors.text.placeholder, colors.text.onGold],
  );

  const summaryColumns: ColumnsType<SummaryRow> = useMemo(() => {
    const groupLabel =
      format === 'summary_branch'
        ? 'Branch'
        : format === 'summary_disease'
          ? 'Disease'
          : 'Category';
    return [
      {
        title: groupLabel,
        dataIndex: 'group',
        width: 280,
        fixed: 'left',
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (v: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>
        ),
      },
      {
        title: 'Patients',
        dataIndex: 'patients',
        width: 140,
        align: 'left',
        sorter: (a, b) => a.patients - b.patients,
        render: (v: number) => (
          <strong style={{ color: colors.gold.primary }}>{v}</strong>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, colors.text.primary, colors.gold.primary]);

  const summaryRows = useMemo(() => {
    if (format === 'summary_branch') return summarise(filteredRows, 'branchName');
    if (format === 'summary_disease') return summarise(filteredRows, 'disease');
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
      `${range[0]} - ${range[1]} of ${total} record${total === 1 ? '' : 's'}`,
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Visit Date Range</Text>
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
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Branch</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading}
              value={branchId}
              onChange={(v) => {
                setBranchId(v);
                setPage(1);
              }}
              options={branchOptions}
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
                { value: 'summary_disease', label: 'Summary — by Disease' },
                { value: 'summary_branch', label: 'Summary — by Branch' },
                { value: 'summary_category', label: 'Summary — by Category' },
              ]}
            />
          </Col>
        </Row>
      </Card>

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
            scroll={{ x: 480 }}
            locale={{ emptyText: <Empty description="No medical records match the selected filters" /> }}
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
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        ) : (
          <Table<ClientMedicalRow>
            rowKey="key"
            loading={branchesLoading || categoriesLoading}
            columns={detailedColumns}
            dataSource={filteredRows}
            pagination={pagination}
            size="middle"
            scroll={{ x: 1400 }}
            locale={{ emptyText: <Empty description="No medical records match the selected filters" /> }}
            summary={() =>
              filteredRows.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: colors.black.primary }}>
                    <Table.Summary.Cell index={0} colSpan={7}>
                      <strong style={{ color: colors.gold.primary }}>
                        Total — {filteredRows.length} record{filteredRows.length === 1 ? '' : 's'}
                      </strong>
                    </Table.Summary.Cell>
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
