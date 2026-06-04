'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Form, Input, Typography, App } from 'antd';
import { LockOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { useBranchLogin } from '@/hooks/useBranchAuth';
import { ApiClientError } from '@/lib/api-client';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Title, Text } = Typography;

interface CredentialsForm {
  identifier: string;
  password: string;
}

/**
 * Branch sign-in — for branch (SystemUser) accounts. Posts to
 * /api/v1/auth/branch/login and lands in the panel scoped to that branch.
 * Separate from /admin/login (super-admin) and /login (employee).
 */
/** Demo branch account auto-filled by the "Fill demo credentials" button. */
const DEMO_BRANCH_CREDENTIALS: CredentialsForm = {
  identifier: 'rohit.sharma',
  password: 'welona@123',
};

export default function BranchLoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const login = useBranchLogin();
  const colors = useBrandColors();
  const [form] = Form.useForm<CredentialsForm>();

  const fail = (error: unknown, fallback: string) => {
    message.error(error instanceof ApiClientError ? error.message : fallback);
  };

  const onSubmit = async (values: CredentialsForm) => {
    try {
      const result = await login.mutateAsync(values);
      message.success(
        result.user.branchName
          ? `Signed in — ${result.user.branchName}`
          : 'Signed in',
      );
      router.replace('/admin');
    } catch (error) {
      fail(error, 'Sign in failed. Please try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 0%, #FFFFFF 0%, #EFE9DC 70%)',
        padding: 24,
      }}
    >
      <Card
        style={{ width: 420, maxWidth: '100%', border: `1px solid ${colors.gold.primary}` }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <ShopOutlined style={{ fontSize: 32, color: colors.gold.primary, marginBottom: 8 }} />
          <Title level={3} style={{ margin: 0, letterSpacing: 4, color: colors.gold.primary }}>
            WELONA
          </Title>
          <Text style={{ color: colors.gold.light, fontSize: 11, letterSpacing: 3 }}>
            BRANCH LOGIN
          </Text>
          <div style={{ marginTop: 12 }}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
              Sign in to manage your branch&apos;s stock and catalog.
            </Text>
          </div>
        </div>

        <Form<CredentialsForm> form={form} layout="vertical" onFinish={onSubmit} requiredMark={false} size="large">
          <Form.Item
            name="identifier"
            label="Username"
            rules={[{ required: true, message: 'Enter your branch username' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="chennai.front" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={login.isPending}>
              Sign In
            </Button>
          </Form.Item>

          <Button
            block
            onClick={() => form.setFieldsValue(DEMO_BRANCH_CREDENTIALS)}
            style={{ borderStyle: 'dashed', borderColor: colors.gold.primary, color: colors.gold.primary }}
          >
            Fill demo credentials
          </Button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Button
              type="link"
              onClick={() => router.push('/admin/login')}
              style={{ color: colors.text.placeholder, fontSize: 12 }}
            >
              Admin console login →
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
