'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
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
import { CheckOutlined, CloseOutlined, CheckCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useAdminIndents, useAdminIndentAction } from '@/hooks/useAdminIndents';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { StockIndent } from '@shared/types/stock-indent';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  dispatched: 'gold',
  received: 'cyan',
  closed: 'green',
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

  // Create PO modal state
  const [poModalIndent, setPoModalIndent] = useState<StockIndent | null>(null);
  const [poForm] = Form.useForm();

  const { data, isLoading } = useAdminIndents({ status, branchId, page, limit });
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const { data: suppliersData } = useSuppliers({ active: 'active', limit: 200 });
  const updateIndent = useAdminIndentAction();
  const createPO = useCreatePurchaseOrder();

  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({ value: b.id, label: b.branchName })),
    [branchesData],
  );

  const supplierOptions = useMemo(
    () => (suppliersData?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
    [suppliersData],
  );

  const fail = (err: unknown) => {
    message.error(err instanceof ApiClientError ? err.message : 'Action failed.');
  };

  const handleAction = async (indent: StockIndent, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await updateIndent.mutateAsync({
          id: indent.id,
          action: 'approve',
          items: indent.items.map((it) => ({ itemId: it.id, approvedQty: it.requestedQty })),
        });
      } else {
        await updateIndent.mutateAsync({ id: indent.id, action: 'reject' });
      }
      message.success(`Indent ${action === 'approve' ? 'approved' : 'rejected'}`);
    } catch (err) {
      fail(err);
    }
  };

  const handleCreatePO = async () => {
    if (!poModalIndent) return;
    const firstItem = poModalIndent.items[0];
    if (!firstItem) return;
    try {
      const values = await poForm.validateFields();
      await createPO.mutateAsync({
        branchId: poModalIndent.branchId,
        supplierId: values.supplierId,
        expectedAt: values.expectedAt ? values.expectedAt.toISOString() : undefined,
        notes: values.notes || undefined,
        items: [{
          productId: firstItem.product.id,
          quantity: firstItem.approvedQty ?? firstItem.requestedQty,
          unitPrice: 0,
          taxRate: 0,
        }],
        fromIndentIds: [poModalIndent.id],
      });
      message.success('Purchase Order created');
      setPoModalIndent(null);
      poForm.resetFields();
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
        title: 'Product(s)',
        key: 'product',
        width: 200,
        render: (_, row) => {
          const first = row.items[0];
          return first ? (
            <Space direction="vertical" size={0}>
              <Text style={{ fontWeight: 600, color: colors.text.primary }}>{first.product.name}</Text>
              <Text style={{ fontSize: 11, color: colors.text.placeholder }}>
                {first.product.sku} · {first.product.uom}
                {row.items.length > 1 && ` +${row.items.length - 1} more`}
              </Text>
            </Space>
          ) : <Text style={{ color: colors.text.placeholder }}>—</Text>;
        },
      },
      {
        title: 'Requested Qty',
        key: 'requestedQty',
        width: 120,
        align: 'center',
        render: (_, row) => {
          const first = row.items[0];
          return first ? (
            <span style={{ fontWeight: 600, color: colors.text.primary }}>
              {first.requestedQty} {first.product.uom}
            </span>
          ) : '—';
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 130,
        render: (v: string, row) => (
          <Space size={4} wrap>
            <Tag color={STATUS_COLORS[v] ?? 'default'} style={{ fontSize: 12, textTransform: 'capitalize' }}>
              {v}
            </Tag>
            {row.poId && (
              <Tag color="cyan" style={{ fontSize: 11 }}>PO Raised</Tag>
            )}
          </Space>
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
        width: 180,
        render: (_, row) => {
          if (row.status === 'rejected' || row.status === 'dispatched' || row.status === 'delivered' || row.status === 'closed') return null;
          return (
            <Space size={4}>
              {row.status === 'pending' && (
                <>
                  <Tooltip title="Approve">
                    <Button
                      size="small"
                      type="text"
                      icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                      onClick={() => handleAction(row, 'approve')}
                    />
                  </Tooltip>
                  <Tooltip title="Reject">
                    <Popconfirm
                      title="Reject this indent?"
                      okText="Reject"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleAction(row, 'reject')}
                    >
                      <Button size="small" type="text" danger icon={<CloseOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                </>
              )}
              {row.status === 'approved' && !row.poId && (
                <Tooltip title="Create Purchase Order">
                  <Button
                    size="small"
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => { setPoModalIndent(row); poForm.resetFields(); }}
                    style={{ fontSize: 11 }}
                  >
                    Create PO
                  </Button>
                </Tooltip>
              )}
            </Space>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, poForm],
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
                { value: 'dispatched', label: 'Dispatched' },
                { value: 'received', label: 'Received' },
                { value: 'closed', label: 'Closed' },
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

      {/* Create PO Modal */}
      <Modal
        title={poModalIndent ? `Create PO — ${poModalIndent.items[0]?.product.name ?? ''} (${poModalIndent.items[0]?.requestedQty ?? ''} ${poModalIndent.items[0]?.product.uom ?? ''})` : 'Create Purchase Order'}
        open={!!poModalIndent}
        onCancel={() => { setPoModalIndent(null); poForm.resetFields(); }}
        onOk={handleCreatePO}
        confirmLoading={createPO.isPending}
        okText="Create Purchase Order"
        width={480}
      >
        <Form form={poForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="supplierId"
            label="Supplier"
            rules={[{ required: true, message: 'Select a supplier' }]}
          >
            <Select
              showSearch
              placeholder="Select supplier"
              options={supplierOptions}
              filterOption={(input, opt) =>
                (opt?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="expectedAt" label="Expected Delivery Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </Form>
        {poModalIndent && (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, padding: '8px 12px', marginTop: 4, fontSize: 12 }}>
            Branch: <strong>{poModalIndent.branchName}</strong> · Product: <strong>{poModalIndent.items[0]?.product.name}</strong> · Qty: <strong>{poModalIndent.items[0]?.requestedQty} {poModalIndent.items[0]?.product.uom}</strong>
          </div>
        )}
      </Modal>
    </div>
  );
}
