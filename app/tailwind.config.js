/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand-color)",
          dark: "var(--brand-dark)",
          darker: "var(--brand-darker)",
          light: "var(--brand-light)",
          soft: "var(--brand-soft)",
          subtle: "var(--brand-subtle)"
        }
      }
    },
  },
  plugins: [],
}
