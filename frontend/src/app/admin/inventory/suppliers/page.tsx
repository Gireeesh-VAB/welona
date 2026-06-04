'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Switch,
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
import {
  useSuppliers,
  useCreateSupplier,
  useDeleteSupplier,
  useUpdateSupplier,
} from '@/hooks/useSuppliers';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminSupplier } from '@shared/types/admin-supplier';
import type { AdminSupplierCreateInput } from '@shared/schemas/admin-suppliers';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const SUPPLIER_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Name', key: 'name', required: true, type: 'string', hint: 'e.g. Acme Distributors' },
  { header: 'Code', key: 'code', required: true, type: 'string', hint: 'Unique, e.g. ACME01' },
  { header: 'Contact Person', key: 'contactPerson', required: false, type: 'string' },
  { header: 'Phone', key: 'phone', required: false, type: 'phone' },
  { header: 'Email', key: 'email', required: false, type: 'email' },
  { header: 'GSTIN', key: 'gstin', required: false, type: 'string' },
  { header: 'Address', key: 'address', required: false, type: 'string' },
  { header: 'Payment Terms', key: 'paymentTerms', required: false, type: 'string', hint: 'e.g. Net 30' },
];
const SUPPLIER_BULK_SAMPLES = [
  {
    name: 'Acme Distributors',
    code: 'ACME01',
    contactPerson: 'Ravi Kumar',
    phone: '+91-9876543210',
    email: 'sales@acme.com',
    gstin: '29ABCDE1234F1Z5',
    address: 'Industrial Area, Bengaluru',
    paymentTerms: 'Net 30',
  },
];

interface SupplierFormValues {
  name: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  paymentTerms?: string;
  isActive: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminSuppliersPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-suppliers')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [active, setActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useSuppliers({
    search: search || undefined,
    active,
    page,
    limit,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSupplier | null>(null);

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  // Single shared form instance via Modal's `forceRender`-free pattern: we set
  // initial values when opening (matches the products page approach).
  const [formValues, setFormValues] = useState<SupplierFormValues>({
    name: '',
    code: '',
    isActive: true,
  });

