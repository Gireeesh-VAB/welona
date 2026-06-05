'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import { DeleteOutlined, EyeOutlined, PlusOutlined, RightOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  useShipments,
  useCreateShipment,
  useAdvanceShipment,
  useDeleteShipment,
} from '@/hooks/useShipments';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminShipment } from '@shared/types/admin-shipment';
import type { AdminShipmentCreateInput } from '@shared/schemas/admin-shipments';
import { SHIPMENT_PIPELINE, SHIPMENT_STAGES, type ShipmentStage } from '@shared/enums';

const { Title, Text } = Typography;

const STAGE_LABEL: Record<ShipmentStage, string> = {
  ordered: 'Ordered',
  in_transit: 'In transit',
  received: 'Received',
  qc: 'QC',
  stocked: 'Stocked',
  cancelled: 'Cancelled',
};
const STAGE_COLOR: Record<ShipmentStage, string> = {
  ordered: 'default',
  in_transit: 'blue',
  received: 'gold',
  qc: 'purple',
  stocked: 'green',
  cancelled: 'red',
};

function dt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface ShipForm {
  title: string;
  branchId?: string;
  supplier?: string;
  reference?: string;
  notes?: string;
}

export default function AdminTrackingPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-tracking')!;
  const { message } = App.useApp();


  const { data: branchesData } = useAdminBranches({ limit: 200, enabled: true });
  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    [branchesData],
  );

  const [stage, setStage] = useState<ShipmentStage | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useShipments({ stage, page, limit });

  const createShip = useCreateShipment();
  const advanceShip = useAdvanceShipment();
  const deleteShip = useDeleteShipment();
  const fail = (e: unknown, fb: string) => message.error(e instanceof ApiClientError ? e.message : fb);

  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<ShipForm>();
  const openCreate = () => { form.resetFields(); setCreateOpen(true); };
  const onCreate = async (v: ShipForm) => {
    const body: AdminShipmentCreateInput = {
      title: v.title.trim(),
      branchId: v.branchId || undefined,
      supplier: v.supplier?.trim() || undefined,
      reference: v.reference?.trim() || undefined,
      notes: v.notes?.trim() || undefined,
    };
    try {
      await createShip.mutateAsync(body);
      message.success('Shipment created');
      setCreateOpen(false);
    } catch (e) { fail(e, 'Could not create shipment'); }
  };

  const [active, setActive] = useState<AdminShipment | null>(null);
  const advance = async (toStage: ShipmentStage) => {
    if (!active) return;
    try {
      const updated = await advanceShip.mutateAsync({ id: active.id, stage: toStage });
      message.success(`Moved to ${STAGE_LABEL[toStage]}`);
      setActive(updated);
    } catch (e) { fail(e, 'Could not update stage'); }
  };
  const onDelete = async (s: AdminShipment) => {
    try { await deleteShip.mutateAsync(s.id); message.success('Deleted'); } catch (e) { fail(e, 'Delete failed'); }
  };

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: data?.meta.total ?? 0,
      active: items.filter((s) => s.stage !== 'stocked' && s.stage !== 'cancelled').length,
      stocked: items.filter((s) => s.stage === 'stocked').length,
    };
  }, [data]);

  const columns: ColumnsType<AdminShipment> = [
    { title: 'Tracking', dataIndex: 'number', width: 120, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    {
      title: 'Shipment',
      key: 't',
      render: (_v, s) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ color: colors.text.primary }}>{s.title}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
            {[s.supplier, s.branchName, s.reference].filter(Boolean).join(' · ') || '—'}
          </Text>
        </div>
      ),
    },
    { title: 'Stage', dataIndex: 'stage', width: 130, render: (s: ShipmentStage) => <Tag color={STAGE_COLOR[s]}>{STAGE_LABEL[s]}</Tag> },
    { title: 'Updated', dataIndex: 'updatedAt', width: 170, render: (v: string) => dt(v) },
    {
      title: '',
      key: 'a',
      width: 90,
      align: 'right',
      fixed: 'right',
      render: (_v, s) => (
        <Space size={4}>
          <Tooltip title="View / advance"><Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setActive(s)} /></Tooltip>
          <Popconfirm title={`Delete ${s.number}?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(s)}>
            <Tooltip title="Delete"><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page, pageSize: limit, total: data?.meta.total ?? 0, showSizeChanger: true, pageSizeOptions: [20, 50, 100],
    onChange: (p, sz) => { setPage(p); if (sz !== limit) setLimit(sz); },
    showTotal: (t) => `${t} shipments`,
  };

  // Steps index for the active shipment (cancelled shows as error on current).
  const activeStageIndex = active ? SHIPMENT_PIPELINE.indexOf(active.stage as (typeof SHIPMENT_PIPELINE)[number]) : -1;
  const nextStage = active && activeStageIndex >= 0 && activeStageIndex < SHIPMENT_PIPELINE.length - 1
    ? SHIPMENT_PIPELINE[activeStageIndex + 1]
    : null;
  const isTerminal = active?.stage === 'stocked' || active?.stage === 'cancelled';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Shipment</Button>
      </div>

      <Space size={12} style={{ display: 'flex', marginBottom: 16 }} wrap>
        {[
          { label: 'TOTAL', value: stats.total, color: colors.gold.primary },
          { label: 'IN PROGRESS', value: stats.active, color: colors.text.primary },
          { label: 'STOCKED (view)', value: stats.stocked, color: colors.status.success },
        ].map((k) => (
          <Card key={k.label} size="small" style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, minWidth: 160 }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>{k.label}</span>} value={k.value} valueStyle={{ color: k.color, fontWeight: 600 }} />
          </Card>
        ))}
      </Space>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <div style={{ marginBottom: 12 }}>
          <Select allowClear placeholder="All stages" value={stage} onChange={(v) => { setStage(v); setPage(1); }} style={{ width: 200 }}
            options={SHIPMENT_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))} />
        </div>
        <Table<AdminShipment> rowKey="id" loading={isLoading} columns={columns} dataSource={data?.items ?? []} pagination={pagination} size="middle" scroll={{ x: 800 }} />
      </Card>

      {/* Create modal */}
      <Modal title="New Shipment" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} okText="Create" confirmLoading={createShip.isPending} destroyOnClose width={520}>
        <Form<ShipForm> form={form} layout="vertical" onFinish={onCreate} requiredMark={false}>
          <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Enter a title' }]}>
            <Input placeholder="e.g. Vitamin C serum restock" maxLength={160} />
          </Form.Item>
          <Form.Item label="Destination branch" name="branchId">
            <Select allowClear showSearch placeholder="Pick a branch" options={branchOptions} filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
          </Form.Item>
          <Form.Item label="Supplier" name="supplier"><Input maxLength={120} placeholder="e.g. Acme Distributors" /></Form.Item>
          <Form.Item label="Reference" name="reference" tooltip="PO number, invoice no., AWB/tracking id…"><Input maxLength={80} placeholder="e.g. PO-0007" /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
        </Form>
      </Modal>

      {/* Detail drawer with stage timeline */}
      <Drawer
        title={active ? `${active.number} — ${active.title}` : 'Shipment'}
        open={Boolean(active)}
        onClose={() => setActive(null)}
        width={620}
        extra={
          active && !isTerminal ? (
            <Space>
              {nextStage && (
                <Popconfirm title={`Move to ${STAGE_LABEL[nextStage]}?`} okText="Advance" onConfirm={() => advance(nextStage)}>
                  <Button type="primary" icon={<RightOutlined />} loading={advanceShip.isPending}>Advance to {STAGE_LABEL[nextStage]}</Button>
                </Popconfirm>
              )}
              <Button danger icon={<CloseOutlined />} loading={advanceShip.isPending} onClick={() => advance('cancelled')}>Cancel</Button>
            </Space>
          ) : null
        }
      >
        {active && (
          <>
            <Space size={16} style={{ marginBottom: 16 }} wrap>
              <Tag color={STAGE_COLOR[active.stage]}>{STAGE_LABEL[active.stage]}</Tag>
              {active.branchName && <Text style={{ color: colors.text.placeholder }}>→ {active.branchName}</Text>}
              {active.supplier && <Text style={{ color: colors.text.placeholder }}>{active.supplier}</Text>}
              {active.reference && <Text code style={{ fontSize: 11 }}>{active.reference}</Text>}
            </Space>

            {active.stage !== 'cancelled' && (
              <Steps
                size="small"
                direction="horizontal"
                current={activeStageIndex < 0 ? 0 : activeStageIndex}
                style={{ marginBottom: 20 }}
                items={SHIPMENT_PIPELINE.map((s) => ({ title: STAGE_LABEL[s] }))}
              />
            )}

            <Text strong style={{ color: colors.text.primary }}>Stage history</Text>
            <Timeline
              style={{ marginTop: 12 }}
              items={active.events.map((e) => ({
                color: STAGE_COLOR[e.stage] === 'default' ? 'gray' : STAGE_COLOR[e.stage],
                children: (
                  <div>
                    <div style={{ color: colors.text.primary }}>
                      {STAGE_LABEL[e.stage]} {e.note ? <Text style={{ color: colors.text.placeholder }}>— {e.note}</Text> : null}
                    </div>
                    <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                      {dt(e.at)}{e.actorName ? ` · ${e.actorName}` : ''}
                    </Text>
                  </div>
                ),
              }))}
            />
            {active.notes && <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Notes: {active.notes}</Text>}
          </>
        )}
      </Drawer>
    </div>
  );
}
