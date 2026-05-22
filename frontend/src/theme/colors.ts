/**
 * Welona theme — "Sage on Ivory" premium light palette.
 *
 * A wellness-appropriate light theme: warm ivory page background, pure white
 * cards, deep sage green brand accent, warm cream borders and deep forest
 * text. Status colours are intentionally desaturated so they sit naturally
 * next to the sage accent rather than fighting it.
 *
 * Every value here is the *default* — the actual runtime palette is held in
 * `src/store/themeStore.ts` and can be overridden per-browser from the
 * Appearance settings page. The hook `useBrandColors()` returns the live
 * palette; this file is what every "reset to defaults" button restores.
 *
 * The exported shape (the keys `black`, `gold`, `text`, etc.) is kept for
 * backwards compatibility with code that already imports `colors.gold.primary`
 * etc. — only the colour values have changed. The legacy names no longer
 * literally mean "black" or "gold"; they are the structural slots:
 *   - `black.*`  → background tones
 *   - `gold.*`   → brand accent tones
 *   - `text.*`   → foreground tones
 */
export const colors = {
  black: {
    primary: '#F8F4ED', // Main page background — warm ivory
    secondary: '#FFFFFF', // Cards, sidebar, header — pure white
    tertiary: '#EFE9DC', // Hover states, form inputs
  },
  gold: {
    primary: '#4F6F52', // Brand accent — deep sage green
    secondary: '#6B8E5A', // Highlights, focus rings, badges
    light: '#C8D6BC', // Subtle accents, disabled brand
    dark: '#3A5C3F', // Pressed states, visited links — forest sage
  },
  text: {
    primary: '#1F2622', // Deep forest near-black, on light surfaces
    secondary: '#4A5550', // Subtler body text
    placeholder: '#8B948E', // Form placeholders, captions
    onGold: '#FFFFFF', // Foreground on sage fill
  },
  border: '#E5DDC9', // Warm cream border
  status: {
    success: '#4A7C4A', // Forest green
    warning: '#B8842E', // Deep amber
    error: '#A8473D', // Terracotta
    info: '#4A6FA0', // Steel blue
  },
  /** Brand gradient palette used for charts. */
  chartPalette: ['#4F6F52', '#6B8E5A', '#C8D6BC', '#B8842E', '#A8473D', '#4A6FA0'],
} as const;
