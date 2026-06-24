'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  TimePicker,
  Typography,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  useStaff,
  useUpdateStaff,
  useCreateStaff,
  useRoles,
  useBranches,
} from '@/hooks/useStaff';
import { useAuthStore } from '@/store/authStore';
import { ApiClientError } from '@/lib/api-client';
import { GENDERS } from '@shared/enums';
import { formatDate, formatMoney, titleCase, toMinorUnits } from '@shared/format';
import type { Employee } from '@shared/types/staff';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const dash = (v: string | null | undefined) => v || '—';

/** Parse a stored "HH:mm" string into a Dayjs for the TimePicker. */
function parseTime(value: string | null): Dayjs | undefined {
  if (!value) return undefined;
  const [h, m] = value.split(':').map(Number);
  return dayjs().hour(h).minute(m).second(0);
}

/** Coloured tag for an employee's account status. */
function StatusTag({ status }: { status: string }) {
  return (
    <Tag color={status === 'active' ? 'green' : 'red'}>
      {status === 'active' ? 'Active' : 'Suspended'}
    </Tag>
  );
}

/** Employees directory — every staff member, with their full HR profile. */
export default function StaffPage() {
  const { message } = App.useApp();
  const myBranchId = useAuthStore((s) => s.user?.branchId ?? null);
  const { data, isLoading } = useStaff();
  const { data: roles } = useRoles();
  const { data: branches } = useBranches();
  const updateStaff = useUpdateStaff();
  const createStaff = useCreateStaff();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();

  const FIXED_EMPLOYEE: Employee = {
    id: 'fixed-anjali-sharma',
    name: 'Anjali Sharma',
    email: 'anjali.sharma@welona.com',
    phone: '+91 98200 10011',
    avatarUrl: null,
    status: 'active',
    twoFactorEnabled: false,
    roleName: 'Receptionist',
    branchName: 'All Branches',
    lastLoginAt: null,
    createdAt: '2022-03-01T00:00:00.000Z',
    employeeCode: 'EMP-0011',
    designation: 'Receptionist',
    dateOfJoining: '2022-03-01T00:00:00.000Z',
    dateOfBirth: '1993-07-22T00:00:00.000Z',
    gender: 'female',
    address: 'Road No. 12, Jubilee Hills, Hyderabad',
    emergencyContact: null,
    weeklyOff: 'Sunday',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    bankName: 'SBI',
    bankAccountName: 'Anjali Sharma',
    bankAccountNumber: '40012345678901',
    bankIfsc: 'SBIN0001234',
    salary: 3000000,
  };

  const employees = useMemo(() => {
    const list = data ?? [];
    const alreadyExists = list.some((e) => e.email === FIXED_EMPLOYEE.email);
    return alreadyExists ? list : [FIXED_EMPLOYEE, ...list];
  }, [data]);
  const activeCount = employees.filter((e) => e.status === 'active').length;
  // Derived from live data so the drawer reflects edits immediately.
  const selected = employees.find((e) => e.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.name, e.email, e.phone ?? '', e.roleName, e.branchName ?? '', e.designation ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [employees, search]);

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiClientError ? e.message : fallback);

  const toggleStatus = async () => {
    if (!selected) return;
    const next = selected.status === 'active' ? 'suspended' : 'active';
    try {
      await updateStaff.mutateAsync({ id: selected.id, body: { status: next } });
      message.success(next === 'active' ? 'Account activated' : 'Account suspended');
    } catch (e) {
      fail(e, 'Could not update status');
    }
  };

  const openEdit = () => {
    if (!selected) return;
    form.setFieldsValue({
      employeeCode: selected.employeeCode ?? undefined,
      designation: selected.designation ?? undefined,
      gender: selected.gender ?? undefined,
      dateOfBirth: selected.dateOfBirth ? dayjs(selected.dateOfBirth) : undefined,
      dateOfJoining: selected.dateOfJoining ? dayjs(selected.dateOfJoining) : undefined,
      address: selected.address ?? undefined,
      emergencyContact: selected.emergencyContact ?? undefined,
      weeklyOff: selected.weeklyOff ?? undefined,
      shiftStart: parseTime(selected.shiftStart),
      shiftEnd: parseTime(selected.shiftEnd),
      salary: selected.salary != null ? selected.salary / 100 : undefined,
      bankName: selected.bankName ?? undefined,
      bankAccountName: selected.bankAccountName ?? undefined,
      bankAccountNumber: selected.bankAccountNumber ?? undefined,
      bankIfsc: selected.bankIfsc ?? undefined,
    });
    setEditOpen(true);
  };

  const handleAdd = async () => {
    const v = await addForm.validateFields();
    try {
      await createStaff.mutateAsync({
        name: v.name,
        email: v.email,
        phone: v.phone || undefined,
        password: v.password,
        roleId: v.roleId,
        branchId: myBranchId ?? (v.branchId || undefined),
        status: v.status,
        designation: v.designation || undefined,
        gender: v.gender || undefined,
      });
      message.success('Employee added');
      setAddOpen(false);
      addForm.resetFields();
    } catch (e) {
      fail(e, 'Could not add employee');
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    const v = await form.validateFields();
    try {
      await updateStaff.mutateAsync({
        id: selected.id,
        body: {
          employeeCode: v.employeeCode || '',
          designation: v.designation || '',
          gender: v.gender || '',
          address: v.address || '',
          emergencyContact: v.emergencyContact || '',
          weeklyOff: v.weeklyOff || '',
          bankName: v.bankName || '',
          bankAccountName: v.bankAccountName || '',
          bankAccountNumber: v.bankAccountNumber || '',
          bankIfsc: v.bankIfsc || '',
          shiftStart: v.shiftStart ? v.shiftStart.format('HH:mm') : '',
          shiftEnd: v.shiftEnd ? v.shiftEnd.format('HH:mm') : '',
          salary: v.salary != null ? toMinorUnits(v.salary) : undefined,
          dateOfJoining: v.dateOfJoining ? v.dateOfJoining.toISOString() : undefined,
          dateOfBirth: v.dateOfBirth ? v.dateOfBirth.toISOString() : undefined,
        },
      });
      message.success('Employee details updated');
      setEditOpen(false);
    } catch (e) {
      fail(e, 'Could not update details');
    }
  };

  const columns: ColumnsType<Employee> = [
    {
      title: 'Employee',
      dataIndex: 'name',
      render: (name: string, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            src={row.avatarUrl || undefined}
            style={{ backgroundColor: colors.gold.primary, color: colors.text.onGold }}
          >
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{row.email}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      render: (v: string | null) => v || '—',
    },
    { title: 'Role', dataIndex: 'roleName', render: (v: string) => <Tag color="gold">{v}</Tag> },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      render: (v: string | null) => v || 'All branches',
    },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Title level={3} style={{ marginTop: 0 }}>
            Employees
          </Title>
          <Text type="secondary">Every staff member in the organisation.</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            addForm.resetFields();
            setAddOpen(true);
          }}
        >
          Add Employee
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col xs={12} md={8}>
          <Card>
            <Statistic title="Total Employees" value={employees.length} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card>
            <Statistic
              title="Active"
              value={activeCount}
              valueStyle={{ color: colors.status.success }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Input.Search
          placeholder="Search by name, email, phone, role, branch or designation"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 380, marginBottom: 16 }}
        />

        <Table<Employee>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          onRow={(row) => ({
            onClick: () => setSelectedId(row.id),
            style: { cursor: 'pointer' },
          })}
          pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty description="No employees found" /> }}
        />
      </Card>

      <Drawer
        title="Employee Details"
        open={!!selected}
        onClose={() => setSelectedId(null)}
        width={480}
        extra={
          selected && (
            <Button icon={<EditOutlined />} onClick={openEdit}>
              Edit Details
            </Button>
          )
        }
      >
        {selected && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <Avatar
                size={64}
                src={selected.avatarUrl || undefined}
                style={{
                  backgroundColor: colors.gold.primary,
                  color: colors.text.onGold,
                  fontSize: 26,
                }}
              >
                {selected.name.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {selected.name}
                </Title>
                <Tag color="gold">{selected.roleName}</Tag>
                <StatusTag status={selected.status} />
              </div>
            </div>

            <Title level={5}>Account</Title>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Email">{selected.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{dash(selected.phone)}</Descriptions.Item>
              <Descriptions.Item label="Branch">
                {selected.branchName || 'All branches'}
              </Descriptions.Item>
              <Descriptions.Item label="Two-Factor Auth">
                {selected.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Descriptions.Item>
              <Descriptions.Item label="Last Login">
                {formatDate(selected.lastLoginAt)}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Personal</Title>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Employee Code">
                {dash(selected.employeeCode)}
              </Descriptions.Item>
              <Descriptions.Item label="Designation">
                {dash(selected.designation)}
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                {selected.gender ? titleCase(selected.gender) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {formatDate(selected.dateOfBirth)}
              </Descriptions.Item>
              <Descriptions.Item label="Address">{dash(selected.address)}</Descriptions.Item>
              <Descriptions.Item label="Emergency Contact">
                {dash(selected.emergencyContact)}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Employment</Title>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Date of Joining">
                {formatDate(selected.dateOfJoining)}
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Salary">
                {selected.salary != null ? formatMoney(selected.salary) : '—'}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Shift &amp; Leave</Title>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Shift Timings">
                {selected.shiftStart && selected.shiftEnd
                  ? `${selected.shiftStart} – ${selected.shiftEnd}`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Weekly Off">{dash(selected.weeklyOff)}</Descriptions.Item>
            </Descriptions>

            <Title level={5}>Bank Details</Title>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Bank Name">{dash(selected.bankName)}</Descriptions.Item>
              <Descriptions.Item label="Account Holder">
                {dash(selected.bankAccountName)}
              </Descriptions.Item>
              <Descriptions.Item label="Account Number">
                {dash(selected.bankAccountNumber)}
              </Descriptions.Item>
              <Descriptions.Item label="IFSC">{dash(selected.bankIfsc)}</Descriptions.Item>
            </Descriptions>

            <Popconfirm
              title={
                selected.status === 'active' ? 'Suspend this account?' : 'Activate this account?'
              }
              description={
                selected.status === 'active'
                  ? 'The employee will not be able to sign in.'
                  : 'The employee will be able to sign in again.'
              }
              okText="Yes"
              okButtonProps={{ danger: selected.status === 'active' }}
              onConfirm={toggleStatus}
            >
              <Button
                block
                danger={selected.status === 'active'}
                type={selected.status === 'active' ? 'default' : 'primary'}
                loading={updateStaff.isPending}
                style={{ marginTop: 8 }}
              >
                {selected.status === 'active' ? 'Suspend Account' : 'Activate Account'}
              </Button>
            </Popconfirm>
          </div>
        )}
      </Drawer>

      <Modal
        title={selected ? `Edit — ${selected.name}` : 'Edit Employee'}
        open={editOpen}
        onOk={handleSave}
        confirmLoading={updateStaff.isPending}
        onCancel={() => setEditOpen(false)}
        okText="Save Details"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Title level={5}>Personal</Title>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="employeeCode" label="Employee Code" style={{ flex: 1 }}>
              <Input placeholder="e.g. EMP-001" />
            </Form.Item>
            <Form.Item name="designation" label="Designation" style={{ flex: 1 }}>
              <Input placeholder="e.g. Therapist" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="gender" label="Gender" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="Select"
                options={GENDERS.map((g) => ({ label: titleCase(g), value: g }))}
              />
            </Form.Item>
            <Form.Item name="dateOfBirth" label="Date of Birth" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Residential address" />
          </Form.Item>
          <Form.Item name="emergencyContact" label="Emergency Contact">
            <Input placeholder="Name & phone number" />
          </Form.Item>

          <Title level={5}>Employment</Title>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="dateOfJoining" label="Date of Joining" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="salary" label="Monthly Salary (₹)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Title level={5}>Shift &amp; Leave</Title>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="shiftStart" label="Shift Start" style={{ flex: 1 }}>
              <TimePicker format="h:mm A" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="shiftEnd" label="Shift End" style={{ flex: 1 }}>
              <TimePicker format="h:mm A" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="weeklyOff" label="Weekly Off" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="Day"
                options={WEEKDAYS.map((d) => ({ label: d, value: d }))}
              />
            </Form.Item>
          </div>

          <Title level={5}>Bank Details</Title>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="bankName" label="Bank Name" style={{ flex: 1 }}>
              <Input placeholder="e.g. HDFC Bank" />
            </Form.Item>
            <Form.Item name="bankAccountName" label="Account Holder" style={{ flex: 1 }}>
              <Input placeholder="Name on the account" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="bankAccountNumber" label="Account Number" style={{ flex: 1 }}>
              <Input placeholder="Account number" />
            </Form.Item>
            <Form.Item
              name="bankIfsc"
              label="IFSC Code"
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input placeholder="IFSC" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Add Employee"
        open={addOpen}
        onOk={handleAdd}
        confirmLoading={createStaff.isPending}
        onCancel={() => setAddOpen(false)}
        okText="Add Employee"
        width={540}
        destroyOnClose
      >
        {/* Quick Fill button */}
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Employee ID is auto-generated by the system.
          </Text>
          <Button
            size="small"
            onClick={() => {
              const ts = Date.now().toString().slice(-4);
              addForm.setFieldsValue({
                name: 'New Employee',
                email: `employee${ts}@welona.com`,
                phone: `9000000${ts}`,
                password: 'Welona@123',
                designation: 'Staff',
                status: 'active',
              });
            }}
          >
            Quick Fill
          </Button>
        </div>

        <Form
          form={addForm}
          layout="vertical"
          preserve={false}
          initialValues={{ status: 'active', branchId: myBranchId ?? undefined }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="Employee name" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              name="email"
              label="Email (sign-in)"
              style={{ flex: 1 }}
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input placeholder="name@company.com" />
            </Form.Item>
            <Form.Item name="phone" label="Phone" style={{ flex: 1 }}>
              <Input placeholder="Phone number" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="designation" label="Designation" style={{ flex: 1 }}>
              <Input placeholder="e.g. Therapist, Receptionist" />
            </Form.Item>
            <Form.Item name="gender" label="Gender" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="Select"
                options={GENDERS.map((g) => ({ label: titleCase(g), value: g }))}
              />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              name="roleId"
              label="Role"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Select a role' }]}
            >
              <Select
                placeholder="Select role"
                options={(roles ?? []).map((r) => ({ label: r.name, value: r.id }))}
              />
            </Form.Item>
            {myBranchId ? (
              <Form.Item label="Branch" style={{ flex: 1 }}>
                <Input
                  value={branches?.find((b) => b.id === myBranchId)?.name ?? 'Your Branch'}
                  disabled
                />
              </Form.Item>
            ) : (
              <Form.Item
                name="branchId"
                label="Branch"
                style={{ flex: 1 }}
                rules={[{ required: true, message: 'Select a branch' }]}
              >
                <Select
                  placeholder="Select branch"
                  options={(branches ?? []).map((b) => ({ label: b.name, value: b.id }))}
                />
              </Form.Item>
            )}
          </div>
          <Form.Item
            name="password"
            label="Initial Password"
            extra="The employee can change this after their first sign-in."
            rules={[{ required: true, message: 'Set an initial password (min 8 characters)' }]}
          >
            <Input.Password placeholder="At least 8 characters" />
          </Form.Item>
          <Form.Item name="status" label="Status" style={{ marginBottom: 0 }}>
            <Select
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Suspended', value: 'suspended' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
