'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
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
  Tabs,
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
  useAdminEmployees,
  useCreateAdminEmployee,
  useDeleteAdminEmployee,
  useUpdateAdminEmployee,
} from '@/hooks/useAdminEmployees';
import { useAdminDesignations } from '@/hooks/useAdminDesignations';
import { useAdminDepartments } from '@/hooks/useAdminDepartments';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useZones } from '@/hooks/useZones';
import { useBrandColors } from '@/hooks/useBrandColors';
import { ApiClientError } from '@/lib/api-client';
import { getAdminNavItem } from '@/config/adminNavigation';
import type { AdminEmployee } from '@shared/types/admin-employee';
import {
  WEEKLY_OFF_OPTIONS,
  CALLER_TYPE_OPTIONS,
  type AdminEmployeeCreateInput,
} from '@shared/schemas/admin-employees';
import BulkUploadButton, { type BulkColumn } from '@/components/common/BulkUploadButton';

const { Title, Text } = Typography;

const EMPLOYEE_BULK_COLUMNS: BulkColumn[] = [
  // Personal
  { header: 'Name',           key: 'name',         required: true,  type: 'string', hint: 'e.g. Rohit Sharma' },
  { header: 'Employee Code',  key: 'employeeCode', required: true,  type: 'string', hint: 'Unique, e.g. EMP-0001' },
  { header: 'Mobile',         key: 'mobileNo',     required: true,  type: 'phone' },
  { header: 'Father Name',    key: 'fatherName',   required: false, type: 'string' },
  { header: 'Gender',         key: 'gender',       required: false, type: 'enum',
    enumOptions: ['male', 'female', 'other'], hint: 'male / female / other' },
  { header: 'DOB',            key: 'dob',          required: false, type: 'date',  hint: 'DD-MM-YYYY' },
  { header: 'Email',          key: 'email',        required: false, type: 'email' },
  { header: 'PAN',            key: 'panNo',        required: false, type: 'string' },
  { header: 'Pincode',        key: 'pincode',      required: false, type: 'string' },
  { header: 'Address',        key: 'address',      required: false, type: 'string' },
  // Official
  { header: 'Joining Date',   key: 'joiningDate',  required: true,  type: 'date',  hint: 'DD-MM-YYYY' },
  { header: 'Designation',    key: '_designation', required: false, type: 'string', hint: 'Existing designation name' },
  { header: 'Department',     key: '_department',  required: false, type: 'string', hint: 'Existing department name' },
  { header: 'Branch Code',    key: '_branchCode',  required: false, type: 'string', hint: 'Existing branch code, e.g. JH001' },
  { header: 'Salary (₹)',     key: 'salary',       required: false, type: 'number',
    transform: (v) => Math.round(Number(v) * 100) },
  { header: 'Bank Name',      key: 'bankName',     required: false, type: 'string' },
  { header: 'Bank Account',   key: 'bankAccountNo',required: false, type: 'string' },
  { header: 'PF',             key: 'pf',           required: false, type: 'boolean', hint: 'Yes/No' },
  { header: 'ESI',            key: 'esi',          required: false, type: 'boolean', hint: 'Yes/No' },
  { header: 'Weekly Off',     key: 'weeklyOff',    required: false, type: 'enum',
    enumOptions: [...WEEKLY_OFF_OPTIONS] },
  { header: 'Caller Type',    key: 'callerType',   required: false, type: 'enum',
    enumOptions: [...CALLER_TYPE_OPTIONS] },
];
const EMPLOYEE_BULK_SAMPLES = [
  { name: 'Rohit Sharma', employeeCode: 'EMP-0001', mobileNo: '+91 98100 10001',
    fatherName: 'Anil Sharma', gender: 'male', dob: '12-04-1986', email: 'rohit.sharma@welona.com',
    panNo: 'ABCPS1234A', pincode: '500033', address: 'Road No. 36, Jubilee Hills',
    joiningDate: '15-06-2020', _designation: 'Sr Branch Manager', _department: 'Operations', _branchCode: 'JH001',
    salary: '95000', bankName: 'HDFC Bank', bankAccountNo: '50100123456789',
    pf: 'Yes', esi: 'No', weeklyOff: 'Sunday', callerType: 'None' },
];

