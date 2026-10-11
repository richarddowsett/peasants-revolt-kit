/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(155, 165, 130)",
          dark: "rgb(125, 135, 100)",
          darker: "rgb(82, 94, 62)",
          light: "rgb(185, 195, 160)",
          soft: "rgb(242, 245, 236)",
          subtle: "rgba(155, 165, 130, 0.15)"
        }
      }
    },
  },
  plugins: [],
}
