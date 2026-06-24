/**
 * Auth layout group — centered card, no sidebar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 0%, #FFFFFF 0%, #EFE9DC 70%)',
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}
