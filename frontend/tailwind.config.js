/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        'neon-blue': '#00D4FF',
        'neon-cyan': '#06FDD8',
        'neon-purple': '#9D4EDD',
        'neon-pink': '#FF6EC7',
        'accent-blue': '#3B82F6',
        'accent-indigo': '#6366F1',
        'dark-bg': '#08080F',
        'dark-secondary': '#111122',
        'dark-tertiary': '#1A1A33',
        'dark-card': '#13132B',
        'dark-elevated': '#1E1E3F',
        'dark-border': '#2A2A55',
        'surface': {
          50: '#F8FAFC',
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#1E293B',
          800: '#0F172A',
          900: '#020617',
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '120': '30rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0, 212, 255, 0.4), 0 0 60px rgba(0, 212, 255, 0.1)',
        'neon-purple': '0 0 20px rgba(157, 78, 221, 0.4), 0 0 60px rgba(157, 78, 221, 0.1)',
        'neon-cyan': '0 0 20px rgba(6, 253, 216, 0.3)',
        'glow': '0 0 40px rgba(0, 212, 255, 0.15)',
        'glow-lg': '0 0 60px rgba(0, 212, 255, 0.2), 0 0 120px rgba(157, 78, 221, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.5)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 212, 255, 0.1)',
        'btn': '0 4px 16px rgba(0, 212, 255, 0.3), 0 0 40px rgba(0, 212, 255, 0.1)',
        'btn-hover': '0 8px 24px rgba(0, 212, 255, 0.5), 0 0 60px rgba(157, 78, 221, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.4s ease-out',
        'fade-in': 'fade-in 0.6s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'spin-slow': 'spin 4s linear infinite',
        'border-glow': 'border-glow 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(157, 78, 221, 0.4)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(0, 212, 255, 0.2)' },
          '50%': { borderColor: 'rgba(157, 78, 221, 0.4)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
        'mesh': 'radial-gradient(at 40% 20%, rgba(0, 212, 255, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(157, 78, 221, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(6, 253, 216, 0.04) 0px, transparent 50%)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [],
}
