/**
 * Auth layout group — centered card, no sidebar.
 * Source: Developer Reference Architecture v2.0, section 4.4.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 50% 0%, #FFFFFF 0%, #F8F4ED 60%)',
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}
