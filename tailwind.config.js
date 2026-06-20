/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        "bg-primary": "#0F1117",
        "bg-secondary": "#1A1D27",
        "bg-tertiary": "#242736",
        accent: {
          DEFAULT: "#00D4AA",
          amber: "#F59E0B",
          purple: "#6366F1",
        },
        "text-primary": "#E8E8ED",
        "text-secondary": "#9CA3AF",
        border: "#2D3148",
      },
    },
  },
  plugins: [],
};
