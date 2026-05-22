'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useQuotations,
  useQuotation,
  useCreateQuotation,
  useUpdateQuotation,
  useQuotationAction,
  useSalespeople,
} from '@/hooks/useSales';
import SalesNav from '@/components/sales/SalesNav';
import StatusTag from '@/components/sales/StatusTag';
import OwnerAssign from '@/components/sales/OwnerAssign';
import CustomerPicker from '@/components/sales/CustomerPicker';
import LineItemsField from '@/components/sales/LineItemsField';
import { ApiClientError } from '@/lib/api-client';
import { formatDate, formatMoney, titleCase, toMinorUnits } from '@shared/format';
import type { LineItem, Quotation } from '@shared/types/sales';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

interface ItemFormValue {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

/** Detail drawer with pipeline actions for a single quotation. */
function QuotationDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { message } = App.useApp();
  const { data: quotation, isLoading } = useQuotation(id);
  const action = useQuotationAction();
  const updateQuotation = useUpdateQuotation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const reassign = async (staffId: string) => {
    if (!id) return;
    try {
      await updateQuotation.mutateAsync({ id, body: { ownerStaffId: staffId } });
      message.success('Salesperson reassigned');
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not reassign');
    }
  };

  const run = async (
    act: 'send' | 'approve' | 'reject' | 'convert',
    body?: Record<string, unknown>,
  ) => {
    if (!id) return;
    try {
      await action.mutateAsync({ id, action: act, body });
      message.success(`Quotation ${act === 'convert' ? 'converted to order' : act + 'ed'}`);
      if (act === 'convert') onClose();
      setRejectOpen(false);
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Action failed');
    }
  };

  const itemColumns: ColumnsType<LineItem> = [
    { title: 'Description', dataIndex: 'description' },
    { title: 'Qty', dataIndex: 'quantity', width: 60 },
    { title: 'Unit', dataIndex: 'unitPrice', render: (v: number) => formatMoney(v), width: 110 },
    {
      title: 'Tax',
      dataIndex: 'taxRate',
      width: 70,
      render: (v: number) => `${v / 100}%`,
    },
    {
      title: 'Total',
      dataIndex: 'lineTotal',
      render: (v: number) => formatMoney(v),
      width: 120,
    },
  ];

  return (
    <Drawer
      title={quotation ? `Quotation ${quotation.number}` : 'Quotation'}
      open={!!id}
      onClose={onClose}
      width={620}
      loading={isLoading}
      extra={quotation && <StatusTag status={quotation.status} />}
    >
      {quotation && (
        <>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Customer">{quotation.customer?.name}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDate(quotation.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Salesperson" span={2}>
              <OwnerAssign
                value={quotation.ownerStaffId}
                onAssign={reassign}
                loading={updateQuotation.isPending}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Valid until">
              {formatDate(quotation.validUntil)}
            </Descriptions.Item>
          </Descriptions>

          {quotation.rejectedReason && (
            <Text type="danger" style={{ display: 'block', margin: '8px 0' }}>
              Rejected: {quotation.rejectedReason}
            </Text>
          )}
          {quotation.order && (
            <Tag color="green" style={{ margin: '8px 0' }}>
              Converted to order {quotation.order.number}
            </Tag>
          )}

          <Table<LineItem>
            rowKey="id"
            size="small"
            style={{ marginTop: 16 }}
            columns={itemColumns}
            dataSource={quotation.items ?? []}
            pagination={false}
          />

          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <div>
              <Text type="secondary">Subtotal: </Text>
              {formatMoney(quotation.subtotal)}
            </div>
            <div>
              <Text type="secondary">Tax: </Text>
              {formatMoney(quotation.taxAmt)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.gold.primary }}>
              Total: {formatMoney(quotation.total)}
            </div>
          </div>

          <Space style={{ marginTop: 24 }}>
            {quotation.status === 'draft' && (
              <Button type="primary" loading={action.isPending} onClick={() => run('send')}>
                Send to Customer
              </Button>
            )}
            {quotation.status === 'sent' && (
              <>
                <Button type="primary" loading={action.isPending} onClick={() => run('approve')}>
                  Mark Approved
                </Button>
                <Button danger onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
              </>
            )}
            {quotation.status === 'approved' && (
              <Button type="primary" loading={action.isPending} onClick={() => run('convert')}>
                Convert to Order
              </Button>
            )}
          </Space>

          <Modal
            title="Reject quotation"
            open={rejectOpen}
            onOk={() => run('reject', { reason })}
            confirmLoading={action.isPending}
            onCancel={() => setRejectOpen(false)}
            okButtonProps={{ danger: true, disabled: !reason.trim() }}
          >
            <Input.TextArea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection"
            />
          </Modal>
        </>
      )}
    </Drawer>
  );
}

export default function QuotationsPage() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading } = useQuotations({ page, limit: 10, status: statusFilter });

  const { data: salespeople } = useSalespeople();
  const createQuotation = useCreateQuotation();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleCreate = async () => {
    const values = await form.validateFields();
    const items = (values.items as ItemFormValue[]).map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: toMinorUnits(it.unitPrice),
      taxRate: Math.round((it.taxRate ?? 0) * 100),
    }));
    try {
      await createQuotation.mutateAsync({
        customerId: values.customerId,
        ownerStaffId: values.ownerStaffId,
        notes: values.notes,
        validUntil: values.validUntil ? values.validUntil.toISOString() : undefined,
        items,
      });
      message.success('Quotation created');
      setModalOpen(false);
      form.resetFields();
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not create quotation');
    }
  };

  const columns: ColumnsType<Quotation> = [
    { title: 'Number', dataIndex: 'number', width: 120 },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Salesperson', dataIndex: ['owner', 'name'] },
    {
      title: 'Total',
      dataIndex: 'total',
      render: (v: number) => <strong>{formatMoney(v)}</strong>,
    },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => formatDate(v) },
  ];

  return (
    <div>
      <SalesNav />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ marginTop: 0 }}>
          Quotations
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Quotation
        </Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={['draft', 'sent', 'approved', 'rejected', 'expired', 'converted'].map((s) => ({
              label: titleCase(s),
              value: s,
            }))}
          />
        </Space>

        <Table<Quotation>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          onRow={(row) => ({
            onClick: () => setDetailId(row.id),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: 10,
            total: data?.meta.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Modal
        title="New quotation"
        open={modalOpen}
        onOk={handleCreate}
        confirmLoading={createQuotation.isPending}
        onCancel={() => setModalOpen(false)}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={{ items: [{ quantity: 1, unitPrice: 0, taxRate: 18 }] }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              name="customerId"
              label="Customer"
              rules={[{ required: true, message: 'Select a customer' }]}
              style={{ flex: 1 }}
            >
              <CustomerPicker />
            </Form.Item>
            <Form.Item
              name="ownerStaffId"
              label="Salesperson"
              rules={[{ required: true, message: 'Assign a salesperson' }]}
              style={{ width: 220 }}
            >
              <Select
                placeholder="Owner"
                showSearch
                optionFilterProp="label"
                options={(salespeople ?? []).map((s) => ({ label: s.name, value: s.id }))}
              />
            </Form.Item>
          </div>
          <Form.Item name="validUntil" label="Valid until">
            <DatePicker style={{ width: 220 }} />
          </Form.Item>
          <Form.Item label="Line items" required>
            <LineItemsField />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <QuotationDrawer id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
