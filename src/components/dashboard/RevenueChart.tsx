'use client';

import ReactECharts from 'echarts-for-react';
import { colors } from '@/theme/colors';

/**
 * Revenue trend chart. Uses the gold gradient palette (section 2.5).
 * Replace the static series with data from `GET /api/v1/admin/revenue`.
 */
export default function RevenueChart() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const option = {
    backgroundColor: 'transparent',
    color: colors.chartPalette,
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['Revenue', 'Bookings'],
      textStyle: { color: colors.text.secondary },
    },
    grid: { left: 48, right: 24, top: 48, bottom: 32 },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.text.placeholder },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.text.placeholder },
      splitLine: { lineStyle: { color: colors.border } },
    },
    series: [
      {
        name: 'Revenue',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: [420, 480, 510, 590, 640, 700, 760, 720, 810, 880, 940, 1020],
      },
      {
        name: 'Bookings',
        type: 'bar',
        data: [120, 132, 141, 154, 168, 182, 195, 188, 210, 226, 240, 262],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 340 }} />;
}
