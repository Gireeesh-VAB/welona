'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilterOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  CAMPAIGN_AUDIENCES,
  MESSAGE_CAMPAIGNS,
  type AudienceSegment,
  type CampaignStatus,
  type MessageCampaign,
  type MessageChannel,
  type Recurrence,
} from '@/lib/sample-data/message-scheduler';
import { DLT_TEMPLATES } from '@/lib/sample-data/sms-integration';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

type ReportFormat = 'detailed' | 'summary_status' | 'summary_channel';

type ScheduleType = 'now' | 'once' | 'recurring';

interface NewCampaignForm {
  name: string;
  channel: MessageChannel;
  templateKey: string;
  audience: AudienceSegment;
  branchId?: string;
  scheduleType: ScheduleType;
  scheduledAt?: Dayjs;
  recurrence: Recurrence;
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

export default function AdminMessageSchedulerPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();
  const navItem = getAdminNavItem('admin-scheduler')!;

  // ---- Data state ----
  const [campaigns, setCampaigns] = useState<MessageCampaign[]>(MESSAGE_CAMPAIGNS);

  // ---- Filter state ----
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [channel, setChannel] = useState<MessageChannel | undefined>(undefined);
  const [status, setStatus] = useState<CampaignStatus | undefined>(undefined);
  const [format, setFormat] = useState<ReportFormat>('detailed');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // ---- New campaign modal ----
  const [modalOpen, setModalOpen] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<MessageCampaign | null>(null);
  const [form] = Form.useForm<NewCampaignForm>();
  const [scheduleType, setScheduleType] = useState<ScheduleType>('once');
  const [selectedAudience, setSelectedAudience] = useState<AudienceSegment | undefined>(undefined);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(() => (branchesData?.items ?? []).map((b) => ({
    value: b.id, label: `${b.branchName} (${b.branchCode})`, name: b.branchName,
  })), [branchesData]);

