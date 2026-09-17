/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        // Deep Slate Gray (latar belakang dark mode)
        deep: {
          950: "#090D16", // Latar belakang utama
          900: "#0F172A", // Latar sekunder
          850: "#131B2E", // Kartu / Surface
          800: "#1E293B", // Border gelap
          750: "#26334D", // Surface hover
        },
        // Muted Forest / Sage Green (pertumbuhan & habit)
        sage: {
          50: "#F2F8F5",
          100: "#E1F0E8",
          200: "#C2E1D1",
          300: "#95CDB1",
          400: "#64B38C",
          500: "#3D996E", // Sage primary
          600: "#2E7A56",
          700: "#276146",
          800: "#224E3A",
          900: "#1D4131",
        },
        // Indikator AI: Soft Violet & Warm Amber
        "ai-violet": {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6", // Soft Violet primary
          600: "#7C3AED",
          700: "#6D28D9",
        },
        "ai-amber": {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B", // Warm Amber primary
          600: "#D97706",
          700: "#B45309",
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.25)",
        "glass-light": "0 8px 30px rgba(0, 0, 0, 0.05)",
        "glow-violet": "0 0 20px -3px rgba(139, 92, 246, 0.35)",
        "glow-sage": "0 0 20px -3px rgba(61, 153, 110, 0.35)",
        "glow-amber": "0 0 20px -3px rgba(245, 158, 11, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5", transform: "scale(0.96)" },
          "50%": { opacity: "0.95", transform: "scale(1.1)" },
        },
        twinkle: {
          "0%, 100%": {
            transform: "scale(1) rotate(0deg)",
            filter: "drop-shadow(0 0 2px rgba(255, 255, 255, 0.4))",
          },
          "50%": {
            transform: "scale(1.15) rotate(12deg)",
            filter: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))",
          },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        twinkle: "twinkle 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
