'use client';

import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  List,
  Row,
  Table,
  Typography,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useCashCounts, useCreateCashCount } from '@/hooks/useCash';
import { ApiClientError } from '@/lib/api-client';
import { CASH_DENOMINATIONS } from '@/lib/enums';
import { formatDate, formatMoney } from '@/lib/format';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

/** Cash Denomination — count the cash drawer note-by-note. */
export default function CashDenominationPage() {
  const { message } = App.useApp();
  const { data: history } = useCashCounts();
  const createCount = useCreateCashCount();

  const [counts, setCounts] = useState<Record<number, number>>({});
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');

  // Grand total in rupees.
  const grandTotal = useMemo(
    () => CASH_DENOMINATIONS.reduce((sum, d) => sum + d * (counts[d] || 0), 0),
    [counts],
  );

  const save = async () => {
    const breakdown: Record<string, number> = {};
    for (const d of CASH_DENOMINATIONS) if (counts[d]) breakdown[String(d)] = counts[d];
    if (Object.keys(breakdown).length === 0) {
      message.warning('Enter at least one denomination count');
      return;
    }
    try {
      await createCount.mutateAsync({
        breakdown,
        label: label || undefined,
        note: note || undefined,
      });
      message.success('Cash count saved');
      setCounts({});
      setLabel('');
      setNote('');
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not save count');
    }
  };

  const rows = CASH_DENOMINATIONS.map((d) => ({ denom: d, count: counts[d] || 0 }));

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Cash Denomination
      </Title>
      <Text type="secondary">Count physical cash note-by-note and record the total.</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Count">
            <Table
              rowKey="denom"
              size="small"
              pagination={false}
              dataSource={rows}
              columns={[
                {
                  title: 'Denomination',
                  dataIndex: 'denom',
                  render: (d: number) => <Text strong>₹{d}</Text>,
                },
                {
                  title: 'Count',
                  dataIndex: 'count',
                  width: 140,
                  render: (_: number, row) => (
                    <InputNumber
                      min={0}
                      value={counts[row.denom] || 0}
                      onChange={(v) =>
                        setCounts((c) => ({ ...c, [row.denom]: Number(v) || 0 }))
                      }
                      style={{ width: '100%' }}
                    />
                  ),
                },
                {
                  title: 'Amount',
                  key: 'amount',
                  align: 'right',
                  render: (_, row) => `₹${(row.denom * (counts[row.denom] || 0)).toLocaleString('en-IN')}`,
                },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>Grand Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong style={{ color: colors.gold.primary, fontSize: 16 }}>
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            <Input
              placeholder="Label (e.g. Morning count, Closing count)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ marginTop: 16 }}
            />
            <Input.TextArea
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              style={{ marginTop: 12 }}
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={createCount.isPending}
              onClick={save}
              style={{ marginTop: 12 }}
            >
              Save Count
            </Button>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Recent Counts">
            <List
              dataSource={history ?? []}
              locale={{ emptyText: <Empty description="No counts recorded yet" /> }}
              renderItem={(c) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span>
                        {formatMoney(c.total)}
                        {c.label ? <Text type="secondary"> · {c.label}</Text> : null}
                      </span>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(c.countedAt)}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
