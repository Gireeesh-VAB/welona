import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Welona Admin',
  description: 'Welona Health & Wellness — Enterprise Admin Panel',
};

export const viewport: Viewport = {
  themeColor: '#F8F4ED', // warm ivory — matches colors.black.primary
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
