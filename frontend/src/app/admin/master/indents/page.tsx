'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAdminIndents, useUpdateIndent } from '@/hooks/useAdminIndents';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { StockIndent } from '@shared/types/stock-indent';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  fulfilled: 'green',
  rejected: 'red',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminIndentsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-indents');
  const { message } = App.useApp();

  const [status, setStatus] = useState<string | undefined>(undefined);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useAdminIndents({ status, branchId, page, limit });
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const updateIndent = useUpdateIndent();

  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({ value: b.id, label: b.branchName })),
    [branchesData],
  );

  const fail = (err: unknown) => {
    message.error(err instanceof ApiClientError ? err.message : 'Action failed.');
  };

  const handleAction = async (indent: StockIndent, newStatus: 'approved' | 'rejected' | 'fulfilled') => {
    try {
      await updateIndent.mutateAsync({ id: indent.id, body: { status: newStatus } });
      message.success(`Indent marked as ${newStatus}`);
    } catch (err) {
      fail(err);
    }
  };

  const columns: ColumnsType<StockIndent> = useMemo(
    () => [
      {
        title: 'Date',
        dataIndex: 'createdAt',
        width: 120,
        render: (v: string) => <span style={{ fontSize: 12, color: colors.text.primary }}>{formatDate(v)}</span>,
      },
      {
        title: 'Branch',
        dataIndex: 'branchName',
        width: 160,
        render: (v: string) => <Tag color={colors.gold.primary} style={{ color: colors.text.onGold, border: 'none', fontSize: 12 }}>{v}</Tag>,
      },
      {
        title: 'Product',
        key: 'product',
        width: 200,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Text style={{ fontWeight: 600, color: colors.text.primary }}>{row.product.name}</Text>
            <Text style={{ fontSize: 11, color: colors.text.placeholder }}>{row.product.sku} · {row.product.uom}</Text>
          </Space>
        ),
      },
      {
        title: 'Requested Qty',
        dataIndex: 'requestedQty',
        width: 120,
        align: 'center',
        render: (v: number, row) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{v} {row.product.uom}</span>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 110,
        render: (v: string) => (
          <Tag color={STATUS_COLORS[v] ?? 'default'} style={{ fontSize: 12, textTransform: 'capitalize' }}>
            {v}
          </Tag>
        ),
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        ellipsis: true,
        render: (v: string | null) =>
          v ? <Text style={{ fontSize: 12, color: colors.text.primary }}>{v}</Text>
            : <Text style={{ fontSize: 12, color: colors.text.placeholder }}>—</Text>,
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 160,
        render: (_, row) => {
          if (row.status === 'rejected' || row.status === 'fulfilled') return null;
          return (
            <Space size={4}>
              {row.status === 'pending' && (
                <>
                  <Tooltip title="Approve">
                    <Button
                      size="small"
                      type="text"
                      icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                      onClick={() => handleAction(row, 'approved')}
                    />
                  </Tooltip>
                  <Tooltip title="Reject">
                    <Popconfirm
                      title="Reject this indent?"
                      okText="Reject"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleAction(row, 'rejected')}
                    >
                      <Button size="small" type="text" danger icon={<CloseOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                </>
              )}
              {row.status === 'approved' && (
                <Tooltip title="Mark Fulfilled">
                  <Button
                    size="small"
                    type="text"
                    icon={<CheckCircleOutlined style={{ color: '#1677ff' }} />}
                    onClick={() => handleAction(row, 'fulfilled')}
                  />
                </Tooltip>
              )}
            </Space>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
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
      `${range[0]}–${range[1]} of ${total} indent${total === 1 ? '' : 's'}`,
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            {navItem?.label ?? 'Stock Indents'}
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            {navItem?.description ?? 'Branch purchase requests for low-stock inventory items.'}
          </Text>
        </div>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={12} style={{ marginBottom: 12 }} wrap>
          <Col>
            <Select
              allowClear
              placeholder="All branches"
              style={{ minWidth: 200 }}
              options={branchOptions}
              value={branchId}
              onChange={(v) => { setBranchId(v); setPage(1); }}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="All statuses"
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
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}
