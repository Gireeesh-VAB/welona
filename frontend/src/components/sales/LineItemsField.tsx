'use client';

import { Button, Form, Input, InputNumber } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { colors } from '@/theme/colors';

/**
 * Line-item editor for quotation/order forms. Renders inside a parent Ant
 * `Form` under the field name `items`. Prices are entered in rupees and tax
 * as a percentage — the submitting form converts them to minor units / basis
 * points before calling the API.
 */
export default function LineItemsField() {
  return (
    <Form.List name="items">
      {(fields, { add, remove }, { errors }) => (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 130px 90px 40px',
              gap: 8,
              fontSize: 12,
              color: colors.text.placeholder,
              marginBottom: 4,
            }}
          >
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price (₹)</span>
            <span>Tax %</span>
            <span />
          </div>

          {fields.map((field) => (
            <div
              key={field.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px 130px 90px 40px',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Form.Item
                name={[field.name, 'description']}
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Item or service" />
              </Form.Item>
              <Form.Item
                name={[field.name, 'quantity']}
                rules={[{ required: true, message: '!' }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[field.name, 'unitPrice']}
                rules={[{ required: true, message: '!' }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber min={0} step={100} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name={[field.name, 'taxRate']} style={{ marginBottom: 0 }}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => remove(field.name)}
              />
            </div>
          ))}

          <Button
            type="dashed"
            onClick={() => add({ quantity: 1, unitPrice: 0, taxRate: 18 })}
            icon={<PlusOutlined />}
            block
            style={{ marginTop: 8 }}
          >
            Add line item
          </Button>
          <Form.ErrorList errors={errors} />
        </div>
      )}
    </Form.List>
  );
}
