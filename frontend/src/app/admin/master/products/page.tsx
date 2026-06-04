'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  QRCode,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
  QrcodeOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from '@/hooks/useProducts';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminProduct } from '@shared/types/admin-product';
import type { AdminProductCreateInput } from '@shared/schemas/admin-products';
import { PRODUCT_UOMS, type ProductUom } from '@shared/enums';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const PRODUCT_BULK_COLUMNS: BulkColumn[] = [
  { header: 'SKU',            key: 'sku',           required: true,  type: 'string', hint: 'Unique product code' },
  { header: 'Name',           key: 'name',          required: true,  type: 'string' },
  { header: 'Brand',          key: 'brand',         required: false, type: 'string' },
  { header: 'HSN/SAC',        key: 'hsnSacCode',    required: false, type: 'string' },
  { header: 'UOM',            key: 'uom',           required: false, type: 'enum', enumOptions: [...PRODUCT_UOMS] },
  { header: 'Barcode',        key: 'barcode',       required: false, type: 'string' },
  { header: 'MRP (₹)',        key: 'mrp',           required: false, type: 'number',
    transform: (v) => Math.round(Number(v) * 100) },
  { header: 'Sale Price (₹)', key: 'salePrice',     required: false, type: 'number',
    transform: (v) => Math.round(Number(v) * 100) },
  { header: 'Purchase Price (₹)', key: 'purchasePrice', required: false, type: 'number',
    transform: (v) => Math.round(Number(v) * 100) },
  { header: 'Tax %',          key: 'taxPercent',    required: false, type: 'number',
    transform: (v) => Math.round(Number(v) * 100) },
  { header: 'Reorder Level',  key: 'reorderLevel',  required: false, type: 'number' },
  { header: 'Description',    key: 'description',   required: false, type: 'string' },
];

const PRODUCT_BULK_SAMPLES = [
  {
    sku: 'SH-001', name: 'Anti-Dandruff Shampoo', brand: 'Welona',
    hsnSacCode: '3305', uom: 'bottle', barcode: '8901234567890',
    mrp: '650', salePrice: '550', purchasePrice: '380',
    taxPercent: '18', reorderLevel: '10',
    description: 'Medicated anti-dandruff shampoo, 200ml',
  },
];

interface FormValues {
  sku: string;
  name: string;
  brand?: string;
  categoryId?: string;
  hsnSacCode?: string;
  uom: ProductUom;
  barcode?: string;
  description?: string;
  mrpRupees: number;
  salePriceRupees: number;
  purchasePriceRupees: number;
  taxPercentDisplay: number;
  reorderLevel: number;
  imageUrl?: string | null;
  trackBatches: boolean;
  trackExpiry: boolean;
  isActive: boolean;
}

const inr = (paise: number) =>
  paise === 0
    ? '—'
    : (paise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      });

