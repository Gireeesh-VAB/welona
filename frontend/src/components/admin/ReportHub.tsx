'use client';

import { Card, Col, Row, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { getAdminNavItem } from '@/config/adminNavigation';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Title, Text } = Typography;

interface ReportHubProps {
  /** Nav key of the parent — e.g. 'report', 'report-sales'. */
  navKey: string;
}

/** Generic tile-grid hub for any report group. */
export default function ReportHub({ navKey }: ReportHubProps) {
  const router = useRouter();
  const colors = useBrandColors();
  const root = getAdminNavItem(navKey);
  if (!root) return null;
  const children = root.children ?? [];

  return (
    <div>
      <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
        {root.label}
      </Title>
      <Text style={{ color: colors.text.placeholder }}>{root.description}</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {children.map((item) => (
          <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
            <Card
              hoverable
              onClick={() => router.push(item.path)}
              style={{
                background: colors.black.secondary,
                border: `1px solid ${colors.border}`,
                height: '100%',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: colors.gold.primary,
                  color: colors.text.onGold,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  marginBottom: 12,
                }}
              >
                <FileTextOutlined />
              </div>
              <Text strong style={{ color: colors.text.primary, fontSize: 15 }}>
                {item.label}
              </Text>
              <div>
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                  {item.description}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
