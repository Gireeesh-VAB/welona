'use client';

import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  BellOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FundOutlined,
  RiseOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useBrandColors } from '@/hooks/useBrandColors';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useBranchLock } from '@/hooks/useBranchLock';
import { formatMoney, formatMoneyShort } from '@shared/format';
import {
  ALERTS,
  BRANCH_PERFORMANCE,
  CATEGORY_MIX,
  CONVERSION_RATE,
  ENQUIRY_FUNNEL,
  RECENT_ACTIVITY,
  REVENUE_BY_MONTH,
  TELECALLER_TODAY_CALLS,
  TODAY_APPOINTMENTS,
  TODAY,
  TOP_EMPLOYEES,
  TOTAL_CUSTOMERS,
  TOTAL_OUTSTANDING,
  TOTAL_REVENUE,
  WEEKDAY_BOOKINGS,
} from '@/lib/sample-data/dashboard';
import { ENQUIRY_REPORT_ROWS } from '@/lib/sample-data/enquiry-report';

const { Title, Text, Paragraph } = Typography;

type Period = 'Today' | 'This Week' | 'This Month' | 'This Quarter';

// --------- KPI card with delta + sparkline ----------------------------------

interface KpiCardProps {
  title: string;
  value: string;
  delta: number;            // percentage change
  icon: React.ReactNode;
  accent: string;
  series: number[];         // sparkline series
  /** Optional one-liner shown under the value. */
  hint?: string;
}