export default function AdminMasterProductsPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-products')!;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useProducts({
    search: search || undefined,
    categoryId,
    isActive:
      activeFilter === 'all' ? undefined : activeFilter === 'active' ? true : false,
    page,
    limit,
  });

  const { data: categoriesData } = useAdminCategories({ limit: 200 });
  const categoryOptions = useMemo(
    () =>
      (categoriesData?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesData],
  );

  const create = useCreateProduct();
  const update = useUpdateProduct();
  const remove = useDeleteProduct();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form] = Form.useForm<FormValues>();
  const imageUrl = Form.useWatch('imageUrl', form);
  // Product whose QR/barcode label is being viewed.
  const [qrProduct, setQrProduct] = useState<AdminProduct | null>(null);

  const fail = (err: unknown, fallback: string) =>
    message.error(err instanceof ApiClientError ? err.message : fallback);

  /** Read a picked image file into a data URL and store it on the form. */
  const onPickImage = (file: File) => {
    if (file.size > 1_500_000) {
      message.error('Image is too large — please use one under ~1.5 MB.');
      return false;
    }
    const reader = new FileReader();
    reader.onload = () => form.setFieldsValue({ imageUrl: String(reader.result) });
    reader.readAsDataURL(file);
    return false; // prevent antd auto-upload
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      uom: 'unit',
      mrpRupees: 0,
      salePriceRupees: 0,
      purchasePriceRupees: 0,
      taxPercentDisplay: 18,
      reorderLevel: 0,
      trackBatches: false,
      trackExpiry: false,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (row: AdminProduct) => {
    setEditing(row);
    form.setFieldsValue({
      sku: row.sku,
      name: row.name,
      brand: row.brand ?? undefined,
      categoryId: row.category?.id,
      hsnSacCode: row.hsnSacCode ?? undefined,
      uom: row.uom,
      barcode: row.barcode ?? undefined,
      description: row.description ?? undefined,
      mrpRupees: row.mrp / 100,
      salePriceRupees: row.salePrice / 100,
      purchasePriceRupees: row.purchasePrice / 100,
      taxPercentDisplay: row.taxPercent / 100,
      reorderLevel: row.reorderLevel,
      imageUrl: row.imageUrl ?? null,
      trackBatches: row.trackBatches,
      trackExpiry: row.trackExpiry,
      isActive: row.isActive,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const body: AdminProductCreateInput = {
      sku: values.sku.trim(),
      name: values.name.trim(),
      brand: values.brand?.trim() || undefined,
      categoryId: values.categoryId || undefined,
      hsnSacCode: values.hsnSacCode?.trim() || undefined,
      uom: values.uom,
      barcode: values.barcode?.trim() || undefined,
      description: values.description?.trim() || undefined,
      mrp: Math.round(values.mrpRupees * 100),
      salePrice: Math.round(values.salePriceRupees * 100),
      purchasePrice: Math.round(values.purchasePriceRupees * 100),
      taxPercent: Math.round(values.taxPercentDisplay * 100),
      reorderLevel: values.reorderLevel,
      imageUrl: values.imageUrl ?? null,
      trackBatches: values.trackBatches,
      trackExpiry: values.trackExpiry,
      isActive: values.isActive,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Product updated');
      } else {
        await create.mutateAsync(body);
        message.success('Product added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed');
    }
  };

  const onDelete = async (row: AdminProduct) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Product deleted');
    } catch (err) {
      fail(err, 'Delete failed');
    }
  };

  const toggleActive = async (row: AdminProduct) => {
    try {
      await update.mutateAsync({ id: row.id, body: { isActive: !row.isActive } });
      message.success(row.isActive ? 'Product deactivated' : 'Product activated');
    } catch (err) {
      fail(err, 'Failed');
    }
  };

  const columns: ColumnsType<AdminProduct> = [
    {
      title: '',
      key: 'image',
      width: 56,
      fixed: 'left',
      render: (_v, row) =>
        row.imageUrl ? (
          <Avatar shape="square" size={36} src={row.imageUrl} />
        ) : (
          <Avatar shape="square" size={36} icon={<PictureOutlined />} style={{ background: colors.black.tertiary }} />
        ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 130,
      fixed: 'left',
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      width: 240,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{row.name}</div>
          {row.brand && (
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.brand}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 150,
      render: (_, row) => row.category?.name ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      width: 90,
      render: (v: ProductUom) => <Tag>{v}</Tag>,
    },
    {
      title: 'MRP',
      dataIndex: 'mrp',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.mrp - b.mrp,
      render: (v: number) => inr(v),
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.salePrice - b.salePrice,
      render: (v: number) => (
        <Text strong style={{ color: colors.text.primary }}>
          {inr(v)}
        </Text>
      ),
    },
    {
      title: 'Tax',
      dataIndex: 'taxPercent',
      width: 80,
      align: 'right',
      render: (v: number) => (v ? `${v / 100}%` : '—'),
    },
    {
      title: 'Reorder',
      dataIndex: 'reorderLevel',
      width: 90,
      align: 'right',
      render: (v: number) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'HSN',
      dataIndex: 'hsnSacCode',
      width: 100,
      render: (v: string | null) =>
        v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 110,
      align: 'center',
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.isActive}
          loading={update.isPending}
          onChange={() => toggleActive(row)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="QR / barcode label">
            <Button size="small" icon={<QrcodeOutlined />} onClick={() => setQrProduct(row)} />
          </Tooltip>
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
            title={`Delete ${row.name}?`}
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
  ];

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
      `${range[0]} - ${range[1]} of ${total} product${total === 1 ? '' : 's'}`,
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
            entityName="Products"
            entityPlural="products"
            columns={PRODUCT_BULK_COLUMNS}
            sampleRows={PRODUCT_BULK_SAMPLES}
            onImport={async (row) => {
              const body: AdminProductCreateInput = {
                sku: String(row.sku).trim(),
                name: String(row.name).trim(),
                brand: row.brand ? String(row.brand) : undefined,
                hsnSacCode: row.hsnSacCode ? String(row.hsnSacCode) : undefined,
                uom: (row.uom as ProductUom) ?? 'unit',
                barcode: row.barcode ? String(row.barcode) : undefined,
                description: row.description ? String(row.description) : undefined,
                mrp: row.mrp !== undefined ? Number(row.mrp) : 0,
                salePrice: row.salePrice !== undefined ? Number(row.salePrice) : 0,
                purchasePrice: row.purchasePrice !== undefined ? Number(row.purchasePrice) : 0,
                taxPercent: row.taxPercent !== undefined ? Number(row.taxPercent) : 0,
                reorderLevel: row.reorderLevel !== undefined ? Number(row.reorderLevel) : 0,
                trackBatches: false,
                trackExpiry: false,
                isActive: true,
              };
              await create.mutateAsync(body);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Product
          </Button>
        </Space>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, marginBottom: 12 }}
        styles={{ body: { padding: 12 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name, SKU, brand, barcode, HSN"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={24} sm={7}>
            <Select
              allowClear
              showSearch
              placeholder="All categories"
              value={categoryId}
              onChange={(v) => {
                setCategoryId(v);
                setPage(1);
              }}
              options={categoryOptions}
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
          <Col xs={24} sm={7}>
            <Select
              value={activeFilter}
              onChange={(v) => {
                setActiveFilter(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All products' },
                { value: 'active', label: 'Active only' },
                { value: 'inactive', label: 'Inactive only' },
              ]}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={isLoading} tip="Loading products…">
        <Card
          style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
          styles={{ body: { padding: 0 } }}
        >
          <Table<AdminProduct>
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={data?.items ?? []}
            pagination={pagination}
            size="middle"
            scroll={{ x: 1700 }}
          />
        </Card>
      </Spin>

      <Modal
        title={editing ? `Edit Product — ${editing.sku}` : 'Add Product'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Add Product'}
        confirmLoading={create.isPending || update.isPending}
        width={760}
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
            <Col span={8}>
              <Form.Item
                label="SKU"
                name="sku"
                rules={[{ required: true, message: 'SKU is required' }]}
                tooltip="Unique product code"
              >
                <Input maxLength={60} placeholder="e.g. SH-001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                label="Product Name"
                name="name"
                rules={[{ required: true, message: 'Name is required' }]}
              >
                <Input maxLength={160} placeholder="e.g. Anti-Dandruff Shampoo" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Brand" name="brand">
                <Input maxLength={80} placeholder="e.g. Welona" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Category" name="categoryId">
                <Select
                  allowClear
                  showSearch
                  placeholder="Pick from master"
                  options={categoryOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="UOM" name="uom" rules={[{ required: true }]}>
                <Select
                  options={PRODUCT_UOMS.map((u) => ({ value: u, label: u }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="HSN / SAC" name="hsnSacCode">
                <Input maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Barcode" name="barcode">
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Reorder Level" name="reorderLevel">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="MRP (₹)" name="mrpRupees">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Sale Price (₹)" name="salePriceRupees">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Purchase Price (₹)" name="purchasePriceRupees">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tax %" name="taxPercentDisplay">
                <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="Description" name="description">
                <Input.TextArea rows={2} maxLength={500} showCount />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Status" name="isActive" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Track batches" name="trackBatches" valuePropName="checked" tooltip="Capture a batch number on receipt; deplete FEFO on sale.">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Track expiry" name="trackExpiry" valuePropName="checked" tooltip="Batches carry an expiry date; drives expiry alerts.">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Product image" tooltip="Upload an image or paste an image URL.">
                <Space align="start" size={16}>
                  {imageUrl ? (
                    <Image src={imageUrl} alt="product" width={72} height={72} style={{ objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <Avatar shape="square" size={72} icon={<PictureOutlined />} style={{ background: colors.black.tertiary }} />
                  )}
                  <Space direction="vertical">
                    <Upload accept="image/*" showUploadList={false} beforeUpload={onPickImage}>
                      <Button icon={<UploadOutlined />} size="small">Upload image</Button>
                    </Upload>
                    {imageUrl && (
                      <Button size="small" danger onClick={() => form.setFieldsValue({ imageUrl: null })}>
                        Remove
                      </Button>
                    )}
                  </Space>
                </Space>
              </Form.Item>
              {/* hidden field that actually carries the value */}
              <Form.Item name="imageUrl" hidden>
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ---- QR / barcode label ---- */}
      <Modal
        title={qrProduct ? `Label — ${qrProduct.name}` : 'Label'}
        open={Boolean(qrProduct)}
        onCancel={() => setQrProduct(null)}
        footer={null}
        width={360}
      >
        {qrProduct && (
          <div style={{ textAlign: 'center', padding: 12 }}>
            <QRCode value={qrProduct.barcode || qrProduct.sku} size={180} />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, color: colors.text.primary }}>{qrProduct.name}</div>
              <Text code style={{ fontSize: 12 }}>{qrProduct.barcode || qrProduct.sku}</Text>
            </div>
            <Text style={{ color: colors.text.placeholder, fontSize: 11, display: 'block', marginTop: 8 }}>
              Encodes the {qrProduct.barcode ? 'barcode' : 'SKU'}. Use your browser&apos;s print to make a label.
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
}
