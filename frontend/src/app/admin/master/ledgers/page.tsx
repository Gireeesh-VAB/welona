'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
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
import {
  useAdminLedgers,
  useCreateAdminLedger,
  useDeleteAdminLedger,
  useUpdateAdminLedger,
} from '@/hooks/useAdminLedgers';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  LEDGER_GROUPS,
  LEDGER_GROUP_LABELS,
  type LedgerGroup,
} from '@shared/schemas/admin-ledgers';
import type { AdminLedger } from '@shared/types/admin-ledger';
import type { AdminLedgerCreateInput } from '@shared/schemas/admin-ledgers';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const LEDGER_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Name',          key: 'name',           required: true,  type: 'string', hint: 'e.g. Cash on Hand' },
  { header: 'Group',         key: 'group',          required: true,  type: 'enum',
    enumOptions: [...LEDGER_GROUPS], hint: 'One of the LEDGER groups' },
  { header: 'Balance Type',  key: 'balanceType',    required: true,  type: 'enum',
    enumOptions: ['debit', 'credit'], hint: 'debit or credit' },
  { header: 'Opening (₹)',   key: 'openingBalance', required: false, type: 'number',
    hint: 'In rupees, e.g. 50000',
    transform: (v) => Math.round(Number(v) * 100) },
  { header: 'GST Number',    key: 'gstNumber',      required: false, type: 'string' },
  { header: 'Description',   key: 'description',    required: false, type: 'string' },
];
const LEDGER_BULK_SAMPLES = [
  { name: 'Cash on Hand', group: 'cash', balanceType: 'debit', openingBalance: '50000', gstNumber: '', description: 'Petty cash + drawer float' },
  { name: 'GST Payable',  group: 'duties_taxes', balanceType: 'credit', openingBalance: '0', gstNumber: '', description: 'Output GST collected on sales' },
];

const { Title, Text } = Typography;

interface LedgerFormValues {
  name: string;
  group: LedgerGroup;
  openingBalanceRupees: number;
  balanceType: 'debit' | 'credit';
  description?: string;
  gstNumber?: string;
}

const rupeesToPaise = (rupees: number) => Math.round((rupees || 0) * 100);
const paiseToRupees = (paise: number) => paise / 100;

