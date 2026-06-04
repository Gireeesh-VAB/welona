'use client';

import { useMemo } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Skeleton,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GiftOutlined,
  HourglassOutlined,
  RiseOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
  UsergroupDeleteOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useHrDashboard } from '@/hooks/useHrDashboard';
import { useApproveLeave, useRejectLeave } from '@/hooks/useLeaves';
import { useBrandColors } from '@/hooks/useBrandColors';
import StatCard from '@/components/dashboard/StatCard';

const { Title, Text } = Typography;

function formatDateDmy(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${d.getUTCFullYear()}`;
}

const statusColor: Record<string, string> = {
  present: '#22c55e',
  half_day: '#facc15',
  wfh: '#0ea5e9',
  leave: '#a855f7',
  absent: '#ef4444',
  holiday: '#64748b',
};

const statusLabel: Record<string, string> = {
  present: 'Present',
  half_day: 'Half-day',
  wfh: 'WFH',
  leave: 'Leave',
  absent: 'Absent',
  holiday: 'Holiday',
};

interface ClickableStatProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  loading?: boolean;
  onClick?: () => void;
}

/**
 * Wraps the shared `StatCard` so clickable KPIs (drill-downs) get a pointer
 * cursor without changing the shared component's API.
 */
function ClickableStat({ icon, label, value, loading, onClick }: ClickableStatProps) {
  if (!onClick) return <StatCard icon={icon} label={label} value={value} loading={loading} />;
  return (
    <div onClick={onClick} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
      <StatCard icon={icon} label={label} value={value} loading={loading} />
    </div>
  );
}

export default function HrDashboardPage() {
  const colors = useBrandColors();
  const router = useRouter();
  const { data, isLoading } = useHrDashboard();
  const approve = useApproveLeave();
  const reject = useRejectLeave();

  const cardStyle = {
    background: colors.black.secondary,
    border: `1px solid ${colors.border}`,
  };

  // ---- derived KPIs ----
  const presenceRatePct = useMemo(() => {
    if (!data?.kpis.activeEmployees) return 0;
    return Math.round((data.kpis.presentToday / data.kpis.activeEmployees) * 100);
  }, [data]);

  // ---- charts ----
  const trendChart = useMemo(() => {
    if (!data?.attendanceTrend.length) return null;
    const dates = data.attendanceTrend.map((d) => dayjs(d.date).format('DD MMM'));
    return {
      tooltip: { trigger: 'axis' as const },
      legend: {
        bottom: 0,
        textStyle: { color: colors.text.primary, fontSize: 11 },
      },
      grid: { left: 30, right: 16, top: 12, bottom: 36 },
      xAxis: {
        type: 'category' as const,
        data: dates,
        axisLabel: { color: colors.text.placeholder, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.border } },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: { color: colors.text.placeholder, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.border, type: 'dashed' as const } },
      },
      series: [
        {
          name: 'Present',
          type: 'line' as const,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          areaStyle: { opacity: 0.12 },
          itemStyle: { color: statusColor.present },
          lineStyle: { width: 2 },
          data: data.attendanceTrend.map((d) => d.present),
        },
        {
          name: 'WFH',
          type: 'line' as const,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: statusColor.wfh },
          lineStyle: { width: 2 },
          data: data.attendanceTrend.map((d) => d.wfh),
        },
        {
          name: 'Leave',
          type: 'line' as const,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: statusColor.leave },
          lineStyle: { width: 2 },
          data: data.attendanceTrend.map((d) => d.leave),
        },
        {
          name: 'Absent',
          type: 'line' as const,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: statusColor.absent },
          lineStyle: { width: 2 },
          data: data.attendanceTrend.map((d) => d.absent),
        },
      ],
    };
  }, [data, colors]);

  const gaugeChart = useMemo(
    () => ({
      series: [
        {
          type: 'gauge' as const,
          startAngle: 210,
          endAngle: -30,
          progress: {
            show: true,
            width: 14,
            roundCap: true,
            itemStyle: { color: colors.gold.primary },
          },
          axisLine: {
            lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.08)']] },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: { show: false },
          anchor: { show: false },
          data: [{ value: presenceRatePct }],
          detail: {
            valueAnimation: true,
            fontSize: 34,
            fontWeight: 700,
            color: colors.text.primary,
            offsetCenter: [0, '0%'],
            formatter: '{value}%',
          },
          title: {
            offsetCenter: [0, '50%'],
            fontSize: 12,
            color: colors.text.placeholder,
          },
        },
      ],
      title: { text: 'present today' },
    }),
    [presenceRatePct, colors],
  );

  const departmentChart = useMemo(() => {
    if (!data?.byDepartment.length) return null;
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 110, right: 24, top: 8, bottom: 24 },
      xAxis: { type: 'value' as const, axisLabel: { color: colors.text.placeholder } },
      yAxis: {
        type: 'category' as const,
        data: data.byDepartment.map((d) => d.label),
        axisLabel: { color: colors.text.primary, fontSize: 11 },
      },
      series: [
        {
          type: 'bar' as const,
          data: data.byDepartment.map((d) => d.count),
          itemStyle: { color: colors.gold.primary, borderRadius: [0, 4, 4, 0] },
          barWidth: 12,
          label: { show: true, position: 'right' as const, color: colors.text.placeholder, fontSize: 11 },
        },
      ],
    };
  }, [data, colors]);

  const todayChart = useMemo(() => {
    if (!data?.todaysAttendance.length) return null;
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: colors.text.primary, fontSize: 11 } },
      series: [
        {
          type: 'pie' as const,
          radius: ['58%', '78%'],
          avoidLabelOverlap: true,
          label: { show: false },
          data: data.todaysAttendance.map((row) => ({
            name: statusLabel[row.status] ?? row.status,
            value: row.count,
            itemStyle: { color: statusColor[row.status] ?? colors.gold.primary },
          })),
        },
      ],
    };
  }, [data, colors]);

  const genderChart = useMemo(() => {
    if (!data?.byGender.length) return null;
    return {
      tooltip: { trigger: 'item' as const },
      legend: { bottom: 0, textStyle: { color: colors.text.primary, fontSize: 11 } },
      series: [
        {
          type: 'pie' as const,
          radius: ['52%', '78%'],
          label: { show: false },
          data: data.byGender.map((row, i) => ({
            name: row.label,
            value: row.count,
            itemStyle: { color: colors.chartPalette[i % colors.chartPalette.length] },
          })),
        },
      ],
    };
  }, [data, colors]);

  return (
    <div>
      {/* ---- Header (matches the rest of the admin pages) ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            HR Dashboard
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Headcount, today&apos;s presence, leave queue and the next 60 days of events.
          </Text>
        </div>
        <Space wrap>
          <Button onClick={() => router.push('/admin/hr/attendance')}>
            Mark attendance
          </Button>
          <Button
            type="primary"
            onClick={() => router.push('/admin/hr/leaves')}
            icon={<CarryOutOutlined />}
          >
            Leave queue
            {data && data.kpis.pendingLeaveApplications > 0 && (
              <Badge
                count={data.kpis.pendingLeaveApplications}
                style={{ background: colors.status.error, marginLeft: 6 }}
              />
            )}
          </Button>
        </Space>
      </div>

      <Spin spinning={isLoading} tip="Loading HR dashboard…">
        {/* ---- KPI strip ---- */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <ClickableStat
              icon={<TeamOutlined />}
              label="Active employees"
              value={data?.kpis.activeEmployees ?? 0}
              loading={isLoading}
              onClick={() => router.push('/admin/hr/employee')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <ClickableStat
              icon={<CheckCircleOutlined />}
              label={`Present today (${presenceRatePct}%)`}
              value={data?.kpis.presentToday ?? 0}
              loading={isLoading}
              onClick={() => router.push('/admin/hr/attendance')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <ClickableStat
              icon={<CarryOutOutlined />}
              label="On leave today"
              value={data?.kpis.onLeaveToday ?? 0}
              loading={isLoading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <ClickableStat
              icon={<HourglassOutlined />}
              label="Pending requests"
              value={data?.kpis.pendingLeaveApplications ?? 0}
              loading={isLoading}
              onClick={() => router.push('/admin/hr/leaves')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <ClickableStat
              icon={<UsergroupAddOutlined />}
              label="New joiners (30d)"
              value={data?.kpis.newJoinersLast30d ?? 0}
              loading={isLoading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <ClickableStat
              icon={<UsergroupDeleteOutlined />}
              label="Relieved (30d)"
              value={data?.kpis.relievedLast30d ?? 0}
              loading={isLoading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <ClickableStat
              icon={<CalendarOutlined />}
              label="Upcoming holidays (60d)"
              value={data?.kpis.upcomingHolidays ?? 0}
              loading={isLoading}
              onClick={() => router.push('/admin/hr/holidays')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <ClickableStat
              icon={<CloseCircleOutlined />}
              label="Absent today"
              value={data?.kpis.absentToday ?? 0}
              loading={isLoading}
            />
          </Col>
        </Row>

        {/* ---- Trend + presence + today donut ---- */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <RiseOutlined style={{ color: colors.gold.primary }} />
                  Attendance trend — last 14 days
                </Space>
              }
              style={cardStyle}
            >
              {isLoading ? (
                <Skeleton active />
              ) : trendChart ? (
                <ReactECharts option={trendChart} style={{ height: 280 }} />
              ) : (
                <Empty description="No attendance recorded yet" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Presence rate" style={cardStyle}>
              <ReactECharts option={gaugeChart} style={{ height: 280 }} />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Today's breakdown" style={cardStyle}>
              {isLoading ? (
                <Skeleton active />
              ) : todayChart ? (
                <ReactECharts option={todayChart} style={{ height: 260 }} />
              ) : (
                <Empty description="No attendance marked yet today" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Headcount by department" style={cardStyle}>
              {isLoading ? (
                <Skeleton active />
              ) : departmentChart ? (
                <ReactECharts
                  option={departmentChart}
                  style={{ height: Math.max(260, (data?.byDepartment.length ?? 0) * 28 + 60) }}
                />
              ) : (
                <Empty description="No departments yet" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={6}>
            <Card title="Gender split" style={cardStyle}>
              {isLoading ? (
                <Skeleton active />
              ) : genderChart ? (
                <ReactECharts option={genderChart} style={{ height: 260 }} />
              ) : (
                <Empty description="No employee data" />
              )}
            </Card>
          </Col>
        </Row>

        {/* ---- Pending leave queue (premium quick-action card) ---- */}
        {(data?.pendingLeavesPreview?.length ?? 0) > 0 && (
          <Card
            style={{
              ...cardStyle,
              marginTop: 16,
              borderTop: `3px solid ${colors.gold.primary}`,
            }}
            title={
              <Space>
                <HourglassOutlined style={{ color: colors.gold.primary }} />
                Awaiting your approval
                <Badge
                  count={data?.kpis.pendingLeaveApplications}
                  style={{ background: colors.status.error }}
                />
              </Space>
            }
            extra={
              <Button type="link" onClick={() => router.push('/admin/hr/leaves')}>
                Open full queue <ArrowRightOutlined />
              </Button>
            }
          >
            <List
              dataSource={data?.pendingLeavesPreview ?? []}
              renderItem={(p) => (
                <List.Item
                  actions={[
                    <Tooltip key="approve" title="Approve">
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        loading={approve.isPending}
                        onClick={() =>
                          approve.mutate({ id: p.id, body: { approverNote: undefined } })
                        }
                        style={{ background: '#16a34a', borderColor: '#16a34a' }}
                      />
                    </Tooltip>,
                    <Tooltip key="reject" title="Reject">
                      <Button
                        size="small"
                        icon={<CloseCircleOutlined />}
                        loading={reject.isPending}
                        onClick={() =>
                          reject.mutate({ id: p.id, body: { approverNote: undefined } })
                        }
                        style={{
                          background: colors.status.error,
                          borderColor: colors.status.error,
                          color: '#FFFFFF',
                        }}
                      />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ background: colors.gold.primary, color: colors.text.onGold }}>
                        {p.employeeName
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <span style={{ color: colors.text.primary, fontWeight: 600 }}>
                          {p.employeeName}
                        </span>
                        <Text type="secondary">{p.employeeCode}</Text>
                        <Tag color="gold">{p.leaveTypeCode}</Tag>
                      </Space>
                    }
                    description={
                      <span style={{ color: colors.text.placeholder }}>
                        <strong>{p.days} day(s)</strong> — {formatDateDmy(p.fromDate)} →{' '}
                        {formatDateDmy(p.toDate)}
                        {p.reason && ` · ${p.reason}`}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* ---- People highlights ---- */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <GiftOutlined style={{ color: '#facc15' }} />
                  Upcoming birthdays
                </Space>
              }
              style={cardStyle}
            >
              {isLoading ? (
                <Skeleton active />
              ) : (data?.upcomingBirthdays.length ?? 0) === 0 ? (
                <Empty description="None in the next 30 days" />
              ) : (
                <List
                  size="small"
                  dataSource={data?.upcomingBirthdays}
                  renderItem={(p) => (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/admin/hr/employee/${p.id}`)}
                      actions={[
                        <Tag key="d" color={p.daysAway === 0 ? 'gold' : 'default'}>
                          {p.daysAway === 0
                            ? 'Today 🎂'
                            : p.daysAway === 1
                              ? 'Tomorrow'
                              : `in ${p.daysAway}d`}
                        </Tag>,
                      ]}
                    >
                      <List.Item.Meta
                        title={p.name}
                        description={`${p.employeeCode} — ${formatDateDmy(p.date)}`}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#22c55e' }} />
                  Work anniversaries
                </Space>
              }
              style={cardStyle}
            >
              {isLoading ? (
                <Skeleton active />
              ) : (data?.upcomingAnniversaries.length ?? 0) === 0 ? (
                <Empty description="None in the next 30 days" />
              ) : (
                <List
                  size="small"
                  dataSource={data?.upcomingAnniversaries}
                  renderItem={(p) => (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/admin/hr/employee/${p.id}`)}
                      actions={[
                        <Tag key="d" color={p.daysAway === 0 ? 'gold' : 'default'}>
                          {p.daysAway === 0
                            ? 'Today 🎉'
                            : p.daysAway === 1
                              ? 'Tomorrow'
                              : `in ${p.daysAway}d`}
                        </Tag>,
                      ]}
                    >
                      <List.Item.Meta
                        title={p.name}
                        description={`${p.employeeCode} — ${formatDateDmy(p.date)}`}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#0ea5e9' }} />
                  Upcoming holidays
                </Space>
              }
              style={cardStyle}
              extra={
                <Button type="link" size="small" onClick={() => router.push('/admin/hr/holidays')}>
                  View all <ArrowRightOutlined />
                </Button>
              }
            >
              {isLoading ? (
                <Skeleton active />
              ) : (data?.upcomingHolidays.length ?? 0) === 0 ? (
                <Empty description="No holidays in the next 60 days" />
              ) : (
                <List
                  size="small"
                  dataSource={data?.upcomingHolidays}
                  renderItem={(h) => (
                    <List.Item
                      actions={[
                        <Tag key="t" color={h.type === 'public' ? 'red' : 'blue'}>
                          {h.type}
                        </Tag>,
                      ]}
                    >
                      <List.Item.Meta title={h.name} description={formatDateDmy(h.date)} />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* ---- Recent joiners (bottom strip) ---- */}
        <Card
          title={
            <Space>
              <UserAddOutlined style={{ color: colors.gold.primary }} />
              Recent joiners (last 30 days)
            </Space>
          }
          style={{ ...cardStyle, marginTop: 16 }}
          extra={
            <Button type="link" size="small" onClick={() => router.push('/admin/hr/employee')}>
              All employees <ArrowRightOutlined />
            </Button>
          }
        >
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={data?.recentJoiners ?? []}
            pagination={false}
            size="small"
            locale={{ emptyText: 'No new joiners in the last 30 days' }}
            onRow={(row) => ({
              style: { cursor: 'pointer' },
              onClick: () => router.push(`/admin/hr/employee/${row.id}`),
            })}
            columns={[
              { title: 'Name', dataIndex: 'name' },
              { title: 'Code', dataIndex: 'employeeCode' },
              { title: 'Designation', dataIndex: 'designation' },
              { title: 'Department', dataIndex: 'department' },
              { title: 'Branch', dataIndex: 'branch' },
              {
                title: 'Joined',
                dataIndex: 'joiningDate',
                render: (v: string) => formatDateDmy(v),
              },
            ]}
          />
        </Card>
      </Spin>
    </div>
  );
}
