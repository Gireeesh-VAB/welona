'use client';

import { useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useDayCloseSummary, useDayCloses, useCreateDayClose } from '@/hooks/useCash';
import { ApiClientError } from '@/lib/api-client';
import { formatDate, formatMoney, toMinorUnits } from '@/lib/format';
import type { DayClose } from '@/types/cash';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Day Closer — reconcile and close out a day's cash. */
export default function DayClosePage() {
  const { message } = App.useApp();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const dateStr = date.format('YYYY-MM-DD');

  const { data: summary, isLoading: summaryLoading } = useDayCloseSummary(dateStr);
  const { data: closes, isLoading: closesLoading } = useDayCloses();
  const createClose = useCreateDayClose();

  const [opening, setOpening] = useState(0);
  const [counted, setCounted] = useState(0);
  const [note, setNote] = useState('');

  // Seed the opening balance from the previous day's closing count.
  useEffect(() => {
    if (summary && !summary.alreadyClosed) {
      setOpening(summary.suggestedOpening / 100);
      setCounted(0);
      setNote('');
    }
  }, [summary]);

  const openingMinor = toMinorUnits(opening);
  const countedMinor = toMinorUnits(counted);
  const expectedMinor = summary
    ? openingMinor + summary.cashCollections + summary.pettyCashIn - summary.pettyCashOut
    : 0;
  const differenceMinor = countedMinor - expectedMinor;

  const closeDay = async () => {
    try {
      await createClose.mutateAsync({
        closeDate: date.startOf('day').toISOString(),
        openingCash: openingMinor,
        countedCash: countedMinor,
        note: note || undefined,
      });
      message.success('Day closed');
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not close the day');
    }
  };

  const closed = summary?.close ?? null;

  const closeColumns: ColumnsType<DayClose> = [
    { title: 'Date', dataIndex: 'closeDate', render: (v: string) => formatDate(v) },
    {
      title: 'Expected',
      dataIndex: 'expectedCash',
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    {
      title: 'Counted',
      dataIndex: 'countedCash',
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    {
      title: 'Difference',
      dataIndex: 'difference',
      align: 'right',
      render: (v: number) => (
        <Text style={{ color: v === 0 ? colors.status.success : colors.status.error }}>
          {v > 0 ? '+' : ''}
          {formatMoney(v)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ marginTop: 0 }}>
            Day Closer
          </Title>
          <Text type="secondary">Reconcile the day&apos;s cash and close it out.</Text>
        </div>
        <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} />
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title={`Cash Position — ${date.format('DD MMM YYYY')}`} loading={summaryLoading}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Opening Balance">
                {formatMoney(openingMinor)}
              </Descriptions.Item>
              <Descriptions.Item label="Cash Collections">
                {formatMoney(summary?.cashCollections ?? 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Petty Cash In">
                {formatMoney(summary?.pettyCashIn ?? 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Petty Cash Out">
                − {formatMoney(summary?.pettyCashOut ?? 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Expected in Drawer">
                <Text strong style={{ color: colors.gold.primary }}>
                  {formatMoney(closed ? closed.expectedCash : expectedMinor)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {closed ? (
              <div style={{ marginTop: 16 }}>
                <Tag color="green" icon={<LockOutlined />}>
                  Day Closed
                </Tag>
                <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
                  <Descriptions.Item label="Counted Cash">
                    {formatMoney(closed.countedCash)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Difference">
                    <Text
                      strong
                      style={{
                        color:
                          closed.difference === 0
                            ? colors.status.success
                            : colors.status.error,
                      }}
                    >
                      {closed.difference > 0 ? '+' : ''}
                      {formatMoney(closed.difference)}
                      {closed.difference < 0
                        ? ' (short)'
                        : closed.difference > 0
                          ? ' (excess)'
                          : ' (tallied)'}
                    </Text>
                  </Descriptions.Item>
                  {closed.note ? (
                    <Descriptions.Item label="Note">{closed.note}</Descriptions.Item>
                  ) : null}
                </Descriptions>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <Row gutter={12}>
                  <Col xs={12}>
                    <Text type="secondary">Opening Balance (₹)</Text>
                    <InputNumber
                      min={0}
                      value={opening}
                      onChange={(v) => setOpening(Number(v) || 0)}
                      style={{ width: '100%', marginTop: 4 }}
                    />
                  </Col>
                  <Col xs={12}>
                    <Text type="secondary">Counted Cash (₹)</Text>
                    <InputNumber
                      min={0}
                      value={counted}
                      onChange={(v) => setCounted(Number(v) || 0)}
                      style={{ width: '100%', marginTop: 4 }}
                    />
                  </Col>
                </Row>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    margin: '14px 0',
                  }}
                >
                  <Text strong>Difference (counted − expected)</Text>
                  <Text
                    strong
                    style={{
                      color:
                        differenceMinor === 0 ? colors.status.success : colors.status.error,
                    }}
                  >
                    {differenceMinor > 0 ? '+' : ''}
                    {formatMoney(differenceMinor)}
                  </Text>
                </div>
                <Input.TextArea
                  rows={2}
                  placeholder="Note (optional) — explain any difference"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  type="primary"
                  icon={<LockOutlined />}
                  loading={createClose.isPending}
                  onClick={closeDay}
                  style={{ marginTop: 12 }}
                  block
                >
                  Close Day
                </Button>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Closed Days">
            <Table<DayClose>
              rowKey="id"
              size="small"
              loading={closesLoading}
              columns={closeColumns}
              dataSource={closes ?? []}
              pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
              locale={{ emptyText: <Empty description="No days closed yet" /> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
