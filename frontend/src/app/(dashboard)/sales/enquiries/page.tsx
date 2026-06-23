'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useSalespeople,
  useTreatments,
  useMasterOptions,
  useCustomers,
} from '@/hooks/useSales';
import SalesNav from '@/components/sales/SalesNav';
import EnquiryStats, { type EnquiryFilter } from '@/components/sales/EnquiryStats';
import StatusTag from '@/components/sales/StatusTag';
import OwnerAssign from '@/components/sales/OwnerAssign';
import { ApiClientError } from '@/lib/api-client';
import { GENDERS } from '@shared/enums';
import { formatDate, titleCase } from '@shared/format';
import type { Lead, MasterOption } from '@shared/types/sales';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Classify a follow-up due date for colour-coding. */
function dueTone(dueAt: string): { color: string; label: string } {
  const due = new Date(dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  if (startOfDue < startOfToday) return { color: colors.status.error, label: 'Overdue' };
  if (startOfDue === startOfToday) return { color: colors.gold.primary, label: 'Today' };
  return { color: colors.text.secondary, label: '' };
}

/** Map an active master-option list to Select options keyed by label. */
function toSelectOptions(options: MasterOption[] | undefined) {
  return (options ?? [])
    .filter((o) => o.isActive)
    .map((o) => ({ label: o.label, value: o.label }));
}

export default function EnquiriesPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<EnquiryFilter>('all');

  const handleStatFilter = (f: EnquiryFilter) => {
    setActiveFilter(f);
    setPage(1);
    setStatusFilter(undefined);
  };

  const leadsQuery: Record<string, string | number | boolean | undefined> = { page, limit: 10 };
  if (statusFilter) leadsQuery.status = statusFilter;
  if (activeFilter === 'today') leadsQuery.createdToday = true;
  if (activeFilter === 'due-today') leadsQuery.followupDueToday = true;
  if (activeFilter === 'done-today') leadsQuery.followupDoneToday = true;

  const { data, isLoading } = useLeads(leadsQuery);

  const { data: salespeople } = useSalespeople();
  const { data: treatments } = useTreatments();
  const { data: enquiryTypes } = useMasterOptions('enquiry_type');
  const { data: mediaOptions } = useMasterOptions('media');
  const { data: callTypes } = useMasterOptions('call_type');
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Phone-based customer lookup — watch the form field to avoid controlled/uncontrolled conflicts
  const phoneValue: string = Form.useWatch('contactPhone', form) ?? '';
  const [phoneSearch, setPhoneSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPhoneSearch(phoneValue), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [phoneValue]);

  const { data: customerSearchData, isFetching: customerSearching } = useCustomers(
    phoneSearch.length >= 10 ? { search: phoneSearch, limit: 1 } : {},
  );
  const matchedCustomer = phoneSearch.length >= 10
    ? (customerSearchData?.items ?? []).find(
        (c) => c.phone?.replace(/\D/g, '').slice(-10) === phoneSearch.replace(/\D/g, '').slice(-10),
      ) ?? null
    : null;

  const { data: leadSearchData } = useLeads(
    phoneSearch.length >= 10 ? { search: phoneSearch, limit: 5 } : {},
  );
  const existingLeads = phoneSearch.length >= 10
    ? (leadSearchData?.items ?? []).filter(
        (l) => l.contactPhone?.replace(/\D/g, '').slice(-10) === phoneSearch.replace(/\D/g, '').slice(-10),
      )
    : [];

  // Auto-fill name & gender when an exact phone match is found
  useEffect(() => {
    if (matchedCustomer) {
      form.setFieldsValue({
        contactName: matchedCustomer.name,
        gender:      matchedCustomer.gender ?? undefined,
      });
    }
  }, [matchedCustomer?.id]);

  const openModal = () => {
    setPhoneSearch('');
    form.resetFields();
    setModalOpen(true);
  };

  const activeTreatments = (treatments ?? []).filter((t) => t.isActive);

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      const lead = await createLead.mutateAsync({
        ...values,
        ...(matchedCustomer ? { customerId: matchedCustomer.id } : {}),
      });
      message.success('Enquiry created — schedule the first follow-up');
      setModalOpen(false);
      form.resetFields();
      setPhoneSearch('');
      router.push(`/sales/enquiries/${lead.id}/followups`);
    } catch (e) {
      fail(e, 'Could not create enquiry');
    }
  };

  const columns: ColumnsType<Lead> = [
    {
      title: 'Contact',
      dataIndex: 'contactName',
      render: (name: string, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
            {row.contactPhone || '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Treatment',
      key: 'treatment',
      render: (_, row) => row.treatment?.name || '—',
    },
    {
      title: 'Enquiry Type',
      dataIndex: 'enquiryType',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Follow-Up By',
      key: 'owner',
      width: 200,
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <OwnerAssign
            value={row.ownerStaffId}
            loading={updateLead.isPending}
            onAssign={async (staffId) => {
              try {
                await updateLead.mutateAsync({ id: row.id, body: { ownerStaffId: staffId } });
                message.success('Reassigned');
              } catch (e) {
                fail(e, 'Could not reassign');
              }
            }}
          />
        </div>
      ),
    },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Next Follow-up',
      key: 'followup',
      render: (_, row) => {
        const next = row.followUps?.[0];
        if (!next || !next.dueAt) return <Text type="secondary">—</Text>;
        const tone = dueTone(next.dueAt);
        return (
          <span style={{ color: tone.color }}>
            {formatDate(next.dueAt)}
            {tone.label && ` · ${tone.label}`}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <SalesNav />

      <EnquiryStats activeFilter={activeFilter} onFilter={handleStatFilter} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ marginTop: 0 }}>
          Enquiries
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
          New Enquiry
        </Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
              setActiveFilter('all');
            }}
            options={['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost', 'transferred'].map(
              (s) => ({ label: titleCase(s), value: s }),
            )}
          />
          <Text type="secondary">Click an enquiry to view details and log follow-ups.</Text>
        </Space>

        <Table<Lead>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          onRow={(row) => ({
            onClick: () => router.push(`/sales/enquiries/${row.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: 10,
            total: data?.meta.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Modal
        title="New Enquiry"
        open={modalOpen}
        onOk={handleCreate}
        confirmLoading={createLead.isPending}
        onCancel={() => { setModalOpen(false); setPhoneSearch(''); form.resetFields(); }}
        okText="Save Enquiry"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ leadTransfer: false }}>
          {/* Mobile number with live customer lookup */}
          <Form.Item
            name="contactPhone"
            label="Mobile No"
            rules={[{ required: true, message: 'Mobile number is required' }]}
          >
            <Input
              addonBefore="+91"
              placeholder="10-digit number"
              inputMode="tel"
              suffix={
                customerSearching && phoneValue.length >= 10
                  ? <Spin size="small" />
                  : <span style={{ width: 14, display: 'inline-block' }} />
              }
              autoComplete="off"
            />
          </Form.Item>

          {/* Existing customer banner */}
          {matchedCustomer && (
            <div style={{
              background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6,
              padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Existing customer found</div>
                <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>
                  <UserOutlined style={{ marginRight: 4 }} />
                  {matchedCustomer.name}
                  {matchedCustomer.gender && (
                    <Tag style={{ marginLeft: 8, fontSize: 11 }}>{titleCase(matchedCustomer.gender)}</Tag>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                  Details pre-filled — enquiry will be linked to this customer.
                </div>
              </div>
            </div>
          )}

          {existingLeads.length > 0 && (
            <div style={{
              background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6,
              padding: '10px 14px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 15, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {existingLeads.length} existing {existingLeads.length === 1 ? 'enquiry' : 'enquiries'} for this number
                </span>
              </div>
              {existingLeads.map((l) => (
                <div key={l.id} style={{ fontSize: 12, color: '#595959', paddingLeft: 23, marginTop: 3 }}>
                  <span style={{ fontWeight: 500 }}>{l.contactName}</span>
                  <Tag style={{ marginLeft: 8, fontSize: 11 }}>{titleCase(l.status)}</Tag>
                  {l.treatment?.name && (
                    <span style={{ color: '#8c8c8c', marginLeft: 4 }}>· {l.treatment.name}</span>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#8c8c8c', paddingLeft: 23, marginTop: 6 }}>
                You can still create a new enquiry if needed.
              </div>
            </div>
          )}

          <Form.Item
            name="contactName"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="Customer name" />
          </Form.Item>

          <Form.Item name="gender" label="Gender">
            <Radio.Group>
              {GENDERS.map((g) => (
                <Radio key={g} value={g}>
                  {titleCase(g)}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item name="enquiryType" label="Enquiry Type">
            <Select
              placeholder="Select Enquiry Type"
              allowClear
              showSearch
              optionFilterProp="label"
              options={toSelectOptions(enquiryTypes)}
              notFoundContent="Add options in Settings → Enquiry Types"
            />
          </Form.Item>

          <Form.Item name="treatmentId" label="Treatment">
            <Select
              placeholder="Select Treatment"
              allowClear
              showSearch
              optionFilterProp="label"
              options={activeTreatments.map((t) => ({ label: t.name, value: t.id }))}
              notFoundContent="Add treatments in Settings → Treatments"
            />
          </Form.Item>

          <Form.Item name="media" label="Media">
            <Select
              placeholder="Select Media"
              allowClear
              showSearch
              optionFilterProp="label"
              options={toSelectOptions(mediaOptions)}
              notFoundContent="Add options in Settings → Media"
            />
          </Form.Item>

          <Form.Item name="callType" label="Call Type">
            <Select
              placeholder="Select Call Type"
              allowClear
              showSearch
              optionFilterProp="label"
              options={toSelectOptions(callTypes)}
              notFoundContent="Add options in Settings → Call Types"
            />
          </Form.Item>

          <Form.Item name="healthStatus" label="Health Status">
            <Input.TextArea rows={2} placeholder="Health status" />
          </Form.Item>

          <Form.Item name="notes" label="Remarks">
            <Input.TextArea rows={2} placeholder="Remarks" />
          </Form.Item>

          <Form.Item name="ownerStaffId" label="Follow-Up By">
            <Select
              placeholder="Select FollowUp By"
              allowClear
              showSearch
              optionFilterProp="label"
              options={(salespeople ?? []).map((s) => ({
                label: `${s.name} · ${s.roleName}`,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="leadTransfer" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Lead Transfer</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
