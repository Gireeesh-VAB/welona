'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRFQ, useUpdateRFQ, useUpsertSupplierQuote } from '@/hooks/useRFQ';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError, apiList } from '@/lib/api-client';
import { formatMoney } from '@shared/format';
import type { RFQItem, SupplierQuote, SupplierQuoteItem } from '@shared/types/admin-rfq';

const { Title, Text } = Typography;

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

function quoteStatusTag(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: 'default', label: 'Pending' },
    submitted: { color: 'blue', label: 'Submitted' },
    accepted: { color: 'green', label: 'Accepted' },
    rejected: { color: 'red', label: 'Rejected' },
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

const NEXT_STATUS: Record<string, { label: string; next: string; icon: React.ReactNode }> = {
  draft: { label: 'Mark as Sent', next: 'sent', icon: <SendOutlined /> },
  sent: { label: 'Start Comparing', next: 'comparing', icon: <SendOutlined /> },
  comparing: { label: 'Mark as Ordered', next: 'ordered', icon: <CheckCircleOutlined /> },
};

interface SupplierOption {
  id: string;
  name: string;
  code: string;
}

interface QuoteItemForm {
  productId: string;
  productName: string;
  unitPrice: number;
  deliveryDays: number;
  moq?: number;
}

export default function AdminRFQDetailPage() {
  const colors = useBrandColors();
  const router = useRouter();
  const params = useParams();
  const rfqId = params.id as string;
  const { message } = App.useApp();

  const { data: rfq, isLoading } = useRFQ(rfqId);
  const updateRFQ = useUpdateRFQ();
  const upsertQuote = useUpsertSupplierQuote();

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItemForm[]>([]);

  const searchSuppliers = async (searchVal: string) => {
    if (!searchVal || searchVal.length < 1) return;
    setSupplierLoading(true);
    try {
      const result = await apiList<SupplierOption>('/admin/suppliers', {
        query: { active: 'active', limit: 100, search: searchVal },
      });
      setSupplierOptions(result.items ?? []);
    } catch {
      // ignore
    } finally {
      setSupplierLoading(false);
    }
  };

  const openQuoteModal = () => {
    setSupplierId('');
    setSupplierOptions([]);
    setQuoteItems(
      (rfq?.items ?? []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: 0,
        deliveryDays: 1,
      })),
    );
    setQuoteModalOpen(true);
  };

  const updateQuoteItem = (idx: number, changes: Partial<QuoteItemForm>) => {
    setQuoteItems((items) => items.map((it, i) => (i === idx ? { ...it, ...changes } : it)));
  };

  const onSubmitQuote = async () => {
    if (!supplierId) {
      message.error('Select a supplier');
      return;
    }
    const invalid = quoteItems.find((i) => i.unitPrice <= 0 || i.deliveryDays < 1);
    if (invalid) {
      message.error('Set unit price and delivery days for all products');
      return;
    }
    try {
      await upsertQuote.mutateAsync({
        rfqId,
        body: {
          supplierId,
          items: quoteItems.map((i) => ({
            productId: i.productId,
            unitPrice: Math.round(i.unitPrice * 100),
            deliveryDays: i.deliveryDays,
            moq: i.moq,
          })),
        },
      });
      message.success('Supplier quote saved');
      setQuoteModalOpen(false);
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Failed to save quote');
    }
  };

  const advanceStatus = async () => {
    if (!rfq) return;
    const transition = NEXT_STATUS[rfq.status];
    if (!transition) return;
    try {
      await updateRFQ.mutateAsync({ id: rfqId, body: { status: transition.next } });
      message.success(`RFQ status updated to ${transition.next}`);
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60 }}>
        <Text style={{ color: colors.text.placeholder }}>RFQ not found.</Text>
      </div>
    );
  }

  const rfqItemColumns: ColumnsType<RFQItem> = [
    {
      title: 'Product',
      dataIndex: 'productName',
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text code style={{ fontSize: 11 }}>{row.productSku}</Text>
        </div>
      ),
    },
    { title: 'UOM', dataIndex: 'productUom', width: 80 },
    {
      title: 'Required Qty',
      dataIndex: 'requiredQty',
      width: 120,
      align: 'right',
      render: (v: number) => <Text style={{ color: colors.text.primary, fontWeight: 600 }}>{v}</Text>,
    },
  ];

  const quoteItemColumns: ColumnsType<SupplierQuoteItem> = [
    {
      title: 'Product',
      dataIndex: 'productName',
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
          <Text code style={{ fontSize: 11 }}>{row.productSku}</Text>
        </div>
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      width: 120,
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    {
      title: 'Delivery',
      dataIndex: 'deliveryDays',
      width: 100,
      align: 'center',
      render: (v: number) => `${v}d`,
    },
    {
      title: 'MOQ',
      dataIndex: 'moq',
      width: 80,
      align: 'right',
      render: (v: number | null) => v ?? '—',
    },
  ];

  const computeTotal = (quote: SupplierQuote): number =>
    rfq.items.reduce((sum, item) => {
      const qi = quote.items.find((q) => q.productId === item.productId);
      return sum + (qi ? qi.unitPrice * item.requiredQty : 0);
    }, 0);

  const transition = NEXT_STATUS[rfq.status];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/admin/procurement/rfq')}
          style={{ color: colors.text.secondary }}
        />
        <div style={{ flex: 1 }}>
          <Space align="center" size={12}>
            <Title level={3} style={{ color: colors.text.primary, marginBottom: 0 }}>
              RFQ {rfq.number ?? rfq.id.slice(0, 8)}
            </Title>
            {statusTag(rfq.status)}
          </Space>
          <div>
            <Text style={{ color: colors.text.placeholder, fontSize: 13 }}>
              Created {formatDate(rfq.createdAt)}{rfq.createdBy ? ` by ${rfq.createdBy}` : ''}
            </Text>
          </div>
        </div>
        {transition && (
          <Button
            type="primary"
            icon={transition.icon}
            loading={updateRFQ.isPending}
            onClick={advanceStatus}
          >
            {transition.label}
          </Button>
        )}
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={10}>
          <Card
            size="small"
            title={<span style={{ color: colors.text.primary }}>RFQ Details</span>}
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 16 }}
            styles={{ body: { padding: 16 } }}
          >
            <Descriptions column={1} size="small" labelStyle={{ color: colors.text.placeholder }}>
              {rfq.reason && (
                <Descriptions.Item label="Reason">
                  <Text style={{ color: colors.text.primary }}>{rfq.reason}</Text>
                </Descriptions.Item>
              )}
              {rfq.notes && (
                <Descriptions.Item label="Notes">
                  <Text style={{ color: colors.text.primary }}>{rfq.notes}</Text>
                </Descriptions.Item>
              )}
              {rfq.indentNumber && (
                <Descriptions.Item label="Linked Indent">
                  <Text code>{rfq.indentNumber}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Status">{statusTag(rfq.status)}</Descriptions.Item>
              <Descriptions.Item label="Created">
                <Text style={{ color: colors.text.primary }}>{formatDate(rfq.createdAt)}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            size="small"
            title={<span style={{ color: colors.text.primary }}>Products Required ({rfq.items.length})</span>}
            style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
            styles={{ body: { padding: 0 } }}
          >
            <Table<RFQItem>
              rowKey="id"
              columns={rfqItemColumns}
              dataSource={rfq.items}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Title level={5} style={{ color: colors.text.primary, marginBottom: 0 }}>
              Supplier Quotes ({rfq.supplierQuotes.length})
            </Title>
            {rfq.status !== 'ordered' && rfq.status !== 'cancelled' && (
              <Button type="default" icon={<PlusOutlined />} onClick={openQuoteModal}>
                Add Supplier Quote
              </Button>
            )}
          </div>

          {rfq.supplierQuotes.length === 0 && (
            <Card
              style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
              styles={{ body: { padding: 32, textAlign: 'center' } }}
            >
              <Text style={{ color: colors.text.placeholder }}>
                No supplier quotes yet. Add a quote to start comparing.
              </Text>
            </Card>
          )}

          {rfq.supplierQuotes.map((quote) => {
            const total = computeTotal(quote);
            return (
              <Card
                key={quote.id}
                size="small"
                style={{
                  background: colors.black.secondary,
                  border: `1px solid ${quote.isRecommended ? '#52c41a' : colors.border}`,
                  marginBottom: 16,
                  position: 'relative',
                }}
                styles={{ body: { padding: 16 } }}
              >
                {quote.isRecommended && (
                  <div
                    style={{
                      background: '#52c41a',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: '0 0 6px 0',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  >
                    RECOMMENDED
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    marginTop: quote.isRecommended ? 16 : 0,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: colors.text.primary, fontSize: 15 }}>
                      {quote.supplierName}
                    </div>
                    <Text code style={{ fontSize: 11 }}>{quote.supplierCode}</Text>
                  </div>
                  <Space size={8}>
                    {quoteStatusTag(quote.status)}
                    {quote.score != null && <Tag color="purple">Score: {quote.score}</Tag>}
                  </Space>
                </div>

                {quote.recommendationReason && (
                  <div
                    style={{
                      background: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      borderRadius: 4,
                      padding: '4px 8px',
                      marginBottom: 10,
                      fontSize: 12,
                      color: '#389e0d',
                    }}
                  >
                    {quote.recommendationReason}
                  </div>
                )}

                <Table<SupplierQuoteItem>
                  rowKey="id"
                  columns={quoteItemColumns}
                  dataSource={quote.items}
                  pagination={false}
                  size="small"
                />

                {total > 0 && (
                  <>
                    <Divider style={{ margin: '10px 0' }} />
                    <div style={{ textAlign: 'right' }}>
                      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Estimated Total: </Text>
                      <Text style={{ color: colors.gold.primary, fontWeight: 700, fontSize: 15 }}>
                        {formatMoney(total)}
                      </Text>
                    </div>
                  </>
                )}

                {quote.validUntil && (
                  <div style={{ marginTop: 8 }}>
                    <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                      Valid until: {formatDate(quote.validUntil)}
                    </Text>
                  </div>
                )}
              </Card>
            );
          })}
        </Col>
      </Row>

      <Modal
        title="Add Supplier Quote"
        open={quoteModalOpen}
        onCancel={() => setQuoteModalOpen(false)}
        onOk={onSubmitQuote}
        okText="Save Quote"
        confirmLoading={upsertQuote.isPending}
        width={640}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: colors.text.secondary }}>Supplier *</div>
          <Select
            showSearch
            placeholder="Search supplier..."
            filterOption={false}
            loading={supplierLoading}
            onSearch={searchSuppliers}
            value={supplierId || undefined}
            onChange={(val) => setSupplierId(val)}
            style={{ width: '100%' }}
            options={supplierOptions.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            notFoundContent={supplierLoading ? 'Searching…' : 'Type to search suppliers'}
          />
        </div>

        <div style={{ marginBottom: 8, fontSize: 13, color: colors.text.secondary, fontWeight: 600 }}>
          Prices per Product
        </div>
        <div style={{ fontSize: 12, color: colors.text.placeholder, marginBottom: 10 }}>
          Enter unit prices in ₹. Delivery days = estimated lead time.
        </div>

        {quoteItems.map((item, idx) => (
          <div key={item.productId} style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, color: colors.text.primary, fontWeight: 600 }}>
              {item.productName}
            </div>
            <Space size={12} style={{ display: 'flex', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 2 }}>Unit Price (₹)</div>
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  value={item.unitPrice}
                  onChange={(val) => updateQuoteItem(idx, { unitPrice: val ?? 0 })}
                  prefix="₹"
                  style={{ width: 150 }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 2 }}>Delivery Days</div>
                <InputNumber
                  min={1}
                  step={1}
                  value={item.deliveryDays}
                  onChange={(val) => updateQuoteItem(idx, { deliveryDays: val ?? 1 })}
                  addonAfter="days"
                  style={{ width: 130 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 2 }}>MOQ (optional)</div>
                <InputNumber
                  min={0}
                  step={1}
                  value={item.moq}
                  onChange={(val) => updateQuoteItem(idx, { moq: val ?? undefined })}
                  style={{ width: 100 }}
                  placeholder="—"
                />
              </div>
            </Space>
          </div>
        ))}
      </Modal>
    </div>
  );
}
