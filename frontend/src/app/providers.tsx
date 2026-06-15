'use client';

import { useState, type ReactNode } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ThemeProvider from '@/theme/ThemeProvider';

/**
 * Client-side provider stack:
 *  - AntdRegistry: SSR-safe Ant Design style extraction for the App Router.
 *  - ThemeProvider: applies live theme tokens from the appearance store
 *    (replaces the old static `antdTheme` config).
 *  - QueryClientProvider: React Query for server-state caching.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <AntdRegistry>
      <ThemeProvider>
        <AntdApp>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </AntdApp>
      </ThemeProvider>
    </AntdRegistry>
  );
}
