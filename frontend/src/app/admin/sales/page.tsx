'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Col, Empty, Row, Space, Spin, Statistic, Table, Typography } from 'antd';
import {
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  PlusOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { useAdminSalesDashboard } from '@/hooks/useAdminSales';
import SalesNav from '@/components/admin-sales/SalesNav';
import StatusTag from '@/components/sales/StatusTag';
import NewSaleModal from '@/components/admin-sales/NewSaleModal';
import { formatMoney, formatMoneyShort } from '@shared/format';
import type { SalesDashboard } from '@shared/types/sales';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

type TodayEnquiry = SalesDashboard['todayEnquiries'][number];
type DueFollowUp = SalesDashboard['followupsDueToday'][number];

/** Format an ISO timestamp as a short time, e.g. "02:30 PM". */
function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Sales pipeline dashboard (module M13). */
export default function SalesDashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useAdminSalesDashboard();
  const [saleOpen, setSaleOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <div>
        <SalesNav />
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  const { kpis, pipeline, revenueByMonth, salespeople, today, todayEnquiries, followupsDueToday } =
    data;

  const kpiCards = [
    {
      title: "Today's Enquiries",
      value: today.enquiries,
      icon: <TeamOutlined />,
      color: colors.gold.primary,
    },
    {
      title: 'Follow-ups Due Today',
      value: today.followupsDue,
      icon: <ClockCircleOutlined />,
      color: colors.gold.primary,
    },
    {
      title: 'Won Revenue',
      value: formatMoneyShort(kpis.wonRevenue),
      icon: <DollarOutlined />,
      color: colors.status.success,
    },
    {
      title: 'Pipeline Value',
      value: formatMoneyShort(kpis.pipelineValue),
      icon: <RiseOutlined />,
      color: colors.text.primary,
    },
    {
      title: 'Outstanding',
      value: formatMoneyShort(kpis.outstanding),
      icon: <DollarOutlined />,
      color: colors.status.warning,
    },
    { title: 'Active Leads', value: kpis.activeLeads, icon: <TeamOutlined /> },
    { title: 'Open Quotations', value: kpis.openQuotations, icon: <FileTextOutlined /> },
    { title: 'Total Orders', value: kpis.totalOrders, icon: <ShoppingCartOutlined /> },
  ];

  const revenueChart = {
    backgroundColor: 'transparent',
    grid: { left: 60, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: revenueByMonth.map((m) => m.month),
      axisLine: { lineStyle: { color: colors.border } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => `₹${v / 100000}L` },
      splitLine: { lineStyle: { color: colors.border } },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ name: string; value: number }>) =>
        `${params[0].name}<br/>${formatMoney(params[0].value)}`,
    },
    series: [
      {
        type: 'bar',
        data: revenueByMonth.map((m) => m.amount),
        itemStyle: { color: colors.gold.primary, borderRadius: [4, 4, 0, 0] },
        barWidth: '50%',
      },
    ],
  };

  const stageBlock = (label: string, counts: Record<string, number>) => (
    <div>
      <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>{label}</Text>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.keys(counts).length === 0 && <Text type="secondary">No records</Text>}
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StatusTag status={status} />
            <Text strong>{count}</Text>
          </div>
        ))}
      </div>
    </div>
  );

  const todayEnquiryColumns: ColumnsType<TodayEnquiry> = [
    {
      title: 'Contact',
      dataIndex: 'contactName',
      render: (name: string, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
            {row.contactPhone || '—'}
          </Text>
        </div>
      ),
    },
    { title: 'Treatment', dataIndex: 'treatmentName', render: (v: string | null) => v || '—' },
    { title: 'Type', dataIndex: 'enquiryType', render: (v: string | null) => v || '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      width: 90,
      render: (v: string) => formatTime(v),
    },
  ];

  const followUpColumns: ColumnsType<DueFollowUp> = [
    {
      title: 'Enquiry',
      dataIndex: 'contactName',
      render: (name: string, row) => (
        <Space>
          <span style={{ fontWeight: 600 }}>{name}</span>
          {row.leadStatus && <StatusTag status={row.leadStatus} />}
        </Space>
      ),
    },
    { title: 'Discussion Notes', dataIndex: 'note', render: (v: string | null) => v || '—' },
    {
      title: 'Assigned',
      dataIndex: 'assignedToName',
      render: (v: string | null) => v || '—',
    },
  ];

  return (
    <div>
      <SalesNav />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Title level={3} style={{ marginTop: 0 }}>
            Sales Pipeline
          </Title>
          <Text style={{ color: colors.text.secondary }}>
            Lead → Quotation → Order → Delivery → Payment. Conversion rate:{' '}
            <strong>{kpis.conversionRate}%</strong>
          </Text>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setSaleOpen(true)}>
          New Sale
        </Button>
      </div>

      <NewSaleModal open={saleOpen} onClose={() => setSaleOpen(false)} />

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        {kpiCards.map((kpi) => (
          <Col xs={12} md={8} xl={6} key={kpi.title}>
            <Card>
              <Statistic
                title={kpi.title}
                value={kpi.value}
                prefix={kpi.icon}
                valueStyle={{ color: kpi.color ?? colors.text.primary, fontSize: 20 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <Card title={`Today's Enquiries (${today.enquiries})`}>
            <Table<TodayEnquiry>
              rowKey="id"
              size="small"
              columns={todayEnquiryColumns}
              dataSource={todayEnquiries}
              pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
              onRow={(row) => ({
                onClick: () => router.push(`/admin/sales/enquiries/${row.id}`),
                style: { cursor: 'pointer' },
              })}
              locale={{ emptyText: <Empty description="No enquiries registered today" /> }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title={`Follow-ups Due Today (${today.followupsDue})`}>
            <Table<DueFollowUp>
              rowKey="id"
              size="small"
              columns={followUpColumns}
              dataSource={followupsDueToday}
              pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
              onRow={(row) => ({
                onClick: () => router.push(`/admin/sales/enquiries/${row.leadId}/followups`),
                style: { cursor: 'pointer' },
              })}
              locale={{ emptyText: <Empty description="No follow-ups due today" /> }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={14}>
          <Card title="Revenue — Last 6 Months">
            <ReactECharts option={revenueChart} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Pipeline Breakdown" style={{ height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {stageBlock('Leads', pipeline.leads)}
              {stageBlock('Quotations', pipeline.quotations)}
              {stageBlock('Orders', pipeline.orders)}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Salesperson Performance" style={{ marginTop: 16 }}>
        <Table
          rowKey="staffId"
          dataSource={salespeople}
          pagination={false}
          locale={{ emptyText: <Empty description="No sales activity yet" /> }}
          columns={[
            { title: 'Salesperson', dataIndex: 'name' },
            { title: 'Leads', dataIndex: 'leads', width: 100 },
            { title: 'Quotations', dataIndex: 'quotations', width: 120 },
            { title: 'Orders', dataIndex: 'orders', width: 100 },
            {
              title: 'Order Value',
              dataIndex: 'orderValue',
              width: 160,
              render: (v: number) => <strong>{formatMoney(v)}</strong>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
