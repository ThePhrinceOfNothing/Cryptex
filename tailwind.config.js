/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#008EFF',
        sidebar: '#f4f4f5', // zinc-50
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
