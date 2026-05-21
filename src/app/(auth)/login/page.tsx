'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Form, Input, Typography, App } from 'antd';
import { LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons';
import { useLogin, useVerifyOtp, isTwoFactorChallenge } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { ApiClientError } from '@/lib/api-client';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Title, Text } = Typography;

interface CredentialsForm {
  identifier: string;
  password: string;
}

/** State carried between the two sign-in steps. */
interface PendingChallenge {
  challengeId: string;
  sentTo: string;
  devOtp?: string;
}

/**
 * Staff sign-in (sections 6.1, 7.1).
 *
 * Two-step flow: email + password, then a mandatory 2FA code. Both steps call
 * the real /api/v1/auth endpoints; the session is established via httpOnly
 * cookies set by the server.
 */
export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const setSession = useAuthStore((s) => s.setSession);
  const colors = useBrandColors();

  const login = useLogin();
  const verifyOtp = useVerifyOtp();
  const [challenge, setChallenge] = useState<PendingChallenge | null>(null);

  const fail = (error: unknown, fallback: string) => {
    message.error(error instanceof ApiClientError ? error.message : fallback);
  };

  const onSubmitCredentials = async (values: CredentialsForm) => {
    try {
      const result = await login.mutateAsync(values);
      if (isTwoFactorChallenge(result)) {
        setChallenge({
          challengeId: result.challengeId,
          sentTo: result.sentTo,
          devOtp: result.devOtp,
        });
      } else {
        // 2FA disabled for this account — signed in directly.
        setSession(result.user);
        message.success('Welcome back to Welona');
        router.replace('/');
      }
    } catch (error) {
      fail(error, 'Sign in failed. Please try again.');
    }
  };

  const onSubmitOtp = async (values: { otp: string }) => {
    if (!challenge) return;
    try {
      await verifyOtp.mutateAsync({ challengeId: challenge.challengeId, otp: values.otp });
      message.success('Welcome back to Welona');
      router.replace('/');
    } catch (error) {
      fail(error, 'Verification failed. Please try again.');
    }
  };

  return (
    <Card
      style={{ width: 400, maxWidth: '100%', border: `1px solid ${colors.border}` }}
      styles={{ body: { padding: 32 } }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Title level={3} style={{ margin: 0, letterSpacing: 4, color: colors.gold.primary }}>
          WELONA
        </Title>
        <Text style={{ color: colors.text.secondary, fontSize: 12, letterSpacing: 2 }}>
          HEALTH &amp; WELLNESS — ADMIN
        </Text>
      </div>

      {challenge ? (
        <>
          <Alert
            type="info"
            showIcon
            icon={<SafetyOutlined />}
            message="Two-factor verification"
            description={`Enter the 6-digit code sent to ${challenge.sentTo}.`}
            style={{ marginBottom: 16 }}
          />
          {challenge.devOtp && (
            <Alert
              type="warning"
              showIcon
              message={`Development code: ${challenge.devOtp}`}
              style={{ marginBottom: 16 }}
            />
          )}
          <Form<{ otp: string }> layout="vertical" onFinish={onSubmitOtp} requiredMark={false} size="large">
            <Form.Item
              name="otp"
              label="Verification code"
              rules={[{ required: true, pattern: /^\d{6}$/, message: 'Enter the 6-digit code' }]}
            >
              <Input
                prefix={<SafetyOutlined />}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 8 }}>
              <Button type="primary" htmlType="submit" block loading={verifyOtp.isPending}>
                Verify &amp; Sign In
              </Button>
            </Form.Item>
          </Form>
          <Button
            type="link"
            block
            onClick={() => setChallenge(null)}
            style={{ color: colors.text.placeholder }}
          >
            Back to sign in
          </Button>
        </>
      ) : (
        <Form<CredentialsForm>
          layout="vertical"
          onFinish={onSubmitCredentials}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="identifier"
            label="Email or Phone"
            rules={[{ required: true, message: 'Enter your email or phone' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin@welona.com" autoComplete="username" />
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

          <Text
            style={{
              color: colors.text.placeholder,
              fontSize: 12,
              display: 'block',
              textAlign: 'center',
            }}
          >
            Admin roles require 2FA verification after sign-in.
          </Text>
        </Form>
      )}
    </Card>
  );
}
