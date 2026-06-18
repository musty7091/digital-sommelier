/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Premium sarap mahzeni paleti (proje dokumani 7.1)
        wine: {
          600: '#93303f',
          700: '#7a2434',
          800: '#5c1a27',
          900: '#3e0f19',
        },
        ink: {
          900: '#131316',
          950: '#0b0b0d',
        },
        charcoal: {
          700: '#26262c',
          800: '#1c1c20',
        },
        gold: {
          400: '#d8be72',
          500: '#c8a951',
        },
        cream: {
          100: '#f4eee0',
          200: '#e7dec9',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
