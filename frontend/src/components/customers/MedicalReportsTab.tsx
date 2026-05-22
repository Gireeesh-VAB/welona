'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useMedicalReports, useCreateMedicalReport } from '@/hooks/useCustomerModules';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@shared/format';
import type { MedicalReport } from '@shared/types/customer-modules';
import { colors } from '@/theme/colors';

const { Text, Link } = Typography;

/** One medical report rendered as a readable record card. */
function ReportCard({ r }: { r: MedicalReport }) {
  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <FileDoneOutlined style={{ color: colors.gold.primary }} />
          <span>{r.title}</span>
          <Tag icon={<CalendarOutlined />} style={{ marginInlineStart: 4 }}>
            {formatDate(r.reportedAt)}
          </Tag>
          {r.reportType ? <Tag color="gold">{r.reportType}</Tag> : null}
        </span>
      }
      extra={
        r.fileUrl ? (
          <Link href={r.fileUrl} target="_blank" rel="noreferrer">
            <FileTextOutlined /> View document
          </Link>
        ) : null
      }
    >
      <Descriptions
        column={1}
        size="small"
        labelStyle={{ width: 110, color: colors.text.placeholder }}
      >
        <Descriptions.Item label="Findings">
          {r.findings ? (
            <Text style={{ whiteSpace: 'pre-wrap' }}>{r.findings}</Text>
          ) : (
            <Text type="secondary">No findings recorded</Text>
          )}
        </Descriptions.Item>
        {r.notes ? (
          <Descriptions.Item label="Notes">
            <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
              {r.notes}
            </Text>
          </Descriptions.Item>
        ) : null}
      </Descriptions>
    </Card>
  );
}

/** Medical Reports module — report / document records for a customer. */
export default function MedicalReportsTab({ customerId }: { customerId: string }) {
  const { message } = App.useApp();
  const { data, isLoading } = useMedicalReports(customerId);
  const createReport = useCreateMedicalReport(customerId);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const handleCreate = async () => {
    const v = await form.validateFields();
    try {
      await createReport.mutateAsync({
        title: v.title,
        reportType: v.reportType || undefined,
        findings: v.findings || undefined,
        notes: v.notes || undefined,
        fileUrl: v.fileUrl || undefined,
        reportedAt: v.reportedAt ? v.reportedAt.toISOString() : undefined,
      });
      message.success('Medical report added');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e, 'Could not add medical report');
    }
  };

  const items = data ?? [];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text type="secondary">
          {items.length} report{items.length === 1 ? '' : 's'} on record
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Medical Report
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <Empty description="No medical reports recorded for this customer" />
        </Card>
      ) : (
        items.map((r) => <ReportCard key={r.id} r={r} />)
      )}

      <Modal
        title="Add Medical Report"
        open={open}
        onOk={handleCreate}
        confirmLoading={createReport.isPending}
        onCancel={() => setOpen(false)}
        okText="Save Report"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="title"
            label="Report Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="e.g. Full Blood Count" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="reportedAt" label="Report Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="Date of the report" />
            </Form.Item>
            <Form.Item name="reportType" label="Report Type" style={{ flex: 1 }}>
              <Input placeholder="e.g. Blood test, Scan, X-ray" />
            </Form.Item>
          </div>
          <Form.Item
            name="findings"
            label="Findings"
            extra="Summarise the key results or observations from the report."
          >
            <Input.TextArea rows={4} placeholder="e.g. All values within normal range." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Advice, precautions or follow-up notes" />
          </Form.Item>
          <Form.Item
            name="fileUrl"
            label="Document URL"
            rules={[{ type: 'url', message: 'Enter a valid URL' }]}
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="Link to the scanned report (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
