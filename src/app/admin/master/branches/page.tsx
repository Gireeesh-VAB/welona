'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
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
  useAdminBranches,
  useCreateAdminBranch,
  useDeleteAdminBranch,
  useUpdateAdminBranch,
} from '@/hooks/useAdminBranches';
import { useZones } from '@/hooks/useZones';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminBranch } from '@/types/admin-branch';
import type { AdminBranchCreateInput } from '@/lib/admin-branches';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const BRANCH_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Branch Name', key: 'branchName', required: true,  type: 'string', hint: 'e.g. Jubilee Hills' },
  { header: 'Branch Code', key: 'branchCode', required: true,  type: 'string', hint: 'Unique, e.g. JH001' },
  { header: 'State',       key: '_state',     required: true,  type: 'string', hint: 'Zone state name, e.g. Telangana' },
  { header: 'Address',     key: 'address',    required: false, type: 'string' },
  { header: 'Phone',       key: 'phone',      required: false, type: 'phone',  hint: '+91-9876543210' },
  { header: 'Email',       key: 'email',      required: false, type: 'email' },
  { header: 'IP Address',  key: 'ipAddress',  required: false, type: 'string', hint: 'Branch LAN IP, optional' },
];
const BRANCH_BULK_SAMPLES = [
  { branchName: 'Jubilee Hills', branchCode: 'JH001', _state: 'Telangana',
    address: 'Road No. 36, Jubilee Hills', phone: '+91-9876543210', email: 'jubilee@welona.com', ipAddress: '192.168.1.10' },
];

interface BranchFormValues {
  branchName: string;
  branchCode: string;
  zoneId: string;
  address?: string;
  phone?: string;
  email?: string;
  ipAddress?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminMasterBranchesPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-branches')!;
  const { message } = App.useApp();

  // --- Table state ---
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useAdminBranches({
    search: search || undefined,
    page,
    limit,
  });

  // Zone options for the dropdown — fetch a generous page so the picker
  // doesn't paginate; the master zones list isn't expected to be huge.
  const { data: zonesData } = useZones({ limit: 100 });
  const zoneOptions = useMemo(
    () =>
      (zonesData?.items ?? []).map((z) => ({
        value: z.id,
        label: `${z.country} — ${z.stateName}`,
      })),
    [zonesData],
  );

  // --- Modal state ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBranch | null>(null);
  const [form] = Form.useForm<BranchFormValues>();

