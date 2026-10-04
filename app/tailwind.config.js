/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(202, 88, 46)",
          dark: "rgb(165, 68, 32)",
          light: "rgb(225, 110, 68)",
          subtle: "rgba(202, 88, 46, 0.1)"
        }
      }
    },
  },
  plugins: [],
}
