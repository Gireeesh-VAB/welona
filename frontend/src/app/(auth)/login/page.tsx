'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const TEST_CREDENTIALS = {
  identifier: 'rohit.sharma',
  password: 'welona@123',
};

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
  const [loginSource, setLoginSource] = useState<'manual' | 'demo' | null>(null);
  const [form] = Form.useForm<CredentialsForm>();

  const fail = (error: unknown, fallback: string) => {
    message.error(error instanceof ApiClientError ? error.message : fallback);
  };

  const handleAutoFill = () => {
    setLoginSource('demo');
    form.setFieldsValue(TEST_CREDENTIALS);
    setTimeout(() => form.submit(), 50);
  };

  const onSubmitCredentials = async (values: CredentialsForm) => {
    if (loginSource !== 'demo') setLoginSource('manual');
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
    } finally {
      setLoginSource(null);
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
    <div style={{
      width: 420,
      maxWidth: '100%',
      background: 'rgba(255,255,255,0.97)',
      borderRadius: 20,
      boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      overflow: 'hidden',
    }}>
      {/* Top accent bar */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)' }} />

      <div style={{ padding: '36px 36px 32px' }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            marginBottom: 14,
          }}>
            <span style={{ fontSize: 22, color: '#fff', fontWeight: 700 }}>W</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Welona</div>
          <div style={{ fontSize: 12, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Branch Portal</div>
        </div>

        {challenge ? (
          <>
            <Alert
              type="info"
              showIcon
              icon={<SafetyOutlined />}
              message="Two-factor verification"
              description={`Enter the 6-digit code sent to ${challenge.sentTo}.`}
              style={{ marginBottom: 16, borderRadius: 10 }}
            />
            {challenge.devOtp && (
              <Alert
                type="warning"
                showIcon
                message={`Development code: ${challenge.devOtp}`}
                style={{ marginBottom: 16, borderRadius: 10 }}
              />
            )}
            <Form<{ otp: string }> layout="vertical" onFinish={onSubmitOtp} requiredMark={false} size="large">
              <Form.Item
                name="otp"
                label={<span style={{ color: '#475569', fontWeight: 500, fontSize: 13 }}>Verification code</span>}
                rules={[{ required: true, pattern: /^\d{6}$/, message: 'Enter the 6-digit code' }]}
              >
                <Input
                  prefix={<SafetyOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 8 }}>
                <Button type="primary" htmlType="submit" block loading={verifyOtp.isPending}
                  style={{ height: 46, borderRadius: 10, background: 'linear-gradient(90deg, #6366f1, #06b6d4)', border: 'none', fontWeight: 600, fontSize: 14 }}>
                  Verify &amp; Sign In
                </Button>
              </Form.Item>
            </Form>
            <Button type="link" block onClick={() => setChallenge(null)} style={{ color: '#94a3b8', fontSize: 13 }}>
              Back to sign in
            </Button>
          </>
        ) : (
          <Form<CredentialsForm>
            form={form}
            layout="vertical"
            onFinish={onSubmitCredentials}
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="identifier"
              label={<span style={{ color: '#475569', fontWeight: 500, fontSize: 13 }}>Username</span>}
              rules={[{ required: true, message: 'Enter your username' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="rohit.sharma" autoComplete="username"
                style={{ borderRadius: 10, height: 46 }} />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ color: '#475569', fontWeight: 500, fontSize: 13 }}>Password</span>}
              rules={[{ required: true, message: 'Enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ borderRadius: 10, height: 46 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 10, marginTop: 4 }}>
              <Button type="primary" htmlType="submit" block loading={login.isPending && loginSource === 'manual'}
                disabled={login.isPending}
                style={{ height: 48, borderRadius: 10, background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)', border: 'none', fontWeight: 600, fontSize: 14, letterSpacing: '0.01em' }}>
                Sign In
              </Button>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button block onClick={handleAutoFill} loading={login.isPending && loginSource === 'demo'}
                disabled={login.isPending}
                style={{ height: 42, borderRadius: 10, border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 13, background: '#f8fafc' }}>
                Use test credentials
              </Button>
            </Form.Item>

            <p style={{ color: '#cbd5e1', fontSize: 11, textAlign: 'center', marginTop: 14, marginBottom: 0 }}>
              Roles with 2FA enabled will be prompted after sign-in.
            </p>

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <Link href="/admin/login" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, letterSpacing: '0.04em', textDecoration: 'none' }}>
                Admin Panel →
              </Link>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}
