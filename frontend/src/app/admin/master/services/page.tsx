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
  Switch,
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
  useAdminServices,
  useCreateAdminService,
  useDeleteAdminService,
  useUpdateAdminService,
} from '@/hooks/useAdminServices';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminService } from '@shared/types/admin-service';
import type { AdminServiceCreateInput } from '@shared/schemas/admin-services';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const SERVICE_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Category',    key: '_category',  required: true,  type: 'string', hint: 'Category name, e.g. Skin Services' },
  { header: 'Name',        key: 'name',       required: true,  type: 'string', hint: 'e.g. TCA Peel' },
  { header: 'HSN/SAC',     key: 'hsnSacCode', required: false, type: 'string' },
  { header: 'Min Price',   key: 'minPrice',   required: true,  type: 'number', hint: 'In rupees, e.g. 3500',
    transform: (v) => Math.round(Number(v) * 100) },
  { header: 'Max Price',   key: 'maxPrice',   required: true,  type: 'number', hint: 'In rupees, e.g. 7500',
    transform: (v) => Math.round(Number(v) * 100) },
  { header: 'Tax %',       key: 'taxPercent', required: false, type: 'number', hint: '0-100' },
];
const SERVICE_BULK_SAMPLES = [
  { _category: 'Skin Services', name: 'TCA Peel', hsnSacCode: '999722', minPrice: '3500', maxPrice: '7500', taxPercent: '18' },
];

interface ServiceFormValues {
  categoryId: string;
  name: string;
  hsnSacCode?: string;
  minPriceRupees: number;
  maxPriceRupees: number;
  taxPercent: number;
  taxType: 'inclusive' | 'exclusive';
  hasMeasurements: boolean;
  hasComplementary: boolean;
  isActive: boolean;
}

const rupeesToPaise = (rupees: number) => Math.round((rupees || 0) * 100);
const paiseToRupees = (paise: number) => paise / 100;

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

