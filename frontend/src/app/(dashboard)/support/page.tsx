'use client';

import { Button, Card, Col, Row, Typography } from 'antd';
import { MailOutlined, PhoneOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

const SUPPORT_ITEMS = [
  { icon: <PhoneOutlined />, label: 'Call Support', desc: 'Reach the Welona support team by phone', action: 'tel:+911800WELONA', btn: 'Call Now' },
  { icon: <MailOutlined />, label: 'Email Support', desc: 'Send us an email and get a response within 24 hours', action: 'mailto:support@welona.com', btn: 'Send Email' },
  { icon: <QuestionCircleOutlined />, label: 'Help Centre', desc: 'Browse FAQs, guides and documentation', action: '#', btn: 'Open Docs' },
];

export default function SupportPage() {
  return (
    <div>
      <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>Support</Title>
      <Text style={{ color: colors.text.placeholder, display: 'block', marginBottom: 20 }}>
        Get help from the Welona support team.
      </Text>
      <Row gutter={[16, 16]}>
        {SUPPORT_ITEMS.map(({ icon, label, desc, action, btn }) => (
          <Col xs={24} sm={8} key={label}>
            <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, textAlign: 'center' }}
              styles={{ body: { padding: 24 } }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${colors.gold.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24, color: colors.gold.primary }}>
                {icon}
              </div>
              <Text strong style={{ display: 'block', color: colors.text.primary, fontSize: 15, marginBottom: 6 }}>{label}</Text>
              <Text style={{ color: colors.text.placeholder, display: 'block', fontSize: 12, marginBottom: 16 }}>{desc}</Text>
              <Button type="primary" size="small" onClick={() => { if (action !== '#') window.open(action); }}>{btn}</Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
