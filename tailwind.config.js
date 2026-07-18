/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theta Enterprise Palette
        navy: {
          50: '#EEF1F8',
          100: '#D4DAE9',
          200: '#A9B5D3',
          300: '#7E90BD',
          400: '#536BA7',
          500: '#2A4A8C',
          600: '#1B2B5B',
          700: '#162349',
          800: '#111B37',
          900: '#0C1225',
          950: '#070B16',
        },
        purple: {
          50: '#F9F0FA',
          100: '#F0DBF2',
          200: '#E1B7E5',
          300: '#C985CF',
          400: '#A94FB3',
          500: '#8B2F8F',
          600: '#6E2572',
          700: '#521B55',
          800: '#371238',
          900: '#1B091C',
        },
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // UI Neutrals
        surface: {
          50: '#FFFFFF',
          100: '#F7F9FC',
          200: '#EFF2F7',
          300: '#E4E9F1',
          400: '#D0D7E3',
          500: '#9BA5B7',
          600: '#6B7A8D',
          700: '#4A5568',
          800: '#2D3748',
          900: '#1A202C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(27, 43, 91, 0.06), 0 1px 2px rgba(27, 43, 91, 0.04)',
        'card-hover': '0 4px 12px rgba(27, 43, 91, 0.08), 0 2px 4px rgba(27, 43, 91, 0.04)',
        'elevated': '0 8px 24px rgba(27, 43, 91, 0.10), 0 4px 8px rgba(27, 43, 91, 0.06)',
        'nav': '0 1px 0 rgba(27, 43, 91, 0.06)',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
