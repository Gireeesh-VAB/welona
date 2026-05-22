'use client';

import { App, Checkbox, Form, Input, Modal, Select } from 'antd';
import { useQuickSale, useSalespeople } from '@/hooks/useSales';
import CustomerPicker from './CustomerPicker';
import LineItemsField from './LineItemsField';
import { ApiClientError } from '@/lib/api-client';
import { toMinorUnits } from '@shared/format';

interface ItemFormValue {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Unified "New Sale" — one screen to record a sale: pick or create the
 * customer, add products/services, assign a salesperson, and (optionally)
 * raise an invoice. Creates a confirmed order in a single step.
 */
export default function NewSaleModal({ open, onClose }: Props) {
  const { message } = App.useApp();
  const { data: salespeople } = useSalespeople();
  const quickSale = useQuickSale();
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const items = (values.items as ItemFormValue[]).map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: toMinorUnits(it.unitPrice),
      taxRate: Math.round((it.taxRate ?? 0) * 100),
    }));
    try {
      const result = await quickSale.mutateAsync({
        customerId: values.customerId,
        ownerStaffId: values.ownerStaffId,
        notes: values.notes,
        createInvoice: values.createInvoice,
        items,
      });
      message.success(
        `Sale recorded — order ${result.order.number}` +
          (result.invoice ? ` · invoice ${result.invoice.number}` : ''),
      );
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(error instanceof ApiClientError ? error.message : 'Could not create the sale');
    }
  };

  return (
    <Modal
      title="New Sale"
      open={open}
      onOk={handleSubmit}
      okText="Create Sale"
      confirmLoading={quickSale.isPending}
      onCancel={onClose}
      width={760}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ items: [{ quantity: 1, unitPrice: 0, taxRate: 18 }], createInvoice: true }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item
            name="customerId"
            label="Customer"
            rules={[{ required: true, message: 'Select or create a customer' }]}
            style={{ flex: 1 }}
          >
            <CustomerPicker />
          </Form.Item>
          <Form.Item
            name="ownerStaffId"
            label="Salesperson"
            rules={[{ required: true, message: 'Assign a salesperson' }]}
            style={{ width: 240 }}
          >
            <Select
              placeholder="Assign owner"
              showSearch
              optionFilterProp="label"
              options={(salespeople ?? []).map((s) => ({
                label: `${s.name} · ${s.roleName}`,
                value: s.id,
              }))}
            />
          </Form.Item>
        </div>

        <Form.Item label="Products / Services" required style={{ marginBottom: 12 }}>
          <LineItemsField />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Optional notes about this sale" />
        </Form.Item>

        <Form.Item name="createInvoice" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Checkbox>Raise an invoice for this sale straight away</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
