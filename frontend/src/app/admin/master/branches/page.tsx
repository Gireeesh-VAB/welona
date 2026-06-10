'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Transfer,
  Tree,
  Typography,
} from 'antd';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  StarFilled,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  useAdminBranches,
  useCreateAdminBranch,
  useDeleteAdminBranch,
  useUpdateAdminBranch,
} from '@/hooks/useAdminBranches';
import {
  useBranchAddresses,
  useCreateBranchAddress,
  useDeleteBranchAddress,
  useUpdateBranchAddress,
} from '@/hooks/useBranchAddresses';
import {
  useBranchCatalog,
  useSetBranchCatalog,
} from '@/hooks/useBranchCatalog';
import { useProducts } from '@/hooks/useProducts';
import { useAdminServices } from '@/hooks/useAdminServices';
import { useAdminPaymentModes } from '@/hooks/useAdminPaymentModes';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminLedgers } from '@/hooks/useAdminLedgers';
import { useZones } from '@/hooks/useZones';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminBranch } from '@shared/types/admin-branch';
import type { AdminBranchAddress } from '@shared/types/admin-branch-address';
import type { AdminBranchCreateInput } from '@shared/schemas/admin-branches';
import type { AdminBranchAddressCreateInput } from '@shared/schemas/admin-branch-addresses';
import { BRANCH_TYPES, type BranchType } from '@shared/enums';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const BRANCH_TYPE_OPTIONS: { value: BranchType; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'franchise', label: 'Franchise' },
];
const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  company: 'Company',
  franchise: 'Franchise',
};

const { Title, Text } = Typography;

const BRANCH_BULK_COLUMNS: BulkColumn[] = [
  { header: 'Branch Name', key: 'branchName', required: true,  type: 'string', hint: 'e.g. Jubilee Hills' },
  { header: 'Branch Code', key: 'branchCode', required: true,  type: 'string', hint: 'Unique, e.g. JH001' },
  { header: 'Branch Type', key: 'branchType', required: false, type: 'string', hint: 'company or franchise (default company)' },
  { header: 'State',       key: '_state',     required: true,  type: 'string', hint: 'Zone state name, e.g. Telangana' },
  { header: 'Address',     key: 'address',    required: false, type: 'string' },
  { header: 'Phone',       key: 'phone',      required: false, type: 'phone',  hint: '+91-9876543210' },
  { header: 'Email',       key: 'email',      required: false, type: 'email' },
  { header: 'IP Address',  key: 'ipAddress',  required: false, type: 'string', hint: 'Branch LAN IP, optional' },
];
const BRANCH_BULK_SAMPLES = [
  { branchName: 'Jubilee Hills', branchCode: 'JH001', branchType: 'company', _state: 'Telangana',
    address: 'Road No. 36, Jubilee Hills', phone: '+91-9876543210', email: 'jubilee@welona.com', ipAddress: '192.168.1.10' },
];

