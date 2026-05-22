'use client';

import { useMemo, useState } from 'react';
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
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ApartmentOutlined,
  CheckSquareOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
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
import dayjs from 'dayjs';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import {
  ALL_MODULES,
  ALL_PERMISSIONS,
  MODULE_GROUPS,
  PERMISSION_LABEL,
  ROLES,
  type Permission,
  type Role,
  type RoleMember,
} from '@/lib/sample-data/roles';

const { Title, Text, Paragraph } = Typography;

type ViewTab = 'permissions' | 'members';

interface NewRoleForm {
  name: string;
  description: string;
  emoji: string;
  cloneFrom?: string;
}

export default function AdminMasterRolePage() {
  const colors = useBrandColors();
  const { message } = App.useApp();
  const navItem = getAdminNavItem('master-role')!;

  const [roles, setRoles] = useState<Role[]>(ROLES);
  const [activeRoleKey, setActiveRoleKey] = useState<string>(ROLES[1].key); // start on Branch Manager
  const [activeTab, setActiveTab] = useState<ViewTab>('permissions');
  const [roleSearch, setRoleSearch] = useState('');

  // Working copy of permissions for the active role — so we can show dirty state.
  const activeRole = roles.find((r) => r.key === activeRoleKey) ?? roles[0];
  const [draft, setDraft] = useState<Record<string, Permission[]>>(activeRole.permissions);
  const [dirty, setDirty] = useState(false);

  // ---- Modals ----
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<NewRoleForm>();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm<Pick<Role, 'name' | 'description' | 'emoji'>>();

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const totalMembers = roles.reduce((s, r) => s + r.members.length, 0);
    const systemRoles = roles.filter((r) => r.isSystem).length;
    const modulesCovered = ALL_MODULES.length;
    return {
      totalRoles: roles.length,
      totalMembers,
      modulesCovered,
      systemRoles,
    };
  }, [roles]);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) =>
      r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  }, [roles, roleSearch]);

  // ---- Select a different role: reset draft ----
  const selectRole = (key: string) => {
    if (dirty) {
      Modal.confirm({
        title: 'Discard unsaved permission changes?',
        content: `You have unsaved changes on "${activeRole.name}". Switching roles will discard them.`,
        okText: 'Discard',
        okButtonProps: { danger: true },
        onOk: () => {
          const r = roles.find((x) => x.key === key)!;
          setActiveRoleKey(key);
          setDraft(r.permissions);
          setDirty(false);
        },
      });
    } else {
      const r = roles.find((x) => x.key === key)!;
      setActiveRoleKey(key);
      setDraft(r.permissions);
    }
  };

  // ---- Permission toggles ----
  const isLocked = activeRole.isSystem;

  const togglePermission = (moduleKey: string, p: Permission) => {
    if (isLocked) return;
    const current = draft[moduleKey] ?? [];
    const next = current.includes(p)
      ? current.filter((x) => x !== p)
      : [...current, p];
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

  const saveDraft = () => {
    setRoles(roles.map((r) => r.key === activeRoleKey ? { ...r, permissions: draft } : r));
    setDirty(false);
    message.success(`${activeRole.name} permissions updated`);
  };

  const discardDraft = () => {
    setDraft(activeRole.permissions);
    setDirty(false);
  };

  // ---- Role count of granted permissions ----
  const draftStats = useMemo(() => {
    let granted = 0;
    let modulesTouched = 0;
    let total = 0;
    for (const m of ALL_MODULES) {
      total += m.permissions.length;
      const ps = draft[m.key] ?? [];
      if (ps.length > 0) modulesTouched += 1;
      granted += ps.length;
    }
    return { granted, total, modulesTouched };
  }, [draft]);

  // ---- Create / Edit role ----
  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ emoji: '🎯' });
    setCreateOpen(true);
  };

  const onCreateRole = async () => {
    const values = await createForm.validateFields();
    const cloneFrom = values.cloneFrom ? roles.find((r) => r.key === values.cloneFrom) : undefined;
    const newRole: Role = {
      key: `role-${Date.now()}`,
      name: values.name.trim(),
      description: values.description.trim(),
      emoji: values.emoji,
      isSystem: false, isActive: true,
      permissions: cloneFrom
        ? Object.fromEntries(Object.entries(cloneFrom.permissions).map(([k, v]) => [k, [...v]]))
        : {},
      members: [],
      createdBy: 'Welona Super Admin',
      createdAt: dayjs().toISOString(),
    };
    setRoles([...roles, newRole]);
    setActiveRoleKey(newRole.key);
    setDraft(newRole.permissions);
    setDirty(false);
    setCreateOpen(false);
    message.success(`Role "${newRole.name}" created${cloneFrom ? ` from ${cloneFrom.name}` : ''}`);
  };

  const openEdit = () => {
    if (isLocked) return;
    editForm.setFieldsValue({
      name: activeRole.name, description: activeRole.description, emoji: activeRole.emoji,
    });
    setEditOpen(true);
  };

  const onEditRole = async () => {
    const values = await editForm.validateFields();
    setRoles(roles.map((r) => r.key === activeRoleKey ? { ...r, ...values } : r));
    setEditOpen(false);
    message.success('Role updated');
  };

  const deleteRole = () => {
    if (isLocked) return;
    if (activeRole.members.length > 0) {
      message.error('Reassign members before deleting this role.');
      return;
    }
    setRoles(roles.filter((r) => r.key !== activeRoleKey));
    setActiveRoleKey(roles[0].key);
    setDraft(roles[0].permissions);
    setDirty(false);
    message.success(`Role "${activeRole.name}" deleted`);
  };

  const toggleActive = (next: boolean) => {
    if (isLocked) return;
    setRoles(roles.map((r) => r.key === activeRoleKey ? { ...r, isActive: next } : r));
    message.success(`Role ${next ? 'enabled' : 'disabled'}`);
  };

  // ---- Members table ----
  const memberColumns: ColumnsType<RoleMember> = [
    {
      title: 'Name', dataIndex: 'name', width: 240,
      render: (v: string, row) => (
        <Space>
          <Avatar style={{ background: colors.gold.primary, color: colors.text.onGold, fontWeight: 600 }}>
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
      title: 'Designation', dataIndex: 'designation', width: 200,
      render: (v: string) => <Tag style={{ background: colors.gold.light, color: colors.text.primary, border: 'none', margin: 0 }}>{v}</Tag>,
    },
    { title: 'Branch', dataIndex: 'branchName', width: 200,
      render: (v: string) => <Text style={{ color: colors.text.primary }}>{v}</Text> },
    {
      title: 'Assigned', dataIndex: 'assignedAt', width: 150,
      render: (v: string) => <Text style={{ color: colors.text.placeholder }}>{dayjs(v).format('DD-MM-YYYY')}</Text>,
    },
    {
      title: '', key: 'actions', width: 80, fixed: 'right',
      render: () => (
        <Tooltip title="Reassign to another role">
          <Button size="small" type="text" icon={<EditOutlined />} disabled={isLocked} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>{navItem.label}</Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={openCreate}>New Role</Button>
      </div>

      {/* KPI strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Total Roles</Text>}
              value={kpis.totalRoles}
              prefix={<SafetyCertificateOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.gold.primary, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Staff Assigned</Text>}
              value={kpis.totalMembers}
              prefix={<TeamOutlined style={{ color: colors.status.info }} />}
              valueStyle={{ color: colors.status.info, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>Modules Covered</Text>}
              value={kpis.modulesCovered}
              prefix={<ApartmentOutlined style={{ color: colors.status.success }} />}
              valueStyle={{ color: colors.status.success, fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic title={<Text style={{ color: colors.text.placeholder }}>System Roles (locked)</Text>}
              value={kpis.systemRoles}
              prefix={<LockOutlined style={{ color: colors.status.warning }} />}
              valueStyle={{ color: colors.status.warning, fontSize: 24 }} />
          </Card>
        </Col>
      </Row>

      {/* Two-pane workspace */}
      <Row gutter={[16, 16]}>
        {/* ---- Left pane: roles list ------------------------------------- */}
        <Col xs={24} xl={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 0 } }}>
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
              {filteredRoles.length === 0 ? (
                <div style={{ padding: 24 }}><Empty description="No roles match your search" /></div>
              ) : (
                filteredRoles.map((r) => {
                  const isActive = r.key === activeRoleKey;
                  const grantedCount = Object.values(r.permissions).reduce((s, ps) => s + ps.length, 0);
                  return (
                    <div
                      key={r.key}
                      onClick={() => selectRole(r.key)}
                      style={{
                        padding: 14, cursor: 'pointer',
                        borderBottom: `1px solid ${colors.border}`,
                        borderLeft: `4px solid ${isActive ? colors.gold.primary : 'transparent'}`,
                        background: isActive ? colors.black.tertiary : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = colors.black.tertiary; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: isActive ? colors.gold.primary : colors.black.primary,
                          color: isActive ? '#FFFFFF' : colors.text.primary,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                          transition: 'background 0.15s',
                        }}>{r.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text strong style={{ color: colors.text.primary, fontSize: 14 }}>{r.name}</Text>
                            {r.isSystem && (
                              <Tag icon={<LockOutlined />} style={{
                                background: `${colors.status.warning}1A`,
                                color: colors.status.warning,
                                border: 'none', fontWeight: 600, margin: 0, fontSize: 10,
                              }}>System</Tag>
                            )}
                            {!r.isActive && (
                              <Tag style={{ background: colors.status.error, color: '#FFFFFF', border: 'none', fontWeight: 600, margin: 0, fontSize: 10 }}>
                                Disabled
                              </Tag>
                            )}
                          </div>
                          <Paragraph
                            style={{ color: colors.text.placeholder, fontSize: 12, margin: '4px 0 6px' }}
                            ellipsis={{ rows: 2, tooltip: r.description }}
                          >
                            {r.description}
                          </Paragraph>
                          <Space size={10} style={{ fontSize: 11 }}>
                            <Text style={{ color: colors.text.placeholder }}>
                              <UserOutlined /> {r.members.length} member{r.members.length === 1 ? '' : 's'}
                            </Text>
                            <Text style={{ color: colors.gold.primary, fontWeight: 600 }}>
                              <CheckSquareOutlined /> {grantedCount} perms
                            </Text>
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

        {/* ---- Right pane: permission matrix or members ------------------ */}
        <Col xs={24} xl={16}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 0 } }}>
            {/* Role header */}
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}` }}>
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Space size={12} align="start">
                    <div style={{
                      width: 52, height: 52, borderRadius: 12,
                      background: colors.gold.primary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26,
                    }}>{activeRole.emoji}</div>
                    <div>
                      <Space size={8} align="center">
                        <Title level={4} style={{ color: colors.text.primary, margin: 0 }}>{activeRole.name}</Title>
                        {isLocked && (
                          <Tag icon={<LockOutlined />} style={{
                            background: `${colors.status.warning}1A`, color: colors.status.warning,
                            border: 'none', fontWeight: 600, margin: 0,
                          }}>System Role</Tag>
                        )}
                      </Space>
                      <Paragraph style={{ color: colors.text.placeholder, margin: '4px 0 0', fontSize: 13 }}>
                        {activeRole.description}
                      </Paragraph>
                      <Space size={16} style={{ marginTop: 6, fontSize: 12 }}>
                        <Text style={{ color: colors.text.placeholder }}>
                          <TeamOutlined /> {activeRole.members.length} member{activeRole.members.length === 1 ? '' : 's'}
                        </Text>
                        <Text style={{ color: colors.gold.primary, fontWeight: 600 }}>
                          <CheckSquareOutlined /> {draftStats.granted} / {draftStats.total} permissions · {draftStats.modulesTouched} modules
                        </Text>
                        <Text style={{ color: colors.text.placeholder }}>
                          Created by {activeRole.createdBy}
                        </Text>
                      </Space>
                    </div>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    {!isLocked && (
                      <>
                        <Tooltip title={activeRole.isActive ? 'Disable role' : 'Enable role'}>
                          <Switch
                            checkedChildren={<UnlockOutlined />}
                            unCheckedChildren={<LockOutlined />}
                            checked={activeRole.isActive}
                            onChange={toggleActive}
                          />
                        </Tooltip>
                        <Button icon={<EditOutlined />} onClick={openEdit}>Edit</Button>
                        <Popconfirm
                          title={`Delete "${activeRole.name}"?`}
                          description={activeRole.members.length > 0
                            ? `${activeRole.members.length} members are still assigned. Reassign them first.`
                            : 'This action cannot be undone.'}
                          okText="Delete" okButtonProps={{ danger: true, disabled: activeRole.members.length > 0 }}
                          onConfirm={deleteRole}
                        >
                          <Button danger icon={<DeleteOutlined />}>Delete</Button>
                        </Popconfirm>
                      </>
                    )}
                  </Space>
                </Col>
              </Row>
              <Segmented<ViewTab>
                value={activeTab}
                onChange={(v) => setActiveTab(v as ViewTab)}
                options={[
                  { label: <span><SafetyCertificateOutlined /> Permissions</span>, value: 'permissions' },
                  { label: <span><TeamOutlined /> Members ({activeRole.members.length})</span>, value: 'members' },
                ]}
                style={{ marginTop: 16 }}
              />
            </div>

            {/* Body */}
            {activeTab === 'permissions' ? (
              <div style={{ padding: 20 }}>
                {dirty && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: `${colors.status.warning}1A`, border: `1px solid ${colors.status.warning}`,
                    color: colors.status.warning, marginBottom: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                  }}>
                    <Text strong style={{ color: colors.status.warning }}>
                      <EditOutlined /> Unsaved changes
                    </Text>
                    <Space>
                      <Button size="small" onClick={discardDraft}>Discard</Button>
                      <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveDraft}>Save Changes</Button>
                    </Space>
                  </div>
                )}

                {isLocked && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: `${colors.status.info}1A`, border: `1px solid ${colors.status.info}`,
                    color: colors.status.info, marginBottom: 16,
                  }}>
                    <Text style={{ color: colors.status.info }}>
                      <LockOutlined /> This is a system role. Its permissions can be viewed but not changed.
                    </Text>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 720, overflowY: 'auto', paddingRight: 4 }}>
                  {MODULE_GROUPS.map((group) => {
                    const groupTotal = group.modules.reduce((s, m) => s + m.permissions.length, 0);
                    const groupGranted = group.modules.reduce(
                      (s, m) => s + (draft[m.key]?.length ?? 0), 0,
                    );
                    return (
                      <div key={group.key} style={{
                        background: colors.black.primary, border: `1px solid ${colors.border}`, borderRadius: 8,
                      }}>
                        <div style={{
                          padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', flexWrap: 'wrap', gap: 8,
                          borderBottom: `1px solid ${colors.border}`,
                        }}>
                          <Space>
                            <Badge count={groupGranted} showZero
                              style={{
                                background: groupGranted === groupTotal ? colors.status.success
                                  : groupGranted > 0 ? colors.gold.primary : colors.text.placeholder,
                              }} />
                            <Text strong style={{ color: colors.text.primary, fontSize: 14 }}>{group.label}</Text>
                            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                              {groupGranted} / {groupTotal} permissions
                            </Text>
                          </Space>
                          {!isLocked && (
                            <Space size={6}>
                              <Button size="small" type="text" onClick={() => setGroupAll(group.key, 'all')}>Grant All</Button>
                              <Button size="small" type="text" onClick={() => setGroupAll(group.key, 'view-only')}>View only</Button>
                              <Button size="small" type="text" danger onClick={() => setGroupAll(group.key, 'none')}>Clear</Button>
                            </Space>
                          )}
                        </div>

                        {/* Module rows */}
                        <div>
                          {/* Header row showing permission columns */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(180px, 2.2fr) repeat(6, minmax(80px, 1fr))',
                            padding: '8px 16px', borderBottom: `1px solid ${colors.border}`,
                            background: colors.black.tertiary,
                          }}>
                            <Text style={{ color: colors.text.placeholder, fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                              Module
                            </Text>
                            {ALL_PERMISSIONS.map((p) => (
                              <Text key={p} style={{
                                color: colors.text.placeholder, fontSize: 11, fontWeight: 600,
                                letterSpacing: 0.3, textTransform: 'uppercase', textAlign: 'center',
                              }}>{PERMISSION_LABEL[p]}</Text>
                            ))}
                          </div>

                          {group.modules.map((module, idx) => {
                            const granted = draft[module.key] ?? [];
                            return (
                              <div
                                key={module.key}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'minmax(180px, 2.2fr) repeat(6, minmax(80px, 1fr))',
                                  padding: '10px 16px',
                                  borderBottom: idx === group.modules.length - 1 ? 'none' : `1px solid ${colors.border}`,
                                  alignItems: 'center',
                                }}
                              >
                                <div>
                                  <Text strong style={{ color: colors.text.primary, fontSize: 13 }}>{module.label}</Text>
                                  {granted.length === module.permissions.length && (
                                    <Tag style={{
                                      background: `${colors.status.success}1A`, color: colors.status.success,
                                      border: 'none', fontSize: 10, fontWeight: 600, margin: '0 0 0 6px',
                                    }}>Full</Tag>
                                  )}
                                </div>
                                {ALL_PERMISSIONS.map((p) => {
                                  const applicable = module.permissions.includes(p);
                                  const checked = applicable && granted.includes(p);
                                  return (
                                    <div key={p} style={{ textAlign: 'center' }}>
                                      {applicable ? (
                                        <Checkbox
                                          checked={checked}
                                          disabled={isLocked}
                                          onChange={() => togglePermission(module.key, p)}
                                        />
                                      ) : (
                                        <Text style={{ color: colors.text.placeholder, fontSize: 14 }}>—</Text>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isLocked && (
                  <div style={{
                    marginTop: 16, padding: 16, background: colors.black.primary,
                    border: `1px solid ${colors.border}`, borderRadius: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                  }}>
                    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                      Changes apply to every staff member assigned this role.
                    </Text>
                    <Space>
                      <Button onClick={discardDraft} disabled={!dirty}>Discard</Button>
                      <Button type="primary" icon={<SaveOutlined />} onClick={saveDraft} disabled={!dirty}>
                        Save Changes
                      </Button>
                    </Space>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: 20 }}>
                {activeRole.members.length === 0 ? (
                  <Empty description={`No staff are currently assigned the "${activeRole.name}" role`} />
                ) : (
                  <Table<RoleMember>
                    rowKey="key"
                    columns={memberColumns}
                    dataSource={activeRole.members}
                    pagination={false}
                    size="middle"
                    scroll={{ x: 880 }}
                  />
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Create role modal */}
      <Modal
        title="Create a new role"
        open={createOpen}
        onOk={onCreateRole}
        onCancel={() => setCreateOpen(false)}
        okText="Create Role"
        width={560}
        destroyOnClose
      >
        <Form<NewRoleForm> form={createForm} layout="vertical" preserve={false}>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="emoji" label="Icon" rules={[{ required: true }]}>
                <Select
                  options={['🎯', '🛡️', '📈', '🏢', '🏪', '📞', '🩺', '💆', '💰', '👥', '👁️', '⚙️', '🚀', '🧪'].map((e) => ({
                    value: e, label: <span style={{ fontSize: 18 }}>{e}</span>,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={18}>
              <Form.Item name="name" label="Role name"
                rules={[{ required: true, message: 'Required' }, { max: 50 }]}>
                <Input placeholder="e.g. Regional Manager" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description"
            rules={[{ required: true, message: 'Required' }, { max: 200 }]}>
            <Input.TextArea rows={2} placeholder="What can someone with this role do?" />
          </Form.Item>
          <Form.Item name="cloneFrom" label="Clone permissions from (optional)"
            extra="Speeds up creation — pick the closest existing role and tweak.">
            <Select allowClear showSearch optionFilterProp="label" placeholder="Start from a blank slate"
              options={roles.map((r) => ({ value: r.key, label: `${r.emoji}  ${r.name}` }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit role modal */}
      <Modal
        title={`Edit "${activeRole.name}"`}
        open={editOpen}
        onOk={onEditRole}
        onCancel={() => setEditOpen(false)}
        okText="Save"
        width={520}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="emoji" label="Icon" rules={[{ required: true }]}>
                <Select
                  options={['🎯', '🛡️', '📈', '🏢', '🏪', '📞', '🩺', '💆', '💰', '👥', '👁️', '⚙️', '🚀', '🧪'].map((e) => ({
                    value: e, label: <span style={{ fontSize: 18 }}>{e}</span>,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={18}>
              <Form.Item name="name" label="Role name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
