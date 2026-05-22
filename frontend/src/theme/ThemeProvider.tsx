'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { ConfigProvider, theme as antdThemeNs } from 'antd';
import type { ThemeConfig } from 'antd';
import { useThemeStore } from '@/store/themeStore';
import { tokensToPalette } from '@/hooks/useBrandColors';

/**
 * Build the live Ant Design theme config from the store's tokens.
 * Same overrides as the original `src/theme/antdTheme.ts`, just sourced
 * from the live palette instead of the static constant.
 */
function buildAntdTheme(palette: ReturnType<typeof tokensToPalette>): ThemeConfig {
  return {
    algorithm: antdThemeNs.defaultAlgorithm,
    token: {
      colorPrimary: palette.gold.primary,
      colorBgBase: palette.black.primary,
      colorBgContainer: palette.black.secondary,
      colorBgElevated: palette.black.secondary,
      colorBgLayout: palette.black.primary,
      colorText: palette.text.primary,
      colorTextSecondary: palette.text.secondary,
      colorTextPlaceholder: palette.text.placeholder,
      colorBorder: palette.border,
      colorBorderSecondary: palette.border,
      borderRadius: 8,
      fontFamily: "'Poppins', system-ui, sans-serif",
      colorSuccess: palette.status.success,
      colorWarning: palette.status.warning,
      colorError: palette.status.error,
      colorInfo: palette.status.info,
    },
    components: {
      Layout: {
        siderBg: palette.black.secondary,
        headerBg: palette.black.secondary,
        bodyBg: palette.black.primary,
        triggerBg: palette.black.tertiary,
        triggerColor: palette.text.primary,
      },
      Menu: {
        itemBg: palette.black.secondary,
        subMenuItemBg: palette.black.secondary,
        itemSelectedBg: palette.gold.primary,
        itemSelectedColor: palette.text.onGold,
        itemHoverBg: palette.black.tertiary,
        itemColor: palette.text.primary,
      },
      Card: {
        colorBgContainer: palette.black.secondary,
      },
      Button: {
        primaryColor: palette.text.onGold,
      },
    },
  };
}

/**
 * Provides the live Ant Design theme and writes the palette to CSS custom
 * properties on `<html>`, so plain CSS and inline styles can pick the live
 * colours up via `var(--brand-primary)` etc.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const tokens = useThemeStore((s) => s.tokens);
  const palette = useMemo(() => tokensToPalette(tokens), [tokens]);
  const antdTheme = useMemo(() => buildAntdTheme(palette), [palette]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', palette.gold.primary);
    root.style.setProperty('--brand-secondary', palette.gold.secondary);
    root.style.setProperty('--brand-light', palette.gold.light);
    root.style.setProperty('--brand-dark', palette.gold.dark);
    root.style.setProperty('--text-on-brand', palette.text.onGold);
    root.style.setProperty('--bg-primary', palette.black.primary);
    root.style.setProperty('--bg-secondary', palette.black.secondary);
    root.style.setProperty('--bg-tertiary', palette.black.tertiary);
    root.style.setProperty('--text-primary', palette.text.primary);
    root.style.setProperty('--text-secondary', palette.text.secondary);
    root.style.setProperty('--text-placeholder', palette.text.placeholder);
    root.style.setProperty('--border', palette.border);
    root.style.setProperty('--status-success', palette.status.success);
    root.style.setProperty('--status-warning', palette.status.warning);
    root.style.setProperty('--status-error', palette.status.error);
    root.style.setProperty('--status-info', palette.status.info);
  }, [palette]);

  return <ConfigProvider theme={antdTheme}>{children}</ConfigProvider>;
}