  const openCreate = () => {
    setEditing(null);
    setFormValues({ name: '', code: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (s: AdminSupplier) => {
    setEditing(s);
    setFormValues({
      name: s.name,
      code: s.code,
      contactPerson: s.contactPerson ?? undefined,
      phone: s.phone ?? undefined,
      email: s.email ?? undefined,
      gstin: s.gstin ?? undefined,
      address: s.address ?? undefined,
      paymentTerms: s.paymentTerms ?? undefined,
      isActive: s.isActive,
    });
    setModalOpen(true);
  };

  const onSubmit = async () => {
    const v = formValues;
    if (!v.name.trim() || !v.code.trim()) {
      message.error('Name and code are required');
      return;
    }
    const body: AdminSupplierCreateInput = {
      name: v.name.trim(),
      code: v.code.trim(),
      contactPerson: v.contactPerson?.trim() || undefined,
      phone: v.phone?.trim() || undefined,
      email: v.email?.trim() || undefined,
      gstin: v.gstin?.trim() || undefined,
      address: v.address?.trim() || undefined,
      paymentTerms: v.paymentTerms?.trim() || undefined,
      isActive: v.isActive,
    };
    try {
      if (editing) {
        await updateSupplier.mutateAsync({ id: editing.id, body });
        message.success('Supplier updated');
      } else {
        await createSupplier.mutateAsync(body);
        message.success('Supplier added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed. Please try again.');
    }
  };

  const toggleActive = async (s: AdminSupplier) => {
    try {
      await updateSupplier.mutateAsync({ id: s.id, body: { isActive: !s.isActive } });
      message.success(s.isActive ? 'Supplier deactivated' : 'Supplier activated');
    } catch (err) {
      fail(err, 'Failed to change status');
    }
  };

  const onDelete = async (s: AdminSupplier) => {
    try {
      await deleteSupplier.mutateAsync(s.id);
      message.success('Supplier deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const columns: ColumnsType<AdminSupplier> = useMemo(
    () => [
      {
        title: 'Supplier',
        dataIndex: 'name',
        width: 220,
        render: (_v, s) => (
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, color: colors.text.primary }}>{s.name}</div>
            <Text code style={{ fontSize: 11 }}>{s.code}</Text>
          </div>
        ),
      },
      {
        title: 'Contact',
        key: 'contact',
        width: 220,
        render: (_v, s) => (
          <div style={{ lineHeight: 1.4 }}>
            {s.contactPerson ? (
              <div style={{ color: colors.text.primary, fontSize: 13 }}>{s.contactPerson}</div>
            ) : null}
            {s.phone ? <div style={{ fontSize: 12 }}>{s.phone}</div> : null}
            {s.email ? (
              <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{s.email}</Text>
            ) : null}
            {!s.contactPerson && !s.phone && !s.email ? emptyCell : null}
          </div>
        ),
      },
      {
        title: 'GSTIN',
        dataIndex: 'gstin',
        width: 160,
        render: (v: string | null) => (v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : emptyCell),
      },
      {
        title: 'Terms',
        dataIndex: 'paymentTerms',
        width: 120,
        render: (v: string | null) => v ?? emptyCell,
      },
      {
        title: 'Status',
        dataIndex: 'isActive',
        width: 110,
        align: 'center',
        render: (_v: boolean, s) => (
          <Tooltip title={s.isActive ? 'Click to deactivate' : 'Click to activate'}>
            <Switch
              size="small"
              checked={s.isActive}
              loading={updateSupplier.isPending}
              onChange={() => toggleActive(s)}
              checkedChildren="Active"
              unCheckedChildren="Inactive"
            />
          </Tooltip>
        ),
      },
      {
        title: 'Created',
        key: 'created',
        width: 150,
        render: (_v, s) => (
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ color: colors.text.primary, fontSize: 13 }}>{formatDate(s.createdAt)}</div>
            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
              by {s.createdBy?.name ?? '—'}
            </Text>
          </div>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 100,
        align: 'right',
        fixed: 'right',
        render: (_v, s) => (
          <Space size={4}>
            <Tooltip title="Edit">
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(s)} />
            </Tooltip>
            <Popconfirm
              title={`Delete supplier ${s.name}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => onDelete(s)}
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
    [colors.text.placeholder, colors.text.primary, updateSupplier.isPending],
  );

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: data?.meta.total ?? 0,
      active: items.filter((s) => s.isActive).length,
    };
  }, [data]);

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    onChange: (p, sz) => {
      setPage(p);
      if (sz !== limit) setLimit(sz);
    },
    showTotal: (t) => `${t} supplier${t === 1 ? '' : 's'}`,
  };

  const field = (node: React.ReactNode) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ marginBottom: 4, fontSize: 13, color: colors.text.secondary }}>{node}</div>
    </div>
  );

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
            entityName="Suppliers"
            entityPlural="suppliers"
            columns={SUPPLIER_BULK_COLUMNS}
            sampleRows={SUPPLIER_BULK_SAMPLES}
            onImport={async (row) => {
              const body: AdminSupplierCreateInput = {
                name: String(row.name),
                code: String(row.code),
                contactPerson: row.contactPerson ? String(row.contactPerson) : undefined,
                phone: row.phone ? String(row.phone) : undefined,
                email: row.email ? String(row.email) : undefined,
                gstin: row.gstin ? String(row.gstin) : undefined,
                address: row.address ? String(row.address) : undefined,
                paymentTerms: row.paymentTerms ? String(row.paymentTerms) : undefined,
                isActive: true,
              };
              await createSupplier.mutateAsync(body);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Supplier
          </Button>
        </Space>
      </div>

      <Space size={12} style={{ display: 'flex', marginBottom: 16 }} wrap>
        <Card
          size="small"
          style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, minWidth: 180 }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Statistic
            title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>TOTAL SUPPLIERS</span>}
            value={stats.total}
            valueStyle={{ color: colors.gold.primary, fontWeight: 600 }}
          />
        </Card>
        <Card
          size="small"
          style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, minWidth: 180 }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Statistic
            title={<span style={{ color: colors.text.placeholder, fontSize: 12 }}>ACTIVE IN VIEW</span>}
            value={stats.active}
            valueStyle={{ color: colors.text.primary, fontWeight: 600 }}
          />
        </Card>
      </Space>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search name, code, contact, phone, email or GSTIN"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: 420, width: '100%' }}
          />
          <Select
            value={active}
            onChange={(v) => {
              setActive(v);
              setPage(1);
            }}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active only' },
              { value: 'inactive', label: 'Inactive only' },
            ]}
          />
        </div>

        <Table<AdminSupplier>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editing ? `Edit Supplier — ${editing.name}` : 'Add Supplier'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText={editing ? 'Save Changes' : 'Add Supplier'}
        confirmLoading={createSupplier.isPending || updateSupplier.isPending}
        width={560}
        destroyOnClose
      >
        {field(
          <>
            <div>Supplier Name *</div>
            <Input
              placeholder="e.g. Acme Distributors"
              maxLength={160}
              value={formValues.name}
              onChange={(e) => setFormValues((f) => ({ ...f, name: e.target.value }))}
            />
          </>,
        )}
        {field(
          <>
            <div>Supplier Code *</div>
            <Input
              placeholder="e.g. ACME01"
              maxLength={40}
              value={formValues.code}
              onChange={(e) => setFormValues((f) => ({ ...f, code: e.target.value }))}
            />
          </>,
        )}
        {field(
          <>
            <div>Contact Person</div>
            <Input
              maxLength={120}
              value={formValues.contactPerson}
              onChange={(e) => setFormValues((f) => ({ ...f, contactPerson: e.target.value }))}
            />
          </>,
        )}
        <Space style={{ display: 'flex' }} size={12}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: colors.text.secondary }}>Phone</div>
            <Input
              maxLength={40}
              value={formValues.phone}
              onChange={(e) => setFormValues((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: colors.text.secondary }}>Email</div>
            <Input
              value={formValues.email}
              onChange={(e) => setFormValues((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </Space>
        <div style={{ height: 12 }} />
        <Space style={{ display: 'flex' }} size={12}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: colors.text.secondary }}>GSTIN</div>
            <Input
              maxLength={20}
              value={formValues.gstin}
              onChange={(e) => setFormValues((f) => ({ ...f, gstin: e.target.value }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: colors.text.secondary }}>Payment Terms</div>
            <Input
              maxLength={80}
              placeholder="e.g. Net 30"
              value={formValues.paymentTerms}
              onChange={(e) => setFormValues((f) => ({ ...f, paymentTerms: e.target.value }))}
            />
          </div>
        </Space>
        <div style={{ height: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: colors.text.secondary }}>Address</div>
          <Input.TextArea
            rows={2}
            maxLength={300}
            value={formValues.address}
            onChange={(e) => setFormValues((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <Space align="center">
          <Switch
            checked={formValues.isActive}
            onChange={(checked) => setFormValues((f) => ({ ...f, isActive: checked }))}
            checkedChildren="Active"
            unCheckedChildren="Inactive"
          />
          <Text style={{ color: colors.text.secondary, fontSize: 13 }}>Active</Text>
        </Space>
      </Modal>
    </div>
  );
}
