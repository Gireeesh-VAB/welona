'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { App, Button, Card, Space, Spin } from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  PlusOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useBooking } from '@/hooks/useAppointments';
import { formatMoney, titleCase } from '@shared/format';

/** Format an ISO timestamp as date + time. */
function dateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const th: CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  borderBottom: '2px solid #d8cfae',
  fontWeight: 600,
};
const thR: CSSProperties = { ...th, textAlign: 'right' };
const td: CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #eee' };
const tdR: CSSProperties = { ...td, textAlign: 'right' };

/** Appointment receipt — a printable, downloadable bill for a booking. */
export default function BookingReceiptPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { message } = App.useApp();
  const { data: booking, isLoading } = useBooking(params.id);
  const [downloading, setDownloading] = useState(false);

  if (isLoading || !booking) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const downloadPdf = async () => {
    const el = document.getElementById('receipt-paper');
    if (!el) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 24;
      const imgW = pdf.internal.pageSize.getWidth() - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
      pdf.save(`Receipt-${booking.number ?? booking.id}.pdf`);
    } catch {
      message.error('Could not generate the PDF');
    } finally {
      setDownloading(false);
    }
  };

  const metaRow = (label: string, value: string) => (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
      <span style={{ width: 110, color: '#888' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/bookings')}
          style={{ paddingLeft: 0 }}
        >
          Back to appointments
        </Button>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => router.push('/bookings/new')}>
            New Appointment
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={downloading}
            onClick={downloadPdf}
          >
            Download PDF
          </Button>
        </Space>
      </div>

      <Card className="no-print" style={{ marginTop: 12, padding: 0 }} styles={{ body: { padding: 16 } }}>
        {/* The receipt sheet — white paper, independent of the dark theme. */}
        <div
          id="receipt-paper"
          style={{
            background: '#ffffff',
            color: '#1f1f1f',
            maxWidth: 720,
            margin: '0 auto',
            padding: 32,
            fontSize: 13,
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '2px solid #d8cfae', paddingBottom: 12 }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: '#9c7a1a' }}>
              WELONA
            </div>
            <div style={{ color: '#888', letterSpacing: 1 }}>
              HEALTH &amp; WELLNESS — APPOINTMENT RECEIPT
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              marginTop: 16,
            }}
          >
            <div>
              {metaRow('Receipt No.', booking.number ?? booking.id)}
              {metaRow('Customer', booking.customerName)}
              {metaRow('Phone', booking.customerPhone || '—')}
            </div>
            <div>
              {metaRow('Date', dateTime(booking.scheduledAt))}
              {metaRow('Consultant', booking.consultantName || '—')}
              {metaRow('Status', titleCase(booking.status))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18 }}>
            <thead>
              <tr style={{ background: '#faf6e9' }}>
                <th style={th}>#</th>
                <th style={th}>Category</th>
                <th style={th}>Service</th>
                <th style={thR}>Qty</th>
                <th style={thR}>Amount</th>
                <th style={thR}>Total</th>
              </tr>
            </thead>
            <tbody>
              {booking.items.map((it, i) => (
                <tr key={i}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>{it.category || '—'}</td>
                  <td style={td}>{it.service}</td>
                  <td style={tdR}>{it.quantity}</td>
                  <td style={tdR}>{formatMoney(it.amount)}</td>
                  <td style={tdR}>{formatMoney(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <div style={{ width: 300 }}>
              {/* Subtotal row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#555' }}>Subtotal</span>
                <span>{formatMoney(booking.totalAmount)}</span>
              </div>
              {/* Discount */}
              {booking.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#555' }}>Discount</span>
                  <span>− {formatMoney(booking.discount)}</span>
                </div>
              )}
              {/* GST breakdown */}
              {booking.taxableAmt > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #e0d8c0', marginTop: 4 }}>
                    <span style={{ color: '#555' }}>Taxable Amount</span>
                    <span>{formatMoney(booking.taxableAmt)}</span>
                  </div>
                  {booking.cgstAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#555' }}>
                        CGST ({(booking.cgstPct / 100).toFixed(2).replace(/\.?0+$/, '')}%)
                      </span>
                      <span>{formatMoney(booking.cgstAmt)}</span>
                    </div>
                  )}
                  {booking.sgstAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#555' }}>
                        SGST ({(booking.sgstPct / 100).toFixed(2).replace(/\.?0+$/, '')}%)
                      </span>
                      <span>{formatMoney(booking.sgstAmt)}</span>
                    </div>
                  )}
                  {booking.igstAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#555' }}>
                        IGST ({(booking.igstPct / 100).toFixed(2).replace(/\.?0+$/, '')}%)
                      </span>
                      <span>{formatMoney(booking.igstAmt)}</span>
                    </div>
                  )}
                </>
              )}
              {/* Round Off */}
              {booking.roundOff !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#555' }}>Round Off</span>
                  <span>{formatMoney(booking.roundOff)}</span>
                </div>
              )}
              {/* Net Amount */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  marginTop: 4,
                  borderTop: '2px solid #d8cfae',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                <span>Net Amount</span>
                <span style={{ color: '#9c7a1a' }}>{formatMoney(booking.netAmount)}</span>
              </div>
            </div>
          </div>

          {booking.notes ? (
            <div style={{ marginTop: 16, color: '#555' }}>
              <strong>Remarks: </strong>
              {booking.notes}
            </div>
          ) : null}

          <div style={{ textAlign: 'center', marginTop: 28, color: '#999', fontSize: 12 }}>
            Thank you for choosing Welona Health &amp; Wellness.
          </div>
        </div>
      </Card>
    </div>
  );
}
