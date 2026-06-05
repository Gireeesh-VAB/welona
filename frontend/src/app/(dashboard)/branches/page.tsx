'use client';

import { useState } from 'react';
import { Card, Col, Empty, Input, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { BankOutlined, SearchOutlined, ShopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useBranchList } from '@/hooks/useBranchPortal';
import { useStaff } from '@/hooks/useStaff';
import { colors } from '@/theme/colors';

const { Title, Text } = Typography;

export default function BranchesPage() {
  const [search, setSearch] = useState('');
  const { data: branches, isLoading: branchLoading } = useBranchList();
  const { data: staff } = useStaff();

  const staffByBranch = (branchName: string) =>
    (staff ?? []).filter((s) => s.branchName === branchName).length;

  const filtered = (branches ?? []).filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: ColumnsType<(typeof filtered)[0]> = [
    {
      title: 'Branch Name',
      dataIndex: 'name',
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShopOutlined style={{ color: colors.gold.primary }} />
          <Text style={{ fontWeight: 600 }}>{name}</Text>
        </div>
      ),
    },
    {
      title: 'Staff Count',
      key: 'staffCount',
      align: 'center',
      render: (_, row) => {
        const count = staffByBranch(row.name);
        return <Tag color={count > 0 ? 'gold' : 'default'}>{count} staff</Tag>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: () => <Tag color="green">Active</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            Branches
          </Title>
          <Text style={{ color: colors.text.placeholder }}>All active branches in the organisation.</Text>
        </div>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search branches"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240 }}
          allowClear
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Total Branches</Text>}
              value={branches?.length ?? 0}
              prefix={<BankOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary }}
              loading={branchLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Total Staff</Text>}
              value={staff?.length ?? 0}
              prefix={<ShopOutlined style={{ color: colors.gold.primary }} />}
              valueStyle={{ color: colors.text.primary }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
            <Statistic
              title={<Text style={{ color: colors.text.placeholder }}>Active</Text>}
              value={branches?.length ?? 0}
              suffix={`/ ${branches?.length ?? 0}`}
              valueStyle={{ color: colors.gold.primary }}
              loading={branchLoading}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
        <Spin spinning={branchLoading}>
          {filtered.length === 0 && !branchLoading ? (
            <Empty description="No branches found" />
          ) : (
            <Table
              rowKey="id"
              dataSource={filtered}
              columns={columns}
              pagination={false}
              size="middle"
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
