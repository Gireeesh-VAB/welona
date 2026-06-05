'use client';

import { useState } from 'react';
import { Card, Col, Empty, Input, Row, Spin, Statistic, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { DatabaseOutlined, InfoCircleOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBranchStock, type BranchStockRow } from '@/hooks/useBranchPortal';
import { formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  ok: 'green',
  low_stock: 'orange',
  out_of_stock: 'red',
};
const STATUS_LABEL: Record<string, string> = {
  ok: 'OK',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);

  // branchId is auto-resolved server-side from the staff JWT; no selector needed.
  const { data, isLoading } = useBranchStock({
    search: search || undefined,
    lowStockOnly: lowOnly || undefined,
    page,
    limit: 100,
  });

  const items = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const outOfStock = items.filter((r) => r.status === 'out_of_stock').length;
  const lowStock = items.filter((r) => r.status === 'low_stock').length;

  const columns: ColumnsType<BranchStockRow> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, row) => (
        <div>
          <Text style={{ fontWeight: 600, display: 'block' }}>{row.name}</Text>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.sku}</Text>
        </div>
      ),
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      align: 'center',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (v: number, row) => (
        <Text
          strong
          style={{
            color:
              row.status === 'ok'
                ? colors.text.primary
                : row.status === 'low_stock'
                  ? '#facc15'
                  : '#ef4444',
          }}
        >
          {v}
        </Text>
      ),
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorderLevel',
      align: 'center',
      render: (v: number | null) =>
        v != null ? (
          <Text style={{ color: colors.text.placeholder }}>{v}</Text>
        ) : (
          <Text style={{ color: colors.text.placeholder }}>—</Text>
        ),
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      align: 'center',
      filters: [
        { text: 'OK', value: 'ok' },
        { text: 'Low Stock', value: 'low_stock' },
        { text: 'Out of Stock', value: 'out_of_stock' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>
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
            Inventory
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Stock levels for your branch — assigned products only.{' '}
            <Tooltip title="Admin assigns products to branches via Master → Branches → Catalog. Stock is recorded via Admin → Inventory.">
              <InfoCircleOutlined style={{ color: colors.text.placeholder }} />
            </Tooltip>
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search products"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 220 }}
            allowClear
          />
          <Switch
            checkedChildren="Low stock only"
            unCheckedChildren="Show all"
            checked={lowOnly}
            onChange={(v) => {
              setLowOnly(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Total SKUs</Text>}
              value={total}
              prefix={<DatabaseOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Low Stock</Text>}
              value={lowStock}
              prefix={<WarningOutlined style={{ color: '#facc15' }} />}
              valueStyle={{ color: '#facc15' }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Out of Stock</Text>}
              value={outOfStock}
              prefix={<WarningOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#ef4444' }}
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
                  No stock data for your branch.
                  <br />
                  <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                    Admin assigns products and records stock via the Inventory module.
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
                pageSize: 100,
                total,
                onChange: setPage,
                showTotal: (t) => `${t} SKUs`,
              }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
