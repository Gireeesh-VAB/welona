'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  QRCode,
  Space,
  Table,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  DeleteOutlined,
  DollarOutlined,
  IdcardOutlined,
  PaperClipOutlined,
  PrinterOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  useEmployeeDocuments,
  useUploadEmployeeDocument,
  useDeleteEmployeeDocument,
} from '@/hooks/useEmployeeDocuments';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminEmployee } from '@shared/types/admin-employee';
import type { AdminEmployeeDocument } from '@shared/types/admin-employee-document';

const { Title, Text } = Typography;

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** Standard payroll split derived from gross monthly salary (paise). */
function computeSlip(emp: AdminEmployee) {
  const gross = emp.salary;
  const basic = Math.round(gross * 0.5);
  const hra = Math.round(gross * 0.2);
  const other = gross - basic - hra;
  const pf = emp.pf ? Math.round(basic * 0.12) : 0;
  const esi = emp.esi ? Math.round(gross * 0.0075) : 0;
  const deductions = pf + esi;
  return { gross, basic, hra, other, pf, esi, deductions, net: gross - deductions };
}

export default function EmployeeHrActions({ employee }: { employee: AdminEmployee }) {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [slipOpen, setSlipOpen] = useState(false);
  const [idOpen, setIdOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [slipMonth, setSlipMonth] = useState<Dayjs>(dayjs());

  const slip = useMemo(() => computeSlip(employee), [employee]);

  // ---- Documents ----
  const { data: docs, isLoading: docsLoading } = useEmployeeDocuments(docsOpen ? employee.id : null);
  const upload = useUploadEmployeeDocument(employee.id);
  const removeDoc = useDeleteEmployeeDocument(employee.id);
  const [docForm] = Form.useForm<{ title: string; docType?: string; fileUrl?: string }>();
  const fail = (e: unknown, fb: string) => message.error(e instanceof ApiClientError ? e.message : fb);

  const onPickFile = (file: File) => {
    if (file.size > 2_500_000) {
      message.error('File too large — keep it under ~2.5 MB.');
      return false;
    }
    const reader = new FileReader();
    reader.onload = () => {
      docForm.setFieldsValue({ fileUrl: String(reader.result) });
      if (!docForm.getFieldValue('title')) docForm.setFieldsValue({ title: file.name });
    };
    reader.readAsDataURL(file);
    return false;
  };

  const onUpload = async () => {
    const v = await docForm.validateFields().catch(() => null);
    if (!v) return;
    if (!v.fileUrl) {
      message.error('Choose a file to upload.');
      return;
    }
    try {
      await upload.mutateAsync({ title: v.title.trim(), docType: v.docType?.trim() || undefined, fileUrl: v.fileUrl });
      message.success('Document uploaded');
      docForm.resetFields();
    } catch (e) {
      fail(e, 'Upload failed');
    }
  };

  const printNow = () => window.print();

  return (
    <>
      <Space wrap className="no-print">
        <Button icon={<DollarOutlined />} onClick={() => setSlipOpen(true)}>Salary slip</Button>
        <Button icon={<IdcardOutlined />} onClick={() => setIdOpen(true)}>ID card</Button>
        <Button icon={<PaperClipOutlined />} onClick={() => setDocsOpen(true)}>Documents</Button>
      </Space>

      {/* ---- Salary slip ---- */}
      <Modal
        title="Salary Slip"
        open={slipOpen}
        onCancel={() => setSlipOpen(false)}
        width={600}
        footer={
          <Space className="no-print">
            <DatePicker picker="month" value={slipMonth} onChange={(d) => d && setSlipMonth(d)} allowClear={false} />
            <Button type="primary" icon={<PrinterOutlined />} onClick={printNow}>Print</Button>
          </Space>
        }
      >
        <div className="print-area" style={{ padding: 8, color: '#000', background: '#fff' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Title level={4} style={{ margin: 0 }}>Welona Health &amp; Wellness</Title>
            <Text>Salary Slip — {slipMonth.format('MMMM YYYY')}</Text>
          </div>
          <Descriptions size="small" bordered column={2} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Employee">{employee.name}</Descriptions.Item>
            <Descriptions.Item label="Code">{employee.employeeCode}</Descriptions.Item>
            <Descriptions.Item label="Designation">{employee.designation?.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Branch">{employee.branch?.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Bank">{employee.bankName ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="A/C">{employee.bankAccountNo ?? '—'}</Descriptions.Item>
          </Descriptions>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 6 }}>Earnings</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 6 }}>Amount</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 6 }}>Deductions</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 6 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 6 }}>Basic</td><td style={{ padding: 6, textAlign: 'right' }}>{rupees(slip.basic)}</td>
                <td style={{ padding: 6 }}>PF {employee.pf ? '(12%)' : ''}</td><td style={{ padding: 6, textAlign: 'right' }}>{rupees(slip.pf)}</td>
              </tr>
              <tr>
                <td style={{ padding: 6 }}>HRA</td><td style={{ padding: 6, textAlign: 'right' }}>{rupees(slip.hra)}</td>
                <td style={{ padding: 6 }}>ESI {employee.esi ? '(0.75%)' : ''}</td><td style={{ padding: 6, textAlign: 'right' }}>{rupees(slip.esi)}</td>
              </tr>
              <tr>
                <td style={{ padding: 6 }}>Other allowances</td><td style={{ padding: 6, textAlign: 'right' }}>{rupees(slip.other)}</td>
                <td style={{ padding: 6 }} /><td style={{ padding: 6 }} />
              </tr>
              <tr style={{ fontWeight: 600, borderTop: '1px solid #ddd' }}>
                <td style={{ padding: 6 }}>Gross</td><td style={{ padding: 6, textAlign: 'right' }}>{rupees(slip.gross)}</td>
                <td style={{ padding: 6 }}>Total deductions</td><td style={{ padding: 6, textAlign: 'right' }}>{rupees(slip.deductions)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ textAlign: 'right', marginTop: 12, fontSize: 16, fontWeight: 700 }}>
            Net pay: {rupees(slip.net)}
          </div>
          <div style={{ marginTop: 24, fontSize: 11, color: '#666' }}>
            Computer-generated slip. Components are a standard split of gross (Basic 50%, HRA 20%, Other 30%).
          </div>
        </div>
      </Modal>

      {/* ---- ID card ---- */}
      <Modal
        title="ID Card"
        open={idOpen}
        onCancel={() => setIdOpen(false)}
        width={420}
        footer={<Button className="no-print" type="primary" icon={<PrinterOutlined />} onClick={printNow}>Print</Button>}
      >
        <div className="print-area" style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 320, border: '2px solid #C9A227', borderRadius: 10, overflow: 'hidden', background: '#fff', color: '#000' }}>
            <div style={{ background: '#1a1a1a', color: '#C9A227', textAlign: 'center', padding: '10px 0', fontWeight: 700, letterSpacing: 3 }}>
              WELONA
            </div>
            <div style={{ display: 'flex', gap: 12, padding: 14 }}>
              {employee.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={employee.photoUrl} alt={employee.name} width={84} height={84} style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
              ) : (
                <div style={{ width: 84, height: 84, borderRadius: 8, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#999' }}>
                  {employee.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{employee.name}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{employee.designation?.name ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{employee.branch?.name ?? '—'}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}><b>ID:</b> {employee.employeeCode}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 14px' }}>
              <div style={{ fontSize: 11, color: '#666' }}>
                {employee.mobileNo && <div>📞 {employee.mobileNo}</div>}
                {employee.email && <div>✉ {employee.email}</div>}
              </div>
              <QRCode value={employee.employeeCode} size={72} bordered={false} />
            </div>
          </div>
        </div>
      </Modal>

      {/* ---- Documents ---- */}
      <Drawer
        title={`Documents — ${employee.name}`}
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        width={560}
      >
        <Form form={docForm} layout="vertical">
          <Space align="end" wrap style={{ width: '100%' }}>
            <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Title' }]} style={{ marginBottom: 8, minWidth: 180 }}>
              <Input placeholder="e.g. Aadhaar card" maxLength={160} />
            </Form.Item>
            <Form.Item label="Type" name="docType" style={{ marginBottom: 8, width: 130 }}>
              <Input placeholder="ID proof…" maxLength={60} />
            </Form.Item>
            <Form.Item label=" " colon={false} style={{ marginBottom: 8 }}>
              <Upload accept="image/*,application/pdf" showUploadList={false} beforeUpload={onPickFile}>
                <Button icon={<UploadOutlined />}>Choose file</Button>
              </Upload>
            </Form.Item>
            <Form.Item label=" " colon={false} style={{ marginBottom: 8 }}>
              <Button type="primary" loading={upload.isPending} onClick={onUpload}>Upload</Button>
            </Form.Item>
          </Space>
          <Form.Item name="fileUrl" hidden><Input /></Form.Item>
        </Form>

        {(docs?.length ?? 0) === 0 && !docsLoading ? (
          <Empty description="No documents yet" />
        ) : (
          <List<AdminEmployeeDocument>
            loading={docsLoading}
            dataSource={docs ?? []}
            renderItem={(d) => (
              <List.Item
                actions={[
                  <a key="view" href={d.fileUrl} target="_blank" rel="noreferrer">View</a>,
                  <Popconfirm key="del" title="Delete this document?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => removeDoc.mutate(d.id)}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={<span style={{ color: colors.text.primary }}>{d.title}</span>}
                  description={
                    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                      {d.docType ?? 'Document'} · {new Date(d.uploadedAt).toLocaleDateString('en-IN')}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
