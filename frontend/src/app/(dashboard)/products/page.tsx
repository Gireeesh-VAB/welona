'use client';

import { useState } from 'react';
import { Card, Col, Empty, Input, Row, Spin, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined, SearchOutlined, ShoppingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBranchProducts, type BranchProduct } from '@/hooks/useBranchPortal';
import { formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBranchProducts({
    search: search || undefined,
    isActive: true,
    page,
    limit: 50,
  });

  const items = data?.items ?? [];
  const total = data?.meta.total ?? 0;

  const columns: ColumnsType<BranchProduct> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt={row.name}
              style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 4,
                background: colors.black.tertiary ?? '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShoppingOutlined style={{ color: colors.text.placeholder }} />
            </div>
          )}
          <div>
            <Text style={{ fontWeight: 600, display: 'block' }}>{row.name}</Text>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.sku}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      render: (v: string | null) => v ?? <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      render: (v: string | null) => v ?? <Text style={{ color: colors.text.placeholder }}>—</Text>,
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      align: 'center',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: colors.gold.primary }}>
          {formatMoney(v)}
        </Text>
      ),
    },
    {
      title: 'MRP',
      dataIndex: 'mrp',
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    {
      title: 'Tracking',
      key: 'tracking',
      align: 'center',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {row.trackBatches && <Tag color="blue" style={{ margin: 0 }}>Batch</Tag>}
          {row.trackExpiry && <Tag color="orange" style={{ margin: 0 }}>Expiry</Tag>}
          {!row.trackBatches && !row.trackExpiry && (
            <Text style={{ color: colors.text.placeholder }}>—</Text>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            Products
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Products assigned to your branch by admin.{' '}
            <Tooltip title="Admin assigns products to branches via Master → Branches → Catalog drawer.">
              <InfoCircleOutlined style={{ color: colors.text.placeholder }} />
            </Tooltip>
          </Text>
        </div>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by name or SKU"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 260 }}
          allowClear
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Assigned Products</Text>}
              value={total}
              prefix={<ShoppingOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Batch Tracked</Text>}
              value={items.filter((p) => p.trackBatches).length}
              valueStyle={{ color: colors.text.primary }}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
        <Spin spinning={isLoading}>
          {!isLoading && items.length === 0 ? (
            <Empty
              description={
                <span>
                  No products assigned to this branch yet.
                  <br />
                  <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                    Admin can assign products via Master → Branches → Catalog.
                  </Text>
                </span>
              }
            />
          ) : (
            <Table
              rowKey="id"
              dataSource={items}
              columns={columns}
              size="middle"
              pagination={{
                current: page,
                pageSize: 50,
                total,
                onChange: setPage,
                showTotal: (t) => `${t} products`,
              }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
