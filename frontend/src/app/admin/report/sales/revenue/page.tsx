'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  FilterOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  ScissorOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  WalletOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { useAdminRevenue, type DoctorRevenue, type ServiceRevenue } from '@/hooks/useAdminRevenue';
import { useBrandColors } from '@/hooks/useBrandColors';
import { getAdminNavItem } from '@/config/adminNavigation';
import { formatMoney } from '@shared/format';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function AdminRevenueReportPage() {
  const colors = useBrandColors();
  const navItem = getAdminNavItem('report-sales-revenue')!;

  const now = dayjs();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    now.startOf('month'),
    now.endOf('month'),
  ]);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  const { data: branchesData, isLoading: branchesLoading } = useAdminBranches({ limit: 200 });
  const branchOptions = useMemo(
    () =>
      (branchesData?.items ?? []).map((b) => ({
        value: b.id,
        label: `${b.branchName} (${b.branchCode})`,
      })),
    [branchesData],
  );

  const { data, isLoading, refetch } = useAdminRevenue({
    from: dateRange[0].startOf('day').toISOString(),
    to: dateRange[1].endOf('day').toISOString(),
    branchId,
  });

  const summary = data?.summary;
  const doctors = data?.doctors ?? [];
  const services = data?.services ?? [];

  const top5Doctors = doctors.slice(0, 5);
  const top5Services = services.slice(0, 5);

  const moneyCell = (v: number) => (
    <span style={{ color: v > 0 ? colors.text.primary : colors.text.placeholder }}>
      {v > 0 ? formatMoney(v) : '—'}
    </span>
  );

  const collectedCell = (v: number) => (
    <span style={{ color: v > 0 ? colors.status.success : colors.text.placeholder, fontWeight: 600 }}>
      {v > 0 ? formatMoney(v) : '—'}
    </span>
  );

  const outstandingCell = (v: number) => (
    <span style={{ color: v > 0 ? colors.status.error : colors.text.placeholder }}>
      {v > 0 ? formatMoney(v) : '—'}
    </span>
  );

  const doctorColumns: ColumnsType<DoctorRevenue> = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_v, _r, idx) => (
        <Text style={{ color: idx < 3 ? colors.gold.primary : colors.text.placeholder }}>
          {idx + 1}
        </Text>
      ),
    },
    {
      title: 'Doctor',
      key: 'name',
      render: (_v, r) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{r.name}</div>
          {r.designation && (
            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{r.designation}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Billed',
      dataIndex: 'totalRevenue',
      width: 130,
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
      render: moneyCell,
    },
    {
      title: 'Collected',
      dataIndex: 'totalCollected',
      width: 130,
      sorter: (a, b) => a.totalCollected - b.totalCollected,
      defaultSortOrder: 'descend',
      render: (v: number) => collectedCell(v),
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding',
      width: 130,
      sorter: (a, b) => a.outstanding - b.outstanding,
      render: (v: number) => outstandingCell(v),
    },
    {
      title: 'Appts',
      dataIndex: 'appointmentCount',
      width: 80,
      align: 'center',
      sorter: (a, b) => a.appointmentCount - b.appointmentCount,
    },
    {
      title: 'Customers',
      dataIndex: 'uniqueCustomers',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.uniqueCustomers - b.uniqueCustomers,
    },
    {
      title: 'Avg Billed / Appt',
      dataIndex: 'avgRevenuePerAppointment',
      width: 140,
      sorter: (a, b) => a.avgRevenuePerAppointment - b.avgRevenuePerAppointment,
      render: moneyCell,
    },
  ];

  const serviceColumns: ColumnsType<ServiceRevenue> = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_v, _r, idx) => (
        <Text style={{ color: idx < 3 ? colors.gold.primary : colors.text.placeholder }}>
          {idx + 1}
        </Text>
      ),
    },
    {
      title: 'Service',
      key: 'name',
      render: (_v, r) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{r.serviceName}</div>
          {r.category && (
            <Tag style={{ marginTop: 2, fontSize: 11 }}>{r.category}</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Billed',
      dataIndex: 'totalRevenue',
      width: 130,
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
      render: moneyCell,
    },
    {
      title: 'Collected',
      dataIndex: 'totalCollected',
      width: 130,
      sorter: (a, b) => a.totalCollected - b.totalCollected,
      defaultSortOrder: 'descend',
      render: (v: number) => collectedCell(v),
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding',
      width: 130,
      sorter: (a, b) => a.outstanding - b.outstanding,
      render: (v: number) => outstandingCell(v),
    },
    {
      title: 'Bookings',
      dataIndex: 'bookingCount',
      width: 90,
      align: 'center',
      sorter: (a, b) => a.bookingCount - b.bookingCount,
    },
    {
      title: 'Total Qty',
      dataIndex: 'totalQty',
      width: 90,
      align: 'center',
      sorter: (a, b) => a.totalQty - b.totalQty,
    },
    {
      title: 'Avg Billed / Booking',
      dataIndex: 'avgRevenuePerBooking',
      width: 150,
      sorter: (a, b) => a.avgRevenuePerBooking - b.avgRevenuePerBooking,
      render: moneyCell,
    },
    {
      title: 'Avg Collected / Booking',
      dataIndex: 'avgCollectedPerBooking',
      width: 160,
      sorter: (a, b) => a.avgCollectedPerBooking - b.avgCollectedPerBooking,
      render: moneyCell,
    },
  ];

  const cardStyle = {
    background: colors.black.secondary,
    border: `1px solid ${colors.border}`,
  };

  const statCards = [
    {
      label: 'Total Billed',
      value: summary ? formatMoney(summary.totalRevenue) : '—',
      icon: <TrophyOutlined style={{ color: colors.gold.primary, fontSize: 20 }} />,
      color: colors.text.primary,
    },
    {
      label: 'Total Collected',
      value: summary ? formatMoney(summary.totalCollected) : '—',
      icon: <WalletOutlined style={{ color: colors.status.success, fontSize: 20 }} />,
      color: colors.status.success,
    },
    {
      label: 'Outstanding',
      value: summary ? formatMoney(summary.outstanding) : '—',
      icon: <ExclamationCircleOutlined style={{ color: colors.status.error, fontSize: 20 }} />,
      color: colors.status.error,
    },
    {
      label: 'Appointments',
      value: summary?.totalAppointments ?? 0,
      icon: <MedicineBoxOutlined style={{ color: colors.gold.primary, fontSize: 20 }} />,
      color: colors.text.primary,
    },
    {
      label: 'Unique Customers',
      value: summary?.uniqueCustomers ?? 0,
      icon: <UserOutlined style={{ color: colors.gold.primary, fontSize: 20 }} />,
      color: colors.text.primary,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            {navItem.label}
          </Title>
          <Text style={{ color: colors.text.placeholder }}>{navItem.description}</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ ...cardStyle, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FilterOutlined style={{ color: colors.gold.primary }} />
          <Text strong style={{ color: colors.text.primary }}>Filters</Text>
        </div>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Date Range</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 4 }}
              value={dateRange}
              onChange={(range) => {
                if (range && range[0] && range[1]) {
                  setDateRange([range[0], range[1]]);
                }
              }}
              format="DD-MM-YYYY"
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Branch</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder={branchesLoading ? 'Loading…' : 'All branches'}
              loading={branchesLoading}
              value={branchId}
              onChange={setBranchId}
              options={branchOptions}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* Summary stat cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {statCards.map((s) => (
          <Col key={s.label} xs={12} sm={8} md={8} lg={Math.floor(24 / statCards.length) as any}>
            <Card style={cardStyle} styles={{ body: { padding: '16px 20px' } }} loading={isLoading}>
              <Space>
                {s.icon}
                <div>
                  <Text style={{ color: colors.text.placeholder, fontSize: 12, display: 'block' }}>
                    {s.label}
                  </Text>
                  <span style={{ color: s.color, fontWeight: 700, fontSize: 20 }}>{s.value}</span>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Top 5 widgets */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 16 } }}
            title={
              <Space>
                <TeamOutlined style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>Top 5 Doctors by Collection</Text>
              </Space>
            }
          >
            {top5Doctors.length === 0 ? (
              <Text style={{ color: colors.text.placeholder }}>No data for the selected period</Text>
            ) : (
              top5Doctors.map((d, i) => (
                <div
                  key={d.employeeId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom:
                      i < top5Doctors.length - 1 ? `1px solid ${colors.border}` : undefined,
                  }}
                >
                  <Space size={8}>
                    <Text
                      style={{
                        color: i < 3 ? colors.gold.primary : colors.text.placeholder,
                        fontWeight: 700,
                        width: 20,
                        display: 'inline-block',
                      }}
                    >
                      {i + 1}
                    </Text>
                    <div>
                      <div style={{ color: colors.text.primary, fontWeight: 600, fontSize: 13 }}>
                        {d.name}
                      </div>
                      <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                        {d.appointmentCount} appts · billed {formatMoney(d.totalRevenue)}
                      </Text>
                    </div>
                  </Space>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: colors.status.success, display: 'block' }}>
                      {formatMoney(d.totalCollected)}
                    </strong>
                    {d.outstanding > 0 && (
                      <Text style={{ color: colors.status.error, fontSize: 11 }}>
                        -{formatMoney(d.outstanding)} due
                      </Text>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: 16 } }}
            title={
              <Space>
                <ScissorOutlined style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>Top 5 Services by Collection</Text>
              </Space>
            }
          >
            {top5Services.length === 0 ? (
              <Text style={{ color: colors.text.placeholder }}>No data for the selected period</Text>
            ) : (
              top5Services.map((s, i) => (
                <div
                  key={s.serviceName}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom:
                      i < top5Services.length - 1 ? `1px solid ${colors.border}` : undefined,
                  }}
                >
                  <Space size={8}>
                    <Text
                      style={{
                        color: i < 3 ? colors.gold.primary : colors.text.placeholder,
                        fontWeight: 700,
                        width: 20,
                        display: 'inline-block',
                      }}
                    >
                      {i + 1}
                    </Text>
                    <div>
                      <div style={{ color: colors.text.primary, fontWeight: 600, fontSize: 13 }}>
                        {s.serviceName}
                      </div>
                      <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                        {s.bookingCount} bookings · billed {formatMoney(s.totalRevenue)}
                      </Text>
                    </div>
                  </Space>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: colors.status.success, display: 'block' }}>
                      {formatMoney(s.totalCollected)}
                    </strong>
                    {s.outstanding > 0 && (
                      <Text style={{ color: colors.status.error, fontSize: 11 }}>
                        -{formatMoney(s.outstanding)} due
                      </Text>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* Doctor performance table */}
      <Card
        style={{ ...cardStyle, marginBottom: 12 }}
        styles={{ body: { padding: 16 } }}
        title={
          <Space>
            <TeamOutlined style={{ color: colors.gold.primary }} />
            <Text strong style={{ color: colors.text.primary }}>Doctor-wise Revenue & Collections</Text>
            <Tag>{doctors.length} doctors</Tag>
          </Space>
        }
      >
        <Table<DoctorRevenue>
          rowKey="employeeId"
          loading={isLoading}
          columns={doctorColumns}
          dataSource={doctors}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
          scroll={{ x: 900 }}
          locale={{ emptyText: 'No doctor data for this period' }}
        />
      </Card>

      {/* Service performance table */}
      <Card
        style={cardStyle}
        styles={{ body: { padding: 16 } }}
        title={
          <Space>
            <ScissorOutlined style={{ color: colors.gold.primary }} />
            <Text strong style={{ color: colors.text.primary }}>Service-wise Revenue & Collections</Text>
            <Tag>{services.length} services</Tag>
          </Space>
        }
      >
        <Table<ServiceRevenue>
          rowKey="serviceName"
          loading={isLoading}
          columns={serviceColumns}
          dataSource={services}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
          scroll={{ x: 1100 }}
          locale={{ emptyText: 'No service data for this period' }}
        />
      </Card>
    </div>
  );
}