  const createBranch = useCreateAdminBranch();
  const updateBranch = useUpdateAdminBranch();
  const deleteBranch = useDeleteAdminBranch();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (branch: AdminBranch) => {
    setEditing(branch);
    form.setFieldsValue({
      branchName: branch.branchName,
      branchCode: branch.branchCode,
      zoneId: branch.zone?.id ?? '',
      address: branch.address ?? undefined,
      phone: branch.phone ?? undefined,
      email: branch.email ?? undefined,
      ipAddress: branch.ipAddress ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: BranchFormValues) => {
    const body: AdminBranchCreateInput = {
      branchName: values.branchName.trim(),
      branchCode: values.branchCode.trim(),
      zoneId: values.zoneId,
      address: values.address?.trim() ? values.address.trim() : undefined,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      email: values.email?.trim() ? values.email.trim() : undefined,
      ipAddress: values.ipAddress?.trim() ? values.ipAddress.trim() : undefined,
    };
    try {
      if (editing) {
        await updateBranch.mutateAsync({ id: editing.id, body });
        message.success('Branch updated');
      } else {
        await createBranch.mutateAsync(body);
        message.success('Branch added');
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      fail(err, 'Save failed. Please try again.');
    }
  };

  const onDelete = async (branch: AdminBranch) => {
    try {
      await deleteBranch.mutateAsync(branch.id);
      message.success('Branch deleted');
    } catch (err) {
      fail(err, 'Delete failed. Please try again.');
    }
  };

  /** Em-dash shown in muted text for any empty cell — consistent visual. */
  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminBranch> = useMemo(
    () => [
      {
        title: 'Branch',
        dataIndex: 'branchName',
        width: 220,
        sorter: (a, b) => a.branchName.localeCompare(b.branchName),
        render: (_value, branch) => (
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, color: colors.text.primary }}>
              {branch.branchName}
            </div>
            <Text code style={{ fontSize: 11 }}>
              {branch.branchCode}
            </Text>
          </div>
        ),
      },
      {
        title: 'Zone',
        dataIndex: 'zone',
        width: 150,
        render: (zone: AdminBranch['zone']) =>
          zone ? (
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ color: colors.text.primary }}>{zone.stateName}</div>
              <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                {zone.country}
              </Text>
            </div>
          ) : (
            emptyCell
          ),
      },
      {
        title: 'Address',
        dataIndex: 'address',
        width: 260,
        ellipsis: { showTitle: false },
        render: (value: string | null) =>
          value ? (
            <Tooltip title={value} placement="topLeft">
              <span>{value}</span>
            </Tooltip>
          ) : (
            emptyCell
          ),
      },
      {
        title: 'Contact',
        key: 'contact',
        width: 230,
        render: (_, branch) => (
          <div style={{ lineHeight: 1.4 }}>
            {branch.phone ? (
              <div style={{ color: colors.text.primary, fontSize: 13 }}>
                {branch.phone}
              </div>
            ) : (
              <div>{emptyCell}</div>
            )}
            {branch.email ? (
              <Tooltip title={branch.email} placement="topLeft">
                <div
                  style={{
                    color: colors.text.placeholder,
                    fontSize: 11,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 210,
                  }}
                >
                  {branch.email}
                </div>
              </Tooltip>
            ) : null}
          </div>
        ),
      },
      {
        title: 'IP Address',
        dataIndex: 'ipAddress',
        width: 140,
        render: (value: string | null) =>
          value ? <Text code style={{ fontSize: 12 }}>{value}</Text> : emptyCell,
      },
      {
        title: 'Created',
        key: 'created',
        width: 170,
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (_, branch) => (
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ color: colors.text.primary, fontSize: 13 }}>
              {formatDate(branch.createdAt)}
            </div>
            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
              by {branch.createdBy?.name ?? '—'}
            </Text>
          </div>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 110,
        align: 'right',
        fixed: 'right',
        render: (_, branch) => (
          <Space size={4}>
            <Tooltip title="Edit">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => openEdit(branch)}
              />
            </Tooltip>
            <Popconfirm
              title={`Delete branch ${branch.branchName}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => onDelete(branch)}
            >
              <Tooltip title="Delete">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.text.placeholder, colors.text.primary],
  );

  /** Stats summarised from the current page (cheap to compute client-side). */
  const stats = useMemo(() => {
    const items = data?.items ?? [];
    const total = data?.meta.total ?? 0;
    const uniqueZones = new Set(items.map((b) => b.zone?.stateName).filter(Boolean)).size;
    const withEmail = items.filter((b) => Boolean(b.email)).length;
    return { total, uniqueZones, withEmail };
  }, [data]);

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    onChange: (nextPage, nextSize) => {
      setPage(nextPage);
      if (nextSize !== limit) setLimit(nextSize);
    },
    showTotal: (total) => `${total} branch${total === 1 ? '' : 'es'}`,
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
            entityName="Branches"
            entityPlural="branches"
            columns={BRANCH_BULK_COLUMNS}
            sampleRows={BRANCH_BULK_SAMPLES}
            onImport={async (row) => {
              const state = String(row._state ?? '').toLowerCase();
              const zone = (zonesData?.items ?? []).find(
                (z) => z.stateName.toLowerCase() === state,
              );
              if (!zone) throw new Error(`Zone "${row._state}" not found — add it first under Master → Zone`);
              const body: AdminBranchCreateInput = {
                branchName: String(row.branchName),
                branchCode: String(row.branchCode),
                zoneId: zone.id,
                address: row.address ? String(row.address) : undefined,
                phone: row.phone ? String(row.phone) : undefined,
                email: row.email ? String(row.email) : undefined,
                ipAddress: row.ipAddress ? String(row.ipAddress) : undefined,
              };
              await createBranch.mutateAsync(body);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Branch
          </Button>
        </Space>
      </div>

      {/* --- Stats strip --- */}
      <Space size={12} style={{ display: 'flex', marginBottom: 16 }} wrap>
        <Card
          size="small"
          style={{
            background: colors.black.secondary,
            border: `1px solid ${colors.border}`,
            minWidth: 180,
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Statistic
            title={
              <span style={{ color: colors.text.placeholder, fontSize: 12 }}>
                TOTAL BRANCHES
              </span>
            }
            value={stats.total}
            valueStyle={{ color: colors.gold.primary, fontWeight: 600 }}
          />
        </Card>
        <Card
          size="small"
          style={{
            background: colors.black.secondary,
            border: `1px solid ${colors.border}`,
            minWidth: 180,
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Statistic
            title={
              <span style={{ color: colors.text.placeholder, fontSize: 12 }}>
                ZONES IN VIEW
              </span>
            }
            value={stats.uniqueZones}
            valueStyle={{ color: colors.text.primary, fontWeight: 600 }}
          />
        </Card>
        <Card
          size="small"
          style={{
            background: colors.black.secondary,
            border: `1px solid ${colors.border}`,
            minWidth: 180,
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Statistic
            title={
              <span style={{ color: colors.text.placeholder, fontSize: 12 }}>
                WITH EMAIL
              </span>
            }
            value={stats.withEmail}
            suffix={
              <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                / {data?.items.length ?? 0}
              </Text>
            }
            valueStyle={{ color: colors.text.primary, fontWeight: 600 }}
          />
        </Card>
      </Space>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search by name, code, zone, address, phone or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: 420, width: '100%' }}
          />
          {search && (
            <Tag
              color={colors.gold.primary}
              style={{ color: colors.text.onGold, border: 'none', margin: 0 }}
            >
              {data?.meta.total ?? 0} matching
            </Tag>
          )}
        </div>

        <Table<AdminBranch>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1280 }}
          rowClassName={() => 'branch-row'}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Branch' : 'Add Branch'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Branch'}
        confirmLoading={createBranch.isPending || updateBranch.isPending}
        width={600}
        destroyOnClose
      >
        <Form<BranchFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Branch Name"
            name="branchName"
            rules={[{ required: true, message: 'Enter the branch name' }]}
          >
            <Input placeholder="e.g. Jubilee Hills" maxLength={120} />
          </Form.Item>

          <Form.Item
            label="Branch Code"
            name="branchCode"
            rules={[
              { required: true, message: 'Enter a short branch code' },
              {
                pattern: /^[A-Za-z0-9_-]+$/,
                message: 'Use letters, digits, dash or underscore only',
              },
            ]}
          >
            <Input placeholder="e.g. JH001" maxLength={40} />
          </Form.Item>

          <Form.Item
            label="Zone"
            name="zoneId"
            rules={[{ required: true, message: 'Select a zone' }]}
          >
            <Select
              showSearch
              placeholder="Pick a zone"
              options={zoneOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent="No zones — add one under Master / Zone first."
            />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <Input.TextArea
              placeholder="e.g. Road No. 36, Hyderabad"
              rows={2}
              maxLength={300}
              showCount
            />
          </Form.Item>

          <Form.Item label="Phone" name="phone">
            <Input placeholder="e.g. +91-9876543210" maxLength={40} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Enter a valid email' }]}
          >
            <Input placeholder="e.g. jubilee@layers.com" />
          </Form.Item>

          <Form.Item
            label="IP Address"
            name="ipAddress"
            rules={[
              {
                pattern:
                  /^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/,
                message: 'Enter a valid IPv4 address (e.g. 192.168.1.10)',
              },
            ]}
          >
            <Input placeholder="e.g. 192.168.1.10" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