/** Format ₹ amount stored in paise. Returns em-dash for zero. */
const inr = (paise: number) =>
  paise === 0
    ? '—'
    : (paise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Colour hint per group — keeps the chart-of-accounts readable at a glance. */
const groupColor: Record<LedgerGroup, string> = {
  sales: 'green',
  direct_income: 'green',
  indirect_income: 'green',
  purchase: 'volcano',
  direct_expense: 'volcano',
  indirect_expense: 'volcano',
  cash: 'blue',
  bank: 'geekblue',
  sundry_debtor: 'purple',
  sundry_creditor: 'magenta',
  duties_taxes: 'gold',
  fixed_asset: 'cyan',
  current_asset: 'cyan',
  current_liability: 'magenta',
  capital_account: 'lime',
  loans: 'orange',
};

const groupOptions = LEDGER_GROUPS.map((g) => ({
  value: g,
  label: LEDGER_GROUP_LABELS[g],
}));

export default function AdminMasterLedgersPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-ledgers')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<LedgerGroup | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminLedgers({
    search: search || undefined,
    group: groupFilter,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLedger | null>(null);
  const [form] = Form.useForm<LedgerFormValues>();

  const create = useCreateAdminLedger();
  const update = useUpdateAdminLedger();
  const remove = useDeleteAdminLedger();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      balanceType: 'debit',
      openingBalanceRupees: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (row: AdminLedger) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      group: row.group,
      openingBalanceRupees: paiseToRupees(row.openingBalance),
      balanceType: row.balanceType,
      description: row.description ?? undefined,
      gstNumber: row.gstNumber ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: LedgerFormValues) => {
    const body: AdminLedgerCreateInput = {
      name: values.name.trim(),
      group: values.group,
      openingBalance: rupeesToPaise(values.openingBalanceRupees),
      balanceType: values.balanceType,
      description: values.description?.trim() ? values.description.trim() : undefined,
      gstNumber: values.gstNumber?.trim() ? values.gstNumber.trim() : undefined,
      // Activate/deactivate UI removed — every ledger stays active.
      isActive: true,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Ledger updated');
      } else {
        await create.mutateAsync(body);
        message.success('Ledger added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminLedger) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Ledger deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminLedger> = useMemo(
    () => [
      {
        title: 'Manage',
        key: 'actions',
        width: 100,
        fixed: 'left',
        render: (_, row) => (
          <Space size={4}>
            <Tooltip title="Edit">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => openEdit(row)}
              />
            </Tooltip>
            <Popconfirm
              title={`Delete ${row.name}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => onDelete(row)}
            >
              <Tooltip title="Delete">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
      {
        title: 'Ledger Name',
        dataIndex: 'name',
        width: 260,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string, row) => (
          <div style={{ lineHeight: 1.3 }}>
            <span style={{ fontWeight: 600, color: colors.text.primary }}>{value}</span>
            {row.gstNumber && (
              <div>
                <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                  GST {row.gstNumber}
                </Text>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Group',
        dataIndex: 'group',
        width: 170,
        sorter: (a, b) => a.group.localeCompare(b.group),
        render: (value: LedgerGroup) => (
          <Tag color={groupColor[value]} style={{ fontSize: 12 }}>
            {LEDGER_GROUP_LABELS[value]}
          </Tag>
        ),
      },
      {
        title: 'Opening Balance',
        dataIndex: 'openingBalance',
        width: 160,
        sorter: (a, b) => a.openingBalance - b.openingBalance,
        render: (value: number) =>
          value === 0 ? (
            emptyCell
          ) : (
            <span style={{ color: colors.text.primary }}>{inr(value)}</span>
          ),
      },
      {
        title: 'Type',
        dataIndex: 'balanceType',
        width: 100,
        render: (value: 'debit' | 'credit') => (
          <Tag color={value === 'debit' ? 'blue' : 'magenta'} style={{ fontSize: 11 }}>
            {value === 'debit' ? 'Dr' : 'Cr'}
          </Tag>
        ),
      },
      {
        title: 'Created By',
        dataIndex: ['createdBy', 'name'],
        key: 'createdBy',
        width: 170,
        render: (_: unknown, row) =>
          row.createdBy ? (
            <span style={{ color: colors.text.primary }}>{row.createdBy.name}</span>
          ) : (
            emptyCell
          ),
      },
      {
        title: 'Created Date',
        dataIndex: 'createdAt',
        width: 140,
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{formatDate(value)}</span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.text.primary, colors.text.placeholder],
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
      `${range[0]}–${range[1]} of ${total} ledger${total === 1 ? '' : 's'}`,
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
            {navItem.label}
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <BulkUploadButton
            entityName="Ledgers"
            entityPlural="ledgers"
            columns={LEDGER_BULK_COLUMNS}
            sampleRows={LEDGER_BULK_SAMPLES}
            onImport={async (row) => {
              const body: AdminLedgerCreateInput = {
                name: String(row.name),
                group: row.group as LedgerGroup,
                balanceType: row.balanceType as 'debit' | 'credit',
                openingBalance: row.openingBalance !== undefined ? Number(row.openingBalance) : 0,
                gstNumber: row.gstNumber ? String(row.gstNumber) : undefined,
                description: row.description ? String(row.description) : undefined,
                isActive: true,
              };
              await create.mutateAsync(body);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Ledger
          </Button>
        </Space>
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
              placeholder="Search ledger name, GSTIN or description"
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
              placeholder="All groups"
              style={{ minWidth: 200 }}
              options={groupOptions}
              value={groupFilter}
              onChange={(v) => {
                setGroupFilter(v);
                setPage(1);
              }}
            />
          </Col>
        </Row>

        <Table<AdminLedger>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1130 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Ledger' : 'Add Ledger'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Ledger'}
        confirmLoading={create.isPending || update.isPending}
        width={640}
        destroyOnClose
      >
        <Form<LedgerFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
         
        >
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                label="Ledger Name"
                name="name"
                rules={[{ required: true, message: 'Enter a name' }]}
              >
                <Input placeholder="e.g. Sales — Skin Services" maxLength={120} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                label="Group"
                name="group"
                rules={[{ required: true, message: 'Pick a group' }]}
              >
                <Select
                  showSearch
                  options={groupOptions}
                  placeholder="Pick a group"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Opening Balance (₹)"
                name="openingBalanceRupees"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Type"
                name="balanceType"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'debit', label: 'Debit (Dr)' },
                    { value: 'credit', label: 'Credit (Cr)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="GSTIN"
                name="gstNumber"
                tooltip="Required only for party ledgers (Sundry Debtor / Creditor)"
              >
                <Input placeholder="Optional" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Description" name="description">
            <Input.TextArea
              placeholder="Optional notes about this ledger"
              rows={2}
              maxLength={300}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
