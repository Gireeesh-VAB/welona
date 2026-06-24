'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ApartmentOutlined,
  CheckSquareOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SearchOutlined,
  TeamOutlined,
  UnlockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  ALL_MODULES,
  ALL_PERMISSIONS,
  MODULE_GROUPS,
  PERMISSION_LABEL,
  type Permission,
} from '@/lib/sample-data/roles';
import {
  useAdminRoles,
  useCreateAdminRole,
  useUpdateAdminRole,
  useDeleteAdminRole,
} from '@/hooks/useAdminRoles';
import type { AdminRole, AdminRoleMember } from '@shared/types/admin-role';
import { ApiClientError } from '@/lib/api-client';

const { Title, Text, Paragraph } = Typography;

type ViewTab = 'permissions' | 'members';

interface NewRoleForm {
  name: string;
  scope: 'organization' | 'branch';
  description: string;
  cloneFromId?: string;
}

// --- Permission format conversion -----------------------------------------

const DB_TO_UI: Record<string, Permission> = {
  read: 'view',
  update: 'edit',
  create: 'create',
  delete: 'delete',
  export: 'export',
  approve: 'approve',
};

const UI_TO_DB: Record<string, string> = {
  view: 'read',
  edit: 'update',
  create: 'create',
  delete: 'delete',
  export: 'export',
  approve: 'approve',
};

function dbPermsToUi(dbPerms: string[]): Record<string, Permission[]> {
  if (dbPerms.includes('*')) {
    const out: Record<string, Permission[]> = {};
    for (const m of ALL_MODULES) out[m.key] = [...m.permissions];
    return out;
  }
  const out: Record<string, Permission[]> = {};
  for (const perm of dbPerms) {
    const idx = perm.indexOf(':');
    if (idx === -1) continue;
    const mod = perm.slice(0, idx);
    const action = perm.slice(idx + 1);
    const uiAction = (DB_TO_UI[action] ?? action) as Permission;
    if (!out[mod]) out[mod] = [];
    if (!out[mod].includes(uiAction)) out[mod].push(uiAction);
  }
  return out;
}

function uiPermsToDb(uiPerms: Record<string, Permission[]>): string[] {
  const out: string[] = [];
  for (const [mod, perms] of Object.entries(uiPerms)) {
    for (const p of perms) {
      out.push(`${mod}:${UI_TO_DB[p] ?? p}`);
    }
  }
  return out;
}

// --- Role avatar initials ---------------------------------------------------

