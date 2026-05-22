import type { Config } from 'tailwindcss';

/**
 * Black & Gold design theme (per Welona Developer Reference Architecture, section 2).
 * Tailwind preflight is disabled to avoid conflicts with Ant Design base styles.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        black: {
          primary: '#000000',
          secondary: '#000000',
          tertiary: '#1A1A1A',
        },
        gold: {
          primary: '#FFD700',
          secondary: '#FFD700',
          light: '#F5E6B8',
          dark: '#B8860B',
        },
        status: {
          success: '#4CAF50',
          warning: '#FFB300',
          error: '#E53935',
          info: '#2196F3',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
