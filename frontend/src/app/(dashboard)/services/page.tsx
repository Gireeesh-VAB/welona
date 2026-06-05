'use client';

import { useState } from 'react';
import { Card, Col, Empty, Input, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBranchServices, type BranchService } from '@/hooks/useBranchPortal';
import { formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const { data: services, isLoading } = useBranchServices();

  const filtered = (services ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );
  const active = filtered.filter((s) => s.isActive);

  const columns: ColumnsType<BranchService> = [
    {
      title: 'Service Name',
      dataIndex: 'name',
      render: (name: string) => (
        <Text style={{ fontWeight: 600 }}>{name}</Text>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Price Range',
      key: 'price',
      align: 'right',
      render: (_: unknown, row: BranchService) => (
        <Text strong style={{ color: colors.gold.primary }}>
          {row.minPrice > 0 ? formatMoney(row.minPrice) : '—'}
          {row.maxPrice > row.minPrice ? ` – ${formatMoney(row.maxPrice)}` : ''}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      align: 'center',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>Services</Title>
          <Text style={{ color: colors.text.placeholder }}>Treatment and service catalogue.</Text>
        </div>
        <Input prefix={<SearchOutlined />} placeholder="Search services" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} allowClear />
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Total</Text>}
              value={filtered.length} prefix={<AppstoreOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary }} loading={isLoading} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Active</Text>}
              value={active.length} valueStyle={{ color: colors.gold.primary }} loading={isLoading} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Avg Price</Text>}
              value={active.length ? Math.round(active.reduce((s, sv) => s + sv.minPrice, 0) / active.length / 100) : 0}
              prefix="₹" valueStyle={{ color: colors.text.primary }} loading={isLoading} />
          </Card>
        </Col>
      </Row>
      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
        <Spin spinning={isLoading}>
          {!isLoading && filtered.length === 0 ? (
            <Empty description="No services assigned to your branch yet. Ask your admin to assign services via Master → Branches → Catalog." />
          ) : (
            <Table rowKey="id" dataSource={filtered} columns={columns} pagination={{ pageSize: 20 }} size="middle" />
          )}
        </Spin>
      </Card>
    </div>
  );
}
