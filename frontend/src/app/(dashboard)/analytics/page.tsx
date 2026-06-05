'use client';

import { useMemo } from 'react';
import { Card, Col, Row, Spin, Statistic, Typography } from 'antd';
import { BellOutlined, CalendarOutlined, DollarOutlined, TeamOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useDashboard } from '@/hooks/useDashboard';
import { formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

export default function AnalyticsPage() {
  const { data, isLoading } = useDashboard();

  const collectionChart = useMemo(() => {
    if (!data?.monthCollection.items.length) return null;
    const items = data.monthCollection.items;
    return {
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${formatMoney(p.value)} (${p.percent.toFixed(1)}%)` },
      legend: { bottom: 0, textStyle: { color: colors.text.primary, fontSize: 11 } },
      series: [{
        name: 'Collection by Mode',
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['50%', '45%'],
        label: { show: false },
        data: items.map((item, i) => ({
          name: item.method,
          value: item.amount,
          itemStyle: { color: [colors.gold.primary, '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#facc15'][i % 6] },
        })),
      }],
    };
  }, [data]);

  const treatmentChart = useMemo(() => {
    if (!data?.treatmentBreakdown.length) return null;
    const rows = data.treatmentBreakdown.slice(0, 8);
    return {
      grid: { left: 24, right: 24, top: 12, bottom: 30, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: rows.map((r) => r.name.length > 12 ? r.name.slice(0, 12) + '…' : r.name),
        axisLabel: { color: colors.text.placeholder, fontSize: 11, rotate: 20 },
      },
      yAxis: { type: 'value', axisLabel: { color: colors.text.placeholder } },
      series: [{
        type: 'bar',
        data: rows.map((r) => r.enquiries),
        itemStyle: { color: colors.gold.primary, borderRadius: [4, 4, 0, 0] },
        barWidth: '60%',
      }],
    };
  }, [data]);

  const employeeChart = useMemo(() => {
    if (!data?.employeeCollection.length) return null;
    const rows = data.employeeCollection.slice(0, 6);
    return {
      grid: { left: 100, right: 24, top: 12, bottom: 12 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value', axisLabel: { color: colors.text.placeholder, formatter: (v: number) => `₹${(v / 100).toFixed(0)}` } },
      yAxis: { type: 'category', data: rows.map((r) => r.name).reverse(), axisLabel: { color: colors.text.primary, fontSize: 11 } },
      series: [{
        type: 'bar',
        data: rows.map((r) => r.amount).reverse(),
        itemStyle: { color: colors.gold.primary, borderRadius: [0, 4, 4, 0] },
        barWidth: 14,
      }],
    };
  }, [data]);

  return (
    <div>
      <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>Analytics</Title>
      <Text style={{ color: colors.text.placeholder, display: 'block', marginBottom: 16 }}>
        Live performance metrics based on today and this month&apos;s activity.
      </Text>

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {[
            { label: "Today's Enquiries", value: data?.kpis.todayEnquiries ?? 0, icon: <TeamOutlined />, color: colors.gold.primary },
            { label: "Today's Walk-Ins", value: data?.kpis.todayWalkIns ?? 0, icon: <CalendarOutlined />, color: '#0ea5e9' },
            { label: "Month Collection", value: formatMoney(data?.kpis.monthCollection ?? 0), icon: <DollarOutlined />, color: '#22c55e', raw: true },
            { label: "Follow-ups Due", value: data?.kpis.todayFollowupsDue ?? 0, icon: <BellOutlined />, color: '#facc15' },
          ].map(({ label, value, icon, color, raw }) => (
            <Col xs={12} sm={6} key={label}>
              <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
                <Statistic
                  title={<Text style={{ color: colors.text.placeholder }}>{label}</Text>}
                  value={raw ? (value as string) : (value as number)}
                  prefix={<span style={{ color }}>{icon}</span>}
                  valueStyle={{ color: colors.text.primary, fontSize: 20 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          {collectionChart && (
            <Col xs={24} md={10}>
              <Card title={<Text strong style={{ color: colors.text.primary }}>Collection by Payment Mode (This Month)</Text>}
                style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
                <ReactECharts option={collectionChart} style={{ height: 280 }} opts={{ renderer: 'svg' }} />
              </Card>
            </Col>
          )}
          {treatmentChart && (
            <Col xs={24} md={14}>
              <Card title={<Text strong style={{ color: colors.text.primary }}>Enquiries by Treatment (This Month)</Text>}
                style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
                <ReactECharts option={treatmentChart} style={{ height: 280 }} opts={{ renderer: 'svg' }} />
              </Card>
            </Col>
          )}
          {employeeChart && (
            <Col xs={24}>
              <Card title={<Text strong style={{ color: colors.text.primary }}>Today&apos;s Collection by Staff</Text>}
                style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
                <ReactECharts option={employeeChart} style={{ height: 220 }} opts={{ renderer: 'svg' }} />
              </Card>
            </Col>
          )}
        </Row>
      </Spin>
    </div>
  );
}
