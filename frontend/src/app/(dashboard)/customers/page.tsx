'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useCustomers, useCreateCustomer } from '@/hooks/useSales';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@shared/format';
import type { Customer } from '@shared/types/sales';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Customers — list, search and create (module M01). */
export default function CustomersPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { data, isLoading } = useCustomers({ page, limit: 10, search: search || undefined });

  const createCustomer = useCreateCustomer();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createCustomer.mutateAsync(values);
      message.success('Customer created');
      setModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error(error instanceof ApiClientError ? error.message : 'Could not create customer');
    }
  };

  const columns: ColumnsType<Customer> = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name: string, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {row.companyName && (
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.companyName}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 110,
      render: (type: string) => (
        <Tag color={type === 'business' ? 'gold' : 'default'}>
          {type === 'business' ? 'Business' : 'Individual'}
        </Tag>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', render: (v: string | null) => v || '—' },
    { title: 'Email', dataIndex: 'email', render: (v: string | null) => v || '—' },
    { title: 'City', dataIndex: 'city', render: (v: string | null) => v || '—' },
    {
      title: 'Added',
      dataIndex: 'createdAt',
      width: 130,
      render: (v: string) => formatDate(v),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      render: (_, row) => (
        <Button type="link" onClick={() => router.push(`/customers/${row.id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ marginTop: 0 }}>
          Customers
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Customer
        </Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search name, phone, email"
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              setSearch(searchInput);
            }}
            allowClear
            onClear={() => {
              setPage(1);
              setSearch('');
            }}
            style={{ width: 280 }}
          />
          <Button
            onClick={() => {
              setPage(1);
              setSearch(searchInput);
            }}
          >
            Search
          </Button>
        </Space>

        <Table<Customer>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          onRow={(row) => ({
            onClick: () => router.push(`/customers/${row.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: 10,
            total: data?.meta.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Modal
        title="New customer"
        open={modalOpen}
        onOk={handleCreate}
        confirmLoading={createCustomer.isPending}
        onCancel={() => setModalOpen(false)}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={{ type: 'individual' }}>
          <Form.Item name="type" label="Customer type">
            <Select
              options={[
                { label: 'Individual', value: 'individual' },
                { label: 'Business', value: 'business' },
              ]}
            />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Customer or company name" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="phone" label="Phone" style={{ flex: 1 }}>
              <Input placeholder="+91 …" />
            </Form.Item>
            <Form.Item name="email" label="Email" style={{ flex: 1 }}>
              <Input placeholder="name@example.com" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="companyName" label="Company name" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="gstin" label="GSTIN" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="city" label="City" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Address" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
