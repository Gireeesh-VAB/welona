'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useLead,
  useLeadStatus,
  useUpdateLead,
  useConvertLead,
  useConvertLeadToCustomer,
  useFollowUps,
  useCreateFollowUp,
  useSalespeople,
} from '@/hooks/useSales';
import SalesNav from '@/components/sales/SalesNav';
import StatusTag from '@/components/sales/StatusTag';
import OwnerAssign from '@/components/sales/OwnerAssign';
import FollowUpTimeline from '@/components/sales/FollowUpTimeline';
import { ApiClientError } from '@/lib/api-client';
import { FOLLOWUP_OUTCOMES, FOLLOWUP_STATUSES } from '@shared/enums';
import { formatDate, titleCase } from '@shared/format';

const { Title, Text } = Typography;

/** Valid manual status moves (excludes `converted`, handled by Convert). */
const LEAD_NEXT: Record<string, string[]> = {
  new: ['contacted', 'qualified', 'unqualified', 'lost'],
  contacted: ['qualified', 'unqualified', 'lost'],
  qualified: ['unqualified', 'lost'],
  unqualified: ['contacted'],
  converted: [],
  lost: [],
};

/** Enquiry Details — full enquiry record, pipeline actions and follow-ups. */
export default function EnquiryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { message } = App.useApp();

  const { data: lead, isLoading } = useLead(id);
  const { data: followUps } = useFollowUps(id);
  const { data: salespeople } = useSalespeople();

  const leadStatus = useLeadStatus();
  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();
  const convertToCustomer = useConvertLeadToCustomer();
  const createFollowUp = useCreateFollowUp();

  const [followForm] = Form.useForm();
  const [followOpen, setFollowOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const fail = (e: unknown, fallback = 'Action failed') =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  if (isLoading || !lead) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const moves = LEAD_NEXT[lead.status] ?? [];
  const canConvert = lead.status !== 'converted' && lead.status !== 'lost';

  const changeStatus = async (status: string) => {
    if (status === 'lost') {
      setLostReason('');
      setLostOpen(true);
      return;
    }
    try {
      await leadStatus.mutateAsync({ id: lead.id, status });
      message.success(`Enquiry marked as ${titleCase(status)}`);
    } catch (e) {
      fail(e);
    }
  };

  const confirmLost = async () => {
    try {
      await leadStatus.mutateAsync({ id: lead.id, status: 'lost', lostReason });
      message.success('Enquiry marked as Lost');
      setLostOpen(false);
    } catch (e) {
      fail(e);
    }
  };

  const convert = async () => {
    try {
      const quotation = await convertLead.mutateAsync(lead.id);
      message.success(`Converted — draft ${quotation.number} created`);
    } catch (e) {
      fail(e);
    }
  };

  const convertCustomer = async () => {
    try {
      const customer = await convertToCustomer.mutateAsync(lead.id);
      message.success('Customer profile created');
      router.push(`/customers/${customer.id}`);
    } catch (e) {
      fail(e);
    }
  };

  const addFollowUp = async () => {
    const values = await followForm.validateFields();
    try {
      await createFollowUp.mutateAsync({
        leadId: lead.id,
        body: {
          contactedAt: values.contactedAt ? values.contactedAt.toISOString() : undefined,
          dueAt: values.dueAt ? values.dueAt.toISOString() : undefined,
          note: values.note || undefined,
          remarks: values.remarks || undefined,
          status: values.status,
          outcome: values.outcome || undefined,
          assignedToId: values.assignedToId || undefined,
        },
      });
      message.success('Follow-up update added');
      setFollowOpen(false);
      followForm.resetFields();
    } catch (e) {
      fail(e, 'Could not save follow-up');
    }
  };

  return (
    <div>
      <SalesNav />

      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/sales/enquiries')}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Back to enquiries
      </Button>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {lead.contactName}
            </Title>
            <Text type="secondary">
              {lead.contactPhone || '—'}
              {lead.contactEmail ? ` · ${lead.contactEmail}` : ''}
            </Text>
          </div>
          <StatusTag status={lead.status} />
        </div>

        <Descriptions column={2} size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="Gender">
            {lead.gender ? titleCase(lead.gender) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Enquiry Type">{lead.enquiryType || '—'}</Descriptions.Item>
          <Descriptions.Item label="Treatment">{lead.treatment?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Media">{lead.media || '—'}</Descriptions.Item>
          <Descriptions.Item label="Call Type">{lead.callType || '—'}</Descriptions.Item>
          <Descriptions.Item label="Lead Transfer">
            {lead.leadTransfer ? 'Yes' : 'No'}
          </Descriptions.Item>
          <Descriptions.Item label="Health Status" span={2}>
            {lead.healthStatus || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Remarks" span={2}>
            {lead.notes || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Created">{formatDate(lead.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Follow-Up By">
            <OwnerAssign
              value={lead.ownerStaffId}
              loading={updateLead.isPending}
              onAssign={async (staffId) => {
                try {
                  await updateLead.mutateAsync({ id: lead.id, body: { ownerStaffId: staffId } });
                  message.success('Reassigned');
                } catch (e) {
                  fail(e);
                }
              }}
            />
          </Descriptions.Item>
        </Descriptions>

        {lead.lostReason && (
          <Text type="danger" style={{ display: 'block', marginTop: 8 }}>
            Lost: {lead.lostReason}
          </Text>
        )}

        <Space style={{ marginTop: 16, flexWrap: 'wrap' }}>
          {moves.map((s) => (
            <Button key={s} danger={s === 'lost'} onClick={() => changeStatus(s)}>
              Mark {titleCase(s)}
            </Button>
          ))}
          {canConvert && (
            <Button loading={convertLead.isPending} onClick={convert}>
              Convert to Quotation
            </Button>
          )}
          {canConvert && (
            <Button
              type="primary"
              icon={<UserOutlined />}
              loading={convertToCustomer.isPending}
              onClick={convertCustomer}
            >
              Convert to Customer
            </Button>
          )}
          {lead.customerId && (
            <Button type="link" onClick={() => router.push(`/customers/${lead.customerId}`)}>
              View Customer Profile
            </Button>
          )}
        </Space>
      </Card>

      <Card
        title="Follow-up History"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              followForm.resetFields();
              setFollowOpen(true);
            }}
          >
            Add Follow-up Update
          </Button>
        }
      >
        <FollowUpTimeline items={followUps ?? []} staff={salespeople ?? []} />
      </Card>

      <Modal
        title="Add Follow-up Update"
        open={followOpen}
        onOk={addFollowUp}
        confirmLoading={createFollowUp.isPending}
        onCancel={() => setFollowOpen(false)}
        okText="Save Update"
        width={520}
        destroyOnClose
      >
        <Form
          form={followForm}
          layout="vertical"
          preserve={false}
          initialValues={{ contactedAt: dayjs(), status: 'completed' }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              name="contactedAt"
              label="Contacted On"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Pick the contacted date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="dueAt" label="Next Follow-up Date" style={{ flex: 1 }}>
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

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="status" label="Follow-up Status" style={{ flex: 1 }}>
              <Select
                options={FOLLOWUP_STATUSES.map((s) => ({ label: titleCase(s), value: s }))}
              />
            </Form.Item>
            <Form.Item name="outcome" label="Outcome" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="Select outcome"
                options={FOLLOWUP_OUTCOMES.map((o) => ({ label: titleCase(o), value: o }))}
              />
            </Form.Item>
          </div>

          <Form.Item name="assignedToId" label="Assigned Staff">
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

          <Form.Item name="remarks" label="Remarks / Observations" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Any observations" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Mark enquiry as lost"
        open={lostOpen}
        onOk={confirmLost}
        confirmLoading={leadStatus.isPending}
        onCancel={() => setLostOpen(false)}
        okButtonProps={{ danger: true, disabled: !lostReason.trim() }}
        okText="Mark Lost"
      >
        <Text>Why was this enquiry lost?</Text>
        <Input.TextArea
          rows={3}
          style={{ marginTop: 8 }}
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value)}
          placeholder="Reason"
        />
      </Modal>
    </div>
  );
}
