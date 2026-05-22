/**
 * Root layout for the backend (Next.js API-only).
 *
 * Next.js' app router requires a root layout even when no UI is served.
 * Hitting the backend in a browser shows a tiny "API only" notice.
 */
export const metadata = {
  title: 'Welona Admin Backend',
  description: 'API for the Welona Admin Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>{children}</body>
    </html>
  );
}
