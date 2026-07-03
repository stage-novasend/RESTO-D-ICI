// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand orange — primary accent
        primary: {
          DEFAULT: '#EA580C',
          50:  '#FFF5E6',
          100: '#FFE5BF',
          200: '#FFCF8A',
          300: '#FFB855',
          400: '#FFA330',
          500: '#EA580C',   // ← main brand
          600: '#C2410C',
          700: '#C06800',
          800: '#9A5200',
          900: '#6B3800',
        },
        text: {
        primary: '#1B1C1C',
        secondary: '#5A4136',
        muted: '#9CA3AF',
      },
        // Neutral dark backgrounds
        dark: {
          50:  '#F5F5F5',
          100: '#E8E8E8',
          200: '#C8C8C8',
          300: '#A0A0A0',
          400: '#6E6E6E',
          500: '#3E3E3E',
          600: '#2A2A2A',
          700: '#1E1E1E',
          800: '#141414',
          900: '#0C0C0C',
          950: '#070707',
        },
        // Semantic colors
        success:  { DEFAULT: '#22C55E', light: '#DCFCE7', dark: '#16A34A' },
        warning:  { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
        danger:   { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#DC2626' },
        info:     { DEFAULT: '#3B82F6', light: '#DBEAFE', dark: '#2563EB' },
        // Keep existing semantic aliases for backward compat
        accent: '#EA580C',
      },
      fontFamily: {
        headline: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],

      },
      boxShadow: {
        'card':     '0 2px 14px rgba(0,0,0,0.07)',
        'card-hover':'0 18px 48px rgba(234,88,12,0.2)',
        'button':   '0 6px 22px rgba(234,88,12,0.44)',
        'floating': '0 -4px 20px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'xl':  '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
}
