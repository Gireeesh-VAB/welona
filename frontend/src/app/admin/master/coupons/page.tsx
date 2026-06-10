'use client';

import { useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
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
  useAdminCoupons,
  useCreateAdminCoupon,
  useUpdateAdminCoupon,
  useDeleteAdminCoupon,
} from '@/hooks/useAdminCoupons';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminCoupon } from '@shared/types/admin-coupon';

const { Title, Text } = Typography;

interface CouponFormValues {
  couponName: string;
  couponCode: string;
  couponType: 'percentage' | 'fixed';
  couponValue: number;
  startDate: Dayjs;
  endDate: Dayjs;
  isActive: boolean;
  allBranches: boolean;
  branchIds: string[];
}

export default function AdminMasterCouponsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-coupons');
  const { message } = App.useApp();

  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminCoupons({ page, limit: 20 });
  const { data: branchesData } = useAdminBranches({ limit: 500 });
  const create = useCreateAdminCoupon();
  const update = useUpdateAdminCoupon();
  const remove = useDeleteAdminCoupon();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form] = Form.useForm<CouponFormValues>();
  const watchedType = Form.useWatch('couponType', form);
  const watchedAllBranches = Form.useWatch('allBranches', form);

  const branchOptions = (branchesData?.items ?? []).map((b) => ({
    value: b.id,
    label: `${b.branchName} (${b.branchCode})`,
  }));

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      couponType: 'percentage',
      isActive: true,
      allBranches: false,
      branchIds: [],
      startDate: dayjs(),
      endDate: dayjs().add(30, 'day'),
    });
    setModalOpen(true);
  }

  function openEdit(row: AdminCoupon) {
    setEditing(row);
    form.setFieldsValue({
      couponName:  row.couponName,
      couponCode:  row.couponCode,
      couponType:  row.couponType,
      couponValue: row.couponType === 'fixed' ? row.couponValue / 100 : row.couponValue,
      startDate:   dayjs(row.startDate),
      endDate:     dayjs(row.endDate),
      isActive:    row.isActive,
      allBranches: row.allBranches,
      branchIds:   row.branches.map((b) => b.id),
    });
    setModalOpen(true);
  }

  async function handleSubmit(values: CouponFormValues) {
    const body = {
      couponName:  values.couponName.trim(),
      couponCode:  values.couponCode.trim().toUpperCase(),
      couponType:  values.couponType,
      couponValue: values.couponType === 'fixed'
        ? Math.round((values.couponValue || 0) * 100)
        : Math.round(values.couponValue || 0),
      startDate:   values.startDate.startOf('day').toISOString(),
      endDate:     values.endDate.endOf('day').toISOString(),
      isActive:    values.isActive,
      allBranches: values.allBranches,
      branchIds:   values.allBranches ? [] : (values.branchIds ?? []),
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Coupon updated');
      } else {
        await create.mutateAsync(body);
        message.success('Coupon created');
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
      message.success('Coupon deleted');
    } catch {
      message.error('Could not delete coupon');
    }
  }

  function formatValue(row: AdminCoupon) {
    if (row.couponType === 'percentage') return `${row.couponValue}%`;
    return `₹${(row.couponValue / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function isExpired(row: AdminCoupon) {
    return new Date() > new Date(row.endDate);
  }

  const columns: ColumnsType<AdminCoupon> = [
    {
      title: 'Coupon Name',
      dataIndex: 'couponName',
      render: (v: string, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v}</div>
          <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{row.couponCode}</Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'couponType',
      width: 110,
      render: (v: string) => (
        <Tag color={v === 'percentage' ? 'blue' : 'purple'}>
          {v === 'percentage' ? 'Percentage' : 'Fixed Amount'}
        </Tag>
      ),
    },
    {
      title: 'Discount',
      key: 'value',
      width: 110,
      render: (_, row) => (
        <Tag color="gold" style={{ fontSize: 13, padding: '2px 10px', fontWeight: 700 }}>
          {formatValue(row)}
        </Tag>
      ),
    },
    {
      title: 'Valid Period',
      key: 'dates',
      width: 200,
      render: (_, row) => (
        <div style={{ fontSize: 12 }}>
          <div>{formatDate(row.startDate)} → {formatDate(row.endDate)}</div>
          {isExpired(row) && <Tag color="red" style={{ fontSize: 10, marginTop: 2 }}>Expired</Tag>}
        </div>
      ),
    },
    {
      title: 'Branches',
      key: 'branches',
      width: 160,
      render: (_, row) => row.allBranches
        ? <Tag color="cyan">All Branches</Tag>
        : <Tag>{row.branches.length} branch{row.branches.length !== 1 ? 'es' : ''}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 90,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, row) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(row)} />
          <Popconfirm
            title="Delete this coupon?"
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

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0, color: colors.gold.primary }}>
            {navItem?.label ?? 'Coupons'}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Create discount coupons (percentage or fixed amount) and assign them to branches.
            Branch staff can apply these during billing.
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ background: colors.gold.primary, borderColor: colors.gold.primary }}
          >
            Create Coupon
          </Button>
        </Col>
      </Row>

      <Card>
        <Table<AdminCoupon>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.meta?.total ?? 0,
            onChange: setPage,
            showTotal: (t) => `${t} coupons`,
          }}
          locale={{ emptyText: 'No coupons yet. Click "Create Coupon" to add one.' }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Coupon' : 'Create Coupon'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save' : 'Create'}
        confirmLoading={create.isPending || update.isPending}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 8 }}>
          <Form.Item label="Coupon Name" name="couponName" rules={[{ required: true, message: 'Enter coupon name' }]}>
            <Input placeholder="e.g. New Year Offer" />
          </Form.Item>

          <Form.Item
            label="Coupon Code"
            name="couponCode"
            rules={[
              { required: true, message: 'Enter coupon code' },
              { pattern: /^[A-Z0-9_-]+$/, message: 'Use uppercase letters, digits, dash or underscore' },
            ]}
          >
            <Input
              placeholder="e.g. NEWYEAR20"
              disabled={!!editing}
              onChange={(e) => {
                if (!editing) form.setFieldValue('couponCode', e.target.value.toUpperCase());
              }}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Coupon Type" name="couponType" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'percentage', label: 'Percentage (%)' },
                    { value: 'fixed',      label: 'Fixed Amount (₹)' },
                  ]}
                  onChange={() => form.setFieldValue('couponValue', undefined)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Value"
                name="couponValue"
                rules={[
                  { required: true, message: 'Enter value' },
                  {
                    validator: (_, v) => {
                      if (watchedType === 'percentage' && (v < 1 || v > 100)) {
                        return Promise.reject('Percentage must be 1–100');
                      }
                      if (v <= 0) return Promise.reject('Must be positive');
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={watchedType === 'percentage' ? 100 : undefined}
                  precision={watchedType === 'fixed' ? 2 : 0}
                  addonBefore={watchedType === 'fixed' ? '₹' : undefined}
                  addonAfter={watchedType === 'percentage' ? '%' : undefined}
                  placeholder={watchedType === 'percentage' ? '20' : '500'}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Start Date" name="startDate" rules={[{ required: true, message: 'Select start date' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="End Date" name="endDate" rules={[{ required: true, message: 'Select end date' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="All Branches" name="allBranches" valuePropName="checked">
            <Switch checkedChildren="All" unCheckedChildren="Select" />
          </Form.Item>

          {!watchedAllBranches && (
            <Form.Item
              label="Applicable Branches"
              name="branchIds"
              rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one branch' }]}
            >
              <Select
                mode="multiple"
                placeholder="Select branches"
                options={branchOptions}
                filterOption={(input, opt) =>
                  String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                maxTagCount="responsive"
              />
            </Form.Item>
          )}

          <Form.Item label="Status" name="isActive" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
