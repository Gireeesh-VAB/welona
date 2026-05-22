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
  useAdminVoucherCancellations,
  useCreateAdminVoucherCancellation,
  useDeleteAdminVoucherCancellation,
  useUpdateAdminVoucherCancellation,
} from '@/hooks/useAdminVoucherCancellations';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminVoucherCancellation } from '@shared/types/admin-voucher-cancellation';

const { Title, Text } = Typography;

interface FormValues {
  branchId?: string;
  expenseType: string;
  amountRupees: number;
  remarks?: string;
  cancelReason?: string;
  requestDate?: Dayjs;
}

const rupeesToPaise = (r: number) => Math.round((r || 0) * 100);
const paiseToRupees = (p: number) => p / 100;
const inr = (p: number) =>
  (p / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

export default function AdminVoucherCancelPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  // --- Filters (the screenshot calls out a filter requirement) ---
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminVoucherCancellations({
    search: search || undefined,
    branchId: branchFilter,
    expenseType: expenseTypeFilter,
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

  // Derive the expense-type filter options from rows already loaded — works
  // out of the box and grows as new expense types are added.
  const expenseTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of data?.items ?? []) set.add(row.expenseType);
    return Array.from(set)
      .sort()
      .map((v) => ({ value: v, label: v }));
  }, [data]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminVoucherCancellation | null>(null);
  const [form] = Form.useForm<FormValues>();

  const create = useCreateAdminVoucherCancellation();
  const update = useUpdateAdminVoucherCancellation();
  const remove = useDeleteAdminVoucherCancellation();

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ amountRupees: 0, requestDate: dayjs() });
    setModalOpen(true);
  };

  const openEdit = (row: AdminVoucherCancellation) => {
    setEditing(row);
    form.setFieldsValue({
      branchId: row.branch?.id,
      expenseType: row.expenseType,
      amountRupees: paiseToRupees(row.amount),
      remarks: row.remarks ?? undefined,
      cancelReason: row.cancelReason ?? undefined,
      requestDate: dayjs(row.requestDate),
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const body = {
      branchId: values.branchId,
      expenseType: values.expenseType.trim(),
      amount: rupeesToPaise(values.amountRupees),
      remarks: values.remarks?.trim() || undefined,
      cancelReason: values.cancelReason?.trim() || undefined,
      requestDate: values.requestDate ? values.requestDate.toISOString() : undefined,
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

  const onDelete = async (row: AdminVoucherCancellation) => {
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

  const columns: ColumnsType<AdminVoucherCancellation> = useMemo(
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
        title: 'BranchName',
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
        title: 'ExpenseType',
        dataIndex: 'expenseType',
        width: 180,
        render: (v: string) => <span style={{ color: colors.text.primary }}>{v}</span>,
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        width: 150,
        sorter: (a, b) => a.amount - b.amount,
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
        title: 'CancelReason',
        dataIndex: 'cancelReason',
        width: 240,
        render: (v: string | null) =>
          v ? <span style={{ color: colors.text.primary }}>{v}</span> : emptyCell,
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
            Voucher Cancellation
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Pending expense-voucher cancellation requests.
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
              placeholder="Search expense type, remarks or cancel reason"
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
              style={{ minWidth: 200 }}
              options={branchOptions}
              value={branchFilter}
              onChange={(v) => {
                setBranchFilter(v);
                setPage(1);
              }}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="All expense types"
              style={{ minWidth: 200 }}
              options={expenseTypeOptions}
              value={expenseTypeFilter}
              onChange={(v) => {
                setExpenseTypeFilter(v);
                setPage(1);
              }}
            />
          </Col>
        </Row>

        <Table<AdminVoucherCancellation>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1120 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Voucher Cancellation' : 'Add Voucher Cancellation'}
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
              <Form.Item label="Request Date" name="requestDate">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Expense Type"
                name="expenseType"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input
                  maxLength={120}
                  placeholder="e.g. Rent, Salaries, Utilities"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Amount (₹)" name="amountRupees">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Remarks" name="remarks">
                <Input.TextArea rows={2} maxLength={500} showCount />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Cancel Reason" name="cancelReason">
                <Input.TextArea rows={2} maxLength={300} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
