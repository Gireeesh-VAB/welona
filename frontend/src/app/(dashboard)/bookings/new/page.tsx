'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import BookingForm from '@/components/bookings/BookingForm';

const { Title } = Typography;

/** New Appointment — book services for a customer and go to the receipt. */
export default function NewBookingPage() {
  const router = useRouter();
  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/bookings')}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Back to appointments
      </Button>
      <Title level={3} style={{ marginTop: 0 }}>
        New Appointment
      </Title>

      <Card>
        <BookingForm onSaved={(r) => router.push(`/bookings/${r.id}/receipt`)} />
      </Card>
    </div>
  );
}
