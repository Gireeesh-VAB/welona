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
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useAdminBranchComplimentaryLimits,
  useUpsertBranchComplimentaryLimit,
  useUpdateBranchComplimentaryLimit,
  useDeleteBranchComplimentaryLimit,
} from '@/hooks/useAdminComplimentary';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminBranchComplimentaryLimit } from '@shared/types/admin-complimentary';

const { Title, Text } = Typography;

interface LimitFormValues {
  branchId: string;
  percentage: number;
  isActive: boolean;
}

export default function AdminMasterComplimentaryPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-complimentary');
  const { message } = App.useApp();

  const { data: limits, isLoading } = useAdminBranchComplimentaryLimits();
  const { data: branchesData } = useAdminBranches({ limit: 500 });
  const upsert = useUpsertBranchComplimentaryLimit();
  const update = useUpdateBranchComplimentaryLimit();
  const remove = useDeleteBranchComplimentaryLimit();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBranchComplimentaryLimit | null>(null);
  const [form] = Form.useForm<LimitFormValues>();

  const configuredBranchIds = new Set((limits ?? []).map((l) => l.branchId));
  const branchOptions = (branchesData?.items ?? [])
    .filter((b) => !configuredBranchIds.has(b.id) || editing?.branchId === b.id)
    .map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` }));

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ percentage: 10, isActive: true });
    setModalOpen(true);
  }

  function openEdit(limit: AdminBranchComplimentaryLimit) {
    setEditing(limit);
    form.setFieldsValue({ branchId: limit.branchId, percentage: limit.percentage, isActive: limit.isActive });
    setModalOpen(true);
  }

  async function handleSubmit(values: LimitFormValues) {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: { percentage: values.percentage, isActive: values.isActive } });
        message.success('Limit updated');
      } else {
        await upsert.mutateAsync(values);
        message.success('Limit saved');
      }
      setModalOpen(false);
    } catch (err) {
      message.error(
        err instanceof ApiClientError ? err.message :
        err instanceof Error ? err.message :
        'Something went wrong',
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync(id);
      message.success('Limit removed');
    } catch {
      message.error('Could not remove limit');
    }
  }

  const columns: ColumnsType<AdminBranchComplimentaryLimit> = [
    {
      title: 'Branch',
      key: 'branch',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.branchName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.branchCode}</Text>
        </div>
      ),
    },
    {
      title: 'Complimentary % Limit',
      dataIndex: 'percentage',
      width: 200,
      render: (v: number) => (
        <Tag color="gold" style={{ fontSize: 13, padding: '2px 10px' }}>{v}% of bill total</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 110,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      width: 130,
      render: (v: string) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, row) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(row)} />
          <Popconfirm title="Remove this branch limit?" onConfirm={() => handleDelete(row.id)} okText="Remove" okButtonProps={{ danger: true }}>
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0, color: colors.gold.primary }}>
            {navItem?.label ?? 'Complimentary Settings'}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Set the maximum complimentary value (as % of total bill) allowed per branch. Eligible services and products are controlled via the Services and Products master pages.
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}
          >
            Set Branch Limit
          </Button>
        </Col>
      </Row>

      <Card>
        <Table<AdminBranchComplimentaryLimit>
          columns={columns}
          dataSource={limits ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No branch limits configured yet. Click "Set Branch Limit" to add one.' }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Branch Limit' : 'Set Branch Complimentary Limit'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save' : 'Set Limit'}
        confirmLoading={upsert.isPending || update.isPending}
        width={460}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 8 }}>
          {!editing ? (
            <Form.Item label="Branch" name="branchId" rules={[{ required: true, message: 'Select a branch' }]}>
              <Select
                showSearch
                placeholder="Select branch"
                options={branchOptions}
                filterOption={(input, opt) =>
                  String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          ) : (
            <Form.Item label="Branch">
              <Input value={`${editing.branchName} (${editing.branchCode})`} disabled />
            </Form.Item>
          )}
          <Form.Item
            label="Complimentary % (of total bill)"
            name="percentage"
            rules={[{ required: true, message: 'Enter percentage' }]}
          >
            <InputNumber min={0} max={100} precision={0} addonAfter="%" style={{ width: '100%' }} placeholder="e.g. 20" />
          </Form.Item>
          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
