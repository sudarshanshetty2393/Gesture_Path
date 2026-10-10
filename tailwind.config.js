/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Semantic colours — values live in src/index.css (light + dark).
      colors: {
        canvas: token('canvas'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2'), 3: token('surface-3') },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
        brand: { DEFAULT: token('brand'), hover: token('brand-hover'), soft: token('brand-soft'), ink: token('brand-ink') },
        sign: { DEFAULT: token('sign'), soft: token('sign-soft'), ink: token('sign-ink') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        warn: { DEFAULT: token('warn'), soft: token('warn-soft'), ink: token('warn-ink') },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
        lift: '0 2px 4px rgb(15 23 42 / 0.04), 0 16px 40px -12px rgb(15 23 42 / 0.18)',
        ring: '0 0 0 4px rgb(var(--brand) / 0.15)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'sheet-in': { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'float-a': { '0%, 100%': { transform: 'translate(0, 0) scale(1)' }, '50%': { transform: 'translate(40px, -30px) scale(1.08)' } },
        'float-b': { '0%, 100%': { transform: 'translate(0, 0) scale(1)' }, '50%': { transform: 'translate(-50px, 35px) scale(0.94)' } },
        drift: { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '48px 48px' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        scan: { '0%': { top: '6%', opacity: '0' }, '10%': { opacity: '1' }, '90%': { opacity: '1' }, '100%': { top: '94%', opacity: '0' } },
        pop: { '0%': { transform: 'scale(0.85)', opacity: '0' }, '60%': { transform: 'scale(1.05)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
        'bar-fill': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out both',
        'rise-in': 'rise-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'rise-in-slow': 'rise-in 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'sheet-in': 'sheet-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'float-a': 'float-a 14s ease-in-out infinite',
        'float-b': 'float-b 18s ease-in-out infinite',
        drift: 'drift 6s linear infinite',
        'spin-slow': 'spin-slow 6s linear infinite',
        scan: 'scan 2.6s ease-in-out infinite',
        pop: 'pop 380ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'bar-fill': 'bar-fill 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};
