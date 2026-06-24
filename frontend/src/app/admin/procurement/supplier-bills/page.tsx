'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { EditOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useGoodsReceipts, useUpdateGoodsReceipt } from '@/hooks/usePurchaseOrders';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminGoodsReceipt } from '@shared/types/admin-purchase-order';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const PAYMENT_COLOR: Record<string, string> = { unpaid: 'red', partial: 'orange', paid: 'green' };
const PAYMENT_LABEL: Record<string, string> = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function SupplierBillsPage() {
  const router = useRouter();
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [editGrn, setEditGrn] = useState<AdminGoodsReceipt | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useGoodsReceipts({ page, limit: 20 });
  const updateGRN = useUpdateGoodsReceipt();

  const openEdit = (grn: AdminGoodsReceipt) => {
    setEditGrn(grn);
    form.setFieldsValue({
      invoiceNumber: grn.invoiceNumber ?? '',
      invoiceDate: grn.invoiceDate ? dayjs(grn.invoiceDate) : null,
      invoiceAmount: grn.invoiceAmount ? grn.invoiceAmount / 100 : null,
    });
  };

  const onSave = async () => {
    if (!editGrn) return;
    try {
      const vals = await form.validateFields();
      await updateGRN.mutateAsync({
        id: editGrn.id,
        body: {
          invoiceNumber: vals.invoiceNumber || null,
          invoiceDate: vals.invoiceDate ? vals.invoiceDate.toISOString() : null,
          invoiceAmount: vals.invoiceAmount ? Math.round(vals.invoiceAmount * 100) : null,
        },
      });
      setEditGrn(null);
      message.success('Invoice details saved');
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof ApiClientError ? err.message : 'Could not save invoice');
    }
  };

  const grns = data?.items ?? [];
  const meta = data?.meta;

  const columns: ColumnsType<AdminGoodsReceipt> = [
    {
      title: 'GRN #',
      dataIndex: 'number',
      width: 130,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_v, r) => r.supplier?.name ?? <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'PO Reference',
      key: 'po',
      width: 140,
      render: (_v, r) =>
        r.poNumber ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: 'auto' }}
            icon={<LinkOutlined />}
            onClick={() => router.push(`/admin/procurement/purchase-orders/${r.poId}`)}
          >
            <Text code style={{ fontSize: 11 }}>{r.poNumber}</Text>
          </Button>
        ) : (
          <Text style={{ color: colors.text.placeholder }}>—</Text>
        ),
    },
    {
      title: 'Received Date',
      dataIndex: 'receivedAt',
      width: 160,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      width: 150,
      render: (v: string | null) =>
        v ? (
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        ) : (
          <Tag color="orange">No Invoice</Tag>
        ),
    },
    {
      title: 'Invoice Date',
      dataIndex: 'invoiceDate',
      width: 120,
      render: (v: string | null) => formatDate(v),
    },
    {
      title: 'Invoice Amount',
      dataIndex: 'invoiceAmount',
      width: 130,
      align: 'right',
      render: (v: number | null) =>
        v != null ? (
          <Text strong>{rupees(v)}</Text>
        ) : (
          <Text style={{ color: colors.text.placeholder }}>—</Text>
        ),
    },
    {
      title: 'Payment',
      dataIndex: 'poPaymentStatus',
      width: 130,
      render: (v: string | null) =>
        v ? (
          <Tag color={PAYMENT_COLOR[v] ?? 'default'}>{PAYMENT_LABEL[v] ?? v}</Tag>
        ) : (
          <Tag color="red">Unpaid</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_v, r) => (
        <Space>
          <Button
            size="small"
            icon={r.invoiceNumber ? <EditOutlined /> : <PlusOutlined />}
            onClick={() => openEdit(r)}
          >
            {r.invoiceNumber ? 'Edit' : 'Add Invoice'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: colors.text.primary }}>Supplier Bills</Title>
        <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
          GRNs and their supplier invoices
        </Text>
      </div>

      <Card
        style={{ border: `1px solid ${colors.border}`, background: colors.black.secondary }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<AdminGoodsReceipt>
          rowKey="id"
          columns={columns}
          dataSource={grns}
          loading={isLoading}
          size="middle"
          scroll={{ x: 1100 }}
          pagination={
            meta
              ? {
                  current: page,
                  pageSize: 20,
                  total: meta.total,
                  onChange: (p) => setPage(p),
                  showTotal: (t) => `${t} receipt${t !== 1 ? 's' : ''}`,
                }
              : false
          }
        />
      </Card>

      {/* Edit Invoice Modal */}
      <Modal
        title={editGrn?.invoiceNumber ? 'Edit Invoice Details' : 'Add Supplier Invoice'}
        open={!!editGrn}
        onCancel={() => setEditGrn(null)}
        onOk={onSave}
        okText="Save Invoice"
        confirmLoading={updateGRN.isPending}
        width={460}
      >
        {editGrn && (
          <div style={{ marginBottom: 12, color: colors.text.secondary, fontSize: 13 }}>
            GRN: <Text code>{editGrn.number}</Text>
            {editGrn.poNumber && (
              <> · PO: <Text code>{editGrn.poNumber}</Text></>
            )}
          </div>
        )}
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="invoiceNumber" label="Invoice Number">
            <Input placeholder="e.g. INV-2025-001" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="invoiceDate" label="Invoice Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="invoiceAmount" label="Invoice Amount (₹)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="₹" placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
