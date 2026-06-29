/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#1e293b',
          foreground: '#94a3b8',
          active: '#f1f5f9',
          border: '#0f172a',
        },
        primary: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          light: '#eff6ff',
          ring: '#6366f1',
        },
        surface: {
          DEFAULT: '#e2e8f0',
          muted: '#cbd5e1',
          input: '#f1f5f9',
        },
        border: {
          DEFAULT: '#b6c0cc',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
