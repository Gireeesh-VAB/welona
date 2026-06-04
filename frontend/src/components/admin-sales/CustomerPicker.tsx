'use client';

import { useState } from 'react';
import { App, Button, Form, Input, Modal, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAdminCustomers, useCreateAdminCustomer } from '@/hooks/useAdminCustomers';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBranchLock } from '@/hooks/useBranchLock';
import { ApiClientError } from '@/lib/api-client';

interface Props {
  /** Selected customer id (wired by the enclosing Form.Item). */
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Customer selector with inline creation — search an existing customer or
 * add a new one without leaving the form.
 */
export default function CustomerPicker({ value, onChange }: Props) {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const { data, isFetching } = useAdminCustomers({ limit: 20, search: search || undefined });
  const createCustomer = useCreateAdminCustomer();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Branch sessions auto-scope the new customer server-side; admins must pick a
  // branch so the customer (and any sale built on it) shows up for that branch.
  const { isBranchSession } = useBranchLock();
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const branchOptions = (branchesData?.items ?? []).map((b) => ({
    value: b.id,
    label: `${b.branchName} (${b.branchCode})`,
  }));

  const options = (data?.items ?? []).map((c) => ({
    label: c.phone ? `${c.name} · ${c.phone}` : c.name,
    value: c.id,
  }));

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      const customer = await createCustomer.mutateAsync(values);
      onChange?.(customer.id);
      message.success('Customer created');
      setModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error(error instanceof ApiClientError ? error.message : 'Could not create customer');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          showSearch
          filterOption={false}
          onSearch={setSearch}
          loading={isFetching}
          value={value}
          onChange={onChange}
          options={options}
          placeholder="Search customer by name or phone"
          notFoundContent={isFetching ? 'Searching…' : 'No customers found'}
          style={{ flex: 1 }}
        />
        <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New
        </Button>
      </div>

      <Modal
        title="New customer"
        open={modalOpen}
        onOk={handleCreate}
        confirmLoading={createCustomer.isPending}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Customer or company name" />
          </Form.Item>
          {!isBranchSession && (
            <Form.Item
              name="branchId"
              label="Branch"
              rules={[{ required: true, message: 'Assign the customer to a branch' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Select a branch"
                options={branchOptions}
              />
            </Form.Item>
          )}
          <Form.Item name="phone" label="Phone">
            <Input placeholder="+91 …" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="name@example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
