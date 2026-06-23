'use client';

import { useRef } from 'react';
import {
  Badge,
  Button,
  Card,
  Empty,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { useBranchGRNRecords, type BranchIndent, type BranchIndentItem } from '@/hooks/useBranchPortal';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function GRNPrintContent({ indent }: { indent: BranchIndent }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#111', padding: 24 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Goods Receipt Note</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>Branch Inventory Record</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
        <div>
          <strong>Ref (Indent #):</strong> {indent.number ?? indent.id}<br />
          <strong>Status:</strong> {indent.status.toUpperCase()}
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>Date Received:</strong> {fmt(indent.receivedAt)}<br />
          {indent.dispatchedAt && <><strong>Dispatched:</strong> {fmt(indent.dispatchedAt)}</>}
        </div>
      </div>

      {(indent.vehicleNumber || indent.driverName) && (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#555', borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
          {indent.vehicleNumber && <span style={{ marginRight: 16 }}>Vehicle: <strong>{indent.vehicleNumber}</strong></span>}
          {indent.driverName && <span>Driver: <strong>{indent.driverName}</strong></span>}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'left' }}>Product</th>
            <th style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'center', width: 80 }}>UOM</th>
            <th style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'center', width: 100 }}>Approved</th>
            <th style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'center', width: 100 }}>Received</th>
            {indent.items.some((it) => it.rejectedQty && it.rejectedQty > 0) && (
              <th style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'center', width: 120 }}>Rejected</th>
            )}
          </tr>
        </thead>
        <tbody>
          {indent.items.map((it) => (
            <tr key={it.id}>
              <td style={{ border: '1px solid #ddd', padding: '7px 10px' }}>
                <strong>{it.product.name}</strong>
                <br />
                <span style={{ color: '#777', fontSize: 11 }}>{it.product.sku}</span>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'center' }}>{it.product.uom}</td>
              <td style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'center' }}>
                {it.approvedQty ?? '—'}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>
                {it.receivedQty ?? '—'}
              </td>
              {indent.items.some((x) => x.rejectedQty && x.rejectedQty > 0) && (
                <td style={{ border: '1px solid #ddd', padding: '7px 10px', textAlign: 'center', color: '#dc2626' }}>
                  {it.rejectedQty ? `${it.rejectedQty}${it.rejectionReason ? ` — ${it.rejectionReason}` : ''}` : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {indent.notes && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
          <strong>Notes:</strong> {indent.notes}
        </div>
      )}

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777' }}>
        <div>Received by: ____________________</div>
        <div>Verified by: ____________________</div>
      </div>
      <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: '#aaa' }}>
        Generated {new Date().toLocaleString('en-IN')}
      </div>
    </div>
  );
}

