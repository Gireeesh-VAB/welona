'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  CheckOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  ShopOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useAdminIndents, useUpdateIndent } from '@/hooks/useAdminIndents';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { StockIndent } from '@shared/types/stock-indent';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  fulfilled: 'green',
  rejected: 'red',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <ClockCircleOutlined />,
  approved: <CheckOutlined />,
  fulfilled: <CheckCircleOutlined />,
  rejected: <CloseOutlined />,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StockRequestsPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [status, setStatus] = useState<string | undefined>(undefined);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, refetch } = useAdminIndents({ status, branchId, page, limit });
  const { data: allPending } = useAdminIndents({ status: 'pending', limit: 1 });
  const { data: allApproved } = useAdminIndents({ status: 'approved', limit: 1 });
  const { data: allFulfilled } = useAdminIndents({ status: 'fulfilled', limit: 1 });
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const updateIndent = useUpdateIndent();

  const branchOptions = useMemo(
    () => [
      { value: '', label: 'All Branches' },
      ...(branchesData?.items ?? []).map((b) => ({ value: b.id, label: b.branchName })),
    ],
    [branchesData],
  );

  const handleAction = async (indent: StockIndent, newStatus: 'approved' | 'rejected' | 'fulfilled') => {
    try {
      await updateIndent.mutateAsync({ id: indent.id, body: { status: newStatus } });
      message.success(`Request ${newStatus}`);
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Action failed.');
    }
  };

  const columns: ColumnsType<StockIndent> = useMemo(
    () => [
      {
        title: 'Date',
        dataIndex: 'createdAt',
        width: 150,
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        defaultSortOrder: 'descend',
        render: (v: string) => (
          <Text style={{ fontSize: 12, color: colors.text.placeholder }}>{formatDate(v)}</Text>
        ),
      },
      {
        title: 'Branch',
        dataIndex: 'branchName',
        width: 160,
        render: (v: string) => (
          <Tag
            icon={<ShopOutlined />}
            color={colors.gold.primary}
            style={{ color: colors.text.onGold, border: 'none', fontSize: 12 }}
          >
            {v}
          </Tag>
        ),
      },
      {
        title: 'Product',
        key: 'product',
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Text style={{ fontWeight: 600, color: colors.text.primary }}>{row.product.name}</Text>
            <Text style={{ fontSize: 11, color: colors.text.placeholder }}>
              {row.product.sku} · {row.product.uom}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Qty Requested',
        dataIndex: 'requestedQty',
        width: 130,
        align: 'center',
        render: (v: number, row) => (
          <Text strong style={{ color: colors.text.primary, fontSize: 14 }}>
            {v} <Text style={{ color: colors.text.placeholder, fontWeight: 400, fontSize: 12 }}>{row.product.uom}</Text>
          </Text>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        filters: [
          { text: 'Pending', value: 'pending' },
          { text: 'Approved', value: 'approved' },
          { text: 'Fulfilled', value: 'fulfilled' },
          { text: 'Rejected', value: 'rejected' },
        ],
        onFilter: (value, record) => record.status === value,
        render: (v: string) => (
          <Tag icon={STATUS_ICONS[v]} color={STATUS_COLORS[v] ?? 'default'} style={{ fontSize: 12 }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Tag>
        ),
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        ellipsis: true,
        render: (v: string | null) =>
          v ? (
            <Text style={{ fontSize: 12, color: colors.text.primary }}>{v}</Text>
          ) : (
            <Text style={{ fontSize: 12, color: colors.text.placeholder }}>—</Text>
          ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 150,
        render: (_, row) => {
          if (row.status === 'rejected' || row.status === 'fulfilled') {
            return <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;
          }
          return (
            <Space size={4}>
              {row.status === 'pending' && (
                <>
                  <Tooltip title="Approve">
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                      style={{ background: '#22c55e', borderColor: '#22c55e' }}
                      onClick={() => handleAction(row, 'approved')}
                      loading={updateIndent.isPending}
                    >
                      Approve
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Reject this request?"
                    okText="Reject"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleAction(row, 'rejected')}
                  >
                    <Button size="small" danger icon={<CloseOutlined />}>
                      Reject
                    </Button>
                  </Popconfirm>
                </>
              )}
              {row.status === 'approved' && (
                <Tooltip title="Mark as Fulfilled — stock has been dispatched">
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleAction(row, 'fulfilled')}
                    loading={updateIndent.isPending}
                  >
                    Fulfill
                  </Button>
                </Tooltip>
              )}
            </Space>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, updateIndent.isPending],
  );

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [20, 50, 100],
    onChange: (next, size) => {
      setPage(next);
      if (size !== limit) setLimit(size);
    },
    showTotal: (total, range) =>
      `${range[0]}–${range[1]} of ${total} request${total === 1 ? '' : 's'}`,
  };

  const pendingTotal = allPending?.meta.total ?? 0;
  const approvedTotal = allApproved?.meta.total ?? 0;
  const fulfilledTotal = allFulfilled?.meta.total ?? 0;

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
            Stock Requests
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Branch stock restock requests — review, approve, reject or mark fulfilled.
          </Text>
        </div>
        <Button
          icon={<SyncOutlined />}
          onClick={() => refetch()}
          style={{ borderColor: colors.border, color: colors.text.secondary }}
        >
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, cursor: 'pointer' }}
            styles={{ body: { padding: '12px 16px' } }}
            onClick={() => { setStatus('pending'); setPage(1); }}
          >
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>PENDING</span>}
              value={pendingTotal}
              prefix={<Badge color="orange" />}
              valueStyle={{ color: '#f97316', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, cursor: 'pointer' }}
            styles={{ body: { padding: '12px 16px' } }}
            onClick={() => { setStatus('approved'); setPage(1); }}
          >
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>APPROVED</span>}
              value={approvedTotal}
              prefix={<Badge color="blue" />}
              valueStyle={{ color: '#3b82f6', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, cursor: 'pointer' }}
            styles={{ body: { padding: '12px 16px' } }}
            onClick={() => { setStatus('fulfilled'); setPage(1); }}
          >
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>FULFILLED</span>}
              value={fulfilledTotal}
              prefix={<Badge color="green" />}
              valueStyle={{ color: '#22c55e', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, cursor: 'pointer' }}
            styles={{ body: { padding: '12px 16px' } }}
            onClick={() => { setStatus(undefined); setPage(1); }}
          >
            <Statistic
              title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>ALL TIME</span>}
              value={(data?.meta.total ?? 0)}
              prefix={<InboxOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        {/* Filters */}
        <Row gutter={12} style={{ marginBottom: 16 }} wrap>
          <Col>
            <Select
              showSearch
              allowClear
              placeholder="All Branches"
              style={{ minWidth: 220 }}
              options={branchOptions}
              value={branchId || undefined}
              onChange={(v) => { setBranchId(v || undefined); setPage(1); }}
              filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="All Statuses"
              style={{ minWidth: 160 }}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'fulfilled', label: 'Fulfilled' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </Col>
        </Row>

        <Table<StockIndent>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 900 }}
          rowClassName={(row) => (row.status === 'pending' ? 'ant-table-row-pending' : '')}
        />
      </Card>
    </div>
  );
}
