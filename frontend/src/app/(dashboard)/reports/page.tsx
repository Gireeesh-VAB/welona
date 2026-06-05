'use client';

import { useRouter } from 'next/navigation';
import { Card, Col, Row, Typography } from 'antd';
import { BarChartOutlined, CalendarOutlined, DollarOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

const REPORT_LINKS = [
  { icon: <DollarOutlined />, label: 'Sales Pipeline', desc: 'Enquiries, quotations, orders and invoices', path: '/sales' },
  { icon: <WalletOutlined />, label: 'Pending Payments', desc: 'Outstanding invoices to collect', path: '/pending-payments' },
  { icon: <CalendarOutlined />, label: 'Service Appointments', desc: 'Bookings calendar and history', path: '/bookings' },
  { icon: <TeamOutlined />, label: 'Customer Overview', desc: 'Customer profiles and history', path: '/customers' },
  { icon: <BarChartOutlined />, label: 'Analytics', desc: 'Live KPIs — enquiries, collection, staff', path: '/analytics' },
  { icon: <WalletOutlined />, label: 'Day Closer', desc: 'Daily cash reconciliation report', path: '/day-close' },
];

export default function ReportsPage() {
  const router = useRouter();
  return (
    <div>
      <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>Reports</Title>
      <Text style={{ color: colors.text.placeholder, display: 'block', marginBottom: 20 }}>
        Quick access to all reporting modules.
      </Text>
      <Row gutter={[16, 16]}>
        {REPORT_LINKS.map(({ icon, label, desc, path }) => (
          <Col xs={24} sm={12} md={8} key={path}>
            <Card
              hoverable
              onClick={() => router.push(path)}
              style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, cursor: 'pointer' }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: `${colors.gold.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: colors.gold.primary, flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <Text strong style={{ color: colors.text.primary, display: 'block' }}>{label}</Text>
                  <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{desc}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
