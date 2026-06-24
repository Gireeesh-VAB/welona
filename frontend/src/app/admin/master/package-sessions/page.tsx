'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  App, Button, Card, Form, Input, InputNumber, Modal,
  Popconfirm, Progress, Select, Space, Switch, Table, Tag, Typography,
} from 'antd';
import {
  DeleteOutlined, EditOutlined, MinusCircleOutlined,
  PlusOutlined, SearchOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useAdminPackageSessionMasters,
  useCreateAdminPackageSessionMaster,
  useUpdateAdminPackageSessionMaster,
  useDeleteAdminPackageSessionMaster,
  useAdminMasterPackages,
} from '@/hooks/useAdminPackageSessionMasters';
import { useAdminServices, useAdminProductOptions } from '@/hooks/useAdminServices';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';
import type { AdminPackageSessionMaster, AdminMasterPackage } from '@shared/types/admin-package-session-master';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  active: 'green', completed: 'blue', expired: 'orange', cancelled: 'red',
};

function PackagesDrawer({ master, onClose }: { master: AdminPackageSessionMaster; onClose: () => void }) {
  const { data: packages = [], isLoading } = useAdminMasterPackages(master.id);

  const columns: ColumnsType<AdminMasterPackage> = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customerName}</div>
          {r.customerPhone && <div style={{ fontSize: 11, color: '#888' }}>{r.customerPhone}</div>}
        </div>
      ),
    },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      render: v => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Sessions',
      key: 'sessions',
      width: 180,
      render: (_, r) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span>{r.usedSessions} used</span>
            <span style={{ color: '#888' }}>{r.totalSessions} total</span>
          </div>
          <Progress
            percent={r.totalSessions ? Math.round((r.usedSessions / r.totalSessions) * 100) : 0}
            size="small"
            strokeColor={r.usedSessions >= r.totalSessions ? '#52c41a' : '#1677ff'}
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 90,
      render: v => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Purchased',
      dataIndex: 'purchasedAt',
      width: 110,
      render: v => new Date(v).toLocaleDateString('en-GB'),
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      width: 110,
      render: v => v ? new Date(v).toLocaleDateString('en-GB') : <Text type="secondary">—</Text>,
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_, r) => (
        <Button
          size="small"
          icon={<UserOutlined />}
          href={`/customers/${r.customerId}`}
          onClick={e => e.stopPropagation()}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div>
          <div style={{ fontWeight: 700 }}>{master.name}</div>
          <div style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>Customer packages using this master</div>
        </div>
      }
      open
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnClose
    >
      <Table<AdminMasterPackage>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={packages}
        pagination={{ pageSize: 10, showTotal: t => `${t} packages` }}
        locale={{ emptyText: 'No customer packages linked to this master yet.' }}
        size="small"
      />
    </Modal>
  );
}

