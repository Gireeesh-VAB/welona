'use client';

import { useMemo } from 'react';
import { Card, Col, Empty, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, GiftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useBranchPromotions, type BranchPromotion } from '@/hooks/useBranchPortal';
import { formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

function offerStatus(row: BranchPromotion): { label: string; color: string } {
  const now = dayjs();
  const from = dayjs(row.fromDate);
  const to = dayjs(row.toDate);
  if (!row.isActive) return { label: 'Inactive', color: 'default' };
  if (from.isAfter(now)) return { label: '◷ Upcoming', color: 'blue' };
  if (to.isBefore(now)) return { label: '○ Expired', color: 'default' };
  return { label: '● Active', color: 'green' };
}

export default function PromotionsPage() {
  // Show ALL assigned offers — active, upcoming, expired — so nothing is hidden
  const { data: offers, isLoading } = useBranchPromotions(false);

  const activeCount = useMemo(
    () => (offers ?? []).filter((o) => offerStatus(o).color === 'green').length,
    [offers],
  );
  const upcomingCount = useMemo(
    () => (offers ?? []).filter((o) => offerStatus(o).color === 'blue').length,
    [offers],
  );

  const columns: ColumnsType<BranchPromotion> = [
    {
      title: 'Package / Offer',
      key: 'offer',
      render: (_, row) => (
        <div>
          <Text strong style={{ display: 'block', color: colors.text.primary }}>
            {row.packageName}
          </Text>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.packageCode}</Text>
        </div>
      ),
    },
    {
      title: 'Valid Period',
      key: 'period',
      render: (_, row) => (
        <span style={{ color: colors.text.secondary }}>
          <CalendarOutlined style={{ marginRight: 4, color: colors.text.placeholder }} />
          {dayjs(row.fromDate).format('DD MMM YYYY')} — {dayjs(row.toDate).format('DD MMM YYYY')}
        </span>
      ),
    },
    {
      title: 'Price Range',
      key: 'price',
      align: 'right',
      render: (_, row) => (
        <Text style={{ color: colors.gold.primary, fontWeight: 600 }}>
          {row.minAmount > 0 && row.maxAmount > 0
            ? row.minAmount === row.maxAmount
              ? formatMoney(row.minAmount)
              : `${formatMoney(row.minAmount)} – ${formatMoney(row.maxAmount)}`
            : '—'}
        </Text>
      ),
    },
    {
      title: 'Services Included',
      key: 'services',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {row.items.slice(0, 3).map((item) => (
            <Tag key={item.id} color="gold" style={{ margin: 0 }}>
              {item.serviceName} ×{item.quantity}
            </Tag>
          ))}
          {row.items.length > 3 && <Tag>+{row.items.length - 3} more</Tag>}
          {row.items.length === 0 && (
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>No services listed</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: (_, row) => {
        const { label, color } = offerStatus(row);
        return <Tag color={color}>{label}</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
          Promotions &amp; Packages
        </Title>
        <Text style={{ color: colors.text.placeholder }}>
          All offers assigned to your branch — active, upcoming and past.
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>All Offers</Text>}
              value={offers?.length ?? 0}
              prefix={<GiftOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Active Now</Text>}
              value={activeCount}
              prefix={<GiftOutlined style={{ color: '#22c55e' }} />}
              valueStyle={{ color: '#22c55e' }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Upcoming</Text>}
              value={upcomingCount}
              prefix={<ClockCircleOutlined style={{ color: '#0ea5e9' }} />}
              valueStyle={{ color: '#0ea5e9' }}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
        <Spin spinning={isLoading}>
          {!isLoading && (!offers || offers.length === 0) ? (
            <Empty
              description={
                <span>
                  No offers assigned to this branch yet.
                  <br />
                  <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                    Admin assigns offers via Master → Create Offer → select your branch.
                  </Text>
                </span>
              }
            />
          ) : (
            <Table
              rowKey="id"
              dataSource={offers ?? []}
              columns={columns}
              size="middle"
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              rowClassName={(row) => {
                const { color } = offerStatus(row);
                return color === 'default' ? 'opacity-50' : '';
              }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
