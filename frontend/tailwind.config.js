/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1E1E2E',
          light: '#2D2D44',
          muted: '#6B6B80',
        },
        cream: {
          DEFAULT: '#FDFBF7',
          warm: '#F5F0E8',
          dark: '#EBE3D6',
        },
        amber: {
          DEFAULT: '#D4993E',
          light: '#F0D78C',
          dark: '#B07820',
        },
        emerald: {
          DEFAULT: '#3D8B6F',
          light: '#8BC4A8',
          dark: '#2A6B52',
        },
        terracotta: {
          DEFAULT: '#D4844A',
          light: '#F0B88C',
          dark: '#B06530',
        },
        rose: {
          DEFAULT: '#C75050',
          light: '#E89090',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-up-stagger':
          'slideUp 0.5s ease-out forwards var(--stagger-delay, 0s)',
        'pulse-record': 'pulseRecord 2s ease-in-out infinite',
        wave: 'waveAnim 0.7s ease-in-out infinite alternate',
        shimmer: 'shimmer 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRecord: {
          '0%': { boxShadow: '0 0 0 0 rgba(212, 132, 74, 0.5)' },
          '70%': { boxShadow: '0 0 0 24px rgba(212, 132, 74, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(212, 132, 74, 0)' },
        },
        waveAnim: {
          '0%, 100%': { height: '4px' },
          '50%': { height: 'var(--wave-h)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
