'use client';

import { useThemeStore, type ThemeTokens } from '@/store/themeStore';
import { colors as staticColors } from '@/theme/colors';

/**
 * Live, store-backed colour palette in the same shape as the static
 * `@/theme/colors` export. Components that previously imported `colors`
 * directly can switch to:
 *
 *     const colors = useBrandColors();
 *
 * and any change made on the appearance settings page propagates
 * immediately. The chart palette and `onGold` alias are kept identical to
 * the original module so downstream code does not need to change shape.
 */
export function useBrandColors(): typeof staticColors {
  const t = useThemeStore((s) => s.tokens);
  return tokensToPalette(t);
}

/** Pure transformer so non-React code can reuse the mapping (e.g. ThemeProvider). */
export function tokensToPalette(t: ThemeTokens): typeof staticColors {
  return {
    black: {
      primary: t.bgPrimary,
      secondary: t.bgSecondary,
      tertiary: t.bgTertiary,
    },
    gold: {
      primary: t.brandPrimary,
      secondary: t.brandSecondary,
      light: t.brandLight,
      dark: t.brandDark,
    },
    text: {
      primary: t.textPrimary,
      secondary: t.textSecondary,
      placeholder: t.textPlaceholder,
      onGold: t.textOnBrand,
    },
    border: t.border,
    status: {
      success: t.statusSuccess,
      warning: t.statusWarning,
      error: t.statusError,
      info: t.statusInfo,
    },
    chartPalette: [
      t.brandPrimary,
      t.brandLight,
      t.brandDark,
      t.brandSecondary,
      t.statusSuccess,
      t.statusInfo,
    ],
  } as typeof staticColors;
}
