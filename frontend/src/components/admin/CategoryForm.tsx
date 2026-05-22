'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Checkbox, Col, Form, Input, Row, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import {
  CATEGORY_FLAG_KEYS,
  CATEGORY_FLAG_LABELS,
  type CategoryFlagKey,
} from '@shared/schemas/admin-categories';
import {
  useCreateAdminCategory,
  useUpdateAdminCategory,
} from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminCategory } from '@shared/types/admin-category';
import type { AdminCategoryCreateInput } from '@shared/schemas/admin-categories';

const { Text } = Typography;

interface CategoryFormValues {
  name: string;
  categoryCode?: string;
  remarks?: string;
}

interface CategoryFormProps {
  mode: 'create' | 'edit';
  initial?: AdminCategory | null;
}

/** Maroon header bar matching the source design. */
const HEADER_BG = '#5B2C8B';
/** Green Update button background. */
const UPDATE_BG = '#5DB85D';

export default function CategoryForm({ mode, initial }: CategoryFormProps) {
  const router = useRouter();
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [form] = Form.useForm<CategoryFormValues>();
  const [flags, setFlags] = useState<Record<CategoryFlagKey, boolean>>(() => {
    const empty = {} as Record<CategoryFlagKey, boolean>;
    for (const k of CATEGORY_FLAG_KEYS) empty[k] = false;
    return empty;
  });

  const create = useCreateAdminCategory();
  const update = useUpdateAdminCategory();

  // Hydrate the form when an existing category is loaded for edit.
  useEffect(() => {
    if (!initial) return;
    form.setFieldsValue({
      name: initial.name,
      categoryCode: initial.categoryCode ?? undefined,
      remarks: initial.description ?? undefined,
    });
    const next = {} as Record<CategoryFlagKey, boolean>;
    for (const k of CATEGORY_FLAG_KEYS) next[k] = initial[k] ?? false;
    setFlags(next);
  }, [initial, form]);

  const toggleFlag = (key: CategoryFlagKey, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async () => {
    let values: CategoryFormValues;
    try {
      values = await form.validateFields();
    } catch {
      message.error('Fix the highlighted fields and try again.');
      return;
    }
    const body: AdminCategoryCreateInput = {
      name: values.name.trim(),
      categoryCode: values.categoryCode?.trim() ? values.categoryCode.trim() : undefined,
      description: values.remarks?.trim() ? values.remarks.trim() : undefined,
      isActive: initial?.isActive ?? true,
      ...flags,
    };
    try {
      if (mode === 'edit' && initial) {
        await update.mutateAsync({ id: initial.id, body });
        message.success('Category updated');
      } else {
        await create.mutateAsync(body);
        message.success('Category added');
      }
      router.push('/admin/master/category');
    } catch (err) {
      const fallback = mode === 'edit' ? 'Update failed.' : 'Create failed.';
      message.error(err instanceof ApiClientError ? err.message : fallback);
    }
  };

  return (
    <Card
      style={{
        background: colors.black.secondary,
        border: `1px solid ${colors.border}`,
      }}
      styles={{ body: { padding: 0 } }}
    >
      <div
        style={{
          background: HEADER_BG,
          color: '#FFFFFF',
          padding: '12px 20px',
          fontWeight: 600,
          letterSpacing: 0.3,
        }}
      >
        Category Creation
      </div>

      <div style={{ padding: 24 }}>
        <Text style={{ color: colors.text.primary, fontWeight: 600 }}>
          Category Creation
        </Text>
        <div
          style={{
            borderBottom: `1px dashed ${colors.border}`,
            margin: '8px 0 20px',
          }}
        />

        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 14 }}
          requiredMark
        >
          <Form.Item
            label="Category Name"
            name="name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Hair Services" maxLength={80} />
          </Form.Item>
          <Form.Item
            label="Category Code"
            name="categoryCode"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Hair Services" maxLength={40} />
          </Form.Item>
          <Form.Item
            label="Remarks"
            name="remarks"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Hair Services" maxLength={300} />
          </Form.Item>
        </Form>

        <div
          style={{ marginTop: 24, color: colors.text.primary, fontWeight: 500 }}
        >
          Select Role
        </div>
        <div style={{ marginTop: 12 }}>
          <Row gutter={[12, 6]}>
            {CATEGORY_FLAG_KEYS.map((key) => (
              <Col key={key} xs={24} sm={12} md={8}>
                <Checkbox
                  checked={flags[key]}
                  onChange={(e) => toggleFlag(key, e.target.checked)}
                >
                  {CATEGORY_FLAG_LABELS[key]}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <Button
            type="primary"
            loading={create.isPending || update.isPending}
            onClick={onSubmit}
            style={{ background: UPDATE_BG, borderColor: UPDATE_BG }}
          >
            {mode === 'edit' ? 'Update' : 'Save'}
          </Button>
          <Button
            onClick={() => router.push('/admin/master/category')}
            style={{ background: HEADER_BG, borderColor: HEADER_BG, color: '#FFFFFF' }}
          >
            Back ToList
          </Button>
        </div>
      </div>
    </Card>
  );
}
