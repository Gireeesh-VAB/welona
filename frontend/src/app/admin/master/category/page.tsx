'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
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
  InfoCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useRouter } from 'next/navigation';
import {
  useAdminCategories,
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminCategory } from '@shared/types/admin-category';
import type { AdminCategoryCreateInput } from '@shared/schemas/admin-categories';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const CATEGORY_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Name',         key: 'name',         required: true,  type: 'string', hint: 'e.g. Skin Services' },
  { header: 'Code',         key: 'categoryCode', required: false, type: 'string' },
  { header: 'Description',  key: 'description',  required: false, type: 'string' },
];
const CATEGORY_BULK_SAMPLES = [
  { name: 'Skin Services',  categoryCode: 'SKIN',     description: 'Dermatology, peels, facials' },
  { name: 'LASER',          categoryCode: 'LASER',    description: 'Laser hair removal & skin laser' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminMasterCategoryPage() {
  const router = useRouter();
  const colors = useBrandColors();
  const navItem = getAdminNavItem('master-category')!;
  const { message } = App.useApp();

  const [flagsGuideOpen, setFlagsGuideOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useAdminCategories({
    search: search || undefined,
    page,
    limit,
  });

  const create = useCreateAdminCategory();
  const update = useUpdateAdminCategory();
  const remove = useDeleteAdminCategory();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const onDelete = async (row: AdminCategory) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Category deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const onToggleActive = async (row: AdminCategory, next: boolean) => {
    try {
      await update.mutateAsync({ id: row.id, body: { isActive: next } });
    } catch (err) {
      fail(err, 'Status update failed.');
    }
  };

  const columns: ColumnsType<AdminCategory> = useMemo(
    () => [
      {
        title: 'Category',
        dataIndex: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (_value, row) => (
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, color: colors.text.primary }}>{row.name}</div>
            {row.description && (
              <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                {row.description}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: 'Code',
        dataIndex: 'categoryCode',
        width: 140,
        render: (value: string | null) =>
          value ? (
            <Text code style={{ fontSize: 12 }}>{value}</Text>
          ) : (
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
          ),
      },
      {
        title: 'Services',
        dataIndex: 'serviceCount',
        width: 110,
        align: 'right',
        render: (value: number) => (
          <Tag
            color={value > 0 ? colors.gold.primary : undefined}
            style={value > 0 ? { color: colors.text.onGold, border: 'none' } : undefined}
          >
            {value}
          </Tag>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'isActive',
        width: 140,
        render: (value: boolean, row) => (
          <Switch
            checked={value}
            onChange={(next) => onToggleActive(row, next)}
            checkedChildren="Active"
            unCheckedChildren="Inactive"
          />
        ),
      },
      {
        title: 'Created',
        key: 'created',
        width: 170,
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (_, row) => (
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ color: colors.text.primary, fontSize: 13 }}>
              {formatDate(row.createdAt)}
            </div>
            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
              by {row.createdBy?.name ?? '—'}
            </Text>
          </div>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 100,
        align: 'right',
        render: (_, row) => (
          <Space size={4}>
            <Tooltip title="Edit">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => router.push(`/admin/master/category/${row.id}`)}
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
    showTotal: (total) => `${total} categor${total === 1 ? 'y' : 'ies'}`,
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
          <Button
            icon={<InfoCircleOutlined />}
            onClick={() => setFlagsGuideOpen(true)}
          >
            Flags Guide
          </Button>
          <BulkUploadButton
            entityName="Categories"
            entityPlural="categories"
            columns={CATEGORY_BULK_COLUMNS}
            sampleRows={CATEGORY_BULK_SAMPLES}
            onImport={async (row) => {
              await create.mutateAsync(row as AdminCategoryCreateInput);
            }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/admin/master/category/new')}
          >
            Add Category
          </Button>
        </Space>
      </div>

      <Card
        style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search category name, code or description"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 420, marginBottom: 12 }}
        />

        <Table<AdminCategory>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
        />
      </Card>

      {/* ── Category Flags Guide Modal ── */}
      <Modal
        open={flagsGuideOpen}
        onCancel={() => setFlagsGuideOpen(false)}
        footer={<Button type="primary" onClick={() => setFlagsGuideOpen(false)}>Got it</Button>}
        width={900}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#5B2C8B' }} />
            <span>Category Flags Guide — What each flag does &amp; where it reflects</span>
          </div>
        }
      >
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>
          These flags are set per category. On the branch booking form, if <strong>any selected service&apos;s category</strong> has a flag turned ON, that field/column appears automatically.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#5B2C8B', color: '#fff' }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: 36 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Flag Name</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>What it does</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Where it reflects on Branch Booking Form</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['1',  'Has Consultant',        'Assigns a staff consultant to the booking',                           'Header → "Consultant" staff dropdown'],
                ['2',  'Has Doctor',             'Assigns a doctor to the booking',                                     'Header → "Doctor" staff dropdown'],
                ['3',  'Has Tele Caller',        'Tracks which tele-caller brought the lead',                           'Header → "Tele-Caller" staff dropdown'],
                ['4',  'Has Media / Source',     'Records how the customer came in (Walk-in, WhatsApp, Referral, etc.)','Header → "Source" dropdown'],
                ['5',  'Has Token Reference',    'Attaches a token or reference number to the booking',                 'Header → "Token No." text input'],
                ['6',  'Has DND',                'Marks the customer as Do Not Disturb',                                'Header → Orange DND badge'],
                ['7',  'Has Quantity',           'Allows entering quantity per service line',                           'Table → "Quantity" column per row'],
                ['8',  'Is Amount Editable',     'Controls whether staff can change the service price',                 'Table → Amount input locked (OFF) or editable (ON)'],
                ['9',  'Has Individual Discount','Allows a per-service row discount percentage',                        'Table → "Disc%" column per row; row total auto-adjusts'],
                ['10', 'Has Service By',         'Records which staff member performed each service',                   'Table → "Service By" staff dropdown per row'],
                ['11', 'Has Total Discount',     'Allows an overall booking-level discount amount',                     'Footer → "Total Disc (₹)" input below totals'],
                ['12', 'Has Session',            'Booking is tied to a fixed number of sessions',                       'Footer → "Sessions" count input'],
                ['13', 'Session Based',          'Marks the service as session-based (works with Has Session)',         'Footer → "Sessions" count input'],
                ['14', 'Has Validity',           'Package has an expiry / validity date',                               'Footer → "Valid Until" date picker'],
                ['15', 'Has Direct Payment',     'Records the payment mode at booking time',                            'Footer → "Payment Mode" dropdown (Cash, Card, UPI…)'],
                ['16', 'Has Rating',             'Captures customer satisfaction at the time of booking',               'Footer → 1–5 star rating picker'],
                ['17', 'Has Share Incentive',    'Tracks referral or incentive sharing details',                        'Footer → "Share Incentive" referrer name / code field'],
                ['18', 'Target Weight Based',    'Service is tied to a customer target weight goal',                    'Footer → "Target Weight" input (e.g. 70 kg)'],
                ['19', 'Has Measurement',        'Records body measurements with the booking',                          'Footer → "Measurements" input (e.g. Waist: 32, Hip: 38)'],
                ['20', 'Is Combo',               'Marks the package as a combo offer',                                  'Footer → Blue COMBO badge'],
                ['21', 'Services In Combo',      'Identifies which services are bundled inside a combo',                'Footer → Works alongside Is Combo to list combo services'],
                ['22', 'Has All Sessions Link',  'All sessions of this package are linked together',                    'Footer → Purple ALL SESSIONS badge'],
                ['23', 'Has Break Package',      'The package can be split / broken into parts',                        'Footer → Amber BREAK badge'],
              ] as [string, string, string, string][]).map(([num, name, what, where], i) => (
                <tr key={num} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 10px', textAlign: 'center', color: '#5B2C8B', fontWeight: 700 }}>{num}</td>
                  <td style={{ padding: '7px 10px', fontWeight: 600, whiteSpace: 'nowrap', color: '#222' }}>{name}</td>
                  <td style={{ padding: '7px 10px', color: '#444' }}>{what}</td>
                  <td style={{ padding: '7px 10px', color: '#1565c0' }}>{where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
