'use client';

import { useState } from 'react';
import { App, Button, DatePicker, Empty, Form, Input, Modal, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDocuments, useCreateDocument } from '@/hooks/useCustomerModules';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { CustomerDocument } from '@/types/customer-modules';

const { Text, Link } = Typography;

/** Client Documents module — document records for a customer. */
export default function DocumentsTab({ customerId }: { customerId: string }) {
  const { message } = App.useApp();
  const { data, isLoading } = useDocuments(customerId);
  const createDocument = useCreateDocument(customerId);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const handleCreate = async () => {
    const v = await form.validateFields();
    try {
      await createDocument.mutateAsync({
        title: v.title,
        docType: v.docType || undefined,
        fileUrl: v.fileUrl || undefined,
        notes: v.notes || undefined,
        uploadedAt: v.uploadedAt ? v.uploadedAt.toISOString() : undefined,
      });
      message.success('Document added');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e, 'Could not add document');
    }
  };

  const columns: ColumnsType<CustomerDocument> = [
    { title: 'Added', dataIndex: 'uploadedAt', render: (v: string) => formatDate(v) },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Type', dataIndex: 'docType', render: (v: string | null) => v || '—' },
    {
      title: 'File',
      dataIndex: 'fileUrl',
      render: (v: string | null) =>
        v ? (
          <Link href={v} target="_blank" rel="noreferrer">
            Open
          </Link>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Document
        </Button>
      </div>

      <Table<CustomerDocument>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
        expandable={{
          expandedRowRender: (row) => (
            <Text type="secondary">{row.notes || 'No notes'}</Text>
          ),
          rowExpandable: (row) => !!row.notes,
        }}
        locale={{ emptyText: <Empty description="No documents yet" /> }}
      />

      <Modal
        title="Add Document"
        open={open}
        onOk={handleCreate}
        confirmLoading={createDocument.isPending}
        onCancel={() => setOpen(false)}
        okText="Save Document"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="e.g. ID Proof, Consent Form" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="uploadedAt" label="Document Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="docType" label="Type" style={{ flex: 1 }}>
              <Input placeholder="e.g. ID proof, contract" />
            </Form.Item>
          </div>
          <Form.Item
            name="fileUrl"
            label="File URL"
            rules={[{ type: 'url', message: 'Enter a valid URL' }]}
          >
            <Input placeholder="https://… (optional)" />
          </Form.Item>
          <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>

      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        {data?.length ?? 0} document(s)
      </Text>
    </div>
  );
}
