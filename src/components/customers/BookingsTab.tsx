'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Empty, Modal, Select, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBookings, useUpdateBooking } from '@/hooks/useCustomerModules';
import BookingForm from '@/components/bookings/BookingForm';
import { ApiClientError } from '@/lib/api-client';
import { BOOKING_STATUSES } from '@/lib/enums';
import { formatMoney, titleCase } from '@/lib/format';
import type { Booking } from '@/types/customer-modules';

const { Text } = Typography;
const statusOptions = BOOKING_STATUSES.map((s) => ({ label: titleCase(s), value: s }));

/** Format an ISO timestamp as date + time. */
function dateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Bookings module — service appointments for a customer. */
export default function BookingsTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const { data, isLoading } = useBookings(customerId);
  const updateBooking = useUpdateBooking(customerId);

  const [open, setOpen] = useState(false);

  const changeStatus = async (id: string, status: string) => {
    try {
      await updateBooking.mutateAsync({ id, body: { status } });
      message.success('Booking updated');
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not update booking');
    }
  };

  const columns: ColumnsType<Booking> = [
    {
      title: 'Booking',
      dataIndex: 'serviceName',
      render: (name: string, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {row.number ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.number}
            </Text>
          ) : null}
        </div>
      ),
    },
    { title: 'Scheduled', dataIndex: 'scheduledAt', render: (v: string) => dateTime(v) },
    {
      title: 'Net Amount',
      dataIndex: 'netAmount',
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 160,
      render: (s: string, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            size="small"
            value={s}
            style={{ width: 140 }}
            options={statusOptions}
            onChange={(value) => changeStatus(row.id, value)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Booking
        </Button>
      </div>

      <Table<Booking>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
        onRow={(row) => ({
          onClick: () => router.push(`/bookings/${row.id}/receipt`),
          style: { cursor: 'pointer' },
        })}
        locale={{ emptyText: <Empty description="No bookings yet" /> }}
      />

      <Modal
        title="New Booking"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={820}
        destroyOnClose
      >
        <BookingForm
          customerId={customerId}
          onSaved={(r) => {
            setOpen(false);
            router.push(`/bookings/${r.id}/receipt`);
          }}
        />
      </Modal>
    </div>
  );
}
