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
import { useAdminCustomers, useCreateAdminCustomer } from '@/hooks/useAdminCustomers';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBranchLock } from '@/hooks/useBranchLock';
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
  const { data, isLoading } = useAdminCustomers({ page, limit: 10, search: search || undefined });

  const createCustomer = useCreateAdminCustomer();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Branch sessions are auto-scoped server-side, so they don't pick a branch.
  // Admins MUST choose one so the new customer is visible to that branch.
  const { isBranchSession } = useBranchLock();
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const branchOptions = (branchesData?.items ?? []).map((b) => ({
    value: b.id,
    label: `${b.branchName} (${b.branchCode})`,
  }));

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
        <Button type="link" onClick={() => router.push(`/admin/customers/${row.id}`)}>
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
            onClick: () => router.push(`/admin/customers/${row.id}`),
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
          {!isBranchSession && (
            <Form.Item
              name="branchId"
              label="Branch"
              rules={[{ required: true, message: 'Assign the customer to a branch' }]}
              extra="The branch whose team will see and manage this customer."
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Select a branch"
                options={branchOptions}
              />
            </Form.Item>
          )}
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
