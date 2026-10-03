/** @type {import('tailwindcss').Config} */
// Same look as SAIP / FIP: deep navy "ink" greys, teal accent, Inter, soft card shadows.
// The app's original colour names are mapped onto SAIP's palette, so every page follows it:
//   slate-* → SAIP ink greys · navy → ink-900 · brand / blue-* → SAIP teal accent.
const ink = {
  50: '#f4f6fb', 100: '#e7ecf5', 200: '#c9d4e8', 300: '#9bb0d0', 400: '#6983b0',
  500: '#4a6496', 600: '#384e7c', 700: '#2c3d62', 800: '#1f2b46', 900: '#131b2e', 950: '#0a1020',
}
const accent = {
  50: '#effcf8', 100: '#cbf7ec', 200: '#97eedb', 300: '#5be0c8', 400: '#2ac9b3',
  500: '#12ad98', 600: '#0a8c7c', 700: '#0b7065', 800: '#0d594f', 900: '#0d4a42', 950: '#06302b',
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink,
        accent,
        slate: ink,
        blue: accent,
        navy: ink[900],
        brand: accent[600],
        success: { 500: '#16a34a', 600: '#15803d' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        danger: { 500: '#ef4444', 600: '#dc2626' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(19,27,46,0.04), 0 1px 3px 0 rgba(19,27,46,0.06)',
        'card-hover': '0 4px 12px -2px rgba(19,27,46,0.10), 0 2px 6px -1px rgba(19,27,46,0.06)',
        float: '0 10px 30px -10px rgba(19,27,46,0.20)',
      },
      keyframes: {
        fadein: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fadein .2s ease-out',
      },
    },
  },
  plugins: [],
}
