'use client';

import { useMemo } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Card,
  Col,
  Empty,
  List,
  Row,
  Skeleton,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  GiftOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAdminAssigned, type AssignedOffer } from '@/hooks/useAdminAssigned';
import { formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

// ─── helpers ────────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  count,
  accent,
  loading,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      style={{
        background: colors.black.secondary,
        border: `1px solid ${colors.border}`,
        borderTop: `3px solid ${accent}`,
        marginBottom: 16,
      }}
      styles={{ body: { padding: 0 } }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          <span style={{ color: accent, fontSize: 18 }}>{icon}</span>
          <Text strong style={{ color: colors.text.primary, fontSize: 15 }}>
            {title}
          </Text>
          <Badge
            count={count}
            style={{
              background: count > 0 ? accent : colors.text.placeholder,
              fontWeight: 600,
            }}
            overflowCount={999}
          />
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ) : count === 0 ? (
        <div style={{ padding: 24 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                No {title.toLowerCase()} assigned to this branch yet.
              </Text>
            }
          />
        </div>
      ) : (
        <div style={{ padding: '0 4px 4px' }}>{children}</div>
      )}
    </Card>
  );
}

function OfferTag({ offer }: { offer: AssignedOffer }) {
  const from = dayjs(offer.fromDate);
  const to = dayjs(offer.toDate);
  return (
    <Tag color={offer.isCurrentlyActive ? 'green' : offer.isActive ? 'gold' : 'default'}>
      {offer.isCurrentlyActive
        ? '● Active'
        : offer.isActive && from.isAfter(dayjs())
          ? '◷ Upcoming'
          : '○ Expired'}
    </Tag>
  );
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function AdminAssignedPage() {
  const { data, isLoading, isError, dataUpdatedAt, refetch } = useAdminAssigned();

  const totalAssigned = data?.summary.totalAssigned ?? 0;
  const hasAnyData = totalAssigned > 0 || (data?.summary.totalStaff ?? 0) > 0;

  // Group services by category
  const servicesByCategory = useMemo(() => {
    if (!data?.services.length) return {};
    return data.services.reduce<Record<string, typeof data.services>>((acc, s) => {
      const cat = s.categoryName ?? 'Uncategorised';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {});
  }, [data?.services]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    if (!data?.products.length) return {};
    return data.products.reduce<Record<string, typeof data.products>>((acc, p) => {
      const cat = p.categoryName ?? 'Uncategorised';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [data?.products]);

  if (isError) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          showIcon
          message="Failed to load assigned data"
          description="Could not reach the server. Please refresh or try again later."
          action={
            <a onClick={() => refetch()} style={{ color: colors.gold.primary }}>
              Retry
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <AuditOutlined style={{ color: colors.gold.primary, fontSize: 22 }} />
            <Title level={3} style={{ color: colors.text.primary, margin: 0 }}>
              Admin Assigned
            </Title>
            {data && (
              <Tag
                color={hasAnyData ? 'gold' : 'default'}
                style={{ fontWeight: 600, fontSize: 12 }}
              >
                {data.branch.name} · {data.branch.code}
              </Tag>
            )}
          </div>
          <Text style={{ color: colors.text.placeholder }}>
            All data assigned to your branch by the administrator.
            {dataUpdatedAt > 0 && (
              <span style={{ marginLeft: 8 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                Updated {dayjs(dataUpdatedAt).format('hh:mm A')}
              </span>
            )}
          </Text>
        </div>
      </div>

      {/* ── Nothing assigned ───────────────────────────────────────────── */}
      {!isLoading && !hasAnyData && (
        <Card
          style={{
            background: colors.black.secondary,
            border: `2px dashed ${colors.border}`,
            textAlign: 'center',
            padding: 40,
          }}
        >
          <AuditOutlined
            style={{ fontSize: 48, color: colors.text.placeholder, marginBottom: 16 }}
          />
          <Title level={4} style={{ color: colors.text.placeholder, marginBottom: 8 }}>
            No Admin Assigned Data Available
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Your administrator hasn&apos;t assigned any data to this branch yet.
            <br />
            Contact your admin to assign services, products, offers and more.
          </Text>
        </Card>
      )}

      <Spin spinning={isLoading} tip="Loading assigned data…">
        {/* ── Summary strip ──────────────────────────────────────────────── */}
        {(isLoading || hasAnyData) && (
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            {[
              { label: 'Services', value: data?.summary.totalServices ?? 0, icon: <ToolOutlined />, accent: '#0ea5e9' },
              { label: 'Products', value: data?.summary.totalProducts ?? 0, icon: <ShoppingOutlined />, accent: colors.gold.primary },
              { label: 'Offers', value: data?.summary.totalOffers ?? 0, icon: <GiftOutlined />, accent: '#a855f7' },
              { label: 'Staff', value: data?.summary.totalStaff ?? 0, icon: <TeamOutlined />, accent: '#22c55e' },
              { label: 'Pay Modes', value: data?.summary.totalPaymentModes ?? 0, icon: <CreditCardOutlined />, accent: '#f97316' },
              { label: 'Categories', value: data?.summary.totalCategories ?? 0, icon: <TagsOutlined />, accent: '#ec4899' },
            ].map(({ label, value, icon, accent }) => (
              <Col xs={8} sm={4} key={label}>
                <Card
                  style={{
                    background: colors.black.secondary,
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                  }}
                  styles={{ body: { padding: '12px 8px' } }}
                >
                  <Statistic
                    title={
                      <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                        {label}
                      </Text>
                    }
                    value={isLoading ? '–' : value}
                    prefix={<span style={{ color: accent, fontSize: 14 }}>{icon}</span>}
                    valueStyle={{ color: colors.text.primary, fontSize: 18 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* ── Services ────────────────────────────────────────────────────── */}
        <SectionCard
          icon={<ToolOutlined />}
          title="Services"
          count={data?.summary.totalServices ?? 0}
          accent="#0ea5e9"
          loading={isLoading}
        >
          {Object.entries(servicesByCategory).map(([cat, svcs]) => (
            <div key={cat} style={{ padding: '8px 16px 0' }}>
              <Text
                style={{
                  color: colors.text.placeholder,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {cat}
              </Text>
              <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                {svcs.map((s) => (
                  <Col xs={24} sm={12} md={8} key={s.id}>
                    <div
                      style={{
                        padding: '10px 12px',
                        background: colors.black.tertiary ?? '#111',
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        borderLeft: '3px solid #0ea5e9',
                      }}
                    >
                      <Text style={{ fontWeight: 600, display: 'block', color: colors.text.primary }}>
                        {s.name}
                      </Text>
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {s.minPrice > 0 && (
                          <Text style={{ color: colors.gold.primary, fontSize: 12, fontWeight: 600 }}>
                            {s.minPrice === s.maxPrice
                              ? formatMoney(s.minPrice)
                              : `${formatMoney(s.minPrice)} – ${formatMoney(s.maxPrice)}`}
                          </Text>
                        )}
                        {s.taxPercent > 0 && (
                          <Tag style={{ margin: 0, fontSize: 11 }}>{s.taxPercent / 100}% tax</Tag>
                        )}
                        {s.hasMeasurements && (
                          <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>Measurements</Tag>
                        )}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </SectionCard>

        {/* ── Products ────────────────────────────────────────────────────── */}
        <SectionCard
          icon={<ShoppingOutlined />}
          title="Products"
          count={data?.summary.totalProducts ?? 0}
          accent={colors.gold.primary}
          loading={isLoading}
        >
          {Object.entries(productsByCategory).map(([cat, prods]) => (
            <div key={cat} style={{ padding: '8px 16px 0' }}>
              <Text
                style={{
                  color: colors.text.placeholder,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {cat}
              </Text>
              <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                {prods.map((p) => (
                  <Col xs={24} sm={12} md={8} key={p.id}>
                    <div
                      style={{
                        padding: '10px 12px',
                        background: colors.black.tertiary ?? '#111',
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        borderLeft: `3px solid ${colors.gold.primary}`,
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                      }}
                    >
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36, height: 36, borderRadius: 4,
                            background: colors.border, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                        >
                          <ShoppingOutlined style={{ color: colors.text.placeholder }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: 600, display: 'block', color: colors.text.primary, fontSize: 13 }}>
                          {p.name}
                        </Text>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                          <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{p.sku}</Text>
                          <Text style={{ color: colors.gold.primary, fontSize: 12, fontWeight: 600 }}>
                            {formatMoney(p.salePrice)}
                          </Text>
                          <Tag style={{ margin: 0, fontSize: 10 }}>{p.uom}</Tag>
                        </div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </SectionCard>

        {/* ── Offers / Packages ───────────────────────────────────────────── */}
        <SectionCard
          icon={<GiftOutlined />}
          title="Offers & Packages"
          count={data?.summary.totalOffers ?? 0}
          accent="#a855f7"
          loading={isLoading}
        >
          <div style={{ padding: '8px 16px 12px' }}>
            <Row gutter={[12, 12]}>
              {(data?.offers ?? []).map((offer) => (
                <Col xs={24} md={12} key={offer.id}>
                  <div
                    style={{
                      padding: 14,
                      background: colors.black.tertiary ?? '#111',
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      borderLeft: '3px solid #a855f7',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <Text strong style={{ color: colors.text.primary, display: 'block' }}>
                          {offer.packageName}
                        </Text>
                        <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                          {offer.packageCode}
                        </Text>
                      </div>
                      <OfferTag offer={offer} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                        {dayjs(offer.fromDate).format('DD MMM')} – {dayjs(offer.toDate).format('DD MMM YYYY')}
                      </Text>
                      {offer.minAmount > 0 && (
                        <Text style={{ color: colors.gold.primary, fontSize: 12, fontWeight: 600 }}>
                          {offer.minAmount === offer.maxAmount
                            ? formatMoney(offer.minAmount)
                            : `${formatMoney(offer.minAmount)} – ${formatMoney(offer.maxAmount)}`}
                        </Text>
                      )}
                    </div>
                    {offer.items.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {offer.items.map((item) => (
                          <Tag key={item.id} style={{ margin: 0, fontSize: 11 }}>
                            {item.serviceName} ×{item.quantity}
                          </Tag>
                        ))}
                      </div>
                    )}
                    {offer.remarks && (
                      <Text style={{ color: colors.text.placeholder, fontSize: 11, display: 'block', marginTop: 6 }}>
                        {offer.remarks}
                      </Text>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </SectionCard>

        {/* ── Staff ───────────────────────────────────────────────────────── */}
        <SectionCard
          icon={<TeamOutlined />}
          title="Branch Staff"
          count={data?.summary.totalStaff ?? 0}
          accent="#22c55e"
          loading={isLoading}
        >
          <div style={{ padding: '4px 16px 12px' }}>
            <List
              dataSource={data?.staff ?? []}
              renderItem={(s) => (
                <List.Item style={{ padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={s.avatarUrl ?? undefined}
                        style={{ background: colors.gold.primary, color: '#fff', fontWeight: 700 }}
                        size={40}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: colors.text.primary, fontWeight: 600 }}>{s.name}</Text>
                        <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                          {s.role}
                        </Tag>
                      </div>
                    }
                    description={
                      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                        {s.email}
                        {s.phone && ` · ${s.phone}`}
                      </Text>
                    }
                  />
                  <CheckCircleOutlined style={{ color: '#22c55e' }} />
                </List.Item>
              )}
            />
          </div>
        </SectionCard>

        {/* ── Payment Modes ───────────────────────────────────────────────── */}
        <SectionCard
          icon={<CreditCardOutlined />}
          title="Payment Modes"
          count={data?.summary.totalPaymentModes ?? 0}
          accent="#f97316"
          loading={isLoading}
        >
          <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(data?.paymentModes ?? []).map((pm) => (
              <div
                key={pm.id}
                style={{
                  padding: '8px 14px',
                  background: colors.black.tertiary ?? '#111',
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CreditCardOutlined style={{ color: '#f97316' }} />
                <Text style={{ color: colors.text.primary, fontWeight: 600 }}>{pm.name}</Text>
                
                {!pm.isActive && <Tag color="default" style={{ margin: 0, fontSize: 10 }}>Inactive</Tag>}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Categories ──────────────────────────────────────────────────── */}
        <SectionCard
          icon={<TagsOutlined />}
          title="Service Categories"
          count={data?.summary.totalCategories ?? 0}
          accent="#ec4899"
          loading={isLoading}
        >
          <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(data?.categories ?? []).map((cat) => (
              <Tooltip key={cat.id} title={cat.description ?? undefined}>
                <div
                  style={{
                    padding: '8px 14px',
                    background: colors.black.tertiary ?? '#111',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: cat.description ? 'help' : 'default',
                  }}
                >
                  <AppstoreOutlined style={{ color: '#ec4899' }} />
                  <Text style={{ color: colors.text.primary, fontWeight: 600 }}>{cat.name}</Text>
                  {!cat.isActive && <Tag color="default" style={{ margin: 0, fontSize: 10 }}>Inactive</Tag>}
                </div>
              </Tooltip>
            ))}
          </div>
        </SectionCard>
      </Spin>
    </div>
  );
}
