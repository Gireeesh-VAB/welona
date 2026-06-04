'use client';

import { useState } from 'react';
import { Card, Table, Tag, Typography, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useGoodsReceipts } from '@/hooks/usePurchaseOrders';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminGoodsReceipt } from '@shared/types/admin-purchase-order';

const { Title, Text } = Typography;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminGoodsReceiptsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-grn')!;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useGoodsReceipts({ page, limit });

  const columns: ColumnsType<AdminGoodsReceipt> = [
    {
      title: 'GRN',
      dataIndex: 'number',
      width: 130,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Against PO',
      key: 'po',
      width: 130,
      render: (_v, g) => (g.poNumber ? <Tag color="blue">{g.poNumber}</Tag> : <Text style={{ color: colors.text.placeholder }}>—</Text>),
    },
    {
      title: 'Supplier / Branch',
      key: 'sb',
      width: 220,
      render: (_v, g) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{g.supplier?.name ?? '—'}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{g.branch.name}</Text>
        </div>
      ),
    },
    {
      title: 'Lines',
      key: 'lines',
      width: 80,
      align: 'center',
      render: (_v, g) => g.items.length,
    },
    {
      title: 'Units received',
      key: 'units',
      width: 120,
      align: 'center',
      render: (_v, g) => g.items.reduce((sum, it) => sum + it.quantity, 0),
    },
    {
      title: 'Received at',
      dataIndex: 'receivedAt',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [20, 50, 100],
    onChange: (p, sz) => {
      setPage(p);
      if (sz !== limit) setLimit(sz);
    },
    showTotal: (t) => `${t} receipt${t === 1 ? '' : 's'}`,
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
        <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
      </div>
      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <Space style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
            Goods receipts are created from a Purchase Order&apos;s &quot;Receive&quot; action and raise branch stock automatically.
          </Text>
        </Space>
        <Table<AdminGoodsReceipt>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 800 }}
          expandable={{
            expandedRowRender: (g) => (
              <Table
                rowKey={(r) => r.id}
                size="small"
                pagination={false}
                dataSource={g.items}
                columns={[
                  { title: 'Product', key: 'p', render: (_v, it) => `${it.product.name} (${it.product.sku})` },
                  { title: 'Quantity', dataIndex: 'quantity', width: 120, align: 'right' },
                ]}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}
