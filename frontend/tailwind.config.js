/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#09090B',
        surface: {
          DEFAULT: '#18181B',
          raised: '#27272A',
        },
        edge: '#27272A',
        accent: {
          DEFAULT: '#8B5CF6',
          to: '#6366F1',
        },

      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(139, 92, 246, 0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
