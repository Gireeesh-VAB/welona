'use client';

import { useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useOffers, useCreateOffer, useUpdateOffer } from '@/hooks/useCustomerModules';
import { ApiClientError } from '@/lib/api-client';
import { DISCOUNT_TYPES, OFFER_STATUSES } from '@shared/enums';
import { formatDate, formatMoney, titleCase, toMinorUnits } from '@shared/format';
import type { Offer } from '@shared/types/customer-modules';

const { Text } = Typography;
const statusOptions = OFFER_STATUSES.map((s) => ({ label: titleCase(s), value: s }));

/** Render an offer's discount value according to its type. */
function formatDiscount(offer: Offer): string {
  return offer.discountType === 'percent'
    ? `${offer.discountValue}%`
    : formatMoney(offer.discountValue);
}

/** Offers module — customer-specific promotional offers. */
export default function OffersTab({ customerId }: { customerId: string }) {
  const { message } = App.useApp();
  const { data, isLoading } = useOffers(customerId);
  const createOffer = useCreateOffer(customerId);
  const updateOffer = useUpdateOffer(customerId);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const discountType = Form.useWatch('discountType', form);

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const handleCreate = async () => {
    const v = await form.validateFields();
    try {
      await createOffer.mutateAsync({
        title: v.title,
        description: v.description || undefined,
        discountType: v.discountType,
        discountValue:
          v.discountType === 'flat' ? toMinorUnits(v.discountValue) : v.discountValue,
        validFrom: v.validFrom ? v.validFrom.toISOString() : undefined,
        validUntil: v.validUntil ? v.validUntil.toISOString() : undefined,
      });
      message.success('Offer added');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e, 'Could not add offer');
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await updateOffer.mutateAsync({ id, body: { status } });
      message.success('Offer updated');
    } catch (e) {
      fail(e, 'Could not update offer');
    }
  };

  const columns: ColumnsType<Offer> = [
    { title: 'Title', dataIndex: 'title' },
    { title: 'Discount', key: 'discount', render: (_, row) => formatDiscount(row) },
    {
      title: 'Valid',
      key: 'valid',
      render: (_, row) =>
        row.validFrom || row.validUntil
          ? `${formatDate(row.validFrom)} – ${formatDate(row.validUntil)}`
          : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (s: string, row) => (
        <Select
          size="small"
          value={s}
          style={{ width: 130 }}
          options={statusOptions}
          onChange={(value) => changeStatus(row.id, value)}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Offer
        </Button>
      </div>

      <Table<Offer>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
        expandable={{
          expandedRowRender: (row) => (
            <Text type="secondary">{row.description || 'No description'}</Text>
          ),
          rowExpandable: (row) => !!row.description,
        }}
        locale={{ emptyText: <Empty description="No offers yet" /> }}
      />

      <Modal
        title="Add Offer"
        open={open}
        onOk={handleCreate}
        confirmLoading={createOffer.isPending}
        onCancel={() => setOpen(false)}
        okText="Save Offer"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={{ discountType: 'percent' }}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="e.g. Festive 20% Off" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional details" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="discountType" label="Discount Type" style={{ flex: 1 }}>
              <Select
                options={DISCOUNT_TYPES.map((d) => ({ label: titleCase(d), value: d }))}
              />
            </Form.Item>
            <Form.Item
              name="discountValue"
              label={discountType === 'flat' ? 'Amount (₹)' : 'Percent (%)'}
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber
                min={0}
                max={discountType === 'flat' ? undefined : 100}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="validFrom" label="Valid From" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="validUntil" label="Valid Until" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        {data?.length ?? 0} offer(s)
      </Text>
    </div>
  );
}
