/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}', // 包含 ui 包的源文件
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          500: '#8b5cf6',
        },
        surface: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e7eb',
          800: '#1f2937',
          900: '#111827',
        },
        status: {
          online: '#10b981',
          away: '#f59e0b',
          busy: '#ef4444',
          offline: '#9ca3af',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      borderRadius: {
        message: '18px',
        avatar: '24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