export default function BranchGRNPage() {
  const router = useRouter();
  const [printTarget, setPrintTarget] = useState<BranchIndent | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { data: indents, isLoading } = useBranchGRNRecords();

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>GRN — ${printTarget?.number ?? ''}</title>
      <style>body{margin:0;padding:16px;font-family:Arial,sans-serif}@media print{body{margin:0}}</style>
      </head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  const itemCols: ColumnsType<BranchIndentItem> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, it) => (
        <div>
          <Text strong>{it.product.name}</Text>
          <Text style={{ color: colors.text.placeholder, fontSize: 11 }}> · {it.product.sku}</Text>
        </div>
      ),
    },
    { title: 'UOM', key: 'uom', align: 'center', width: 70, render: (_, it) => <Tag>{it.product.uom}</Tag> },
    {
      title: 'Approved',
      dataIndex: 'approvedQty',
      align: 'center',
      width: 90,
      render: (v: number | null) => (
        <Text strong style={{ color: v != null ? '#3b82f6' : colors.text.placeholder }}>
          {v ?? '—'}
        </Text>
      ),
    },
    {
      title: 'Received',
      dataIndex: 'receivedQty',
      align: 'center',
      width: 90,
      render: (v: number | null) => (
        <Text strong style={{ color: v != null ? '#22c55e' : colors.text.placeholder }}>
          {v ?? '—'}
        </Text>
      ),
    },
    {
      title: 'Rejected',
      key: 'rej',
      align: 'center',
      width: 120,
      render: (_, it) =>
        it.rejectedQty && it.rejectedQty > 0 ? (
          <Tag color="red" title={it.rejectionReason ?? undefined}>
            {it.rejectedQty} {it.rejectionReason ? '⚠' : ''}
          </Tag>
        ) : (
          <Text style={{ color: colors.text.placeholder }}>—</Text>
        ),
    },
  ];

  const columns: ColumnsType<BranchIndent> = [
    {
      title: 'GRN Ref',
      key: 'number',
      width: 130,
      render: (_, row) => (
        <Text code style={{ fontWeight: 700, fontSize: 13 }}>{row.number ?? row.id.slice(-8)}</Text>
      ),
    },
    {
      title: 'Date Received',
      key: 'receivedAt',
      width: 140,
      render: (_, row) => (
        <Text style={{ fontSize: 12, color: colors.text.placeholder }}>{fmt(row.receivedAt)}</Text>
      ),
    },
    {
      title: 'Products',
      key: 'items',
      render: (_, row) => {
        const first = row.items[0];
        return first ? (
          <div>
            <Text strong>{first.product.name}</Text>
            {row.items.length > 1 && (
              <Badge count={`+${row.items.length - 1}`} style={{ marginLeft: 6, background: colors.gold.primary, color: colors.text.onGold }} />
            )}
          </div>
        ) : <Text style={{ color: colors.text.placeholder }}>—</Text>;
      },
    },
    {
      title: 'Received Qty',
      key: 'receivedQty',
      align: 'center',
      width: 120,
      render: (_, row) => {
        const total = row.items.reduce((s, it) => s + (it.receivedQty ?? 0), 0);
        return <Text strong style={{ color: '#22c55e' }}>{total}</Text>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'closed' ? 'green' : 'cyan'}>
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, row) => (
        <Button
          size="small"
          icon={<PrinterOutlined />}
          onClick={() => setPrintTarget(row)}
        >
          Print GRN
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/inventory')}
          style={{ borderColor: colors.border, color: colors.text.secondary }}
        >
          Back to Inventory
        </Button>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 2 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            GRN Records
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Goods Receipt Notes — stock delivered from HO indent requests.
          </Text>
        </div>
      </div>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <Spin spinning={isLoading}>
          {!isLoading && (!indents || indents.length === 0) ? (
            <Empty description="No goods receipts yet. GRN records appear after branch stock requests are delivered." />
          ) : (
            <Table<BranchIndent>
              rowKey="id"
              dataSource={indents ?? []}
              columns={columns}
              size="middle"
              pagination={{ pageSize: 20, showTotal: (t) => `${t} receipt${t === 1 ? '' : 's'}` }}
              expandable={{
                expandedRowRender: (row) => (
                  <div style={{ margin: '0 32px', paddingBottom: 8 }}>
                    <Table<BranchIndentItem>
                      rowKey="id"
                      dataSource={row.items}
                      columns={itemCols}
                      size="small"
                      pagination={false}
                    />
                    {row.notes && (
                      <Text style={{ display: 'block', marginTop: 8, fontSize: 12, color: colors.text.placeholder }}>
                        Notes: {row.notes}
                      </Text>
                    )}
                  </div>
                ),
              }}
            />
          )}
        </Spin>
      </Card>

      {/* Print Modal */}
      <Modal
        title={`Print GRN — ${printTarget?.number ?? ''}`}
        open={!!printTarget}
        onCancel={() => setPrintTarget(null)}
        onOk={handlePrint}
        okText={<><PrinterOutlined /> Print</>}
        width={700}
        destroyOnClose
      >
        {printTarget && (
          <div ref={printRef}>
            <GRNPrintContent indent={printTarget} />
          </div>
        )}
      </Modal>
    </div>
  );
}
