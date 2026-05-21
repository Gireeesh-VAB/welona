'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useOrders,
  useOrder,
  useOrderStatus,
  useUpdateOrder,
  useCreateDelivery,
  useDeliveryAction,
  useCreateInvoice,
} from '@/hooks/useSales';
import SalesNav from '@/components/sales/SalesNav';
import StatusTag from '@/components/sales/StatusTag';
import OwnerAssign from '@/components/sales/OwnerAssign';
import NewSaleModal from '@/components/sales/NewSaleModal';
import { ApiClientError } from '@/lib/api-client';
import { formatDate, formatMoney, titleCase } from '@/lib/format';
import type { Delivery, Invoice, LineItem, SalesOrder } from '@/types/sales';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Detail drawer for a sales order: items, deliveries, invoices and actions. */
function OrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { message } = App.useApp();
  const { data: order, isLoading } = useOrder(id);
  const orderStatus = useOrderStatus();
  const updateOrder = useUpdateOrder();
  const createDelivery = useCreateDelivery();
  const deliveryAction = useDeliveryAction();
  const createInvoice = useCreateInvoice();

  const fail = (e: unknown) =>
    message.error(e instanceof ApiClientError ? e.message : 'Action failed');

  const setStatus = async (status: string) => {
    if (!id) return;
    try {
      await orderStatus.mutateAsync({ id, status });
      message.success(`Order ${titleCase(status)}`);
    } catch (e) {
      fail(e);
    }
  };

  const reassign = async (staffId: string) => {
    if (!id) return;
    try {
      await updateOrder.mutateAsync({ id, body: { ownerStaffId: staffId } });
      message.success('Salesperson reassigned');
    } catch (e) {
      fail(e);
    }
  };

  const addDelivery = async () => {
    if (!order) return;
    const lines = (order.items ?? [])
      .map((it) => ({ orderItemId: it.id, quantity: it.quantity - (it.quantityDelivered ?? 0) }))
      .filter((l) => l.quantity > 0);
    if (lines.length === 0) {
      message.info('All items have already been delivered');
      return;
    }
    try {
      await createDelivery.mutateAsync({ orderId: order.id, body: { lines } });
      message.success('Delivery scheduled for the outstanding items');
    } catch (e) {
      fail(e);
    }
  };

  const advanceDelivery = async (deliveryId: string, action: 'dispatch' | 'complete') => {
    try {
      await deliveryAction.mutateAsync({ id: deliveryId, action });
      message.success(`Delivery ${action === 'dispatch' ? 'dispatched' : 'completed'}`);
    } catch (e) {
      fail(e);
    }
  };

  const raiseInvoice = async () => {
    if (!order) return;
    try {
      await createInvoice.mutateAsync({ customerId: order.customerId, orderId: order.id });
      message.success('Invoice created as draft');
    } catch (e) {
      fail(e);
    }
  };

  const itemColumns: ColumnsType<LineItem> = [
    { title: 'Description', dataIndex: 'description' },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 130,
      render: (v: number, row) => `${row.quantityDelivered ?? 0} / ${v} delivered`,
    },
    { title: 'Total', dataIndex: 'lineTotal', render: (v: number) => formatMoney(v), width: 120 },
  ];

  const deliveryColumns: ColumnsType<Delivery> = [
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    { title: 'Tracking', dataIndex: 'trackingRef', render: (v: string | null) => v || '—' },
    {
      title: 'Action',
      key: 'action',
      render: (_, row) => {
        if (row.status === 'scheduled') {
          return (
            <Button size="small" onClick={() => advanceDelivery(row.id, 'dispatch')}>
              Dispatch
            </Button>
          );
        }
        if (row.status === 'dispatched') {
          return (
            <Button size="small" type="primary" onClick={() => advanceDelivery(row.id, 'complete')}>
              Mark Delivered
            </Button>
          );
        }
        return <Text type="secondary">—</Text>;
      },
    },
  ];

  const stillOpen = order ? order.status !== 'cancelled' && order.status !== 'delivered' : false;

  return (
    <Drawer
      title={order ? `Order ${order.number}` : 'Order'}
      open={!!id}
      onClose={onClose}
      width={680}
      loading={isLoading}
      extra={order && <StatusTag status={order.status} />}
    >
      {order && (
        <>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Customer">{order.customer?.name}</Descriptions.Item>
            <Descriptions.Item label="Payment">
              <StatusTag status={order.paymentStatus} />
            </Descriptions.Item>
            <Descriptions.Item label="Salesperson" span={2}>
              <OwnerAssign
                value={order.ownerStaffId}
                onAssign={reassign}
                loading={updateOrder.isPending}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Created">{formatDate(order.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="From quote">
              {order.quotation?.number || '—'}
            </Descriptions.Item>
          </Descriptions>

          <Table<LineItem>
            rowKey="id"
            size="small"
            style={{ marginTop: 16 }}
            columns={itemColumns}
            dataSource={order.items ?? []}
            pagination={false}
          />
          <div
            style={{
              textAlign: 'right',
              marginTop: 12,
              fontSize: 16,
              fontWeight: 700,
              color: colors.gold.primary,
            }}
          >
            Total: {formatMoney(order.total)}
          </div>

          <Space style={{ marginTop: 16, flexWrap: 'wrap' }}>
            {order.status === 'pending' && (
              <Button
                type="primary"
                loading={orderStatus.isPending}
                onClick={() => setStatus('confirmed')}
              >
                Confirm Order
              </Button>
            )}
            {stillOpen && (
              <Button loading={createDelivery.isPending} onClick={addDelivery}>
                Create Delivery
              </Button>
            )}
            {order.status !== 'pending' && (
              <Button loading={createInvoice.isPending} onClick={raiseInvoice}>
                Create Invoice
              </Button>
            )}
            {stillOpen && order.status !== 'pending' && (
              <Button danger onClick={() => setStatus('cancelled')}>
                Cancel Order
              </Button>
            )}
          </Space>

          <Title level={5} style={{ marginTop: 24 }}>
            Deliveries
          </Title>
          <Table<Delivery>
            rowKey="id"
            size="small"
            columns={deliveryColumns}
            dataSource={order.deliveries ?? []}
            pagination={false}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No deliveries" />,
            }}
          />

          <Title level={5} style={{ marginTop: 24 }}>
            Invoices
          </Title>
          <Table<Invoice>
            rowKey="id"
            size="small"
            columns={[
              { title: 'Number', dataIndex: 'number' },
              { title: 'Total', dataIndex: 'total', render: (v: number) => formatMoney(v) },
              { title: 'Paid', dataIndex: 'amountPaid', render: (v: number) => formatMoney(v) },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (s: string) => <StatusTag status={s} />,
              },
            ]}
            dataSource={order.invoices ?? []}
            pagination={false}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No invoices" />,
            }}
          />
        </>
      )}
    </Drawer>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading } = useOrders({ page, limit: 10, status: statusFilter });
  const [saleOpen, setSaleOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const columns: ColumnsType<SalesOrder> = [
    { title: 'Number', dataIndex: 'number', width: 120 },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Salesperson', dataIndex: ['owner', 'name'] },
    {
      title: 'Total',
      dataIndex: 'total',
      render: (v: number) => <strong>{formatMoney(v)}</strong>,
    },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      render: (s: string) => <StatusTag status={s} />,
    },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => formatDate(v) },
  ];

  return (
    <div>
      <SalesNav />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ marginTop: 0 }}>
          Sales Orders
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSaleOpen(true)}>
          New Sale
        </Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: 220 }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={['pending', 'confirmed', 'partially_delivered', 'delivered', 'cancelled'].map(
              (s) => ({ label: titleCase(s), value: s }),
            )}
          />
        </Space>

        <Table<SalesOrder>
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

      <NewSaleModal open={saleOpen} onClose={() => setSaleOpen(false)} />
      <OrderDrawer id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