export default function PackageSessionMastersPage() {
  const { message } = App.useApp();
  const { data: masters = [], isLoading } = useAdminPackageSessionMasters();
  const { data: servicesData } = useAdminServices();
  const { data: productOptions = [] } = useAdminProductOptions();
  const create = useCreateAdminPackageSessionMaster();
  const update = useUpdateAdminPackageSessionMaster();
  const remove = useDeleteAdminPackageSessionMaster();

  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<AdminPackageSessionMaster | null>(null);
  const [viewMaster, setViewMaster] = useState<AdminPackageSessionMaster | null>(null);
  const [form] = Form.useForm();

  // Per-service session counts — keyed by serviceId
  const [perServiceSessions, setPerServiceSessions] = useState<Record<string, number>>({});

  const navItem     = getAdminNavItem('master-package-sessions');
  const allServices = (servicesData?.items ?? []).filter((s: any) => s.isActive);

  const watchedServiceIds     = Form.useWatch('serviceIds',     form) as string[] | undefined;
  const watchedPriceRupees    = Form.useWatch('priceRupees',    form) as number   | undefined;
  const watchedCollectAdvance = Form.useWatch('collectAdvance', form) as boolean  | undefined;
  const watchedInventoryItems = Form.useWatch('inventoryItems', form) as Array<{ productId?: string; quantityPerSession?: number }> | undefined;

  // When the selected service list changes, keep perServiceSessions in sync:
  // - add new services with their master default (customSessions from snapshot when editing, else service.sessions)
  // - remove entries for services that were deselected
  useEffect(() => {
    if (!modalOpen) return;
    const ids = watchedServiceIds ?? [];
    setPerServiceSessions((prev) => {
      const next: Record<string, number> = {};
      for (const id of ids) {
        if (prev[id] !== undefined) {
          next[id] = prev[id];
        } else {
          // Try snapshot first (editing), else service master sessions
          const snap = editing?.serviceSnapshots?.find((s) => s.serviceId === id);
          const svc  = allServices.find((s: any) => s.id === id) as any;
          next[id]   = snap?.customSessions ?? snap?.sessions ?? svc?.sessions ?? 1;
        }
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedServiceIds?.join(','), modalOpen]);

  // Total sessions = sum of all per-service sessions
  const totalSessions = useMemo(
    () => Object.values(perServiceSessions).reduce((s, v) => s + (v || 0), 0) || 1,
    [perServiceSessions],
  );

  const fmt = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

  // Pricing breakdown — each service is multiplied by its own session count
  const breakdown = (() => {
    const ids = watchedServiceIds ?? [];
    if (!ids.length) return null;

    const rows = ids.map((id) => {
      let src: { name: string; maxPrice: number; taxPercent: number; taxType: string } | null = null;
      if (editing) {
        const snap = editing.serviceSnapshots?.find(s => s.serviceId === id);
        if (snap) src = { name: snap.serviceName, maxPrice: snap.maxPrice, taxPercent: snap.taxPercent, taxType: snap.taxType };
      }
      if (!src) {
        const svc = allServices.find((s: any) => s.id === id);
        if (!svc) return null;
        src = { name: svc.name as string, maxPrice: svc.maxPrice as number, taxPercent: (svc.taxPercent as number) ?? 0, taxType: svc.taxType as string };
      }

      const sessions       = perServiceSessions[id] ?? 1;
      const pct            = src.taxPercent;
      const isInc          = src.taxType === 'inclusive';
      const subtotalPerSes = isInc ? Math.round((src.maxPrice * 100) / (100 + pct)) : src.maxPrice;
      const taxPerSes      = isInc ? src.maxPrice - subtotalPerSes : Math.round((src.maxPrice * pct) / 100);
      const totalPerSes    = subtotalPerSes + taxPerSes;
      // Accumulate across this service's own session count
      return {
        serviceId: id, name: src.name, pricePerSession: src.maxPrice,
        sessions, pct,
        subtotal: subtotalPerSes * sessions,
        tax:      taxPerSes      * sessions,
        total:    totalPerSes    * sessions,
        totalPerSes,
      };
    }).filter(Boolean) as {
      serviceId: string; name: string; pricePerSession: number;
      sessions: number; pct: number; subtotal: number; tax: number; total: number; totalPerSes: number;
    }[];

    // Product cost rows (additional inventory items added to the package)
    const productRows = (watchedInventoryItems ?? [])
      .filter((item) => item?.productId)
      .map((item) => {
        const prod = productOptions.find((p) => p.id === item.productId);
        if (!prod) return null;
        const qty       = item.quantityPerSession ?? 1;
        const unitPaise = prod.effectivePrice ?? 0;
        const total     = unitPaise * qty;
        return { productId: item.productId!, name: prod.name, unitPaise, qty, total, uom: prod.uom };
      })
      .filter(Boolean) as { productId: string; name: string; unitPaise: number; qty: number; total: number; uom: string }[];

    const grandSubtotal   = rows.reduce((s, r) => s + r.subtotal, 0);
    const grandTax        = rows.reduce((s, r) => s + r.tax, 0);
    const productTotal    = productRows.reduce((s, r) => s + r.total, 0);
    const grandTotal      = grandSubtotal + grandTax + productTotal;
    const sellingPaise    = Math.round((watchedPriceRupees ?? 0) * 100);
    const suggestedPaise  = grandTotal;
    const discountAmt     = suggestedPaise - sellingPaise;
    const discountPct     = suggestedPaise > 0 ? (discountAmt / suggestedPaise) * 100 : 0;

    return { rows, productRows, grandSubtotal, grandTax, productTotal, grandTotal, suggestedPaise, sellingPaise, discountAmt, discountPct };
  })();

  const filtered = masters.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => { setEditing(null); setModalOpen(true); };

  const openEdit = (row: AdminPackageSessionMaster) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleModalOpen = (open: boolean) => {
    if (!open) return;
    form.resetFields();
    if (editing) {
      form.setFieldsValue({
        name:           editing.name,
        description:    editing.description ?? '',
        serviceIds:     editing.serviceIds,
        priceRupees:    editing.price / 100,
        collectAdvance: editing.collectAdvance ?? false,
        advancePercent: editing.advancePercent ?? 0,
        isActive:       editing.isActive,
        inventoryItems: editing.inventoryItems ?? [],
      });
      // Seed per-service sessions from stored snapshots
      const seed: Record<string, number> = {};
      for (const snap of editing.serviceSnapshots ?? []) {
        seed[snap.serviceId] = snap.customSessions ?? snap.sessions ?? 1;
      }
      setPerServiceSessions(seed);
    } else {
      form.setFieldsValue({ priceRupees: 0, collectAdvance: false, advancePercent: 0, isActive: true, serviceIds: [], inventoryItems: [] });
      setPerServiceSessions({});
    }
  };

  const handleSave = async () => {
    const v = await form.validateFields();

    const inventoryItems = (v.inventoryItems ?? [])
      .filter((item: any) => item?.productId)
      .map((item: any) => {
        const product = productOptions.find(p => p.id === item.productId);
        return {
          productId:          item.productId,
          productName:        product?.name ?? item.productName ?? '',
          quantityPerSession: item.quantityPerSession ?? 1,
          chargeType:         'consume_only',
          uom:                product?.uom ?? item.uom ?? '',
        };
      });

    const selectedIds: string[] = v.serviceIds ?? [];

    // Build per-service session overrides from the perServiceSessions state
    const servicePriceOverrides = selectedIds
      .filter((id) => perServiceSessions[id] !== undefined)
      .map((id) => ({ serviceId: id, customSessions: perServiceSessions[id] }));

    // Total sessions = sum of all per-service sessions
    const computedDefaultSessions = selectedIds.reduce(
      (sum, id) => sum + (perServiceSessions[id] || 1),
      0,
    ) || 1;

    const body = {
      name:                  v.name,
      description:           v.description || undefined,
      serviceIds:            selectedIds,
      servicePriceOverrides,
      inventoryItems,
      defaultSessions:       computedDefaultSessions,
      price:                 Math.round((v.priceRupees ?? 0) * 100),
      taxPercent:            0,
      taxType:               'exclusive' as const,
      collectAdvance:        v.collectAdvance ?? false,
      advancePercent:        v.collectAdvance ? (v.advancePercent ?? 0) : 0,
      isActive:              v.isActive ?? true,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Package session master updated');
      } else {
        await create.mutateAsync(body);
        message.success('Package session master created');
      }
      setModalOpen(false);
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not save');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      message.success('Deleted');
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not delete');
    }
  };

  const columns: ColumnsType<AdminPackageSessionMaster> = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (v, row) => (
        <div>
          <Text strong>{v}</Text>
          {row.description && <div style={{ fontSize: 12, color: '#888' }}>{row.description}</div>}
        </div>
      ),
    },
    {
      title: 'Services Included',
      key: 'services',
      render: (_, row) =>
        row.services.length ? (
          <Space size={4} wrap>
            {row.services.map(s => <Tag key={s.id} color="blue">{s.name}</Tag>)}
          </Space>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Sessions',
      dataIndex: 'defaultSessions',
      width: 90,
      align: 'center',
      render: v => <Tag color="purple">{v}</Tag>,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      width: 110,
      align: 'right',
      render: v => formatMoney(v),
    },
    {
      title: 'Advance',
      key: 'advance',
      width: 100,
      align: 'center',
      render: (_, row) =>
        row.collectAdvance
          ? <Tag color="green">{row.advancePercent}%</Tag>
          : <Tag color="default">None</Tag>,
    },
    {
      title: 'Packages Sold',
      dataIndex: 'packageCount',
      width: 120,
      align: 'center',
      render: (v, row) => (
        <Button
          type="link"
          icon={<TeamOutlined />}
          style={{ padding: 0, fontWeight: 600 }}
          onClick={() => setViewMaster(row)}
        >
          {v ?? 0}
        </Button>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 90,
      align: 'center',
      render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm
            title="Delete this master?"
            onConfirm={() => handleDelete(row.id)}
            okText="Delete" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          {navItem?.label ?? 'Package Session Masters'}
        </Title>
        <Text type="secondary">{navItem?.description ?? 'Define session package templates used at branches.'}</Text>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name…"
            style={{ width: 280 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Master
          </Button>
        </div>

        <Table<AdminPackageSessionMaster>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} masters` }}
        />
      </Card>

      {/* Create / Edit modal — wide two-column layout */}
      <Modal
        title={editing ? 'Edit Package Session Master' : 'New Package Session Master'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={create.isPending || update.isPending}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Save Changes' : 'Create Package'}
        destroyOnClose
        afterOpenChange={handleModalOpen}
        width={960}
        styles={{ body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', padding: '16px 24px' } }}
      >
        <Form form={form} layout="vertical">
          {/* Two-column row */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

            {/* Left column — basic info */}
            <div style={{ width: 340, flexShrink: 0 }}>
              <Form.Item name="name" label="Master Name" rules={[{ required: true, message: 'Name is required' }]} style={{ marginBottom: 12 }}>
                <Input placeholder="e.g. Skin Brightening Package" />
              </Form.Item>

              <Form.Item name="description" label="Description" style={{ marginBottom: 12 }}>
                <Input.TextArea rows={2} placeholder="Optional description" />
              </Form.Item>

              <Form.Item
                name="serviceIds"
                label="Services Included"
                rules={[{ required: true, message: 'Select at least one service' }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  mode="multiple"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select services…"
                  options={allServices.map((s: any) => ({
                    label: `${s.name}${s.categoryName ? ` (${s.categoryName})` : ''}`,
                    value: s.id,
                  }))}
                />
              </Form.Item>

              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item name="priceRupees" label="Selling Price (₹)" style={{ flex: 1, marginBottom: 12 }}>
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                </Form.Item>
                <div style={{ flex: 1, marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.88)', marginBottom: 8 }}>Total Sessions</div>
                  <div style={{ height: 32, lineHeight: '32px', fontWeight: 700, fontSize: 15 }}>
                    {totalSessions}
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 6 }}>auto-sum</span>
                  </div>
                </div>
              </div>

              {breakdown && breakdown.suggestedPaise > 0 && (
                <div style={{
                  background: breakdown.discountAmt > 0 ? 'rgba(82,196,26,0.05)' : 'rgba(255,77,79,0.05)',
                  border: `1px solid ${breakdown.discountAmt > 0 ? 'rgba(82,196,26,0.3)' : 'rgba(255,77,79,0.3)'}`,
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: '#555' }}>Actual Value ({totalSessions} sessions)</span>
                    <span style={{ fontWeight: 600 }}>{fmt(breakdown.grandTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: '#555' }}>Selling Price</span>
                    <span style={{ fontWeight: 600 }}>{fmt(breakdown.sellingPaise)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, borderTop: '1px dashed #eee', paddingTop: 5, marginTop: 3 }}>
                    <span>{breakdown.discountAmt > 0 ? 'Customer Saves' : 'Premium over Actual'}</span>
                    <Tag color={breakdown.discountAmt > 0 ? 'success' : 'error'} style={{ margin: 0, fontSize: 12, padding: '0 6px' }}>
                      {Math.abs(breakdown.discountPct).toFixed(1)}%{breakdown.discountAmt > 0 ? ' OFF' : ' OVER'}
                    </Tag>
                  </div>
                </div>
              )}

              {/* Advance Payment */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 12, background: watchedCollectAdvance ? '#f0fdf4' : '#fafafa', borderColor: watchedCollectAdvance ? '#86efac' : '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: watchedCollectAdvance ? 10 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Collect Advance Payment</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Require partial payment upfront at booking</div>
                  </div>
                  <Form.Item name="collectAdvance" valuePropName="checked" style={{ margin: 0 }}>
                    <Switch size="small" />
                  </Form.Item>
                </div>
                {watchedCollectAdvance && (
                  <Form.Item
                    name="advancePercent"
                    label={<span style={{ fontSize: 12, color: '#475569' }}>Advance Amount (%)</span>}
                    rules={[{ required: true, type: 'number', min: 1, max: 100, message: 'Enter 1–100%' }]}
                    style={{ margin: 0 }}
                  >
                    <InputNumber
                      min={1} max={100}
                      controls={false}
                      style={{ width: '100%' }}
                      placeholder="e.g. 50"
                      addonAfter="%"
                    />
                  </Form.Item>
                )}
              </div>

              <Form.Item name="isActive" label="Status" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </div>

            {/* Right column — pricing & products */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Auto-applied products from Service Master */}
              {/* ── Per-service session configuration ─────────────────── */}
              {watchedServiceIds && watchedServiceIds.length > 0 && (
                <div style={{ border: '1px solid #d9f7be', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ background: '#f6ffed', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#237804', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Sessions per Service</span>
                    <span style={{ fontWeight: 400, color: '#52c41a' }}>configure independently</span>
                  </div>
                  {watchedServiceIds.map((id, idx) => {
                    const svc = allServices.find((s: any) => s.id === id) as any;
                    if (!svc) return null;
                    return (
                      <div
                        key={id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                          borderTop: idx > 0 ? '1px solid #f0f0f0' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#262626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {svc.name}
                          </div>
                          <div style={{ fontSize: 10, color: '#8c8c8c' }}>
                            default: {svc.sessions ?? 1} session{(svc.sessions ?? 1) !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <InputNumber
                          min={1}
                          size="small"
                          controls={false}
                          style={{ width: 70 }}
                          value={perServiceSessions[id] ?? svc.sessions ?? 1}
                          onChange={(v) =>
                            setPerServiceSessions((prev) => ({ ...prev, [id]: Number(v ?? 1) }))
                          }
                          addonAfter={<span style={{ fontSize: 10 }}>ses</span>}
                        />
                      </div>
                    );
                  })}
                  <div style={{ background: '#f6ffed', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11, borderTop: '1px solid #d9f7be' }}>
                    <span style={{ color: '#237804', fontWeight: 600 }}>Total Sessions</span>
                    <span style={{ fontWeight: 700, color: '#237804' }}>{totalSessions}</span>
                  </div>
                </div>
              )}

              {/* ── Auto-Applied Products ──────────────────────────────── */}
              {watchedServiceIds && watchedServiceIds.length > 0 && (() => {
                const rows = watchedServiceIds
                  .map((id) => {
                    const svc = allServices.find((s: any) => s.id === id) as any;
                    if (!svc) return null;
                    const items: any[] = svc.inventoryItems ?? [];
                    if (!items.length) return null;
                    return { id, name: svc.name as string, items };
                  })
                  .filter(Boolean) as { id: string; name: string; items: any[] }[];
                if (!rows.length) return null;
                return (
                  <div style={{ border: '1px solid #e6f4ff', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ background: '#e6f4ff', padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#0958d9', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Auto-Applied Products (Service Master)</span>
                      <span style={{ fontWeight: 400, color: '#4096ff' }}>read-only · per session</span>
                    </div>
                    {rows.map((row, i) => (
                      <div key={row.id} style={{ borderTop: i > 0 ? '1px solid #f0f0f0' : 'none', padding: '6px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#262626', marginBottom: 3 }}>{row.name}</div>
                        {row.items.map((item: any) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#595959', padding: '1px 0' }}>
                            <span>· {item.productName}</span>
                            <span style={{ color: '#8c8c8c' }}>{item.quantityPerSession} {item.productUom ?? ''} / session</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Pricing breakdown */}
              {breakdown && (
                <div style={{ background: 'rgba(22,119,255,0.04)', border: '1px solid rgba(22,119,255,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#1677ff', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pricing Breakdown</span>
                    {editing && <span style={{ fontWeight: 400, fontSize: 11, color: '#52c41a' }}>prices locked at creation</span>}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    {breakdown.rows.map((row) => (
                      <div key={row.serviceId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed #f0f0f0', gap: 6 }}>
                        <span style={{ fontSize: 11, flex: 1, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                        <span style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {fmt(row.totalPerSes)} × {row.sessions}{row.pct ? ` +${row.pct}%` : ''}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 65, textAlign: 'right' }}>{fmt(row.total)}</span>
                      </div>
                    ))}
                  </div>
                  {breakdown.productRows.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#fa8c16', marginBottom: 4 }}>Products</div>
                      {breakdown.productRows.map((row) => (
                        <div key={row.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed #f0f0f0', gap: 6 }}>
                          <span style={{ fontSize: 11, flex: 1, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                          <span style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {fmt(row.unitPaise)} × {row.qty} {row.uom}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 65, textAlign: 'right' }}>{fmt(row.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid rgba(22,119,255,0.2)', paddingTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: '#555' }}>Services Subtotal</span><span>{fmt(breakdown.grandSubtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: '#555' }}>GST</span><span>{fmt(breakdown.grandTax)}</span>
                    </div>
                    {breakdown.productTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                        <span style={{ color: '#555' }}>Products Cost</span><span>{fmt(breakdown.productTotal)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, borderTop: '1px solid rgba(22,119,255,0.2)', paddingTop: 5, marginTop: 3 }}>
                      <span>Actual Value</span>
                      <span style={{ color: '#1677ff' }}>{fmt(breakdown.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Products */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                Additional Products
                <span style={{ fontWeight: 400, fontSize: 11, color: '#888', marginLeft: 6 }}>optional · consumed per session</span>
              </div>
              <Form.List name="inventoryItems">
                {(fields, { add, remove: removeItem }) => (
                  <div>
                    {fields.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 3, fontSize: 11, color: '#888' }}>
                        <span style={{ flex: 1 }}>Product</span>
                        <span style={{ width: 80 }}>Qty / Session</span>
                        <span style={{ width: 32 }} />
                      </div>
                    )}
                    {fields.map(({ key, name, ...rest }) => (
                      <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <Form.Item {...rest} name={[name, 'productId']} style={{ flex: 1, margin: 0 }} rules={[{ required: true, message: 'Required' }]}>
                          <Select showSearch optionFilterProp="label" placeholder="Select product…" size="small"
                            options={productOptions.map(p => ({ label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`, value: p.id }))} />
                        </Form.Item>
                        <Form.Item {...rest} name={[name, 'quantityPerSession']} style={{ width: 80, margin: 0 }} rules={[{ required: true, message: 'Required' }]}>
                          <InputNumber min={1} precision={0} controls={false} placeholder="Qty" size="small" style={{ width: '100%' }} />
                        </Form.Item>
                        <Button icon={<MinusCircleOutlined />} danger type="text" size="small" onClick={() => removeItem(name)} style={{ flexShrink: 0 }} />
                      </div>
                    ))}
                    <Button type="dashed" size="small" onClick={() => add({ quantityPerSession: 1 })} icon={<PlusOutlined />} block>
                      Add Product
                    </Button>
                  </div>
                )}
              </Form.List>

            </div>
          </div>
        </Form>
      </Modal>

      {viewMaster && (
        <PackagesDrawer master={viewMaster} onClose={() => setViewMaster(null)} />
      )}
    </div>
  );
}
