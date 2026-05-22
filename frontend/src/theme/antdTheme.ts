import type { ThemeConfig } from 'antd';
import { theme } from 'antd';
import { colors } from './colors';

/**
 * Ant Design theme token override implementing the Black & Gold theme.
 * Source: Developer Reference Architecture v2.0, section 2.4.
 */
export const antdTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: colors.gold.primary,
    colorBgBase: colors.black.primary,
    colorBgContainer: colors.black.secondary,
    // Drawers, modals and dropdowns — pure black, same as everything else.
    colorBgElevated: colors.black.primary,
    colorText: colors.text.primary,
    colorTextSecondary: colors.text.secondary,
    colorBorder: colors.border,
    colorBorderSecondary: colors.border,
    borderRadius: 8,
    fontFamily: "'Poppins', system-ui, sans-serif",
    colorSuccess: colors.status.success,
    colorWarning: colors.status.warning,
    colorError: colors.status.error,
    colorInfo: colors.status.info,
  },
  components: {
    Layout: {
      siderBg: colors.black.secondary,
      headerBg: colors.black.secondary,
      bodyBg: colors.black.primary,
      triggerBg: colors.black.tertiary,
    },
    Menu: {
      darkItemBg: colors.black.secondary,
      darkSubMenuItemBg: colors.black.primary,
      darkItemSelectedBg: colors.gold.primary,
      darkItemSelectedColor: colors.text.onGold,
      darkItemHoverBg: colors.black.tertiary,
    },
    Card: {
      colorBgContainer: colors.black.secondary,
    },
    Button: {
      primaryColor: colors.text.onGold,
    },
  },
};
