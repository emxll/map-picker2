/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        vblack: '#101723',
        vred: '#fe4654',
        vgreen: '#47ffbc',
        vwhite: '#e8e7e5'
      }
    },
  },
  plugins: [],
}