function KpiCard({ title, value, delta, icon, accent, series, hint }: KpiCardProps) {
  const colors = useBrandColors();
  const positive = delta >= 0;
  const sparkOption = {
    grid: { left: 0, right: 0, top: 4, bottom: 0 },
    xAxis: { type: 'category', show: false, data: series.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    tooltip: { show: false },
    series: [
      {
        type: 'line',
        data: series,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: accent, width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${accent}66` },
              { offset: 1, color: `${accent}00` },
            ],
          },
        },
      },
    ],
  };

  return (
    <Card
      style={{
        background: colors.black.secondary,
        border: `1px solid ${colors.border}`,
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <Text style={{ color: colors.text.placeholder, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {title}
        </Text>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${accent}1A`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <Text strong style={{ color: colors.text.primary, fontSize: 26, lineHeight: 1.1 }}>{value}</Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
        <Tag
          icon={positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          style={{
            background: positive ? `${colors.status.success}1A` : `${colors.status.error}1A`,
            color: positive ? colors.status.success : colors.status.error,
            border: 'none', fontWeight: 600, margin: 0,
          }}
        >
          {Math.abs(delta).toFixed(1)}%
        </Tag>
        <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>vs previous</Text>
      </div>
      {hint && (
        <Text style={{ color: colors.text.placeholder, fontSize: 11, display: 'block', marginTop: 6 }}>{hint}</Text>
      )}
      <div style={{ height: 40, marginTop: 8, marginLeft: -8, marginRight: -8 }}>
        <ReactECharts option={sparkOption} style={{ height: 40, width: '100%' }}
          opts={{ renderer: 'svg' }} />
      </div>
    </Card>
  );
}

// --------- Main page --------------------------------------------------------

export default function AdminDashboardPage() {
  const router = useRouter();
  const colors = useBrandColors();
  const admin = useAdminAuthStore((s) => s.admin);
  const { isBranchSession, lockedBranchName } = useBranchLock();

  const [period, setPeriod] = useState<Period>('This Month');

  // Branch sessions greet with the branch name; admins greet by first name.
  const adminFirst = isBranchSession
    ? lockedBranchName ?? 'Branch'
    : (admin?.name ?? 'Admin').split(' ')[0];
  const now = dayjs(`${TODAY}T09:30:00`);
  const greeting = now.hour() < 12 ? 'Good morning' : now.hour() < 17 ? 'Good afternoon' : 'Good evening';

  // ---- Chart options ----
  const revenueChart = useMemo(() => ({
    color: [colors.gold.primary, colors.status.warning],
    grid: { left: 16, right: 56, top: 48, bottom: 24, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.black.secondary,
      borderColor: colors.border,
      textStyle: { color: colors.text.primary },
      formatter: (params: Array<{ name: string; value: number; marker: string; seriesName: string }>) =>
        `<span style="color:${colors.text.placeholder}">${params[0].name}</span><br/>`
        + params.map((p) => `${p.marker} ${p.seriesName}: <strong>${formatMoney(p.value)}</strong>`).join('<br/>'),
    },
    legend: {
      data: ['Revenue', 'Target'],
      textStyle: { color: colors.text.primary, fontSize: 12 },
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 16,
      top: 8,
      left: 'center',
    },
    xAxis: {
      type: 'category',
      data: REVENUE_BY_MONTH.map((m) => m.label),
      boundaryGap: true,
      axisLine: { lineStyle: { color: colors.border } },
      axisTick: { show: false },
      axisLabel: { color: colors.text.placeholder, fontWeight: 500, margin: 12 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: colors.text.placeholder,
        formatter: (v: number) => `₹${(v / 100000).toFixed(0)}L`,
        margin: 12,
      },
      splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
    },
    series: [
      {
        name: 'Revenue',
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbolSize: 7,
        data: REVENUE_BY_MONTH.map((m) => m.revenue),
        lineStyle: { color: colors.gold.primary, width: 3 },
        itemStyle: { color: colors.gold.primary, borderColor: colors.black.secondary, borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${colors.gold.primary}40` },
              { offset: 1, color: `${colors.gold.primary}00` },
            ],
          },
        },
      },
      {
        name: 'Target',
        type: 'line',
        data: REVENUE_BY_MONTH.map(() => Math.round(TOTAL_REVENUE * 0.92)),
        symbol: 'none',
        lineStyle: { color: colors.status.warning, type: 'dashed', width: 2 },
        itemStyle: { color: colors.status.warning },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [colors]);

  const funnelChart = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.black.secondary,
      borderColor: colors.border,
      textStyle: { color: colors.text.primary },
      formatter: (p: { name: string; value: number }) =>
        `${p.name}: <strong>${p.value}</strong> · ${Math.round((p.value / ENQUIRY_FUNNEL[0].count) * 100)}% of top`,
    },
    series: [{
      name: 'Pipeline', type: 'funnel',
      left: 24, right: 24, top: 16, bottom: 16,
      minSize: '30%',
      maxSize: '85%',
      sort: 'none',
      gap: 4,
      label: {
        show: true, position: 'inside',
        color: '#FFFFFF', fontWeight: 600, fontSize: 13,
        formatter: '{b}: {c}',
      },
      labelLine: { show: false },
      itemStyle: { borderColor: colors.black.secondary, borderWidth: 2 },
      data: ENQUIRY_FUNNEL.map((f, i) => ({
        value: f.count, name: f.stage,
        itemStyle: {
          color: [
            colors.status.info,
            colors.status.warning,
            colors.gold.primary,
            colors.status.success,
            colors.gold.dark ?? colors.status.success,
          ][i] ?? colors.gold.primary,
        },
      })),
    }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [colors]);

  const branchChart = useMemo(() => ({
    grid: { left: 100, right: 24, top: 36, bottom: 30 },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.black.secondary,
      borderColor: colors.border,
      textStyle: { color: colors.text.primary },
      formatter: (params: Array<{ name: string; value: number; marker: string; seriesName: string }>) => (
        `<strong>${params[0].name}</strong><br/>` +
        params.map((p) => `${p.marker} ${p.seriesName}: ${formatMoney(p.value)}`).join('<br/>')
      ),
    },
    legend: {
      data: ['Revenue', 'Expenses'],
      textStyle: { color: colors.text.primary, fontSize: 12 },
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 16,
      top: 6,
      left: 100,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: colors.text.placeholder,
        formatter: (v: number) => `₹${(v / 100000).toFixed(0)}L`,
      },
      splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: BRANCH_PERFORMANCE.map((b) => b.branch).reverse(),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.text.primary, fontWeight: 500 },
    },
    series: [
      {
        name: 'Revenue', type: 'bar',
        data: BRANCH_PERFORMANCE.map((b) => b.revenue).reverse(),
        itemStyle: { color: colors.gold.primary, borderRadius: [0, 4, 4, 0] },
        barWidth: 10,
        barGap: '20%',
        barCategoryGap: '40%',
      },
      {
        name: 'Expenses', type: 'bar',
        data: BRANCH_PERFORMANCE.map((b) => b.expenses).reverse(),
        itemStyle: { color: colors.status.error, borderRadius: [0, 4, 4, 0] },
        barWidth: 10,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [colors]);

  const categoryChart = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.black.secondary,
      borderColor: colors.border,
      textStyle: { color: colors.text.primary },
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}: <strong>${formatMoney(p.value)}</strong> (${p.percent.toFixed(1)}%)`,
    },
    legend: {
      orient: 'vertical', right: 8, top: 'middle',
      textStyle: { color: colors.text.primary, fontSize: 12 },
    },
    series: [{
      name: 'Revenue Mix', type: 'pie',
      radius: ['52%', '78%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: colors.black.secondary, borderWidth: 3, borderRadius: 6 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 16, fontWeight: 700, color: colors.text.primary,
          formatter: (p: { name: string; percent: number }) => `${p.name}\n${p.percent.toFixed(0)}%` },
      },
      data: CATEGORY_MIX.map((c, i) => ({
        ...c,
        itemStyle: {
          color: [
            colors.gold.primary,
            colors.status.info,
            colors.status.success,
            colors.status.warning,
            colors.status.error,
          ][i % 5],
        },
      })),
    }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [colors]);

  const weekdayChart = useMemo(() => ({
    grid: { left: 30, right: 12, top: 20, bottom: 30 },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.black.secondary,
      borderColor: colors.border,
      textStyle: { color: colors.text.primary },
    },
    xAxis: {
      type: 'category', data: WEEKDAY_BOOKINGS.map((w) => w.day),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.text.placeholder },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.text.placeholder },
      splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
    },
    series: [{
      type: 'bar', barWidth: '50%',
      data: WEEKDAY_BOOKINGS.map((w) => ({
        value: w.count,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: colors.gold.primary },
              { offset: 1, color: colors.gold.light },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
      })),
    }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [colors]);

  // ---- Sparklines for KPI cards ----
  const sparks = useMemo(() => ({
    revenue: REVENUE_BY_MONTH.map((m) => m.revenue),
    customers: [8, 11, 13, 16, 19, 22],
    enquiries: [12, 18, 14, 21, 19, 25],
    conversion: [42, 48, 51, 47, 53, CONVERSION_RATE],
    outstanding: REVENUE_BY_MONTH.map((m) => Math.round(m.revenue * 0.18)),
    calls: [120, 135, 142, 138, 158, 150 + TELECALLER_TODAY_CALLS],
  }), []);

  // ---- Activity icons ----
  const activityIcon: Record<string, React.ReactNode> = {
    sale: <DollarOutlined />,
    enquiry: <UserOutlined />,
    'walk-in': <TeamOutlined />,
    call: <BellOutlined />,
    expense: <WalletOutlined />,
  };
  const activityColor: Record<string, string> = {
    sale: colors.status.success,
    enquiry: colors.status.info,
    'walk-in': colors.gold.primary,
    call: colors.status.warning,
    expense: colors.status.error,
  };

  // ---- Appointment status colour ----
  const aptColor = (s: string): string => {
    if (s === 'Completed') return colors.status.success;
    if (s === 'Confirmed') return colors.status.info;
    if (s === 'Checked-In' || s === 'In Session') return colors.gold.primary;
    if (s === 'Pending') return colors.status.warning;
    if (s === 'No-Show' || s === 'Cancelled') return colors.status.error;
    return colors.text.placeholder;
  };

  const upcomingToday = TODAY_APPOINTMENTS.filter(
    (a) => a.status === 'Confirmed' || a.status === 'Pending' || a.status === 'Checked-In' || a.status === 'In Session',
  ).slice(0, 6);

  const todayNewEnquiries = ENQUIRY_REPORT_ROWS.filter(
    (e) => e.enquiryDate === TODAY,
  ).length;

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.gold.primary} 0%, ${colors.gold.dark ?? colors.gold.primary} 100%)`,
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 16,
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', right: -40, top: -40, width: 220, height: 220,
          borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -80, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
        }} />

        <Row align="middle" gutter={16} style={{ position: 'relative' }}>
          <Col flex="auto">
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              {dayjs(TODAY).format('dddd · DD MMMM YYYY')}
            </Text>
            <Title level={2} style={{ color: '#FFFFFF', margin: '4px 0 6px' }}>
              {greeting}, {adminFirst}
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              {isBranchSession
                ? "Here's what's happening at your branch today."
                : "Here's what's happening across your branches today."}
            </Text>
            <div style={{ marginTop: 12 }}>
              <Space size="middle" wrap>
                <Tag style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF', border: 'none', fontWeight: 600, fontSize: 12 }}>
                  <CalendarOutlined /> {TODAY_APPOINTMENTS.length} appointments today
                </Tag>
                <Tag style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF', border: 'none', fontWeight: 600, fontSize: 12 }}>
                  <UserOutlined /> {todayNewEnquiries} new enquir{todayNewEnquiries === 1 ? 'y' : 'ies'}
                </Tag>
                <Tag style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF', border: 'none', fontWeight: 600, fontSize: 12 }}>
                  <BellOutlined /> {TELECALLER_TODAY_CALLS} calls placed
                </Tag>
              </Space>
            </div>
          </Col>
          <Col>
            <Segmented<Period>
              value={period}
              onChange={(v) => setPeriod(v as Period)}
              options={['Today', 'This Week', 'This Month', 'This Quarter']}
              style={{ background: 'rgba(255,255,255,0.12)' }}
            />
          </Col>
        </Row>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Alerts strip                                                        */}
      {/* ------------------------------------------------------------------ */}
      {ALERTS.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {ALERTS.map((a) => {
            const c = a.severity === 'error' ? colors.status.error
              : a.severity === 'warning' ? colors.status.warning
              : colors.status.info;
            return (
              <Col xs={24} md={8} key={a.key}>
                <Card style={{
                  background: colors.black.secondary,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${c}`,
                }} styles={{ body: { padding: '12px 16px' } }}>
                  <Text strong style={{ color: c, fontSize: 13 }}>{a.title}</Text>
                  <Paragraph style={{ color: colors.text.placeholder, fontSize: 12, margin: '4px 0 0' }}>
                    {a.message}
                  </Paragraph>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KPI strip                                                           */}
      {/* ------------------------------------------------------------------ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={8} lg={4}>
          <KpiCard
            title="Revenue" value={formatMoneyShort(TOTAL_REVENUE)} delta={12.4}
            icon={<DollarOutlined />} accent={colors.gold.primary}
            series={sparks.revenue} hint={`Target ${formatMoneyShort(Math.round(TOTAL_REVENUE * 0.92))}`} />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <KpiCard
            title="Active Customers" value={TOTAL_CUSTOMERS.toString()} delta={8.1}
            icon={<TeamOutlined />} accent={colors.status.info}
            series={sparks.customers} hint="across all branches" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <KpiCard
            title="New Enquiries" value={ENQUIRY_REPORT_ROWS.length.toString()} delta={18.6}
            icon={<UserOutlined />} accent={colors.status.success}
            series={sparks.enquiries} hint={`${todayNewEnquiries} today`} />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <KpiCard
            title="Conversion" value={`${CONVERSION_RATE}%`} delta={3.2}
            icon={<RiseOutlined />} accent={colors.gold.dark ?? colors.gold.primary}
            series={sparks.conversion} hint="enquiry → paid" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <KpiCard
            title="Outstanding" value={formatMoneyShort(TOTAL_OUTSTANDING)} delta={-5.8}
            icon={<WalletOutlined />} accent={colors.status.warning}
            series={sparks.outstanding} hint={`from ${REVENUE_BY_MONTH[0].label}`} />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <KpiCard
            title="Calls Made" value={(150 + TELECALLER_TODAY_CALLS).toString()} delta={6.4}
            icon={<BellOutlined />} accent={colors.status.error}
            series={sparks.calls} hint="telecaller activity" />
        </Col>
      </Row>

      {/* ------------------------------------------------------------------ */}
      {/* Revenue trend + Pipeline funnel                                     */}
      {/* ------------------------------------------------------------------ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={15}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 18 } }}
            title={
              <Space>
                <FundOutlined style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>Revenue Trend</Text>
                <Tag style={{ background: `${colors.status.success}1A`, color: colors.status.success, border: 'none', margin: 0, fontWeight: 600 }}>
                  +12.4% MoM
                </Tag>
              </Space>
            }
            extra={
              <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                Last 6 months · Target dashed
              </Text>
            }>
            <ReactECharts option={revenueChart} style={{ height: 320 }} opts={{ renderer: 'svg' }} />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 18 } }}
            title={
              <Space>
                <FundOutlined style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>Sales Pipeline</Text>
              </Space>
            }
            extra={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Enquiry → Paid</Text>}>
            <ReactECharts option={funnelChart} style={{ height: 320 }} opts={{ renderer: 'svg' }} />
          </Card>
        </Col>
      </Row>

      {/* ------------------------------------------------------------------ */}
      {/* Branch performance + Category + Weekday                             */}
      {/* ------------------------------------------------------------------ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Cross-branch comparison is meaningless for a single-branch session. */}
        {!isBranchSession && (
        <Col xs={24} xl={9}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 18 } }}
            title={<Text strong style={{ color: colors.text.primary }}>Branch Performance</Text>}
            extra={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Revenue vs Expenses</Text>}>
            <ReactECharts option={branchChart} style={{ height: 360 }} opts={{ renderer: 'svg' }} />
          </Card>
        </Col>
        )}
        <Col xs={24} xl={9}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 18 } }}
            title={<Text strong style={{ color: colors.text.primary }}>Revenue Mix by Category</Text>}>
            <ReactECharts option={categoryChart} style={{ height: 360 }} opts={{ renderer: 'svg' }} />
          </Card>
        </Col>
        <Col xs={24} xl={6}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 18 } }}
            title={<Text strong style={{ color: colors.text.primary }}>Weekday Bookings</Text>}
            extra={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>Which day works best</Text>}>
            <ReactECharts option={weekdayChart} style={{ height: 360 }} opts={{ renderer: 'svg' }} />
          </Card>
        </Col>
      </Row>

      {/* ------------------------------------------------------------------ */}
      {/* Today's Schedule + Top Performers + Recent Activity                 */}
      {/* ------------------------------------------------------------------ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Today's schedule */}
        <Col xs={24} xl={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 18 } }}
            title={
              <Space>
                <CalendarOutlined style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>Today&apos;s Schedule</Text>
                <Badge count={upcomingToday.length} style={{ background: colors.gold.primary }} />
              </Space>
            }
            extra={
              <Button size="small" type="link" onClick={() => router.push('/admin/admin/appointments')}>
                View all <ArrowRightOutlined />
              </Button>
            }>
            {upcomingToday.length === 0 ? (
              <Empty description="No upcoming appointments today" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {upcomingToday.map((a) => (
                  <div key={a.key} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: 10, background: colors.black.tertiary,
                    borderRadius: 8, border: `1px solid ${colors.border}`,
                    borderLeft: `4px solid ${aptColor(a.status)}`,
                  }}>
                    <div style={{
                      width: 56, textAlign: 'center', flexShrink: 0,
                      borderRight: `1px solid ${colors.border}`, paddingRight: 8,
                    }}>
                      <div style={{ color: colors.gold.primary, fontWeight: 700, fontSize: 14 }}>
                        {dayjs(a.startsAt).format('hh:mm')}
                      </div>
                      <div style={{ color: colors.text.placeholder, fontSize: 11 }}>
                        {dayjs(a.startsAt).format('A')}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: colors.text.primary, fontSize: 13 }}>{a.customerName}</div>
                      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                        {a.service}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Space size={4} wrap>
                          <Tag style={{ background: aptColor(a.status), color: '#FFFFFF', border: 'none', fontWeight: 600, fontSize: 11, margin: 0 }}>
                            {a.status}
                          </Tag>
                          <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                            · {a.branchName}
                          </Text>
                        </Space>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Top performers */}
        <Col xs={24} xl={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 18 } }}
            title={
              <Space>
                <TrophyOutlined style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>Top Performers</Text>
              </Space>
            }
            extra={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>This month</Text>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TOP_EMPLOYEES.slice(0, 5).map((e, i) => {
                const maxRev = TOP_EMPLOYEES[0]?.revenue || 1;
                const pct = Math.round((e.revenue / maxRev) * 100);
                const medalColor = i === 0 ? '#D4AF37' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : colors.text.placeholder;
                return (
                  <div key={e.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: i < 3 ? medalColor : colors.black.tertiary,
                        color: i < 3 ? '#FFFFFF' : colors.text.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, flexShrink: 0,
                      }}>{i + 1}</div>
                      <Avatar size={32} style={{ background: colors.gold.primary, color: colors.text.onGold, fontWeight: 600, flexShrink: 0 }}>
                        {e.name.charAt(0)}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: colors.text.primary, fontSize: 13 }}>{e.name}</div>
                        <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                          {e.branch} · {e.bookings} bookings
                        </Text>
                      </div>
                      <Text strong style={{ color: colors.gold.primary, fontSize: 14, flexShrink: 0 }}>
                        {formatMoneyShort(e.revenue)}
                      </Text>
                    </div>
                    <Progress percent={pct} size="small" strokeColor={colors.gold.primary} showInfo={false} />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* Recent activity */}
        <Col xs={24} xl={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}`, height: '100%' }}
            styles={{ body: { padding: 18 } }}
            title={
              <Space>
                <ClockCircleOutlined style={{ color: colors.gold.primary }} />
                <Text strong style={{ color: colors.text.primary }}>Recent Activity</Text>
              </Space>
            }
            extra={<Text style={{ color: colors.text.placeholder, fontSize: 12 }}>across all branches</Text>}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 16, top: 8, bottom: 8,
                width: 2, background: colors.border,
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
                {RECENT_ACTIVITY.map((a) => (
                  <div key={a.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: `${activityColor[a.kind]}1A`,
                      color: activityColor[a.kind],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0,
                      border: `2px solid ${colors.black.secondary}`,
                      zIndex: 1, position: 'relative',
                    }}>
                      {activityIcon[a.kind]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: colors.text.primary, fontSize: 13 }}>{a.title}</div>
                      <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                        {a.subtitle} · {dayjs(a.ts).format('DD MMM')}
                      </Text>
                      {a.amount && (
                        <div style={{ marginTop: 2 }}>
                          <Text strong style={{ color: colors.status.success, fontSize: 13 }}>
                            {formatMoney(a.amount)}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