function roleInitial(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

// ---------------------------------------------------------------------------

export default function RbacPage() {
  const colors = useBrandColors();
  const { message } = App.useApp();
  const navItem = getAdminNavItem('master-rbac')!;

  const { data: rolesData, isLoading } = useAdminRoles({ limit: 200 });
  const roles: AdminRole[] = rolesData?.items ?? [];

  const createRole = useCreateAdminRole();
  const updateRole = useUpdateAdminRole();
  const deleteRole = useDeleteAdminRole();

  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('permissions');
  const [roleSearch, setRoleSearch] = useState('');

  // Permission draft for the right pane
  const [draft, setDraft] = useState<Record<string, Permission[]>>({});
  const [dirty, setDirty] = useState(false);

  // Set first role as selected once data arrives
  useEffect(() => {
    if (!activeRoleId && roles.length > 0) {
      setActiveRoleId(roles[0].id);
    }
  }, [roles.length]);

  // Reset draft whenever user switches to a different role
  const activeRole: AdminRole | null = roles.find((r) => r.id === activeRoleId) ?? roles[0] ?? null;

  useEffect(() => {
    if (activeRole) {
      setDraft(dbPermsToUi(activeRole.permissions));
      setDirty(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoleId]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<NewRoleForm>();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm<Pick<NewRoleForm, 'name' | 'description'>>();

  // KPIs
  const kpis = useMemo(() => ({
    totalRoles: roles.length,
    totalMembers: roles.reduce((s, r) => s + r.staffCount, 0),
    modulesCovered: ALL_MODULES.length,
    systemRoles: roles.filter((r) => r.isSystem).length,
  }), [roles]);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  }, [roles, roleSearch]);

  // --- Role switching -------------------------------------------------------

  const selectRole = (id: string) => {
    if (id === activeRoleId) return;
    if (dirty) {
      Modal.confirm({
        title: 'Discard unsaved permission changes?',
        content: `You have unsaved changes on "${activeRole?.name}". Switching roles will discard them.`,
        okText: 'Discard',
        okButtonProps: { danger: true },
        onOk: () => {
          setActiveRoleId(id);
        },
      });
    } else {
      setActiveRoleId(id);
    }
  };

  // --- Permission toggles ---------------------------------------------------

  const isLocked = !!activeRole?.isSystem;

  const togglePermission = (moduleKey: string, p: Permission) => {
    if (isLocked) return;
    const current = draft[moduleKey] ?? [];
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    setDraft({ ...draft, [moduleKey]: next });
    setDirty(true);
  };

  const setGroupAll = (groupKey: string, action: 'all' | 'none' | 'view-only') => {
    if (isLocked) return;
    const next = { ...draft };
    const group = MODULE_GROUPS.find((g) => g.key === groupKey);
    if (!group) return;
    for (const m of group.modules) {
      if (action === 'all') next[m.key] = [...m.permissions];
      else if (action === 'none') next[m.key] = [];
      else if (action === 'view-only') next[m.key] = m.permissions.includes('view') ? ['view'] : [];
    }
    setDraft(next);
    setDirty(true);
  };

  const saveDraft = async () => {
    if (!activeRole) return;
    try {
      await updateRole.mutateAsync({ id: activeRole.id, body: { permissions: uiPermsToDb(draft) } });
      setDirty(false);
      message.success(`${activeRole.name} permissions saved`);
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Failed to save permissions');
    }
  };

  const discardDraft = () => {
    if (activeRole) {
      setDraft(dbPermsToUi(activeRole.permissions));
      setDirty(false);
    }
  };

  // --- Draft stats ----------------------------------------------------------

  const draftStats = useMemo(() => {
    let granted = 0, modulesTouched = 0, total = 0;
    for (const m of ALL_MODULES) {
      total += m.permissions.length;
      const ps = draft[m.key] ?? [];
      if (ps.length > 0) modulesTouched += 1;
      granted += ps.length;
    }
    return { granted, total, modulesTouched };
  }, [draft]);

  // --- Create role ----------------------------------------------------------

  const openCreate = () => {
    createForm.resetFields();
    setCreateOpen(true);
  };

  const onCreateRole = async () => {
    const values = await createForm.validateFields();
    const cloneSource = values.cloneFromId
      ? roles.find((r) => r.id === values.cloneFromId)
      : undefined;

    try {
      const created = await createRole.mutateAsync({
        name: values.name.trim(),
        scope: values.scope,
        description: values.description?.trim() ?? '',
        permissions: cloneSource ? cloneSource.permissions : [],
      });
      setActiveRoleId(created.id);
      setCreateOpen(false);
      message.success(`Role "${created.name}" created`);
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not create role');
    }
  };

  // --- Edit role metadata ---------------------------------------------------

  const openEdit = () => {
    if (!activeRole || isLocked) return;
    editForm.setFieldsValue({ name: activeRole.name, description: activeRole.description });
    setEditOpen(true);
  };

  const onEditRole = async () => {
    if (!activeRole) return;
    const values = await editForm.validateFields();
    try {
      await updateRole.mutateAsync({
        id: activeRole.id,
        body: { name: values.name, description: values.description },
      });
      setEditOpen(false);
      message.success('Role updated');
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not update role');
    }
  };

  // --- Delete role ----------------------------------------------------------

  const onDeleteRole = async () => {
    if (!activeRole || isLocked) return;
    try {
      await deleteRole.mutateAsync(activeRole.id);
      setActiveRoleId(roles.find((r) => r.id !== activeRole.id)?.id ?? null);
      message.success(`Role "${activeRole.name}" deleted`);
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not delete role');
    }
  };

  // --- Members table --------------------------------------------------------

  const memberColumns: ColumnsType<AdminRoleMember> = [
    {
      title: 'Name',
      dataIndex: 'name',
      width: 240,
      render: (v: string, row) => (
        <Space>
          <Avatar style={{ background: colors.gold.primary, color: '#fff', fontWeight: 600 }}>
            {v.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: colors.text.primary }}>{v}</div>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      width: 180,
      render: (v: string | null) =>
        v ? (
          <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>
            {v}
          </Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      width: 180,
      render: (v: string | null) => <Text style={{ color: colors.text.primary }}>{v ?? '—'}</Text>,
    },
  ];

  // --------------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            {navItem?.label ?? 'RBAC'}
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            {navItem?.description ?? 'Manage staff roles and their module permissions.'}
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New Role
        </Button>
      </div>

      {/* KPI strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: 'Total Roles', value: kpis.totalRoles, icon: <SafetyCertificateOutlined />, color: colors.gold.primary },
          { title: 'Staff Assigned', value: kpis.totalMembers, icon: <TeamOutlined />, color: colors.status.info },
          { title: 'Modules Covered', value: kpis.modulesCovered, icon: <ApartmentOutlined />, color: colors.status.success },
          { title: 'System Roles', value: kpis.systemRoles, icon: <LockOutlined />, color: colors.status.warning },
        ].map((kpi) => (
          <Col key={kpi.title} xs={12} lg={6}>
            <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
              <Statistic
                title={<Text style={{ color: colors.text.placeholder }}>{kpi.title}</Text>}
                value={isLoading ? '—' : kpi.value}
                prefix={<span style={{ color: kpi.color }}>{kpi.icon}</span>}
                valueStyle={{ color: kpi.color, fontSize: 24 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Two-pane workspace */}
      <Row gutter={[16, 16]}>
        {/* Left pane — roles list */}
        <Col xs={24} xl={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }} styles={{ body: { padding: 0 } }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
              <Input
                prefix={<SearchOutlined style={{ color: colors.text.placeholder }} />}
                placeholder="Search roles…"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                allowClear
              />
            </div>
            <div style={{ maxHeight: 720, overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ padding: 16 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} active avatar paragraph={{ rows: 2 }} style={{ marginBottom: 16 }} />
                  ))}
                </div>
              ) : filteredRoles.length === 0 ? (
                <div style={{ padding: 24 }}>
                  <Empty description="No roles match your search" />
                </div>
              ) : (
                filteredRoles.map((r) => {
                  const isActive = r.id === activeRoleId;
                  return (
                    <div
                      key={r.id}
                      onClick={() => selectRole(r.id)}
                      style={{
                        padding: 14,
                        cursor: 'pointer',
                        borderBottom: `1px solid ${colors.border}`,
                        borderLeft: `4px solid ${isActive ? colors.gold.primary : 'transparent'}`,
                        background: isActive ? colors.black.tertiary : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = colors.black.tertiary; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <Avatar
                          size={40}
                          style={{
                            background: isActive ? colors.gold.primary : colors.black.primary,
                            color: isActive ? '#fff' : colors.text.primary,
                            fontWeight: 700,
                            fontSize: 14,
                            flexShrink: 0,
                            borderRadius: 10,
                          }}
                        >
                          {roleInitial(r.name)}
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text strong style={{ color: colors.text.primary, fontSize: 14 }}>{r.name}</Text>
                            {r.isSystem && (
                              <Tag icon={<LockOutlined />} style={{ background: `${colors.status.warning}1A`, color: colors.status.warning, border: 'none', fontWeight: 600, margin: 0, fontSize: 10 }}>
                                System
                              </Tag>
                            )}
                          </div>
                          <Paragraph
                            style={{ color: colors.text.placeholder, fontSize: 12, margin: '4px 0 6px' }}
                            ellipsis={{ rows: 2, tooltip: r.description }}
                          >
                            {r.description || <em>No description</em>}
                          </Paragraph>
                          <Space size={10} style={{ fontSize: 11 }}>
                            <Text style={{ color: colors.text.placeholder }}>
                              <UserOutlined /> {r.staffCount} staff
                            </Text>
                            <Text style={{ color: colors.gold.primary, fontWeight: 600 }}>
                              <CheckSquareOutlined /> {r.permissions.length} perms
                            </Text>
                            <Tag style={{ fontSize: 10, margin: 0 }}>{r.scope === 'organization' ? 'Org' : 'Branch'}</Tag>
                          </Space>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </Col>

        {/* Right pane — permission matrix or members */}
        <Col xs={24} xl={16}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }} styles={{ body: { padding: 0 } }}>
            {!activeRole ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                {isLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : <Empty description="Select a role to manage its permissions" />}
              </div>
            ) : (
              <>
                {/* Role header */}
                <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}` }}>
                  <Row gutter={16} align="middle">
                    <Col flex="auto">
                      <Space size={12} align="start">
                        <Avatar
                          size={52}
                          style={{ background: colors.gold.primary, color: '#fff', fontWeight: 700, fontSize: 18, borderRadius: 12 }}
                        >
                          {roleInitial(activeRole.name)}
                        </Avatar>
                        <div>
                          <Space size={8} align="center">
                            <Title level={4} style={{ color: colors.text.primary, margin: 0 }}>{activeRole.name}</Title>
                            {isLocked && (
                              <Tag icon={<LockOutlined />} style={{ background: `${colors.status.warning}1A`, color: colors.status.warning, border: 'none', fontWeight: 600, margin: 0 }}>
                                System Role
                              </Tag>
                            )}
                            <Tag style={{ margin: 0 }}>{activeRole.scope === 'organization' ? 'Organisation-wide' : 'Branch-scoped'}</Tag>
                          </Space>
                          <Paragraph style={{ color: colors.text.placeholder, margin: '4px 0 0', fontSize: 13 }}>
                            {activeRole.description || <em>No description</em>}
                          </Paragraph>
                          <Space size={16} style={{ marginTop: 6, fontSize: 12 }}>
                            <Text style={{ color: colors.text.placeholder }}>
                              <TeamOutlined /> {activeRole.staffCount} staff
                            </Text>
                            <Text style={{ color: colors.gold.primary, fontWeight: 600 }}>
                              <CheckSquareOutlined /> {draftStats.granted}/{draftStats.total} permissions · {draftStats.modulesTouched} modules
                            </Text>
                          </Space>
                        </div>
                      </Space>
                    </Col>
                    <Col>
                      {!isLocked && (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={openEdit}>Edit</Button>
                          <Popconfirm
                            title={`Delete "${activeRole.name}"?`}
                            description={
                              activeRole.staffCount > 0
                                ? `${activeRole.staffCount} staff still assigned. Reassign them first.`
                                : 'This action cannot be undone.'
                            }
                            okText="Delete"
                            okButtonProps={{ danger: true, disabled: activeRole.staffCount > 0 }}
                            onConfirm={onDeleteRole}
                          >
                            <Button danger icon={<DeleteOutlined />} loading={deleteRole.isPending}>Delete</Button>
                          </Popconfirm>
                        </Space>
                      )}
                    </Col>
                  </Row>
                  <Segmented<ViewTab>
                    value={activeTab}
                    onChange={(v) => setActiveTab(v as ViewTab)}
                    options={[
                      { label: <span><SafetyCertificateOutlined /> Permissions</span>, value: 'permissions' },
                      { label: <span><TeamOutlined /> Members ({activeRole.staffCount})</span>, value: 'members' },
                    ]}
                    style={{ marginTop: 16 }}
                  />
                </div>

                {/* Permissions pane */}
                {activeTab === 'permissions' ? (
                  <div style={{ padding: 20 }}>
                    {dirty && (
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: `${colors.status.warning}1A`, border: `1px solid ${colors.status.warning}`, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <Text strong style={{ color: colors.status.warning }}>
                          <EditOutlined /> Unsaved changes
                        </Text>
                        <Space>
                          <Button size="small" onClick={discardDraft}>Discard</Button>
                          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveDraft} loading={updateRole.isPending}>
                            Save Changes
                          </Button>
                        </Space>
                      </div>
                    )}

                    {isLocked && (
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: `${colors.status.info}1A`, border: `1px solid ${colors.status.info}`, marginBottom: 16 }}>
                        <Text style={{ color: colors.status.info }}>
                          <LockOutlined /> System role — permissions can be viewed but not changed.
                        </Text>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 680, overflowY: 'auto', paddingRight: 4 }}>
                      {MODULE_GROUPS.map((group) => {
                        const groupTotal = group.modules.reduce((s, m) => s + m.permissions.length, 0);
                        const groupGranted = group.modules.reduce((s, m) => s + (draft[m.key]?.length ?? 0), 0);
                        return (
                          <div key={group.key} style={{ background: colors.black.primary, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderBottom: `1px solid ${colors.border}` }}>
                              <Space>
                                <Badge
                                  count={groupGranted}
                                  showZero
                                  style={{ background: groupGranted === groupTotal ? colors.status.success : groupGranted > 0 ? colors.gold.primary : colors.text.placeholder }}
                                />
                                <Text strong style={{ color: colors.text.primary, fontSize: 14 }}>{group.label}</Text>
                                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{groupGranted}/{groupTotal}</Text>
                              </Space>
                              {!isLocked && (
                                <Space size={6}>
                                  <Button size="small" type="text" onClick={() => setGroupAll(group.key, 'all')}>Grant All</Button>
                                  <Button size="small" type="text" onClick={() => setGroupAll(group.key, 'view-only')}>View only</Button>
                                  <Button size="small" type="text" danger onClick={() => setGroupAll(group.key, 'none')}>Clear</Button>
                                </Space>
                              )}
                            </div>

                            {/* Column headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,2.2fr) repeat(6,minmax(70px,1fr))', padding: '8px 16px', borderBottom: `1px solid ${colors.border}`, background: colors.black.tertiary }}>
                              <Text style={{ color: colors.text.placeholder, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Module</Text>
                              {ALL_PERMISSIONS.map((p) => (
                                <Text key={p} style={{ color: colors.text.placeholder, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>
                                  {PERMISSION_LABEL[p]}
                                </Text>
                              ))}
                            </div>

                            {group.modules.map((module, idx) => {
                              const granted = draft[module.key] ?? [];
                              return (
                                <div
                                  key={module.key}
                                  style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,2.2fr) repeat(6,minmax(70px,1fr))', padding: '10px 16px', borderBottom: idx === group.modules.length - 1 ? 'none' : `1px solid ${colors.border}`, alignItems: 'center' }}
                                >
                                  <div>
                                    <Text strong style={{ color: colors.text.primary, fontSize: 13 }}>{module.label}</Text>
                                    {granted.length === module.permissions.length && granted.length > 0 && (
                                      <Tag style={{ background: `${colors.status.success}1A`, color: colors.status.success, border: 'none', fontSize: 10, fontWeight: 600, margin: '0 0 0 6px' }}>Full</Tag>
                                    )}
                                  </div>
                                  {ALL_PERMISSIONS.map((p) => {
                                    const applicable = module.permissions.includes(p);
                                    const checked = applicable && granted.includes(p);
                                    return (
                                      <div key={p} style={{ textAlign: 'center' }}>
                                        {applicable ? (
                                          <Checkbox checked={checked} disabled={isLocked} onChange={() => togglePermission(module.key, p)} />
                                        ) : (
                                          <Text style={{ color: colors.text.placeholder }}>—</Text>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {!isLocked && (
                      <div style={{ marginTop: 16, padding: 16, background: colors.black.primary, border: `1px solid ${colors.border}`, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                          Changes apply to every staff member assigned this role.
                        </Text>
                        <Space>
                          <Button onClick={discardDraft} disabled={!dirty}>Discard</Button>
                          <Button type="primary" icon={<SaveOutlined />} onClick={saveDraft} disabled={!dirty} loading={updateRole.isPending}>
                            Save Changes
                          </Button>
                        </Space>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Members pane */
                  <div style={{ padding: 20 }}>
                    {activeRole.members.length === 0 ? (
                      <Empty description={`No staff are assigned the "${activeRole.name}" role`} />
                    ) : (
                      <Table<AdminRoleMember>
                        rowKey="id"
                        columns={memberColumns}
                        dataSource={activeRole.members}
                        pagination={false}
                        size="middle"
                        scroll={{ x: 640 }}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Create role modal */}
      <Modal
        title="Create a new role"
        open={createOpen}
        onOk={onCreateRole}
        confirmLoading={createRole.isPending}
        onCancel={() => setCreateOpen(false)}
        okText="Create Role"
        width={520}
        destroyOnClose
      >
        <Form<NewRoleForm> form={createForm} layout="vertical" initialValues={{ scope: 'branch' }}>
          <Form.Item name="name" label="Role name" rules={[{ required: true, message: 'Required' }, { max: 80 }]}>
            <Input placeholder="e.g. Regional Manager" />
          </Form.Item>
          <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'branch', label: 'Branch-scoped — staff see only their branch data' },
                { value: 'organization', label: 'Organisation-wide — staff see all branches' },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ max: 300 }]}>
            <Input.TextArea rows={2} placeholder="What can someone with this role do?" />
          </Form.Item>
          <Form.Item name="cloneFromId" label="Clone permissions from (optional)" extra="Pick an existing role to copy its permissions as a starting point.">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Start from a blank slate"
              options={roles.map((r) => ({ value: r.id, label: `${roleInitial(r.name)}  ${r.name}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit role modal */}
      <Modal
        title={`Edit "${activeRole?.name}"`}
        open={editOpen}
        onOk={onEditRole}
        confirmLoading={updateRole.isPending}
        onCancel={() => setEditOpen(false)}
        okText="Save"
        width={480}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="Role name" rules={[{ required: true }, { max: 80 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ max: 300 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
