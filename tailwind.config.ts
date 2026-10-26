import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — actual values live in globals.css per theme.
        void: "rgb(var(--void) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        fog: "rgb(var(--fog) / <alpha-value>)",
        smoke: "rgb(var(--smoke) / <alpha-value>)",
        hairline: "var(--hairline)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      zIndex: {
        scene: "0",
        veil: "20",
        detail: "30",
        chrome: "40",
        loader: "50",
        cursor: "60",
      },
    },
  },
  plugins: [],
};

export default config;