  // ---- Filtered + paginated ----
  const filteredRows = useMemo(() => {
    const [from, to] = dateRange ?? [];
    return campaigns.filter((r) => {
      if (channel && r.channel !== channel) return false;
      if (status && r.status !== status) return false;
      if (from && dayjs(r.scheduledAt).isBefore(from.startOf('day'))) return false;
      if (to && dayjs(r.scheduledAt).isAfter(to.endOf('day'))) return false;
      return true;
    });
  }, [campaigns, channel, status, dateRange]);

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const counts = { scheduled: 0, running: 0, completed: 0, failed: 0, total: 0, totalDelivered: 0, totalAudience: 0 };
    for (const c of campaigns) {
      counts.total += 1;
      counts.totalAudience += c.audienceSize;
      counts.totalDelivered += c.delivered;
      if (c.status === 'Scheduled') counts.scheduled += 1;
      else if (c.status === 'Running') counts.running += 1;
      else if (c.status === 'Completed') counts.completed += 1;
      else if (c.status === 'Failed') counts.failed += 1;
    }
    return counts;
  }, [campaigns]);

  // ---- Resets ----
  const resetFilters = () => {
    setDateRange(null); setChannel(undefined); setStatus(undefined);
    setFormat('detailed'); setPage(1);
  };

  // ---- Status color ----
  const statusColor = (s: CampaignStatus): string => {
    if (s === 'Completed') return colors.status.success;
    if (s === 'Running') return colors.status.info;
    if (s === 'Scheduled') return colors.gold.primary;
    if (s === 'Paused') return colors.status.warning;
    if (s === 'Failed') return colors.status.error;
    return colors.text.placeholder;
  };

  const channelColor = (c: MessageChannel): string => {
    if (c === 'WhatsApp') return '#25D366';
    if (c === 'Both') return colors.gold.primary;
    return colors.status.info;
  };

  // ---- Campaign actions ----
  const pauseCampaign = (key: string) => {
    setCampaigns(campaigns.map((c) => c.key === key ? { ...c, status: 'Paused' as CampaignStatus } : c));
    message.success('Campaign paused');
  };
  const resumeCampaign = (key: string) => {
    setCampaigns(campaigns.map((c) => c.key === key ? { ...c, status: 'Scheduled' as CampaignStatus } : c));
    message.success('Campaign resumed');
  };
  const cancelCampaign = (key: string) => {
    setCampaigns(campaigns.map((c) => c.key === key ? { ...c, status: 'Cancelled' as CampaignStatus } : c));
    message.success('Campaign cancelled');
  };

  // ---- Create campaign ----
  const openNewCampaign = () => {
    form.resetFields();
    form.setFieldsValue({
      channel: 'SMS', audience: 'All Customers',
      scheduleType: 'once', recurrence: 'One-off',
      scheduledAt: dayjs().add(1, 'hour'),
    });
    setScheduleType('once');
    setSelectedAudience('All Customers');
    setModalOpen(true);
  };

  const onCreateCampaign = async () => {
    const values = await form.validateFields();
    const template = DLT_TEMPLATES.find((t) => t.key === values.templateKey);
    const branchName = values.branchId ? (branchOptions.find((b) => b.value === values.branchId)?.name ?? null) : null;
    const scheduled = values.scheduleType === 'now' ? dayjs() : (values.scheduledAt ?? dayjs().add(1, 'hour'));
    const audienceSize = Math.floor(50 + Math.random() * 2500);
    const newCampaign: MessageCampaign = {
      key: `CMP-${(campaigns.length + 1).toString().padStart(4, '0')}`,
      name: values.name.trim(),
      channel: values.channel,
      templateName: template?.name ?? 'Untitled',
      audience: values.audience,
      branchName,
      audienceSize,
      scheduledAt: scheduled.toISOString(),
      recurrence: values.scheduleType === 'recurring' ? values.recurrence : 'One-off',
      status: values.scheduleType === 'now' ? 'Running' : 'Scheduled',
      sent: 0, delivered: 0, failed: 0, pending: audienceSize,
      createdBy: 'Welona Super Admin',
      createdAt: new Date().toISOString(),
    };
    setCampaigns([newCampaign, ...campaigns]);
    setModalOpen(false);
    message.success(`Campaign "${newCampaign.name}" ${values.scheduleType === 'now' ? 'launched' : 'scheduled'}`);
  };

  const handleExport = () => {
    if (format === 'detailed') {
      const headers = ['Campaign','Channel','Template','Audience','Branch','Audience Size','Scheduled At','Recurrence','Status','Sent','Delivered','Failed','Pending','Created By','Created At'];
      const values = filteredRows.map((c) => [
        c.name, c.channel, c.templateName, c.audience, c.branchName ?? '',
        c.audienceSize, c.scheduledAt, c.recurrence, c.status,
        c.sent, c.delivered, c.failed, c.pending, c.createdBy, c.createdAt,
      ]);
      downloadCsv(`message-campaigns-${dayjs().format('YYYY-MM-DD')}.csv`, rowsToCsv(headers, values));
    }
  };

  // ---- Table columns ----
  const detailedColumns: ColumnsType<MessageCampaign> = [
    {
      title: 'Campaign', dataIndex: 'name', width: 260, fixed: 'left',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
            Template: <Text style={{ color: colors.gold.primary }}>{row.templateName}</Text>
          </Text>
        </div>
      ),
    },
    {
      title: 'Channel', dataIndex: 'channel', width: 120,
      render: (v: MessageChannel) => (
        <Tag style={{ background: channelColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    {
      title: 'Audience', dataIndex: 'audience', width: 200,
      render: (v: AudienceSegment, row) => (
        <div>
          <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{v}</Tag>
          {row.branchName && (
            <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block', marginTop: 4 }}>
              @ {row.branchName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Audience Size', dataIndex: 'audienceSize', width: 130, align: 'left',
      sorter: (a, b) => a.audienceSize - b.audienceSize,
      render: (v: number) => <strong style={{ color: colors.text.primary }}>{v.toLocaleString('en-IN')}</strong>,
    },
    {
      title: 'Scheduled At', dataIndex: 'scheduledAt', width: 170,
      sorter: (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      defaultSortOrder: 'descend',
      render: (v: string) => (
        <div>
          <div style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{dayjs(v).format('hh:mm A')}</Text>
        </div>
      ),
    },
    {
      title: 'Recurrence', dataIndex: 'recurrence', width: 130,
      render: (v: Recurrence) => v === 'One-off'
        ? <Text style={{ color: colors.text.placeholder }}>{v}</Text>
        : <Tag style={{ background: colors.gold.primary, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>,
    },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (v: CampaignStatus) => (
        <Tag style={{ background: statusColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    {
      title: 'Delivery', key: 'delivery', width: 260,
      render: (_, row) => {
        const total = row.sent + row.pending;
        if (total === 0) {
          return <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Not started</Text>;
        }
        const deliveredPct = Math.round((row.delivered / total) * 100);
        const failedPct = Math.round((row.failed / total) * 100);
        return (
          <div>
            <Progress
              percent={deliveredPct + failedPct}
              success={{ percent: deliveredPct, strokeColor: colors.status.success }}
              strokeColor={colors.status.error}
              trailColor={colors.black.tertiary}
              showInfo={false}
              size="small"
            />
            <Space size={6} style={{ marginTop: 4, fontSize: 11 }} wrap>
              <Text style={{ color: colors.status.success }}>✓ {row.delivered}</Text>
              {row.failed > 0 && <Text style={{ color: colors.status.error }}>✗ {row.failed}</Text>}
              {row.pending > 0 && <Text style={{ color: colors.text.placeholder }}>⏳ {row.pending}</Text>}
            </Space>
          </div>
        );
      },
    },
    {
      title: 'Created By', dataIndex: 'createdBy', width: 180,
      render: (v: string, row) => (
        <div>
          <Text style={{ color: colors.text.primary, fontSize: 13 }}>{v}</Text>
          <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block' }}>
            {dayjs(row.createdAt).format('DD-MM-YYYY')}
          </Text>
        </div>
      ),
    },
    {
      title: '', key: 'actions', width: 140, fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="Preview">
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setPreviewCampaign(row)} />
          </Tooltip>
          {(row.status === 'Scheduled' || row.status === 'Running') && (
            <Tooltip title="Pause">
              <Button size="small" type="text" icon={<PauseCircleOutlined />} onClick={() => pauseCampaign(row.key)} />
            </Tooltip>
          )}
          {row.status === 'Paused' && (
            <Tooltip title="Resume">
              <Button size="small" type="text" icon={<PlayCircleOutlined />} onClick={() => resumeCampaign(row.key)} />
            </Tooltip>
          )}
          {(row.status === 'Scheduled' || row.status === 'Paused') && (
            <Popconfirm title={`Cancel "${row.name}"?`} okText="Cancel campaign"
              okButtonProps={{ danger: true }} onConfirm={() => cancelCampaign(row.key)}>
              <Tooltip title="Cancel">
                <Button size="small" danger type="text" icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: filteredRows.length,
    showSizeChanger: true, pageSizeOptions: [10, 15, 25, 50],
    onChange: (next, size) => { setPage(next); if (size !== limit) setLimit(size); },
    showTotal: (total, range) => `${range[0]} - ${range[1]} of ${total} campaign${total === 1 ? '' : 's'}`,
  };

  // ---- Group summaries ----
  const groupedByStatus = useMemo(() => {
    const map = new Map<string, { group: string; campaigns: number; audienceSize: number; delivered: number; failed: number }>();
    for (const c of filteredRows) {
      const k = c.status;
      const e = map.get(k) ?? { group: k, campaigns: 0, audienceSize: 0, delivered: 0, failed: 0 };
      e.campaigns += 1;
      e.audienceSize += c.audienceSize;
      e.delivered += c.delivered;
      e.failed += c.failed;
      map.set(k, e);
    }
    return Array.from(map.values());
  }, [filteredRows]);

  const groupedByChannel = useMemo(() => {
    const map = new Map<string, { group: string; campaigns: number; audienceSize: number; delivered: number; failed: number }>();
    for (const c of filteredRows) {
      const k = c.channel;
      const e = map.get(k) ?? { group: k, campaigns: 0, audienceSize: 0, delivered: 0, failed: 0 };
      e.campaigns += 1;
      e.audienceSize += c.audienceSize;
      e.delivered += c.delivered;
      e.failed += c.failed;
      map.set(k, e);
    }
    return Array.from(map.values());
  }, [filteredRows]);

  const selectedTemplates = useMemo(() => DLT_TEMPLATES.filter((t) => t.status === 'Approved'), []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>Reset</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={filteredRows.length === 0}>Export CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewCampaign}>New Campaign</Button>
        </Space>
      </div>

      {/* KPI cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Scheduled</Text>}
              value={kpis.scheduled}
              prefix={<ClockCircleOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.gold.primary, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Running</Text>}
              value={kpis.running}
              prefix={<ThunderboltOutlined style={{ color: colors.status.info }} />}
              valueStyle={{ color: colors.status.info, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Completed</Text>}
              value={kpis.completed}
              prefix={<CheckCircleOutlined style={{ color: colors.status.success }} />}
              valueStyle={{ color: colors.status.success, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Failed</Text>}
              value={kpis.failed}
              prefix={<CloseCircleOutlined style={{ color: colors.status.error }} />}
              valueStyle={{ color: colors.status.error, fontSize: 24 }} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FilterOutlined style={{ color: colors.gold.primary }} />
          <Text strong style={{ color: colors.text.primary }}>Filters</Text>
        </div>
        <Row gutter={[12, 12]} justify="start">
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Scheduled Date Range</Text>
            <RangePicker style={{ width: '100%', marginTop: 4 }} value={dateRange ?? undefined}
              onChange={(r) => { setDateRange(r && r[0] && r[1] ? [r[0], r[1]] : null); setPage(1); }}
              format="DD-MM-YYYY" allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Channel</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All channels" value={channel}
              onChange={(v: MessageChannel | undefined) => { setChannel(v); setPage(1); }}
              options={[
                { value: 'SMS', label: 'SMS' },
                { value: 'WhatsApp', label: 'WhatsApp' },
                { value: 'Both', label: 'Both' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Status</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="All statuses" value={status}
              onChange={(v: CampaignStatus | undefined) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'Scheduled', label: 'Scheduled' },
                { value: 'Running', label: 'Running' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Paused', label: 'Paused' },
                { value: 'Failed', label: 'Failed' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]} allowClear />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>View</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={format}
              onChange={(v: ReportFormat) => { setFormat(v); setPage(1); }}
              options={[
                { value: 'detailed', label: 'Detailed campaigns' },
                { value: 'summary_status', label: 'Summary — by Status' },
                { value: 'summary_channel', label: 'Summary — by Channel' },
              ]} />
          </Col>
        </Row>
      </Card>

      {/* Campaigns / Summary */}
      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        {format === 'detailed' ? (
          <Table<MessageCampaign> rowKey="key" columns={detailedColumns} dataSource={filteredRows}
            pagination={pagination} size="middle" scroll={{ x: 1900 }} loading={branchesLoading}
            locale={{ emptyText: <Empty description="No campaigns match the selected filters" /> }} />
        ) : (
          <Table
            rowKey="group"
            dataSource={format === 'summary_status' ? groupedByStatus : groupedByChannel}
            columns={[
              {
                title: format === 'summary_status' ? 'Status' : 'Channel',
                dataIndex: 'group', width: 220,
                render: (v: string) => format === 'summary_status'
                  ? <Tag style={{ background: statusColor(v as CampaignStatus), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
                  : <Tag style={{ background: channelColor(v as MessageChannel), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>,
              },
              { title: 'Campaigns', dataIndex: 'campaigns', width: 140, align: 'left',
                render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v}</strong> },
              { title: 'Audience Reach', dataIndex: 'audienceSize', width: 160, align: 'left',
                render: (v: number) => <strong>{v.toLocaleString('en-IN')}</strong> },
              { title: 'Delivered', dataIndex: 'delivered', width: 160, align: 'left',
                render: (v: number) => <strong style={{ color: colors.status.success }}>{v.toLocaleString('en-IN')}</strong> },
              { title: 'Failed', dataIndex: 'failed', width: 130, align: 'left',
                render: (v: number) => v > 0 ? <strong style={{ color: colors.status.error }}>{v.toLocaleString('en-IN')}</strong> : '—' },
            ]}
            pagination={false} size="middle" scroll={{ x: 800 }}
            locale={{ emptyText: <Empty description="Nothing to summarise" /> }}
          />
        )}
      </Card>

      {/* New Campaign modal */}
      <Modal
        title="Schedule a New Campaign"
        open={modalOpen}
        onOk={onCreateCampaign}
        onCancel={() => setModalOpen(false)}
        okText="Schedule Campaign"
        width={720}
        destroyOnClose
      >
        <Form<NewCampaignForm> form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="name" label="Campaign Name" rules={[{ required: true, max: 80 }]}>
                <Input placeholder="e.g. May Festive Skin Offer" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="channel" label="Channel" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'SMS', label: 'SMS' },
                  { value: 'WhatsApp', label: 'WhatsApp' },
                  { value: 'Both', label: 'Both' },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="templateKey" label="DLT Template" rules={[{ required: true }]}
                extra="Only approved templates can be used.">
                <Select showSearch optionFilterProp="label"
                  options={selectedTemplates.map((t) => ({
                    value: t.key, label: `${t.name} · ${t.type} · ${t.channel}`,
                  }))} placeholder="Pick an approved template" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="audience" label="Audience Segment" rules={[{ required: true }]}>
                <Select
                  options={CAMPAIGN_AUDIENCES.map((a) => ({ value: a, label: a }))}
                  onChange={(v: AudienceSegment) => setSelectedAudience(v)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="branchId" label="Branch"
                rules={[{ required: selectedAudience === 'Specific Branch', message: 'Pick a branch' }]}>
                <Select
                  loading={branchesLoading}
                  placeholder={selectedAudience === 'Specific Branch' ? 'Required' : 'Optional override'}
                  options={branchOptions} allowClear showSearch optionFilterProp="label"
                  disabled={selectedAudience !== 'Specific Branch'}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="scheduleType" label="Schedule">
                <Radio.Group onChange={(e) => setScheduleType(e.target.value)} buttonStyle="solid">
                  <Radio.Button value="now"><ThunderboltOutlined /> Send Now</Radio.Button>
                  <Radio.Button value="once"><CalendarOutlined /> Schedule Once</Radio.Button>
                  <Radio.Button value="recurring"><ReloadOutlined /> Recurring</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            {scheduleType !== 'now' ? (
              <Col xs={24} md={12}>
                <Form.Item name="scheduledAt" label="Date & Time"
                  rules={[{ required: true, message: 'Pick when to send' }]}>
                  <DatePicker showTime format="DD-MM-YYYY hh:mm A" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ) : null}
            {scheduleType === 'recurring' && (
              <Col xs={24} md={12}>
                <Form.Item name="recurrence" label="Recurrence" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 'Daily', label: 'Daily' },
                    { value: 'Weekly', label: 'Weekly' },
                    { value: 'Monthly', label: 'Monthly' },
                  ]} />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Paragraph style={{ color: colors.text.placeholder, fontSize: 12, marginBottom: 0 }}>
            Audience size is estimated from the segment definition. The actual recipient list is locked at send time so
            opt-outs (DND / unsubscribed) and dormant numbers are excluded automatically.
          </Paragraph>
        </Form>
      </Modal>

      {/* Campaign preview */}
      <Modal
        title={previewCampaign?.name}
        open={previewCampaign !== null}
        footer={<Button onClick={() => setPreviewCampaign(null)}>Close</Button>}
        onCancel={() => setPreviewCampaign(null)}
        width={620}
      >
        {previewCampaign && (
          <div>
            <Space size={6} wrap style={{ marginBottom: 12 }}>
              <Tag style={{ background: statusColor(previewCampaign.status), color: '#FFFFFF', border: 'none', fontWeight: 600 }}>{previewCampaign.status}</Tag>
              <Tag style={{ background: channelColor(previewCampaign.channel), color: '#FFFFFF', border: 'none', fontWeight: 600 }}>{previewCampaign.channel}</Tag>
              <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none' }}>{previewCampaign.audience}</Tag>
              {previewCampaign.recurrence !== 'One-off' && (
                <Tag style={{ background: colors.gold.primary, color: '#FFFFFF', border: 'none', fontWeight: 600 }}>{previewCampaign.recurrence}</Tag>
              )}
            </Space>

            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Template</Text>
                <div style={{ color: colors.gold.primary, fontWeight: 600 }}>{previewCampaign.templateName}</div>
              </Col>
              <Col span={12}>
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Scheduled at</Text>
                <div style={{ color: colors.text.primary }}>{dayjs(previewCampaign.scheduledAt).format('DD-MM-YYYY hh:mm A')}</div>
              </Col>
              <Col span={12}>
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Audience size</Text>
                <div style={{ color: colors.text.primary, fontWeight: 600 }}>{previewCampaign.audienceSize.toLocaleString('en-IN')} contacts</div>
              </Col>
              <Col span={12}>
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Created by</Text>
                <div style={{ color: colors.text.primary }}>{previewCampaign.createdBy}</div>
              </Col>
            </Row>

            <Card size="small" title="Delivery Stats"
              style={{ background: colors.black.tertiary, border: `1px solid ${colors.border}` }}>
              <Row gutter={16}>
                <Col span={6}><Statistic title="Sent"      value={previewCampaign.sent}      valueStyle={{ color: colors.text.primary, fontSize: 18 }} /></Col>
                <Col span={6}><Statistic title="Delivered" value={previewCampaign.delivered} valueStyle={{ color: colors.status.success, fontSize: 18 }} /></Col>
                <Col span={6}><Statistic title="Failed"    value={previewCampaign.failed}    valueStyle={{ color: colors.status.error, fontSize: 18 }} /></Col>
                <Col span={6}><Statistic title="Pending"   value={previewCampaign.pending}   valueStyle={{ color: colors.text.placeholder, fontSize: 18 }} /></Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
