'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Select,
  Spin,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAdminLead, useAdminFollowUps, useCreateAdminFollowUp, useAdminSalespeople } from '@/hooks/useAdminSales';
import SalesNav from '@/components/admin-sales/SalesNav';
import StatusTag from '@/components/sales/StatusTag';
import FollowUpTimeline from '@/components/sales/FollowUpTimeline';
import { ApiClientError } from '@/lib/api-client';
import { FOLLOWUP_OUTCOMES, FOLLOWUP_STATUSES } from '@shared/enums';
import { titleCase } from '@shared/format';

const { Title, Text } = Typography;

/**
 * Dedicated follow-ups page for an enquiry. Reached straight after an enquiry
 * is registered. If the enquiry has no follow-up yet, an initial one is
 * created automatically so there is always a next action to track.
 */
export default function EnquiryFollowUpsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { message } = App.useApp();

  const { data: lead, isLoading: leadLoading } = useAdminLead(id);
  const { data: followUps, isLoading: fuLoading } = useAdminFollowUps(id);
  const { data: salespeople } = useAdminSalespeople();
  const createFollowUp = useCreateAdminFollowUp();

  const [form] = Form.useForm();
  const autoCreated = useRef(false);

  // Auto-create the first follow-up when the enquiry has none yet.
  useEffect(() => {
    if (autoCreated.current || fuLoading || !followUps || !lead) return;
    if (followUps.length > 0) return;
    autoCreated.current = true;
    createFollowUp
      .mutateAsync({
        leadId: id,
        body: {
          note: 'Initial follow-up created when the enquiry was registered.',
          dueAt: dayjs().add(1, 'day').startOf('day').hour(10).toISOString(),
          status: 'pending',
          assignedToId: lead.ownerStaffId || undefined,
        },
      })
      .catch(() => {
        autoCreated.current = false;
      });
  }, [fuLoading, followUps, lead, id, createFollowUp]);

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const addFollowUp = async () => {
    const v = await form.validateFields();
    try {
      await createFollowUp.mutateAsync({
        leadId: id,
        body: {
          contactedAt: v.contactedAt ? v.contactedAt.toISOString() : undefined,
          dueAt: v.dueAt ? v.dueAt.toISOString() : undefined,
          note: v.note || undefined,
          remarks: v.remarks || undefined,
          status: v.status,
          outcome: v.outcome || undefined,
          assignedToId: v.assignedToId || undefined,
        },
      });
      message.success('Follow-up update added');
      form.resetFields();
    } catch (e) {
      fail(e, 'Could not save follow-up');
    }
  };

  if (leadLoading || !lead) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <SalesNav />

      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push(`/admin/sales/enquiries/${id}`)}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Back to enquiry
      </Button>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Follow-ups — {lead.contactName}
            </Title>
            <Text type="secondary">{lead.contactPhone || '—'}</Text>
          </div>
          <StatusTag status={lead.status} />
        </div>
        <Descriptions column={2} size="small" style={{ marginTop: 12 }}>
          <Descriptions.Item label="Enquiry Type">{lead.enquiryType || '—'}</Descriptions.Item>
          <Descriptions.Item label="Treatment">{lead.treatment?.name || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Log a Follow-up Update" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ contactedAt: dayjs(), status: 'completed' }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Form.Item
              name="contactedAt"
              label="Contacted On"
              style={{ flex: '1 1 200px' }}
              rules={[{ required: true, message: 'Pick the contacted date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="dueAt" label="Next Follow-up Date" style={{ flex: '1 1 200px' }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="note"
            label="Call Discussion Notes"
            rules={[{ required: true, message: 'Add discussion notes' }]}
          >
            <Input.TextArea rows={3} placeholder="What was discussed on the call?" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Form.Item name="status" label="Follow-up Status" style={{ flex: '1 1 160px' }}>
              <Select
                options={FOLLOWUP_STATUSES.map((s) => ({ label: titleCase(s), value: s }))}
              />
            </Form.Item>
            <Form.Item name="outcome" label="Outcome" style={{ flex: '1 1 160px' }}>
              <Select
                allowClear
                placeholder="Select outcome"
                options={FOLLOWUP_OUTCOMES.map((o) => ({ label: titleCase(o), value: o }))}
              />
            </Form.Item>
            <Form.Item name="assignedToId" label="Assigned Staff" style={{ flex: '1 1 220px' }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Select staff member"
                options={(salespeople ?? []).map((s) => ({
                  label: `${s.name} · ${s.roleName}`,
                  value: s.id,
                }))}
              />
            </Form.Item>
          </div>

          <Form.Item name="remarks" label="Remarks / Observations">
            <Input.TextArea rows={2} placeholder="Any observations" />
          </Form.Item>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={createFollowUp.isPending}
            onClick={addFollowUp}
          >
            Save Follow-up
          </Button>
        </Form>
      </Card>

      <Card title="Follow-up History">
        {fuLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <FollowUpTimeline items={followUps ?? []} staff={salespeople ?? []} />
        )}
      </Card>
    </div>
  );
}
