'use client';

import { useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useMasterOptions,
  useCreateMasterOption,
  useUpdateMasterOption,
  useDeactivateMasterOption,
} from '@/hooks/useSales';
import { ApiClientError } from '@/lib/api-client';
import type { MasterOption } from '@shared/types/sales';
import { Typography } from 'antd';

const { Text } = Typography;

interface Props {
  /** Master kind: enquiry_type | media | call_type. */
  kind: string;
  /** Section heading, e.g. "Enquiry Types". */
  title: string;
  /** Singular noun used in buttons/messages, e.g. "enquiry type". */
  noun: string;
}

/**
 * Generic master-list manager for a configurable dropdown — add, rename and
 * activate/deactivate the options selectable on the enquiry form.
 */
export default function OptionMaster({ kind, title, noun }: Props) {
  const { message } = App.useApp();
  const { data: options, isLoading } = useMasterOptions(kind);
  const createOption = useCreateMasterOption();
  const updateOption = useUpdateMasterOption();
  const deactivateOption = useDeactivateMasterOption();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterOption | null>(null);
  const [form] = Form.useForm();

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (option: MasterOption) => {
    setEditing(option);
    form.setFieldsValue({ label: option.label });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateOption.mutateAsync({ id: editing.id, body: { label: values.label } });
        message.success(`${title} option updated`);
      } else {
        await createOption.mutateAsync({ kind, label: values.label });
        message.success(`${title} option added`);
      }
      setModalOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e, `Could not save ${noun}`);
    }
  };

  const toggleActive = async (option: MasterOption) => {
    try {
      if (option.isActive) {
        await deactivateOption.mutateAsync(option.id);
        message.success(`${title} option deactivated`);
      } else {
        await updateOption.mutateAsync({ id: option.id, body: { isActive: true } });
        message.success(`${title} option reactivated`);
      }
    } catch (e) {
      fail(e, `Could not update ${noun}`);
    }
  };

  const columns: ColumnsType<MasterOption> = [
    { title: 'Label', dataIndex: 'label', render: (v: string) => <strong>{v}</strong> },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 120,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 190,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            Edit
          </Button>
          {row.isActive ? (
            <Popconfirm
              title={`Deactivate this ${noun}?`}
              onConfirm={() => toggleActive(row)}
              okText="Deactivate"
            >
              <Button size="small" danger>
                Deactivate
              </Button>
            </Popconfirm>
          ) : (
            <Button size="small" onClick={() => toggleActive(row)}>
              Activate
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={title}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New {noun}
        </Button>
      }
    >
      <Text type="secondary">
        These options appear in the &ldquo;{title}&rdquo; dropdown on the enquiry form.
      </Text>

      <Table<MasterOption>
        rowKey="id"
        style={{ marginTop: 16 }}
        columns={columns}
        dataSource={options ?? []}
        loading={isLoading}
        pagination={false}
      />

      <Modal
        title={editing ? `Edit ${noun}` : `New ${noun}`}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={createOption.isPending || updateOption.isPending}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Label is required' }]}>
            <Input placeholder={`e.g. a ${noun} option`} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
