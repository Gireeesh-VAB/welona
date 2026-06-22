'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  EyeOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useRFQs, useCreateRFQ } from '@/hooks/useRFQ';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError, apiList } from '@/lib/api-client';
import type { ProcurementRFQ } from '@shared/types/admin-rfq';

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'comparing', label: 'Comparing' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function statusTag(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    draft: { color: 'default', label: 'Draft' },
    sent: { color: 'blue', label: 'Sent' },
    comparing: { color: 'orange', label: 'Comparing' },
    ordered: { color: 'green', label: 'Ordered' },
    cancelled: { color: 'red', label: 'Cancelled' },
  };
  const cfg = map[status] ?? { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ProductRow {
  productId: string;
  productName: string;
  productSku: string;
  productUom: string;
  requiredQty: number;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

export default function AdminRFQListPage() {
  const colors = useBrandColors();
  const router = useRouter();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useRFQs({
    search: search || undefined,
    status: status || undefined,
    page,
    limit,
  });

  const createRFQ = useCreateRFQ();

  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { productId: '', productName: '', productSku: '', productUom: '', requiredQty: 1 },
  ]);
  const [productOptions, setProductOptions] = useState<ProductOption[][]>([[]]);
  const [productSearchLoading, setProductSearchLoading] = useState<boolean[]>([false]);

  const searchProducts = async (rowIndex: number, searchVal: string) => {
    if (!searchVal || searchVal.length < 2) return;
    const newLoading = [...productSearchLoading];
    newLoading[rowIndex] = true;
    setProductSearchLoading(newLoading);
    try {
      const result = await apiList<ProductOption>('/admin/products', {
        query: { search: searchVal, isActive: 'true', limit: 50 },
      });
      const newOptions = [...productOptions];
      newOptions[rowIndex] = result.items ?? [];
      setProductOptions(newOptions);
    } catch {
      // ignore
    } finally {
      const newL = [...productSearchLoading];
      newL[rowIndex] = false;
      setProductSearchLoading(newL);
    }
  };

  const addProductRow = () => {
    setProductRows((rows) => [
      ...rows,
      { productId: '', productName: '', productSku: '', productUom: '', requiredQty: 1 },
    ]);
    setProductOptions((opts) => [...opts, []]);
    setProductSearchLoading((l) => [...l, false]);
  };

  const removeProductRow = (idx: number) => {
    setProductRows((rows) => rows.filter((_, i) => i !== idx));
    setProductOptions((opts) => opts.filter((_, i) => i !== idx));
    setProductSearchLoading((l) => l.filter((_, i) => i !== idx));
  };

  const updateProductRow = (idx: number, changes: Partial<ProductRow>) => {
    setProductRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...changes } : r)));
  };

  const openCreateModal = () => {
    setReason('');
    setProductRows([{ productId: '', productName: '', productSku: '', productUom: '', requiredQty: 1 }]);
    setProductOptions([[]]);
    setProductSearchLoading([false]);
    setModalOpen(true);
  };

  const onSubmit = async () => {
    const validRows = productRows.filter((r) => r.productId && r.requiredQty > 0);
    if (validRows.length === 0) {
      message.error('Add at least one product with a quantity');
      return;
    }
    try {
      await createRFQ.mutateAsync({
        reason: reason.trim() || undefined,
        items: validRows.map((r) => ({ productId: r.productId, requiredQty: r.requiredQty })),
      });
      message.success('RFQ created');
      setModalOpen(false);
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Failed to create RFQ');
    }
  };

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: data?.meta.total ?? 0,
      draft: items.filter((r) => r.status === 'draft').length,
      comparing: items.filter((r) => r.status === 'comparing').length,
    };
  }, [data]);

  const columns: ColumnsType<ProcurementRFQ> = useMemo(
    () => [
      {
        title: 'RFQ #',
        dataIndex: 'number',
        width: 140,
        render: (v: string | null, row) => (
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v ?? row.id.slice(0, 8)}</div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        render: (v: string) => statusTag(v),
      },
      {
        title: 'Items',
        key: 'items',
        width: 80,
        align: 'center',
        render: (_v: unknown, row) => <Text style={{ color: colors.text.primary }}>{row.items.length}</Text>,
      },
      {
        title: 'Supplier Quotes',
        key: 'quotes',
        width: 120,
        align: 'center',
        render: (_v: unknown, row) => <Text style={{ color: colors.text.primary }}>{row.supplierQuotes.length}</Text>,
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        width: 200,
        render: (v: string | null) =>
          v ? (
            <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{v}</Text>
          ) : (
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
          ),
      },
      {
        title: 'Created By',
        dataIndex: 'createdBy',
        width: 140,
        render: (v: string | null) => <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{v ?? '—'}</Text>,
      },
      {
        title: 'Created',
        dataIndex: 'createdAt',
        width: 120,
        render: (v: string) => <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{formatDate(v)}</Text>,
      },
      {
        title: '',
        key: 'actions',
        width: 80,
        align: 'right',
        fixed: 'right',
        render: (_v: unknown, row) => (
          <Tooltip title="View">
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/procurement/rfq/${row.id}`);
              }}
            />
          </Tooltip>
        ),
      },
    ],
    [colors.text.placeholder, colors.text.primary, colors.text.secondary, router],
  );

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50],
    onChange: (p, sz) => {
      setPage(p);
      if (sz !== limit) setLimit(sz);
    },
    showTotal: (t) => `${t} RFQ${t === 1 ? '' : 's'}`,
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            Procurement RFQs
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Create and manage Requests for Quotation from suppliers
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Create RFQ
        </Button>
      </div>

      <Space size={12} style={{ display: 'flex', marginBottom: 16 }} wrap>
        <Card
          size="small"
          style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, minWidth: 160 }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Statistic
            title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>TOTAL RFQs</span>}
            value={stats.total}
            valueStyle={{ color: colors.gold.primary, fontWeight: 600 }}
          />
        </Card>
        <Card
          size="small"
          style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, minWidth: 160 }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Statistic
            title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>DRAFT (IN VIEW)</span>}
            value={stats.draft}
            valueStyle={{ color: colors.text.primary, fontWeight: 600 }}
          />
        </Card>
        <Card
          size="small"
          style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, minWidth: 160 }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Statistic
            title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>COMPARING (IN VIEW)</span>}
            value={stats.comparing}
            valueStyle={{ color: colors.status?.warning ?? '#faad14', fontWeight: 600 }}
          />
        </Card>
      </Space>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search RFQ number"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 360, width: '100%' }}
          />
          <Select
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            style={{ width: 180 }}
            options={STATUS_OPTIONS}
          />
        </div>

        <Table<ProcurementRFQ>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 900 }}
          onRow={(row) => ({
            onClick: (e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button')) return;
              router.push(`/admin/procurement/rfq/${row.id}`);
            },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Modal
        title="Create RFQ"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText="Create RFQ"
        confirmLoading={createRFQ.isPending}
        width={640}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: colors.text.secondary }}>Reason (optional)</div>
          <Input
            placeholder="e.g. Monthly restock, urgent low-stock items"
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 8, fontSize: 13, color: colors.text.secondary, fontWeight: 600 }}>
          Products
        </div>

        {productRows.map((row, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Select
                showSearch
                placeholder="Search product..."
                filterOption={false}
                loading={productSearchLoading[idx]}
                onSearch={(val) => searchProducts(idx, val)}
                value={row.productId || undefined}
                onChange={(val) => {
                  const opt = (productOptions[idx] ?? []).find((o) => o.id === val);
                  if (opt) {
                    updateProductRow(idx, {
                      productId: opt.id,
                      productName: opt.name,
                      productSku: opt.sku,
                      productUom: opt.uom,
                    });
                  }
                }}
                style={{ width: '100%' }}
                options={(productOptions[idx] ?? []).map((o) => ({
                  value: o.id,
                  label: `${o.name} (${o.sku})`,
                }))}
                notFoundContent={productSearchLoading[idx] ? 'Searching…' : 'Type to search products'}
              />
            </div>
            <InputNumber
              min={1}
              step={1}
              value={row.requiredQty}
              onChange={(val) => updateProductRow(idx, { requiredQty: val ?? 1 })}
              placeholder="Qty"
              style={{ width: 100 }}
              addonAfter={row.productUom || 'Units'}
            />
            {productRows.length > 1 && (
              <Button
                type="text"
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => removeProductRow(idx)}
              />
            )}
          </div>
        ))}

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addProductRow}
          style={{ width: '100%', marginTop: 4 }}
        >
          Add Product
        </Button>
      </Modal>
    </div>
  );
}
