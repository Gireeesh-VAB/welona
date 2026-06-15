'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Form, Input, Typography, App } from 'antd';
import { LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons';
import { useAdminLogin } from '@/hooks/useAdminAuth';
import { ApiClientError } from '@/lib/api-client';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Title, Text } = Typography;

interface CredentialsForm {
  identifier: string;
  password: string;
}

const TEST_CREDENTIALS = {
  identifier: 'superadmin@welona.com',
  password: 'Welona@123',
};

/**
 * Admin sign-in — separate from /login (employee). Posts to
 * /api/v1/auth/admin/login and lands at /admin on success.
 *
 * This page is rendered inside the (auth) layout group? No — admin/login is
 * intentionally outside the (auth) group so the visual design can differ from
 * employee login. The container styles are inlined.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const login = useAdminLogin();
  const colors = useBrandColors();
  const [form] = Form.useForm<CredentialsForm>();

  const fail = (error: unknown, fallback: string) => {
    message.error(error instanceof ApiClientError ? error.message : fallback);
  };

  const handleAutoFill = () => {
    form.setFieldsValue(TEST_CREDENTIALS);
    // Submit immediately so it works in one click on live
    setTimeout(() => form.submit(), 50);
  };

  const onSubmit = async (values: CredentialsForm) => {
    try {
      await login.mutateAsync(values);
      message.success('Welcome to the admin console');
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
        background:
          'radial-gradient(circle at 50% 0%, #FFFFFF 0%, #EFE9DC 70%)',
        padding: 24,
      }}
    >
      <Card
        style={{ width: 420, maxWidth: '100%', border: `1px solid ${colors.gold.primary}` }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyOutlined
            style={{ fontSize: 32, color: colors.gold.primary, marginBottom: 8 }}
          />
          <Title level={3} style={{ margin: 0, letterSpacing: 4, color: colors.gold.primary }}>
            WELONA
          </Title>
          <Text style={{ color: colors.gold.light, fontSize: 11, letterSpacing: 3 }}>
            ADMIN CONSOLE
          </Text>
          <div style={{ marginTop: 12 }}>
            <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
              Restricted to authorised administrators only.
            </Text>
          </div>
        </div>

        <Form<CredentialsForm>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="identifier"
            label="Admin email"
            rules={[{ required: true, message: 'Enter your admin email' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="superadmin@welona.com"
              autoComplete="username"
            />
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
              Sign In to Admin Console
            </Button>
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="dashed"
              block
              onClick={handleAutoFill}
              loading={login.isPending}
              style={{ color: colors.text.placeholder, borderColor: colors.border }}
            >
              Use test credentials
            </Button>
          </Form.Item>

          <div style={{
            paddingTop: 16,
            borderTop: `1px solid ${colors.border}`,
            textAlign: 'center',
          }}>
            <Link href="/login" style={{
              fontSize: 12,
              color: colors.text.placeholder,
              textDecoration: 'none',
            }}>
              ← Branch Portal Login
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
