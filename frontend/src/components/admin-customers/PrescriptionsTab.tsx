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
  FileTextOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAdminPrescriptions, useCreateAdminPrescription } from '@/hooks/useAdminCustomers';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@shared/format';
import type { Prescription } from '@shared/types/customer-modules';
import { colors } from '@/theme/colors';

const { Text, Link } = Typography;

/** Split a free-text medications field into individual lines. */
function medicationLines(meds: string | null): string[] {
  if (!meds) return [];
  const byLine = meds
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;
  // A single line may instead be comma-separated.
  return meds
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** One prescription rendered as a readable record card. */
function PrescriptionCard({ p }: { p: Prescription }) {
  const meds = medicationLines(p.medications);
  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MedicineBoxOutlined style={{ color: colors.gold.primary }} />
          <span>Prescription</span>
          <Tag icon={<CalendarOutlined />} style={{ marginInlineStart: 4 }}>
            {formatDate(p.issuedAt)}
          </Tag>
        </span>
      }
      extra={
        p.fileUrl ? (
          <Link href={p.fileUrl} target="_blank" rel="noreferrer">
            <FileTextOutlined /> View document
          </Link>
        ) : null
      }
    >
      <Descriptions
        column={1}
        size="small"
        labelStyle={{ width: 130, color: colors.text.placeholder }}
      >
        <Descriptions.Item label="Prescribed by">
          <UserOutlined style={{ marginRight: 6, color: colors.text.placeholder }} />
          {p.prescribedBy || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Diagnosis">
          {p.diagnosis ? <Text strong>{p.diagnosis}</Text> : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Medications">
          {meds.length === 0 ? (
            '—'
          ) : (
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {meds.map((m, i) => (
                <li key={i} style={{ marginBottom: 2 }}>
                  {m}
                </li>
              ))}
            </ul>
          )}
        </Descriptions.Item>
        {p.notes ? <Descriptions.Item label="Notes">{p.notes}</Descriptions.Item> : null}
      </Descriptions>
    </Card>
  );
}

/** Prescriptions module — medical prescriptions issued to a customer. */
export default function PrescriptionsTab({ customerId }: { customerId: string }) {
  const { message } = App.useApp();
  const { data, isLoading } = useAdminPrescriptions(customerId);
  const createPrescription = useCreateAdminPrescription(customerId);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const handleCreate = async () => {
    const v = await form.validateFields();
    try {
      await createPrescription.mutateAsync({
        prescribedBy: v.prescribedBy || undefined,
        diagnosis: v.diagnosis || undefined,
        medications: v.medications || undefined,
        notes: v.notes || undefined,
        fileUrl: v.fileUrl || undefined,
        issuedAt: v.issuedAt ? v.issuedAt.toISOString() : undefined,
      });
      message.success('Prescription added');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e, 'Could not add prescription');
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
          {items.length} prescription{items.length === 1 ? '' : 's'} on record
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Prescription
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <Empty description="No prescriptions recorded for this customer" />
        </Card>
      ) : (
        items.map((p) => <PrescriptionCard key={p.id} p={p} />)
      )}

      <Modal
        title="Add Prescription"
        open={open}
        onOk={handleCreate}
        confirmLoading={createPrescription.isPending}
        onCancel={() => setOpen(false)}
        okText="Save Prescription"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="issuedAt" label="Issued On" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="Prescription date" />
            </Form.Item>
            <Form.Item name="prescribedBy" label="Prescribed By" style={{ flex: 1 }}>
              <Input placeholder="Doctor / staff name" />
            </Form.Item>
          </div>
          <Form.Item name="diagnosis" label="Diagnosis">
            <Input placeholder="e.g. Vitamin D deficiency" />
          </Form.Item>
          <Form.Item
            name="medications"
            label="Medications"
            extra="Enter one medication per line — each line is shown as a separate item."
          >
            <Input.TextArea rows={4} placeholder={'Calcirol sachet — weekly\nVitamin B12 — daily'} />
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
            <Input placeholder="Link to a scanned prescription (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