interface AdditionalAddressFormValues {
  /** Set for existing addresses; absent for newly added rows in edit mode. */
  id?: string;
  label: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

interface BranchTreeNode {
  key: string;
  title: ReactNode;
  children: BranchTreeNode[];
}

interface BranchFormValues {
  branchName: string;
  branchCode: string;
  branchType: BranchType;
  zoneId: string;
  parentBranchId?: string;
  address?: string;
  phone?: string;
  email?: string;
  ipAddress?: string;
  loginPassword?: string;
  isActive: boolean;
  additionalAddresses?: AdditionalAddressFormValues[];
}

interface AddressFormValues {
  label: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  isActive: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function PasswordCell({ password }: { password: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
      <Text code style={{ fontSize: 11, letterSpacing: visible ? 0 : 2 }}>
        {visible ? password : '••••••••'}
      </Text>
      <Button
        type="text"
        size="small"
        icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        onClick={(e) => { e.stopPropagation(); setVisible((v) => !v); }}
        style={{ padding: 0, height: 16, width: 16, minWidth: 16, color: '#888' }}
      />
    </div>
  );
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

  // View toggle: flat table vs hierarchy tree.
  const [view, setView] = useState<'table' | 'tree'>('table');

  // Modal state (declared here so the parent-picker / tree memos below can read
  // the branch currently being edited).
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBranch | null>(null);
  const [form] = Form.useForm<BranchFormValues>();

  // A generous, unpaginated fetch used for the parent-branch picker and the
  // hierarchy tree (the branch master isn't expected to be huge).
  const { data: allBranchesData, isLoading: allBranchesLoading } = useAdminBranches({
    limit: 100,
  });
  const allBranches = useMemo(() => allBranchesData?.items ?? [], [allBranchesData]);

  // Map each branch id -> ids of its direct children, for descendant walks.
  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of allBranches) {
      if (!b.parent) continue;
      const list = map.get(b.parent.id) ?? [];
      list.push(b.id);
      map.set(b.parent.id, list);
    }
    return map;
  }, [allBranches]);

  /** Collect a branch's id plus all of its descendants (cycle-safe). */
  const collectSubtree = (rootId: string): Set<string> => {
    const out = new Set<string>();
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop()!;
      if (out.has(id)) continue;
      out.add(id);
      for (const child of childrenMap.get(id) ?? []) stack.push(child);
    }
    return out;
  };

  // Parent-branch options: every branch except the one being edited and its
  // descendants (which would create a cycle).
  const parentOptions = useMemo(() => {
    const blocked = editing ? collectSubtree(editing.id) : new Set<string>();
    return allBranches
      .filter((b) => !blocked.has(b.id))
      .map((b) => ({ value: b.id, label: `${b.branchName} (${b.branchCode})` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBranches, childrenMap, editing]);

  // Build the hierarchy tree from the full branch list (roots = no parent).
  const treeData = useMemo(() => {
    const byId = new Map(allBranches.map((b) => [b.id, b]));
    const build = (id: string): BranchTreeNode => {
      const b = byId.get(id)!;
      return {
        key: b.id,
        title: (
          <Space size={6}>
            <Text style={{ color: colors.text.primary }}>{b.branchName}</Text>
            <Text code style={{ fontSize: 11 }}>{b.branchCode}</Text>
            <Tag color={b.branchType === 'franchise' ? 'gold' : 'default'} style={{ marginInlineEnd: 0 }}>
              {BRANCH_TYPE_LABELS[b.branchType] ?? b.branchType}
            </Tag>
            {!b.isActive && <Tag>Inactive</Tag>}
          </Space>
        ),
        children: (childrenMap.get(b.id) ?? []).map(build),
      };
    };
    return allBranches.filter((b) => !b.parent).map((b) => build(b.id));
  }, [allBranches, childrenMap, colors.text.primary]);

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

  const createBranch = useCreateAdminBranch();
  const updateBranch = useUpdateAdminBranch();
  const deleteBranch = useDeleteAdminBranch();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, branchType: 'company' });
    setModalOpen(true);
  };

  const openEdit = (branch: AdminBranch) => {
    setEditing(branch);
    form.setFieldsValue({
      branchName: branch.branchName,
      branchCode: branch.branchCode,
      branchType: branch.branchType,
      zoneId: branch.zone?.id ?? '',
      parentBranchId: branch.parent?.id ?? undefined,
      address: branch.address ?? undefined,
      phone: branch.phone ?? undefined,
      email: branch.email ?? undefined,
      ipAddress: branch.ipAddress ?? undefined,
      loginPassword: undefined,
      isActive: branch.isActive,
      additionalAddresses: branch.additionalAddresses.map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        line2: a.line2 ?? undefined,
        city: a.city ?? undefined,
        state: a.state ?? undefined,
        pincode: a.pincode ?? undefined,
        country: a.country ?? 'India',
        phone: a.phone ?? undefined,
        email: a.email ?? undefined,
        isPrimary: a.isPrimary,
        isActive: a.isActive,
      })),
    });
    setModalOpen(true);
  };

  // ---- Addresses drawer state ----
  const [addressBranch, setAddressBranch] = useState<AdminBranch | null>(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AdminBranchAddress | null>(null);
  const [addressForm] = Form.useForm<AddressFormValues>();
  const {
    data: addressesData,
    isLoading: addressesLoading,
  } = useBranchAddresses(addressBranch?.id ?? null);
  const createAddress = useCreateBranchAddress(addressBranch?.id ?? null);
  const updateAddress = useUpdateBranchAddress(addressBranch?.id ?? null);
  const deleteAddress = useDeleteBranchAddress(addressBranch?.id ?? null);

  // Same mutations scoped to the branch currently open in the edit modal, so
  // we can sync inline-edited addresses without flipping the drawer state.
  const editCreateAddress = useCreateBranchAddress(editing?.id ?? null);
  const editUpdateAddress = useUpdateBranchAddress(editing?.id ?? null);
  const editDeleteAddress = useDeleteBranchAddress(editing?.id ?? null);

  // ---- Catalog drawer state (branch master-data assignment) ----
  const [catalogBranch, setCatalogBranch] = useState<AdminBranch | null>(null);
  const [productKeys, setProductKeys] = useState<string[]>([]);
  const [serviceKeys, setServiceKeys] = useState<string[]>([]);
  const [paymentModeKeys, setPaymentModeKeys] = useState<string[]>([]);
  const [categoryKeys, setCategoryKeys] = useState<string[]>([]);
  const [ledgerKeys, setLedgerKeys] = useState<string[]>([]);
  const { data: catalogData, isLoading: catalogLoading } = useBranchCatalog(
    catalogBranch?.id ?? null,
  );
  const setCatalog = useSetBranchCatalog(catalogBranch?.id ?? null);
  // Source lists (generous fetch — masters aren't huge).
  const { data: productsData } = useProducts({ isActive: true, limit: 100 });
  const { data: servicesData } = useAdminServices({ active: 'active', limit: 100 });
  const { data: paymentModesData } = useAdminPaymentModes({ active: 'active', limit: 100 });
  const { data: categoriesData } = useAdminCategories({ active: 'active', limit: 100 });
  const { data: ledgersData } = useAdminLedgers({ active: 'active', limit: 100 });
  const productTransferData = useMemo(
    () =>
      (productsData?.items ?? []).map((p) => ({
        key: p.id,
        title: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
      })),
    [productsData],
  );
  const serviceTransferData = useMemo(
    () =>
      (servicesData?.items ?? []).map((s) => ({
        key: s.id,
        title: `${s.name}${s.category ? ` · ${s.category.name}` : ''}`,
      })),
    [servicesData],
  );
  const paymentModeTransferData = useMemo(
    () => (paymentModesData?.items ?? []).map((p) => ({ key: p.id, title: p.name })),
    [paymentModesData],
  );
  const categoryTransferData = useMemo(
    () => (categoriesData?.items ?? []).map((c) => ({ key: c.id, title: c.name })),
    [categoriesData],
  );
  const ledgerTransferData = useMemo(
    () =>
      (ledgersData?.items ?? []).map((l) => ({
        key: l.id,
        title: `${l.name}${l.group ? ` · ${l.group}` : ''}`,
      })),
    [ledgersData],
  );

  // Sync the drawer selection to the loaded assignment whenever it arrives.
  useEffect(() => {
    if (catalogData) {
      setProductKeys(catalogData.productIds);
      setServiceKeys(catalogData.serviceIds);
      setPaymentModeKeys(catalogData.paymentModeIds);
      setCategoryKeys(catalogData.categoryIds);
      setLedgerKeys(catalogData.ledgerIds);
    }
  }, [catalogData]);

  const onCatalogSave = async () => {
    try {
      await setCatalog.mutateAsync({
        productIds: productKeys,
        serviceIds: serviceKeys,
        paymentModeIds: paymentModeKeys,
        categoryIds: categoryKeys,
        ledgerIds: ledgerKeys,
      });
      message.success('Branch assignment updated');
      setCatalogBranch(null);
    } catch (err) {
      fail(err, 'Save failed');
    }
  };

  const openAddressForm = (existing: AdminBranchAddress | null) => {
    setEditingAddress(existing);
    addressForm.resetFields();
    if (existing) {
      addressForm.setFieldsValue({
        label: existing.label,
        line1: existing.line1,
        line2: existing.line2 ?? undefined,
        city: existing.city ?? undefined,
        state: existing.state ?? undefined,
        pincode: existing.pincode ?? undefined,
        country: existing.country ?? 'India',
        phone: existing.phone ?? undefined,
        email: existing.email ?? undefined,
        isPrimary: existing.isPrimary,
        isActive: existing.isActive,
      });
    } else {
      addressForm.setFieldsValue({
        country: 'India',
        isPrimary: false,
        isActive: true,
      });
    }
    setAddressFormOpen(true);
  };

  const onAddressSubmit = async (values: AddressFormValues) => {
    const body: AdminBranchAddressCreateInput = {
      label: values.label.trim(),
      line1: values.line1.trim(),
      line2: values.line2?.trim() || undefined,
      city: values.city?.trim() || undefined,
      state: values.state?.trim() || undefined,
      pincode: values.pincode?.trim() || undefined,
      country: values.country?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      isPrimary: values.isPrimary,
      isActive: values.isActive,
    };
    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({ id: editingAddress.id, body });
        message.success('Address updated');
      } else {
        await createAddress.mutateAsync(body);
        message.success('Address added');
      }
      setAddressFormOpen(false);
    } catch (err) {
      fail(err, 'Save failed');
    }
  };

  const onAddressDelete = async (id: string) => {
    try {
      await deleteAddress.mutateAsync(id);
      message.success('Address deleted');
    } catch (err) {
      fail(err, 'Delete failed');
    }
  };

  const onSubmit = async (values: BranchFormValues) => {
    const cleanedAdditional = (values.additionalAddresses ?? [])
      .map((a) => ({
        label: a.label?.trim() ?? '',
        line1: a.line1?.trim() ?? '',
        line2: a.line2?.trim() || undefined,
        city: a.city?.trim() || undefined,
        state: a.state?.trim() || undefined,
        pincode: a.pincode?.trim() || undefined,
        country: a.country?.trim() || undefined,
        phone: a.phone?.trim() || undefined,
        email: a.email?.trim() || undefined,
        isPrimary: Boolean(a.isPrimary),
        isActive: a.isActive ?? true,
      }))
      .filter((a) => a.label && a.line1);

    const body: AdminBranchCreateInput = {
      branchName: values.branchName.trim(),
      branchCode: values.branchCode.trim(),
      branchType: values.branchType,
      zoneId: values.zoneId,
      parentBranchId: values.parentBranchId || null,
      address: values.address?.trim() ? values.address.trim() : undefined,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      email: values.email?.trim() ? values.email.trim() : undefined,
      ipAddress: values.ipAddress?.trim() ? values.ipAddress.trim() : undefined,
      loginPassword: values.loginPassword?.trim() ? values.loginPassword.trim() : undefined,
      isActive: values.isActive,
      additionalAddresses: cleanedAdditional.length > 0 ? cleanedAdditional : undefined,
    };
    try {
      if (editing) {
        // Edit path: branch fields go through the branch update; addresses are
        // synced individually via per-address create / update / delete calls.
        const { additionalAddresses: _ignored, ...rest } = body;
        void _ignored;
        await updateBranch.mutateAsync({ id: editing.id, body: rest });

        const submitted = (values.additionalAddresses ?? []).filter(
          (a) => a.label?.trim() && a.line1?.trim(),
        );
        const originalIds = new Set(editing.additionalAddresses.map((a) => a.id));
        const submittedIds = new Set(
          submitted.filter((a) => a.id).map((a) => a.id as string),
        );

        // Deletes: in original but not in submission.
        const deletes = editing.additionalAddresses.filter(
          (a) => !submittedIds.has(a.id),
        );
        for (const a of deletes) {
          await editDeleteAddress.mutateAsync(a.id);
        }

        // Updates + creates.
        for (const a of submitted) {
          const payload = {
            label: a.label.trim(),
            line1: a.line1.trim(),
            line2: a.line2?.trim() || undefined,
            city: a.city?.trim() || undefined,
            state: a.state?.trim() || undefined,
            pincode: a.pincode?.trim() || undefined,
            country: a.country?.trim() || undefined,
            phone: a.phone?.trim() || undefined,
            email: a.email?.trim() || undefined,
            isPrimary: Boolean(a.isPrimary),
            isActive: a.isActive ?? true,
          };
          if (a.id && originalIds.has(a.id)) {
            await editUpdateAddress.mutateAsync({ id: a.id, body: payload });
          } else {
            await editCreateAddress.mutateAsync(payload);
          }
        }

        message.success('Branch updated');
      } else {
        await createBranch.mutateAsync(body);
        message.success(
          cleanedAdditional.length > 0
            ? `Branch added with ${cleanedAdditional.length} address${cleanedAdditional.length === 1 ? '' : 'es'}`
            : 'Branch added',
        );
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      fail(err, 'Save failed. Please try again.');
    }
  };

  const toggleBranchActive = async (branch: AdminBranch) => {
    try {
      await updateBranch.mutateAsync({
        id: branch.id,
        body: { isActive: !branch.isActive },
      });
      message.success(branch.isActive ? 'Branch deactivated' : 'Branch activated');
    } catch (err) {
      fail(err, 'Failed to change status');
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
        title: 'Type',
        dataIndex: 'branchType',
        width: 110,
        align: 'center',
        filters: BRANCH_TYPE_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
        onFilter: (value, branch) => branch.branchType === value,
        render: (value: BranchType) => (
          <Tag color={value === 'franchise' ? 'gold' : 'default'}>
            {BRANCH_TYPE_LABELS[value] ?? value}
          </Tag>
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
        title: 'Parent',
        key: 'parent',
        width: 170,
        render: (_, branch) =>
          branch.parent ? (
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ color: colors.text.primary, fontSize: 13 }}>
                {branch.parent.branchName}
              </div>
              <Text code style={{ fontSize: 11 }}>
                {branch.parent.branchCode}
              </Text>
            </div>
          ) : branch.childCount > 0 ? (
            <Tag color="gold" icon={<ApartmentOutlined />}>
              {branch.childCount} sub-branch{branch.childCount === 1 ? '' : 'es'}
            </Tag>
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
        title: 'Login',
        key: 'login',
        width: 180,
        render: (_, branch) => {
          if (!branch.loginPassword) return emptyCell;
          return (
            <div style={{ lineHeight: 1.3 }}>
              <Text code style={{ fontSize: 11 }}>{branch.branchCode.toLowerCase()}</Text>
              <PasswordCell password={branch.loginPassword} />
            </div>
          );
        },
      },
      {
        title: 'Addresses',
        key: 'addressCount',
        width: 110,
        align: 'center',
        render: (_, branch) => (
          <Tag
            icon={<EnvironmentOutlined />}
            color={branch.additionalAddresses.length > 0 ? 'gold' : 'default'}
          >
            {1 + branch.additionalAddresses.length}
          </Tag>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'isActive',
        width: 110,
        align: 'center',
        render: (_value: boolean, branch) => (
          <Tooltip title={branch.isActive ? 'Click to deactivate' : 'Click to activate'}>
            <Switch
              size="small"
              checked={branch.isActive}
              loading={updateBranch.isPending}
              onChange={() => toggleBranchActive(branch)}
              checkedChildren="Active"
              unCheckedChildren="Inactive"
            />
          </Tooltip>
        ),
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
        width: 150,
        align: 'right',
        fixed: 'right',
        render: (_, branch) => (
          <Space size={4}>
            <Tooltip title="Manage catalog (products & services)">
              <Button
                size="small"
                type="text"
                icon={<AppstoreOutlined />}
                onClick={() => setCatalogBranch(branch)}
              />
            </Tooltip>
            <Tooltip title="Manage addresses">
              <Button
                size="small"
                type="text"
                icon={<EnvironmentOutlined />}
                onClick={() => setAddressBranch(branch)}
              />
            </Tooltip>
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
    [colors.text.placeholder, colors.text.primary, updateBranch.isPending],
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
              const rawType = String(row.branchType ?? '').trim().toLowerCase();
              const branchType = (BRANCH_TYPES as readonly string[]).includes(rawType)
                ? (rawType as BranchType)
                : undefined;
              const body: AdminBranchCreateInput = {
                branchName: String(row.branchName),
                branchCode: String(row.branchCode),
                branchType,
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
          <Space>
            {search && view === 'table' && (
              <Tag
                color={colors.gold.primary}
                style={{ color: colors.text.onGold, border: 'none', margin: 0 }}
              >
                {data?.meta.total ?? 0} matching
              </Tag>
            )}
            <Segmented
              value={view}
              onChange={(v) => setView(v as 'table' | 'tree')}
              options={[
                { value: 'table', icon: <UnorderedListOutlined />, label: 'Table' },
                { value: 'tree', icon: <ApartmentOutlined />, label: 'Hierarchy' },
              ]}
            />
          </Space>
        </div>

        {view === 'table' ? (
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
        ) : (
          <Spin spinning={allBranchesLoading}>
            {treeData.length === 0 ? (
              <Empty description="No branches yet" />
            ) : (
              <Tree
                treeData={treeData}
                defaultExpandAll
                selectable
                showLine={{ showLeafIcon: false }}
                onSelect={(keys) => {
                  const id = keys[0] as string | undefined;
                  const branch = id ? allBranches.find((b) => b.id === id) : undefined;
                  if (branch) openEdit(branch);
                }}
                style={{ background: 'transparent', padding: 8 }}
              />
            )}
          </Spin>
        )}
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
            label="Branch Type"
            name="branchType"
            rules={[{ required: true, message: 'Select a branch type' }]}
            tooltip="Company-owned outlet, or a franchise-operated one."
          >
            <Select options={BRANCH_TYPE_OPTIONS} placeholder="Pick a type" />
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

          <Form.Item
            label="Parent Branch"
            name="parentBranchId"
            tooltip="Optional. Place this branch under another in the hierarchy (e.g. an outlet under a region). Leave empty for a top-level branch."
          >
            <Select
              allowClear
              showSearch
              placeholder="None — top-level branch"
              options={parentOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent="No eligible parent branches."
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

          <Form.Item
            label={editing ? 'Login Password (leave blank to keep existing)' : 'Login Password'}
            name="loginPassword"
            tooltip="Branch login password. Sets the username to the branch code (lowercase). Min 6 characters."
            rules={[
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password
              placeholder={editing ? 'Enter new password to change' : 'e.g. Welona@123'}
              maxLength={100}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            label="Status"
            name="isActive"
            valuePropName="checked"
            tooltip="Inactive branches are hidden from new operations but kept for history."
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <>
            <Divider orientation="left" style={{ color: colors.text.placeholder, fontSize: 13, marginTop: 8 }}>
              Additional Addresses
            </Divider>
            <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block', marginBottom: 8 }}>
              {editing
                ? 'Edit, remove, or add addresses for this branch. Removed rows are deleted on save.'
                : 'Optional. Add billing, warehouse, satellite-clinic, or other addresses for this branch.'}
            </Text>

              <Form.List name="additionalAddresses">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card
                        key={key}
                        size="small"
                        style={{
                          background: colors.black.tertiary,
                          border: `1px solid ${colors.border}`,
                          marginBottom: 12,
                        }}
                        styles={{ body: { padding: 12 } }}
                        extra={
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        }
                        title={
                          <Text strong style={{ color: colors.text.primary, fontSize: 13 }}>
                            Address #{name + 1}
                          </Text>
                        }
                      >
                        <Form.Item
                          {...restField}
                          name={[name, 'label']}
                          label="Label"
                          rules={[{ required: true, message: 'Label is required' }]}
                          style={{ marginBottom: 8 }}
                        >
                          <Input placeholder="e.g. Billing / Warehouse" maxLength={80} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'line1']}
                          label="Address line 1"
                          rules={[{ required: true, message: 'Address line 1 is required' }]}
                          style={{ marginBottom: 8 }}
                        >
                          <Input maxLength={200} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'line2']}
                          label="Address line 2"
                          style={{ marginBottom: 8 }}
                        >
                          <Input maxLength={200} />
                        </Form.Item>
                        <Row gutter={8}>
                          <Col span={10}>
                            <Form.Item
                              {...restField}
                              name={[name, 'city']}
                              label="City"
                              style={{ marginBottom: 8 }}
                            >
                              <Input maxLength={80} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              {...restField}
                              name={[name, 'state']}
                              label="State"
                              style={{ marginBottom: 8 }}
                            >
                              <Input maxLength={80} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              {...restField}
                              name={[name, 'pincode']}
                              label="Pincode"
                              style={{ marginBottom: 8 }}
                            >
                              <Input maxLength={12} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item
                              {...restField}
                              name={[name, 'phone']}
                              label="Phone"
                              style={{ marginBottom: 8 }}
                            >
                              <Input maxLength={40} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              {...restField}
                              name={[name, 'email']}
                              label="Email"
                              rules={[{ type: 'email', message: 'Enter a valid email' }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Input maxLength={120} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item
                          {...restField}
                          name={[name, 'isPrimary']}
                          label="Set as Primary"
                          valuePropName="checked"
                          style={{ marginBottom: 0 }}
                          tooltip="Only one address can be primary — others will be demoted."
                        >
                          <Switch checkedChildren="Primary" unCheckedChildren="Standard" />
                        </Form.Item>
                      </Card>
                    ))}
                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      onClick={() => add({ country: 'India', isPrimary: false, isActive: true })}
                    >
                      Add another address
                    </Button>
                  </>
                )}
              </Form.List>
            </>
        </Form>
      </Modal>

      {/* ---- Addresses drawer ---- */}
      <Drawer
        title={
          addressBranch ? (
            <Space>
              <EnvironmentOutlined />
              <span>Addresses — {addressBranch.branchName}</span>
              <Tag color="gold">{addressBranch.branchCode}</Tag>
            </Space>
          ) : (
            'Addresses'
          )
        }
        open={Boolean(addressBranch)}
        onClose={() => setAddressBranch(null)}
        width={600}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openAddressForm(null)}
          >
            Add address
          </Button>
        }
      >
        {addressBranch && (
          <>
            <Card
              size="small"
              style={{
                background: colors.black.tertiary,
                border: `1px solid ${colors.border}`,
                marginBottom: 12,
              }}
            >
              <Space size={6}>
                <StarFilled style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>
                  Primary address (from Branch record)
                </Text>
              </Space>
              <div style={{ marginTop: 6, color: colors.text.primary }}>
                {addressBranch.address ?? <Text type="secondary">No primary address set</Text>}
              </div>
              {addressBranch.phone && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  📞 {addressBranch.phone}
                </Text>
              )}
            </Card>

            <Divider orientation="left" style={{ color: colors.text.placeholder, fontSize: 13 }}>
              Additional addresses
            </Divider>

            <Spin spinning={addressesLoading}>
              {(addressesData?.length ?? 0) === 0 ? (
                <Empty description="No additional addresses yet" />
              ) : (
                <List
                  dataSource={addressesData ?? []}
                  renderItem={(addr) => (
                    <List.Item
                      key={addr.id}
                      style={{
                        background: colors.black.tertiary,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                      }}
                      actions={[
                        <Tooltip key="edit" title="Edit">
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openAddressForm(addr)}
                          />
                        </Tooltip>,
                        <Popconfirm
                          key="del"
                          title={`Delete "${addr.label}"?`}
                          okText="Delete"
                          okButtonProps={{ danger: true }}
                          cancelText="Cancel"
                          onConfirm={() => onAddressDelete(addr.id)}
                        >
                          <Tooltip title="Delete">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Tooltip>
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space size={6} wrap>
                            <Text strong style={{ color: colors.text.primary }}>
                              {addr.label}
                            </Text>
                            {addr.isPrimary && (
                              <Tag icon={<StarFilled />} color="gold">
                                Primary
                              </Tag>
                            )}
                            <Switch
                              size="small"
                              checked={addr.isActive}
                              checkedChildren="Active"
                              unCheckedChildren="Inactive"
                              loading={updateAddress.isPending}
                              onChange={(checked) =>
                                updateAddress.mutate({
                                  id: addr.id,
                                  body: { isActive: checked },
                                })
                              }
                            />
                          </Space>
                        }
                        description={
                          <div style={{ color: colors.text.placeholder, fontSize: 13 }}>
                            <div>
                              {addr.line1}
                              {addr.line2 ? `, ${addr.line2}` : ''}
                            </div>
                            <div>
                              {[addr.city, addr.state, addr.pincode, addr.country]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </div>
                            {(addr.phone || addr.email) && (
                              <div style={{ marginTop: 4 }}>
                                {addr.phone && <span>📞 {addr.phone}</span>}
                                {addr.phone && addr.email && <span>  ·  </span>}
                                {addr.email && <span>✉ {addr.email}</span>}
                              </div>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Spin>
          </>
        )}
      </Drawer>

      {/* ---- Catalog drawer (products & services availability) ---- */}
      <Drawer
        title={
          catalogBranch ? (
            <Space>
              <AppstoreOutlined />
              <span>Catalog — {catalogBranch.branchName}</span>
              <Tag color="gold">{catalogBranch.branchCode}</Tag>
            </Space>
          ) : (
            'Catalog'
          )
        }
        open={Boolean(catalogBranch)}
        onClose={() => setCatalogBranch(null)}
        width={640}
        extra={
          <Button
            type="primary"
            loading={setCatalog.isPending}
            onClick={onCatalogSave}
          >
            Save catalog
          </Button>
        }
      >
        {catalogBranch && (
          <Spin spinning={catalogLoading}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block', marginBottom: 12 }}>
              Choose which products and services this branch carries. A branch with
              nothing selected is treated as carrying the full catalog.
            </Text>
            <Tabs
              items={[
                { key: 'products', label: 'Products', data: productTransferData, keys: productKeys, set: setProductKeys, right: 'Carried' },
                { key: 'services', label: 'Services', data: serviceTransferData, keys: serviceKeys, set: setServiceKeys, right: 'Offered' },
                { key: 'payment-modes', label: 'Payment Modes', data: paymentModeTransferData, keys: paymentModeKeys, set: setPaymentModeKeys, right: 'Accepted' },
                { key: 'categories', label: 'Categories', data: categoryTransferData, keys: categoryKeys, set: setCategoryKeys, right: 'Assigned' },
                { key: 'ledgers', label: 'Ledgers', data: ledgerTransferData, keys: ledgerKeys, set: setLedgerKeys, right: 'Assigned' },
              ].map((t) => ({
                key: t.key,
                label: `${t.label} (${t.keys.length})`,
                children: (
                  <Transfer
                    dataSource={t.data}
                    titles={['Available', t.right]}
                    targetKeys={t.keys}
                    onChange={(keys) => t.set(keys as string[])}
                    render={(item) => item.title}
                    showSearch
                    filterOption={(input, item) =>
                      item.title.toLowerCase().includes(input.toLowerCase())
                    }
                    listStyle={{ width: 270, height: 420 }}
                  />
                ),
              }))}
            />
          </Spin>
        )}
      </Drawer>

      {/* ---- Address create/edit modal ---- */}
      <Modal
        title={editingAddress ? `Edit address — ${editingAddress.label}` : 'Add address'}
        open={addressFormOpen}
        onCancel={() => setAddressFormOpen(false)}
        onOk={() => addressForm.submit()}
        okText={editingAddress ? 'Save changes' : 'Add address'}
        confirmLoading={createAddress.isPending || updateAddress.isPending}
        width={560}
        destroyOnClose
      >
        <Form<AddressFormValues>
          form={addressForm}
          layout="vertical"
          onFinish={onAddressSubmit}
          requiredMark={false}
          preserve={false}
        >
          <Form.Item
            label="Label"
            name="label"
            rules={[{ required: true, message: 'Label is required' }]}
            tooltip="Short name shown in the list, e.g. Billing / Warehouse / Satellite clinic"
          >
            <Input maxLength={80} placeholder="e.g. Billing" />
          </Form.Item>
          <Form.Item
            label="Address line 1"
            name="line1"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item label="Address line 2" name="line2">
            <Input maxLength={200} />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item label="City" name="city" style={{ flex: 1, marginRight: 8 }}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item label="State" name="state" style={{ flex: 1, marginRight: 8 }}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item label="Pincode" name="pincode" style={{ width: 120 }}>
              <Input maxLength={12} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item label="Country" name="country" style={{ flex: 1, marginRight: 8 }}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item label="Phone" name="phone" style={{ flex: 1 }}>
              <Input maxLength={40} />
            </Form.Item>
          </Space.Compact>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Enter a valid email' }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Space size={24}>
            <Form.Item label="Primary" name="isPrimary" valuePropName="checked">
              <Switch checkedChildren="Primary" unCheckedChildren="Standard" />
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
