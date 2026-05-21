'use client';

import { useMemo, useState } from 'react';
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
  Table,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  useAdminReceiptCancellations,
  useCreateAdminReceiptCancellation,
  useDeleteAdminReceiptCancellation,
  useUpdateAdminReceiptCancellation,
} from '@/hooks/useAdminReceiptCancellations';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminReceiptCancellation } from '@/types/admin-receipt-cancellation';

const { Title, Text } = Typography;

interface FormValues {
  branchId?: string;
  customerName: string;
  packageNo?: string;
  receiptNo: string;
  paidAmountRupees: number;
  remarks?: string;
  requestDate: Dayjs;
}

const rupeesToPaise = (r: number) => Math.round((r || 0) * 100);
const paiseToRupees = (p: number) => p / 100;
const inr = (p: number) =>
  (p / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

function formatDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getFullYear()}`;
}

export default function AdminReceiptCancelPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminReceiptCancellations({
    search: search || undefined,
    branchId: branchFilter,
    page,
    limit,
  });

  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(
    () =>
      (branchesData?.items ?? []).map((b) => ({
        value: b.id,
        label: `${b.branchName} (${b.branchCode})`,
      })),
    [branchesData],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminReceiptCancellation | null>(null);
  const [form] = Form.useForm<FormValues>();

  const create = useCreateAdminReceiptCancellation();
  const update = useUpdateAdminReceiptCancellation();
  const remove = useDeleteAdminReceiptCancellation();

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ paidAmountRupees: 0, requestDate: dayjs() });
    setModalOpen(true);
  };

  const openEdit = (row: AdminReceiptCancellation) => {
    setEditing(row);
    form.setFieldsValue({
      branchId: row.branch?.id,
      customerName: row.customerName,
      packageNo: row.packageNo ?? undefined,
      receiptNo: row.receiptNo,
      paidAmountRupees: paiseToRupees(row.paidAmount),
      remarks: row.remarks ?? undefined,
      requestDate: dayjs(row.requestDate),
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const body = {
      branchId: values.branchId,
      customerName: values.customerName.trim(),
      packageNo: values.packageNo?.trim() || undefined,
      receiptNo: values.receiptNo.trim(),
      paidAmount: rupeesToPaise(values.paidAmountRupees),
      remarks: values.remarks?.trim() || undefined,
      requestDate: values.requestDate.toISOString(),
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Request updated');
      } else {
        await create.mutateAsync(body);
        message.success('Request added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminReceiptCancellation) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminReceiptCancellation> = useMemo(
    () => [
      {
        title: 'Manage',
        key: 'actions',
        width: 110,
        fixed: 'left',
        render: (_, row) => (
          <Space size={6}>
            <Tooltip title="Edit">
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(row)}
                style={{ background: '#5B2C8B', borderColor: '#5B2C8B' }}
              />
            </Tooltip>
            <Popconfirm
              title="Delete this request?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => onDelete(row)}
            >
              <Tooltip title="Delete">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  style={{
                    background: colors.status.error,
                    borderColor: colors.status.error,
                    color: '#FFFFFF',
                  }}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
      {
        title: 'Branch Name',
        dataIndex: ['branch', 'name'],
        key: 'branch',
        width: 200,
        render: (_: unknown, row) =>
          row.branch ? (
            <span style={{ color: colors.text.primary }}>{row.branch.name}</span>
          ) : (
            emptyCell
          ),
      },
      {
        title: 'Customer Name',
        dataIndex: 'customerName',
        width: 200,
        render: (v: string) => <span style={{ color: colors.text.primary }}>{v}</span>,
      },
      {
        title: 'Package No',
        dataIndex: 'packageNo',
        width: 150,
        render: (v: string | null) =>
          v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : emptyCell,
      },
      {
        title: 'Receipt No',
        dataIndex: 'receiptNo',
        width: 150,
        render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
      },
      {
        title: 'Paid Amount',
        dataIndex: 'paidAmount',
        width: 150,
        sorter: (a, b) => a.paidAmount - b.paidAmount,
        render: (v: number) =>
          v === 0 ? emptyCell : <span style={{ color: colors.text.primary }}>{inr(v)}</span>,
      },
      {
        title: 'Remarks',
        dataIndex: 'remarks',
        width: 240,
        render: (v: string | null) =>
          v ? <span style={{ color: colors.text.primary }}>{v}</span> : emptyCell,
      },
      {
        title: 'Request Date',
        dataIndex: 'requestDate',
        width: 160,
        sorter: (a, b) =>
          new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime(),
        render: (v: string) => (
          <span style={{ color: colors.text.primary }}>{formatDmy(v)}</span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.text.primary, colors.text.placeholder, colors.status.error],
  );

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    onChange: (next, size) => {
      setPage(next);
      if (size !== limit) setLimit(size);
    },
    showTotal: (total, range) =>
      `${range[0]} - ${range[1]} of ${total} item${total === 1 ? '' : 's'}`,
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            Receipt Cancellation
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Pending receipt-cancellation / refund requests.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Request
        </Button>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={12} style={{ marginBottom: 12 }} wrap>
          <Col flex="auto" style={{ minWidth: 240 }}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search customer, package no, receipt no or remarks"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="All branches"
              style={{ minWidth: 220 }}
              options={branchOptions}
              value={branchFilter}
              onChange={(v) => {
                setBranchFilter(v);
                setPage(1);
              }}
            />
          </Col>
        </Row>

        <Table<AdminReceiptCancellation>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1460 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Receipt Cancellation' : 'Add Receipt Cancellation'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Request'}
        confirmLoading={create.isPending || update.isPending}
        width={620}
        destroyOnClose
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Branch" name="branchId">
                <Select
                  showSearch
                  allowClear
                  placeholder="Pick from master"
                  options={branchOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Request Date"
                name="requestDate"
                rules={[{ required: true, message: 'Required' }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Customer Name"
                name="customerName"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input maxLength={160} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Package No" name="packageNo">
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Receipt No"
                name="receiptNo"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Paid Amount (₹)" name="paidAmountRupees">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Remarks" name="remarks">
                <Input.TextArea rows={2} maxLength={500} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
