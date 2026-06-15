'use client';

import { Form, Input, Select, type FormInstance } from 'antd';
import { COUNTRY_OPTIONS, COUNTRY_PHONE_CODE_MAP } from './countryData';

interface StateOption {
  value: string;
  label: string;
}

interface Props {
  form: FormInstance;
  stateOptions: StateOption[];
}

/**
 * Paired Country + State fields for customer forms.
 * - India → Indian states dropdown (required).
 * - Any other country → state shows "N/A" (stateId cleared automatically).
 * - Also auto-fills the phoneCode form field whenever country changes.
 */
export default function CountryStateFields({ form, stateOptions }: Props) {
  const country = Form.useWatch('country', form);
  const isIndia = !country || country === 'India';

  const handleCountryChange = (val: string) => {
    if (val !== 'India') {
      form.setFieldValue('stateId', undefined);
    }
    const code = COUNTRY_PHONE_CODE_MAP[val] ?? '';
    if (code) form.setFieldValue('phoneCode', code);
  };

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <Form.Item
        name="country"
        label="Country"
        style={{ flex: 1 }}
        rules={[{ required: true, message: 'Country is required' }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Select country"
          options={COUNTRY_OPTIONS}
          onChange={handleCountryChange}
        />
      </Form.Item>
      <Form.Item
        name="stateId"
        label="State"
        style={{ flex: 1 }}
      >
        {isIndia ? (
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Select state"
            options={stateOptions}
            allowClear
          />
        ) : (
          <Input value="N/A" disabled />
        )}
      </Form.Item>
    </div>
  );
}
