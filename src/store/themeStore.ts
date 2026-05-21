import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { colors as defaultPalette } from '@/theme/colors';

/**
 * Editable theme tokens. Mirrors the shape of `src/theme/colors.ts` but
 * flattens it to a single record so the settings UI can iterate over keys.
 */
export interface ThemeTokens {
  brandPrimary: string;
  brandSecondary: string;
  brandLight: string;
  brandDark: string;
  textOnBrand: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textPlaceholder: string;
  border: string;
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;
}

/** Factory-default values, copied from the static palette. */
export const DEFAULT_TOKENS: ThemeTokens = {
  brandPrimary: defaultPalette.gold.primary,
  brandSecondary: defaultPalette.gold.secondary,
  brandLight: defaultPalette.gold.light,
  brandDark: defaultPalette.gold.dark,
  textOnBrand: defaultPalette.text.onGold,
  bgPrimary: defaultPalette.black.primary,
  bgSecondary: defaultPalette.black.secondary,
  bgTertiary: defaultPalette.black.tertiary,
  textPrimary: defaultPalette.text.primary,
  textSecondary: defaultPalette.text.secondary,
  textPlaceholder: defaultPalette.text.placeholder,
  border: defaultPalette.border,
  statusSuccess: defaultPalette.status.success,
  statusWarning: defaultPalette.status.warning,
  statusError: defaultPalette.status.error,
  statusInfo: defaultPalette.status.info,
};

interface ThemeState {
  tokens: ThemeTokens;
  /** Update one token at a time (settings page color pickers call this). */
  setToken: (key: keyof ThemeTokens, value: string) => void;
  /** Replace several tokens in one call. */
  setTokens: (next: Partial<ThemeTokens>) => void;
  /** Revert every token to the factory default. */
  reset: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      tokens: { ...DEFAULT_TOKENS },
      setToken: (key, value) =>
        set((state) => ({ tokens: { ...state.tokens, [key]: value } })),
      setTokens: (next) => set((state) => ({ tokens: { ...state.tokens, ...next } })),
      reset: () => set({ tokens: { ...DEFAULT_TOKENS } }),
    }),
    {
      name: 'welona-theme',
      // Bump this whenever the premium default palette changes — any older
      // persisted tokens are discarded and the new defaults take effect on
      // next page load. The user can still customise from the new baseline.
      version: 3,
      migrate: () => ({ tokens: { ...DEFAULT_TOKENS } }),
      // Only the tokens are persisted; methods are recreated on each load.
      partialize: (state) => ({ tokens: state.tokens }),
    },
  ),
);
