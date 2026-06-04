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
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, StarFilled } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  useWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
} from '@/hooks/useWarehouses';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminWarehouse } from '@shared/types/admin-warehouse';
import type { AdminWarehouseCreateInput } from '@shared/schemas/admin-warehouses';

const { Title, Text } = Typography;

interface WarehouseForm {
  branchId?: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function AdminWarehousesPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('inventory-warehouses')!;
  const { message } = App.useApp();

  const [branchId, setBranchId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(
    () => (branchesData?.items ?? []).map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` })),
    [branchesData],
  );

  const { data, isLoading } = useWarehouses({ branchId, search: search || undefined, page, limit });

  const createWh = useCreateWarehouse();
  const updateWh = useUpdateWarehouse();
  const deleteWh = useDeleteWarehouse();

  const fail = (err: unknown, fb: string) => message.error(err instanceof ApiClientError ? err.message : fb);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminWarehouse | null>(null);
  const [form] = Form.useForm<WarehouseForm>();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isDefault: false, isActive: true, branchId });
    setModalOpen(true);
  };
  const openEdit = (w: AdminWarehouse) => {
    setEditing(w);
    form.setFieldsValue({ branchId: w.branch.id, name: w.name, code: w.code, isDefault: w.isDefault, isActive: w.isActive });
    setModalOpen(true);
  };

  const onSubmit = async (values: WarehouseForm) => {
    try {
      if (editing) {
        await updateWh.mutateAsync({
          id: editing.id,
          body: { name: values.name.trim(), code: values.code.trim(), isDefault: values.isDefault, isActive: values.isActive },
        });
        message.success('Warehouse updated');
      } else {
        const body: AdminWarehouseCreateInput = {
          branchId: values.branchId as string,
          name: values.name.trim(),
          code: values.code.trim(),
          isDefault: values.isDefault,
          isActive: values.isActive,
        };
        await createWh.mutateAsync(body);
        message.success('Warehouse added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed');
    }
  };

  const onDelete = async (w: AdminWarehouse) => {
    try {
      await deleteWh.mutateAsync(w.id);
      message.success('Warehouse deleted');
    } catch (err) {
      fail(err, 'Delete failed');
    }
  };

  const setDefault = async (w: AdminWarehouse) => {
    try {
      await updateWh.mutateAsync({ id: w.id, body: { isDefault: true } });
      message.success(`${w.name} is now the default for ${w.branch.name}`);
    } catch (err) {
      fail(err, 'Failed to set default');
    }
  };

  const emptyCell = <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>;

  const columns: ColumnsType<AdminWarehouse> = useMemo(
    () => [
      {
        title: 'Warehouse',
        key: 'name',
        width: 220,
        render: (_v, w) => (
          <Space size={6}>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 600, color: colors.text.primary }}>{w.name}</div>
              <Text code style={{ fontSize: 11 }}>{w.code}</Text>
            </div>
            {w.isDefault && <Tag icon={<StarFilled />} color="gold">Default</Tag>}
          </Space>
        ),
      },
      { title: 'Branch', key: 'branch', width: 180, render: (_v, w) => w.branch.name },
      { title: 'Products', dataIndex: 'productCount', width: 100, align: 'center', render: (v: number) => (v > 0 ? v : emptyCell) },
      {
        title: 'Status',
        dataIndex: 'isActive',
        width: 110,
        align: 'center',
        render: (_v: boolean, w) => (
          <Switch
            size="small"
            checked={w.isActive}
            loading={updateWh.isPending}
            onChange={() => updateWh.mutate({ id: w.id, body: { isActive: !w.isActive } })}
            checkedChildren="Active"
            unCheckedChildren="Inactive"
          />
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 140,
        align: 'right',
        fixed: 'right',
        render: (_v, w) => (
          <Space size={4}>
            {!w.isDefault && (
              <Tooltip title="Set as default">
                <Button size="small" type="text" icon={<StarFilled />} onClick={() => setDefault(w)} />
              </Tooltip>
            )}
            <Tooltip title="Edit"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(w)} /></Tooltip>
            {!w.isDefault && (
              <Popconfirm title={`Delete ${w.name}?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(w)}>
                <Tooltip title="Delete"><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.text.placeholder, colors.text.primary, updateWh.isPending],
  );

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta.total ?? 0,
    showSizeChanger: true,
    pageSizeOptions: [20, 50, 100],
    onChange: (p, sz) => { setPage(p); if (sz !== limit) setLimit(sz); },
    showTotal: (t) => `${t} warehouse${t === 1 ? '' : 's'}`,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Warehouse</Button>
      </div>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Select
            allowClear
            showSearch
            placeholder="All branches"
            value={branchId}
            onChange={(v) => { setBranchId(v); setPage(1); }}
            options={branchOptions}
            style={{ width: 260 }}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search name or code"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 320, width: '100%' }}
          />
        </div>
        <Table<AdminWarehouse>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={editing ? `Edit Warehouse — ${editing.name}` : 'Add Warehouse'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Warehouse'}
        confirmLoading={createWh.isPending || updateWh.isPending}
        width={520}
        destroyOnClose
      >
        <Form<WarehouseForm> form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
          {!editing && (
            <Form.Item label="Branch" name="branchId" rules={[{ required: true, message: 'Select a branch' }]}>
              <Select showSearch placeholder="Pick a branch" options={branchOptions} filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
            </Form.Item>
          )}
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Enter a name' }]}>
            <Input placeholder="e.g. Main Store" maxLength={120} />
          </Form.Item>
          <Form.Item
            label="Code"
            name="code"
            rules={[
              { required: true, message: 'Enter a code' },
              { pattern: /^[A-Za-z0-9_-]+$/, message: 'Letters, digits, dash or underscore only' },
            ]}
          >
            <Input placeholder="e.g. MAIN" maxLength={40} />
          </Form.Item>
          <Space size={24}>
            <Form.Item label="Default warehouse" name="isDefault" valuePropName="checked" tooltip="Stock operations without an explicit warehouse use the branch default.">
              <Switch checkedChildren="Default" unCheckedChildren="No" />
            </Form.Item>
            <Form.Item label="Status" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