interface EmployeeFormValues {
  // Personal
  name: string;
  biometricId?: string;
  fatherName?: string;
  gender?: 'male' | 'female' | 'other';
  dob?: Dayjs;
  mobileNo: string;
  mobileAlternate?: string;
  email?: string;
  panNo?: string;
  pincode?: string;
  address?: string;
  // Official
  employeeCode: string;
  designationId?: string;
  departmentId?: string;
  branchId?: string;
  zoneId?: string;
  joiningDate: Dayjs;
  relievingDate?: Dayjs;
  salaryRupees: number;
  bankName?: string;
  bankAccountNo?: string;
  callerType?: string;
  pf: boolean;
  esi: boolean;
  // Shift
  weeklyOff?: string;
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

function formatDateDmy(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getFullYear()}`;
}

export default function AdminHrEmployeePage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('hr-employee')!;
  const { message } = App.useApp();

  // --- Table state ---
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading } = useAdminEmployees({
    search: search || undefined,
    page,
    limit,
  });

  // --- Reference data (live from masters) ---
  const { data: designationsData } = useAdminDesignations({ limit: 200 });
  const { data: departmentsData } = useAdminDepartments({ limit: 200 });
  const { data: branchesData } = useAdminBranches({ limit: 200 });
  const { data: zonesData } = useZones({ limit: 100 });

  const designationOptions = useMemo(
    () =>
      (designationsData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
    [designationsData],
  );
  const departmentOptions = useMemo(
    () => (departmentsData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
    [departmentsData],
  );
  const branchOptions = useMemo(
    () =>
      (branchesData?.items ?? []).map((b) => ({
        value: b.id,
        label: `${b.branchName} (${b.branchCode})`,
      })),
    [branchesData],
  );
  const zoneOptions = useMemo(
    () =>
      (zonesData?.items ?? []).map((z) => ({
        value: z.id,
        label: `${z.country} — ${z.stateName}`,
      })),
    [zonesData],
  );

  // --- Modal state ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminEmployee | null>(null);
  const [form] = Form.useForm<EmployeeFormValues>();

  const create = useCreateAdminEmployee();
  const update = useUpdateAdminEmployee();
  const remove = useDeleteAdminEmployee();

  const fail = (err: unknown, fallback: string) => {
    message.error(err instanceof ApiClientError ? err.message : fallback);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      pf: false,
      esi: false,
      salaryRupees: 0,
      joiningDate: dayjs(),
    });
    setModalOpen(true);
  };

  const openEdit = (row: AdminEmployee) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      biometricId: row.biometricId ?? undefined,
      fatherName: row.fatherName ?? undefined,
      gender: (row.gender ?? undefined) as EmployeeFormValues['gender'],
      dob: row.dob ? dayjs(row.dob) : undefined,
      mobileNo: row.mobileNo,
      mobileAlternate: row.mobileAlternate ?? undefined,
      email: row.email ?? undefined,
      panNo: row.panNo ?? undefined,
      pincode: row.pincode ?? undefined,
      address: row.address ?? undefined,
      employeeCode: row.employeeCode,
      designationId: row.designation?.id,
      departmentId: row.department?.id,
      branchId: row.branch?.id,
      zoneId: row.zone?.id,
      joiningDate: dayjs(row.joiningDate),
      relievingDate: row.relievingDate ? dayjs(row.relievingDate) : undefined,
      salaryRupees: paiseToRupees(row.salary),
      bankName: row.bankName ?? undefined,
      bankAccountNo: row.bankAccountNo ?? undefined,
      callerType: row.callerType ?? undefined,
      pf: row.pf,
      esi: row.esi,
      weeklyOff: row.weeklyOff ?? undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = async () => {
    let values: EmployeeFormValues;
    try {
      values = await form.validateFields();
    } catch {
      message.error('Fix the highlighted fields and try again.');
      return;
    }
    const body: AdminEmployeeCreateInput = {
      name: values.name.trim(),
      biometricId: values.biometricId?.trim() || undefined,
      fatherName: values.fatherName?.trim() || undefined,
      gender: values.gender,
      dob: values.dob ? values.dob.toISOString() : undefined,
      mobileNo: values.mobileNo.trim(),
      mobileAlternate: values.mobileAlternate?.trim() || undefined,
      email: values.email?.trim() || undefined,
      panNo: values.panNo?.trim() || undefined,
      pincode: values.pincode?.trim() || undefined,
      address: values.address?.trim() || undefined,
      employeeCode: values.employeeCode.trim(),
      designationId: values.designationId,
      departmentId: values.departmentId,
      branchId: values.branchId,
      zoneId: values.zoneId,
      joiningDate: values.joiningDate.toISOString(),
      relievingDate: values.relievingDate
        ? values.relievingDate.toISOString()
        : undefined,
      salary: rupeesToPaise(values.salaryRupees),
      bankName: values.bankName?.trim() || undefined,
      bankAccountNo: values.bankAccountNo?.trim() || undefined,
      callerType: values.callerType?.trim() || undefined,
      pf: values.pf,
      esi: values.esi,
      weeklyOff: values.weeklyOff?.trim() || undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        message.success('Employee updated');
      } else {
        await create.mutateAsync(body);
        message.success('Employee added');
      }
      setModalOpen(false);
    } catch (err) {
      fail(err, 'Save failed.');
    }
  };

  const onDelete = async (row: AdminEmployee) => {
    try {
      await remove.mutateAsync(row.id);
      message.success('Employee deleted');
    } catch (err) {
      fail(err, 'Delete failed.');
    }
  };

  const emptyCell = (
    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>—</Text>
  );

  const textCell = (value: string | null | undefined) =>
    value ? <span style={{ color: colors.text.primary }}>{value}</span> : emptyCell;

  const columns: ColumnsType<AdminEmployee> = useMemo(
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
      {
        title: 'Employee Name',
        dataIndex: 'name',
        width: 180,
        fixed: 'left',
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (value: string) => (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>{value}</span>
        ),
      },
      {
        title: 'Biometric Id',
        dataIndex: 'biometricId',
        width: 130,
        render: textCell,
      },
      { title: 'Father Name', dataIndex: 'fatherName', width: 160, render: textCell },
      { title: 'Gender', dataIndex: 'gender', width: 100, render: textCell },
      {
        title: 'DOB',
        dataIndex: 'dob',
        width: 120,
        render: (value: string | null) => textCell(formatDateDmy(value)),
      },
      {
        title: 'Zone Name',
        dataIndex: ['zone', 'stateName'],
        key: 'zoneName',
        width: 140,
        render: (_: unknown, row) => textCell(row.zone?.stateName),
      },
      { title: 'Mobile No', dataIndex: 'mobileNo', width: 140, render: textCell },
      {
        title: 'Mobile Alternate',
        dataIndex: 'mobileAlternate',
        width: 150,
        render: textCell,
      },
      { title: 'EmailId', dataIndex: 'email', width: 200, render: textCell },
      {
        title: 'PAN No',
        dataIndex: 'panNo',
        width: 130,
        render: (v: string | null) =>
          v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : emptyCell,
      },
      { title: 'Pincode', dataIndex: 'pincode', width: 100, render: textCell },
      { title: 'Address', dataIndex: 'address', width: 240, render: textCell },
      {
        title: 'Employee Code',
        dataIndex: 'employeeCode',
        width: 140,
        render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
      },
      {
        title: 'Designation',
        dataIndex: ['designation', 'name'],
        key: 'designation',
        width: 160,
        render: (_: unknown, row) => textCell(row.designation?.name),
      },
      {
        title: 'Department',
        dataIndex: ['department', 'name'],
        key: 'department',
        width: 150,
        render: (_: unknown, row) => textCell(row.department?.name),
      },
      {
        title: 'Joining Date',
        dataIndex: 'joiningDate',
        width: 130,
        sorter: (a, b) =>
          new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime(),
        render: (v: string) => textCell(formatDateDmy(v)),
      },
      {
        title: 'Branch Name',
        dataIndex: ['branch', 'name'],
        key: 'branchName',
        width: 170,
        render: (_: unknown, row) => textCell(row.branch?.name),
      },
      {
        title: 'Salary',
        dataIndex: 'salary',
        width: 130,
        align: 'right',
        sorter: (a, b) => a.salary - b.salary,
        render: (v: number) => (
          <span style={{ color: colors.text.primary }}>{inr(v)}</span>
        ),
      },
      { title: 'BankName', dataIndex: 'bankName', width: 160, render: textCell },
      {
        title: 'Bank Account No',
        dataIndex: 'bankAccountNo',
        width: 160,
        render: textCell,
      },
      { title: 'Caller Type', dataIndex: 'callerType', width: 140, render: textCell },
      {
        title: 'PF',
        dataIndex: 'pf',
        width: 70,
        align: 'center',
        render: (v: boolean) => (v ? 'Yes' : 'No'),
      },
      {
        title: 'ESI',
        dataIndex: 'esi',
        width: 70,
        align: 'center',
        render: (v: boolean) => (v ? 'Yes' : 'No'),
      },
      { title: 'WeeklyOff', dataIndex: 'weeklyOff', width: 110, render: textCell },
      {
        title: 'Releaving Date',
        dataIndex: 'relievingDate',
        width: 140,
        render: (v: string | null) => textCell(formatDateDmy(v)),
      },
      {
        title: 'IP Address',
        dataIndex: 'ipAddress',
        width: 140,
        render: (v: string | null) =>
          v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : emptyCell,
      },
      {
        title: 'CreatedBy',
        dataIndex: ['createdBy', 'name'],
        key: 'createdBy',
        width: 150,
        render: (_: unknown, row) => textCell(row.createdBy?.name),
      },
      {
        title: 'Created Date',
        dataIndex: 'createdAt',
        width: 140,
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (v: string) => textCell(formatDateDmy(v)),
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

  // --- Modal form tabs ---
  const personalTab = (
    <Row gutter={12}>
      <Col span={12}>
        <Form.Item
          label="Employee Name"
          name="name"
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input maxLength={160} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Biometric Id" name="biometricId">
          <Input maxLength={60} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Father Name" name="fatherName">
          <Input maxLength={120} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="Gender" name="gender">
          <Select
            allowClear
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="DOB" name="dob">
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="Mobile No"
          name="mobileNo"
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input maxLength={40} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Mobile Alternate" name="mobileAlternate">
          <Input maxLength={40} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="Email"
          name="email"
          rules={[{ type: 'email', message: 'Invalid email' }]}
        >
          <Input maxLength={120} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="PAN No" name="panNo">
          <Input maxLength={20} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="Pincode" name="pincode">
          <Input maxLength={12} />
        </Form.Item>
      </Col>
      <Col span={18}>
        <Form.Item label="Address" name="address">
          <Input.TextArea rows={2} maxLength={400} />
        </Form.Item>
      </Col>
    </Row>
  );

  const officialTab = (
    <Row gutter={12}>
      <Col span={12}>
        <Form.Item
          label="Employee Code"
          name="employeeCode"
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input maxLength={40} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="Joining Date"
          name="joiningDate"
          rules={[{ required: true, message: 'Required' }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Designation" name="designationId">
          <Select
            showSearch
            allowClear
            placeholder="Pick from master"
            options={designationOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Department" name="departmentId">
          <Select
            showSearch
            allowClear
            placeholder="Pick from master"
            options={departmentOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Branch" name="branchId">
          <Select
            showSearch
            allowClear
            placeholder="Pick from master"
            options={branchOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Zone" name="zoneId">
          <Select
            showSearch
            allowClear
            placeholder="Pick from master"
            options={zoneOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="Salary (₹)" name="salaryRupees">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="Bank Name" name="bankName">
          <Input maxLength={120} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="Bank Account No" name="bankAccountNo">
          <Input maxLength={40} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="Caller Type" name="callerType">
          <Select
            allowClear
            options={CALLER_TYPE_OPTIONS.map((c) => ({ value: c, label: c }))}
          />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item label="PF" name="pf" valuePropName="checked">
          <Switch checkedChildren="Yes" unCheckedChildren="No" />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item label="ESI" name="esi" valuePropName="checked">
          <Switch checkedChildren="Yes" unCheckedChildren="No" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="Relieving Date" name="relievingDate">
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>
  );

  const shiftTab = (
    <Row gutter={12}>
      <Col span={12}>
        <Form.Item label="Weekly Off" name="weeklyOff">
          <Select
            allowClear
            placeholder="Pick a day"
            options={WEEKLY_OFF_OPTIONS.map((d) => ({ value: d, label: d }))}
          />
        </Form.Item>
      </Col>
    </Row>
  );

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
            List of Employees
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Space>
          <BulkUploadButton
            entityName="Employees"
            entityPlural="employees"
            columns={EMPLOYEE_BULK_COLUMNS}
            sampleRows={EMPLOYEE_BULK_SAMPLES}
            onImport={async (row) => {
              const desigName = String(row._designation ?? '').toLowerCase();
              const deptName = String(row._department ?? '').toLowerCase();
              const branchCode = String(row._branchCode ?? '').toLowerCase();
              const designation = desigName
                ? (designationsData?.items ?? []).find((d) => d.name.toLowerCase() === desigName)
                : undefined;
              const department = deptName
                ? (departmentsData?.items ?? []).find((d) => d.name.toLowerCase() === deptName)
                : undefined;
              const branch = branchCode
                ? (branchesData?.items ?? []).find((b) => b.branchCode.toLowerCase() === branchCode)
                : undefined;
              if (row._designation && !designation) throw new Error(`Designation "${row._designation}" not found`);
              if (row._department && !department) throw new Error(`Department "${row._department}" not found`);
              if (row._branchCode && !branch) throw new Error(`Branch code "${row._branchCode}" not found`);
              const body: AdminEmployeeCreateInput = {
                name: String(row.name).trim(),
                employeeCode: String(row.employeeCode).trim(),
                mobileNo: String(row.mobileNo).trim(),
                fatherName: row.fatherName ? String(row.fatherName) : undefined,
                gender: row.gender as 'male' | 'female' | 'other' | undefined,
                dob: row.dob ? new Date(String(row.dob)).toISOString() : undefined,
                email: row.email ? String(row.email) : undefined,
                panNo: row.panNo ? String(row.panNo) : undefined,
                pincode: row.pincode ? String(row.pincode) : undefined,
                address: row.address ? String(row.address) : undefined,
                joiningDate: new Date(String(row.joiningDate)).toISOString(),
                designationId: designation?.id,
                departmentId: department?.id,
                branchId: branch?.id,
                salary: row.salary !== undefined ? Number(row.salary) : 0,
                bankName: row.bankName ? String(row.bankName) : undefined,
                bankAccountNo: row.bankAccountNo ? String(row.bankAccountNo) : undefined,
                pf: row.pf === true,
                esi: row.esi === true,
                weeklyOff: row.weeklyOff ? String(row.weeklyOff) : undefined,
                callerType: row.callerType ? String(row.callerType) : undefined,
              };
              await create.mutateAsync(body);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Employee
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
          placeholder="Search name, employee code, mobile, email, PAN or biometric ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 480, marginBottom: 12 }}
        />

        <Table<AdminEmployee>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={pagination}
          size="middle"
          scroll={{ x: 3600 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Employee' : 'Add Employee'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText={editing ? 'Save Changes' : 'Add Employee'}
        confirmLoading={create.isPending || update.isPending}
        width={920}
        destroyOnClose
      >
        <Form<EmployeeFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          preserve={false}
        >
          <Tabs
            defaultActiveKey="personal"
            items={[
              { key: 'personal', label: 'Personal Details', children: personalTab },
              { key: 'official', label: 'Official Details', children: officialTab },
              { key: 'shift', label: 'Shift Details', children: shiftTab },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
}
