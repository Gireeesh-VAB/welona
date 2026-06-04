'use client';

import { useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Modal,
  Progress,
  Space,
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  InboxOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

/** Column definition consumed by a BulkUpload caller. */
export interface BulkColumn<T = unknown> {
  /** CSV header label, e.g. "Employee Name". */
  header: string;
  /** Key on the returned row object, e.g. "name". */
  key: string;
  /** Whether the cell may be left blank. */
  required?: boolean;
  /** Human-readable type hint shown in the template instructions. */
  type?: 'string' | 'number' | 'email' | 'phone' | 'enum' | 'boolean' | 'date';
  /** For `type: 'enum'` — the allowed values. */
  enumOptions?: string[];
  /** Custom validator. Return null to accept, or a short error string. */
  validate?: (value: string, row: Record<string, string>) => string | null;
  /** Transformer applied to the raw cell value before validation/import. */
  transform?: (value: string) => unknown;
  /** Help string shown in the template's first sample row instructions. */
  hint?: string;
  /** @internal — caller may assert downstream typing. */
  __t?: T;
}

export interface BulkImportResult {
  ok: number;
  /** rowIndex is 1-based to match the CSV row number the user saw. */
  failed: Array<{ rowIndex: number; error: string; row: Record<string, unknown> }>;
}

export interface BulkUploadButtonProps {
  /** Used in the modal title + CSV filename. */
  entityName: string;
  /** Plural noun used in success messages ("Imported 12 employees"). */
  entityPlural?: string;
  /** Columns expected in the CSV. */
  columns: BulkColumn[];
  /** Example rows included in the downloaded template. At least 1 recommended. */
  sampleRows: Array<Record<string, string>>;
  /** Receives a single transformed/validated row, writes it. Throws on failure. */
  onImport: (row: Record<string, unknown>) => Promise<void>;
  /** Optional callback after import finishes, e.g. for cache invalidation. */
  onCompleted?: (result: BulkImportResult) => void;
  /** Override the button rendered on the page. */
  buttonLabel?: string;
  buttonProps?: Partial<React.ComponentProps<typeof Button>>;
}

type Stage = 'idle' | 'uploaded' | 'importing' | 'done';

interface ParsedRow {
  rowIndex: number;            // 1-based CSV row (excluding header)
  raw: Record<string, string>;
  transformed: Record<string, unknown>;
  errors: string[];            // per-cell error messages
}

// ---- CSV utilities ---------------------------------------------------------

/** Minimal CSV parser that handles quoted cells, escaped quotes and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++; // CRLF
        row.push(cell); cell = '';
        if (row.some((x) => x.length > 0)) rows.push(row);
        row = [];
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/** Serialize rows back to CSV — used for the template + the error report. */
function rowsToCsv(rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(escape).join(',')).join('\n');
}

function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

// ---- Cell validators -------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9 ()\-]{6,20}$/;

function validateCell(col: BulkColumn, raw: string, row: Record<string, string>): { value: unknown; error: string | null } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    if (col.required) return { value: null, error: `${col.header} is required` };
    return { value: undefined, error: null };
  }
  switch (col.type) {
    case 'number': {
      const n = Number(trimmed);
      if (Number.isNaN(n)) return { value: null, error: `${col.header}: not a number` };
      return { value: col.transform ? col.transform(trimmed) : n, error: null };
    }
    case 'email':
      if (!EMAIL_RE.test(trimmed)) return { value: null, error: `${col.header}: invalid email` };
      break;
    case 'phone':
      if (!PHONE_RE.test(trimmed)) return { value: null, error: `${col.header}: invalid phone` };
      break;
    case 'enum':
      if (col.enumOptions && !col.enumOptions.includes(trimmed))
        return { value: null, error: `${col.header}: must be one of ${col.enumOptions.join(', ')}` };
      break;
    case 'boolean': {
      const t = trimmed.toLowerCase();
      if (!['yes', 'no', 'true', 'false', '1', '0', 'y', 'n'].includes(t))
        return { value: null, error: `${col.header}: must be Yes/No` };
      const b = ['yes', 'true', '1', 'y'].includes(t);
      return { value: col.transform ? col.transform(trimmed) : b, error: null };
    }
    case 'date': {
      // Accept YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY
      const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
      const m2 = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(trimmed);
      let iso: string | null = null;
      if (m1) iso = `${m1[1]}-${m1[2]}-${m1[3]}`;
      else if (m2) iso = `${m2[3]}-${m2[2]}-${m2[1]}`;
      if (!iso || Number.isNaN(new Date(iso).getTime()))
        return { value: null, error: `${col.header}: bad date (use DD-MM-YYYY)` };
      return { value: col.transform ? col.transform(trimmed) : iso, error: null };
    }
  }
  if (col.validate) {
    const e = col.validate(trimmed, row);
    if (e) return { value: null, error: e };
  }
  return { value: col.transform ? col.transform(trimmed) : trimmed, error: null };
}

