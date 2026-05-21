'use client';

import { useState } from 'react';
import { App, Button, Empty, Form, Input, List, Modal, Rate, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useFeedback, useCreateFeedback } from '@/hooks/useCustomerModules';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { Feedback } from '@/types/customer-modules';

const { Text, Paragraph } = Typography;

/** Client Feedback module — ratings and comments left by a customer. */
export default function FeedbackTab({ customerId }: { customerId: string }) {
  const { message } = App.useApp();
  const { data, isLoading } = useFeedback(customerId);
  const createFeedback = useCreateFeedback(customerId);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const handleCreate = async () => {
    const v = await form.validateFields();
    try {
      await createFeedback.mutateAsync({
        rating: v.rating,
        comment: v.comment || undefined,
        relatedTo: v.relatedTo || undefined,
      });
      message.success('Feedback recorded');
      setOpen(false);
      form.resetFields();
    } catch (e) {
      fail(e, 'Could not record feedback');
    }
  };

  const items = data ?? [];
  const average =
    items.length > 0
      ? (items.reduce((sum, f) => sum + f.rating, 0) / items.length).toFixed(1)
      : null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        {average ? (
          <Text>
            Average rating: <Text strong>{average} / 5</Text> ({items.length})
          </Text>
        ) : (
          <span />
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Feedback
        </Button>
      </div>

      <List<Feedback>
        loading={isLoading}
        dataSource={items}
        locale={{ emptyText: <Empty description="No feedback yet" /> }}
        renderItem={(f) => (
          <List.Item>
            <List.Item.Meta
              title={
                <span>
                  <Rate disabled value={f.rating} style={{ fontSize: 14 }} />
                  {f.relatedTo && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      · {f.relatedTo}
                    </Text>
                  )}
                </span>
              }
              description={
                <div>
                  {f.comment && <Paragraph style={{ marginBottom: 4 }}>{f.comment}</Paragraph>}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDate(f.createdAt)}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title="Add Feedback"
        open={open}
        onOk={handleCreate}
        confirmLoading={createFeedback.isPending}
        onCancel={() => setOpen(false)}
        okText="Save Feedback"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="rating"
            label="Rating"
            rules={[{ required: true, message: 'Pick a rating' }]}
          >
            <Rate />
          </Form.Item>
          <Form.Item name="relatedTo" label="Related To">
            <Input placeholder="e.g. service or staff this feedback is about" />
          </Form.Item>
          <Form.Item name="comment" label="Comment" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="What did the client say?" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
