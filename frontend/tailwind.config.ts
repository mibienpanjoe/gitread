import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#22D3A0",
        ink: "#0D1117",
        surface: "#161B22",
        graphite: "#30363D",
        snow: "#E6EDF3",
        ash: "#7D8590",
        "purple-accent": "#BC8CFF",
        "blue-accent": "#58A6FF",
        "orange-accent": "#F0883E",
        success: "#3FB950",
        warning: "#D29922",
        error: "#F85149",
        neutral: {
          900: "#0D1117",
          800: "#161B22",
          700: "#21262D",
          600: "#30363D",
          400: "#7D8590",
          200: "#C9D1D9",
          100: "#E6EDF3",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "fade-up": "fadeUp 0.35s cubic-bezier(0, 0, 0.2, 1) both",
        "fade-in": "fadeIn 0.25s ease both",
        shimmer: "shimmer 1.5s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
