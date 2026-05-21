'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Table,
  Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useTreatments, useSalespeople, useCustomer } from '@/hooks/useSales';
import { useCreateAppointment } from '@/hooks/useAppointments';
import CustomerPicker from '@/components/sales/CustomerPicker';
import { ApiClientError } from '@/lib/api-client';
import { formatMoney, toMinorUnits } from '@/lib/format';
import { colors } from '@/theme/colors';

const { Text } = Typography;

interface LineRow {
  key: string;
  category?: string;
  treatmentId?: string;
  quantity: number;
  amount: number; // rupees
}

const newRow = (): LineRow => ({
  key: Math.random().toString(36).slice(2),
  quantity: 1,
  amount: 0,
});

interface BookingFormProps {
  /** When set, the booking is for this customer and the picker is hidden. */
  customerId?: string;
  /** Called with the created booking after a successful save. */
  onSaved: (result: { id: string }) => void;
  submitLabel?: string;
}

/**
 * The full booking form — consultant, category/service line items (priced
 * from the Treatment master), discount, round off and remarks. Shared by the
 * New Appointment page and the customer Bookings tab.
 */
export default function BookingForm({ customerId, onSaved, submitLabel }: BookingFormProps) {
  const { message } = App.useApp();
  const { data: treatments } = useTreatments();
  const { data: consultants } = useSalespeople();
  const createBooking = useCreateAppointment();

  const [pickedCustomer, setPickedCustomer] = useState<string>();
  const effectiveCustomer = customerId ?? pickedCustomer;

  const [consultantId, setConsultantId] = useState<string>();
  const [scheduledAt, setScheduledAt] = useState<Dayjs>(dayjs().hour(10).minute(0).second(0));
  const [items, setItems] = useState<LineRow[]>([newRow()]);
  const [discount, setDiscount] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data: customer } = useCustomer(effectiveCustomer ?? null);

  const activeTreatments = useMemo(
    () => (treatments ?? []).filter((t) => t.isActive),
    [treatments],
  );
  const categories = useMemo(
    () => [...new Set(activeTreatments.map((t) => t.category || 'Uncategorised'))],
    [activeTreatments],
  );

  const patchRow = (key: string, patch: Partial<LineRow>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const totalAmount = items.reduce((s, r) => s + r.amount * r.quantity, 0);
  const netAmount = totalAmount - discount + roundOff;

  /** Selected service lines, resolved with their service names. */
  const reviewLines = items
    .filter((r) => r.treatmentId)
    .map((r) => {
      const t = activeTreatments.find((x) => x.id === r.treatmentId);
      return {
        category: r.category ?? '—',
        service: t?.name ?? 'Service',
        quantity: r.quantity,
        amount: r.amount,
        lineTotal: r.amount * r.quantity,
      };
    });

  const consultantName = (consultants ?? []).find((c) => c.id === consultantId)?.name;

  /** Validate the form, then open the review step. */
  const openReview = () => {
    if (!effectiveCustomer) return message.warning('Select a customer');
    if (reviewLines.length === 0) return message.warning('Add at least one service');
    setReviewOpen(true);
  };

  /** Confirmed from the review — actually create the booking. */
  const confirmSave = async () => {
    try {
      const result = await createBooking.mutateAsync({
        customerId: effectiveCustomer,
        consultantStaffId: consultantId || undefined,
        scheduledAt: scheduledAt.toISOString(),
        notes: remarks || undefined,
        discount: toMinorUnits(discount),
        roundOff: toMinorUnits(roundOff),
        items: reviewLines.map((r) => ({
          category: r.category === '—' ? undefined : r.category,
          service: r.service,
          quantity: r.quantity,
          amount: toMinorUnits(r.amount),
        })),
      });
      message.success('Appointment booked');
      setReviewOpen(false);
      onSaved(result);
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not save appointment');
    }
  };

  const columns: ColumnsType<LineRow> = [
    { title: 'S.No.', key: 'sno', width: 56, render: (_, __, i) => i + 1 },
    {
      title: 'Category',
      key: 'category',
      render: (_, row) => (
        <Select
          placeholder="Select"
          style={{ width: '100%', minWidth: 130 }}
          value={row.category}
          options={categories.map((c) => ({ label: c, value: c }))}
          onChange={(v) => patchRow(row.key, { category: v, treatmentId: undefined, amount: 0 })}
        />
      ),
    },
    {
      title: 'Service',
      key: 'service',
      render: (_, row) => {
        const opts = activeTreatments
          .filter((t) => !row.category || (t.category || 'Uncategorised') === row.category)
          .map((t) => ({ label: t.name, value: t.id }));
        return (
          <Select
            placeholder="Select"
            style={{ width: '100%', minWidth: 150 }}
            showSearch
            optionFilterProp="label"
            value={row.treatmentId}
            options={opts}
            onChange={(v) => {
              const t = activeTreatments.find((x) => x.id === v);
              patchRow(row.key, {
                treatmentId: v,
                amount: t?.price != null ? t.price / 100 : 0,
                category: row.category || t?.category || 'Uncategorised',
              });
            }}
          />
        );
      },
    },
    {
      title: 'Qty',
      key: 'quantity',
      width: 80,
      render: (_, row) => (
        <InputNumber
          min={1}
          value={row.quantity}
          onChange={(v) => patchRow(row.key, { quantity: Number(v) || 1 })}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Amount (₹)',
      key: 'amount',
      width: 120,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={row.amount}
          onChange={(v) => patchRow(row.key, { amount: Number(v) || 0 })}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 110,
      align: 'right',
      render: (_, row) => formatMoney(toMinorUnits(row.amount * row.quantity)),
    },
    {
      title: '',
      key: 'remove',
      width: 48,
      align: 'center',
      render: (_, row) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          disabled={items.length === 1}
          onClick={() => setItems((rows) => rows.filter((r) => r.key !== row.key))}
        />
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
        {!customerId && (
          <Col xs={24} md={8}>
            <Text type="secondary">Customer</Text>
            <div style={{ marginTop: 4 }}>
              <CustomerPicker value={pickedCustomer} onChange={setPickedCustomer} />
            </div>
          </Col>
        )}
        <Col xs={24} md={customerId ? 12 : 8}>
          <Text type="secondary">Consultant</Text>
          <Select
            placeholder="Select consultant"
            style={{ width: '100%', marginTop: 4 }}
            allowClear
            showSearch
            optionFilterProp="label"
            value={consultantId}
            onChange={setConsultantId}
            options={(consultants ?? []).map((c) => ({
              label: `${c.name} · ${c.roleName}`,
              value: c.id,
            }))}
          />
        </Col>
        <Col xs={24} md={customerId ? 12 : 8}>
          <Text type="secondary">Date &amp; Time</Text>
          <DatePicker
            showTime
            format="DD MMM YYYY h:mm A"
            value={scheduledAt}
            onChange={(d) => d && setScheduledAt(d)}
            allowClear={false}
            style={{ width: '100%', marginTop: 4 }}
          />
        </Col>
      </Row>

      <Table<LineRow>
        rowKey="key"
        size="small"
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
      <Button
        icon={<PlusOutlined />}
        onClick={() => setItems((rows) => [...rows, newRow()])}
        style={{ marginTop: 12 }}
      >
        Add Service
      </Button>

      <Divider />

      <Row justify="end">
        <Col xs={24} md={12}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <Text>Total Amount</Text>
            <Text strong>{formatMoney(toMinorUnits(totalAmount))}</Text>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
            }}
          >
            <Text>Discount</Text>
            <InputNumber
              min={0}
              value={discount}
              onChange={(v) => setDiscount(Number(v) || 0)}
              style={{ width: 140 }}
              prefix="₹"
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
            }}
          >
            <Text>Round Off</Text>
            <InputNumber
              value={roundOff}
              onChange={(v) => setRoundOff(Number(v) || 0)}
              style={{ width: 140 }}
              prefix="₹"
            />
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <Text strong style={{ fontSize: 16 }}>
              Net Amount
            </Text>
            <Text strong style={{ fontSize: 16, color: colors.gold.primary }}>
              {formatMoney(toMinorUnits(netAmount))}
            </Text>
          </div>
        </Col>
      </Row>

      <Text type="secondary">Remarks</Text>
      <Input.TextArea
        rows={2}
        placeholder="Package suggestions / notes"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        style={{ marginTop: 4, marginBottom: 16 }}
      />

      <div style={{ textAlign: 'right' }}>
        <Button type="primary" size="large" onClick={openReview}>
          Review Booking →
        </Button>
      </div>

      <Modal
        title="Review Booking"
        open={reviewOpen}
        onOk={confirmSave}
        confirmLoading={createBooking.isPending}
        onCancel={() => setReviewOpen(false)}
        okText={submitLabel ?? 'Save and go to Receipt →'}
        cancelText="Back to Edit"
        width={620}
      >
        <Text type="secondary">Please confirm the booking details before saving.</Text>
        <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
          <Descriptions.Item label="Customer">{customer?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Consultant">{consultantName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Date & Time">
            {scheduledAt.format('DD MMM YYYY, h:mm A')}
          </Descriptions.Item>
        </Descriptions>

        <Table
          rowKey={(_, i) => String(i)}
          size="small"
          style={{ marginTop: 8 }}
          pagination={false}
          dataSource={reviewLines}
          columns={[
            { title: 'Category', dataIndex: 'category' },
            { title: 'Service', dataIndex: 'service' },
            { title: 'Qty', dataIndex: 'quantity', width: 60, align: 'right' },
            {
              title: 'Total',
              key: 'total',
              align: 'right',
              width: 110,
              render: (_, r) => formatMoney(toMinorUnits(r.lineTotal)),
            },
          ]}
        />

        <div style={{ marginTop: 12 }}>
          {[
            ['Total Amount', formatMoney(toMinorUnits(totalAmount))],
            ['Discount', `− ${formatMoney(toMinorUnits(discount))}`],
            ['Round Off', formatMoney(toMinorUnits(roundOff))],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}
            >
              <Text>{label}</Text>
              <Text>{value}</Text>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderTop: `1px solid ${colors.border}`,
              marginTop: 4,
            }}
          >
            <Text strong>Net Amount</Text>
            <Text strong style={{ color: colors.gold.primary }}>
              {formatMoney(toMinorUnits(netAmount))}
            </Text>
          </div>
        </div>

        {remarks ? (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Remarks: </Text>
            <Text>{remarks}</Text>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
