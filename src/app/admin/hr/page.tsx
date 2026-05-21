'use client';

import { Card, Col, Row, Typography } from 'antd';
import {
  ApartmentOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { getAdminNavItem } from '@/config/adminNavigation';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Title, Text } = Typography;

const childIcons: Record<string, ReactNode> = {
  'hr-designations': <SolutionOutlined />,
  'hr-departments': <ApartmentOutlined />,
  'hr-employee': <TeamOutlined />,
  'hr-user': <UserOutlined />,
};

/** HR hub — tile grid linking to each HR sub-module. */
export default function AdminHrPage() {
  const router = useRouter();
  const colors = useBrandColors();
  const hr = getAdminNavItem('hr')!;
  const children = hr.children ?? [];

  return (
    <div>
      <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
        {hr.label}
      </Title>
      <Text style={{ color: colors.text.placeholder }}>{hr.description}</Text>

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
                {childIcons[item.key]}
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
