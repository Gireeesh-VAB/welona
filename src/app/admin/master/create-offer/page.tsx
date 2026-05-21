'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
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
import dayjs, { type Dayjs } from 'dayjs';
import {
  useAdminOffers,
  useCreateAdminOffer,
  useDeleteAdminOffer,
  useUpdateAdminOffer,
} from '@/hooks/useAdminOffers';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useZones } from '@/hooks/useZones';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminServices } from '@/hooks/useAdminServices';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import type { AdminOffer } from '@/types/admin-offer';
import type {
  AdminOfferCreateInput,
  AdminOfferItemInput,
} from '@/lib/admin-offers';

const { Title, Text } = Typography;

interface ItemRow {
  key: string;
  categoryId?: string;
  serviceId?: string;
  quantity: number;
}

const rupeesToPaise = (rupees: number) => Math.round((rupees || 0) * 100);
const paiseToRupees = (paise: number) => paise / 100;

const inr = (paise: number) =>
  (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

function formatDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}/${d.getFullYear()}`;
}

function newItemKey() {
  return Math.random().toString(36).slice(2, 9);
}

export default function AdminMasterCreateOfferPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();

  // --- List of offers ---
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useAdminOffers({
    search: search || undefined,
    page,
    limit,
  });

  // --- Form state ---
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [stateFilter, setStateFilter] = useState<string | undefined>(undefined);
  const [selectAllBranches, setSelectAllBranches] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [items, setItems] = useState<ItemRow[]>([
    { key: newItemKey(), quantity: 1 },
  ]);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Reference data ---
  const { data: zonesData } = useZones({ limit: 100 });
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const { data: categoriesData } = useAdminCategories({ active: 'active', limit: 200 });
  const { data: servicesData } = useAdminServices({ active: 'active', limit: 500 });

  const zoneOptions = useMemo(
    () =>
      (zonesData?.items ?? []).map((z) => ({
        value: z.id,
        label: `${z.country} — ${z.stateName}`,
      })),
    [zonesData],
  );

  const allBranches = branchesData?.items ?? [];
  const filteredBranches = useMemo(
    () => (stateFilter ? allBranches.filter((b) => b.zone?.id === stateFilter) : allBranches),
    [allBranches, stateFilter],
  );

  const categoryOptions = useMemo(
    () =>
      (categoriesData?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesData],
  );

  const allServices = servicesData?.items ?? [];

  // When "Select All" is toggled, sync the multi-select to the (filtered) branch list.
  useEffect(() => {
    if (selectAllBranches) {
      setSelectedBranchIds(filteredBranches.map((b) => b.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectAllBranches, stateFilter]);

  const [form] = Form.useForm();

  const create = useCreateAdminOffer();
  const update = useUpdateAdminOffer();
  const remove = useDeleteAdminOffer();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const resetForm = () => {
    setEditing(null);
    setStateFilter(undefined);
    setSelectAllBranches(false);
    setSelectedBranchIds([]);
    setItems([{ key: newItemKey(), quantity: 1 }]);
    setImageDataUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    form.resetFields();
  };

  const onClickNew = () => {
    resetForm();
  };

  const onLoadForEdit = (row: AdminOffer) => {
    setEditing(row);
    setStateFilter(undefined);
    setSelectAllBranches(false);
    setSelectedBranchIds(row.branches.map((b) => b.id));
    setItems(
      row.items.length > 0
        ? row.items.map((it) => ({
            key: newItemKey(),
            categoryId: it.categoryId,
            serviceId: it.serviceId,
            quantity: it.quantity,
          }))
        : [{ key: newItemKey(), quantity: 1 }],
    );
    setImageDataUrl(row.frontImageUrl ?? undefined);
    form.setFieldsValue({
      packageName: row.packageName,
      packageCode: row.packageCode,
      fromDate: dayjs(row.fromDate),
      toDate: dayjs(row.toDate),
      minAmount: paiseToRupees(row.minAmount),
      maxAmount: paiseToRupees(row.maxAmount),
      remarks: row.remarks ?? '',
    });
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const updateItem = (key: string, patch: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;
        const next = { ...it, ...patch };
        // Reset serviceId when category changes.
        if (patch.categoryId !== undefined && patch.categoryId !== it.categoryId) {
          next.serviceId = undefined;
        }
        return next;
      }),
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.key !== key)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { key: newItemKey(), quantity: 1 }]);
  };

  const onSave = async () => {
    let values: {
      packageName: string;
      packageCode: string;
      fromDate?: Dayjs;
      toDate?: Dayjs;
      minAmount?: number;
      maxAmount?: number;
      remarks?: string;
    };
    try {
      values = await form.validateFields();
    } catch {
      message.error('Fix the highlighted fields and try again.');
      return;
    }
    if (selectedBranchIds.length === 0) {
      message.error('Pick at least one branch.');
      return;
    }
    const itemsInput: AdminOfferItemInput[] = [];
    for (const it of items) {
      if (!it.categoryId || !it.serviceId) {
        message.error('Each service row needs a Category and a Service.');
        return;
      }
      itemsInput.push({
        categoryId: it.categoryId,
        serviceId: it.serviceId,
        quantity: it.quantity,
      });
    }
    const body: AdminOfferCreateInput = {
      packageName: values.packageName.trim(),
      packageCode: values.packageCode.trim(),
      fromDate: values.fromDate!.toISOString(),
      toDate: values.toDate!.toISOString(),
      minAmount: rupeesToPaise(values.minAmount ?? 0),
      maxAmount: rupeesToPaise(values.maxAmount ?? 0),
      remarks: values.remarks?.trim() ? values.remarks.trim() : undefined,
      frontImageUrl: imageDataUrl,
      isActive: editing?.isActive ?? true,
      branchIds: selectedBranchIds,
      items: itemsInput,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Offer updated');
      } else {
        await create.mutateAsync(body);
        message.success('Offer added');
      }
      resetForm();
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminOffer) => {
    try {
      await remove.mutateAsync(row.id);
      if (editing?.id === row.id) resetForm();
      message.success('Offer deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminOffer> = useMemo(
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
                onClick={() => onLoadForEdit(row)}
                style={{ background: '#5B2C8B', borderColor: '#5B2C8B' }}
              />
            </Tooltip>
            <Popconfirm
              title={`Delete ${row.packageName}?`}
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
        title: 'Package Name',
        dataIndex: 'packageName',
        width: 200,
        sorter: (a, b) => a.packageName.localeCompare(b.packageName),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'Offer Code',
        dataIndex: 'packageCode',
        width: 140,
        render: (value: string) => <Text code style={{ fontSize: 12 }}>{value}</Text>,
      },
      {
        title: 'Amount',
        key: 'amount',
        width: 200,
        render: (_, row) => (
          <span style={{ color: colors.text.primary }}>
            {inr(row.minAmount)} — {inr(row.maxAmount)}
          </span>
        ),
      },
      {
        title: 'Description',
        dataIndex: 'remarks',
        width: 220,
        render: (value: string | null) =>
          value ? (
            <span style={{ color: colors.text.primary }}>{value}</span>
          ) : (
            emptyCell
          ),
      },
      {
        title: 'Package Fromdate',
        dataIndex: 'fromDate',
        width: 160,
        sorter: (a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime(),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{formatDmy(value)}</span>
        ),
      },
      {
        title: 'Package ToDate',
        dataIndex: 'toDate',
        width: 160,
        sorter: (a, b) => new Date(a.toDate).getTime() - new Date(b.toDate).getTime(),
        render: (value: string) => (
          <span style={{ color: colors.text.primary }}>{formatDmy(value)}</span>
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

  // Item table for the form panel — kept inline rather than a separate <Table>
  // so the dropdowns + inputs stay tightly tied to the row state.
  const itemRows = items.map((it, idx) => {
    const filteredServices = it.categoryId
      ? allServices.filter((s) => s.categoryId === it.categoryId)
      : [];
    return (
      <Row key={it.key} gutter={6} align="middle" style={{ marginBottom: 6 }}>
        <Col style={{ width: 28, color: colors.text.placeholder, textAlign: 'center' }}>
          {idx + 1}
        </Col>
        <Col flex={1}>
          <Select
            size="small"
            placeholder="Category"
            options={categoryOptions}
            value={it.categoryId}
            onChange={(v) => updateItem(it.key, { categoryId: v })}
            style={{ width: '100%' }}
          />
        </Col>
        <Col flex={1}>
          <Select
            size="small"
            placeholder="Service"
            options={filteredServices.map((s) => ({ value: s.id, label: s.name }))}
            value={it.serviceId}
            onChange={(v) => updateItem(it.key, { serviceId: v })}
            disabled={!it.categoryId}
            style={{ width: '100%' }}
          />
        </Col>
        <Col style={{ width: 70 }}>
          <InputNumber
            size="small"
            min={1}
            value={it.quantity}
            onChange={(v) => updateItem(it.key, { quantity: Number(v) || 1 })}
            style={{ width: '100%' }}
          />
        </Col>
        <Col style={{ width: 36 }}>
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeItem(it.key)}
            disabled={items.length === 1}
          />
        </Col>
      </Row>
    );
  });

  return (
    <div>
      <Row gutter={16}>
        {/* --- LEFT: Form panel --- */}
        <Col xs={24} lg={9}>
          <Card
            style={{
              background: colors.black.secondary,
              border: `1px solid ${colors.border}`,
            }}
            styles={{ body: { padding: 0 } }}
          >
            <div
              style={{
                background: '#5B2C8B',
                color: '#FFFFFF',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 600, letterSpacing: 0.3 }}>
                {editing ? `Editing: ${editing.packageCode}` : 'Package Offers'}
              </span>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={onClickNew}
                style={{ background: '#7A3FB5', borderColor: '#7A3FB5' }}
              >
                New
              </Button>
            </div>

            <div style={{ padding: 16 }}>
              <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item
                  name="packageName"
                  rules={[{ required: true, message: 'Package name is required' }]}
                  style={{ marginBottom: 10 }}
                >
                  <Input placeholder="Package Name" maxLength={120} />
                </Form.Item>
                <Form.Item
                  name="packageCode"
                  rules={[
                    { required: true, message: 'Package code is required' },
                    {
                      pattern: /^[A-Za-z0-9_-]+$/,
                      message: 'Letters, digits, dash or underscore only',
                    },
                  ]}
                  style={{ marginBottom: 10 }}
                >
                  <Input placeholder="Package Code" maxLength={40} />
                </Form.Item>

                <Select
                  allowClear
                  placeholder="Select States"
                  options={zoneOptions}
                  value={stateFilter}
                  onChange={(v) => {
                    setStateFilter(v);
                    setSelectAllBranches(false);
                  }}
                  style={{ width: '100%', marginBottom: 8 }}
                />

                <Checkbox
                  checked={selectAllBranches}
                  onChange={(e) => {
                    setSelectAllBranches(e.target.checked);
                    if (!e.target.checked) setSelectedBranchIds([]);
                  }}
                  style={{ marginBottom: 6 }}
                >
                  Select All
                </Checkbox>

                <Select
                  mode="multiple"
                  placeholder="Pick branches"
                  options={filteredBranches.map((b) => ({
                    value: b.id,
                    label: `${b.branchName} (${b.branchCode})`,
                  }))}
                  value={selectedBranchIds}
                  onChange={(v) => {
                    setSelectedBranchIds(v);
                    if (selectAllBranches && v.length !== filteredBranches.length) {
                      setSelectAllBranches(false);
                    }
                  }}
                  style={{ width: '100%', marginBottom: 10 }}
                  maxTagCount="responsive"
                />

                <Row gutter={6} style={{ marginBottom: 10 }}>
                  <Col span={12}>
                    <Form.Item
                      name="fromDate"
                      rules={[{ required: true, message: 'From date is required' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <DatePicker
                        placeholder="From Date"
                        format="DD/MM/YYYY"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="toDate"
                      rules={[{ required: true, message: 'To date is required' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <DatePicker
                        placeholder="To Date"
                        format="DD/MM/YYYY"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={6} style={{ marginBottom: 10 }}>
                  <Col span={12}>
                    <Form.Item name="minAmount" style={{ marginBottom: 0 }}>
                      <InputNumber
                        placeholder="MinAmount"
                        min={0}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="maxAmount" style={{ marginBottom: 0 }}>
                      <InputNumber
                        placeholder="MaxAmount"
                        min={0}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="remarks" style={{ marginBottom: 10 }}>
                  <Input.TextArea placeholder="Remarks" rows={2} maxLength={500} />
                </Form.Item>

                <div style={{ marginBottom: 10 }}>
                  <Text
                    style={{
                      color: colors.text.placeholder,
                      fontSize: 12,
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Front Image
                  </Text>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    style={{ fontSize: 12 }}
                  />
                  {imageDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageDataUrl}
                      alt="Front"
                      style={{
                        marginTop: 8,
                        maxWidth: '100%',
                        maxHeight: 96,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 4,
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    padding: 8,
                    marginBottom: 10,
                  }}
                >
                  <Row
                    gutter={6}
                    style={{ marginBottom: 6, fontSize: 12, color: colors.text.placeholder }}
                  >
                    <Col style={{ width: 28, textAlign: 'center' }}>S.no</Col>
                    <Col flex={1}>Category</Col>
                    <Col flex={1}>Service Name</Col>
                    <Col style={{ width: 70 }}>Quantity</Col>
                    <Col style={{ width: 36 }} />
                  </Row>
                  {itemRows}
                  <Button
                    size="small"
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addItem}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    Add line
                  </Button>
                </div>

                <Button
                  type="primary"
                  onClick={onSave}
                  loading={create.isPending || update.isPending}
                  style={{
                    background: colors.status.success,
                    borderColor: colors.status.success,
                  }}
                >
                  {editing ? 'Save Changes' : 'Save'}
                </Button>
                {editing && (
                  <Button style={{ marginLeft: 8 }} onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </Form>
            </div>
          </Card>
        </Col>

        {/* --- RIGHT: List panel --- */}
        <Col xs={24} lg={15}>
          <Card
            style={{
              background: colors.black.secondary,
              border: `1px solid ${colors.border}`,
            }}
            styles={{ body: { padding: 16 } }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Title level={4} style={{ margin: 0, color: colors.text.primary }}>
                List Of Marketing Offers
              </Title>
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search package name, code or remarks"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ maxWidth: 420, marginBottom: 12 }}
            />
            <Table<AdminOffer>
              rowKey="id"
              loading={isLoading}
              columns={columns}
              dataSource={data?.items ?? []}
              pagination={pagination}
              size="middle"
              scroll={{ x: 1190 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
