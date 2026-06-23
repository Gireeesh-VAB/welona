'use client';

import { useState, useCallback } from 'react';
import {

  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useSessionPackages,
  useSessionStats,
  useSessionEntries,
  useCreateSessionEntry,
  useSessionProducts,
  type SessionProduct,
  type ServiceProductGroup,
} from '@/hooks/useSessions';
import type { PackageSession, SessionEntry } from '@shared/types/customer-modules';
import { SESSION_STATUSES } from '@shared/enums';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  active:    'green',
  completed: 'default',
  expired:   'orange',
  cancelled: 'red',
};

const SESSION_STATUS_COLORS: Record<string, string> = {
  completed:   'green',
  no_show:     'red',
  cancelled:   'default',
  rescheduled: 'blue',
};

function pkgStatusLabel(status: string) {
  const map: Record<string, string> = {
    active:    '● Active',
    completed: '✓ Completed',
    expired:   '⏱ Expired',
    cancelled: '✕ Cancelled',
  };
  return map[status] ?? status;
}

// ---- History Drawer --------------------------------------------------------

function HistoryDrawer({
  pkg,
  open,
  onClose,
  onAddEntry,
}: {
  pkg: PackageSession | null;
  open: boolean;
  onClose: () => void;
  onAddEntry: () => void;
}) {
  const { data: entries = [], isLoading } = useSessionEntries(
    pkg?.customerId ?? '',
    pkg?.id ?? '',
  );

  return (
    <Drawer
      title={
        <span>
          Session History
          {pkg && (
            <Text style={{ fontSize: 13, color: colors.text.secondary, marginLeft: 10 }}>
              {pkg.customerName} — {pkg.name}
            </Text>
          )}
        </span>
      }
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={onAddEntry}
          disabled={pkg?.status === 'cancelled'}
        >
          Add Entry
        </Button>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <Spin />
        </div>
      ) : entries.length === 0 ? (
        <Text style={{ color: colors.text.placeholder }}>No session entries yet.</Text>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
              {entries.length} / {pkg?.totalSessions ?? '?'} sessions logged
            </Text>
          </div>
          <Timeline
            items={entries.map((e) => ({
              color: SESSION_STATUS_COLORS[e.status] ?? 'gray',
              children: (
                <div key={e.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 13 }}>
                      Session {e.sessionNumber}
                    </Text>
                    <Tag color={SESSION_STATUS_COLORS[e.status] ?? 'default'} style={{ fontSize: 11 }}>
                      {e.status.replace('_', ' ')}
                    </Tag>
                  </div>
                  <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                    {dayjs(e.sessionDate).format('DD MMM YYYY')}
                    {e.staffName && ` · ${e.staffName}`}
                  </Text>
                  {e.remarks && (
                    <div style={{ color: colors.text.placeholder, fontSize: 11, marginTop: 2 }}>
                      {e.remarks}
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        </>
      )}
    </Drawer>
  );
}

// ---- Add Session Modal -----------------------------------------------------

const PRODUCT_COLS = [
  {
    title: 'Product',
    dataIndex: 'productName',
    key: 'name',
    ellipsis: true,
  },
  {
    title: 'Quantity Required',
    key: 'qty',
    width: 130,
    render: (_: unknown, row: SessionProduct) => (
      <Text style={{ fontSize: 12 }}>{row.quantityPerSession}</Text>
    ),
  },
  {
    title: 'UOM',
    key: 'uom',
    width: 80,
    render: (_: unknown, row: SessionProduct) => (
      <Text style={{ fontSize: 12 }}>{row.uom ?? '—'}</Text>
    ),
  },
];

function AddSessionModal({
  pkg,
  open,
  onClose,
}: {
  pkg: PackageSession | null;
  open: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const createEntry = useCreateSessionEntry(pkg?.customerId ?? '', pkg?.id ?? '');
  const { data: productGroups = [], isLoading: productsLoading, isError: productsError } = useSessionProducts(pkg?.id);
  const products: SessionProduct[] = productGroups.flatMap((g: ServiceProductGroup) => g.products);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      await createEntry.mutateAsync({
        sessionDate: dayjs(values.sessionDate).toISOString(),
        staffName:   values.staffName || undefined,
        status:      values.status,
        remarks:     values.remarks || undefined,
      });
      message.success('Session entry logged');
      form.resetFields();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      const msg = err instanceof Error ? err.message : 'Failed to log session';
      message.error(msg);
    }
  }, [form, createEntry, onClose]);

  const remaining = pkg ? Math.max(0, pkg.totalSessions - pkg.usedSessions) : 0;

  return (
    <Modal
      title="Log Session Entry"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleSubmit}
      okText="Save"
      confirmLoading={createEntry.isPending}
      width={600}
      destroyOnClose
    >
      {/* Package summary */}
      {pkg && (
        <div
          style={{
            background: colors.black.tertiary,
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 16,
            fontSize: 12,
          }}
        >
          <Text strong>{pkg.customerName}</Text>
          <Text style={{ color: colors.text.secondary }}> · {pkg.name}</Text>
          <div style={{ color: colors.text.secondary, marginTop: 2 }}>
            {pkg.usedSessions}/{pkg.totalSessions} used &nbsp;·&nbsp;{' '}
            <span style={{ color: remaining === 0 ? '#cf1322' : '#2e7d32' }}>
              {remaining} remaining
            </span>
          </div>
        </div>
      )}

      {/* Products panel */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6, color: colors.text.secondary }}>
          PRODUCTS TO BE USED
        </Text>
        {productsLoading ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}><Spin size="small" /></div>
        ) : productsError ? (
          <Text style={{ fontSize: 12, color: '#cf1322' }}>Could not load products. Please try again.</Text>
        ) : products.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.text.placeholder }}>No products mapped to this service.</Text>
        ) : (
          <Table<SessionProduct>
            dataSource={products}
            columns={PRODUCT_COLS}
            rowKey="productId"
            size="small"
            pagination={false}
            style={{ fontSize: 12 }}
          />
        )}
      </div>

      {/* Session form */}
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Session Date"
              name="sessionDate"
              rules={[{ required: true, message: 'Required' }]}
              initialValue={dayjs().format('YYYY-MM-DD')}
            >
              <Input type="date" max={dayjs().format('YYYY-MM-DD')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Required' }]}
              initialValue="completed"
            >
              <Select>
                {SESSION_STATUSES.map((s) => (
                  <Select.Option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Staff Name" name="staffName">
          <Input placeholder="Who attended the session?" />
        </Form.Item>
        <Form.Item label="Remarks" name="remarks">
          <Input.TextArea rows={2} placeholder="Any notes..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ---- Main Page -------------------------------------------------------------

export default function SessionManagementPage() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState<string | undefined>();
  const [page, setPage]               = useState(1);
  const [drawerPkg, setDrawerPkg]     = useState<PackageSession | null>(null);
  const [modalPkg, setModalPkg]       = useState<PackageSession | null>(null);
  const [addModalOpen, setAddModal]   = useState(false);

  const { data: stats }  = useSessionStats();
  const { data, isLoading } = useSessionPackages({
    search:  search || undefined,
    status:  statusFilter,
    page,
    limit:   20,
  });

  const packages = data?.items ?? [];
  const total    = data?.meta?.total ?? 0;

  const openHistory  = (pkg: PackageSession) => setDrawerPkg(pkg);
  const closeHistory = () => setDrawerPkg(null);
  const openAddFrom  = (pkg: PackageSession) => { setModalPkg(pkg); setAddModal(true); };
  const closeAdd     = () => { setAddModal(false); };

  const columns: ColumnsType<PackageSession> = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, row) => (
        <div>
          <Text strong style={{ display: 'block', color: colors.text.primary }}>
            {row.customerName}
          </Text>
          {row.customerPhone && (
            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{row.customerPhone}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Package',
      key: 'package',
      render: (_, row) => (
        <div>
          <Text style={{ display: 'block' }}>{row.name}</Text>
          {row.branchName && (
            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{row.branchName}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Sessions',
      key: 'sessions',
      width: 130,
      render: (_, row) => (
        <div style={{ fontSize: 12 }}>
          <div>
            <Text style={{ color: colors.text.secondary }}>Total: </Text>
            <Text strong>{row.totalSessions}</Text>
          </div>
          <div>
            <Text style={{ color: colors.text.secondary }}>Done: </Text>
            <Text style={{ color: '#2e7d32' }}>{row.usedSessions}</Text>
          </div>
          <div>
            <Text style={{ color: colors.text.secondary }}>Left: </Text>
            <Text style={{ color: row.remainingSessions === 0 ? '#cf1322' : colors.text.primary }}>
              {row.remainingSessions}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Purchased',
      dataIndex: 'purchasedAt',
      render: (v: string) => dayjs(v).format('DD MMM YYYY'),
      width: 110,
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      width: 110,
      render: (v: string | null) => {
        if (!v) return <Text style={{ color: colors.text.placeholder }}>—</Text>;
        const expired = dayjs(v).isBefore(dayjs());
        return (
          <Text style={{ color: expired ? '#cf1322' : colors.text.secondary }}>
            {dayjs(v).format('DD MMM YYYY')}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] ?? 'default'}>{pkgStatusLabel(v)}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => openHistory(row)}
          >
            History
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openAddFrom(row)}
            disabled={row.status === 'cancelled'}
          >
            Add
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px 20px' }}>
      <Title level={4} style={{ marginBottom: 20 }}>
        Session Management
      </Title>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={5}>
          <Card size="small">
            <Statistic
              title="Active Packages"
              value={stats?.activePackages ?? '—'}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#2e7d32', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small">
            <Statistic
              title="Total Sessions"
              value={stats?.totalSessions ?? '—'}
              prefix={<UnorderedListOutlined />}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small">
            <Statistic
              title="Completed"
              value={stats?.completedSessions ?? '—'}
              valueStyle={{ color: '#2e7d32', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small">
            <Statistic
              title="Remaining"
              value={stats?.remainingSessions ?? '—'}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Today's Sessions"
              value={stats?.todaySessions ?? '—'}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Search customer or package name..."
          allowClear
          style={{ width: 280 }}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          onChange={(e) => { if (!e.target.value) { setSearch(''); setPage(1); } }}
        />
        <Select
          placeholder="All Statuses"
          allowClear
          style={{ width: 160 }}
          onChange={(v) => { setStatus(v); setPage(1); }}
        >
          <Select.Option value="active">Active</Select.Option>
          <Select.Option value="completed">Completed</Select.Option>
          <Select.Option value="expired">Expired</Select.Option>
          <Select.Option value="cancelled">Cancelled</Select.Option>
        </Select>
      </div>

      {/* Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table<PackageSession>
          dataSource={packages}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current:  page,
            pageSize: 20,
            total,
            onChange: (p) => setPage(p),
            showTotal: (t) => `${t} packages`,
          }}
          size="middle"
        />
      </Card>

      {/* History Drawer */}
      <HistoryDrawer
        pkg={drawerPkg}
        open={!!drawerPkg}
        onClose={closeHistory}
        onAddEntry={() => { if (drawerPkg) { setModalPkg(drawerPkg); setAddModal(true); } }}
      />

      {/* Add Session Modal */}
      <AddSessionModal
        pkg={modalPkg}
        open={addModalOpen}
        onClose={closeAdd}
      />
    </div>
  );
}