export default function AdminMasterServicesPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-services')!;
  const { message } = App.useApp();

  // --- Filters ---
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [active, setActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useAdminServices({
    search: search || undefined,
    categoryId,
    active,
    page,
    limit,
  });

  // Categories for the filter + form dropdown — large limit so we get them all.
  const { data: categoriesData } = useAdminCategories({ active: 'active', limit: 200 });
  const categoryOptions = useMemo(
    () =>
      (categoriesData?.items ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [categoriesData],
  );

  // --- Modal ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminService | null>(null);
  const [form] = Form.useForm<ServiceFormValues>();

  const watchedTaxPercent = Form.useWatch('taxPercent', form);
  const watchedTaxType = Form.useWatch('taxType', form);
  const watchedMaxPrice = Form.useWatch('maxPriceRupees', form);

  const create = useCreateAdminService();
  const update = useUpdateAdminService();
  const remove = useDeleteAdminService();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: AdminService) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleModalOpen = (open: boolean) => {
    if (!open) return;
    form.resetFields();
    if (editing) {
      form.setFieldsValue({
        categoryId: editing.categoryId,
        name: editing.name,
        hsnSacCode: editing.hsnSacCode ?? '',
        minPriceRupees: paiseToRupees(editing.minPrice),
        maxPriceRupees: paiseToRupees(editing.maxPrice),
        taxPercent: editing.taxPercent,
        taxType: (editing.taxType as 'inclusive' | 'exclusive') ?? 'exclusive',
        hasMeasurements: editing.hasMeasurements,
        hasComplementary: editing.hasComplementary,
        isActive: editing.isActive,
      });
    } else {
      form.setFieldsValue({
        isActive: true,
        hasMeasurements: false,
        hasComplementary: false,
        taxPercent: 18,
        taxType: 'exclusive',
        minPriceRupees: 0,
        maxPriceRupees: 0,
      });
    }
  };

  const onSubmit = async (values: ServiceFormValues) => {
    const body: AdminServiceCreateInput = {
      categoryId: values.categoryId,
      name: values.name.trim(),
      hsnSacCode: values.hsnSacCode?.trim() ? values.hsnSacCode.trim() : undefined,
      minPrice: rupeesToPaise(values.minPriceRupees),
      maxPrice: rupeesToPaise(values.maxPriceRupees),
      taxPercent: values.taxPercent,
      taxType: values.taxType,
      hasMeasurements: values.hasMeasurements,
      hasComplementary: values.hasComplementary,
      isActive: values.isActive,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Service updated');
      } else {
        await create.mutateAsync(body);
        message.success('Service added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminService) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Service deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const onToggleActive = async (row: AdminService, next: boolean) => {
    try {
      await update.mutateAsync({ id: row.id, body: { isActive: next } });
    } catch (err) {
      fail(err, 'Status update failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const columns: ColumnsType<AdminService> = useMemo(
    () => [
      {
        title: 'Manage',
        key: 'actions',
        width: 130,
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
            <Tooltip title={row.isActive ? 'Deactivate' : 'Activate'}>
              <Switch
                size="small"
                checked={row.isActive}
                onChange={(next) => onToggleActive(row, next)}
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
        title: 'Category Name',
        dataIndex: ['category', 'name'],
        key: 'categoryName',
        width: 180,
        sorter: (a, b) => a.category.name.localeCompare(b.category.name),
        render: (value: string) => (
          <Tag
            color={colors.gold.primary}
            style={{ color: colors.text.onGold, border: 'none', fontSize: 12 }}
          >
            {value}
          </Tag>
        ),
      },
      {
        title: 'Service Name',
        dataIndex: 'name',
        key: 'serviceName',
        width: 260,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'HSN/SAC Code',
        dataIndex: 'hsnSacCode',
        width: 140,
        render: (value: string | null) =>
          value ? <Text code style={{ fontSize: 12 }}>{value}</Text> : emptyCell,
      },
      {
        title: 'Max Price',
        dataIndex: 'maxPrice',
        width: 130,
        align: 'left',
        sorter: (a, b) => a.maxPrice - b.maxPrice,
        render: (value: number) =>
          value === 0 ? (
            emptyCell
          ) : (
            <span style={{ color: colors.text.primary }}>{inr(value)}</span>
          ),
      },
      {
        title: 'Min Price',
        dataIndex: 'minPrice',
        width: 130,
        align: 'left',
        sorter: (a, b) => a.minPrice - b.minPrice,
        render: (value: number) =>
          value === 0 ? (
            emptyCell
          ) : (
            <span style={{ color: colors.text.primary }}>{inr(value)}</span>
          ),
      },
      {
        title: 'GST',
        key: 'gst',
        width: 130,
        render: (_: unknown, row: AdminService) => {
          if (!row.taxPercent) return emptyCell;
          return (
            <Space size={4}>
              <Text style={{ fontWeight: 600 }}>{row.taxPercent}%</Text>
              <Tag
                color={row.taxType === 'inclusive' ? 'blue' : 'orange'}
                style={{ fontSize: 11, margin: 0 }}
              >
                {row.taxType ?? 'exclusive'}
              </Tag>
            </Space>
          );
        },
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
    [colors.text.primary, colors.text.placeholder, colors.gold.primary, colors.text.onGold],
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
      `${range[0]}–${range[1]} of ${total} item${total === 1 ? '' : 's'}`,
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
            entityName="Services"
            entityPlural="services"
            columns={SERVICE_BULK_COLUMNS}
            sampleRows={SERVICE_BULK_SAMPLES}
            onImport={async (row) => {
              const catName = String(row._category ?? '').toLowerCase();
              const category = (categoriesData?.items ?? []).find(
                (c) => c.name.toLowerCase() === catName,
              );
              if (!category) throw new Error(`Category "${row._category}" not found — add it first under Master → Category`);
              const body: AdminServiceCreateInput = {
                categoryId: category.id,
                name: String(row.name),
                hsnSacCode: row.hsnSacCode ? String(row.hsnSacCode) : undefined,
                minPrice: Number(row.minPrice),
                maxPrice: Number(row.maxPrice),
                taxPercent: row.taxPercent !== undefined ? Number(row.taxPercent) : 0,
                hasMeasurements: false,
                hasComplementary: false,
                taxType: 'exclusive',
                isActive: true,
              };
              await create.mutateAsync(body);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Service
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
              placeholder="Search service, category or HSN/SAC code"
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
              placeholder="All categories"
              style={{ minWidth: 200 }}
              options={categoryOptions}
              value={categoryId}
              onChange={(v) => {
                setCategoryId(v);
                setPage(1);
              }}
            />
          </Col>
          <Col>
            <Select
              style={{ minWidth: 160 }}
              value={active}
              onChange={(v) => {
                setActive(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'active', label: 'Active only' },
                { value: 'inactive', label: 'Inactive only' },
              ]}
            />
          </Col>
        </Row>

        <Table<AdminService>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Service' : 'Add Service'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Service'}
        confirmLoading={create.isPending || update.isPending}
        width={680}
        destroyOnClose
        afterOpenChange={handleModalOpen}
      >
        <Form<ServiceFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Category"
                name="categoryId"
                rules={[{ required: true, message: 'Select a category' }]}
              >
                <Select
                  showSearch
                  placeholder="Pick a category"
                  options={categoryOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  notFoundContent="No categories — add one under Master / Category first."
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Service / Product Name"
                name="name"
                rules={[{ required: true, message: 'Enter a name' }]}
              >
                <Input placeholder="e.g. TCA Peel" maxLength={160} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="HSN / SAC Code" name="hsnSacCode">
                <Input placeholder="e.g. 999722" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Min Price (₹)"
                name="minPriceRupees"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Max Price (₹)"
                name="maxPriceRupees"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="GST %" name="taxPercent">
                <InputNumber
                  min={0}
                  max={100}
                  style={{ width: '100%' }}
                  formatter={(v) => `${v}%`}
                  parser={(v) => Number(String(v).replace('%', '')) as 0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tax Type" name="taxType">
                <Select
                  options={[
                    { value: 'exclusive', label: 'Exclusive' },
                    { value: 'inclusive', label: 'Inclusive' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Measurements" name="hasMeasurements" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          {/* Live GST preview — shown only when a % is set */}
          {!!watchedTaxPercent && (
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col span={24}>
                {(() => {
                  const pricePaise = Math.round((watchedMaxPrice || 0) * 100);
                  const pct = watchedTaxPercent || 0;
                  const isInclusive = watchedTaxType === 'inclusive';
                  const taxableAmt = isInclusive
                    ? Math.round((pricePaise * 100) / (100 + pct))
                    : pricePaise;
                  const taxAmt = isInclusive
                    ? pricePaise - taxableAmt
                    : Math.round((pricePaise * pct) / 100);
                  const grandTotal = isInclusive ? pricePaise : pricePaise + taxAmt;
                  const halfAmt = Math.ceil(taxAmt / 2);
                  const fmt = (p: number) =>
                    (p / 100).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 2,
                    });
                  return (
                    <div style={{
                      background: 'rgba(91,44,139,0.07)',
                      border: '1px solid rgba(91,44,139,0.2)',
                      borderRadius: 8,
                      padding: '10px 14px',
                    }}>
                      <Space style={{ marginBottom: 6 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13 }}>GST Preview</Text>
                        <Tag color={isInclusive ? 'blue' : 'orange'} style={{ fontSize: 11 }}>
                          {isInclusive ? 'Inclusive — price includes tax' : 'Exclusive — tax added on top'}
                        </Tag>
                      </Space>
                      <Row gutter={8}>
                        <Col span={6}>
                          <Text style={{ fontSize: 12, color: '#888' }}>Taxable Amount</Text>
                          <div style={{ fontWeight: 600 }}>{pricePaise ? fmt(taxableAmt) : '—'}</div>
                        </Col>
                        <Col span={6}>
                          <Text style={{ fontSize: 12, color: '#888' }}>GST ({pct}%)</Text>
                          <div style={{ fontWeight: 600 }}>{pricePaise ? fmt(taxAmt) : '—'}</div>
                        </Col>
                        <Col span={7}>
                          <Text style={{ fontSize: 12, color: '#888' }}>
                            CGST {pct / 2}% + SGST {pct / 2}%
                            <br />
                            <span style={{ fontSize: 11, color: '#aaa' }}>(same state)</span>
                          </Text>
                          <div style={{ fontWeight: 600 }}>
                            {pricePaise ? `${fmt(halfAmt)} + ${fmt(taxAmt - halfAmt)}` : '—'}
                          </div>
                        </Col>
                        <Col span={5}>
                          <Text style={{ fontSize: 12, color: '#888' }}>
                            Final Amount
                            {!isInclusive && <span style={{ color: '#aaa', fontSize: 11 }}> (excl.)</span>}
                          </Text>
                          <div style={{ fontWeight: 700, color: '#5B2C8B' }}>
                            {pricePaise ? fmt(grandTotal) : '—'}
                          </div>
                        </Col>
                      </Row>
                    </div>
                  );
                })()}
              </Col>
            </Row>
          )}

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                label="Complementary Items"
                name="hasComplementary"
                valuePropName="checked"
              >
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Status" name="isActive" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
