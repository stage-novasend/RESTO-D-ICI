// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C05015',
          light: '#E8906A',
          lighter: '#FDDDD4',
          dark: '#9A3E10',
          darker: '#7A2E0A',
        },
        secondary: {
          DEFAULT: '#F97316',
          light: '#FBE8DC',
        },
        tertiary: {
          DEFAULT: '#00A7CB',
          light: '#E6F5F9',
        },
        neutral: {
          DEFAULT: '#F5F5F5',
          50: '#F5F5F5',
          100: '#EEEEEE',
          200: '#E8E8E8',
          300: '#D4D4D4',
          500: '#737373',
          700: '#525252',
          800: '#3F3F3F',
          900: '#1A1A1A',
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
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.12)',
        'button': '0 4px 14px rgba(224,78,26,0.3)',
        'floating': '0 -4px 20px rgba(0,0,0,0.08)',
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
