// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D94500',
          light: '#FF6B35',
          lighter: '#FFF0EB',
          dark: '#A63400',
        },
        secondary: {
          DEFAULT: '#2ECC71',
          light: '#D1F1E0',
        },
        tertiary: {
          DEFAULT: '#00A7CB',
          light: '#E6F5F9',
        },
        neutral: {
          DEFAULT: '#FDFCFB',
          50: '#F9F7F5',
          100: '#F3EFE9',
          200: '#E8E2D9',
          300: '#D4C9BC',
          500: '#8B7355',
          700: '#595148',
          800: '#4A4239',
          900: '#2D2720',
        },
        status: {
          disponible: '#2ECC71',
          epuise: '#E67E22',
          rupture: '#E74C3C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(45, 39, 32, 0.06)',
        'card-hover': '0 8px 24px rgba(45, 39, 32, 0.12)',
        'button': '0 4px 14px rgba(217, 69, 0, 0.3)',
        'floating': '0 -4px 20px rgba(45, 39, 32, 0.08)',
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