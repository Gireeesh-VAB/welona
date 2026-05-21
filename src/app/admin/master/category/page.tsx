'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Input,
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
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useRouter } from 'next/navigation';
import {
  useAdminCategories,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from '@/hooks/useAdminCategories';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminCategory } from '@/types/admin-category';

const { Title, Text } = Typography;

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

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useAdminCategories({
    search: search || undefined,
    page,
    limit,
  });

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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/admin/master/category/new')}
        >
          Add Category
        </Button>
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
    </div>
  );
}
