'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  useAdminComplimentaryRules,
  useCreateAdminComplimentaryRule,
  useDeleteAdminComplimentaryRule,
  useUpdateAdminComplimentaryRule,
} from '@/hooks/useAdminComplimentary';
import { useAdminServices } from '@/hooks/useAdminServices';
import { useProducts } from '@/hooks/useProducts';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminComplimentaryRule } from '@shared/types/admin-complimentary';

const { Title, Text } = Typography;

interface AssignmentRow {
  productId: string;
  quantity: number;
}

interface RuleFormValues {
  name: string;
  description?: string;
  triggerServiceId: string;
  isActive: boolean;
  assignments: AssignmentRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminMasterComplimentaryPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-complimentary')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useAdminComplimentaryRules({
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const rules = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  // Load full list of services and products for the form selects
  const { data: servicesData } = useAdminServices({ limit: 500 });
  const { data: productsData } = useProducts({ isActive: true, limit: 500 });
  const serviceOptions = (servicesData?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.category?.name ? s.category.name + ' · ' : ''}${s.name}`,
  }));
  const productOptions = (productsData?.items ?? []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.sku})`,
  }));

  const createRule = useCreateAdminComplimentaryRule();
  const updateRule = useUpdateAdminComplimentaryRule();
  const deleteRule = useDeleteAdminComplimentaryRule();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminComplimentaryRule | null>(null);
  const [form] = Form.useForm<RuleFormValues>();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      assignments: [{ productId: '', quantity: 1 }],
    });
    setModalOpen(true);
  }

  function openEdit(rule: AdminComplimentaryRule) {
    setEditing(rule);
    form.setFieldsValue({
      name: rule.name,
      description: rule.description ?? '',
      triggerServiceId: rule.triggerServiceId,
      isActive: rule.isActive,
      assignments: rule.assignments.map((a) => ({
        productId: a.productId,
        quantity: a.quantity,
      })),
    });
    setModalOpen(true);
  }

  async function handleSubmit(values: RuleFormValues) {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      triggerServiceId: values.triggerServiceId,
      isActive: values.isActive,
      assignments: values.assignments.filter((a) => a.productId),
    };

    try {
      if (editing) {
        await updateRule.mutateAsync({ id: editing.id, body: payload });
        message.success('Rule updated');
      } else {
        await createRule.mutateAsync(payload);
        message.success('Rule created');
      }
      setModalOpen(false);
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : 'Something went wrong';
      message.error(msg);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRule.mutateAsync(id);
      message.success('Rule deleted');
    } catch {
      message.error('Could not delete rule');
    }
  }

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: PAGE_SIZE,
    total,
    showSizeChanger: false,
    showTotal: (t) => `${t} rules`,
    onChange: (p) => setPage(p),
  };

  const columns: ColumnsType<AdminComplimentaryRule> = [
    {
      title: 'Rule Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {row.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Trigger Service',
      key: 'trigger',
      render: (_, row) => (
        <div>
          {row.triggerCategoryName && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {row.triggerCategoryName}
            </Text>
          )}
          <div>{row.triggerServiceName}</div>
        </div>
      ),
    },
    {
      title: 'Complimentary Products',
      key: 'assignments',
      render: (_, row) => (
        <Space wrap size={4}>
          {row.assignments.map((a) => (
            <Tag key={a.id} style={{ marginBottom: 2 }}>
              {a.productName}
              {a.quantity > 1 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {' '}×{a.quantity}
                </Text>
              )}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (v: string) => formatDate(v),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, row) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEdit(row)}
          />
          <Popconfirm
            title="Delete this rule?"
            onConfirm={() => handleDelete(row.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isSaving = createRule.isPending || updateRule.isPending;

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0, color: colors.gold.primary }}>
            {navItem?.label ?? 'Complimentary Products'}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {navItem?.description ??
              'Rules that grant complimentary products when a service is booked.'}
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}
          >
            Add Rule
          </Button>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="300px">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search rules or services…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              allowClear
            />
          </Col>
        </Row>

        <Table<AdminComplimentaryRule>
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={isLoading}
          pagination={pagination}
          size="small"
        />
      </Card>

      <Modal
        title={editing ? 'Edit Complimentary Rule' : 'Add Complimentary Rule'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save' : 'Create'}
        confirmLoading={isSaving}
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            label="Rule Name"
            name="name"
            rules={[{ required: true, message: 'Rule name is required' }]}
          >
            <Input placeholder="e.g. Complimentary serum with TCA Peel" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Optional notes about this rule" />
          </Form.Item>

          <Form.Item
            label="Trigger Service"
            name="triggerServiceId"
            rules={[{ required: true, message: 'Select a trigger service' }]}
          >
            <Select
              showSearch
              placeholder="Select service that triggers this rule"
              options={serviceOptions}
              filterOption={(input, opt) =>
                (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>

          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            Complimentary Products
          </div>

          <Form.List
            name="assignments"
            rules={[
              {
                validator: async (_, items) => {
                  const valid = (items ?? []).filter((a: AssignmentRow) => a?.productId);
                  if (!valid.length) {
                    return Promise.reject('Add at least one product');
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col flex="auto">
                      <Form.Item
                        {...rest}
                        name={[name, 'productId']}
                        rules={[{ required: true, message: 'Select a product' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          placeholder="Select product"
                          options={productOptions}
                          filterOption={(input, opt) =>
                            (opt?.label ?? '')
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col style={{ width: 100 }}>
                      <Form.Item
                        {...rest}
                        name={[name, 'quantity']}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col>
                      {fields.length > 1 && (
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 16 }}
                        />
                      )}
                    </Col>
                  </Row>
                ))}
                <Form.ErrorList errors={errors} />
                <Button
                  type="dashed"
                  onClick={() => add({ productId: '', quantity: 1 })}
                  icon={<PlusOutlined />}
                  size="small"
                  style={{ marginTop: 4 }}
                >
                  Add Product
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