// ---- Component -------------------------------------------------------------

export default function BulkUploadButton({
  entityName,
  entityPlural = `${entityName.toLowerCase()} records`,
  columns,
  sampleRows,
  onImport,
  onCompleted,
  buttonLabel = 'Bulk Upload',
  buttonProps,
}: BulkUploadButtonProps) {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const cancelledRef = useRef(false);

  const validRows = useMemo(() => parsed.filter((p) => p.errors.length === 0), [parsed]);
  const invalidRows = useMemo(() => parsed.filter((p) => p.errors.length > 0), [parsed]);

  const reset = () => {
    setStage('idle'); setParsed([]); setProgress(0);
    setResult(null); cancelledRef.current = false;
  };

  const closeAll = () => { setOpen(false); reset(); };

  // ---- Template download -------------------------------------------------
  const handleDownloadTemplate = () => {
    const header = columns.map((c) => c.header);
    const samples = sampleRows.length > 0
      ? sampleRows.map((row) => columns.map((c) => row[c.key] ?? ''))
      : [columns.map((c) => c.hint ?? '')];
    const csv = rowsToCsv([header, ...samples]);
    downloadFile(`${entityName.toLowerCase().replace(/\s+/g, '-')}-template.csv`, csv);
    message.success(`Template downloaded — fill it in and use Bulk Upload to import.`);
  };

  // ---- File upload & parse -----------------------------------------------
  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const grid = parseCsv(text);
      if (grid.length < 2) {
        message.error('No data rows found in the CSV.');
        return;
      }
      const headerRow = grid[0].map((h) => h.trim());
      const dataRows = grid.slice(1);

      // Map headers to column indices.
      const colIndex = new Map<string, number>();
      headerRow.forEach((h, i) => colIndex.set(h.toLowerCase(), i));

      const missing = columns
        .filter((c) => c.required && !colIndex.has(c.header.toLowerCase()))
        .map((c) => c.header);
      if (missing.length > 0) {
        message.error(`Missing required columns: ${missing.join(', ')}`);
        return;
      }

      const out: ParsedRow[] = dataRows.map((rawRow, rowIdx) => {
        const raw: Record<string, string> = {};
        const transformed: Record<string, unknown> = {};
        const errors: string[] = [];
        for (const col of columns) {
          const cellIdx = colIndex.get(col.header.toLowerCase()) ?? -1;
          const cell = cellIdx >= 0 ? (rawRow[cellIdx] ?? '') : '';
          raw[col.key] = cell;
          const { value, error } = validateCell(col, cell, raw);
          if (error) errors.push(error);
          if (value !== undefined) transformed[col.key] = value;
        }
        return { rowIndex: rowIdx + 2, raw, transformed, errors }; // +2 because row 1 is the header
      });

      setParsed(out);
      setStage('uploaded');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Could not read that file');
    }
  };

  // ---- Run the import ----------------------------------------------------
  const handleImport = async () => {
    if (validRows.length === 0) {
      message.warning('Nothing to import — fix the highlighted errors first.');
      return;
    }
    setStage('importing');
    setProgress(0);
    cancelledRef.current = false;

    let ok = 0;
    const failed: BulkImportResult['failed'] = [];
    for (let i = 0; i < validRows.length; i++) {
      if (cancelledRef.current) break;
      const r = validRows[i];
      try {
        await onImport(r.transformed);
        ok += 1;
      } catch (e) {
        failed.push({
          rowIndex: r.rowIndex,
          error: e instanceof Error ? e.message : 'Server rejected the row',
          row: r.transformed,
        });
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
    const final: BulkImportResult = { ok, failed };
    setResult(final);
    setStage('done');
    onCompleted?.(final);
  };

  const handleCancel = () => { cancelledRef.current = true; };

  const handleDownloadErrorReport = () => {
    if (!result) return;
    const header = ['Row', 'Error', ...columns.map((c) => c.header)];
    const rows = result.failed.map((f) => [
      f.rowIndex, f.error, ...columns.map((c) => String(f.row[c.key] ?? '')),
    ]);
    downloadFile(`${entityName.toLowerCase()}-import-errors.csv`, rowsToCsv([header, ...rows]));
  };

  // ---- Preview table -----------------------------------------------------
  const previewColumns: ColumnsType<ParsedRow> = [
    {
      title: '#', dataIndex: 'rowIndex', width: 60, fixed: 'left',
      render: (v: number) => <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Status', key: 'status', width: 100, fixed: 'left',
      render: (_, row) => row.errors.length === 0 ? (
        <Tag style={{ background: colors.status.success, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}
          icon={<CheckCircleOutlined />}>OK</Tag>
      ) : (
        <Tooltip title={row.errors.join(' · ')}>
          <Tag style={{ background: colors.status.error, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0 }}
            icon={<CloseCircleOutlined />}>{row.errors.length} error{row.errors.length === 1 ? '' : 's'}</Tag>
        </Tooltip>
      ),
    },
    ...columns.map((c) => ({
      title: c.header, dataIndex: ['raw', c.key], width: 160,
      render: (v: string, row: ParsedRow) => {
        const hasError = row.errors.some((e) => e.startsWith(c.header));
        return (
          <Text style={{
            color: hasError ? colors.status.error : (v ? colors.text.primary : colors.text.placeholder),
            fontSize: 12,
          }}>
            {v || '—'}
          </Text>
        );
      },
    })),
    {
      title: 'Errors', key: 'errors', width: 280,
      render: (_, row) => row.errors.length === 0 ? (
        <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
      ) : (
        <Text style={{ color: colors.status.error, fontSize: 11 }}>{row.errors.join(' · ')}</Text>
      ),
    },
  ];

  // ---- Render ------------------------------------------------------------
  return (
    <>
      <Space.Compact>
        <Tooltip title={`Download a ready-made CSV template for ${entityName.toLowerCase()}`}>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            Template
          </Button>
        </Tooltip>
        <Button icon={<CloudUploadOutlined />} onClick={() => setOpen(true)} {...buttonProps}>
          {buttonLabel}
        </Button>
      </Space.Compact>

      <Modal
        title={
          <Space>
            <CloudUploadOutlined style={{ color: colors.gold.primary }} />
            <span>Bulk Upload — {entityName}</span>
          </Space>
        }
        open={open}
        onCancel={() => stage === 'importing' ? handleCancel() : closeAll()}
        footer={null}
        width={1080}
        destroyOnClose
        maskClosable={stage === 'idle' || stage === 'uploaded' || stage === 'done'}
      >
        <Steps
          size="small"
          current={stage === 'idle' ? 0 : stage === 'uploaded' ? 1 : stage === 'importing' ? 2 : 3}
          items={[
            { title: 'Download template' },
            { title: 'Upload & validate' },
            { title: 'Import' },
            { title: 'Done' },
          ]}
          style={{ marginBottom: 20 }}
        />

        {/* ---- Stage: idle or uploaded — show template + upload zone ---- */}
        {(stage === 'idle' || stage === 'uploaded') && (
          <>
            <div style={{
              padding: 16, background: colors.black.primary, borderRadius: 8,
              border: `1px solid ${colors.border}`, marginBottom: 12,
            }}>
              <Space align="start" size="middle">
                <FileExcelOutlined style={{ fontSize: 28, color: colors.gold.primary }} />
                <div style={{ flex: 1 }}>
                  <Text strong style={{ color: colors.text.primary }}>Step 1 — Download the template</Text>
                  <Paragraph style={{ color: colors.text.placeholder, fontSize: 12, marginBottom: 8 }}>
                    The CSV has the exact column headers expected. Required columns are{' '}
                    {columns.filter((c) => c.required).map((c) => (
                      <Tag key={c.key} style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: '0 4px 0 0', fontSize: 11 }}>{c.header}</Tag>
                    ))}.
                  </Paragraph>
                  <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                    Download Template
                  </Button>
                </div>
              </Space>
            </div>

            <Dragger
              accept=".csv,.txt"
              multiple={false}
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => { handleFile(file); return false; }}
              style={{ marginBottom: stage === 'uploaded' ? 16 : 0 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: colors.gold.primary, fontSize: 44 }} />
              </p>
              <p className="ant-upload-text" style={{ color: colors.text.primary, fontWeight: 600 }}>
                Step 2 — Drop your filled-in CSV here, or click to browse
              </p>
              <p className="ant-upload-hint" style={{ color: colors.text.placeholder, fontSize: 12 }}>
                Single file, .csv format, UTF-8. Empty rows are skipped automatically.
              </p>
            </Dragger>

            {/* ---- Preview ---- */}
            {stage === 'uploaded' && (
              <>
                <Space style={{ marginBottom: 12, marginTop: 4 }} size="middle" wrap>
                  <Tag style={{ background: `${colors.status.success}1A`, color: colors.status.success, border: 'none', fontWeight: 600, margin: 0, padding: '4px 10px' }}
                    icon={<CheckCircleOutlined />}>
                    {validRows.length} valid row{validRows.length === 1 ? '' : 's'}
                  </Tag>
                  {invalidRows.length > 0 && (
                    <Tag style={{ background: `${colors.status.error}1A`, color: colors.status.error, border: 'none', fontWeight: 600, margin: 0, padding: '4px 10px' }}
                      icon={<CloseCircleOutlined />}>
                      {invalidRows.length} row{invalidRows.length === 1 ? '' : 's'} with errors
                    </Tag>
                  )}
                  <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                    Only valid rows will be imported. Fix the rest in your CSV and re-upload.
                  </Text>
                </Space>

                <Table<ParsedRow>
                  rowKey="rowIndex"
                  columns={previewColumns}
                  dataSource={parsed}
                  pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: false }}
                  size="small"
                  scroll={{ x: 'max-content', y: 240 }}
                  rowClassName={(row) => row.errors.length > 0 ? 'bulk-row-err' : ''}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <Button onClick={reset} icon={<ReloadOutlined />}>Upload a different file</Button>
                  <Button type="primary" icon={<UploadOutlined />} onClick={handleImport}
                    disabled={validRows.length === 0}>
                    Import {validRows.length} {validRows.length === 1 ? 'row' : 'rows'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* ---- Stage: importing ---- */}
        {stage === 'importing' && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <Text strong style={{ color: colors.text.primary, fontSize: 18, display: 'block', marginBottom: 16 }}>
              Importing {entityPlural}…
            </Text>
            <Progress percent={progress} strokeColor={colors.gold.primary} style={{ maxWidth: 480, margin: '0 auto' }} />
            <Paragraph style={{ color: colors.text.placeholder, marginTop: 16, fontSize: 12 }}>
              Don&apos;t close this dialog. We&apos;ll keep going row-by-row even if one fails.
            </Paragraph>
            <Button danger style={{ marginTop: 8 }} onClick={handleCancel}>
              Stop import
            </Button>
          </div>
        )}

        {/* ---- Stage: done ---- */}
        {stage === 'done' && result && (
          <div style={{ padding: '16px 8px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {result.failed.length === 0 ? (
                <CheckCircleOutlined style={{ fontSize: 56, color: colors.status.success }} />
              ) : (
                <CloseCircleOutlined style={{ fontSize: 56, color: colors.status.warning }} />
              )}
              <div style={{ marginTop: 12 }}>
                <Text strong style={{ color: colors.text.primary, fontSize: 22 }}>
                  {result.ok > 0 && `${result.ok} ${entityPlural} imported`}
                  {result.ok > 0 && result.failed.length > 0 && ' · '}
                  {result.failed.length > 0 && `${result.failed.length} failed`}
                </Text>
              </div>
              {result.failed.length > 0 && (
                <Paragraph style={{ color: colors.text.placeholder, marginTop: 8 }}>
                  Download the error report to see what went wrong, fix in your CSV, and re-upload.
                </Paragraph>
              )}
            </div>

            {result.failed.length > 0 && (
              <Table
                rowKey={(r) => `${r.rowIndex}`}
                columns={[
                  { title: 'Row', dataIndex: 'rowIndex', width: 70 },
                  { title: 'Error', dataIndex: 'error',
                    render: (v: string) => <Text style={{ color: colors.status.error }}>{v}</Text> },
                ]}
                dataSource={result.failed}
                pagination={{ pageSize: 5, showSizeChanger: false, hideOnSinglePage: true }}
                size="small"
                style={{ marginBottom: 16 }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {result.failed.length > 0 && (
                <Button icon={<DownloadOutlined />} onClick={handleDownloadErrorReport}>
                  Download Error Report
                </Button>
              )}
              <Button icon={<ReloadOutlined />} onClick={reset}>Import Another Batch</Button>
              <Button type="primary" onClick={closeAll}>Done</Button>
            </div>
          </div>
        )}

        <style jsx global>{`
          .bulk-row-err td { background: ${colors.status.error}0A !important; }
        `}</style>
      </Modal>
    </>
  );
}

// Re-export utility for callers that want to inline CSV downloads
export { rowsToCsv };

// Mark file as having an import for callers — also re-exports the upload type
// so TS callers can spread their own UploadFile usage if needed.
export type { UploadFile };
