/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a1a1a',
          light: '#2a2a2a',
        },
        accent: {
          DEFAULT: '#E4002B', // Powerball red
          dark: '#C4001B',
        },
        card: {
          DEFAULT: '#ffffff',
          light: '#f8f8f8',
          dark: '#222222',
        },
        text: {
          DEFAULT: '#ffffff',
          dark: '#111111',
          muted: '#666666',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 8px 16px rgba(0, 0, 0, 0.1)',
        'button': '0 4px 6px rgba(228, 0, 43, 0.25)',
      },
      container: {
        center: true,
        padding: '1rem',
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-in-out',
        'pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '0.3' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};