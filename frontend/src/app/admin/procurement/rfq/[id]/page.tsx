'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
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
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  PlusOutlined,
  SendOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRFQ, useUpdateRFQ, useUpsertSupplierQuote, useAcceptRejectQuote } from '@/hooks/useRFQ';
import { useBrandColors } from '@/hooks/useBrandColors';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { ApiClientError, api, apiList } from '@/lib/api-client';
import { formatMoney } from '@shared/format';
import type { RFQItem, SupplierQuote, SupplierQuoteItem } from '@shared/types/admin-rfq';
import type { AdminPurchaseOrderCreateInput } from '@shared/schemas/admin-purchase-orders';

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
  const acceptReject = useAcceptRejectQuote();

  // Branches for PO creation
  const { data: branchesPage } = useAdminBranches({ limit: 100 });
  const branches = branchesPage?.items ?? [];

  // Quote modal state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItemForm[]>([]);

  // PO creation modal state
  const [poTarget, setPoTarget] = useState<SupplierQuote | null>(null);
  const [poBranchId, setPoBranchId] = useState('');
  const [poExpectedAt, setPoExpectedAt] = useState<string | null>(null);
  const [poNotes, setPoNotes] = useState('');
  const [poLoading, setPoLoading] = useState(false);

  const searchSuppliers = async (searchVal: string) => {
    setSupplierLoading(true);
    try {
      const firstProductId = rfq?.items?.[0]?.productId;
      const result = await apiList<SupplierOption>('/admin/suppliers', {
        query: {
          active: 'active',
          limit: 100,
          search: searchVal || undefined,
          productId: firstProductId,
        },
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
    // Pre-load suppliers filtered by the RFQ's products
    searchSuppliers('');
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

  const handleAcceptReject = async (quoteId: string, action: 'accept' | 'reject') => {
    try {
      await acceptReject.mutateAsync({ rfqId, quoteId, action });
      message.success(action === 'accept' ? 'Quote accepted' : 'Quote rejected');
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Failed to update quote');
    }
  };

  const openPoModal = (quote: SupplierQuote) => {
    setPoTarget(quote);
    setPoBranchId(rfq?.indentBranchId ?? '');
    setPoExpectedAt(null);
    setPoNotes('');
  };

  const onCreatePO = async () => {
    if (!poTarget || !rfq) return;
    if (!poBranchId) {
      message.error('Select a branch');
      return;
    }
    setPoLoading(true);
    try {
      const body: AdminPurchaseOrderCreateInput = {
        branchId: poBranchId,
        supplierId: poTarget.supplierId,
        expectedAt: poExpectedAt ?? undefined,
        notes: poNotes || undefined,
        fromIndentIds: rfq.indentId ? [rfq.indentId] : undefined,
        items: poTarget.items.map((qi) => {
          const rfqItem = rfq.items.find((r) => r.productId === qi.productId);
          return {
            productId: qi.productId,
            quantity: rfqItem?.requiredQty ?? 1,
            unitPrice: qi.unitPrice,
            taxRate: 0,
          };
        }),
      };
      await api.post('/admin/purchase-orders', body);
      // Advance RFQ to ordered
      await updateRFQ.mutateAsync({ id: rfqId, body: { status: 'ordered' } });
      message.success('Purchase Order created and RFQ marked as ordered');
      setPoTarget(null);
    } catch (err) {
      message.error(err instanceof ApiClientError ? err.message : 'Failed to create PO');
    } finally {
      setPoLoading(false);
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
  const canModifyQuotes = rfq.status !== 'ordered' && rfq.status !== 'cancelled';
  const hasAcceptedQuote = rfq.supplierQuotes.some((q) => q.status === 'accepted');

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
            {canModifyQuotes && (
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

          {/* ── Quote Comparison Matrix ──────────────────────────────────── */}
          {(() => {
            const submittedQuotes = rfq.supplierQuotes.filter((q) =>
              ['submitted', 'accepted', 'rejected'].includes(q.status),
            );
            if (submittedQuotes.length === 0) return null;

            // Per-product minimums for green-highlighting
            const minPriceByProduct: Record<string, number> = {};
            const minDeliveryByProduct: Record<string, number> = {};
            rfq.items.forEach((item) => {
              const prices: number[] = [];
              const deliveries: number[] = [];
              submittedQuotes.forEach((q) => {
                const qi = q.items.find((i) => i.productId === item.productId);
                if (qi) { prices.push(qi.unitPrice); deliveries.push(qi.deliveryDays); }
              });
              if (prices.length) minPriceByProduct[item.productId] = Math.min(...prices);
              if (deliveries.length) minDeliveryByProduct[item.productId] = Math.min(...deliveries);
            });

            // Quote-level aggregates
            const quoteTotals = submittedQuotes.map((q) => ({
              quoteId: q.id,
              total: rfq.items.reduce((sum, item) => {
                const qi = q.items.find((i) => i.productId === item.productId);
                return sum + (qi ? qi.unitPrice * item.requiredQty : 0);
              }, 0),
              avgDelivery: q.items.length
                ? Math.round(q.items.reduce((s, i) => s + i.deliveryDays, 0) / q.items.length)
                : null,
            }));

            const minTotal = Math.min(...quoteTotals.filter((t) => t.total > 0).map((t) => t.total));
            const minAvgDel = Math.min(
              ...quoteTotals.filter((t) => t.avgDelivery != null).map((t) => t.avgDelivery as number),
            );

            const border = `1px solid ${colors.border}`;
            const thStyle: React.CSSProperties = {
              padding: '7px 10px', fontSize: 11, fontWeight: 600,
              color: colors.text.placeholder, borderBottom: border, textAlign: 'center' as const,
            };

            return (
              <Card
                size="small"
                title={<span style={{ color: colors.text.primary, fontSize: 13 }}>Quote Comparison</span>}
                style={{ background: colors.black.secondary, border, marginBottom: 16 }}
                styles={{ body: { padding: 0, overflowX: 'auto' } }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: 'left', width: 160, paddingLeft: 12 }}>PRODUCT</th>
                      {submittedQuotes.map((q) => {
                        const accepted = q.status === 'accepted';
                        const rejected = q.status === 'rejected';
                        return (
                          <th key={q.id} style={{
                            ...thStyle, borderLeft: border, minWidth: 120,
                            background: accepted ? 'rgba(82,196,26,0.1)' : q.isRecommended ? 'rgba(250,173,20,0.08)' : 'transparent',
                            opacity: rejected ? 0.55 : 1,
                          }}>
                            <div style={{ fontWeight: 700, color: accepted ? '#52c41a' : colors.text.primary, fontSize: 12 }}>
                              {q.supplierName}
                            </div>
                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                              {q.isRecommended && !accepted && !rejected && <Tag color="gold" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>⭐ REC</Tag>}
                              {accepted && <Tag color="success" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>✓ Accepted</Tag>}
                              {rejected && <Tag color="error" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>Rejected</Tag>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.items.map((item, rowIdx) => (
                      <tr key={item.id} style={{ borderTop: border }}>
                        <td style={{ padding: '7px 12px' }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: colors.text.primary }}>{item.productName}</div>
                          <div style={{ fontSize: 10, color: colors.text.placeholder }}>{item.productUom} · need {item.requiredQty}</div>
                        </td>
                        {submittedQuotes.map((q) => {
                          const qi = q.items.find((i) => i.productId === item.productId);
                          const accepted = q.status === 'accepted';
                          const rejected = q.status === 'rejected';
                          const cheapest = qi != null && minPriceByProduct[item.productId] === qi.unitPrice;
                          const fastest  = qi != null && minDeliveryByProduct[item.productId] === qi.deliveryDays;
                          return (
                            <td key={q.id} style={{
                              textAlign: 'center', padding: '7px 10px', borderLeft: border,
                              background: accepted ? 'rgba(82,196,26,0.04)' : 'transparent',
                              opacity: rejected ? 0.55 : 1,
                            }}>
                              {qi ? (
                                <>
                                  <div style={{ fontWeight: cheapest ? 700 : 500, fontSize: 12, color: cheapest ? '#52c41a' : colors.text.primary }}>
                                    {formatMoney(qi.unitPrice)}
                                  </div>
                                  <div style={{ fontSize: 10, color: fastest ? '#52c41a' : colors.text.placeholder, marginTop: 1 }}>
                                    {fastest ? '✓ ' : ''}{qi.deliveryDays}d
                                  </div>
                                </>
                              ) : (
                                <span style={{ color: colors.text.placeholder, fontSize: 12 }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {/* Total */}
                    <tr style={{ borderTop: `2px solid ${colors.border}`, background: 'rgba(0,0,0,0.12)' }}>
                      <td style={{ padding: '7px 12px', fontSize: 11, color: colors.text.placeholder, fontWeight: 600 }}>TOTAL COST</td>
                      {quoteTotals.map((qt) => {
                        const q = submittedQuotes.find((x) => x.id === qt.quoteId)!;
                        const cheapest = qt.total > 0 && qt.total === minTotal;
                        return (
                          <td key={qt.quoteId} style={{ textAlign: 'center', padding: '7px 10px', borderLeft: border, opacity: q.status === 'rejected' ? 0.55 : 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: cheapest ? '#52c41a' : colors.text.primary }}>
                              {qt.total > 0 ? formatMoney(qt.total) : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    {/* Avg Delivery */}
                    <tr style={{ borderTop: border }}>
                      <td style={{ padding: '5px 12px', fontSize: 11, color: colors.text.placeholder, fontWeight: 600 }}>AVG DELIVERY</td>
                      {quoteTotals.map((qt) => {
                        const q = submittedQuotes.find((x) => x.id === qt.quoteId)!;
                        const fastest = qt.avgDelivery != null && qt.avgDelivery === minAvgDel;
                        return (
                          <td key={qt.quoteId} style={{ textAlign: 'center', padding: '5px 10px', borderLeft: border, opacity: q.status === 'rejected' ? 0.55 : 1 }}>
                            <span style={{ fontSize: 12, color: fastest ? '#52c41a' : colors.text.primary, fontWeight: fastest ? 700 : 400 }}>
                              {qt.avgDelivery != null ? `${qt.avgDelivery}d` : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    {/* Score */}
                    <tr style={{ borderTop: border }}>
                      <td style={{ padding: '5px 12px', fontSize: 11, color: colors.text.placeholder, fontWeight: 600 }}>SCORE</td>
                      {submittedQuotes.map((q) => (
                        <td key={q.id} style={{ textAlign: 'center', padding: '5px 10px', borderLeft: border, opacity: q.status === 'rejected' ? 0.55 : 1 }}>
                          {q.score != null ? (
                            <span style={{ fontWeight: 700, fontSize: 12, color: q.isRecommended ? '#faad14' : colors.text.primary }}>
                              {q.score.toFixed(1)}{q.isRecommended ? ' ⭐' : ''}
                            </span>
                          ) : <span style={{ color: colors.text.placeholder, fontSize: 11 }}>—</span>}
                        </td>
                      ))}
                    </tr>
                    {/* Action */}
                    {canModifyQuotes && (
                      <tr style={{ borderTop: border }}>
                        <td style={{ padding: '6px 12px', fontSize: 11, color: colors.text.placeholder, fontWeight: 600 }}>ACTION</td>
                        {submittedQuotes.map((q) => {
                          const accepted = q.status === 'accepted';
                          const rejected = q.status === 'rejected';
                          return (
                            <td key={q.id} style={{ textAlign: 'center', padding: '6px 8px', borderLeft: border }}>
                              {accepted && rfq.status !== 'ordered' && (
                                <Button size="small" type="primary" icon={<ShoppingCartOutlined />}
                                  onClick={() => openPoModal(q)}
                                  style={{ background: '#52c41a', borderColor: '#52c41a', fontSize: 11 }}>
                                  Create PO
                                </Button>
                              )}
                              {rfq.status === 'ordered' && accepted && (
                                <Tag icon={<FileDoneOutlined />} color="green" style={{ fontSize: 10 }}>PO Created</Tag>
                              )}
                              {!accepted && !rejected && !hasAcceptedQuote && q.status === 'submitted' && (
                                <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                                  loading={acceptReject.isPending}
                                  onClick={() => handleAcceptReject(q.id, 'accept')}
                                  style={{ fontSize: 11 }}>
                                  Accept
                                </Button>
                              )}
                              {rejected && <Tag color="error" style={{ fontSize: 10 }}>Rejected</Tag>}
                              {hasAcceptedQuote && !accepted && !rejected && (
                                <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>—</Text>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tfoot>
                </table>
              </Card>
            );
          })()}

          {rfq.supplierQuotes.map((quote) => {
            const total = computeTotal(quote);
            const isAccepted = quote.status === 'accepted';
            const isRejected = quote.status === 'rejected';

            return (
              <Card
                key={quote.id}
                size="small"
                style={{
                  background: colors.black.secondary,
                  border: `1px solid ${isAccepted ? '#52c41a' : isRejected ? '#ff4d4f' : quote.isRecommended ? '#faad14' : colors.border}`,
                  marginBottom: 16,
                  position: 'relative',
                  opacity: isRejected ? 0.65 : 1,
                }}
                styles={{ body: { padding: 16 } }}
              >
                {quote.isRecommended && !isAccepted && !isRejected && (
                  <div
                    style={{
                      background: '#faad14',
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
                    marginTop: quote.isRecommended && !isAccepted && !isRejected ? 16 : 0,
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
                  <Space size={8} wrap>
                    {quoteStatusTag(quote.status)}
                    {quote.score != null && <Tag color="purple">Score: {quote.score}</Tag>}
                    {/* Accept / Reject / Create PO buttons */}
                    {canModifyQuotes && quote.status === 'submitted' && !hasAcceptedQuote && (
                      <>
                        <Tooltip title="Accept this quote (others will be rejected)">
                          <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            loading={acceptReject.isPending}
                            onClick={() => handleAcceptReject(quote.id, 'accept')}
                          >
                            Accept
                          </Button>
                        </Tooltip>
                        <Tooltip title="Reject this quote">
                          <Button
                            size="small"
                            danger
                            icon={<CloseCircleOutlined />}
                            loading={acceptReject.isPending}
                            onClick={() => handleAcceptReject(quote.id, 'reject')}
                          >
                            Reject
                          </Button>
                        </Tooltip>
                      </>
                    )}
                    {isAccepted && rfq.status !== 'ordered' && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        onClick={() => openPoModal(quote)}
                        style={{ background: '#52c41a', borderColor: '#52c41a' }}
                      >
                        Create PO
                      </Button>
                    )}
                    {rfq.status === 'ordered' && isAccepted && (
                      <Tag icon={<FileDoneOutlined />} color="green">PO Created</Tag>
                    )}
                  </Space>
                </div>

                {quote.recommendationReason && !isAccepted && !isRejected && (
                  <div
                    style={{
                      background: '#fffbe6',
                      border: '1px solid #ffe58f',
                      borderRadius: 4,
                      padding: '4px 8px',
                      marginBottom: 10,
                      fontSize: 12,
                      color: '#874d00',
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

      {/* Add Supplier Quote Modal */}
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
            notFoundContent={supplierLoading ? 'Loading suppliers…' : 'No suppliers found — type to search all'}
          />
          {supplierOptions.length > 0 && (
            <div style={{ fontSize: 11, color: colors.text.placeholder, marginTop: 4 }}>
              Showing suppliers who supply the products in this RFQ
            </div>
          )}
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

      {/* Create PO from Quote Modal */}
      <Modal
        title={`Create Purchase Order — ${poTarget?.supplierName ?? ''}`}
        open={!!poTarget}
        onCancel={() => setPoTarget(null)}
        onOk={onCreatePO}
        okText={<><ShoppingCartOutlined /> Create PO</>}
        confirmLoading={poLoading}
        width={600}
        destroyOnClose
      >
        {poTarget && rfq && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 4 }}>Branch *</div>
              <Select
                showSearch
                placeholder="Select branch"
                value={poBranchId || undefined}
                onChange={setPoBranchId}
                style={{ width: '100%' }}
                filterOption={(input, opt) =>
                  (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={branches.map((b) => ({ value: b.id, label: b.branchName }))}
              />
              {rfq.indentBranchId && (
                <div style={{ fontSize: 11, color: colors.text.placeholder, marginTop: 4 }}>
                  Pre-filled from linked indent
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 4 }}>Expected Delivery</div>
              <DatePicker
                style={{ width: '100%' }}
                onChange={(_, dateStr) => setPoExpectedAt(dateStr ? new Date(dateStr as string).toISOString() : null)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 4 }}>Notes</div>
              <input
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                placeholder="Optional notes"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  background: 'transparent',
                  color: colors.text.primary,
                }}
              />
            </div>

            <div style={{ fontSize: 13, color: colors.text.secondary, fontWeight: 600, marginBottom: 8 }}>
              Order Items
            </div>
            <Table
              size="small"
              pagination={false}
              rowKey="productId"
              dataSource={poTarget.items.map((qi) => {
                const rfqItem = rfq.items.find((r) => r.productId === qi.productId);
                return {
                  productId: qi.productId,
                  productName: qi.productName,
                  productSku: qi.productSku,
                  qty: rfqItem?.requiredQty ?? 1,
                  unitPrice: qi.unitPrice,
                  lineTotal: (rfqItem?.requiredQty ?? 1) * qi.unitPrice,
                };
              })}
              columns={[
                {
                  title: 'Product',
                  dataIndex: 'productName',
                  render: (v: string, row: any) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{v}</div>
                      <Text code style={{ fontSize: 10 }}>{row.productSku}</Text>
                    </div>
                  ),
                },
                { title: 'Qty', dataIndex: 'qty', width: 60, align: 'center' },
                {
                  title: 'Unit Price',
                  dataIndex: 'unitPrice',
                  width: 110,
                  align: 'right',
                  render: (v: number) => formatMoney(v),
                },
                {
                  title: 'Line Total',
                  dataIndex: 'lineTotal',
                  width: 110,
                  align: 'right',
                  render: (v: number) => <Text strong style={{ color: colors.gold.primary }}>{formatMoney(v)}</Text>,
                },
              ]}
              summary={(rows) => {
                const grand = (rows as any[]).reduce((s, r) => s + r.lineTotal, 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3} align="right">
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: colors.gold.primary }}>{formatMoney(grand)}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
            {rfq.indentId && (
              <div style={{ marginTop: 10, fontSize: 12, color: colors.text.placeholder }}>
                Indent {rfq.indentNumber} will be linked to this PO.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
