'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  IdcardOutlined,
  KeyOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@/lib/format';
import {
  DEFAULT_GATEWAY,
  DLT_TEMPLATES,
  PROVIDER_OPTIONS,
  RECHARGE_HISTORY,
  SENDER_IDS,
  WALLET,
  type DltTemplate,
  type ProviderKey,
  type RechargeEntry,
  type SenderCategory,
  type SenderChannel,
  type SenderId,
  type SenderStatus,
  type SmsGatewayConfig,
  type TemplateStatus,
  type TemplateType,
} from '@/lib/sample-data/sms-integration';

const { Title, Text, Paragraph } = Typography;

interface NewSenderForm {
  senderId: string;
  channel: SenderChannel;
  category: SenderCategory;
  dltPrincipalEntityId: string;
}

export default function AdminSmsIntegrationPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();
  const navItem = getAdminNavItem('admin-sms')!;

  // ---- Gateway state ----
  const [gateway, setGateway] = useState<SmsGatewayConfig>(DEFAULT_GATEWAY);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [gatewayForm] = Form.useForm<SmsGatewayConfig>();

  // ---- Sender IDs state ----
  const [senders, setSenders] = useState<SenderId[]>(SENDER_IDS);
  const [senderModalOpen, setSenderModalOpen] = useState(false);
  const [senderForm] = Form.useForm<NewSenderForm>();

  // ---- Templates state ----
  const [templates] = useState<DltTemplate[]>(DLT_TEMPLATES);
  const [previewTemplate, setPreviewTemplate] = useState<DltTemplate | null>(null);

  // ---- Wallet recharge modal ----
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeForm] = Form.useForm<{ amount: number; method: string }>();

  // ---- Derived stats ----
  const activeSenders = useMemo(() => senders.filter((s) => s.status === 'Active').length, [senders]);
  const approvedTemplates = useMemo(() => templates.filter((t) => t.status === 'Approved').length, [templates]);
  const usagePct = WALLET.balanceCredits === 0
    ? 100
    : Math.min(100, Math.round((WALLET.usedThisMonth / (WALLET.balanceCredits + WALLET.usedThisMonth)) * 100));
  const isLowBalance = WALLET.balanceCredits <= WALLET.lowBalanceThreshold;

  // ---- Gateway actions ----
  const onGatewaySave = async () => {
    const values = await gatewayForm.validateFields();
    const providerInfo = PROVIDER_OPTIONS.find((p) => p.value === values.provider);
    setGateway({
      ...gateway,
      ...values,
      providerLabel: providerInfo?.label ?? gateway.providerLabel,
      baseUrl: providerInfo?.baseUrl ?? gateway.baseUrl,
    });
    message.success('Gateway settings saved');
  };

  const onTestConnection = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      setGateway({ ...gateway, isConnected: true, lastTestedAt: new Date().toISOString() });
      message.success(`Connected to ${gateway.providerLabel}`);
    }, 1200);
  };

  // ---- Sender ID actions ----
  const openAddSender = () => {
    senderForm.resetFields();
    senderForm.setFieldsValue({ channel: 'SMS', category: 'Transactional', dltPrincipalEntityId: '1701159274123456' });
    setSenderModalOpen(true);
  };

  const onAddSender = async () => {
    const values = await senderForm.validateFields();
    const newSender: SenderId = {
      key: `SID-${(senders.length + 1).toString().padStart(3, '0')}`,
      senderId: values.senderId.trim(),
      channel: values.channel,
      category: values.category,
      dltPrincipalEntityId: values.dltPrincipalEntityId.trim(),
      status: 'Pending Approval',
      registeredAt: dayjs().format('YYYY-MM-DD'),
      approvedAt: null,
    };
    setSenders([newSender, ...senders]);
    setSenderModalOpen(false);
    message.success(`Sender ID "${newSender.senderId}" submitted for approval`);
  };

  const removeSender = (key: string) => {
    setSenders(senders.filter((s) => s.key !== key));
    message.success('Sender ID removed');
  };

  // ---- Recharge ----
  const openRecharge = () => {
    rechargeForm.resetFields();
    rechargeForm.setFieldsValue({ amount: 5000, method: 'UPI' });
    setRechargeOpen(true);
  };

  const onRecharge = async () => {
    const values = await rechargeForm.validateFields();
    setRechargeOpen(false);
    message.success(`Recharge of ${formatMoney(values.amount * 100)} initiated via ${values.method}`);
  };

  // ---- Render helpers ----
  const senderStatusColor = (s: SenderStatus): string => {
    if (s === 'Active') return colors.status.success;
    if (s === 'Pending Approval') return colors.status.warning;
    return colors.status.error;
  };

  const templateStatusColor = (s: TemplateStatus): string => {
    if (s === 'Approved') return colors.status.success;
    if (s === 'Pending') return colors.status.warning;
    return colors.status.error;
  };

  const channelColor = (c: SenderChannel): string =>
    c === 'WhatsApp' ? '#25D366' : colors.status.info;

  const typeColor = (t: TemplateType): string => {
    if (t === 'Transactional') return colors.status.success;
    if (t === 'OTP') return colors.status.info;
    if (t === 'Promotional') return colors.gold.primary;
    return colors.status.warning;
  };

  // ---- Sender ID table ----
  const senderColumns: ColumnsType<SenderId> = [
    {
      title: 'Sender ID', dataIndex: 'senderId', width: 200,
      render: (v: string) => (
        <Space size={6}>
          <Text strong style={{ color: colors.text.primary, letterSpacing: 1 }}>{v}</Text>
          <Tooltip title="Copy">
            <Button size="small" type="text" icon={<CopyOutlined />}
              onClick={() => { navigator.clipboard.writeText(v); message.success('Copied'); }} />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Channel', dataIndex: 'channel', width: 120,
      render: (v: SenderChannel) => (
        <Tag style={{ background: channelColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Category', dataIndex: 'category', width: 170,
      render: (v: string) => <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{v}</Tag> },
    {
      title: 'DLT PE ID', dataIndex: 'dltPrincipalEntityId', width: 200,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Status', dataIndex: 'status', width: 170,
      render: (v: SenderStatus) => (
        <Tag style={{ background: senderStatusColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    {
      title: 'Registered', dataIndex: 'registeredAt', width: 130,
      render: (v: string) => dayjs(v).format('DD-MM-YYYY'),
    },
    {
      title: 'Approved', dataIndex: 'approvedAt', width: 130,
      render: (v: string | null) => v
        ? <span style={{ color: colors.status.success }}>{dayjs(v).format('DD-MM-YYYY')}</span>
        : <span style={{ color: colors.text.placeholder }}>—</span>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, row) => (
        <Popconfirm
          title={`Remove sender ID "${row.senderId}"?`}
          okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => removeSender(row.key)}
        >
          <Tooltip title="Remove">
            <Button size="small" danger type="text" icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  // ---- Templates table ----
  const templateColumns: ColumnsType<DltTemplate> = [
    {
      title: 'Template Name', dataIndex: 'name', width: 230, fixed: 'left',
      render: (v: string) => <span style={{ fontWeight: 600, color: colors.text.primary }}>{v}</span>,
    },
    {
      title: 'DLT Template ID', dataIndex: 'templateId', width: 220,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Type', dataIndex: 'type', width: 160,
      render: (v: TemplateType) => (
        <Tag style={{ background: typeColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    {
      title: 'Channel', dataIndex: 'channel', width: 120,
      render: (v: SenderChannel) => (
        <Tag style={{ background: channelColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    { title: 'Sender ID', dataIndex: 'senderId', width: 180,
      render: (v: string) => <Text style={{ color: colors.gold.primary, fontWeight: 600 }}>{v}</Text> },
    {
      title: 'Variables', dataIndex: 'variables', width: 200,
      render: (vs: string[]) => (
        <Space size={4} wrap>
          {vs.map((v) => (
            <Tag key={v} style={{ background: colors.black.tertiary, color: colors.text.primary, border: 'none', margin: 0 }}>{`{${v}}`}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', width: 120,
      render: (v: TemplateStatus) => (
        <Tag style={{ background: templateStatusColor(v), color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>
      ),
    },
    {
      title: '', key: 'actions', width: 120, fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="Preview">
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setPreviewTemplate(row)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" type="text" icon={<EditOutlined />} disabled />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ---- Wallet recharge history ----
  const rechargeColumns: ColumnsType<RechargeEntry> = [
    {
      title: 'Date & Time', dataIndex: 'rechargedAt', width: 180,
      sorter: (a, b) => new Date(a.rechargedAt).getTime() - new Date(b.rechargedAt).getTime(),
      defaultSortOrder: 'descend',
      render: (v: string) => (
        <div>
          <div style={{ color: colors.text.primary }}>{dayjs(v).format('DD-MM-YYYY')}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{dayjs(v).format('hh:mm A')}</Text>
        </div>
      ),
    },
    { title: 'Transaction Ref', dataIndex: 'transactionRef', width: 220,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Payment Method', dataIndex: 'paymentMethod', width: 160,
      render: (v: string) => <Tag style={{ background: colors.gold.primary, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag> },
    {
      title: 'Amount', dataIndex: 'amount', width: 150, align: 'left',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number) => <strong style={{ color: colors.text.primary }}>{formatMoney(v)}</strong>,
    },
    {
      title: 'Credits Added', dataIndex: 'credits', width: 150, align: 'left',
      render: (v: number) => <strong style={{ color: colors.gold.primary }}>{v.toLocaleString('en-IN')}</strong>,
    },
    { title: 'Recharged By', dataIndex: 'rechargedBy', width: 200 },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      render: (v: string) => {
        const color = v === 'Successful' ? colors.status.success : v === 'Failed' ? colors.status.error : colors.status.warning;
        return <Tag style={{ background: color, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}>{v}</Tag>;
      },
    },
  ];

  // ---- Tabs content ----
  const gatewayTab = (
    <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
      <Form<SmsGatewayConfig>
        form={gatewayForm} layout="vertical" requiredMark={false}
        initialValues={gateway}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="provider" label="SMS Provider" rules={[{ required: true }]}>
              <Select
                options={PROVIDER_OPTIONS}
                onChange={(value: ProviderKey) => {
                  const p = PROVIDER_OPTIONS.find((o) => o.value === value);
                  if (p) gatewayForm.setFieldsValue({ baseUrl: p.baseUrl });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="senderName" label="Default Sender Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. WELONA" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="baseUrl" label="API Base URL" rules={[{ required: true }]}>
              <Input prefix={<ApiOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="apiKey" label="API Key / Auth Token" rules={[{ required: true }]}>
              <Input.Password
                prefix={<KeyOutlined />}
                visibilityToggle={{ visible: apiKeyVisible, onVisibleChange: setApiKeyVisible }}
                placeholder="Paste the secret key issued by your provider"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="webhookUrl" label="Delivery Webhook URL">
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="inboundUrl" label="Inbound Message URL">
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
        </Row>

        <Space size="middle" wrap>
          <Button type="primary" icon={<SaveOutlined />} onClick={onGatewaySave}>Save Settings</Button>
          <Button icon={<ThunderboltOutlined />} loading={testing} onClick={onTestConnection}>Test Connection</Button>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
            Last tested: {dayjs(gateway.lastTestedAt).format('DD-MM-YYYY hh:mm A')}
          </Text>
        </Space>
      </Form>
    </Card>
  );

  const sendersTab = (
    <Card
      style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
      title={<Text strong style={{ color: colors.text.primary }}>Registered Sender IDs (DLT Headers)</Text>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddSender}>Register Sender ID</Button>
      }
    >
      <Paragraph style={{ color: colors.text.placeholder, fontSize: 13, marginBottom: 12 }}>
        Sender IDs (or &ldquo;headers&rdquo;) must be registered with DLT before they can be used.
        Indian telecom regulators require every commercial SMS to use an approved 6-character ID.
      </Paragraph>
      <Table<SenderId> rowKey="key" columns={senderColumns} dataSource={senders}
        pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
        size="middle" scroll={{ x: 1240 }} />
    </Card>
  );

  const templatesTab = (
    <Card
      style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
      title={<Text strong style={{ color: colors.text.primary }}>DLT-Approved Templates</Text>}
      extra={<Button type="primary" icon={<PlusOutlined />} disabled>Submit New Template</Button>}
    >
      <Paragraph style={{ color: colors.text.placeholder, fontSize: 13, marginBottom: 12 }}>
        Every message body must match a pre-approved template. Variables in <code>{'{braces}'}</code> are
        replaced at send time. Submitting a new template kicks off TRAI / operator approval.
      </Paragraph>
      <Table<DltTemplate> rowKey="key" columns={templateColumns} dataSource={templates}
        pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
        size="middle" scroll={{ x: 1500 }} />
    </Card>
  );

  const walletTab = (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={16}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Row gutter={24} align="middle">
              <Col xs={24} md={10}>
                <Text style={{ color: colors.text.placeholder }}>Wallet Balance</Text>
                <div style={{ marginTop: 4 }}>
                  <Text style={{ color: colors.gold.primary, fontSize: 36, fontWeight: 700 }}>
                    {WALLET.balanceCredits.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ color: colors.text.placeholder, marginLeft: 6 }}>credits</Text>
                </div>
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                  ≈ {formatMoney(WALLET.balanceCredits * WALLET.averageCostPerSms)} at avg {formatMoney(WALLET.averageCostPerSms)}/SMS
                </Text>
              </Col>
              <Col xs={24} md={14}>
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                  Used this month: <strong style={{ color: colors.text.primary }}>{WALLET.usedThisMonth.toLocaleString('en-IN')}</strong> credits
                </Text>
                <Progress
                  percent={usagePct}
                  strokeColor={isLowBalance ? colors.status.error : colors.gold.primary}
                  format={(p) => `${p}% used`}
                  style={{ marginTop: 8 }}
                />
                <Space style={{ marginTop: 8 }}>
                  <Button type="primary" icon={<WalletOutlined />} onClick={openRecharge}>Recharge Now</Button>
                  {isLowBalance && (
                    <Tag color="red" icon={<CloseCircleOutlined />}>Low balance</Tag>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title="Low-Balance Alert Threshold"
              value={WALLET.lowBalanceThreshold} suffix="credits"
              valueStyle={{ color: colors.text.primary }} />
            <Paragraph style={{ color: colors.text.placeholder, fontSize: 12, marginTop: 8, marginBottom: 0 }}>
              A notification fires when the balance drops below this threshold.
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        title={<Text strong style={{ color: colors.text.primary }}>Recharge History</Text>}>
        <Table<RechargeEntry> rowKey="key" columns={rechargeColumns} dataSource={RECHARGE_HISTORY}
          pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
          size="middle" scroll={{ x: 1200 }} />
      </Card>
    </>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Tag
          icon={gateway.isConnected ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          style={{
            background: gateway.isConnected ? colors.status.success : colors.status.error,
            color: '#FFFFFF', border: 'none', fontWeight: 600, padding: '4px 12px', fontSize: 13,
          }}
        >
          {gateway.isConnected ? 'Connected' : 'Disconnected'}
        </Tag>
      </div>

      {/* KPI cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Active Provider</Text>}
              value={gateway.providerLabel}
              prefix={<ApiOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary, fontSize: 20 }}
            />
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{gateway.baseUrl}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Sender IDs</Text>}
              value={activeSenders}
              suffix={`/ ${senders.length}`}
              prefix={<IdcardOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary, fontSize: 24 }}
            />
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>active / total registered</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>DLT Templates</Text>}
              value={approvedTemplates}
              suffix={`/ ${templates.length}`}
              prefix={<SafetyCertificateOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary, fontSize: 24 }}
            />
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>approved / total</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{
            background: isLowBalance ? colors.status.error : colors.black.secondary,
            border: `1px solid ${isLowBalance ? colors.status.error : colors.border}`,
          }}>
            <Statistic
              title={<Text style={{ color: isLowBalance ? '#FFFFFF' : colors.text.placeholder }}>Wallet Credits</Text>}
              value={WALLET.balanceCredits}
              prefix={<WalletOutlined style={{ color: isLowBalance ? '#FFFFFF' : colors.gold.primary }} />}
              valueStyle={{ color: isLowBalance ? '#FFFFFF' : colors.gold.primary, fontSize: 24 }}
            />
            <Text style={{ color: isLowBalance ? '#FFFFFF' : colors.text.placeholder, fontSize: 12 }}>
              {isLowBalance ? 'Low — recharge recommended' : `${WALLET.usedThisMonth.toLocaleString('en-IN')} used this month`}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="gateway"
        items={[
          { key: 'gateway',   label: <span><ApiOutlined /> Gateway Settings</span>,        children: gatewayTab },
          { key: 'senders',   label: <span><IdcardOutlined /> Sender IDs</span>,           children: sendersTab },
          { key: 'templates', label: <span><MessageOutlined /> DLT Templates</span>,        children: templatesTab },
          { key: 'wallet',    label: <span><WalletOutlined /> Wallet & Recharge</span>,    children: walletTab },
        ]}
      />

      {/* Add Sender ID modal */}
      <Modal
        title="Register New Sender ID"
        open={senderModalOpen}
        onOk={onAddSender}
        onCancel={() => setSenderModalOpen(false)}
        okText="Submit for Approval"
        destroyOnClose
      >
        <Form<NewSenderForm> form={senderForm} layout="vertical" preserve={false}>
          <Form.Item name="senderId" label="Sender ID (Header)"
            rules={[
              { required: true, message: 'Required' },
              { max: 11, message: 'Maximum 11 characters' },
            ]}
            extra="Must match the header registered with your DLT principal entity."
          >
            <Input placeholder="e.g. WELONA" maxLength={11} style={{ letterSpacing: 1 }} />
          </Form.Item>
          <Form.Item name="channel" label="Channel" rules={[{ required: true }]}>
            <Select options={[
              { value: 'SMS', label: 'SMS' },
              { value: 'WhatsApp', label: 'WhatsApp Business' },
            ]} />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Transactional',    label: 'Transactional' },
              { value: 'OTP',              label: 'OTP' },
              { value: 'Promotional',      label: 'Promotional' },
              { value: 'Service-Implicit', label: 'Service-Implicit' },
            ]} />
          </Form.Item>
          <Form.Item name="dltPrincipalEntityId" label="DLT Principal Entity ID"
            rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="1701159274XXXXXX" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Template preview modal */}
      <Modal
        title={previewTemplate?.name}
        open={previewTemplate !== null}
        footer={(
          <Button onClick={() => setPreviewTemplate(null)} icon={<ReloadOutlined />}>Close</Button>
        )}
        onCancel={() => setPreviewTemplate(null)}
        width={620}
      >
        {previewTemplate && (
          <div>
            <Space size={6} wrap style={{ marginBottom: 12 }}>
              <Tag style={{ background: typeColor(previewTemplate.type), color: '#FFFFFF', border: 'none', fontWeight: 600 }}>{previewTemplate.type}</Tag>
              <Tag style={{ background: channelColor(previewTemplate.channel), color: '#FFFFFF', border: 'none', fontWeight: 600 }}>{previewTemplate.channel}</Tag>
              <Tag style={{ background: templateStatusColor(previewTemplate.status), color: '#FFFFFF', border: 'none', fontWeight: 600 }}>{previewTemplate.status}</Tag>
            </Space>
            <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block', marginBottom: 8 }}>
              Sender ID: <Text strong style={{ color: colors.gold.primary }}>{previewTemplate.senderId}</Text>
              {' · '}
              Template ID: <Text code style={{ fontSize: 11 }}>{previewTemplate.templateId}</Text>
            </Text>
            <div style={{
              background: colors.black.tertiary, border: `1px solid ${colors.border}`,
              borderRadius: 8, padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap',
              color: colors.text.primary, fontSize: 14, lineHeight: 1.6,
            }}>
              {previewTemplate.body}
            </div>
            <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block', marginTop: 8 }}>
              Variables: {previewTemplate.variables.map((v) => `{${v}}`).join(', ')}
            </Text>
          </div>
        )}
      </Modal>

      {/* Recharge modal */}
      <Modal
        title="Recharge SMS Wallet"
        open={rechargeOpen}
        onOk={onRecharge}
        onCancel={() => setRechargeOpen(false)}
        okText="Proceed to Pay"
        destroyOnClose
      >
        <Form form={rechargeForm} layout="vertical" preserve={false}>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, type: 'number', min: 100 }]}>
            <InputNumber<number>
              min={100} step={500} style={{ width: '100%' }}
              formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => Number((v ?? '').replace(/[₹\s,]/g, ''))}
            />
          </Form.Item>
          <Form.Item name="method" label="Payment Method" rules={[{ required: true }]}>
            <Select options={[
              { value: 'UPI', label: 'UPI' },
              { value: 'Net Banking', label: 'Net Banking' },
              { value: 'Credit Card', label: 'Credit Card' },
              { value: 'Debit Card', label: 'Debit Card' },
            ]} />
          </Form.Item>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
            You will be redirected to the payment gateway. Credits are added once the payment is confirmed.
          </Text>
        </Form>
      </Modal>
    </div>
  );
}
