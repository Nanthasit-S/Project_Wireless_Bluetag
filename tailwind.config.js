/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun_400Regular', 'sans-serif'],
      },
      colors: {
        material: {
          bg: '#f5f7fb',
          card: '#ffffff',
          text: '#0f172a',
          muted: '#64748b',
          line: '#e5e7eb',
          primary: '#1e3a8a',
          chip: '#dbeafe',
        },
      },
    },
  },
  plugins: [],
};
