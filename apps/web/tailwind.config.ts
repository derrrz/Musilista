import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--ml-bg)',
        surface: 'var(--ml-surface)',
        raised: 'var(--ml-raised)',
        line: 'var(--ml-line)',
        ink: 'var(--ml-ink)',
        muted: 'var(--ml-muted)',
        faint: 'var(--ml-faint)',
        accent: 'var(--ml-accent)',
        'accent-ink': 'var(--ml-accent-ink)',
      },
      fontFamily: {
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
