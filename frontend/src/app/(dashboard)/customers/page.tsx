'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  App,
  Alert,
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
import { PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useCustomers, useCreateCustomer } from '@/hooks/useSales';
import { ApiClientError } from '@/lib/api-client';
import { PHONE_CODE_OPTIONS, buildPhone } from '@/components/customers/countryData';
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
  const [phoneInput, setPhoneInput] = useState('');

  // Search by phone as user types — enabled once 7+ digits are entered
  const { data: phoneSearchData, isFetching: phoneSearching } = useCustomers({
    search: phoneInput,
    limit: 5,
  });

  // Strip non-digits for comparison
  const normalise = (s: string) => s.replace(/\D/g, '');
  const existingCustomer = phoneInput.length >= 7
    ? (phoneSearchData?.items ?? []).find(c =>
        c.phone && normalise(c.phone).endsWith(normalise(phoneInput))
      )
    : null;

  const handleCreate = async () => {
    // If the number belongs to an existing customer, redirect instead of creating
    if (existingCustomer) {
      setModalOpen(false);
      router.push(`/customers/${existingCustomer.id}`);
      return;
    }
    const values = await form.validateFields();
    const phone = buildPhone(values.phoneCode, values.phone);
    delete values.phoneCode;
    try {
      const created = await createCustomer.mutateAsync({ ...values, phone });
      message.success('Customer created');
      setModalOpen(false);
      form.resetFields();
      setPhoneInput('');
      router.push(`/customers/${(created as Customer).id}`);
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
          Manage
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
        title="New Customer"
        open={modalOpen}
        onOk={handleCreate}
        okText={existingCustomer ? 'Go to Customer' : 'Create Customer'}
        confirmLoading={createCustomer.isPending}
        onCancel={() => { setModalOpen(false); setPhoneInput(''); form.resetFields(); }}
        width={400}
        destroyOnClose
        afterOpenChange={(open) => { if (!open) { setPhoneInput(''); } }}
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={{ phoneCode: '+91' }}>
          <Form.Item
            name="phone"
            label="Mobile Number"
            rules={[{ required: true, message: 'Mobile number is required' }]}
            style={{ marginBottom: 12 }}
          >
            <Input
              addonBefore={
                <Form.Item name="phoneCode" noStyle>
                  <Select showSearch style={{ width: 80 }} options={PHONE_CODE_OPTIONS} />
                </Form.Item>
              }
              placeholder="10-digit mobile number"
              inputMode="tel"
              autoFocus
              onChange={(e) => setPhoneInput(e.target.value.trim())}
              suffix={phoneSearching && phoneInput.length >= 7
                ? <span style={{ fontSize: 11, color: '#aaa' }}>checking…</span>
                : undefined}
            />
          </Form.Item>

          {existingCustomer ? (
            <Alert
              type="warning"
              showIcon
              icon={<UserOutlined />}
              message={
                <span>
                  <strong>{existingCustomer.name}</strong> is already registered with this number.
                  Click <em>Go to Customer</em> to open their profile.
                </span>
              }
              style={{ marginBottom: 12 }}
            />
          ) : (
            <Form.Item
              name="name"
              label="Customer Name"
              rules={[{ required: true, message: 'Name is required' }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="Full name" />
            </Form.Item>
          )}
        </Form>

        {!existingCustomer && (
          <div style={{ fontSize: 12, color: '#888' }}>
            Additional details (gender, address, email, etc.) can be added from the customer profile.
          </div>
        )}
      </Modal>
    </div>
  );
}
