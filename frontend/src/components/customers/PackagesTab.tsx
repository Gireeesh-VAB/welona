'use client';

import { useRef, useState } from 'react';
import { App, Button, DatePicker, Spin } from 'antd';
import { usePackageCheckout } from '@/hooks/useCustomerModules';
import { usePackageSessionMasters } from '@/hooks/usePackageSessionMasters';
import { ApiClientError } from '@/lib/api-client';
import { colors } from '@/theme/colors';

function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  if (rupees === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const toW = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + toW(n % 100);
    if (n < 100000) return toW(Math.floor(n / 1000)) + 'Thousand ' + toW(n % 1000);
    if (n < 10000000) return toW(Math.floor(n / 100000)) + 'Lakh ' + toW(n % 100000);
    return toW(Math.floor(n / 10000000)) + 'Crore ' + toW(n % 10000000);
  };
  return toW(rupees).trim() + ' Rupees Only';
}

const b  = `1px solid #d9d9d9`;
const db = `1px dashed #d9d9d9`;

type Step1Data = {
  selectedMasterId: string;
  packageName: string;
  totalSessions: string;
  priceRupees: string;
  expiresAt: any;
  notes: string;
};

interface Props {
  customerId: string;
  customerName?: string;
}

export default function PackagesTab({ customerId, customerName = '' }: Props) {
  const { message } = App.useApp();
  const { data: masters = [], isLoading: mastersLoading } = usePackageSessionMasters();
  const checkout = usePackageCheckout(customerId);
  const printRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [packageName, setPackageName]   = useState('');
  const [totalSessions, setTotalSessions] = useState('');
  const [priceRupees, setPriceRupees]   = useState('');
  const [expiresAt, setExpiresAt]       = useState<any>(null);
  const [notes, setNotes]               = useState('');

  // Step 2 state
  const [paidRupees, setPaidRupees]     = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef]     = useState('');
  const [saving, setSaving]             = useState(false);

  // Result
  const [result, setResult] = useState<{ package: any; invoice: any } | null>(null);

  const pricePaise  = Math.round((parseFloat(priceRupees) || 0) * 100);
  const paidPaise   = Math.round((parseFloat(paidRupees) || 0) * 100);
  const balancePaise = Math.max(0, pricePaise - paidPaise);

  const handleMasterSelect = (id: string) => {
    setSelectedMasterId(id);
    const m = masters.find((x) => x.id === id);
    if (m) {
      setPackageName(m.name);
      setTotalSessions(String(m.defaultSessions));
      setPriceRupees(String(m.price / 100));
    } else {
      setPackageName('');
      setTotalSessions('');
      setPriceRupees('');
    }
  };

  const goToBilling = () => {
    if (!packageName.trim()) { message.error('Enter a package name'); return; }
    const sessions = parseInt(totalSessions) || 0;
    if (sessions < 1) { message.error('Total sessions must be at least 1'); return; }
    setPaidRupees('0');
    setPaymentMethod('cash');
    setPaymentRef('');
    setStep(2);
  };

  const handleConfirm = async () => {
    if (paidPaise > pricePaise) { message.error('Paid amount cannot exceed package total'); return; }
    setSaving(true);
    try {
      const res = await checkout.mutateAsync({
        name:          packageName.trim(),
        masterId:      selectedMasterId || undefined,
        totalSessions: parseInt(totalSessions),
        price:         pricePaise,
        expiresAt:     expiresAt ? expiresAt.toISOString() : undefined,
        notes:         notes || undefined,
        paidAmount:    paidPaise,
        paymentMethod,
        paymentRef:    paymentRef || undefined,
      });
      setResult(res as any);
      setStep(3);
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not save package');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Package Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 6px 10px; border: 1px solid #ccc; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .no-border td { border: none; }
        @media print { body { margin: 0; } }
      </style>
      </head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  const resetForm = () => {
    setSelectedMasterId('');
    setPackageName('');
    setTotalSessions('');
    setPriceRupees('');
    setExpiresAt(null);
    setNotes('');
    setResult(null);
    setStep(1);
  };

  /* ─── Step indicator ───────────────────────────────────────────────────── */
  const StepBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: db, gap: 8 }}>
      {[1, 2, 3].map((n) => {
        const labels: Record<number, string> = { 1: 'Package Details', 2: 'Payment', 3: 'Receipt' };
        const active = n === step;
        const done   = n < step;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
              background: active ? colors.gold.primary : done ? '#4caf50' : '#e0e0e0',
              color: (active || done) ? '#fff' : '#888',
            }}>{done ? '✓' : n}</div>
            <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? colors.text.primary : '#888' }}>
              {labels[n]}
            </span>
            {n < 3 && <span style={{ color: '#ccc', margin: '0 4px' }}>›</span>}
          </div>
        );
      })}
    </div>
  );

  /* ─── STEP 1: Package form ─────────────────────────────────────────────── */
  if (step === 1) return (
    <div style={{ background: '#fff', border: b, borderRadius: 6 }}>
      <div style={{ padding: '10px 16px', borderBottom: db }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary }}>
          &#x27A1; Package Entry
        </span>
      </div>
      <StepBar />

      {/* Packages dropdown */}
      <div style={{ padding: '12px 16px', borderBottom: db, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: colors.text.primary, minWidth: 100 }}>
          Packages:
        </label>
        {mastersLoading ? (
          <Spin size="small" />
        ) : (
          <select
            value={selectedMasterId}
            onChange={(e) => handleMasterSelect(e.target.value)}
            style={{ padding: '5px 10px', border: b, borderRadius: 4, fontSize: 13, minWidth: 240, background: '#fff' }}
          >
            <option value="">Select Package</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Booking Details label */}
      <div style={{ padding: '10px 16px 0' }}>
        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 8px', color: colors.text.primary }}>
          Package Details
        </p>
      </div>

      {/* Fields table */}
      <div style={{ overflowX: 'auto', padding: '0 16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: b }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={th}>&#x2193; S.No.</th>
              <th style={th}>&#x1F4CB; Field</th>
              <th style={{ ...th, borderRight: 'none' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: b }}>
              <td style={sno}><Num n={1} /></td>
              <td style={lbl}>Package Name</td>
              <td style={val}>
                <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g. Slimming Package"
                  style={{ width: '100%', padding: '5px 8px', border: b, borderRadius: 3, fontSize: 12 }} />
              </td>
            </tr>
            <tr style={{ borderTop: b }}>
              <td style={sno}><Num n={2} /></td>
              <td style={lbl}>Total Sessions</td>
              <td style={val}>
                <input type="number" min="1" value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)}
                  placeholder="0"
                  style={{ width: 100, padding: '5px 8px', border: b, borderRadius: 3, fontSize: 12, textAlign: 'center' }} />
              </td>
            </tr>
            <tr style={{ borderTop: b }}>
              <td style={sno}><Num n={3} /></td>
              <td style={lbl}>&#x20B9; Amount</td>
              <td style={val}>
                <input type="number" min="0" value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)}
                  placeholder="0"
                  style={{ width: 140, padding: '5px 8px', border: b, borderRadius: 3, fontSize: 12, textAlign: 'right' }} />
              </td>
            </tr>
            <tr style={{ borderTop: b }}>
              <td style={sno}><Num n={4} /></td>
              <td style={lbl}>Expiry Date</td>
              <td style={val}>
                <DatePicker size="small" value={expiresAt} onChange={setExpiresAt}
                  placeholder="Optional" style={{ width: 180 }} />
              </td>
            </tr>
            <tr style={{ borderTop: b }}>
              <td style={sno}><Num n={5} /></td>
              <td style={lbl}>Remarks</td>
              <td style={val}>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="Optional remarks…"
                  style={{ width: '100%', padding: '5px 8px', border: b, borderRadius: 3, fontSize: 12, resize: 'vertical', fontFamily: 'inherit' }} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary + Next */}
      <div style={{ display: 'flex', borderTop: db }}>
        <div style={{ flex: 1 }} />
        <div style={{ width: 300, padding: '12px 16px', borderLeft: db, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: db }}>
            <span style={{ color: colors.text.secondary }}>Total Sessions</span>
            <span style={{ fontWeight: 700, color: colors.gold.primary }}>{totalSessions || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '2px solid #333' }}>
            <span style={{ fontWeight: 700 }}>Net Amount</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: colors.gold.primary }}>
              &#x20B9;{(parseFloat(priceRupees) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ padding: '7px 0', fontSize: 11, color: colors.text.secondary, fontStyle: 'italic' }}>
            {amountInWords(pricePaise)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button type="primary" onClick={goToBilling}
              style={{ background: colors.gold.primary, borderColor: colors.gold.primary, fontWeight: 600 }}>
              Proceed to Payment &#x203A;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── STEP 2: Payment entry ────────────────────────────────────────────── */
  if (step === 2) return (
    <div style={{ background: '#fff', border: b, borderRadius: 6 }}>
      <div style={{ padding: '10px 16px', borderBottom: db }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary }}>
          &#x27A1; Package Entry
        </span>
      </div>
      <StepBar />

      <div style={{ display: 'flex', gap: 0 }}>

        {/* Left: Package summary */}
        <div style={{ flex: 1, padding: '16px', borderRight: db }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 12px', color: colors.text.primary }}>
            Package Summary
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: b }}>
            <tbody>
              <Row label="Package" value={packageName} />
              <Row label="Sessions" value={totalSessions} />
              <Row label="Package Amount" value={`₹${(parseFloat(priceRupees) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
              {expiresAt && <Row label="Expiry" value={expiresAt.format ? expiresAt.format('DD MMM YYYY') : String(expiresAt)} />}
              {notes && <Row label="Remarks" value={notes} />}
            </tbody>
          </table>
        </div>

        {/* Right: Payment fields */}
        <div style={{ width: 320, padding: '16px' }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 12px', color: colors.text.primary }}>
            Payment Details
          </p>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Payment Mode</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: b, borderRadius: 4, fontSize: 13, background: '#fff' }}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Amount Paid (&#x20B9;)
            </label>
            <input type="number" min="0" max={parseFloat(priceRupees) || 0}
              value={paidRupees} onChange={(e) => setPaidRupees(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: b, borderRadius: 4, fontSize: 14,
                textAlign: 'right', fontWeight: 700, color: '#1a6b3c' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Reference / Transaction ID (optional)
            </label>
            <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g. UPI ref, cheque no."
              style={{ width: '100%', padding: '6px 10px', border: b, borderRadius: 4, fontSize: 13 }} />
          </div>

          {/* Amount summary */}
          <div style={{ background: '#f9f9f9', border: b, borderRadius: 4, padding: '10px 12px', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ color: '#666' }}>Package Total</span>
              <span style={{ fontWeight: 600 }}>
                &#x20B9;{(parseFloat(priceRupees) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ color: '#1a6b3c' }}>Paying Now</span>
              <span style={{ fontWeight: 600, color: '#1a6b3c' }}>
                &#x20B9;{(parseFloat(paidRupees) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 0', borderTop: b, marginTop: 4 }}>
              <span style={{ fontWeight: 700 }}>Balance Due</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: balancePaise > 0 ? '#e53935' : '#1a6b3c' }}>
                &#x20B9;{(balancePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          {balancePaise > 0 && (
            <p style={{ fontSize: 11, color: '#e53935', margin: '6px 0 0' }}>
              Balance will appear in Pending Payments module.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setStep(1)} style={{ flex: 1 }}>&#x2039; Back</Button>
            <Button type="primary" loading={saving} onClick={handleConfirm}
              style={{ flex: 2, background: '#1a6b3c', borderColor: '#1a6b3c', fontWeight: 600 }}>
              Confirm &amp; Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── STEP 3: Receipt ──────────────────────────────────────────────────── */
  const inv = result?.invoice;
  const pkg = result?.package;
  const invTotal    = (inv?.total    ?? pricePaise) as number;
  const invPaid     = (inv?.amountPaid ?? paidPaise) as number;
  const invBalance  = Math.max(0, invTotal - invPaid);
  const invStatus   = (inv?.status ?? '') as string;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ background: '#fff', border: b, borderRadius: 6 }}>
      <div style={{ padding: '10px 16px', borderBottom: db, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary }}>
          &#x27A1; Package Entry
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={handlePrint} style={{ fontSize: 12 }}>&#x1F5A8; Print Receipt</Button>
          <Button type="primary" onClick={resetForm}
            style={{ background: colors.gold.primary, borderColor: colors.gold.primary, fontSize: 12 }}>
            + New Package
          </Button>
        </div>
      </div>
      <StepBar />

      {/* Printable receipt area */}
      <div ref={printRef} style={{ padding: '24px 32px', maxWidth: 680 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #222', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#222' }}>WELONA</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Beauty & Wellness Centre</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: colors.gold.primary, letterSpacing: 1 }}>
            PACKAGE RECEIPT
          </div>
        </div>

        {/* Invoice meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 12 }}>
          <div>
            <div style={{ marginBottom: 4 }}><b>Invoice #:</b> {inv?.number ?? '—'}</div>
            <div><b>Date:</b> {today}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: 4 }}><b>Customer:</b> {customerName || '—'}</div>
            <div>
              <b>Status:</b>{' '}
              <span style={{
                padding: '1px 8px', borderRadius: 10, fontSize: 11,
                background: invStatus === 'paid' ? '#e8f5e9' : invStatus === 'partially_paid' ? '#fff3e0' : '#fce4ec',
                color:      invStatus === 'paid' ? '#1a6b3c' : invStatus === 'partially_paid' ? '#e65100' : '#c62828',
                fontWeight: 600,
              }}>
                {invStatus === 'paid' ? 'PAID' : invStatus === 'partially_paid' ? 'PARTIALLY PAID' : 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Package details table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ ...thr, textAlign: 'left' }}>Description</th>
              <th style={{ ...thr, textAlign: 'center' }}>Sessions</th>
              <th style={{ ...thr, textAlign: 'right', borderRight: 'none' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdr, textAlign: 'left', fontWeight: 500 }}>
                {pkg?.name ?? packageName}
              </td>
              <td style={{ ...tdr, textAlign: 'center' }}>
                {pkg?.totalSessions ?? totalSessions}
              </td>
              <td style={{ ...tdr, textAlign: 'right', borderRight: 'none' }}>
                &#x20B9;{(invTotal / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Payment summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <div style={{ width: 280, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: db }}>
              <span style={{ color: '#555' }}>Package Total</span>
              <span style={{ fontWeight: 600 }}>
                &#x20B9;{(invTotal / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            {invPaid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: db }}>
                <span style={{ color: '#1a6b3c' }}>Amount Paid ({paymentMethod.toUpperCase()})</span>
                <span style={{ fontWeight: 600, color: '#1a6b3c' }}>
                  &#x20B9;{(invPaid / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '2px solid #333' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Balance Due</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: invBalance > 0 ? '#e53935' : '#1a6b3c' }}>
                &#x20B9;{(invBalance / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ padding: '6px 0', fontSize: 11, color: '#666', fontStyle: 'italic' }}>
              {amountInWords(invPaid > 0 ? invPaid : invTotal)}
            </div>
          </div>
        </div>

        {paymentRef && (
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <b>Reference:</b> {paymentRef}
          </div>
        )}

        {invBalance > 0 && (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 4, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>
            &#x26A0; Pending balance of &#x20B9;{(invBalance / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} has been added to Pending Payments.
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 12, borderTop: db, fontSize: 11, color: '#888' }}>
          Thank you for choosing Welona. This is a computer-generated receipt.
        </div>
      </div>
    </div>
  );
}

function Num({ n }: { n: number }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: '#4caf50', color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 12,
    }}>{n}</div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderTop: b }}>
      <td style={{ ...lbl, width: 140 }}>{label}</td>
      <td style={val}>{value}</td>
    </tr>
  );
}

const th: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #d9d9d9', borderRight: '1px solid #d9d9d9',
  textAlign: 'center', fontWeight: 600, fontSize: 12, color: '#e53935',
};
const sno: React.CSSProperties = {
  padding: '7px 10px', textAlign: 'center', borderRight: '1px solid #d9d9d9', width: 52,
};
const lbl: React.CSSProperties = {
  padding: '7px 12px', fontWeight: 500, color: '#555', borderRight: '1px solid #d9d9d9', width: 200,
};
const val: React.CSSProperties = { padding: '7px 12px' };

const thr: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid #d9d9d9', fontWeight: 600, fontSize: 12,
};
const tdr: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #d9d9d9', fontSize: 12,
};
