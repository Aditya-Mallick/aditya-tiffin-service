/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: '#FF6B2B',
          light:   '#FF8C55',
          dark:    '#E05520',
        },
        tgreen: {
          DEFAULT: '#2D7A1F',
          light:   '#3D9A2B',
          dark:    '#1E5414',
        },
        cream:  '#FFF8F0',
        gold:   '#F5A623',
      },
      fontFamily: {
        sans: ['Poppins', 'Noto Sans Devanagari', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(0,0,0,0.07)',
        'card-hover': '0 6px 28px rgba(0,0,0,0.13)',
      },
    },
  },
  plugins: [],
}
