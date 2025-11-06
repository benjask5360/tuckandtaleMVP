import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cool, modern blue palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Main blue brand color
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Soft complementary colors
        sky: {
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
        // Neutral with warmth
        sand: {
          50: '#faf9f7',
          100: '#f5f3f0',
          200: '#e8e4df',
          300: '#d6cfc6',
          400: '#b8aca0',
          500: '#9d8f80',
          600: '#847667',
          700: '#6d6156',
          800: '#5a514a',
          900: '#4c4540',
        },
        // Keep neutral grays
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',  // Body text
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      fontFamily: {
        // Warm, friendly fonts
        'sans': ['Nunito Sans', 'Inter', 'system-ui', 'sans-serif'],
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'serif': ['Playfair Display', 'Georgia', 'serif'],
        'story': ['Georgia', 'serif'],
      },
      fontSize: {
        // Larger, more readable sizes
        'base': ['18px', { lineHeight: '1.6' }],
        'lg': ['20px', { lineHeight: '1.6' }],
        'xl': ['24px', { lineHeight: '1.4' }],
        '2xl': ['30px', { lineHeight: '1.3' }],
        '3xl': ['36px', { lineHeight: '1.2' }],
        '4xl': ['48px', { lineHeight: '1.1' }],
        '5xl': ['60px', { lineHeight: '1' }],
        '6xl': ['72px', { lineHeight: '1' }],
      },
      spacing: {
        // More generous spacing
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'blue-glow': '0 4px 20px -2px rgba(59, 130, 246, 0.15)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 25px rgba(0, 0, 0, 0.1), 0 6px 10px rgba(0, 0, 0, 0.08)',
      },
      backgroundImage: {
        'blue-gradient': 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        'sky-gradient': 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config